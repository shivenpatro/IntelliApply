"""
Script to test the Supabase connection and authentication.
This script verifies that the Supabase client is configured correctly
and can connect to your Supabase project.
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
        
        # Get Supabase URL and key from environment
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            print("Error: SUPABASE_URL and SUPABASE_KEY environment variables not set")
            return False
        
        print(f"Using Supabase URL: {supabase_url}")
        
        # Test a simple query to verify connection
        # This will fail if the keys are incorrect or the connection fails
        response = supabase.auth.get_session()
        
        print("Successfully connected to Supabase!")
        print(f"Response: {response}")
        return True
            
    except Exception as e:
        print(f"Error connecting to Supabase: {str(e)}")
        return False

def test_supabase_auth():
    """Test Supabase authentication functionality"""
    try:
        print("\nTesting Supabase authentication...")
        
        # Generate a random test email
        import random
        import string
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        test_email = f"test.user.{random_suffix}@example.com"
        test_password = "Test@Password123"
        
        print(f"Attempting to sign up with email: {test_email}")
        
        # Try to sign up a test user
        response = supabase.auth.sign_up({
            "email": test_email,
            "password": test_password
        })
        
        if response.user:
            print(f"Successfully created test user with ID: {response.user.id}")
            print("Supabase authentication is working correctly!")
            return True
        else:
            print("Error: Could not create test user")
            print(f"Response: {response}")
            return False
            
    except Exception as e:
        print(f"Error testing Supabase authentication: {str(e)}")
        return False

if __name__ == "__main__":
    # Test Supabase connection
    connection_success = test_supabase_connection()
    
    if connection_success:
        # If connection successful, test auth
        test_supabase_auth()
    else:
        print("Supabase connection failed. Please check your configuration.")
