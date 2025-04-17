"""
Database initialization script for IntelliApply.
Run this script to create all required tables in the SQLite database.
"""

from app.db.database import Base, engine
from app.db.models import User, Profile, Skill, Experience, Job, UserJobMatch

def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_db()
