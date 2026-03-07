import os
import io
import json
import asyncio
import logging
from datetime import datetime

from sqlalchemy.orm import Session
import google.generativeai as genai

from app.db.models import Profile, Skill, Experience

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- Gemini API Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = "gemini-1.5-flash"

if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY is not set. Resume parsing will not work.")
    gemini_model = None
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        logger.info(f"Gemini model '{GEMINI_MODEL_NAME}' configured successfully.")
    except Exception as e:
        logger.error(f"Error configuring Gemini model: {e}")
        gemini_model = None

# Extraction prompt — Gemini receives raw extracted text and returns structured JSON
EXTRACTION_PROMPT_TEMPLATE = """
You are a professional resume parser. Extract the following information from the resume attached and return it as a valid JSON object only (no markdown, no explanation, no extra text):

{{
  "full_name": "Full name of the person",
  "skills": ["skill1", "skill2", "skill3"],
  "experiences": [
    {{
      "title": "Job title",
      "company": "Company name",
      "location": "City, Country (or Remote) — empty string if not found",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD or Present",
      "description": "Brief summary of responsibilities and achievements"
    }}
  ]
}}

Rules:
- skills: include ALL technical skills, tools, programming languages, frameworks, and relevant soft skills
- start_date / end_date: use YYYY-MM-DD format; if only year is given use YYYY-01-01; use "Present" for current roles
- Return ONLY the JSON object — no markdown fences, no commentary

Resume Text (if provided):
{resume_text}
"""


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract raw text from a PDF using pypdf.
    Lightweight, pure-Python, no ML models needed — Gemini handles the intelligence.
    """
    try:
        import pypdf

        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        pages_text = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                pages_text.append(page_text)
            logger.debug(f"[ResumeParser] PDF page {i + 1}: extracted {len(page_text)} chars")

        full_text = "\n\n".join(pages_text)
        logger.info(f"[ResumeParser] pypdf extracted {len(full_text)} chars from {len(reader.pages)} pages.")
        return full_text

    except ImportError:
        logger.error("[ResumeParser] pypdf not installed. Add 'pypdf' to requirements.txt.")
        return ""
    except Exception as e:
        logger.error(f"[ResumeParser] pypdf extraction error: {e}", exc_info=True)
        return ""


def _extract_text_from_docx(file_bytes: bytes) -> str:
    """
    Extract raw text from a DOCX file using python-docx.
    Lightweight — reads paragraph text from Word XML structure.
    """
    try:
        from docx import Document

        doc = Document(io.BytesIO(file_bytes))
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        full_text = "\n".join(paragraphs)
        logger.info(f"[ResumeParser] python-docx extracted {len(full_text)} chars from {len(paragraphs)} paragraphs.")
        return full_text

    except ImportError:
        logger.error("[ResumeParser] python-docx not installed. Add 'python-docx' to requirements.txt.")
        return ""
    except Exception as e:
        logger.error(f"[ResumeParser] python-docx extraction error: {e}", exc_info=True)
        return ""


async def parse_resume(file_bytes: bytes, file_extension: str, profile_id: str):
    """
    Parse a resume from in-memory bytes (no cloud storage needed).

    Pipeline:
      1. Receive raw file bytes + extension directly from the upload endpoint
      2. Extract raw text using pypdf (PDF) or python-docx (DOCX)
      3. Send raw text to Gemini API for structured data extraction (name, skills, experiences)
      4. Save extracted data to PostgreSQL

    Uses lightweight parsers (pypdf / python-docx) for text extraction instead of heavy
    ML-based converters, keeping the Docker image memory footprint small enough for
    free-tier cloud hosting.
    """
    logger.info(
        f"[ResumeParser] Starting for profile_id={profile_id}, extension={file_extension}, "
        f"file_size={len(file_bytes)} bytes"
    )

    try:
        if not gemini_model:
            logger.error("[ResumeParser] Gemini model not configured. Aborting.")
            return

        from app.db.database import SessionLocal
        db = SessionLocal()

        # ── Step 1: Extract raw text based on file type ──────────────────────
        ext = file_extension.lower()
        if ext == "pdf":
            raw_text = _extract_text_from_pdf(file_bytes)
        elif ext == "docx":
            raw_text = _extract_text_from_docx(file_bytes)
        else:
            logger.error(f"[ResumeParser] Unsupported file type: .{ext}")
            return

        payload_content = []
        prompt = EXTRACTION_PROMPT_TEMPLATE.format(resume_text=raw_text)
        
        # If pypdf failed (e.g., image-based PDF), use Gemini Vision natively
        if not raw_text.strip() and ext == "pdf":
            logger.info("[ResumeParser] pypdf extracted empty string. Falling back to Gemini native PDF vision processing.")
            payload_content = [{"mime_type": "application/pdf", "data": file_bytes}, prompt]
        elif not raw_text.strip():
            logger.error("[ResumeParser] No text extracted from resume. Cannot proceed.")
            return
        else:
            logger.info(f"[ResumeParser] Extracted {len(raw_text)} chars. Sending text to Gemini...")
            payload_content = [prompt]

        # ── Step 2: Send to Gemini for structured extraction ────────
        try:
            gemini_response = await gemini_model.generate_content_async(payload_content)
        except Exception as gemini_err:
            logger.error(f"[ResumeParser] Gemini API call failed: {gemini_err}", exc_info=True)
            return

        # Collect response text
        raw_response = ""
        if hasattr(gemini_response, "text"):
            raw_response = gemini_response.text.strip()
        else:
            for part in gemini_response.parts:
                if hasattr(part, "text"):
                    raw_response += part.text
            raw_response = raw_response.strip()

        logger.info(f"[ResumeParser] Gemini response (first 300 chars): {raw_response[:300]}")

        # Strip markdown fences if present despite instructions
        if "```json" in raw_response:
            raw_response = raw_response.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_response:
            raw_response = raw_response.split("```")[1].split("```")[0].strip()

        try:
            extracted_data = json.loads(raw_response)
        except json.JSONDecodeError as je:
            logger.error(
                f"[ResumeParser] Failed to parse JSON from Gemini response: {je}\nRaw: {raw_response[:500]}"
            )
            return

        extracted_name = extracted_data.get("full_name")
        extracted_skills = extracted_data.get("skills", [])
        extracted_experiences = extracted_data.get("experiences", [])

        logger.info(
            f"[ResumeParser] Parsed: name='{extracted_name}', "
            f"skills={len(extracted_skills)}, experiences={len(extracted_experiences)}"
        )

        # ── Step 3: Save to database ─────────────────────────────────────────
        profile = db.query(Profile).filter(Profile.id == profile_id).first()
        if not profile:
            logger.warning(f"[ResumeParser] Profile {profile_id} not found. Cannot save.")
            return

        # Update name
        if extracted_name and isinstance(extracted_name, str) and extracted_name.strip():
            name_parts = extracted_name.strip().split(" ", 1)
            profile.first_name = name_parts[0]
            profile.last_name = name_parts[1] if len(name_parts) > 1 else None
            logger.info(f"[ResumeParser] Name: {profile.first_name} {profile.last_name}")

        # Replace skills
        db.query(Skill).filter(Skill.profile_id == profile_id).delete()
        seen_skills = set()
        for skill_name in extracted_skills:
            if not isinstance(skill_name, str):
                continue
            skill_name = skill_name.strip()
            if skill_name and skill_name.lower() not in seen_skills:
                seen_skills.add(skill_name.lower())
                db.add(Skill(profile_id=profile_id, name=skill_name))
        logger.info(f"[ResumeParser] Inserted {len(seen_skills)} skills.")

        # Replace experiences
        db.query(Experience).filter(Experience.profile_id == profile_id).delete()
        exp_count = 0
        for exp_data in extracted_experiences:
            try:
                start_str = (exp_data.get("start_date") or "").strip()
                end_str = (exp_data.get("end_date") or "").strip()

                parsed_start = None
                if start_str:
                    try:
                        parsed_start = datetime.strptime(start_str, "%Y-%m-%d").date()
                    except ValueError:
                        logger.warning(f"[ResumeParser] Cannot parse start_date: '{start_str}'")

                parsed_end = None
                if end_str and end_str.lower() not in ("present", "current", "now", ""):
                    try:
                        parsed_end = datetime.strptime(end_str, "%Y-%m-%d").date()
                    except ValueError:
                        logger.warning(f"[ResumeParser] Cannot parse end_date: '{end_str}'")

                db.add(
                    Experience(
                        profile_id=profile_id,
                        title=str(exp_data.get("title") or "").strip() or "Unknown",
                        company=str(exp_data.get("company") or "").strip() or "Unknown",
                        location=exp_data.get("location") or None,
                        start_date=parsed_start,
                        end_date=parsed_end,
                        description=exp_data.get("description") or None,
                    )
                )
                exp_count += 1
            except Exception as exp_err:
                logger.error(f"[ResumeParser] Error adding experience {exp_data}: {exp_err}", exc_info=True)

        logger.info(f"[ResumeParser] Inserted {exp_count} experiences.")

        db.commit()
        logger.info(f"[ResumeParser] ✅ Committed all data for profile {profile_id}.")

    except Exception as e:
        logger.error(f"[ResumeParser] Unexpected error for profile {profile_id}: {e}", exc_info=True)
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        if 'db' in locals() and db:
            try:
                db.close()
                logger.debug("[ResumeParser] DB session closed.")
            except Exception:
                pass

    logger.info(f"[ResumeParser] Finished for profile_id={profile_id}")
