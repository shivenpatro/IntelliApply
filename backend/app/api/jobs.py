from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict
import uuid # For generating task IDs
import logging # For logging

from app.core.schemas import JobWithMatch, UserJobMatchUpdate
from app.core.supabase_auth import get_current_active_user
from app.db.database import get_db
from app.db.models import User, Job, UserJobMatch, JobStatus
from app.services.job_scraper import trigger_job_scraping # This will need to accept task_id and update status
from app.services.job_matcher import match_jobs_for_user # This will also need task_id and update status

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory store for task statuses. For production, use Redis or a DB table.
task_statuses: Dict[str, Dict[str, str]] = {}

@router.get("/matched", response_model=List[JobWithMatch])
async def get_matched_jobs(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    try:
        # Get all jobs with their match data for the current user
        matches = db.query(
            Job, UserJobMatch.relevance_score, UserJobMatch.status
        ).join(
            UserJobMatch, Job.id == UserJobMatch.job_id
        ).filter(
            UserJobMatch.user_id == current_user.supabase_id # Filter by Supabase UUID
        ).order_by(
            UserJobMatch.relevance_score.desc()
        ).all()

        # Format response
        result = []
        for job, relevance_score, status in matches:
            # Convert SQLAlchemy model to dict and add relevance score and status
            job_dict = {c.name: getattr(job, c.name) for c in job.__table__.columns}
            job_dict["relevance_score"] = float(relevance_score) if relevance_score is not None else 0.0
            job_dict["status"] = status # Status is now a plain string from the DB
            result.append(job_dict)

        print(f"Returning {len(result)} matched jobs for user {current_user.supabase_id}")
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
    # Find the user-job match using supabase_id
    match = db.query(UserJobMatch).filter(
        UserJobMatch.user_id == current_user.supabase_id,
        UserJobMatch.job_id == job_id
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Job match not found")

    # Update status (status_update.status should be 'pending', 'interested', etc.)
    match.status = status_update.status
    db.commit()

    return {"success": True}

    return {"success": True}

@router.post("/refresh", status_code=status.HTTP_202_ACCEPTED, response_model=Dict[str, str])
async def refresh_jobs_and_matches_api(background_tasks: BackgroundTasks, current_user: User = Depends(get_current_active_user)):
    task_id = uuid.uuid4().hex
    task_statuses[task_id] = {"status": "pending", "message": "Job refresh process initiated."}
    
    logger.info(f"User {current_user.email} triggered job refresh. Task ID: {task_id}")

    # Pass task_id to background tasks
    # Note: The actual functions trigger_job_scraping and match_jobs_for_user
    # will need to be modified to accept task_id and update task_statuses.
    # For now, we'll queue them. The status updates will be added in subsequent steps.
    background_tasks.add_task(trigger_job_scraping, task_id=task_id, task_statuses_ref=task_statuses)
    background_tasks.add_task(match_jobs_for_user, user_id=current_user.supabase_id, task_id=task_id, task_statuses_ref=task_statuses)

    return {"task_id": task_id, "message": "Job refresh process started. Poll status endpoint for updates."}

@router.get("/refresh/status/{task_id}", response_model=Dict[str, str])
async def get_refresh_status(task_id: str):
    status_info = task_statuses.get(task_id)
    if not status_info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task ID not found.")
    
    # Optional: Clean up old tasks after some time or if status is 'completed'/'failed'
    # For simplicity, not adding cleanup logic here yet.
    return {"task_id": task_id, **status_info}

@router.get("/counts", response_model=dict) # Changed path to /counts (plural)
async def get_job_count(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Count jobs by status using supabase_id and string status values
    counts = {}
    # Use the string values directly for querying
    for status_value in [s.value for s in JobStatus]:
        count = db.query(UserJobMatch).filter(
            UserJobMatch.user_id == current_user.supabase_id,
            UserJobMatch.status == status_value
        ).count()
        counts[status_value] = count

    # Get total count
    total = sum(counts.values())

    return {"total": total, "by_status": counts}
