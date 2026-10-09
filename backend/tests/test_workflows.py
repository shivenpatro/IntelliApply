import asyncio
import io
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api import jobs as jobs_api
from app.core.config import settings
from app.db.database import SessionLocal, engine
from app.db.models import Job, Profile, Task, User
from app.services import job_scraper, resume_parser
from app.services.job_matcher import match_jobs_for_user
from app.services.tasks import now

PROTECTED = [
    ("get", "/api/auth/me"),
    ("get", "/api/profile"),
    ("put", "/api/profile/preferences"),
    ("post", "/api/profile/resume"),
    ("post", "/api/profile/skills"),
    ("delete", "/api/profile/skills/all"),
    ("delete", "/api/profile/skills/1"),
    ("post", "/api/profile/experiences"),
    ("delete", "/api/profile/experiences/1"),
    ("get", "/api/jobs/matched"),
    ("put", "/api/jobs/1/status"),
    ("post", "/api/jobs/refresh"),
    ("get", "/api/jobs/counts"),
    ("get", "/api/jobs/refresh/status/unknown"),
    ("get", "/api/profile/resume/status/unknown"),
    ("put", "/api/profile/experiences/1"),
]


@pytest.mark.parametrize("method,path", PROTECTED)
def test_authentication_required(client, method, path):
    assert getattr(client, method)(path).status_code == 401


@pytest.mark.parametrize(
    "claims",
    [
        {"exp": None},
        {"exp": 1},
        {"iss": "https://wrong.example"},
        {"aud": "wrong"},
        {"sub": "not-a-uuid"},
    ],
)
def test_invalid_token_claims(client, identity, claims):
    _, headers = identity(**claims)
    assert client.get("/api/auth/me", headers=headers).status_code in (400, 401)


def test_bad_signature(client, identity):
    _, headers = identity()
    token = headers["Authorization"]
    headers["Authorization"] = token[:-10] + "a" * 10
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_profile_edits_skills_experiences_and_ownership(client, identity):
    a, ha = identity()
    b, hb = identity()
    assert client.get("/api/profile", headers=ha).json()["id"] == str(a)
    assert client.get("/api/profile", headers=hb).json()["id"] == str(b)
    assert (
        client.put(
            "/api/profile/preferences",
            headers=ha,
            json={"first_name": "Changed", "desired_roles": "Engineer"},
        ).status_code
        == 200
    )
    assert (
        client.put(
            "/api/profile/preferences", headers=ha, json={"desired_locations": "Remote"}
        ).json()["first_name"]
        == "Changed"
    )
    response = client.post(
        "/api/profile/skills",
        headers=ha,
        json=[{"name": " Python "}, {"name": "python", "level": "advanced"}],
    )
    assert response.status_code == 200
    assert len(response.json()) == 1
    sid = response.json()[0]["id"]
    assert client.delete(f"/api/profile/skills/{sid}", headers=hb).status_code == 404
    exp = client.post(
        "/api/profile/experiences",
        headers=ha,
        json=[
            {
                "title": "Engineer",
                "company": "Example",
                "start_date": "2020-01-01",
                "end_date": "2022-01-01",
            }
        ],
    )
    assert exp.status_code == 200
    eid = exp.json()[0]["id"]
    assert (
        client.delete(f"/api/profile/experiences/{eid}", headers=hb).status_code == 404
    )
    assert (
        client.delete(f"/api/profile/experiences/{eid}", headers=ha).status_code == 204
    )
    assert client.delete("/api/profile/skills/all", headers=hb).status_code == 204
    assert len(client.get("/api/profile", headers=ha).json()["skills"]) == 1
    assert client.delete("/api/profile/skills/all", headers=ha).status_code == 204


@pytest.mark.parametrize(
    "path,payload",
    [
        ("/api/profile/preferences", {"min_salary": -1}),
        ("/api/profile/skills", [{"name": "  "}]),
        ("/api/profile/experiences", [{"title": "", "company": " "}]),
        (
            "/api/profile/experiences",
            [
                {
                    "title": "Engineer",
                    "company": "Example",
                    "start_date": "2025-01-01",
                    "end_date": "2020-01-01",
                }
            ],
        ),
        (
            "/api/profile/experiences",
            [{"title": "Engineer", "company": "Example", "start_date": "yesterday"}],
        ),
    ],
)
def test_invalid_profile_input(client, identity, path, payload):
    _, headers = identity()
    method = client.put if path.endswith("preferences") else client.post
    assert method(path, headers=headers, json=payload).status_code == 422


