from supabase import create_client
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Supabase client
def get_supabase_client():
    """Get initialized Supabase client"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        print("WARNING: Supabase credentials not found. Using mock client for testing.")
        # Return a mock client for testing
        from unittest.mock import MagicMock
        mock_client = MagicMock()
        # Set up auth.get_user to return a mock user
        mock_client.auth.get_user.return_value.user = MagicMock(id="test-user-id", email="test@example.com")
        return mock_client

    return create_client(supabase_url, supabase_key)

supabase = get_supabase_client()
