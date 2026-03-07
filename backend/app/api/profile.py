import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Response
from sqlalchemy.orm import Session
from typing import List
import logging

# Setup logger for this module
logger = logging.getLogger(__name__)

from app.core.config import settings
from app.core.schemas import Profile, ProfileCreate, ProfileUpdate, Skill, SkillCreate, Experience, ExperienceCreate, ResumeUploadResponse
from app.core.supabase_auth import get_current_active_user
from app.db.database import get_db
from app.db.models import User, Profile as ProfileModel, Skill as SkillModel, Experience as ExperienceModel
from app.services.resume_parser import parse_resume

router = APIRouter()

@router.get("", response_model=Profile)
async def get_profile(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    try:
        logger.info(f"Attempting to get profile for user id: {current_user.supabase_id}")
        profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
        if not profile:
            logger.warning(f"Profile not found for user id: {current_user.supabase_id}")
            raise HTTPException(status_code=404, detail="Profile not found")
        logger.info(f"Profile found for user id: {current_user.supabase_id}")
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error in get_profile for user {current_user.supabase_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching profile")

@router.put("/preferences", response_model=Profile)
async def update_preferences(profile_data: ProfileUpdate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

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

    # Read file bytes into memory
    file_bytes = await file.read()
    logger.info(f"Resume uploaded: {file.filename} ({len(file_bytes)} bytes) for user {current_user.supabase_id}")

    # Update the profile's resume_path with just the filename (for reference)
    profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
    if not profile:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found for authenticated user")

    profile.resume_path = f"uploaded/{file.filename}"  # Just a reference, not a real storage path
    db.commit()
    db.refresh(profile)

    # Trigger resume parsing in the background — pass bytes directly, no cloud storage
    background_tasks.add_task(parse_resume, file_bytes, file_extension, profile.id)

    return {"success": True, "message": "Resume uploaded and processing started"}

@router.post("/skills", response_model=List[Skill])
async def add_skills(skills: List[SkillCreate], current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    new_skills = []
    for skill_data in skills:
        existing_skill = db.query(SkillModel).filter(
            SkillModel.profile_id == profile.id,
            SkillModel.name == skill_data.name
        ).first()

        if existing_skill:
            for key, value in skill_data.dict().items():
                setattr(existing_skill, key, value)
            new_skills.append(existing_skill)
        else:
            skill = SkillModel(**skill_data.dict(), profile_id=profile.id)
            db.add(skill)
            new_skills.append(skill)

    db.commit()
    for skill in new_skills:
        db.refresh(skill)

    return new_skills

@router.delete("/skills/all", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_skills(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    try:
        num_deleted = db.query(SkillModel).filter(SkillModel.profile_id == profile.id).delete(synchronize_session=False)
        db.commit()
        logger.info(f"Deleted {num_deleted} skills for profile_id: {profile.id}")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting all skills for profile_id {profile.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete all skills")
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(skill_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
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
    profile = db.query(ProfileModel).filter(ProfileModel.id == current_user.supabase_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    new_experiences = []
    for exp_data in experiences:
        experience = ExperienceModel(**exp_data.dict(), profile_id=profile.id)
        db.add(experience)
        new_experiences.append(experience)

    db.commit()
    for exp in new_experiences:
        db.refresh(exp)

    return new_experiences

@router.delete("/experiences/{experience_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experience(experience_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
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
