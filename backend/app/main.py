from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all routers
from app.api import profile, jobs, auth
from app.core.config import settings
from app.db.database import engine, Base
from app.services.job_scraper import trigger_job_scraping
from app.services.job_matcher import match_jobs_for_all_users # Import the new function
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import asyncio

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="IntelliApply API",
    description="API for IntelliApply - an AI-powered job application assistant",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # More permissive for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Scheduler setup
scheduler = AsyncIOScheduler()

async def scheduled_job_scraping():
    print("Scheduler: Starting scheduled job scraping...")
    await trigger_job_scraping()
    print("Scheduler: Finished scheduled job scraping.")

async def scheduled_job_matching():
    print("Scheduler: Starting scheduled job matching for all users...")
    await match_jobs_for_all_users() # Use the imported function
    print("Scheduler: Finished scheduled job matching for all users.")

@app.on_event("startup")
async def startup_event():
    # Schedule job scraping (e.g., every 4 hours)
    scheduler.add_job(
        scheduled_job_scraping,
        trigger=IntervalTrigger(hours=settings.SCRAPER_SCHEDULE_HOURS or 4),
        id="job_scraping_task",
        name="Periodic Job Scraping",
        replace_existing=True,
    )
    # Schedule job matching (e.g., every 6 hours)
    scheduler.add_job(
        scheduled_job_matching,
        trigger=IntervalTrigger(hours=settings.MATCHER_SCHEDULE_HOURS or 6),
        id="job_matching_task",
        name="Periodic Job Matching",
        replace_existing=True,
    )
    scheduler.start()
    print("Scheduler started.")
    # Run once on startup after a short delay
    asyncio.create_task(initial_tasks())

async def initial_tasks():
    await asyncio.sleep(10) # Wait 10 seconds for app to fully start
    print("Running initial job scraping and matching...")
    await scheduled_job_scraping()
    await scheduled_job_matching()
    print("Initial tasks completed.")


@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    print("Scheduler shut down.")

# Include routers
app.include_router(auth.router, prefix='/api/auth', tags=['Authentication']) # Add auth router
app.include_router(profile.router, prefix='/api/profile', tags=['User Profile'])
app.include_router(jobs.router, prefix='/api/jobs', tags=['Jobs'])

@app.get("/")
async def root():
    return {"message": "Welcome to IntelliApply API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
