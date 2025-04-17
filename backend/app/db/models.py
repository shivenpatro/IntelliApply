from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.database import Base

class JobStatus(enum.Enum):
    PENDING = "pending"
    INTERESTED = "interested"
    APPLIED = "applied"
    IGNORED = "ignored"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    supabase_id = Column(String, unique=True, index=True, nullable=True)  # Store Supabase user ID
    hashed_password = Column(String, nullable=True)  # Make nullable since we'll use Supabase for auth
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    profile = relationship("Profile", back_populates="user", uselist=False)
    job_matches = relationship("UserJobMatch", back_populates="user")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    resume_path = Column(String, nullable=True)
    desired_roles = Column(String, nullable=True)  # Comma-separated list or JSON formatted string
    desired_locations = Column(String, nullable=True)  # Comma-separated list or JSON formatted string
    min_salary = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="profile")
    skills = relationship("Skill", back_populates="profile")
    experiences = relationship("Experience", back_populates="profile")

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    name = Column(String, nullable=False)
    level = Column(String, nullable=True)  # e.g., "beginner", "intermediate", "expert"

    profile = relationship("Profile", back_populates="skills")

class Experience(Base):
    __tablename__ = "experiences"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    description = Column(Text, nullable=True)

    profile = relationship("Profile", back_populates="experiences")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    source = Column(String, nullable=True)  # e.g., "linkedin", "indeed"
    posted_date = Column(DateTime, nullable=True)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())

    user_matches = relationship("UserJobMatch", back_populates="job")

class UserJobMatch(Base):
    __tablename__ = "user_job_matches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    relevance_score = Column(Float)  # 0.0 to 1.0
    status = Column(Enum(JobStatus), default=JobStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="job_matches")
    job = relationship("Job", back_populates="user_matches")
