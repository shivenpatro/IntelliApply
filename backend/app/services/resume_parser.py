import os
import requests # For making API calls
import json # For parsing JSON response
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError # Import SQLAlchemyError
import logging
from datetime import datetime # For date parsing if needed
import io # For BytesIO for in-memory file handling

from app.db.models import Profile, Skill, Experience
from app.core.config import settings # To get API_KEYs
from app.db.supabase import supabase # Import the Supabase client

# Setup logger for this module
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO) # Ensure logs are visible

RESUME_BUCKET_NAME = "resume" # Matching the bucket name you created in Supabase

async def parse_resume_with_affinda(storage_file_path: str, profile_id: str, db: Session): # Renamed file_path
    """
    Parse a resume from Supabase Storage using Affinda API and update the profile.
    """
    logger.info(f"Starting resume parsing with Affinda for profile_id: {profile_id}, storage_path: {storage_file_path}")

    if not settings.AFFINDA_API_KEY:
        logger.error("AFFINDA_API_KEY not configured.")
        print("AFFINDA_API_KEY not configured. Skipping Affinda parsing.")
        return

    headers = {
        "Authorization": f"Bearer {settings.AFFINDA_API_KEY}",
    }
    
    form_data = {
        'wait': 'true' # Wait for parsing to complete
    }
    
    file_bytes = None
    try:
        logger.info(f"Downloading resume from Supabase Storage: {storage_file_path}")
        file_bytes = supabase.storage.from_(RESUME_BUCKET_NAME).download(path=storage_file_path)
        if not file_bytes:
            logger.error(f"Failed to download resume from Supabase Storage (empty response): {storage_file_path} for profile {profile_id}")
            return
        logger.info(f"Successfully downloaded {len(file_bytes)} bytes from Supabase Storage for profile {profile_id}")
    except Exception as e:
        logger.error(f"Error downloading resume from Supabase Storage {storage_file_path} for profile {profile_id}: {e}", exc_info=True)
        return

    # Prepare file for Affinda API using BytesIO
    original_filename = os.path.basename(storage_file_path) # e.g., "resume.pdf"
    files_to_upload = {'file': (original_filename, io.BytesIO(file_bytes), 'application/octet-stream')} # Provide content type

    affinda_response_json = None
    try:
        logger.info(f"Sending request to Affinda API for profile {profile_id} with in-memory file...")
        response = requests.post(
            "https://api.affinda.com/v2/resumes",
            headers=headers,
            data=form_data,
            files=files_to_upload # This now sends the in-memory file
        )
        response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)
        affinda_response_json = response.json()
        logger.info(f"Received response from Affinda for profile {profile_id}. Status: {response.status_code}")

    except requests.exceptions.RequestException as e:
        logger.error(f"Affinda API request failed for profile {profile_id}: {e}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Affinda Response content: {e.response.text}")
        return
    except json.JSONDecodeError as e:
        logger.error(f"Failed to decode JSON response from Affinda for profile {profile_id}: {e}")
        logger.error(f"Affinda Raw Response: {response.text if 'response' in locals() else 'N/A'}")
        return
    # No need for finally block to close file as io.BytesIO manages memory

    if not affinda_response_json or 'data' not in affinda_response_json:
        logger.warning(f"No 'data' field in Affinda response for profile {profile_id}. Aborting update. Full response: {json.dumps(affinda_response_json, indent=2)}")
        return

    parsed_data = affinda_response_json['data']
    logger.info(f"Successfully parsed data from Affinda for profile {profile_id}. Extracted data (first 500 chars): {str(parsed_data)[:500]}")

    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        logger.error(f"Profile {profile_id} not found in DB during Affinda parsing callback.")
        return

    try:
        # Update profile with extracted personal information
        personal_infos = parsed_data.get("name", {})
        if personal_infos:
            extracted_first_name = personal_infos.get("first")
            extracted_last_name = personal_infos.get("last")
            if extracted_first_name:
                profile.first_name = extracted_first_name
                logger.info(f"Updated profile {profile_id} first_name to: {extracted_first_name}")
            if extracted_last_name:
                profile.last_name = extracted_last_name
                logger.info(f"Updated profile {profile_id} last_name to: {extracted_last_name}")
        
        # Clear existing skills and experiences
        logger.info(f"Clearing existing skills and experiences for profile {profile_id}...")
        db.query(Skill).filter(Skill.profile_id == profile_id).delete(synchronize_session=False)
        db.query(Experience).filter(Experience.profile_id == profile_id).delete(synchronize_session=False)
        
        # Extract and save skills
        extracted_skills_data = parsed_data.get("skills", [])
        if extracted_skills_data:
            added_skill_names_in_batch = set()
            for skill_item in extracted_skills_data:
                skill_name = None
                skill_level = None # Affinda might provide 'experience' in months or a level
                
                if isinstance(skill_item, dict):
                    skill_name = skill_item.get("name")
                    # Affinda might have 'experience' in months, or 'level'. Prioritize 'level' if present.
                    skill_level = skill_item.get("level") 
                    if not skill_level and skill_item.get("experience") is not None: # months of experience
                        try:
                            months_exp = int(skill_item.get("experience", 0))
                            if months_exp >= 60: skill_level = "Expert" # 5+ years
                            elif months_exp >= 36: skill_level = "Advanced" # 3-5 years
                            elif months_exp >= 12: skill_level = "Intermediate" # 1-3 years
                            else: skill_level = "Beginner"
                        except ValueError:
                            skill_level = "Intermediate" # Default if experience is not a number
                elif isinstance(skill_item, str): # Less likely for Affinda, but handle
                    skill_name = skill_item

                if skill_name and isinstance(skill_name, str) and skill_name.strip():
                    normalized_skill_name = skill_name.strip()
                    if normalized_skill_name not in added_skill_names_in_batch:
                        new_skill = Skill(name=normalized_skill_name, level=skill_level, profile_id=profile_id)
                        db.add(new_skill)
                        added_skill_names_in_batch.add(normalized_skill_name)
                    else:
                        logger.info(f"Skipping duplicate skill '{normalized_skill_name}' for profile {profile_id} from Affinda.")
                else:
                    logger.warning(f"Skipping invalid skill item from Affinda for profile {profile_id}: {skill_item}")
            logger.info(f"Attempted to add {len(added_skill_names_in_batch)} unique skills for profile {profile_id} from Affinda.")

        # Extract and save experiences
        work_experience_entries = parsed_data.get("workExperience", []) # Affinda uses "workExperience"
        if work_experience_entries:
            for exp_entry in work_experience_entries:
                start_date_str = exp_entry.get("dates", {}).get("startDate")
                end_date_str = exp_entry.get("dates", {}).get("endDate")
                
                # Helper to parse dates, Affinda might return YYYY-MM-DD or YYYY-MM or YYYY
                def parse_date_flexible(date_str):
                    if not date_str: return None
                    try:
                        if len(date_str) == 10: # YYYY-MM-DD
                            return datetime.strptime(date_str, "%Y-%m-%d")
                        elif len(date_str) == 7: # YYYY-MM
                            return datetime.strptime(date_str + "-01", "%Y-%m-%d") # Assume 1st of month
                        elif len(date_str) == 4: # YYYY
                             return datetime.strptime(date_str + "-01-01", "%Y-%m-%d") # Assume Jan 1st
                    except ValueError:
                        logger.warning(f"Could not parse date: {date_str}")
                        return None
                    return None

                location_info = exp_entry.get("location") # This could be None or a dict
                location_formatted = None
                if isinstance(location_info, dict):
                    location_formatted = location_info.get("formatted")

                new_experience = Experience(
                    profile_id=profile_id,
                    title=exp_entry.get("jobTitle"),
                    company=exp_entry.get("organization"),
                    location=location_formatted, # Use the safely extracted value
                    start_date=parse_date_flexible(start_date_str),
                    end_date=parse_date_flexible(end_date_str),
                    description=exp_entry.get("jobDescription")
                )
                db.add(new_experience)
            logger.info(f"Added {len(work_experience_entries)} experiences for profile {profile_id} from Affinda.")

        db.commit()
        logger.info(f"Successfully parsed and updated profile {profile_id} using Affinda.")

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error while saving parsed Affinda resume data for profile {profile_id}: {e}")
    except Exception as e:
        db.rollback() # Rollback on any other error during processing
        logger.error(f"Unexpected error processing Affinda data for profile {profile_id}: {e}", exc_info=True)
        logger.error(f"Problematic parsed_data from Affinda: {parsed_data}")


# Main parse_resume function to be called by background tasks
# This will now call the Affinda parser.
async def parse_resume(storage_file_path: str, profile_id: str, db: Session): # Renamed file_path
    # If Eden AI key is present and preferred, could add logic here to choose.
    # For now, defaulting to Affinda if its key is present.
    if settings.AFFINDA_API_KEY:
        await parse_resume_with_affinda(storage_file_path, profile_id, db)
    elif settings.EDEN_AI_API_KEY: # Fallback to Eden AI if Affinda key is missing but Eden AI is present
        logger.warning("AFFINDA_API_KEY not found, attempting to use EDEN_AI_API_KEY as fallback.")
        # Placeholder for parse_resume_with_eden_ai if it were to be kept
        # await parse_resume_with_eden_ai(storage_file_path, profile_id, db) 
        logger.error("Eden AI parsing is currently disabled due to credit issues. Affinda key was also not found.")
    else:
        logger.error("No resume parsing API key configured (Affinda or Eden AI). Cannot parse resume.")
