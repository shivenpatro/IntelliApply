import asyncio
import io
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from alembic import command
from alembic.config import Config
from docx import Document
from fastapi import HTTPException
from jwt.exceptions import PyJWKClientConnectionError
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core import neon_auth
from app.core.config import settings
from app.db.database import SessionLocal, engine
from app.db.models import Job, Task, UserJobMatch
from app.main import claim_periodic
from app.services import resume_parser, tasks
from app.services import weworkremotely_scraper as wwr
from app.services.data_maintenance import delete_old_job_postings
from app.services.db_utils import save_jobs_to_db
from app.services.job_matcher import calculate_job_matches
from app.services.tasks import now
from tests.test_workflows import pdf


def test_auth_outage_keeps_distinct_unavailable_status(client, identity, monkeypatch):
    _, headers = identity()

    def unavailable(token):
        raise PyJWKClientConnectionError("synthetic connection failure")

    monkeypatch.setattr(neon_auth._jwks_client, "get_signing_key_from_jwt", unavailable)
    assert client.get("/api/profile", headers=headers).status_code == 503


def test_same_email_does_not_merge_identities(client, identity):
    _, first = identity(email="same@example.com")
    _, second = identity(email="same@example.com")
    assert client.get("/api/profile", headers=first).status_code == 200
    assert client.get("/api/profile", headers=second).status_code == 409


@pytest.mark.parametrize(
    "values",
    [
        {"relevance_score": 1.1},
        {"relevance_score": None},
        {"status": "invalid"},
        {"user_id": None},
        {},
    ],
)
def test_match_constraints_are_enforced_by_postgresql(client, identity, values):
    uid, headers = identity()
    client.get("/api/profile", headers=headers)
    with SessionLocal() as db:
        job = Job(title="Engineer", company="Example", url="https://example.com/job")
        db.add(job)
        db.flush()
        original = {
            "user_id": uid,
            "job_id": job.id,
            "relevance_score": 0.5,
            "status": "pending",
        }
        db.add(UserJobMatch(**original))
        db.commit()
        if values:
            other_job = Job(
                title="Other", company="Example", url="https://example.com/other"
            )
            db.add(other_job)
            db.flush()
            original["job_id"] = other_job.id
        db.add(UserJobMatch(**(original | values)))
        with pytest.raises(IntegrityError):
            db.commit()


def test_concurrent_skill_upserts_share_normalized_identity(client, identity):
    _, headers = identity()
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(
            pool.map(
                lambda name: client.post(
                    "/api/profile/skills", headers=headers, json=[{"name": name}]
                ),
                ["Python", " python ", "PYTHON", "Python"],
            )
        )
    assert all(result.status_code == 200 for result in results)
    assert len({result.json()[0]["id"] for result in results}) == 1
    assert len(client.get("/api/profile", headers=headers).json()["skills"]) == 1


def test_experience_edit_can_clear_dates_and_enforces_ownership(client, identity):
    _, a = identity()
    _, b = identity()
    result = client.post(
        "/api/profile/experiences",
        headers=a,
        json=[{"title": "Engineer", "company": "Example", "end_date": "2020-01-01"}],
    )
    eid = result.json()[0]["id"]
    values = {"title": "Senior Engineer", "company": "Example", "end_date": None}
    assert (
        client.put(
            f"/api/profile/experiences/{eid}", headers=b, json=values
        ).status_code
        == 404
    )
    edited = client.put(f"/api/profile/experiences/{eid}", headers=a, json=values)
    assert edited.status_code == 200 and edited.json()["end_date"] is None
    assert (
        client.get("/api/profile", headers=a).json()["experiences"][0]["title"]
        == "Senior Engineer"
    )


def test_global_resume_budget_and_oversize_upload(client, identity, monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "synthetic-key")

    async def extract(*args):
        return resume_parser.ExtractedResume(
            full_name="Test Person", skills=[], experiences=[]
        )

    monkeypatch.setattr(resume_parser, "extract_resume", extract)
    _, a = identity()
    _, b = identity()
    response = client.post(
        "/api/profile/resume", headers=a, files={"file": ("a.pdf", pdf())}
    )
    assert response.status_code == 202
    busy = client.post(
        "/api/profile/resume", headers=b, files={"file": ("a.pdf", pdf())}
    )
    assert busy.status_code == 429 and int(busy.headers["Retry-After"]) > 0
    large = client.post(
        "/api/profile/resume",
        headers=b,
        files={"file": ("a.pdf", b"x" * (settings.MAX_UPLOAD_BYTES + 1))},
    )
    assert large.status_code == 413


