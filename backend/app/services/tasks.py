"""Database-backed admission and task status; upload bytes are never stored."""

import asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import text

from app.core.config import settings
from app.db.database import SessionLocal
from app.db.models import ServiceRun, Task

ACTIVE = ("pending", "running")


def now():
    return datetime.now(timezone.utc)


def expire_tasks(db):
    db.query(Task).filter(Task.status.in_(ACTIVE), Task.deadline < now()).update(
        {
            "status": "interrupted",
            "message": "Processing did not finish. Please retry.",
            "error_code": "interrupted",
            "finished_at": now(),
        },
        synchronize_session=False,
    )


def admit(db, user_id, kind):
    db.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended('task-admission',0))")
    )
    expire_tasks(db)
    active = (
        db.query(Task)
        .filter_by(user_id=user_id, kind=kind)
        .filter(Task.status.in_(ACTIVE))
        .first()
    )
    if active:
        return active, False
    previous = (
        db.query(Task)
        .filter_by(user_id=user_id, kind=kind)
        .order_by(Task.created_at.desc())
        .first()
    )
    cooldown = (
        settings.REFRESH_COOLDOWN_SECONDS
        if kind == "refresh"
        else settings.RESUME_COOLDOWN_SECONDS
    )
    if previous:
        retry = (
            int(
                (
                    previous.created_at + timedelta(seconds=cooldown) - now()
                ).total_seconds()
            )
            + 1
        )
        if retry > 0:
            raise HTTPException(
                429,
                "Please wait before starting another request.",
                headers={"Retry-After": str(retry)},
            )
    if (
        db.query(Task).filter(Task.status.in_(ACTIVE)).count()
        >= settings.MAX_ACTIVE_TASKS
    ):
        raise HTTPException(
            429,
            "Processing is busy. Please retry shortly.",
            headers={"Retry-After": "30"},
        )
    if kind == "resume":
        budget = db.get(ServiceRun, "resume-provider-budget")
        if budget and budget.next_allowed > now():
            retry = int((budget.next_allowed - now()).total_seconds()) + 1
            raise HTTPException(
                429,
                "Resume processing is busy. Please wait before trying again.",
                headers={"Retry-After": str(retry)},
            )
        if not budget:
            budget = ServiceRun(name="resume-provider-budget")
            db.add(budget)
        budget.next_allowed = now() + timedelta(
            seconds=settings.RESUME_GLOBAL_INTERVAL_SECONDS
        )
    task = Task(
        id=uuid4().hex,
        user_id=user_id,
        kind=kind,
        status="pending",
        message="Processing queued.",
        deadline=now() + timedelta(seconds=settings.TASK_TIMEOUT_SECONDS),
    )
    db.add(task)
    db.flush()
    return task, True


def update_task(task_id, status, message, error_code=None):
    with SessionLocal() as db:
        task = db.query(Task).filter_by(id=task_id).with_for_update().first()
        if not task or task.status not in ACTIVE:
            return False
        if task.deadline < now():
            task.status = "interrupted"
            task.message = "Processing did not finish. Please retry."
            task.error_code = "interrupted"
            task.finished_at = now()
            db.commit()
            return False
        task.status = status
        task.message = message
        task.error_code = error_code
        if status not in ACTIVE:
            task.finished_at = now()
        db.commit()
        return True


def read_task(db, task_id, user_id, kind):
    expire_tasks(db)
    db.commit()
    task = db.query(Task).filter_by(id=task_id, user_id=user_id, kind=kind).first()
    if not task:
        raise HTTPException(404, "Task not found.")
    return {
        "task_id": task.id,
        "status": task.status,
        "message": task.message,
        "error_code": task.error_code,
    }


async def run_task(task_id, worker, *args):
    if not await asyncio.to_thread(
        update_task, task_id, "running", "Processing started."
    ):
        return
    try:
        status, message = await asyncio.wait_for(
            worker(*args), timeout=settings.TASK_TIMEOUT_SECONDS
        )
        update_task(task_id, status, message)
    except asyncio.TimeoutError:
        update_task(task_id, "failed", "Processing timed out. Please retry.", "timeout")
    except asyncio.CancelledError:
        update_task(
            task_id,
            "interrupted",
            "Processing was interrupted. Please retry.",
            "interrupted",
        )
        raise
    except HTTPException as error:
        code = (
            "quota"
            if error.status_code == 429
            else (
                "profile_conflict"
                if error.status_code == 409
                else (
                    "provider_unavailable"
                    if error.status_code == 503
                    else "invalid_document"
                )
            )
        )
        update_task(task_id, "failed", str(error.detail), code)
        if error.status_code == 429:
            with SessionLocal() as db:
                db.execute(
                    text(
                        "SELECT pg_advisory_xact_lock(hashtextextended('task-admission',0))"
                    )
                )
                task = db.get(Task, task_id)
                if task and task.kind == "resume":
                    budget = db.get(ServiceRun, "resume-provider-budget")
                    if budget:
                        budget.next_allowed = now() + timedelta(
                            seconds=settings.PROVIDER_QUOTA_COOLDOWN_SECONDS
                        )
                    db.commit()
    except Exception:
        update_task(
            task_id,
            "failed",
            "Processing failed. Your previous data is unchanged. Please retry.",
            "processing_failed",
        )


def cleanup_tasks():
    with SessionLocal() as db:
        expire_tasks(db)
        db.query(Task).filter(
            Task.finished_at < now() - timedelta(days=settings.TASK_RETENTION_DAYS)
        ).delete(synchronize_session=False)
        db.commit()
