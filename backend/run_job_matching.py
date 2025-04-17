"""
Script to run the job matching algorithm for all users.
This will calculate relevance scores between user profiles and jobs.
"""

import asyncio
from app.services.job_matcher import match_jobs_for_all_users

async def main():
    """Run job matching for all users"""
    print("Starting job matching process...")
    await match_jobs_for_all_users()
    print("Job matching completed!")

if __name__ == "__main__":
    asyncio.run(main())
