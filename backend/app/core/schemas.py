import uuid  # Import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


# Auth schemas
class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class UserInDB(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class User(UserInDB):
    pass


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# Profile schemas
class ProfileBase(BaseModel):
    first_name: Optional[str] = Field(None, max_length=200)
    last_name: Optional[str] = Field(None, max_length=200)
    desired_roles: Optional[str] = Field(None, max_length=2000)
    desired_locations: Optional[str] = Field(None, max_length=2000)
    min_salary: Optional[int] = Field(None, ge=0)


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


class SkillBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Skill name cannot be empty")
        return value

    level: Optional[str] = Field(None, max_length=50)


class SkillCreate(SkillBase):
    pass


class Skill(SkillBase):
    id: int  # Keep local skill ID as int (BIGSERIAL)
    profile_id: uuid.UUID  # Profile ID is UUID

    model_config = ConfigDict(from_attributes=True)


class ExperienceBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    company: str = Field(..., min_length=1, max_length=200)
    location: Optional[str] = Field(None, max_length=500)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    description: Optional[str] = Field(None, max_length=10000)

    @field_validator("start_date", "end_date")
    @classmethod
    def normalize_dates(cls, value):
        return (
            value.astimezone(timezone.utc).replace(tzinfo=None)
            if value and value.tzinfo
            else value
        )

    @field_validator("title", "company")
    @classmethod
    def nonempty(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty")
        return value

    @model_validator(mode="after")
    def ordered_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("End date must not precede start date")
        return self


class ExperienceCreate(ExperienceBase):
    pass


class Experience(ExperienceBase):
    id: int  # Keep local experience ID as int (BIGSERIAL)
    profile_id: uuid.UUID  # Profile ID is UUID

    model_config = ConfigDict(from_attributes=True)


class Profile(ProfileBase):
    id: uuid.UUID  # Profile ID is UUID
    # user_id: int # Remove user_id, link is via Profile.id == User.supabase_id
    resume_path: Optional[str] = None
    skills: List[Skill] = Field(default_factory=list)
    experiences: List[Experience] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Job schemas
class JobStatus(str, Enum):
    PENDING = "pending"
    INTERESTED = "interested"
    APPLIED = "applied"
    IGNORED = "ignored"


class JobBase(BaseModel):
    title: str
    company: str
    location: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None, max_length=10000)
    url: Optional[str] = None
    source: Optional[str] = None
    posted_date: Optional[datetime] = None
    # spacy_entities: Optional[dict] = None # Temporarily commented out


class JobCreate(JobBase):
    pass


class Job(JobBase):
    id: int
    scraped_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserJobMatchBase(BaseModel):
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    status: JobStatus = JobStatus.PENDING


class UserJobMatchCreate(UserJobMatchBase):
    job_id: int


class UserJobMatchUpdate(BaseModel):
    status: JobStatus


class UserJobMatch(UserJobMatchBase):
    id: int
    user_id: uuid.UUID  # Changed from int to uuid.UUID
    job_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class JobWithMatch(Job):
    relevance_score: float
    status: JobStatus
    is_current: bool = True

    model_config = ConfigDict(from_attributes=True)


# Resume upload schema
class ResumeUploadResponse(BaseModel):
    success: bool
    message: str
    task_id: str
