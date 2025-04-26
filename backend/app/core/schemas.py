from pydantic import BaseModel, EmailStr, validator, Field
from typing import List, Optional, Union
from datetime import datetime
from enum import Enum
import uuid # Import uuid

# Auth schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def password_must_be_strong(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserInDB(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        orm_mode = True

class User(UserInDB):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Profile schemas
class ProfileBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    desired_roles: Optional[str] = None
    desired_locations: Optional[str] = None
    min_salary: Optional[int] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(ProfileBase):
    pass

class SkillBase(BaseModel):
    name: str
    level: Optional[str] = None

class SkillCreate(SkillBase):
    pass

class Skill(SkillBase):
    id: int # Keep local skill ID as int (BIGSERIAL)
    profile_id: uuid.UUID # Profile ID is UUID
    
    class Config:
        orm_mode = True

class ExperienceBase(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    description: Optional[str] = None

class ExperienceCreate(ExperienceBase):
    pass

class Experience(ExperienceBase):
    id: int # Keep local experience ID as int (BIGSERIAL)
    profile_id: uuid.UUID # Profile ID is UUID
    
    class Config:
        orm_mode = True

class Profile(ProfileBase):
    id: uuid.UUID # Profile ID is UUID
    # user_id: int # Remove user_id, link is via Profile.id == User.supabase_id
    resume_path: Optional[str] = None
    skills: List[Skill] = []
    experiences: List[Experience] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

# Job schemas
class JobStatus(str, Enum):
    PENDING = "pending"
    INTERESTED = "interested"
    APPLIED = "applied"
    IGNORED = "ignored"

class JobBase(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    source: Optional[str] = None
    posted_date: Optional[datetime] = None

class JobCreate(JobBase):
    pass

class Job(JobBase):
    id: int
    scraped_at: datetime
    
    class Config:
        orm_mode = True

class UserJobMatchBase(BaseModel):
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    status: JobStatus = JobStatus.PENDING

class UserJobMatchCreate(UserJobMatchBase):
    job_id: int

class UserJobMatchUpdate(BaseModel):
    status: JobStatus

class UserJobMatch(UserJobMatchBase):
    id: int
    user_id: int
    job_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class JobWithMatch(Job):
    relevance_score: float
    status: JobStatus
    
    class Config:
        orm_mode = True

# Resume upload schema
class ResumeUploadResponse(BaseModel):
    success: bool
    message: str
