import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
import time
import random
from typing import List, Dict, Any
import logging
from sqlalchemy.orm import Session
# app.db.models.Job is not directly used here if saving is centralized
# from app.db.models import Job 
# Import the centralized save_jobs_to_db from db_utils
from app.services.db_utils import save_jobs_to_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
HN_JOBS_URL = "https://news.ycombinator.com/jobs"
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
]

def get_random_user_agent() -> str:
    """Return a random user agent string"""
    return random.choice(USER_AGENTS)

def extract_location(job_text: str) -> str:
    location_patterns = [
        r'\b(?:in|at)\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z]{2})?)',
        r'\(([^)]+)\)',
        r'(?:remote|onsite|hybrid)',
    ]
    for pattern in location_patterns:
        match = re.search(pattern, job_text, re.IGNORECASE)
        if match:
            location = match.group(1) if len(match.groups()) > 0 else match.group(0)
            return location.strip()
    return "Not specified"

def extract_tech_stack(description: str) -> List[str]:
    tech_keywords = [
        "python", "javascript", "typescript", "react", "vue", "angular",
        "node", "express", "django", "flask", "fastapi", "sql", "nosql",
        "mongodb", "postgres", "mysql", "redis", "aws", "azure", "gcp",
        "docker", "kubernetes", "devops", "ci/cd", "ml", "ai", "machine learning",
        "data science", "golang", "rust", "java", "c++", "c#", ".net", "php",
        "laravel", "ruby", "rails", "swift", "kotlin", "flutter", "mobile",
        "frontend", "backend", "fullstack", "full-stack", "web"
    ]
    found_techs = []
    for tech in tech_keywords:
        if re.search(r'\b' + re.escape(tech) + r'\b', description, re.IGNORECASE):
            found_techs.append(tech)
    return found_techs

def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

async def scrape_hackernews_jobs(max_jobs_param: int = 30) -> List[Dict[str, Any]]: # Renamed param to avoid confusion
    # Apply a hard cap of 15 for HackerNews, or use smaller value from param
    effective_max_jobs = min(max_jobs_param, 15)
    logger.info(f"Starting to scrape Hacker News jobs (param max: {max_jobs_param}, effective max: {effective_max_jobs})")
    jobs = []
    try:
        headers = {"User-Agent": get_random_user_agent(), "Accept-Language": "en-US,en;q=0.9"}
        response = requests.get(HN_JOBS_URL, headers=headers)
        if response.status_code != 200:
            logger.error(f"Failed to fetch HN jobs page: {response.status_code}")
            return jobs
        soup = BeautifulSoup(response.text, "html.parser")
        job_tables = soup.find_all("tr", {"class": "athing"})
        for i, job_table in enumerate(job_tables):
            if len(jobs) >= effective_max_jobs: break # Check against jobs_data length
            try:
                title_elem = job_table.find("a")
                if not title_elem: continue
                title = clean_text(title_elem.text)
                if not any(keyword in title.lower() for keyword in ["hiring", "job", "looking", "seeking", "remote", "engineer", "developer"]):
                    continue
                job_url = title_elem.get("href", "")
                if not job_url.startswith("http"): job_url = f"https://news.ycombinator.com/{job_url}"
                job_details = get_job_details(job_url, headers) if job_url else {}
                company_match = re.search(r'(hiring|at|for|by)\s+([^|,.]+)', title, re.IGNORECASE)
                company = company_match.group(2).strip() if company_match else "Unknown Company"
                description = job_details.get("description", title)
                location = job_details.get("location", extract_location(title))
                jobs.append({
                    "title": title, "company": company, "location": location,
                    "description": description, "url": job_url, "source": "hackernews",
                    "posted_date": datetime.now() # HN doesn't provide easily parsable dates for main listings
                })
                logger.info(f"Scraped job: {title} at {company}")
                time.sleep(random.uniform(0.5, 1.0))
            except Exception as e: logger.error(f"Error parsing job item: {str(e)}")
    except Exception as e: logger.error(f"Error scraping Hacker News jobs: {str(e)}")
    logger.info(f"Finished scraping, found {len(jobs)} jobs")
    return jobs

def get_job_details(job_url: str, headers: Dict[str, str]) -> Dict[str, Any]:
    try:
        if "news.ycombinator.com" not in job_url:
            return {"description": f"See full details at {job_url}", "location": "Not specified"}
        response = requests.get(job_url, headers=headers)
        if response.status_code != 200: return {}
        soup = BeautifulSoup(response.text, "html.parser")
        job_text = soup.get_text()
        location = extract_location(job_text)
        description = clean_text(job_text)
        return {"description": description[:1000], "location": location}
    except Exception as e:
        logger.error(f"Error fetching job details: {str(e)}")
        return {}

async def run_hackernews_scraper(db: Session, max_jobs: int = 30) -> List[Dict[str, Any]]:
    """Main function to run the HN jobs scraper"""
    try:
        jobs_data_list = await scrape_hackernews_jobs(max_jobs)
        if jobs_data_list:
            await save_jobs_to_db(jobs_data_list, db) # Use centralized save_jobs_to_db
        return jobs_data_list
    except Exception as e:
        logger.error(f"Error in HN scraper: {str(e)}")
        return []