def test_docx_is_validated_and_extracted(client, identity, monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "synthetic-key")
    doc = Document()
    doc.add_paragraph("Test Person, Python Engineer")
    buffer = io.BytesIO()
    doc.save(buffer)

    async def extract(data, extension):
        assert (
            extension == "docx"
            and "Python" in resume_parser._extract_text_from_docx(data)
        )
        return resume_parser.ExtractedResume(
            full_name="Test Person", skills=["Python"], experiences=[]
        )

    monkeypatch.setattr(resume_parser, "extract_resume", extract)
    _, headers = identity()
    response = client.post(
        "/api/profile/resume",
        headers=headers,
        files={"file": ("resume.docx", buffer.getvalue())},
    )
    assert response.status_code == 202
    assert (
        client.get(
            "/api/profile/resume/status/" + response.json()["task_id"], headers=headers
        ).json()["status"]
        == "completed"
    )


def test_resume_cannot_overwrite_intervening_manual_edit(client, identity, monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "synthetic-key")
    entered = threading.Event()
    release = threading.Event()

    async def extract(*args):
        entered.set()
        await asyncio.to_thread(release.wait, 5)
        return resume_parser.ExtractedResume(
            full_name="Older Name", skills=["Python"], experiences=[]
        )

    monkeypatch.setattr(resume_parser, "extract_resume", extract)
    _, headers = identity()
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(
            client.post,
            "/api/profile/resume",
            headers=headers,
            files={"file": ("a.pdf", pdf())},
        )
        assert entered.wait(5)
        try:
            assert (
                client.put(
                    "/api/profile/preferences",
                    headers=headers,
                    json={"first_name": "Manual"},
                ).status_code
                == 200
            )
        finally:
            release.set()
        accepted = future.result()
    status = client.get(
        "/api/profile/resume/status/" + accepted.json()["task_id"], headers=headers
    ).json()
    assert status["status"] == "failed" and status["error_code"] == "profile_conflict"
    assert client.get("/api/profile", headers=headers).json()["first_name"] == "Manual"


def test_invalid_ai_output_and_timeout_do_not_report_success(
    client, identity, monkeypatch
):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "synthetic-key")

    async def bad(*args):
        return resume_parser.ExtractedResume.model_validate_json(
            '{"unexpected":"output"}'
        )

    monkeypatch.setattr(resume_parser, "extract_resume", bad)
    uid, headers = identity()
    response = client.post(
        "/api/profile/resume", headers=headers, files={"file": ("a.pdf", pdf())}
    )
    assert (
        client.get(
            "/api/profile/resume/status/" + response.json()["task_id"], headers=headers
        ).json()["status"]
        == "failed"
    )
    with SessionLocal() as db:
        task = Task(
            id=uuid4().hex,
            user_id=uid,
            kind="refresh",
            status="pending",
            message="test",
            deadline=now() + timedelta(seconds=10),
        )
        db.add(task)
        db.commit()
        tid = task.id
    monkeypatch.setattr(settings, "TASK_TIMEOUT_SECONDS", 0.02)

    async def slow():
        await asyncio.sleep(1)
        return "completed", "Must never appear"

    asyncio.run(tasks.run_task(tid, slow))
    status = client.get("/api/jobs/refresh/status/" + tid, headers=headers).json()
    assert status["status"] == "failed" and status["error_code"] == "timeout"


def test_admission_capacity_and_periodic_ownership(client, identity, monkeypatch):
    monkeypatch.setattr(settings, "MAX_ACTIVE_TASKS", 1)
    a, ha = identity()
    _, hb = identity()
    client.get("/api/profile", headers=ha)
    with SessionLocal() as db:
        db.add(
            Task(
                id=uuid4().hex,
                user_id=a,
                kind="refresh",
                status="running",
                message="test",
                deadline=now() + timedelta(minutes=1),
            )
        )
        db.commit()
    assert client.post("/api/jobs/refresh", headers=hb).status_code == 429
    with ThreadPoolExecutor(max_workers=4) as pool:
        claims = list(pool.map(lambda _: claim_periodic("test-schedule", 60), range(4)))
    assert sum(claims) == 1


def test_expired_work_does_not_call_provider_and_cleanup_retains_recent_status(
    client, identity
):
    uid, headers = identity()
    client.get("/api/profile", headers=headers)
    expired_id, old_id = uuid4().hex, uuid4().hex
    with SessionLocal() as db:
        db.add_all(
            [
                Task(
                    id=expired_id,
                    user_id=uid,
                    kind="resume",
                    status="pending",
                    message="queued",
                    deadline=now() - timedelta(seconds=1),
                ),
                Task(
                    id=old_id,
                    user_id=uid,
                    kind="refresh",
                    status="completed",
                    message="old",
                    deadline=now() - timedelta(days=8),
                    finished_at=now() - timedelta(days=8),
                ),
            ]
        )
        db.commit()

    async def never():
        raise AssertionError("Expired task must not contact a provider")

    asyncio.run(tasks.run_task(expired_id, never))
    tasks.cleanup_tasks()
    assert (
        client.get("/api/profile/resume/status/" + expired_id, headers=headers).json()[
            "status"
        ]
        == "interrupted"
    )
    assert (
        client.get("/api/jobs/refresh/status/" + old_id, headers=headers).status_code
        == 404
    )


