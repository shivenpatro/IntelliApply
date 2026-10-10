"""Provider contracts and failure recovery use synthetic documents/keys only."""

import asyncio
import io
import json
from datetime import timedelta

import httpx
import pytest
from docx import Document
from fastapi import HTTPException
from pypdf import PdfWriter
from pypdf.generic import (
    DecodedStreamObject,
    DictionaryObject,
    NameObject,
)

from app.core.config import settings
from app.db.database import SessionLocal
from app.db.models import ServiceRun, Task
from app.services import resume_parser as parser
from app.services.tasks import now


def docx():
    document = Document()
    document.add_paragraph("Test Person. Python software engineer at Example Company.")
    output = io.BytesIO()
    document.save(output)
    return output.getvalue()


def text_pdf(scanned_page=False):
    writer = PdfWriter()
    page = writer.add_blank_page(width=600, height=800)
    font = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        }
    )
    page[NameObject("/Resources")] = DictionaryObject(
        {NameObject("/Font"): DictionaryObject({NameObject("/F1"): font})}
    )
    stream = DecodedStreamObject()
    stream.set_data(
        b"BT /F1 12 Tf 50 700 Td (Test Person. Python engineer at Example Company.) Tj ET"
    )
    page[NameObject("/Contents")] = writer._add_object(stream)
    if scanned_page:
        writer.add_blank_page(width=600, height=800)
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


OUTPUT = {"full_name": "Backup Person", "skills": ["Python"], "experiences": []}


@pytest.fixture
def enabled(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "synthetic-primary-key")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "synthetic-backup-key")
    monkeypatch.setattr(settings, "RESUME_FALLBACK_PROVIDER", "groq")


def groq_transport(monkeypatch, respond):
    actual = httpx.AsyncClient

    class TransportClient(actual):
        def __init__(self, **kwargs):
            super().__init__(transport=httpx.MockTransport(respond), **kwargs)

    monkeypatch.setattr(parser.httpx, "AsyncClient", TransportClient)


@pytest.mark.parametrize("extension", ["pdf", "docx"])
@pytest.mark.parametrize(
    "reason", ["quota", "timeout", "unavailable", "invalid_response"]
)
def test_groq_recovers_primary_failure_with_strict_output(
    enabled, monkeypatch, extension, reason
):
    calls = []

    async def primary(*args):
        raise parser.ProviderFailure(reason)

    def respond(request):
        calls.append(request)
        assert str(request.url) == "https://api.groq.com/openai/v1/chat/completions"
        assert request.headers["Authorization"] == "Bearer synthetic-backup-key"
        payload = json.loads(request.content)
        assert payload["model"] == "openai/gpt-oss-120b"
        assert payload["reasoning_effort"] == "low"
        assert payload["max_completion_tokens"] == 4096
        assert "Test Person" in payload["messages"][1]["content"]
        contract = payload["response_format"]["json_schema"]
        assert contract["strict"] is True
        schema = contract["schema"]
        assert schema["additionalProperties"] is False
        experience = schema["properties"]["experiences"]["items"]
        assert set(experience["required"]) == set(experience["properties"])
        assert experience["additionalProperties"] is False
        assert experience["properties"]["end_date"]["type"] == ["string", "null"]
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {"content": json.dumps(OUTPUT)},
                    }
                ]
            },
        )

    monkeypatch.setattr(parser, "_extract_gemini", primary)
    groq_transport(monkeypatch, respond)
    data = text_pdf() if extension == "pdf" else docx()
    result = asyncio.run(parser.extract_resume(data, extension))
    assert result.full_name == "Backup Person" and result.skills == ["Python"]
    assert len(calls) == 1


@pytest.mark.parametrize("configured", [True, False])
def test_primary_success_never_uses_backup(enabled, monkeypatch, configured):
    if not configured:
        monkeypatch.setattr(settings, "RESUME_FALLBACK_PROVIDER", "none")

    async def primary(*args):
        return parser.ExtractedResume(**OUTPUT)

    async def unexpected(*args):
        pytest.fail("Backup was called after primary success")

    monkeypatch.setattr(parser, "_extract_gemini", primary)
    monkeypatch.setattr(parser, "_extract_fallback", unexpected)
    assert (
        asyncio.run(parser.extract_resume(docx(), "docx")).full_name == "Backup Person"
    )


