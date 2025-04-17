"""
Script to run the job scraper and matcher.
This can be run as a standalone process or scheduled task.
"""

import asyncio
from app.services.job_scraper import trigger_job_scraping
from app.services.job_matcher import match_jobs_for_all_users

async def main():
    """Run the job scraper and matcher"""
    print("Starting job scraping...")
    await trigger_job_scraping()
    
    print("\nStarting job matching for all users...")
    await match_jobs_for_all_users()
    
    print("\nJob scraping and matching completed!")

if __name__ == "__main__":
    asyncio.run(main())
