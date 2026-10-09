import enum

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID  # Import UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class JobStatus(enum.Enum):
    PENDING = "pending"
    INTERESTED = "interested"
    APPLIED = "applied"
    IGNORED = "ignored"


class User(Base):
    __tablename__ = "users"  # This table acts as a local cache/extension

    id = Column(Integer, primary_key=True, index=True)  # Local DB ID
    # Change supabase_id to UUID type to match Supabase auth.users.id and allow proper joins
    supabase_id = Column(UUID(as_uuid=True), unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Kept nullable
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Profile relationship links Profile.id (UUID) to User.supabase_id (UUID)
    profile = relationship(
        "Profile",
        foreign_keys="Profile.id",
        primaryjoin="Profile.id == User.supabase_id",
        back_populates="user",
        uselist=False,
    )
    # Job matches relationship links UserJobMatch.user_id (UUID) to User.supabase_id (UUID)
    job_matches = relationship(
        "UserJobMatch",
        foreign_keys="UserJobMatch.user_id",
        primaryjoin="UserJobMatch.user_id == User.supabase_id",
        back_populates="user",
    )


class Profile(Base):
    __tablename__ = "profiles"

    __table_args__ = (
        CheckConstraint(
            "min_salary IS NULL OR min_salary >= 0", name="ck_profile_salary"
        ),
    )
    # ID is the Supabase User UUID and the primary key
    id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.supabase_id"),
        primary_key=True,
        index=True,
    )
    # user_id column removed, id serves as the link to auth.users

    version = Column(Integer, nullable=False, default=0, server_default="0")
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    resume_path = Column(String, nullable=True)
    desired_roles = Column(String, nullable=True)
    desired_locations = Column(String, nullable=True)
    min_salary = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship back to User model (local cache)
    user = relationship(
        "User",
        back_populates="profile",
        foreign_keys=[id],
        primaryjoin="Profile.id == User.supabase_id",
        uselist=False,
    )
    skills = relationship("Skill", back_populates="profile")
    experiences = relationship("Experience", back_populates="profile")


class Skill(Base):
    __tablename__ = "skills"

    # Use BigInteger for ID as per Supabase schema (BIGSERIAL)
    id = Column(BigInteger, primary_key=True, index=True)
    # profile_id links to Profile's UUID primary key
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    __table_args__ = (
        Index(
            "uq_skill_profile_name",
            "profile_id",
            func.lower(func.btrim(text("name"))),
            unique=True,
        ),
        CheckConstraint("length(btrim(name)) > 0", name="ck_skill_nonempty"),
    )
    name = Column(String, nullable=False)
    level = Column(String, nullable=True)

    profile = relationship("Profile", back_populates="skills")


class Experience(Base):
    __tablename__ = "experiences"

    # Use BigInteger for ID
    id = Column(BigInteger, primary_key=True, index=True)
    # profile_id links to Profile's UUID primary key
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    __table_args__ = (
        CheckConstraint(
            "length(btrim(title)) > 0 AND length(btrim(company)) > 0",
            name="ck_experience_nonempty",
        ),
        CheckConstraint(
            "end_date IS NULL OR start_date IS NULL OR end_date >= start_date",
            name="ck_experience_dates",
        ),
    )
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
    url = Column(
        String, nullable=True, unique=True, index=True
    )  # Added unique=True and ensure index=True
    source = Column(String, nullable=True, index=True)  # Added index=True
    posted_date = Column(DateTime, nullable=True)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())
    # spacy_entities = Column(JSON, nullable=True) # Temporarily commented out

    user_matches = relationship("UserJobMatch", back_populates="job")


class UserJobMatch(Base):
    __tablename__ = "user_job_matches"

    # Use BigInteger for ID
    id = Column(BigInteger, primary_key=True, index=True)
    # user_id links to the User's Supabase UUID (via User.supabase_id)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.supabase_id"), nullable=False
    )
    # job_id links to Job's BigInteger ID
    job_id = Column(BigInteger, ForeignKey("jobs.id"), nullable=False)
    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_user_job_match"),
        CheckConstraint(
            "relevance_score >= 0 AND relevance_score <= 1", name="ck_match_score"
        ),
        CheckConstraint(
            "status IN ('pending', 'interested', 'applied', 'ignored')",
            name="ck_match_status",
        ),
    )
    is_current = Column(Boolean, nullable=False, default=True, server_default="true")
    relevance_score = Column(Float, nullable=False)
    # Treat status as a plain string, relying on DB check constraint
    status = Column(String, default="pending", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship back to User model (local cache)
    user = relationship(
        "User",
        back_populates="job_matches",
        foreign_keys=[user_id],
        primaryjoin="UserJobMatch.user_id == User.supabase_id",
    )
    job = relationship("Job", back_populates="user_matches")


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','running','completed','partial_failure','failed','interrupted')",
            name="ck_task_status",
        ),
    )
    id = Column(String(32), primary_key=True)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.supabase_id"), nullable=False, index=True
    )
    kind = Column(String(20), nullable=False)
    status = Column(String(24), nullable=False, default="pending")
    message = Column(String(500), nullable=False, default="Processing queued.")
    error_code = Column(String(40), nullable=True)
    input_version = Column(Integer, nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    deadline = Column(DateTime(timezone=True), nullable=False)
    finished_at = Column(DateTime(timezone=True), nullable=True)


class ServiceRun(Base):
    __tablename__ = "service_runs"
    name = Column(String(40), primary_key=True)
    next_allowed = Column(DateTime(timezone=True), nullable=False)
    result = Column(JSON, nullable=True)