def test_retention_keeps_application_history_and_upserts_refresh_timestamp(
    client, identity
):
    uid, headers = identity()
    client.get("/api/profile", headers=headers)
    with SessionLocal() as db:
        a = Job(
            title="Engineer",
            company="A",
            url="https://example.com/tracked",
            scraped_at=now() - timedelta(days=60),
        )
        b = Job(
            title="Other",
            company="B",
            url="https://example.com/old",
            scraped_at=now() - timedelta(days=60),
        )
        db.add_all([a, b])
        db.flush()
        db.add(
            UserJobMatch(
                user_id=uid, job_id=a.id, relevance_score=0.3, status="applied"
            )
        )
        db.commit()
    assert asyncio.run(delete_old_job_postings()) == 1
    asyncio.run(
        save_jobs_to_db(
            [
                {
                    "title": "Engineer Updated",
                    "company": "A",
                    "url": "https://example.com/tracked?utm_source=test#top",
                }
            ]
        )
    )
    with SessionLocal() as db:
        assert (
            db.query(Job).count() == 1
            and db.query(UserJobMatch).first().status == "applied"
        )
        job = db.query(Job).first()
        assert (
            job.scraped_at > now() - timedelta(minutes=1)
            and job.title == "Engineer Updated"
        )


def test_vectorizer_refits_for_changed_corpus_and_handles_small_corpus():
    job = Job(id=1, title="Python", company="Example", description="Backend Python")
    assert calculate_job_matches("Python", [job])[0][1] > 0
    changed = Job(id=2, title="Rust", company="Other", description="Rust compiler")
    assert calculate_job_matches("Rust", [changed])[0][1] > 0
    assert calculate_job_matches("Python", [changed])[0][1] == 0
    assert calculate_job_matches("Python", []) == []


@pytest.mark.parametrize("response_kind", ["valid", "quota", "malformed"])
def test_real_genai_client_serializes_bounded_structured_requests(
    monkeypatch, response_kind
):
    import json
    from google import genai

    actual = genai.Client
    calls = []
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "synthetic-key")

    def respond(request):
        calls.append(request)
        body = json.loads(request.content)
        assert body["generationConfig"]["maxOutputTokens"] == 4096
        assert body["generationConfig"]["responseMimeType"] == "application/json"
        assert "responseSchema" in body["generationConfig"]
        if response_kind == "quota":
            return httpx.Response(
                429,
                json={
                    "error": {
                        "code": 429,
                        "message": "synthetic quota",
                        "status": "RESOURCE_EXHAUSTED",
                    }
                },
            )
        output = (
            {"full_name": "Test Person", "skills": ["Python"], "experiences": []}
            if response_kind == "valid"
            else {"unexpected": "output"}
        )
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "role": "model",
                            "parts": [{"text": json.dumps(output)}],
                        }
                    }
                ]
            },
        )

    def client_factory(**kwargs):
        options = kwargs["http_options"]
        assert options.timeout == 45000 and options.retry_options.attempts == 2
        options.httpx_async_client = httpx.AsyncClient(
            transport=httpx.MockTransport(respond)
        )
        return actual(**kwargs)

    monkeypatch.setattr(genai, "Client", client_factory)
    if response_kind == "valid":
        assert asyncio.run(resume_parser.extract_resume(pdf(), "pdf")).skills == [
            "Python"
        ]
    elif response_kind == "quota":
        with pytest.raises(HTTPException) as error:
            asyncio.run(resume_parser.extract_resume(pdf(), "pdf"))
        assert error.value.status_code == 429
    else:
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            asyncio.run(resume_parser.extract_resume(pdf(), "pdf"))
    assert 1 <= len(calls) <= 2


def test_hackernews_uses_bounded_fetch_and_rejects_upstream_failure(monkeypatch):
    from app.services import hackernews_scraper as hn

    class Response:
        text = '<tr class="athing"><td><span class="titleline"><a href="https://example.com/job">Example is hiring Python Engineer (Remote)</a></span></td></tr>'

        def raise_for_status(self):
            pass

    def fetch(url, **kwargs):
        assert kwargs["timeout"] == (5, 15)
        return Response()

    monkeypatch.setattr(hn.requests, "get", fetch)
    assert asyncio.run(hn.scrape_hackernews_jobs())[0]["company"] == "Example"

    def fail(*args, **kwargs):
        raise hn.requests.Timeout("synthetic timeout")

    monkeypatch.setattr(hn.requests, "get", fail)
    with pytest.raises(hn.requests.Timeout):
        asyncio.run(hn.scrape_hackernews_jobs())


