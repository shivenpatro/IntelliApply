import os
from pydantic_settings import BaseSettings
from typing import List, Optional
from dotenv import load_dotenv
import pathlib

# Explicitly load .env from the project root directory
# Determine the project root directory (assuming config.py is in backend/app/core)
project_root = pathlib.Path(__file__).parent.parent.parent.parent
dotenv_path = project_root / ".env"

if dotenv_path.is_file():
    print(f"Loading environment variables from: {dotenv_path}")
    load_dotenv(dotenv_path=dotenv_path)
else:
    print(f"Warning: .env file not found at {dotenv_path}")


class Settings(BaseSettings):
    # Base settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "IntelliApply"

    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-for-development-only")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost/intelliapply"
    )

    # File storage (for resumes)
    UPLOAD_DIRECTORY: str = os.getenv("UPLOAD_DIRECTORY", "./uploads")
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "docx"]

    # Scraping settings
    JOB_SOURCES: List[str] = ["linkedin", "indeed", "hackernews"]
    SCRAPING_INTERVAL_MINUTES: int = 60

    # Supabase settings
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
    SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY")
    SUPABASE_SERVICE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_KEY")

    # Additional scraper settings
    SCRAPER_INTERVAL_MINUTES: Optional[int] = int(os.getenv("SCRAPER_INTERVAL_MINUTES", "60")) # Old setting, can be removed or kept for other uses
    SCRAPER_MAX_JOBS_PER_SOURCE: Optional[int] = int(os.getenv("SCRAPER_MAX_JOBS_PER_SOURCE", "30"))
    SCRAPER_SOURCES: Optional[str] = os.getenv("SCRAPER_SOURCES", "hackernews")
    SCRAPER_SCHEDULE_HOURS: Optional[int] = int(os.getenv("SCRAPER_SCHEDULE_HOURS", "4")) # New setting for APScheduler
    MATCHER_SCHEDULE_HOURS: Optional[int] = int(os.getenv("MATCHER_SCHEDULE_HOURS", "6")) # New setting for APScheduler

    # Eden AI API Key
    EDEN_AI_API_KEY: Optional[str] = os.getenv("EDEN_AI_API_KEY")

    # Firecrawl API Key
    FIRECRAWL_API_KEY: Optional[str] = os.getenv("FIRECRAWL_API_KEY")

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
