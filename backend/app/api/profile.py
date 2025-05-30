import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Response
from sqlalchemy.orm import Session
# import shutil # No longer needed for local file saving
from typing import List
import logging # Import logging
from app.db.supabase import supabase # Import the Supabase client

# Setup logger for this module
logger = logging.getLogger(__name__)

from app.core.config import settings
from app.core.schemas import Profile, ProfileCreate, ProfileUpdate, Skill, SkillCreate, Experience, ExperienceCreate, ResumeUploadResponse
from app.core.supabase_auth import get_current_active_user
from app.db.database import get_db
from app.db.models import User, Profile as ProfileModel, Skill as SkillModel, Experience as ExperienceModel
from app.services.resume_parser import parse_resume

router = APIRouter()

# Ensure upload directory exists (can be removed if UPLOAD_DIRECTORY is no longer used for anything else)
# For now, let's assume it might be used elsewhere or for temporary local processing if needed.
# If strictly only Supabase storage is used, this line and UPLOAD_DIRECTORY setting can be removed.
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True) 

RESUME_BUCKET_NAME = "resume" # Matching the bucket name you created

@router.get("", response_model=Profile)
async def get_profile(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    try:
        logger.info(f"Attempting to get profile for user supabase_id: {current_user.supabase_id}")
        # Filter profile by its ID, which matches the user's supabase_id
        profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
        if not profile:
            logger.warning(f"Profile not found for user supabase_id: {current_user.supabase_id}")
            # It's possible the profile wasn't created by the trigger yet, handle this gracefully?
            # For now, raise 404 as per original logic.
            raise HTTPException(status_code=404, detail="Profile not found")
        logger.info(f"Profile found for user supabase_id: {current_user.supabase_id}")
        return profile
    except Exception as e:
        logger.exception(f"Unexpected error in get_profile for user {current_user.supabase_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching profile")

@router.put("/preferences", response_model=Profile)
async def update_preferences(profile_data: ProfileUpdate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Filter profile by its ID (user's supabase_id)
    profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Update profile fields
    for key, value in profile_data.dict(exclude_unset=True).items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile

@router.post("/resume", response_model=ResumeUploadResponse)
async def upload_resume(background_tasks: BackgroundTasks, file: UploadFile = File(...), current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Check if file is a valid type
    file_extension = file.filename.split('.')[-1].lower()
    if file_extension not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File must be one of: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    file_content = await file.read()
    # Sanitize filename or use a consistent name like 'resume.ext' prefixed by user ID
    # Using user's supabase_id as a "folder" and a generic name for the resume file
    storage_file_path = f"{str(current_user.supabase_id)}/resume.{file_extension}"

    try:
        logger.info(f"Attempting to upload resume to Supabase Storage at path: {storage_file_path}")
        # The supabase-py library's upload method expects bytes.
        # file.file is a SpooledTemporaryFile, file_content has its bytes.
        # We use upsert=True to overwrite if the user uploads a new resume.
        upload_response = supabase.storage.from_(RESUME_BUCKET_NAME).upload(
            path=storage_file_path,
            file=file_content,
            file_options={"content-type": file.content_type or "application/octet-stream", "upsert": "true"}
        )
        logger.info(f"Supabase storage upload response: {upload_response}")

    except Exception as e:
        logger.error(f"Failed to upload resume to Supabase Storage for user {current_user.supabase_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not upload resume to cloud storage.")

    # Update the profile with the Supabase Storage path
    profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
    if not profile:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found for authenticated user")

    profile.resume_path = storage_file_path # Store the path within Supabase Storage
    db.commit()
    db.refresh(profile) # Refresh to get any DB-side updates if necessary

    # Trigger resume parsing in the background, passing the Supabase Storage path
    background_tasks.add_task(parse_resume, storage_file_path, profile.id, db)

    return {"success": True, "message": "Resume uploaded to cloud and processing started"}

@router.post("/skills", response_model=List[Skill])
async def add_skills(skills: List[SkillCreate], current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Fetch profile using supabase_id
    profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    new_skills = []
    for skill_data in skills:
        # Check if skill already exists for this profile
        existing_skill = db.query(SkillModel).filter(
            SkillModel.profile_id == profile.id,
            SkillModel.name == skill_data.name
        ).first()

        if existing_skill:
            # Update existing skill
            for key, value in skill_data.dict().items():
                setattr(existing_skill, key, value)
            new_skills.append(existing_skill)
        else:
            # Create new skill
            skill = SkillModel(**skill_data.dict(), profile_id=profile.id)
            db.add(skill)
            new_skills.append(skill)

    db.commit()
    # Refresh all skills to get their IDs
    for skill in new_skills:
        db.refresh(skill)

    return new_skills

# Moved /skills/all before /skills/{skill_id} to ensure correct route matching
@router.delete("/skills/all", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_skills(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    try:
        num_deleted = db.query(SkillModel).filter(SkillModel.profile_id == profile.id).delete(synchronize_session=False)
        db.commit()
        logger.info(f"Deleted {num_deleted} skills for profile_id: {profile.id}")
    except HTTPException: # Re-raise HTTPExceptions directly
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting all skills for profile_id {profile.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete all skills")
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(skill_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Fetch profile using supabase_id
    profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    skill = db.query(SkillModel).filter(SkillModel.id == skill_id, SkillModel.profile_id == profile.id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    db.delete(skill)
    db.commit()

    return None

@router.post("/experiences", response_model=List[Experience])
async def add_experiences(experiences: List[ExperienceCreate], current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Fetch profile using supabase_id
    profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    new_experiences = []
    for exp_data in experiences:
        experience = ExperienceModel(**exp_data.dict(), profile_id=profile.id)
        db.add(experience)
        new_experiences.append(experience)

    db.commit()
    # Refresh all experiences to get their IDs
    for exp in new_experiences:
        db.refresh(exp)

    return new_experiences

@router.delete("/experiences/{experience_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experience(experience_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Fetch profile using supabase_id
    profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    experience = db.query(ExperienceModel).filter(
        ExperienceModel.id == experience_id,
        ExperienceModel.profile_id == profile.id
    ).first()

    if not experience:
        raise HTTPException(status_code=404, detail="Experience not found")

    db.delete(experience)
    db.commit()

    return None
