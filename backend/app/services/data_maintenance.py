"""Expire untracked listings without deleting application history."""

import asyncio
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.db.database import SessionLocal
from app.db.models import Job, UserJobMatch


def _delete_old_job_postings():
    cutoff = datetime.now(timezone.utc) - timedelta(
        days=settings.JOB_POSTING_RETENTION_DAYS
    )
    with SessionLocal() as db:
        tracked = db.query(UserJobMatch.job_id).filter(UserJobMatch.status != "pending")
        old = (
            db.query(Job.id).filter(Job.scraped_at < cutoff, ~Job.id.in_(tracked)).all()
        )
        ids = [row.id for row in old]
        if ids:
            db.query(UserJobMatch).filter(UserJobMatch.job_id.in_(ids)).delete(
                synchronize_session=False
            )
            db.query(Job).filter(Job.id.in_(ids)).delete(synchronize_session=False)
        db.commit()
        return len(ids)


async def delete_old_job_postings():
    return await asyncio.to_thread(_delete_old_job_postings)
