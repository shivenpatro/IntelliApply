from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.core.schemas import JobWithMatch, UserJobMatchUpdate
from app.core.supabase_auth import get_current_active_user
from app.db.database import get_db
from app.db.models import User, Job, UserJobMatch, JobStatus
from app.services.job_scraper import trigger_job_scraping
from app.services.job_matcher import match_jobs_for_user

router = APIRouter()

@router.get("/matched", response_model=List[JobWithMatch])
async def get_matched_jobs(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    try:
        # Get all jobs with their match data for the current user
        matches = db.query(
            Job, UserJobMatch.relevance_score, UserJobMatch.status
        ).join(
            UserJobMatch, Job.id == UserJobMatch.job_id
        ).filter(
            UserJobMatch.user_id == current_user.id
        ).order_by(
            UserJobMatch.relevance_score.desc()
        ).all()

        # Format response
        result = []
        for job, relevance_score, status in matches:
            # Convert SQLAlchemy model to dict and add relevance score and status
            job_dict = {c.name: getattr(job, c.name) for c in job.__table__.columns}
            job_dict["relevance_score"] = float(relevance_score) if relevance_score is not None else 0.0
            job_dict["status"] = status.value if hasattr(status, 'value') else status
            result.append(job_dict)

        print(f"Returning {len(result)} matched jobs for user {current_user.id}")
        return result
    except Exception as e:
        print(f"Error in get_matched_jobs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve matched jobs: {str(e)}"
        )

@router.put("/{job_id}/status", response_model=dict)
async def update_job_status(
    job_id: int,
    status_update: UserJobMatchUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Find the user-job match
    match = db.query(UserJobMatch).filter(
        UserJobMatch.user_id == current_user.id,
        UserJobMatch.job_id == job_id
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Job match not found")

    # Update status
    match.status = status_update.status
    db.commit()

    return {"success": True}

@router.post("/refresh", response_model=dict)
async def refresh_jobs(background_tasks: BackgroundTasks, current_user: User = Depends(get_current_active_user)):
    # Trigger job scraping in the background
    background_tasks.add_task(trigger_job_scraping)
    # Schedule matching for the current user
    background_tasks.add_task(match_jobs_for_user, current_user.id)

    return {"success": True, "message": "Job refresh scheduled"}

@router.get("/count", response_model=dict)
async def get_job_count(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Count jobs by status
    counts = {}
    for status in JobStatus:
        count = db.query(UserJobMatch).filter(
            UserJobMatch.user_id == current_user.id,
            UserJobMatch.status == status
        ).count()
        counts[status.value] = count

    # Get total count
    total = sum(counts.values())

    return {"total": total, "by_status": counts}
