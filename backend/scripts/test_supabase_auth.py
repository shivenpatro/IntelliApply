"""
Script to test Supabase authentication.
This script verifies that the Supabase client is configured correctly
and can authenticate users.
"""

import os
import sys
from dotenv import load_dotenv

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

from app.db.supabase import supabase

def test_supabase_connection():
    """Test the connection to Supabase"""
    try:
        print("Testing Supabase connection...")
        
        # Get Supabase URL from environment
        supabase_url = os.getenv("SUPABASE_URL")
        if not supabase_url:
            print("Error: SUPABASE_URL environment variable not set")
            return False
        
        print(f"Using Supabase URL: {supabase_url}")
        
        # Test a simple query to verify connection
        response = supabase.table("users").select("*").limit(1).execute()
        
        if hasattr(response, 'data'):
            print("Successfully connected to Supabase!")
            return True
        else:
            print("Error: Could not retrieve data from Supabase")
            return False
            
    except Exception as e:
        print(f"Error connecting to Supabase: {str(e)}")
        return False

def test_auth_user_retrieval(token):
    """Test retrieving a user with a token"""
    try:
        print("\nTesting Supabase auth user retrieval...")
        print(f"Using token: {token[:10]}...")
        
        # Try to get user with the token
        response = supabase.auth.get_user(token)
        
        if response and response.user:
            print(f"Successfully retrieved user: {response.user.email}")
            print(f"User ID: {response.user.id}")
            return True
        else:
            print("Error: Could not retrieve user with the provided token")
            return False
            
    except Exception as e:
        print(f"Error retrieving user: {str(e)}")
        return False

if __name__ == "__main__":
    # Test Supabase connection
    connection_success = test_supabase_connection()
    
    if connection_success:
        # If connection successful, test auth
        print("\nTo test authentication, please provide a valid Supabase JWT token.")
        print("You can get this from your browser's localStorage after logging in.")
        token = input("Enter Supabase JWT token: ")
        
        if token:
            test_auth_user_retrieval(token)
        else:
            print("No token provided. Skipping auth test.")
    else:
        print("Supabase connection failed. Please check your configuration.")
