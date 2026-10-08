import asyncio
from datetime import timedelta

from sqlalchemy import text

from app.core.config import settings
from app.db.database import SessionLocal
from app.db.models import ServiceRun
from app.services.hackernews_scraper import run_hackernews_scraper
from app.services.tasks import now
from app.services.weworkremotely_scraper import run_weworkremotely_scraper


def claim_scrape():
    with SessionLocal() as db:
        db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended('scrape-admission',0))")
        )
        run = db.get(ServiceRun, "scrape")
        if run and run.next_allowed > now():
            return False, run.result or {
                "status": "partial_failure",
                "message": "Another scrape is running. Existing jobs retained.",
            }
        if not run:
            run = ServiceRun(name="scrape")
            db.add(run)
        run.next_allowed = now() + timedelta(
            seconds=max(settings.SCRAPE_COOLDOWN_SECONDS, settings.TASK_TIMEOUT_SECONDS)
        )
        run.result = {
            "status": "partial_failure",
            "message": "Scraping is in progress. Existing jobs retained.",
        }
        db.commit()
        return True, None


def save_result(result):
    with SessionLocal() as db:
        run = db.get(ServiceRun, "scrape")
        run.result = result
        db.commit()


async def trigger_job_scraping(**kwargs):
    claimed, cached = await asyncio.to_thread(claim_scrape)
    if not claimed:
        return cached
    sources = {
        "hackernews": run_hackernews_scraper,
        "weworkremotely": run_weworkremotely_scraper,
    }
    enabled = [
        s.strip().lower() for s in settings.SCRAPER_SOURCES.split(",") if s.strip()
    ]
    errors = []
    count = 0
    for source in enabled:
        if source not in sources:
            errors.append(source)
            continue
        try:
            jobs = await asyncio.wait_for(
                sources[source](max_jobs=settings.SCRAPER_MAX_JOBS_PER_SOURCE),
                timeout=45,
            )
            count += len(jobs)
        except Exception:
            errors.append(source)
    if not enabled:
        errors.append("no enabled sources")
    result = {
        "status": "partial_failure" if errors else "completed",
        "message": (
            "Some sources could not refresh; existing jobs retained."
            if errors
            else f"Scraping completed. {count} listings fetched."
        ),
        "failed_sources": errors,
    }
    await asyncio.to_thread(save_result, result)
    return result
