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
from sqlalchemy.dialects.postgresql import UUID
from dotenv import load_dotenv
import uuid # Import uuid

# Add the parent directory (backend) to sys.path to allow 'app' imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings # Import settings


# Load environment variables
load_dotenv()
print(f"DEBUG: DATABASE_URL used by script: {settings.DATABASE_URL}") # Add debug print

from app.db.database import SessionLocal
from app.db.models import User, Profile, Skill, Experience, Job, UserJobMatch
from app.services.hackernews_scraper import run_hackernews_scraper
from app.services.job_matcher import match_jobs_for_user

async def get_test_user_and_profile(db: Session):
    """
    Fetches the test user (test@example.com) and their profile from the local cache tables.
    Assumes the user exists in Supabase Auth and has made at least one authenticated request
    to populate the local public.users and public.profiles tables.
    """
    test_email = "test.user.d0u5pg5j@example.com" # Use the actual test user email
    print(f"Attempting to fetch test user ({test_email}) from local cache...")
    test_user = db.query(User).filter(User.email == test_email).first()

    if not test_user:
        raise Exception(f"Test user '{test_email}' not found in local 'users' table. "
                        "Ensure the user exists in Supabase Auth and has made an authenticated request to the backend.")

    if not test_user.supabase_id:
         raise Exception(f"Test user '{test_user.email}' found in local 'users' table, but supabase_id is missing.")

    print(f"Found test user: {test_user.email} (Supabase ID: {test_user.supabase_id})")

    print(f"Attempting to fetch profile for user ID: {test_user.supabase_id}...")
    profile = db.query(Profile).filter(Profile.id == test_user.supabase_id).first()

    if not profile:
        raise Exception(f"Profile not found for user ID '{test_user.supabase_id}' in local 'profiles' table. "
                        "Ensure the Supabase trigger 'handle_new_user' is active or the user has made an authenticated request.")

    print("Existing profile found.")

    # Optional: Check/add skills/experience if needed, similar to previous logic, but fetch profile first.
    existing_skill_count = db.query(Skill).filter(Skill.profile_id == profile.id).count()
    if existing_skill_count == 0:
        print("Adding skills and experience to profile...")
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
        print("Skills and experience added.")
    else:
        print("Skills and experience already exist for this profile.")


    return test_user # Return the user object which contains the supabase_id

async def display_matched_jobs(db: Session, user_id: UUID):
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
        # Status is now a string directly from the DB due to native_enum=False
        print(f"   Status: {status}")
        print(f"   Source: {job.source}")
        print(f"   URL: {job.url}")
        print("-" * 80)

async def main():
    """Main function to test the job scraping and matching flow"""
    try:
        # Create DB session
        db = SessionLocal()
        
        # Get test user (will raise exception if not found/setup correctly)
        test_user = await get_test_user_and_profile(db)
        
        # Scrape jobs from Hacker News
        print("\nScraping jobs from Hacker News...")
        jobs = await run_hackernews_scraper(db, max_jobs=20)
        
        # Count jobs in database
        job_count = db.query(Job).count()
        print(f"\nTotal jobs in database: {job_count}")
        
        # Match jobs for the test user
        print(f"\nMatching jobs for test user (ID: {test_user.supabase_id})...")
        await match_jobs_for_user(test_user.supabase_id)
        
        # Display matched jobs
        await display_matched_jobs(db, test_user.supabase_id)
        
        db.close()
        print("\nJob flow test completed successfully!")
        
    except Exception as e:
        print(f"\nError during job flow test: {str(e)}")
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    asyncio.run(main())