@pytest.mark.parametrize(
    "reason", ["cancelled", "configuration", "missing_key", "disabled"]
)
def test_no_fallback_for_cancellation_configuration_or_disabled_backup(
    enabled, monkeypatch, reason
):
    async def primary(*args):
        if reason == "cancelled":
            raise asyncio.CancelledError
        raise parser.ProviderFailure("unavailable", retryable=reason != "configuration")

    async def unexpected(*args):
        pytest.fail("Backup must not be called")

    monkeypatch.setattr(parser, "_extract_gemini", primary)
    monkeypatch.setattr(parser, "_extract_fallback", unexpected)
    if reason == "missing_key":
        monkeypatch.setattr(settings, "GROQ_API_KEY", None)
    if reason == "disabled":
        monkeypatch.setattr(settings, "RESUME_FALLBACK_PROVIDER", "none")
    with pytest.raises(
        asyncio.CancelledError if reason == "cancelled" else HTTPException
    ):
        asyncio.run(parser.extract_resume(docx(), "docx"))


def test_primary_wall_clock_timeout_cancels_and_calls_backup_once(enabled, monkeypatch):
    calls = []
    cancelled = []
    monkeypatch.setattr(settings, "GEMINI_TIMEOUT_SECONDS", 0.02)

    async def primary(*args):
        calls.append("gemini")
        try:
            await asyncio.sleep(10)
        finally:
            cancelled.append(True)

    async def backup(*args):
        calls.append("groq")
        return parser.ExtractedResume(**OUTPUT)

    monkeypatch.setattr(parser, "_extract_gemini", primary)
    monkeypatch.setattr(parser, "_extract_fallback", backup)
    assert asyncio.run(parser.extract_resume(docx(), "docx")).skills == ["Python"]
    assert calls == ["gemini", "groq"] and cancelled == [True]


@pytest.mark.parametrize("kind", ["scanned_page", "oversized_text", "garbled_text"])
def test_unusable_text_never_causes_partial_backup_extraction(
    enabled, monkeypatch, kind
):
    async def primary(*args):
        raise parser.ProviderFailure("timeout")

    async def unexpected(*args):
        pytest.fail("Unusable document text must not reach backup")

    data, extension = text_pdf(scanned_page=True), "pdf"
    if kind != "scanned_page":
        extension = "docx"
        text = (
            "Engineer " * 1500
            if kind == "oversized_text"
            else "Test engineer \ufffd Company"
        )
        monkeypatch.setattr(parser, "_extract_text_from_docx", lambda data: text)
    monkeypatch.setattr(parser, "_extract_gemini", primary)
    monkeypatch.setattr(parser, "_extract_fallback", unexpected)
    with pytest.raises(HTTPException) as error:
        asyncio.run(parser.extract_resume(data, extension))
    assert error.value.status_code == 504


@pytest.mark.parametrize(
    "kind", ["malformed", "invalid_dates", "truncated", "refused", "quota", "timeout"]
)
def test_failed_backup_preserves_previous_profile_and_filename(
    enabled, client, identity, monkeypatch, kind, caplog
):
    async def primary(*args):
        raise parser.ProviderFailure("timeout")

    def respond(request):
        if kind == "quota":
            return httpx.Response(429, json={"error": "PRIVATE_RESPONSE_DO_NOT_LOG"})
        if kind == "timeout":
            raise httpx.ReadTimeout("PRIVATE_RESPONSE_DO_NOT_LOG", request=request)
        output = dict(OUTPUT)
        if kind == "malformed":
            output = {"unexpected": "PRIVATE_RESPONSE_DO_NOT_LOG"}
        if kind == "invalid_dates":
            output["experiences"] = [
                {
                    "title": "Engineer",
                    "company": "Example",
                    "start_date": "2025-01-01",
                    "end_date": "2024-01-01",
                }
            ]
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "finish_reason": "length" if kind == "truncated" else "stop",
                        "message": {
                            "content": json.dumps(output),
                            "refusal": (
                                "PRIVATE_RESPONSE_DO_NOT_LOG"
                                if kind == "refused"
                                else None
                            ),
                        },
                    }
                ]
            },
        )

    monkeypatch.setattr(parser, "_extract_gemini", primary)
    groq_transport(monkeypatch, respond)
    _, headers = identity()
    # A successful previous upload establishes the current filename.
    actual = parser.extract_resume

    async def previous(*args):
        return parser.ExtractedResume(
            full_name="Original Person", skills=["Original skill"], experiences=[]
        )

    monkeypatch.setattr(parser, "extract_resume", previous)
    first = client.post(
        "/api/profile/resume",
        headers=headers,
        files={"file": ("previous.docx", docx())},
    )
    assert first.status_code == 202
    with SessionLocal() as db:
        db.get(Task, first.json()["task_id"]).created_at = now() - timedelta(minutes=1)
        db.get(ServiceRun, "resume-provider-budget").next_allowed = now() - timedelta(
            seconds=1
        )
        db.commit()
    monkeypatch.setattr(parser, "extract_resume", actual)
    before = client.get("/api/profile", headers=headers).json()
    response = client.post(
        "/api/profile/resume",
        headers=headers,
        files={"file": ("replacement.docx", docx())},
    )
    assert response.status_code == 202
    status = client.get(
        "/api/profile/resume/status/" + response.json()["task_id"], headers=headers
    ).json()
    assert status["status"] == "failed"
    assert status["error_code"] == (
        "quota"
        if kind == "quota"
        else "timeout" if kind == "timeout" else "provider_unavailable"
    )
    after = client.get("/api/profile", headers=headers).json()
    # Authentication refreshes profile metadata; extracted fields must remain
    # identical even when that timestamp changes between authenticated reads.
    before.pop("updated_at")
    after.pop("updated_at")
    assert after == before and after["resume_path"] == "previous.docx"
    assert "PRIVATE_RESPONSE_DO_NOT_LOG" not in caplog.text
    assert "synthetic-backup-key" not in caplog.text


