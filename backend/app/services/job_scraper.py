import os
from bs4 import BeautifulSoup
import time
import random
from datetime import datetime
import asyncio
from sqlalchemy.orm import Session
from firecrawl import FirecrawlApp
import requests

from app.db.database import SessionLocal
from app.core.config import settings
from app.services.hackernews_scraper import run_hackernews_scraper
from app.services.weworkremotely_scraper import run_weworkremotely_scraper 
from app.services.db_utils import save_jobs_to_db 
import logging
from typing import Dict, Optional, Any # For type hinting

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO) 

nlp = None # Spacy is temporarily commented out

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
]

def get_random_user_agent():
    return random.choice(USER_AGENTS)

async def parse_indeed_html(html_content: str, source_url: str, max_results=10):
    # This function is kept for reference but not called as Indeed is disabled.
    jobs = []
    if not html_content:
        logger.warning(f"No HTML content provided to parse_indeed_html for URL: {source_url}")
        return jobs
    # ... (rest of parse_indeed_html implementation) ...
    return jobs

async def parse_linkedin_html(html_content: str, source_url: str, max_results=10):
    # This function is not currently used.
    jobs = []
    if not html_content: logger.warning(f"No HTML content provided to parse_linkedin_html for URL: {source_url}"); return jobs
    logger.info(f"LinkedIn HTML parsing not yet implemented. Received {len(html_content)} chars for {source_url}.")
    return jobs

async def trigger_job_scraping(**kwargs: Any): # Accept arbitrary keyword arguments
    db = SessionLocal()
    task_id: Optional[str] = kwargs.get("task_id")
    task_statuses_ref: Optional[Dict[str, Dict[str, str]]] = kwargs.get("task_statuses_ref")

    def _update_status(status_message: str, current_status_verb: str = "scraping"):
        if task_id and task_statuses_ref is not None:
            task_statuses_ref[task_id] = {"status": current_status_verb, "message": status_message}
            logger.info(f"Task ID {task_id}: Status updated - {status_message}")

    try:
        _update_status("Initializing scraping: Fetching enabled sources.")
        enabled_sources = [source.strip().lower() for source in settings.SCRAPER_SOURCES.split(',')]
        logger.info(f"Enabled scraper sources: {enabled_sources}")

        scraping_tasks = []
        source_map = [] 

        if "hackernews" in enabled_sources:
            _update_status("Queueing Hacker News Jobs scraping.")
            logger.info("Queueing Hacker News Jobs scraping...")
            # Pass db and max_jobs; individual scrapers handle their own saving now
            scraping_tasks.append(run_hackernews_scraper(db, max_jobs=settings.SCRAPER_MAX_JOBS_PER_SOURCE or 30))
            source_map.append("HackerNews")

        if "weworkremotely" in enabled_sources:
            _update_status("Queueing WeWorkRemotely Jobs scraping.")
            logger.info("Queueing WeWorkRemotely Jobs scraping...")
            scraping_tasks.append(run_weworkremotely_scraper(db, max_jobs=settings.SCRAPER_MAX_JOBS_PER_SOURCE or 30))
            source_map.append("WeWorkRemotely")
        
        if scraping_tasks:
            _update_status(f"Running {len(scraping_tasks)} scraping tasks concurrently...")
            logger.info(f"Running {len(scraping_tasks)} scraping tasks concurrently...")
            # Results from asyncio.gather will be a list of return values from the coroutines
            # Our run_xxx_scraper functions return the list of jobs they found (or an empty list on error)
            results = await asyncio.gather(*scraping_tasks, return_exceptions=True)
            
            _update_status("Processing scraping results.")
            logger.info("All scraping tasks completed.")
            
            for i, result_data in enumerate(results):
                source_name = source_map[i]
                if isinstance(result_data, Exception):
                    logger.error(f"Error during scraping for {source_name}: {result_data}", exc_info=result_data)
                    _update_status(f"Error scraping {source_name}.", current_status_verb="partial_failure")
                elif isinstance(result_data, list):
                    logger.info(f"{source_name.capitalize()} scraping yielded {len(result_data)} jobs (these were already attempted to be saved by individual scrapers).")
                else:
                    logger.warning(f"Unexpected result type from {source_name} scraper: {type(result_data)}")
        else:
            logger.info("No scraper sources enabled or no tasks queued.")
            _update_status("No scraper sources enabled.")

        logger.info("Job scraping cycle completed.")
        # The next step in the background task chain (matching) will update the overall task status.
        # If this is the only step for a task_id, we might set it to "scraping_completed".
        # For now, the API's match_jobs_for_user will take over status updates.

    except Exception as e:
        logger.error(f"Critical error in trigger_job_scraping: {str(e)}", exc_info=True)
        if task_id and task_statuses_ref is not None:
            _update_status(f"Scraping failed: {str(e)}", current_status_verb="failed")
    finally:
        if db: db.close()
