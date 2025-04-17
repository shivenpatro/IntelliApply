"""
Script to create job matches for a test user.
This will ensure our test user has job matches displayed in the dashboard.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
import asyncio
import sys

from app.db.database import SessionLocal
from app.db.models import User, Job, UserJobMatch, JobStatus
from app.services.job_matcher import match_jobs_for_user

async def create_job_matches_for_user(email="test@example.com"):
    """Create job matches for a specific user"""
    try:
        # Create DB session
        db = SessionLocal()
        
        # Find the user by email
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"User with email {email} not found!")
            db.close()
            return
        
        # Get all jobs
        jobs = db.query(Job).all()
        if not jobs:
            print("No jobs found in database. Please run add_sample_jobs.py first.")
            db.close()
            return
            
        print(f"Found {len(jobs)} jobs in database")
        
        # Check existing matches
        existing_matches = db.query(UserJobMatch).filter(UserJobMatch.user_id == user.id).count()
        print(f"User currently has {existing_matches} job matches")
        
        # Create simple matches for each job
        count = 0
        for i, job in enumerate(jobs):
            # Check if match already exists
            existing = db.query(UserJobMatch).filter(
                UserJobMatch.user_id == user.id,
                UserJobMatch.job_id == job.id
            ).first()
            
            if not existing:
                # Calculate a simple relevance score between 0.3 and 0.95
                relevance_score = 0.3 + (0.65 * (len(jobs) - i) / len(jobs))
                
                # Create the match with a default "pending" status
                match = UserJobMatch(
                    user_id=user.id,
                    job_id=job.id,
                    relevance_score=relevance_score,
                    status=JobStatus.PENDING
                )
                db.add(match)
                count += 1
                
        # Commit changes
        db.commit()
        print(f"Created {count} new job matches for user")
        
        # Update some matches with different statuses for demo purposes
        if count > 0:
            matches = db.query(UserJobMatch).filter(UserJobMatch.user_id == user.id).all()
            
            # Set a few as interested, applied, and ignored
            statuses = [JobStatus.INTERESTED, JobStatus.APPLIED, JobStatus.IGNORED]
            for i, match in enumerate(matches[:len(statuses)]):
                match.status = statuses[i]
            
            db.commit()
            print("Updated some job matches with different statuses")
        
        db.close()
        print("Job matching completed successfully!")
        
    except Exception as e:
        print(f"Error creating job matches: {str(e)}")
        if 'db' in locals():
            db.rollback()
            db.close()

if __name__ == "__main__":
    # Get email from command line args if provided
    email = sys.argv[1] if len(sys.argv) > 1 else "test@example.com"
    asyncio.run(create_job_matches_for_user(email))
