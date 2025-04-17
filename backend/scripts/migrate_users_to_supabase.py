"""
Script to migrate existing users to Supabase.
This creates Supabase users for existing users in the database.
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
from app.db.models import User
from app.db.supabase import supabase

async def migrate_users():
    """Migrate existing users to Supabase"""
    try:
        # Create a session
        db = SessionLocal()
        
        print("Starting user migration to Supabase...")
        
        # Get all users without a supabase_id
        users = db.query(User).filter(User.supabase_id.is_(None)).all()
        print(f"Found {len(users)} users to migrate")
        
        for user in users:
            try:
                print(f"Migrating user {user.email}...")
                
                # Generate a random password (users will need to use "forgot password" to set their own)
                import secrets
                import string
                password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
                
                # Create user in Supabase
                response = supabase.auth.admin.create_user({
                    "email": user.email,
                    "password": password,
                    "email_confirm": True  # Auto-confirm email
                })
                
                if response.user and response.user.id:
                    # Update user in our database with Supabase ID
                    user.supabase_id = response.user.id
                    db.commit()
                    print(f"Successfully migrated user {user.email}")
                else:
                    print(f"Failed to create Supabase user for {user.email}: No user ID returned")
            
            except Exception as e:
                print(f"Error migrating user {user.email}: {str(e)}")
                db.rollback()
        
        print("User migration completed!")
        
    except Exception as e:
        print(f"Error during migration: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(migrate_users())
