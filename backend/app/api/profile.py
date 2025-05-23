import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
import shutil
from typing import List
import logging # Import logging

# Setup logger for this module
logger = logging.getLogger(__name__)

from app.core.config import settings
from app.core.schemas import Profile, ProfileCreate, ProfileUpdate, Skill, SkillCreate, Experience, ExperienceCreate, ResumeUploadResponse
from app.core.supabase_auth import get_current_active_user
from app.db.database import get_db
from app.db.models import User, Profile as ProfileModel, Skill as SkillModel, Experience as ExperienceModel
from app.services.resume_parser import parse_resume

router = APIRouter()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)

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

    # Create user directory using their Supabase UUID for uniqueness
    user_upload_dir = os.path.join(settings.UPLOAD_DIRECTORY, str(current_user.supabase_id))
    os.makedirs(user_upload_dir, exist_ok=True)

    # Save the file
    file_path = os.path.join(user_upload_dir, f"resume.{file_extension}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update the profile with the resume path
    # Fetch profile using supabase_id
    profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
    if not profile:
        # This case should ideally be handled by the trigger or initial auth, but as a fallback:
        # profile = ProfileModel(id=current_user.supabase_id) # Create profile if missing
        # db.add(profile)
        # For now, raise error if profile is missing after auth
         raise HTTPException(status_code=404, detail="Profile not found for authenticated user")


    profile.resume_path = file_path
    db.commit()

    # Trigger resume parsing in the background
    background_tasks.add_task(parse_resume, file_path, profile.id, db)

    return {"success": True, "message": "Resume uploaded and processing started"}

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
