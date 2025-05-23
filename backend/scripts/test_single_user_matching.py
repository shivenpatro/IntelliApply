import asyncio
import os
import sys

# Adjust Python path to allow imports from the 'app' module
# __file__ is .../backend/scripts/test_single_user_matching.py
# We want to add .../backend to sys.path so that 'app' is a top-level module findable from there.
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Also ensure project root is there for .env loading, though it might be less critical for 'from app...'
project_root = os.path.abspath(os.path.join(backend_dir, ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root) # project_root is C:\complete CSE\projects\IntelliApply

from app.services.job_matcher import match_jobs_for_user
from app.db.database import SessionLocal, engine # To ensure DB is initialized if needed by models
from app.db.models import Base # To ensure models are loaded

async def main():
    # --- IMPORTANT ---
    # Replace with the actual Supabase User ID (UUID string) of the user you want to test.
    # This is the user whose profile will be used for matching.
    # Example for clinetestuser005@example.com (based on previous logs):
    test_user_supabase_id = "23298ca1-a583-4045-83d2-f6e88417333b" 
    
    print(f"Attempting to match jobs for user with Supabase ID: {test_user_supabase_id}")
    
    # Ensure tables are created (optional, usually handled by main app startup)
    # Base.metadata.create_all(bind=engine) 
    
    await match_jobs_for_user(test_user_supabase_id)
    print(f"Finished job matching test for user {test_user_supabase_id}.")

if __name__ == "__main__":
    # Load .env variables if running script directly (especially DATABASE_URL)
    # project_root is already defined above
    from dotenv import load_dotenv
    dotenv_path = os.path.join(project_root, ".env") # project_root is C:\complete CSE\projects\IntelliApply
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path)
        print(f"Loaded .env file from {dotenv_path}")
    else:
        print(f"Warning: .env file not found at {dotenv_path}")

    asyncio.run(main())
