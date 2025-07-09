import os
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import logging
import io
import tempfile
import json # Import json for parsing Gemini response
import google.generativeai as genai # Import Gemini library
from datetime import datetime # Import datetime for date parsing

from app.db.models import Profile, Skill, Experience
from app.db.supabase import supabase # Ensure supabase is imported
# from docling.document_converter import DocumentConverter, ConversionResult # Import ConversionResult
from app.services.hackernews_scraper import extract_tech_stack # This import is not currently used in this function

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- Gemini API Configuration ---
# IMPORTANT: Replace with your actual API key or load from environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = "gemini-2.5-flash-lite-preview-06-17"

if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY is not set. Please set it in your .env file.")
    gemini_model = None
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        logger.info(f"Gemini model '{GEMINI_MODEL_NAME}' configured successfully.")
    except Exception as e:
        logger.error(f"Error configuring Gemini model: {e}")
        gemini_model = None
# --- End Gemini API Configuration ---

RESUME_BUCKET_NAME = "resume"

async def parse_resume(storage_file_path: str, profile_id: str, db: Session):
    """
    Parse a resume from Supabase Storage using Docling and update the profile.
    Then use Gemini API to extract structured data.
    """
    logger.info(f"Starting resume parsing with Docling for profile_id: {profile_id}, storage_path: {storage_file_path}")

    file_bytes = None
    temp_file_path = None

    try:
        logger.info(f"Downloading resume from Supabase Storage: {storage_file_path}")
        # This line caused NameError previously. Assuming it's fixed by proper import/init.
        file_bytes = supabase.storage.from_(RESUME_BUCKET_NAME).download(path=storage_file_path)
        if not file_bytes:
            logger.error(f"Failed to download resume from Supabase Storage (empty response): {storage_file_path} for profile {profile_id}")
            return
        logger.info(f"Successfully downloaded {len(file_bytes)} bytes from Supabase Storage for profile {profile_id}")

        original_filename = os.path.basename(storage_file_path)
        # converter = DocumentConverter()
        
        # with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        #     temp_file.write(file_bytes)
        #     temp_file_path = temp_file.name

        # logger.info(f"Attempting docling conversion for file: {temp_file_path}")
        # result = converter.convert(temp_file_path)
        # logger.info(f"Docling converter.convert() returned: {result}")
        
        # # --- Process the result and update the database ---
        # if isinstance(result, ConversionResult) and result.document:
        #     logger.info("Docling result is a ConversionResult object. Extracting text for Gemini.")
            
        #     full_resume_text = ""
        #     if result.document.texts:
        #         for text_item in result.document.texts:
        #             if hasattr(text_item, 'text') and text_item.text:
        #                 full_resume_text += text_item.text + " "
            
        #     logger.info(f"Full extracted resume text (first 500 chars): {full_resume_text[:500]}...")

        #     if not gemini_model:
        #         logger.error("Gemini model not configured. Cannot extract data using Gemini API.")
        #         return

        #     # --- Use Gemini API for extraction ---
        #     prompt = f"""
        #     Extract the following information from the resume text below in JSON format.
        #     - full_name: The full name of the person.
        #     - skills: A list of key technical and soft skills.
        #     - experiences: A list of work experiences, each with title, company, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD or 'Present'), and description.

        #     Resume Text:
        #     {full_resume_text}

        #     Ensure the output is a valid JSON object.
        #     """
            
        #     logger.info("Sending resume text to Gemini API for extraction...")
        #     try:
        #         gemini_response = await gemini_model.generate_content_async(prompt)
                
        #         # Access the text from the parts of the response
        #         gemini_output_text = ""
        #         for part in gemini_response.parts:
        #             if hasattr(part, 'text'):
        #                 gemini_output_text += part.text
                
        #         logger.info(f"Gemini API raw response: {gemini_output_text}")

        #         # Attempt to parse the JSON response
        #         # Gemini might include markdown, so try to extract JSON block
        #         if "```json" in gemini_output_text:
        #             json_str = gemini_output_text.split("```json")[1].split("```")[0].strip()
        #         else:
        #             json_str = gemini_output_text.strip()

        #         extracted_data = json.loads(json_str)
        #         logger.info(f"Gemini extracted data: {extracted_data}")

        #         extracted_name = extracted_data.get("full_name")
        #         extracted_skills = set(extracted_data.get("skills", []))
        #         extracted_experiences = extracted_data.get("experiences", [])

        #     except Exception as gemini_e:
        #         logger.error(f"Error calling Gemini API or parsing response: {gemini_e}", exc_info=True)
        #         extracted_name = None
        #         extracted_skills = set()
        #         extracted_experiences = []

        #     # --- Save extracted data to the database ---
        #     profile = db.query(Profile).filter(Profile.id == profile_id).first()
        #     if profile:
        #         # Update profile name if extracted
        #         if extracted_name:
        #             name_parts = extracted_name.split(' ', 1) # Split into at most 2 parts
        #             profile.first_name = name_parts[0] if name_parts else None
        #             profile.last_name = name_parts[1] if len(name_parts) > 1 else None
        #             logger.info(f"Updated profile first_name: {profile.first_name}, last_name: {profile.last_name}")

        #         # Clear existing skills and add new ones
        #         db.query(Skill).filter(Skill.profile_id == profile_id).delete()
        #         for skill_name in extracted_skills:
        #             new_skill = Skill(profile_id=profile_id, name=skill_name)
        #             db.add(new_skill)
        #         logger.info(f"Added {len(extracted_skills)} skills to profile {profile_id}.")

        #         # Clear existing experiences and add new ones
        #         db.query(Experience).filter(Experience.profile_id == profile_id).delete()
        #         for exp_data in extracted_experiences:
        #             try:
        #                 start_date_str = exp_data.get('start_date')
        #                 end_date_str = exp_data.get('end_date')

        #                 parsed_start_date = None
        #                 if start_date_str:
        #                     try:
        #                         parsed_start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        #                     except ValueError:
        #                         logger.warning(f"Could not parse start_date: {start_date_str}")

        #                 parsed_end_date = None
        #                 if end_date_str and end_date_str.lower() != 'present':
        #                     try:
        #                         parsed_end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        #                     except ValueError:
        #                         logger.warning(f"Could not parse end_date: {end_date_str}")

        #                 new_experience = Experience(
        #                     profile_id=profile_id,
        #                     title=exp_data.get('title'),
        #                     company=exp_data.get('company'),
        #                     start_date=parsed_start_date,
        #                     end_date=parsed_end_date,
        #                     description=exp_data.get('description'),
        #                     location=exp_data.get('location')
        #                 )
        #                 db.add(new_experience)
        #             except Exception as exp_add_error:
        #                 logger.error(f"Error adding experience entry {exp_data}: {exp_add_error}", exc_info=True)
        #         logger.info(f"Added {len(extracted_experiences)} experiences to profile {profile_id}.")

        #         db.commit()
        #         logger.info(f"Successfully committed extracted data for profile {profile_id}.")
        #     else:
        #         logger.warning(f"Profile with ID {profile_id} not found. Cannot save extracted data.")

        # else:
        #     logger.warning(f"Docling converter returned an unexpected result type or no document: {type(result)}")

    except Exception as e:
        logger.error(f"Error processing resume with Docling or saving to DB for profile {profile_id}: {e}", exc_info=True)
        db.rollback()
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.debug(f"Removed temporary file: {temp_file_path}")
            except Exception as cleanup_error:
                logger.error(f"Error removing temporary file {temp_file_path}: {cleanup_error}")
        
        if db:
            db.close()
            logger.debug("Database session closed in parse_resume finally block.")

    logger.info(f"Finished resume parsing for profile_id: {profile_id}")
