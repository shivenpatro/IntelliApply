import asyncio
from contextlib import asynccontextmanager
from datetime import timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api import auth, jobs, profile
from app.core.config import settings
from app.db.database import Base, SessionLocal, engine
from app.db.models import ServiceRun
from app.services.data_maintenance import delete_old_job_postings
from app.services.job_matcher import match_jobs_for_all_users
from app.services.job_scraper import trigger_job_scraping
from app.services.tasks import cleanup_tasks, now

scheduler = AsyncIOScheduler()


def claim_periodic(name, seconds):
    with SessionLocal() as db:
        db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:name,0))"),
            {"name": name},
        )
        run = db.get(ServiceRun, name)
        if run and run.next_allowed > now():
            return False
        if not run:
            run = ServiceRun(name=name)
            db.add(run)
        run.next_allowed = now() + timedelta(seconds=seconds)
        db.commit()
        return True


async def periodic(name, seconds, operation):
    if await asyncio.to_thread(claim_periodic, name, seconds):
        await operation()


@asynccontextmanager
async def lifespan(app):
    if settings.AUTO_CREATE_SCHEMA and settings.ENVIRONMENT != "production":
        await asyncio.to_thread(Base.metadata.create_all, engine)
    if settings.SCHEDULER_ENABLED:
        for name, hours, operation in [
            ("scheduled_scrape", settings.SCRAPER_SCHEDULE_HOURS, trigger_job_scraping),
            (
                "scheduled_matching",
                settings.MATCHER_SCHEDULE_HOURS,
                match_jobs_for_all_users,
            ),
            ("scheduled_maintenance", 24, delete_old_job_postings),
        ]:
            scheduler.add_job(
                periodic,
                "interval",
                hours=hours,
                args=[name, hours * 3600, operation],
                id=name,
                replace_existing=True,
            )
        scheduler.add_job(
            cleanup_tasks,
            "interval",
            minutes=5,
            id="task_cleanup",
            replace_existing=True,
        )
        scheduler.start()
    yield
    if scheduler.running:
        scheduler.shutdown(wait=False)


app = FastAPI(title="IntelliApply API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(
        set(
            [settings.FRONTEND_URL]
            + [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
        )
    ),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Retry-After"],
)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])


@app.get("/")
def root():
    return {"message": "Welcome to IntelliApply API"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/ready")
def readiness():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT version FROM profiles LIMIT 1"))
            connection.execute(text("SELECT is_current FROM user_job_matches LIMIT 1"))
            connection.execute(text("SELECT id FROM tasks LIMIT 1"))
            connection.execute(text("SELECT name FROM service_runs LIMIT 1"))
        return {
            "status": "ready",
            "capabilities": {
                "resume_processing": bool(settings.GEMINI_API_KEY),
                "enabled_sources": settings.SCRAPER_SOURCES.split(","),
            },
        }
    except Exception:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "message": "Database or schema is not ready.",
            },
        )
