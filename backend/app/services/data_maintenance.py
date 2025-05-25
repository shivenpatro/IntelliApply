import logging
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models import Job, UserJobMatch
from app.core.config import settings
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

async def delete_old_job_postings():
    """
    Deletes job postings (and their related matches) older than a specified number of days.
    """
    days_to_keep = settings.JOB_POSTING_RETENTION_DAYS or 30 # Default to 30 days if not set
    cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
    
    db: Session = SessionLocal()
    try:
        logger.info(f"Starting deletion of job postings older than {cutoff_date} (retention: {days_to_keep} days).")
        
        # Find old jobs
        # We'll use 'scraped_at' as the primary date, as 'posted_date' might be unreliable or missing
        # If 'scraped_at' is also unreliable, this logic might need adjustment
        old_jobs_query = db.query(Job).filter(Job.scraped_at < cutoff_date)
        old_jobs_count = old_jobs_query.count()

        if old_jobs_count == 0:
            logger.info("No old job postings to delete.")
            return

        logger.info(f"Found {old_jobs_count} old job postings to delete.")

        # To delete related UserJobMatch entries, we can iterate or use a subquery if supported well.
        # Iteration is safer for ORM relationships if cascading delete is not set up at DB level.
        deleted_jobs_count = 0
        deleted_matches_count = 0

        for job in old_jobs_query.all(): # Iterate over the found old jobs
            # Delete related UserJobMatch entries
            matches_deleted = db.query(UserJobMatch).filter(UserJobMatch.job_id == job.id).delete(synchronize_session=False)
            deleted_matches_count += matches_deleted
            
            # Delete the job itself
            db.delete(job)
            deleted_jobs_count += 1
        
        db.commit()
        logger.info(f"Successfully deleted {deleted_jobs_count} old job postings and {deleted_matches_count} related user job matches.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error during deletion of old job postings: {e}", exc_info=True)
    finally:
        db.close()
