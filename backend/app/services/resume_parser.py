"""Bounded resume validation, structured extraction and atomic persistence."""

import asyncio
import io
import zipfile

from fastapi import HTTPException
from pydantic import BaseModel, Field, field_validator

from app.core.config import settings
from app.core.schemas import ExperienceCreate
from app.db.database import SessionLocal
from app.db.models import Experience, Profile, Skill, Task
from app.services.job_matcher import invalidate_recommendations
from app.services.tasks import ACTIVE, now


class ExtractedExperience(ExperienceCreate):
    @field_validator("end_date", mode="before")
    @classmethod
    def current_role(cls, value):
        return (
            None
            if isinstance(value, str)
            and value.lower() in ("present", "current", "now", "")
            else value
        )


class ExtractedResume(BaseModel):
    full_name: str = Field(min_length=1, max_length=300)
    skills: list[str] = Field(max_length=100)
    experiences: list[ExtractedExperience] = Field(max_length=50)


# Keep the provider schema within Gemini's supported subset. Full length, date,
# and collection constraints are enforced by ExtractedResume after generation.
GEMINI_RESUME_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "full_name": {"type": "STRING"},
        "skills": {"type": "ARRAY", "items": {"type": "STRING"}},
        "experiences": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "title": {"type": "STRING"},
                    "company": {"type": "STRING"},
                    "location": {"type": "STRING", "nullable": True},
                    "start_date": {"type": "STRING", "nullable": True},
                    "end_date": {"type": "STRING", "nullable": True},
                    "description": {"type": "STRING", "nullable": True},
                },
                "required": ["title", "company"],
            },
        },
    },
    "required": ["full_name", "skills", "experiences"],
}


def validate_resume(data: bytes, extension: str):
    if not data:
        raise HTTPException(400, "Resume file is empty.")
    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Resume exceeds the upload size limit.")
    try:
        if extension == "pdf":
            from pypdf import PdfReader

            if not data.startswith(b"%PDF-"):
                raise ValueError("format")
            reader = PdfReader(io.BytesIO(data), strict=True)
            if reader.is_encrypted or not 1 <= len(reader.pages) <= 20:
                raise ValueError("pages")
        elif extension == "docx":
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                files = archive.infolist()
                if (
                    len(files) > 500
                    or sum(f.file_size for f in files) > 20 * 1024 * 1024
                ):
                    raise ValueError("expansion")
                if any(f.file_size > max(f.compress_size, 1) * 200 for f in files):
                    raise ValueError("compression")
                if "word/document.xml" not in archive.namelist():
                    raise ValueError("format")
            if not _extract_text_from_docx(data).strip():
                raise ValueError("empty")
        else:
            raise HTTPException(400, "Use a PDF or DOCX resume.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            400,
            "Resume is corrupt, encrypted, empty, or exceeds supported document limits.",
        )


def _extract_text_from_docx(data: bytes):
    from docx import Document

    document = Document(io.BytesIO(data))
    return "\n".join(p.text for p in document.paragraphs if p.text.strip())[:100000]


async def extract_resume(data, extension):
    from google import genai
    from google.genai import errors, types

    if not settings.GEMINI_API_KEY:
        raise HTTPException(503, "Resume processing is currently unavailable.")
    client = genai.Client(
        api_key=settings.GEMINI_API_KEY,
        http_options=types.HttpOptions(
            timeout=45000,
            retry_options=types.HttpRetryOptions(
                attempts=2, initial_delay=1, max_delay=3
            ),
        ),
    )
    prompt = "Extract the resume accurately. Return full_name, skills, and experiences (title, company, location, start_date, end_date, description). Dates must be ISO dates; use null for unknown dates and current roles. Never invent facts."
    content = (
        [prompt, types.Part.from_bytes(data=data, mime_type="application/pdf")]
        if extension == "pdf"
        else [prompt, await asyncio.to_thread(_extract_text_from_docx, data)]
    )
    try:
        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=content,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GEMINI_RESUME_SCHEMA,
                max_output_tokens=4096,
                thinking_config=types.ThinkingConfig(thinking_level="low"),
            ),
        )
        return ExtractedResume.model_validate_json(response.text or "")
    except errors.APIError as error:
        if error.code == 429:
            raise HTTPException(
                429,
                "Resume provider quota is temporarily exhausted. Please retry later.",
            )
        raise HTTPException(503, "Resume provider is temporarily unavailable.")
    finally:
        await client.aio.aclose()
        client.close()


def persist_resume(extracted, task_id, profile_id):
    with SessionLocal() as db:
        task = db.query(Task).filter_by(id=task_id).with_for_update().first()
        profile = db.query(Profile).filter_by(id=profile_id).with_for_update().first()
        if not task or task.status not in ACTIVE or task.deadline < now():
            raise HTTPException(409, "Processing expired. Please upload again.")
        if not profile or profile.version != task.input_version:
            raise HTTPException(
                409,
                "Your profile changed while processing. Please upload again to avoid overwriting your edits.",
            )
        name = extracted.full_name.strip().split(maxsplit=1)
        if not name:
            raise ValueError("empty name")
        profile.first_name = name[0]
        profile.last_name = name[1] if len(name) > 1 else None
        db.query(Skill).filter_by(profile_id=profile_id).delete()
        skills = {
            value.strip().lower(): value.strip()
            for value in extracted.skills
            if value.strip()
        }
        if any(len(value) > 100 for value in skills.values()):
            raise ValueError("skill too long")
        for value in skills.values():
            db.add(Skill(profile_id=profile_id, name=value))
        db.query(Experience).filter_by(profile_id=profile_id).delete()
        for experience in extracted.experiences:
            db.add(Experience(profile_id=profile_id, **experience.model_dump()))
        invalidate_recommendations(db, profile_id)
        profile.version += 1
        task.status = "completed"
        task.message = f"Resume processed successfully. {len(skills)} skills extracted."
        task.finished_at = now()
        db.commit()
        return len(skills)


async def parse_resume(data, extension, profile_id, task_id):
    extracted = await extract_resume(data, extension)
    count = await asyncio.to_thread(persist_resume, extracted, task_id, profile_id)
    return "completed", f"Resume processed successfully. {count} skills extracted."
