import logging
from typing import List

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

# Setup logger for this module
logger = logging.getLogger(__name__)

from sqlalchemy import func

from app.core.config import settings
from app.core.neon_auth import get_current_active_user
from app.core.schemas import (
    Experience,
    ExperienceCreate,
    Profile,
    ProfileUpdate,
    ResumeUploadResponse,
    Skill,
    SkillCreate,
)
from app.db.database import get_db
from app.db.models import Experience as ExperienceModel
from app.db.models import Profile as ProfileModel
from app.db.models import Skill as SkillModel
from app.db.models import User
from app.services.resume_parser import parse_resume, validate_resume
from app.services.job_matcher import invalidate_recommendations
from app.services.tasks import admit, read_task, run_task

router = APIRouter()


@router.get("", response_model=Profile)
def get_profile(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
):
    try:
        profile = (
            db.query(ProfileModel)
            .filter(ProfileModel.id == current_user.supabase_id)
            .with_for_update()
            .first()
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        return profile
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500, detail="Internal server error fetching profile"
        )


@router.put("/preferences", response_model=Profile)
def update_preferences(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(ProfileModel)
        .filter(ProfileModel.id == current_user.supabase_id)
        .with_for_update()
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    db.refresh(profile, with_for_update=True)
    for key, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)

    if {"desired_roles", "desired_locations"} & profile_data.model_fields_set:
        invalidate_recommendations(db, profile.id)
    profile.version += 1
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/resume", response_model=ResumeUploadResponse, status_code=202)
def upload_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not settings.GEMINI_API_KEY:
        raise HTTPException(503, "Resume processing is currently unavailable.")
    filename = (file.filename or "").replace("\\", "/").rsplit("/", 1)[-1][:200]
    extension = filename.rsplit(".", 1)[-1].lower()
    if extension not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Use a PDF or DOCX resume.")
    data = file.file.read(settings.MAX_UPLOAD_BYTES + 1)
    validate_resume(data, extension)
    task, created = admit(db, current_user.supabase_id, "resume")
    if not created:
        raise HTTPException(
            409, "A resume is already processing. Please wait for it to finish."
        )
    profile = (
        db.query(ProfileModel)
        .filter_by(id=current_user.supabase_id)
        .with_for_update()
        .first()
    )
    if not profile:
        raise HTTPException(404, "Profile not found.")
    profile.version += 1
    task.input_version = profile.version
    task_id = task.id
    db.commit()
    background_tasks.add_task(
        run_task,
        task_id,
        parse_resume,
        data,
        extension,
        current_user.supabase_id,
        task_id,
        filename,
    )
    return {
        "success": True,
        "message": "Resume accepted. Processing started.",
        "task_id": task_id,
    }


@router.get("/resume/status/{task_id}")
def resume_status(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return read_task(db, task_id, current_user.supabase_id, "resume")


@router.post("/skills", response_model=List[Skill])
def add_skills(
    skills: List[SkillCreate],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(ProfileModel)
        .filter(ProfileModel.id == current_user.supabase_id)
        .with_for_update()
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    db.refresh(profile, with_for_update=True)
    invalidate_recommendations(db, profile.id)
    profile.version += 1
    new_skills = []
    for skill_data in skills:
        existing_skill = (
            db.query(SkillModel)
            .filter(
                SkillModel.profile_id == profile.id,
                func.lower(func.btrim(SkillModel.name)) == skill_data.name.lower(),
            )
            .first()
        )

        if existing_skill:
            for key, value in skill_data.model_dump().items():
                setattr(existing_skill, key, value)
            new_skills.append(existing_skill)
        else:
            skill = SkillModel(**skill_data.model_dump(), profile_id=profile.id)
            db.add(skill)
            db.flush()
            new_skills.append(skill)

    db.commit()
    for skill in new_skills:
        db.refresh(skill)

    return list({skill.id: skill for skill in new_skills}.values())


@router.delete("/skills/all", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_skills(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
):
    profile = (
        db.query(ProfileModel)
        .filter(ProfileModel.id == current_user.supabase_id)
        .with_for_update()
        .first()
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )

    try:
        invalidate_recommendations(db, profile.id)
        profile.version += 1
        (
            db.query(SkillModel)
            .filter(SkillModel.profile_id == profile.id)
            .delete(synchronize_session=False)
        )
        db.commit()
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete all skills",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    skill_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(ProfileModel)
        .filter(ProfileModel.id == current_user.supabase_id)
        .with_for_update()
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    skill = (
        db.query(SkillModel)
        .filter(SkillModel.id == skill_id, SkillModel.profile_id == profile.id)
        .first()
    )
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    invalidate_recommendations(db, profile.id)
    profile.version += 1
    db.delete(skill)
    db.commit()

    return None


@router.post("/experiences", response_model=List[Experience])
def add_experiences(
    experiences: List[ExperienceCreate],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(ProfileModel)
        .filter(ProfileModel.id == current_user.supabase_id)
        .with_for_update()
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    db.refresh(profile, with_for_update=True)
    invalidate_recommendations(db, profile.id)
    profile.version += 1
    new_experiences = []
    for exp_data in experiences:
        experience = ExperienceModel(**exp_data.model_dump(), profile_id=profile.id)
        db.add(experience)
        new_experiences.append(experience)

    db.commit()
    for exp in new_experiences:
        db.refresh(exp)

    return new_experiences


@router.delete("/experiences/{experience_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_experience(
    experience_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(ProfileModel)
        .filter(ProfileModel.id == current_user.supabase_id)
        .with_for_update()
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    experience = (
        db.query(ExperienceModel)
        .filter(
            ExperienceModel.id == experience_id,
            ExperienceModel.profile_id == profile.id,
        )
        .first()
    )

    if not experience:
        raise HTTPException(status_code=404, detail="Experience not found")

    invalidate_recommendations(db, profile.id)
    profile.version += 1
    db.delete(experience)
    db.commit()

    return None


@router.put("/experiences/{experience_id}", response_model=Experience)
def update_experience(
    experience_id: int,
    values: ExperienceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(ProfileModel)
        .filter_by(id=current_user.supabase_id)
        .with_for_update()
        .first()
    )
    experience = (
        db.query(ExperienceModel)
        .filter_by(id=experience_id, profile_id=current_user.supabase_id)
        .first()
    )
    if not profile or not experience:
        raise HTTPException(404, "Experience not found.")
    for key, value in values.model_dump().items():
        setattr(experience, key, value)
    invalidate_recommendations(db, profile.id)
    profile.version += 1
    db.commit()
    db.refresh(experience)
    return experience
