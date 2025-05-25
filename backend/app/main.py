from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime # Import datetime for start_date

# Import all routers
from app.api import profile, jobs, auth
from app.core.config import settings
from app.db.database import engine, Base
from app.services.job_scraper import trigger_job_scraping
from app.services.job_matcher import match_jobs_for_all_users # Import the new function
from app.services.data_maintenance import delete_old_job_postings # Import the new maintenance function
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
# from apscheduler.triggers.cron import CronTrigger # Import if using CronTrigger
import asyncio
from app.services.vectorizer import load_global_vectorizer, fit_vectorizer_globally, VECTORIZER_PATH # Import vectorizer functions
from app.db.models import Job # To fetch jobs for corpus
import os # To check VECTORIZER_PATH existence

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

async def scheduled_data_maintenance():
    print("Scheduler: Starting data maintenance (deleting old jobs)...")
    await delete_old_job_postings()
    print("Scheduler: Finished data maintenance.")

@app.on_event("startup")
async def startup_event():
    # Schedule job scraping (e.g., every X hours from settings)
    scheduler.add_job(
        scheduled_job_scraping,
        trigger=IntervalTrigger(hours=settings.SCRAPER_SCHEDULE_HOURS or 4),
        id="job_scraping_task",
        name="Periodic Job Scraping",
        replace_existing=True,
    )
    # Schedule job matching (e.g., every Y hours from settings)
    scheduler.add_job(
        scheduled_job_matching,
        trigger=IntervalTrigger(hours=settings.MATCHER_SCHEDULE_HOURS or 6),
        id="job_matching_task",
        name="Periodic Job Matching",
        replace_existing=True,
    )
    # Schedule data maintenance (e.g., daily)
    # Runs 24 hours after the first run (which is on startup after initial_tasks delay)
    # Or, to run at a specific time like 3 AM:
    # trigger=CronTrigger(hour=3, minute=0, timezone='UTC') # Example for UTC
    scheduler.add_job(
        scheduled_data_maintenance,
        trigger=IntervalTrigger(days=1), 
        id="data_maintenance_task",
        name="Periodic Data Maintenance",
        replace_existing=True,
    )
    scheduler.start()
    print("Scheduler started.")
    # Run once on startup after a short delay - COMMENTED OUT TO PREVENT STARTUP SCRAPE/MATCH
    # asyncio.create_task(initial_tasks()) 
    print("Initial tasks on startup (scraping/matching) are DISABLED.")
    
    # Load or fit the global TF-IDF vectorizer
    asyncio.create_task(initialize_vectorizer())

async def initialize_vectorizer():
    await asyncio.sleep(2) # Short delay to let app settle
    if not load_global_vectorizer(): # Tries to load, returns False if file not found or error
        print(f"Vectorizer pickle file not found or failed to load. Attempting to fit a new one.")
        # Need a corpus to fit. Let's do an initial scrape if no vectorizer exists.
        # This is a one-time setup cost if the pickle isn't there.
        from app.db.database import SessionLocal # Local import for DB session
        db = SessionLocal()
        try:
            print("Running a one-time scrape to build initial corpus for TF-IDF vectorizer...")
            # We need to ensure trigger_job_scraping can be called without task_id for this.
            # It should populate the DB with jobs.
            await trigger_job_scraping() # This will use its own db session and close it.
            
            # Fetch all job descriptions to create a corpus
            # Re-open session as trigger_job_scraping closes its own.
            db_for_corpus = SessionLocal()
            all_jobs_for_corpus = db_for_corpus.query(Job.title, Job.description, Job.company, Job.location).all()
            corpus = [f"{j.title or ''} {j.description or ''} {j.company or ''} {j.location or ''}" for j in all_jobs_for_corpus]
            db_for_corpus.close()

            if corpus:
                fit_vectorizer_globally(corpus)
            else:
                print("No jobs found after initial scrape to build corpus. Vectorizer remains unfitted.")
        except Exception as e:
            print(f"Error during initial vectorizer fitting: {e}")
        finally:
            if db.is_active:
                db.close()
            if 'db_for_corpus' in locals() and db_for_corpus.is_active:
                db_for_corpus.close()


async def initial_tasks(): # This function is currently not called on startup
    await asyncio.sleep(10) 
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
