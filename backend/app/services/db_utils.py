import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError # Import IntegrityError
from app.db.models import Job
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

logger = logging.getLogger(__name__)

async def save_jobs_to_db(jobs: list, db: Session): # jobs is a list of dicts
    """Save scraped jobs to the database, handling duplicates based on canonical URL."""
    new_jobs_count = 0
    processed_urls_in_batch = set()

    for job_data in jobs:
        raw_url = job_data.get("url")
        if not raw_url:
            logger.warning(f"Skipping job due to missing URL: {job_data.get('title', 'N/A')}")
            continue

        parsed_url = urlparse(raw_url)
        query_params = parse_qs(parsed_url.query)
        
        tracking_params_to_remove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'mc_cid', 'mc_eid', '_ga']
        filtered_query_params = {k: v for k, v in query_params.items() if k.lower() not in tracking_params_to_remove}
        
        canonical_url = urlunparse(parsed_url._replace(query=urlencode(filtered_query_params, doseq=True)))
        
        if not canonical_url:
            logger.warning(f"Skipping job due to invalid canonical URL for raw URL: {raw_url}")
            continue

        job_data["url"] = canonical_url

        if canonical_url in processed_urls_in_batch:
            logger.info(f"Skipping duplicate job (already processed in this batch) for URL: {canonical_url}")
            continue
        
        processed_urls_in_batch.add(canonical_url) # Add after ensuring it's not skipped

        existing_job = db.query(Job).filter(Job.url == canonical_url).first()
        if not existing_job:
            job = Job(**job_data)
            db.add(job)
            new_jobs_count +=1
    
    if new_jobs_count > 0:
        try:
            db.commit() # Commit after processing all jobs in the batch
            logger.info(f"Added {new_jobs_count} new jobs to the database.")
        except IntegrityError as e: # Specific error for unique constraint violations
            db.rollback()
            logger.warning(f"Database integrity error during batch save (likely a duplicate URL missed by initial check): {e}")
            # Optionally, you could try saving jobs one by one here if batch commit fails,
            # but the unique constraint should ideally prevent most issues if URLs are truly canonical.
        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error during batch save of jobs: {e}", exc_info=True)
            raise # Re-raise other unexpected errors
    else:
        logger.info("No new jobs to add to the database from this batch.")