@pytest.mark.parametrize(
    "status,payload,expected",
    [
        (
            200,
            {
                "success": True,
                "data": {
                    "html": '<li class="new-listing-container"><a href="/remote-jobs/example-python"><h4 class="new-listing__header__title">Engineer</h4><p class="new-listing__company-name">Example</p></a></li>'
                },
            },
            "success",
        ),
        (429, {"error": "quota"}, "http"),
        (200, {"success": False, "data": {}}, "layout"),
    ],
)
def test_firecrawl_rest_contract_and_failures(monkeypatch, status, payload, expected):
    monkeypatch.setattr(settings, "FIRECRAWL_API_KEY", "synthetic-key")
    actual = httpx.AsyncClient

    def respond(request):
        assert (
            request.url.path == "/v2/scrape"
            and request.headers["Authorization"] == "Bearer synthetic-key"
        )
        import json

        assert json.loads(request.content)["formats"] == ["html"]
        return httpx.Response(status, json=payload)

    monkeypatch.setattr(
        wwr.httpx,
        "AsyncClient",
        lambda **kw: actual(**kw, transport=httpx.MockTransport(respond)),
    )
    if expected == "success":
        assert asyncio.run(wwr.scrape_weworkremotely_jobs())[0]["title"] == "Engineer"
    else:
        with pytest.raises(
            httpx.HTTPStatusError if expected == "http" else RuntimeError
        ):
            asyncio.run(wwr.scrape_weworkremotely_jobs())


@pytest.mark.parametrize("conflict", [False, True])
def test_existing_schema_migration_preserves_data_or_refuses_conflicts(conflict):
    # Everything is contained in a disposable schema and rolled back afterward.
    schema = "migration_test_" + uuid4().hex
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.set_main_option(
        "script_location", str(Path(__file__).resolve().parents[1] / "migrations")
    )
    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            connection.execute(text(f"CREATE SCHEMA {schema}"))
            connection.execute(text(f"SET LOCAL search_path TO {schema}"))
            for table in (
                "users",
                "profiles",
                "jobs",
                "skills",
                "experiences",
                "user_job_matches",
            ):
                connection.execute(
                    text(
                        f"CREATE TABLE {table} (LIKE public.{table} INCLUDING DEFAULTS)"
                    )
                )
            connection.execute(text("ALTER TABLE profiles DROP COLUMN version"))
            connection.execute(
                text("ALTER TABLE user_job_matches DROP COLUMN is_current")
            )
            # Legacy referenced keys are unique, as in the original schema.
            for table in (
                "users",
                "profiles",
                "jobs",
                "skills",
                "experiences",
                "user_job_matches",
            ):
                connection.execute(text(f"ALTER TABLE {table} ADD PRIMARY KEY (id)"))
            connection.execute(text("ALTER TABLE users ADD UNIQUE (supabase_id)"))
            uid = uuid4()
            connection.execute(
                text(
                    "INSERT INTO users(id,supabase_id,email) VALUES (100,:id,'legacy@example.com')"
                ),
                {"id": uid},
            )
            connection.execute(
                text("INSERT INTO profiles(id) VALUES (:id)"), {"id": uid}
            )
            connection.execute(
                text("INSERT INTO skills(id,profile_id,name) VALUES(100,:id,'Python')"),
                {"id": uid},
            )
            if conflict:
                connection.execute(
                    text(
                        "INSERT INTO skills(id,profile_id,name) VALUES(101,:id,' python ')"
                    ),
                    {"id": uid},
                )
            config.attributes["connection"] = connection
            if conflict:
                with pytest.raises(RuntimeError, match="preflight"):
                    command.upgrade(config, "head")
                assert (
                    connection.execute(text("SELECT count(*) FROM skills")).scalar()
                    == 2
                )
            else:
                command.upgrade(config, "head")
                command.upgrade(config, "head")
                assert (
                    connection.execute(text("SELECT name FROM skills")).scalar()
                    == "Python"
                )
                assert (
                    connection.execute(text("SELECT version FROM profiles")).scalar()
                    == 0
                )
                assert (
                    connection.execute(
                        text("SELECT version_num FROM alembic_version")
                    ).scalar()
                    == "0001_reliability"
                )
        finally:
            transaction.rollback()