def test_successful_backup_commits_latest_filename_and_progress(
    enabled, client, identity, monkeypatch
):
    stages = []
    actual_update = parser.update_task

    def progress(task_id, status, message):
        stages.append(message)
        return actual_update(task_id, status, message)

    async def primary(*args):
        raise parser.ProviderFailure("quota")

    async def backup(*args):
        return parser.ExtractedResume(**OUTPUT)

    monkeypatch.setattr(parser, "_extract_gemini", primary)
    monkeypatch.setattr(parser, "_extract_fallback", backup)
    monkeypatch.setattr(parser, "update_task", progress)
    _, headers = identity()
    response = client.post(
        "/api/profile/resume", headers=headers, files={"file": ("latest.docx", docx())}
    )
    assert response.status_code == 202
    status = client.get(
        "/api/profile/resume/status/" + response.json()["task_id"], headers=headers
    ).json()
    assert status["status"] == "completed"
    profile = client.get("/api/profile", headers=headers).json()
    assert profile["resume_path"] == "latest.docx"
    assert profile["first_name"] == "Backup"
    assert [skill["name"] for skill in profile["skills"]] == ["Python"]
    assert stages == [
        "Extracting resume details. This may take a minute.",
        "Trying the backup resume service.",
        "Saving extracted resume details.",
    ]


def test_backup_wall_clock_timeout_is_terminal(enabled, monkeypatch):
    cancelled = []
    monkeypatch.setattr(settings, "RESUME_FALLBACK_TIMEOUT_SECONDS", 0.02)
    monkeypatch.setattr(
        parser, "_extract_fallback_text", lambda *args: "Synthetic resume text"
    )

    async def primary(*args):
        raise parser.ProviderFailure("timeout")

    async def backup(*args):
        try:
            await asyncio.sleep(10)
        finally:
            cancelled.append(True)

    monkeypatch.setattr(parser, "_extract_gemini", primary)
    monkeypatch.setattr(parser, "_extract_fallback", backup)
    with pytest.raises(HTTPException) as error:
        asyncio.run(parser.extract_resume(docx(), "docx"))
    assert error.value.status_code == 504 and cancelled == [True]


def test_provider_budgets_fit_shorter_task_deadline(enabled, monkeypatch):
    budgets = []
    monkeypatch.setattr(settings, "TASK_TIMEOUT_SECONDS", 20)

    async def primary(data, extension, timeout):
        budgets.append(timeout)
        raise parser.ProviderFailure("timeout")

    async def backup(text, configuration, timeout):
        budgets.append(timeout)
        return parser.ExtractedResume(**OUTPUT)

    monkeypatch.setattr(parser, "_extract_gemini", primary)
    monkeypatch.setattr(parser, "_extract_fallback", backup)
    asyncio.run(parser.extract_resume(docx(), "docx"))
    assert budgets == [10, 5]


def test_expired_task_stops_before_backup(enabled, monkeypatch):
    async def primary(*args):
        raise parser.ProviderFailure("timeout")

    async def unexpected(*args):
        pytest.fail("An expired task must not submit a backup request")

    states = iter([True, False])
    monkeypatch.setattr(parser, "update_task", lambda *args: next(states))
    monkeypatch.setattr(parser, "_extract_gemini", primary)
    monkeypatch.setattr(parser, "_extract_fallback", unexpected)
    with pytest.raises(HTTPException) as error:
        asyncio.run(parser.extract_resume(docx(), "docx", "synthetic-task"))
    assert error.value.status_code == 409


def test_ready_reports_configured_backup_without_spending_credits(
    enabled, client, monkeypatch
):
    async def unexpected(*args):
        pytest.fail("Readiness must not call providers")

    monkeypatch.setattr(parser, "_extract_gemini", unexpected)
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["capabilities"]["resume_fallback"] is True
    assert "synthetic-backup-key" not in response.text
    monkeypatch.setattr(settings, "GROQ_API_KEY", None)
    assert client.get("/ready").json()["capabilities"]["resume_fallback"] is False