def test_concurrent_first_use_is_idempotent(client, identity):
    uid, headers = identity()
    with ThreadPoolExecutor(max_workers=6) as pool:
        statuses = list(
            pool.map(
                lambda _: client.get("/api/auth/me", headers=headers).status_code,
                range(12),
            )
        )
    assert statuses == [200] * 12
    with SessionLocal() as db:
        assert (
            db.query(User).count() == 1
            and db.query(Profile).filter_by(id=uid).count() == 1
        )


def add_jobs():
    with SessionLocal() as db:
        db.add_all(
            [
                Job(
                    title="Python Backend Engineer",
                    company="Example",
                    description="Python FastAPI PostgreSQL engineer",
                    url="https://example.com/1",
                ),
                Job(
                    title="Accountant",
                    company="Other",
                    description="Finance bookkeeping",
                    url="https://example.com/2",
                ),
            ]
        )
        db.commit()


def test_matching_freshness_preserves_status_history_and_counts(client, identity):
    uid, headers = identity()
    _, other = identity()
    client.put(
        "/api/profile/preferences",
        headers=headers,
        json={"desired_roles": "Python Backend Engineer"},
    )
    add_jobs()
    asyncio.run(match_jobs_for_user(uid))
    matched = client.get("/api/jobs/matched", headers=headers).json()
    assert matched and matched[0]["relevance_score"] <= 1
    jid = matched[0]["id"]
    assert client.get("/api/jobs/matched", headers=other).json() == []
    assert (
        client.put(
            f"/api/jobs/{jid}/status", headers=other, json={"status": "applied"}
        ).status_code
        == 404
    )
    for status in ("pending", "interested", "applied", "ignored"):
        assert (
            client.put(
                f"/api/jobs/{jid}/status", headers=headers, json={"status": status}
            ).status_code
            == 200
        )
    assert (
        client.put(
            f"/api/jobs/{jid}/status", headers=headers, json={"status": "invalid"}
        ).status_code
        == 422
    )
    client.put(f"/api/jobs/{jid}/status", headers=headers, json={"status": "applied"})
    client.put(
        "/api/profile/preferences", headers=headers, json={"desired_roles": "zoologist"}
    )
    immediately = client.get("/api/jobs/matched", headers=headers).json()
    assert (
        len(immediately) == 1
        and immediately[0]["status"] == "applied"
        and not immediately[0]["is_current"]
    )
    asyncio.run(match_jobs_for_user(uid))
    results = client.get("/api/jobs/matched", headers=headers).json()
    assert (
        len(results) == 1
        and results[0]["status"] == "applied"
        and not results[0]["is_current"]
    )
    assert (
        client.get("/api/jobs/counts", headers=headers).json()["by_status"]["applied"]
        == 1
    )
    client.put(f"/api/jobs/{jid}/status", headers=headers, json={"status": "pending"})
    assert client.get("/api/jobs/matched", headers=headers).json() == []


def test_refresh_dedup_throttle_partial_failure_and_ownership(
    client, identity, monkeypatch
):
    uid, headers = identity()
    _, other = identity()

    async def worker(user):
        await asyncio.sleep(0.3)
        return "partial_failure", "Provider unavailable; old listings retained."

    monkeypatch.setattr(jobs_api, "perform_job_refresh", worker)
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(
            pool.map(
                lambda _: client.post("/api/jobs/refresh", headers=headers), range(4)
            )
        )
    assert all(r.status_code == 202 for r in responses)
    ids = {r.json()["task_id"] for r in responses}
    assert len(ids) == 1
    task_id = ids.pop()
    assert (
        client.get("/api/jobs/refresh/status/" + task_id, headers=other).status_code
        == 404
    )
    assert (
        client.get("/api/jobs/refresh/status/" + task_id, headers=headers).json()[
            "status"
        ]
        == "partial_failure"
    )
    rate = client.post("/api/jobs/refresh", headers=headers)
    assert rate.status_code == 429 and int(rate.headers["Retry-After"]) > 0


