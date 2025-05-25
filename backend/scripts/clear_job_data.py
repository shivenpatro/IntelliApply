import logging
import asyncio
from sqlalchemy.orm import Session
from sqlalchemy.sql import text  # Import text for raw SQL

# Adjust the import path based on how you run this script
# If running from the project root (c:/complete CSE/projects/IntelliApply):
from app.db.database import SessionLocal, engine
from app.db.models import UserJobMatch, Job  # Assuming these are your SQLAlchemy models

# If running from backend/scripts directory, you might need:
# import sys
# sys.path.append('../..') # Add project root to Python path
# from app.db.database import SessionLocal, engine
# from app.db.models import UserJobMatch, Job


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def clear_data():
    db: Session = SessionLocal()
    try:
        logger.info("Starting to clear job-related data...")

        # Delete all records from UserJobMatch table first due to foreign key constraints
        # if Job table is deleted first, and UserJobMatch has a foreign key to Job, it might fail
        # or if ON DELETE CASCADE is set, this order is still safe.
        
        # Using ORM delete (safer if there are ORM-level cascades or events)
        num_user_job_matches_deleted = db.query(UserJobMatch).delete(synchronize_session=False)
        logger.info(f"Deleted {num_user_job_matches_deleted} records from user_job_match table.")

        # Using ORM delete for Jobs
        num_jobs_deleted = db.query(Job).delete(synchronize_session=False)
        logger.info(f"Deleted {num_jobs_deleted} records from jobs table.")
        
        # Alternatively, using raw SQL for potentially faster deletion on large tables:
        # Note: Using text() is important for SQLAlchemy to handle the SQL safely.
        # db.execute(text("DELETE FROM user_job_match;"))
        # logger.info("Executed DELETE FROM user_job_match;")
        # db.execute(text("DELETE FROM jobs;"))
        # logger.info("Executed DELETE FROM jobs;")

        db.commit()
        logger.info("Successfully cleared job-related data from user_job_match and jobs tables.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error clearing data: {e}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("Running script to clear job-related database tables.")
    # To run async function from sync context:
    # For Python 3.7+
    asyncio.run(clear_data())
    logger.info("Script finished.")
