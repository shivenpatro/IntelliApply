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

from supabase import create_client, Client # Import Supabase client
from app.db.database import SessionLocal
from app.db.models import User, Profile, Skill, Experience, Job, UserJobMatch
# Import trigger_job_scraping instead of run_hackernews_scraper
from app.services.job_scraper import trigger_job_scraping 
from app.services.job_matcher import match_jobs_for_user

async def get_test_user_and_profile(db: Session):
    """
    Fetches the test user (test@example.com) and their profile, creating them if they don't exist.
    """
    test_email = "test.user.d0u5pg5j@example.com"
    print(f"Attempting to get Supabase user {test_email}...")
    try:
        # 1. Get user from Supabase Auth
        # list_users() is synchronous, so we don't await it directly here.
        # The supabase client itself handles async operations if needed.
        users_list = supabase_client.auth.admin.list_users() # Returns a list of User objects
        found_user = None
        for u in users_list: # Iterate directly over the list
            if u.email == test_email:
                found_user = u
                break
        
        if found_user:
            print(f"Found Supabase user: {test_email} (ID: {found_user.id})")
            test_user_id = found_user.id
        else:
            print(f"User not found in Supabase. Creating user {test_email}...")
            # Create user in Supabase
            import secrets
            import string
            password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
            # create_user is also synchronous on the admin API
            create_response = supabase_client.auth.admin.create_user({
                "email": test_email,
                "password": password,
                "email_confirm": True  # Auto-confirm email
            })
            if create_response and create_response.id: # Check if user object is returned and has id
                print(f"Successfully created Supabase user {test_email} (ID: {create_response.id})")
                test_user_id = create_response.id
            else:
                # The create_user response might not have a nested 'user' object like other calls
                # It might directly return the user object or an error.
                # Let's assume if no ID, it failed.
                error_detail = getattr(create_response, 'error', 'Unknown error')
                raise Exception(f"Failed to create Supabase user: {error_detail}")
        
        # 2. Get or create profile
        print(f"Attempting to fetch profile for user ID: {test_user_id}...")
        profile = db.query(Profile).filter(Profile.id == test_user_id).first()
        if profile:
            print("Existing profile found.")
        else:
            print("No profile found. Creating...")
            profile = Profile(id=test_user_id, first_name="Test", last_name="User", desired_roles="Software Engineer", desired_locations="Remote")
            db.add(profile)
            db.commit()
            print("Created test profile.")
            
        # 3. Get or create local User
        local_user = db.query(User).filter(User.supabase_id == test_user_id).first()
        if not local_user:
            print("Creating local user...")
            local_user = User(email=test_email, supabase_id=test_user_id, hashed_password="test", is_active=True)
            db.add(local_user)
            db.commit()
            print("Created local user.")
        
        # 4. Add skills and experience if needed
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

        db.commit() # Commit any changes to profile or local_user
        # db.close() # Don't close the session here, let main() handle it
        return test_user_id # Return the ID (Supabase UUID)

    except Exception as e:
        print(f"Error getting/creating user and profile: {e}")
        if 'db' in locals():
            db.close()
        raise e

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
        
        # Get test user ID (will raise exception if not found/setup correctly)
        # Pass the session from main to be used by get_test_user_and_profile
        test_user_supabase_id = await get_test_user_and_profile(db) 
        
        # Trigger all configured job scraping
        print("\nTriggering job scraping (includes Indeed if configured)...")
        await trigger_job_scraping() # This will use the session from within trigger_job_scraping
        
        # Count jobs in database (use a new session for this query after scraping)
        db_for_count = SessionLocal()
        job_count = db_for_count.query(Job).count()
        db_for_count.close()
        print(f"\nTotal jobs in database: {job_count}")
        
        # Match jobs for the test user
        print(f"\nMatching jobs for test user (ID: {test_user_supabase_id})...")
        await match_jobs_for_user(test_user_supabase_id)
        
        # Display matched jobs
        await display_matched_jobs(db, test_user_supabase_id)
        
        db.close() # Close the session created in main()
        print("\nJob flow test completed successfully!")
        
    except Exception as e:
        print(f"\nError during job flow test: {str(e)}")
        if 'db' in locals():
            db.close()

# Initialize Supabase client at module level
supabase_client: Client = None
if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
    supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
else:
    print("Supabase URL or Service Key not configured. Supabase operations in this script will fail.")

if __name__ == "__main__":
    if not supabase_client:
        print("Exiting script because Supabase client could not be initialized.")
    else:
        asyncio.run(main())