def test_task_status_persists_and_expired_work_is_interrupted(client, identity):
    uid, headers = identity()
    client.get("/api/profile", headers=headers)
    tid = uuid4().hex
    with SessionLocal() as db:
        db.add(
            Task(
                id=tid,
                user_id=uid,
                kind="refresh",
                status="running",
                message="running",
                deadline=now() - timedelta(seconds=1),
            )
        )
        db.commit()
    engine.dispose()
    assert (
        client.get("/api/jobs/refresh/status/" + tid, headers=headers).json()["status"]
        == "interrupted"
    )


def pdf():
    from pypdf import PdfWriter

    writer = PdfWriter()
    writer.add_blank_page(width=500, height=500)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


@pytest.mark.parametrize(
    "filename,content,expected",
    [
        ("a.doc", b"x", 400),
        ("a.pdf", b"", 400),
        ("a.pdf", b"not a PDF", 400),
        ("a.docx", b"bad zip", 400),
    ],
)
def test_upload_validation(client, identity, monkeypatch, filename, content, expected):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "synthetic-test-key")
    _, headers = identity()
    assert (
        client.post(
            "/api/profile/resume", headers=headers, files={"file": (filename, content)}
        ).status_code
        == expected
    )


def test_missing_model_is_not_false_success(client, identity, monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    _, headers = identity()
    assert (
        client.post(
            "/api/profile/resume", headers=headers, files={"file": ("a.pdf", pdf())}
        ).status_code
        == 503
    )


def test_resume_completion_is_committed_with_task(client, identity, monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "synthetic-test-key")

    async def extract(*args):
        return resume_parser.ExtractedResume(
            full_name="Test Person",
            skills=["Python", "python"],
            experiences=[
                {
                    "title": "Engineer",
                    "company": "Example",
                    "start_date": "2020-01-01",
                    "end_date": "Present",
                }
            ],
        )

    monkeypatch.setattr(resume_parser, "extract_resume", extract)
    uid, headers = identity()
    response = client.post(
        "/api/profile/resume", headers=headers, files={"file": ("a.PDF", pdf())}
    )
    assert response.status_code == 202
    task = client.get(
        "/api/profile/resume/status/" + response.json()["task_id"], headers=headers
    ).json()
    assert task["status"] == "completed"
    profile = client.get("/api/profile", headers=headers).json()
    assert (
        profile["first_name"] == "Test"
        and len(profile["skills"]) == 1
        and len(profile["experiences"]) == 1
    )


def test_resume_quota_failure_preserves_data(client, identity, monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "synthetic-test-key")

    async def extract(*args):
        raise HTTPException(429, "Provider quota exhausted. Please retry later.")

    monkeypatch.setattr(resume_parser, "extract_resume", extract)
    _, headers = identity()
    client.put("/api/profile/preferences", headers=headers, json={"first_name": "Keep"})
    response = client.post(
        "/api/profile/resume", headers=headers, files={"file": ("a.pdf", pdf())}
    )
    assert response.status_code == 202
    task = client.get(
        "/api/profile/resume/status/" + response.json()["task_id"], headers=headers
    ).json()
    assert task["status"] == "failed" and "quota" in task["message"]
    assert client.get("/api/profile", headers=headers).json()["first_name"] == "Keep"


def test_constraints_and_readiness(client, identity):
    uid, headers = identity()
    client.get("/api/profile", headers=headers)
    with SessionLocal() as db:
        db.add(Profile(id=uuid4()))
        with pytest.raises(IntegrityError):
            db.commit()
    assert client.get("/ready").status_code == 200
    response = client.options(
        "/api/profile",
        headers={
            "Origin": "https://unrelated.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 400
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE tasks RENAME TO tasks_missing"))
    try:
        assert (
            client.get("/ready").status_code == 503
            and client.get("/health").status_code == 200
        )
    finally:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE tasks_missing RENAME TO tasks"))


def test_scraper_failure_remains_partial(monkeypatch):
    async def fail(**kwargs):
        raise HTTPException(429, "rate limit")

    monkeypatch.setattr(job_scraper, "run_hackernews_scraper", fail)
    result = asyncio.run(job_scraper.trigger_job_scraping())
    assert result["status"] == "partial_failure"
    assert (
        asyncio.run(job_scraper.trigger_job_scraping())["status"] == "partial_failure"
    )
