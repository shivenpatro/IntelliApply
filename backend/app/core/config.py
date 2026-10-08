from pathlib import Path
from typing import Optional

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env", extra="ignore"
    )
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost/intelliapply"
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://localhost:5174,https://intelli-apply.vercel.app"
    )
    NEON_AUTH_URL: str = (
        "https://ep-green-glade-ajuf7urf.neonauth.c-3.us-east-2.aws.neon.tech/neondb/auth"
    )
    NEON_AUTH_ISSUER: Optional[str] = None
    NEON_AUTH_AUDIENCE: Optional[str] = None
    AUTO_CREATE_SCHEMA: bool = False
    SCHEDULER_ENABLED: bool = True
    DB_POOL_SIZE: int = Field(5, ge=1, le=30)
    DB_MAX_OVERFLOW: int = Field(2, ge=0, le=30)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    FIRECRAWL_API_KEY: Optional[str] = None
    MAX_UPLOAD_BYTES: int = Field(5 * 1024 * 1024, ge=1024, le=20 * 1024 * 1024)
    TASK_TIMEOUT_SECONDS: int = Field(120, ge=10, le=600)
    TASK_RETENTION_DAYS: int = Field(7, ge=1)
    REFRESH_COOLDOWN_SECONDS: int = Field(60, ge=1)
    RESUME_COOLDOWN_SECONDS: int = Field(30, ge=1)
    RESUME_GLOBAL_INTERVAL_SECONDS: int = Field(10, ge=1, le=3600)
    PROVIDER_QUOTA_COOLDOWN_SECONDS: int = Field(60, ge=1, le=86400)
    MAX_ACTIVE_TASKS: int = Field(4, ge=1, le=20)
    SCRAPE_COOLDOWN_SECONDS: int = Field(900, ge=1)
    SCRAPER_MAX_JOBS_PER_SOURCE: int = Field(15, ge=1, le=30)
    SCRAPER_SOURCES: str = "hackernews"
    SCRAPER_SCHEDULE_HOURS: int = Field(4, ge=1)
    MATCHER_SCHEDULE_HOURS: int = Field(6, ge=1)
    JOB_POSTING_RETENTION_DAYS: int = Field(30, ge=1)
    MATCHER_MAX_JOBS: int = Field(500, ge=1, le=5000)
    ALLOWED_EXTENSIONS: list[str] = ["pdf", "docx"]
    API_V1_STR: str = "/api"

    @model_validator(mode="after")
    def production_config(self):
        if self.ENVIRONMENT == "production":
            if "localhost" in self.DATABASE_URL or self.AUTO_CREATE_SCHEMA:
                raise ValueError(
                    "Production requires an explicit database and versioned migrations."
                )
            if not self.FRONTEND_URL.startswith("https://") or any(
                not origin.strip().startswith("https://")
                for origin in self.CORS_ORIGINS.split(",")
            ):
                raise ValueError("Production requires explicit HTTPS frontend origins.")
            if "NEON_AUTH_URL" not in self.model_fields_set:
                raise ValueError("Production requires an explicit Neon Auth endpoint.")
            if not self.NEON_AUTH_ISSUER:
                raise ValueError(
                    "Configure NEON_AUTH_ISSUER from the actual provider JWT contract."
                )
        return self


settings = Settings()
