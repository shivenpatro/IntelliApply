"""
Script to test the job scraping and matching flow.
This script will:
1. Scrape jobs from Hacker News
2. Match them with a test user profile
3. Display the results
"""

import os
import sys
import asyncio
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

from app.db.database import SessionLocal
from app.db.models import User, Profile, Skill, Experience, Job, UserJobMatch
from app.services.hackernews_scraper import run_hackernews_scraper
from app.services.job_matcher import match_jobs_for_user

async def create_test_user_if_needed(db: Session):
    """Create a test user with a profile if one doesn't exist"""
    # Check if test user exists
    test_user = db.query(User).filter(User.email == "test@example.com").first()
    
    if not test_user:
        print("Creating test user...")
        # Create test user
        test_user = User(
            email="test@example.com",
            is_active=True,
            supabase_id="test-user-id"  # Dummy ID for testing
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        # Create profile
        profile = Profile(
            user_id=test_user.id,
            first_name="Test",
            last_name="User",
            desired_roles="Software Developer, Full Stack Developer, Frontend Developer",
            desired_locations="Remote, San Francisco, New York"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
        # Add skills
        skills = [
            Skill(profile_id=profile.id, name="Python", level="Expert"),
            Skill(profile_id=profile.id, name="JavaScript", level="Expert"),
            Skill(profile_id=profile.id, name="React", level="Intermediate"),
            Skill(profile_id=profile.id, name="Node.js", level="Intermediate"),
            Skill(profile_id=profile.id, name="SQL", level="Intermediate"),
            Skill(profile_id=profile.id, name="FastAPI", level="Beginner"),
        ]
        db.add_all(skills)
        
        # Add experience
        experience = Experience(
            profile_id=profile.id,
            title="Software Developer",
            company="Previous Company",
            location="Remote",
            description="Developed web applications using React, Node.js, and Python."
        )
        db.add(experience)
        
        db.commit()
        print("Test user created with profile, skills, and experience.")
    else:
        print(f"Using existing test user: {test_user.email}")
    
    return test_user

async def display_matched_jobs(db: Session, user_id: int):
    """Display the matched jobs for a user"""
    # Get all jobs with their match data for the user
    matches = db.query(
        Job, UserJobMatch.relevance_score, UserJobMatch.status
    ).join(
        UserJobMatch, Job.id == UserJobMatch.job_id
    ).filter(
        UserJobMatch.user_id == user_id
    ).order_by(
        UserJobMatch.relevance_score.desc()
    ).all()
    
    if not matches:
        print("No job matches found for the user.")
        return
    
    print(f"\nFound {len(matches)} job matches:")
    print("-" * 80)
    
    for i, (job, relevance_score, status) in enumerate(matches[:10], 1):  # Show top 10
        print(f"{i}. {job.title} at {job.company}")
        print(f"   Location: {job.location}")
        print(f"   Relevance: {relevance_score:.2f}")
        print(f"   Status: {status.value if hasattr(status, 'value') else status}")
        print(f"   Source: {job.source}")
        print(f"   URL: {job.url}")
        print("-" * 80)

async def main():
    """Main function to test the job scraping and matching flow"""
    try:
        # Create DB session
        db = SessionLocal()
        
        # Create or get test user
        test_user = await create_test_user_if_needed(db)
        
        # Scrape jobs from Hacker News
        print("\nScraping jobs from Hacker News...")
        jobs = await run_hackernews_scraper(db, max_jobs=20)
        
        # Count jobs in database
        job_count = db.query(Job).count()
        print(f"\nTotal jobs in database: {job_count}")
        
        # Match jobs for the test user
        print(f"\nMatching jobs for test user (ID: {test_user.id})...")
        await match_jobs_for_user(test_user.id)
        
        # Display matched jobs
        await display_matched_jobs(db, test_user.id)
        
        db.close()
        print("\nJob flow test completed successfully!")
        
    except Exception as e:
        print(f"\nError during job flow test: {str(e)}")
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    asyncio.run(main())
