import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
import time
import random
from typing import List, Dict, Any
import logging
from sqlalchemy.orm import Session

from app.db.models import Job

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
HN_JOBS_URL = "https://news.ycombinator.com/jobs"
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
]

def get_random_user_agent() -> str:
    """Return a random user agent string"""
    return random.choice(USER_AGENTS)

def extract_location(job_text: str) -> str:
    """Extract location from job text or title"""
    # Common location patterns
    location_patterns = [
        r'\b(?:in|at)\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z]{2})?)',  # "in San Francisco, CA" or "at New York"
        r'\(([^)]+)\)',  # Text in parentheses often contains location
        r'(?:remote|onsite|hybrid)',  # Special location types
    ]

    for pattern in location_patterns:
        match = re.search(pattern, job_text, re.IGNORECASE)
        if match:
            location = match.group(1) if len(match.groups()) > 0 else match.group(0)
            return location.strip()

    return "Not specified"

def extract_tech_stack(description: str) -> List[str]:
    """Extract potential technologies from job description"""
    # Common tech keywords to look for
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
    """Clean and normalize text"""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

async def scrape_hackernews_jobs(max_jobs: int = 30) -> List[Dict[str, Any]]:
    """Scrape job listings from Hacker News jobs page"""
    logger.info(f"Starting to scrape Hacker News jobs (max: {max_jobs})")
    jobs = []

    try:
        # Set up headers with random user agent
        headers = {
            "User-Agent": get_random_user_agent(),
            "Accept-Language": "en-US,en;q=0.9",
        }

        # Fetch the jobs page
        response = requests.get(HN_JOBS_URL, headers=headers)
        if response.status_code != 200:
            logger.error(f"Failed to fetch HN jobs page: {response.status_code}")
            return jobs

        soup = BeautifulSoup(response.text, "html.parser")

        # Find job listings (they're in tables with specific classes)
        job_tables = soup.find_all("tr", {"class": "athing"})

        for i, job_table in enumerate(job_tables):
            if i >= max_jobs:
                break

            try:
                # Job title is in the first <a> tag
                title_elem = job_table.find("a")
                if not title_elem:
                    continue

                title = clean_text(title_elem.text)
                if not any(keyword in title.lower() for keyword in ["hiring", "job", "looking", "seeking", "remote", "engineer", "developer"]):
                    continue  # Skip if not likely a job post

                # Get job URL
                job_url = title_elem.get("href", "")
                if not job_url.startswith("http"):
                    job_url = f"https://news.ycombinator.com/{job_url}"

                # Get more details from the job page if needed
                job_details = get_job_details(job_url, headers) if job_url else {}

                # Company name is often in the title or after "by"
                company_match = re.search(r'(hiring|at|for|by)\s+([^|,.]+)', title, re.IGNORECASE)
                company = company_match.group(2).strip() if company_match else "Unknown Company"

                # Get job details: either from the title or from fetching the job page
                description = job_details.get("description", title)

                # Extract or get location
                location = job_details.get("location", extract_location(title))

                # Create job record
                job_record = {
                    "title": title,
                    "company": company,
                    "location": location,
                    "description": description,
                    "url": job_url,
                    "source": "hackernews",
                    "posted_date": datetime.now()
                }

                jobs.append(job_record)
                logger.info(f"Scraped job: {title} at {company}")

                # Be nice to the server with a small delay
                time.sleep(random.uniform(0.5, 1.0))

            except Exception as e:
                logger.error(f"Error parsing job item: {str(e)}")
                continue

    except Exception as e:
        logger.error(f"Error scraping Hacker News jobs: {str(e)}")

    logger.info(f"Finished scraping, found {len(jobs)} jobs")
    return jobs

def get_job_details(job_url: str, headers: Dict[str, str]) -> Dict[str, Any]:
    """Optionally fetch more details from the job posting page"""
    try:
        # For non-HN URLs, we might want to limit fetching to avoid issues
        if "news.ycombinator.com" not in job_url:
            # For external URLs, just return basic info without fetching
            return {
                "description": f"See full details at {job_url}",
                "location": "Not specified"
            }

        # For HN-hosted job postings, fetch the details
        response = requests.get(job_url, headers=headers)
        if response.status_code != 200:
            return {}

        soup = BeautifulSoup(response.text, "html.parser")

        # Extract content from the job post
        job_text = soup.get_text()

        # Extract location information
        location = extract_location(job_text)

        # Clean up the text
        description = clean_text(job_text)

        return {
            "description": description[:1000],  # Limit description length
            "location": location
        }

    except Exception as e:
        logger.error(f"Error fetching job details: {str(e)}")
        return {}

async def save_jobs_to_db(jobs: List[Dict[str, Any]], db: Session) -> None:
    """Save scraped jobs to the database"""
    try:
        logger.info(f"Saving {len(jobs)} jobs to database")
        added_count = 0

        for job in jobs:
            # Check if job already exists (based on URL)
            existing_job = db.query(Job).filter(Job.url == job["url"]).first()
            if not existing_job:
                job_model = Job(**job)
                db.add(job_model)
                added_count += 1
                logger.info(f"Added new job: {job['title']} at {job['company']}")

        db.commit()
        logger.info(f"Added {added_count} new jobs to the database")

    except Exception as e:
        logger.error(f"Error saving jobs to database: {str(e)}")
        db.rollback()

async def run_hackernews_scraper(db: Session, max_jobs: int = 30) -> None:
    """Main function to run the HN jobs scraper"""
    try:
        jobs = await scrape_hackernews_jobs(max_jobs)
        if jobs:
            await save_jobs_to_db(jobs, db)
        return jobs
    except Exception as e:
        logger.error(f"Error in HN scraper: {str(e)}")
        return []
