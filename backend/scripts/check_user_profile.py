import sys
import os
# Add project root to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
import pathlib

# Load environment variables from .env file
project_root = pathlib.Path(__file__).parent.parent
dotenv_path = project_root / ".env"
load_dotenv(dotenv_path=dotenv_path)

import asyncio
from supabase import create_client, Client
from app.core.config import settings

async def check_user_profile(user_id: str):
    """Checks if a user with the given Supabase ID has a profile."""
    supabase_url = settings.SUPABASE_URL
    supabase_key = settings.SUPABASE_SERVICE_KEY

    if not supabase_url or not supabase_key:
        print("Supabase URL or Key not found in environment variables.")
        return

    supabase: Client = create_client(supabase_url, supabase_key)

    try:
        # 1. Check if the user exists in the auth.users table (using admin API)
        try:
            user = await supabase.auth.admin.get_user_by_id(user_id)
            if user:
                print(f"User found in auth.users with ID: {user_id}")
            else:
                print(f"User NOT found in auth.users with ID: {user_id}")
                return # Stop here if user doesn't exist
        except Exception as e:
            print(f"Error getting user from auth.users: {e}")
            return

        # 2. Check if a profile exists in the public.profiles table
        response = await supabase.table("profiles").select("*").eq("id", user_id).execute()
        if response.data:
            print(f"Profile found for user ID {user_id}: {response.data}")
        else:
            print(f"No profile found for user ID {user_id}")

    except Exception as e:
        print(f"Error checking user/profile: {e}")

if __name__ == "__main__":
    import asyncio
    # Replace with the actual user ID you want to check
    user_id_to_check = "51f14b64-b92d-431c-9ab2-57873c8170b6"
    asyncio.run(check_user_profile(user_id_to_check))
