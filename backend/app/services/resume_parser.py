import os
import requests # For making API calls
import json # For parsing JSON response
from sqlalchemy.orm import Session
import logging

from app.db.models import Profile, Skill, Experience
from app.core.config import settings # To get EDEN_AI_API_KEY

# Setup logger for this module
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO) # Ensure logs are visible

# Old local extraction functions (can be removed or kept for fallback/testing)
# def extract_text_from_pdf(pdf_path): ...
# def extract_text_from_docx(docx_path): ...
# def extract_text_from_resume(file_path): ...
# def extract_skills(text): ...
# def extract_experiences(text): ...

async def parse_resume_with_eden_ai(file_path: str, profile_id: str, db: Session):
    """
    Parse a resume using Eden AI API and update the profile in the database.
    """
    logger.info(f"Starting resume parsing with Eden AI for profile_id: {profile_id}, file: {file_path}")

    if not settings.EDEN_AI_API_KEY:
        logger.error("EDEN_AI_API_KEY not configured.")
        # Optionally, fall back to local parsing or just return
        # For now, we'll raise an error or log and return
        # raise HTTPException(status_code=500, detail="Resume parsing service not configured.")
        print(f"EDEN_AI_API_KEY not configured. Skipping Eden AI parsing for profile {profile_id}.")
        return

    headers = {
        "Authorization": f"Bearer {settings.EDEN_AI_API_KEY}",
    }
    
    # Specify providers - you might want to make this configurable
    # Common providers for resume parsing: affinda, hireability, senseloaf, extracta, klippa
    # Using a few common ones as an example
    data = {
        "providers": "affinda,senseloaf", 
        "response_as_dict": "true",
        "attributes_as_list": "false", # Get items as list of objects
        "convert_to_pdf": "false" # We are sending a PDF, so no conversion needed by Eden AI
    }
    
    files = {}
    try:
        files['file'] = (os.path.basename(file_path), open(file_path, 'rb'))
    except FileNotFoundError:
        logger.error(f"Resume file not found at {file_path} for profile {profile_id}")
        # db.rollback() # No DB changes yet to rollback
        return # Or raise an error that can be caught by the background task system
    except Exception as e:
        logger.error(f"Error opening resume file {file_path} for profile {profile_id}: {e}")
        # db.rollback()
        return

    eden_ai_response_json = None
    try:
        logger.info(f"Sending request to Eden AI for profile {profile_id}...")
        response = requests.post(
            "https://api.edenai.run/v2/ocr/resume_parser",
            headers=headers,
            data=data,
            files=files
        )
        response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)
        eden_ai_response_json = response.json()
        logger.info(f"Received response from Eden AI for profile {profile_id}. Status: {response.status_code}")

    except requests.exceptions.RequestException as e:
        logger.error(f"Eden AI API request failed for profile {profile_id}: {e}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Eden AI Response content: {e.response.text}")
        # db.rollback() # No DB changes yet to rollback
        return # Or raise
    except json.JSONDecodeError as e:
        logger.error(f"Failed to decode JSON response from Eden AI for profile {profile_id}: {e}")
        logger.error(f"Eden AI Raw Response: {response.text if 'response' in locals() else 'N/A'}")
        # db.rollback()
        return # Or raise
    finally:
        # Ensure the file is closed if it was opened
        if 'file' in files and files['file'] and hasattr(files['file'][1], 'close'):
            files['file'][1].close()

    if not eden_ai_response_json:
        logger.warning(f"No JSON response from Eden AI for profile {profile_id}. Aborting update.")
        return

    # Process the response - iterate through providers to find a successful one
    parsed_data = None
    for provider_name, provider_result in eden_ai_response_json.items():
        if isinstance(provider_result, dict) and provider_result.get("status") == "success":
            parsed_data = provider_result.get("extracted_data")
            logger.info(f"Using successful data from provider: {provider_name} for profile {profile_id}")
            break # Use the first successful provider
    
    if not parsed_data:
        logger.warning(f"No successful provider found in Eden AI response for profile {profile_id}. Full response: {eden_ai_response_json}")
        # db.rollback() # No DB changes yet
        return

    # Get the profile to update
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        logger.error(f"Profile {profile_id} not found in DB during Eden AI parsing callback.")
        # db.rollback() # No DB changes yet
        return

    try:
        # Update profile with extracted personal information (example fields)
        personal_infos = parsed_data.get("personal_infos", {})
        if personal_infos:
            if not profile.first_name and personal_infos.get("name", {}).get("first_name"):
                profile.first_name = personal_infos.get("name", {}).get("first_name")
            if not profile.last_name and personal_infos.get("name", {}).get("last_name"):
                profile.last_name = personal_infos.get("name", {}).get("last_name")
            # Add more fields like address, phone, email if needed and available

        # Clear existing skills and experiences for this profile before adding new ones
        # This makes the parser overwrite with the latest resume data.
        db.query(Skill).filter(Skill.profile_id == profile_id).delete(synchronize_session=False)
        db.query(Experience).filter(Experience.profile_id == profile_id).delete(synchronize_session=False)
        # db.commit() # Commit deletions before adding, or do it all in one transaction

        # Extract and save skills
        extracted_skills = parsed_data.get("skills", [])
        if extracted_skills: # Eden AI 'skills' is usually a list of skill objects/strings
            for skill_item in extracted_skills:
                skill_name = None
                skill_level = None
                if isinstance(skill_item, dict): # If skills are objects like {"name": "Python", "level": "Advanced"}
                    skill_name = skill_item.get("name")
                    skill_level = skill_item.get("type") # Or 'level' - depends on Eden AI provider
                elif isinstance(skill_item, str): # If skills are just strings
                    skill_name = skill_item
                
                if skill_name:
                    new_skill = Skill(name=skill_name.strip(), level=skill_level, profile_id=profile_id)
                    db.add(new_skill)
            logger.info(f"Added {len(extracted_skills)} skills for profile {profile_id}")

        # Extract and save experiences
        work_experience = parsed_data.get("work_experience", {})
        if work_experience:
            entries = work_experience.get("entries", [])
            for exp_entry in entries:
                new_experience = Experience(
                    profile_id=profile_id,
                    title=exp_entry.get("title"),
                    company=exp_entry.get("company"),
                    location=exp_entry.get("location", {}).get("formatted_location") if exp_entry.get("location") else None,
                    start_date=exp_entry.get("start_date"), # Assumes YYYY-MM-DD or parsable
                    end_date=exp_entry.get("end_date"),     # Assumes YYYY-MM-DD or parsable
                    description=exp_entry.get("description")
                )
                db.add(new_experience)
            logger.info(f"Added {len(entries)} experiences for profile {profile_id}")

        db.commit()
        logger.info(f"Successfully parsed and updated profile {profile_id} using Eden AI.")

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while saving parsed resume data for profile {profile_id}: {e}")
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error processing Eden AI data for profile {profile_id}: {e}")
        logger.error(f"Problematic parsed_data from Eden AI: {parsed_data}")


# The function called by background tasks should match the new name
async def parse_resume(file_path: str, profile_id: str, db: Session):
    await parse_resume_with_eden_ai(file_path, profile_id, db)
