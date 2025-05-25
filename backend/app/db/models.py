from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text, Float, BigInteger, JSON
from sqlalchemy.dialects.postgresql import UUID # Import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import uuid # Import uuid for default generation if needed, though Supabase handles it

from app.db.database import Base

class JobStatus(enum.Enum):
    PENDING = "pending"
    INTERESTED = "interested"
    APPLIED = "applied"
    IGNORED = "ignored"

class User(Base):
    __tablename__ = "users" # This table acts as a local cache/extension

    id = Column(Integer, primary_key=True, index=True) # Local DB ID
    # Change supabase_id to UUID type to match Supabase auth.users.id and allow proper joins
    supabase_id = Column(UUID(as_uuid=True), unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True) # Kept nullable
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Profile relationship links Profile.id (UUID) to User.supabase_id (UUID)
    profile = relationship("Profile", foreign_keys="Profile.id", primaryjoin="Profile.id == User.supabase_id", back_populates="user", uselist=False)
    # Job matches relationship links UserJobMatch.user_id (UUID) to User.supabase_id (UUID)
    job_matches = relationship("UserJobMatch", foreign_keys="UserJobMatch.user_id", primaryjoin="UserJobMatch.user_id == User.supabase_id", back_populates="user")


class Profile(Base):
    __tablename__ = "profiles"

    # ID is the Supabase User UUID and the primary key
    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    # user_id column removed, id serves as the link to auth.users

    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    resume_path = Column(String, nullable=True)
    desired_roles = Column(String, nullable=True)
    desired_locations = Column(String, nullable=True)
    min_salary = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship back to User model (local cache)
    user = relationship("User", back_populates="profile", foreign_keys=[id], primaryjoin="Profile.id == User.supabase_id", uselist=False)
    skills = relationship("Skill", back_populates="profile")
    experiences = relationship("Experience", back_populates="profile")

class Skill(Base):
    __tablename__ = "skills"

    # Use BigInteger for ID as per Supabase schema (BIGSERIAL)
    id = Column(BigInteger, primary_key=True, index=True)
    # profile_id links to Profile's UUID primary key
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    name = Column(String, nullable=False)
    level = Column(String, nullable=True)

    profile = relationship("Profile", back_populates="skills")

class Experience(Base):
    __tablename__ = "experiences"

    # Use BigInteger for ID
    id = Column(BigInteger, primary_key=True, index=True)
    # profile_id links to Profile's UUID primary key
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    description = Column(Text, nullable=True)

    profile = relationship("Profile", back_populates="experiences")

class Job(Base):
    __tablename__ = "jobs"

    # Use BigInteger for ID
    id = Column(BigInteger, primary_key=True, index=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    url = Column(String, nullable=True, unique=True, index=True) # Added unique=True and ensure index=True
    source = Column(String, nullable=True, index=True) # Added index=True
    posted_date = Column(DateTime, nullable=True)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())
    # spacy_entities = Column(JSON, nullable=True) # Temporarily commented out

    user_matches = relationship("UserJobMatch", back_populates="job")

class UserJobMatch(Base):
    __tablename__ = "user_job_matches"

    # Use BigInteger for ID
    id = Column(BigInteger, primary_key=True, index=True)
    # user_id links to the User's Supabase UUID (via User.supabase_id)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.supabase_id"))
    # job_id links to Job's BigInteger ID
    job_id = Column(BigInteger, ForeignKey("jobs.id"))
    relevance_score = Column(Float)
    # Treat status as a plain string, relying on DB check constraint
    status = Column(String, default='pending', nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship back to User model (local cache)
    user = relationship("User", back_populates="job_matches", foreign_keys=[user_id], primaryjoin="UserJobMatch.user_id == User.supabase_id")
    job = relationship("Job", back_populates="user_matches")
