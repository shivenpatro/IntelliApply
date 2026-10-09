from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.neon_auth import get_current_active_user
from app.core.schemas import JobWithMatch, UserJobMatchUpdate
from app.db.database import get_db
from app.db.models import Job, JobStatus, UserJobMatch
from app.services.job_matcher import match_jobs_for_user
from app.services.job_scraper import trigger_job_scraping
from app.services.tasks import admit, read_task, run_task

router = APIRouter()


def visible():
    return or_(UserJobMatch.is_current.is_(True), UserJobMatch.status != "pending")


@router.get("/matched", response_model=list[JobWithMatch])
def get_matched_jobs(
    user=Depends(get_current_active_user), db: Session = Depends(get_db)
):
    rows = (
        db.query(Job, UserJobMatch)
        .join(UserJobMatch, Job.id == UserJobMatch.job_id)
        .filter(UserJobMatch.user_id == user.supabase_id, visible())
        .order_by(UserJobMatch.is_current.desc(), UserJobMatch.relevance_score.desc())
        .all()
    )
    return [
        {
            **{c.name: getattr(job, c.name) for c in Job.__table__.columns},
            "relevance_score": match.relevance_score or 0,
            "status": match.status,
            "is_current": match.is_current,
        }
        for job, match in rows
    ]


@router.put("/{job_id}/status")
def update_job_status(
    job_id: int,
    status_update: UserJobMatchUpdate,
    user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    match = (
        db.query(UserJobMatch)
        .filter_by(user_id=user.supabase_id, job_id=job_id)
        .first()
    )
    if not match:
        raise HTTPException(404, "Job match not found.")
    match.status = status_update.status.value
    db.commit()
    return {"success": True}


async def perform_job_refresh(user_id):
    scraping = await trigger_job_scraping()
    _, message = await match_jobs_for_user(user_id)
    if scraping["status"] != "completed":
        return "partial_failure", scraping["message"] + " " + message
    return "completed", scraping["message"] + " " + message


@router.post("/refresh", status_code=202)
def refresh_jobs(
    background_tasks: BackgroundTasks,
    user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    task, created = admit(db, user.supabase_id, "refresh")
    task_id = task.id
    db.commit()
    if created:
        background_tasks.add_task(
            run_task, task_id, perform_job_refresh, user.supabase_id
        )
    return {
        "task_id": task_id,
        "message": (
            "Job refresh started."
            if created
            else "Your existing refresh is still processing."
        ),
    }


@router.get("/refresh/status/{task_id}")
def get_refresh_status(
    task_id: str, user=Depends(get_current_active_user), db: Session = Depends(get_db)
):
    return read_task(db, task_id, user.supabase_id, "refresh")


@router.get("/counts")
def get_counts(user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    counts = {
        status.value: db.query(UserJobMatch)
        .filter(
            UserJobMatch.user_id == user.supabase_id,
            visible(),
            UserJobMatch.status == status.value,
        )
        .count()
        for status in JobStatus
    }
    return {"total": sum(counts.values()), "by_status": counts}
