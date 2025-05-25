import os
from pydantic_settings import BaseSettings
from typing import List, Optional
from dotenv import load_dotenv
import pathlib

# Explicitly load .env from the backend directory
# config.py is in backend/app/core, so backend_dir is three levels up.
backend_dir = pathlib.Path(__file__).resolve().parent.parent.parent
dotenv_path = backend_dir / ".env"

if dotenv_path.is_file():
    print(f"Loading environment variables from: {dotenv_path} with override=True")
    load_dotenv(dotenv_path=dotenv_path, override=True) # Added override=True
else:
    print(f"Warning: .env file not found at {dotenv_path}")

# Determine DATABASE_URL after attempting to load .env with override
# This logic is now outside the Settings class to avoid Pydantic field issues
db_url_final = os.getenv("DATABASE_URL")
if db_url_final:
    print(f"INFO: DATABASE_URL to be used by Settings: {db_url_final}")
else:
    print(f"WARNING: DATABASE_URL not found after .env load. Settings will use default.")
    db_url_final = "postgresql://postgres:postgres@localhost/intelliapply" # Default


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
    DATABASE_URL: str = db_url_final # Assign the determined URL

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

    # Affinda API Key
    AFFINDA_API_KEY: Optional[str] = os.getenv("AFFINDA_API_KEY")

    # Data Maintenance
    JOB_POSTING_RETENTION_DAYS: Optional[int] = int(os.getenv("JOB_POSTING_RETENTION_DAYS", "30"))


    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
