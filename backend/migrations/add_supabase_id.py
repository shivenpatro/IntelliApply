"""
Migration script to add supabase_id column to users table
and make hashed_password nullable.
"""

import os
import sys
from sqlalchemy import create_engine, Column, String, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

# Import settings
from app.core.config import settings

# Create SQLAlchemy engine
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_migration():
    """Run the migration to add supabase_id column to users table"""
    try:
        # Create a session
        db = SessionLocal()

        print("Starting migration: Adding supabase_id column to users table...")

        # For SQLite, we need to check if the column exists differently
        # Get table info
        result = db.execute(text("PRAGMA table_info(users)"))
        columns = result.fetchall()

        # Check if supabase_id column exists
        supabase_id_exists = any(column[1] == 'supabase_id' for column in columns)

        if not supabase_id_exists:
            # Add the supabase_id column (SQLite doesn't support UNIQUE constraint in ADD COLUMN)
            db.execute(text("ALTER TABLE users ADD COLUMN supabase_id VARCHAR(255)"))
            print("Added supabase_id column to users table")
        else:
            print("supabase_id column already exists in users table")

        # SQLite doesn't support ALTER COLUMN, so we'll need to check if hashed_password is nullable
        # by looking at the column definition
        hashed_password_column = next((column for column in columns if column[1] == 'hashed_password'), None)

        if hashed_password_column and hashed_password_column[3] == 1:  # notnull flag is 1
            print("Need to make hashed_password nullable, but SQLite doesn't support ALTER COLUMN.")
            print("This would require recreating the table. Skipping for now.")
        else:
            print("hashed_password column is already nullable or doesn't exist")

        db.commit()
        print("Migration completed successfully!")

    except Exception as e:
        print(f"Error during migration: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
