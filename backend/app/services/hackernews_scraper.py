import logging
import random
import re
from datetime import datetime
from typing import List

import requests
from bs4 import BeautifulSoup

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
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
]


def get_random_user_agent() -> str:
    """Return a random user agent string"""
    return random.choice(USER_AGENTS)


def extract_location(job_text: str) -> str:
    location_patterns = [
        r"\b(?:in|at)\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z]{2})?)",
        r"\(([^)]+)\)",
        r"(?:remote|onsite|hybrid)",
    ]
    for pattern in location_patterns:
        match = re.search(pattern, job_text, re.IGNORECASE)
        if match:
            location = match.group(1) if len(match.groups()) > 0 else match.group(0)
            return location.strip()
    return "Not specified"


def extract_tech_stack(description: str) -> List[str]:
    tech_keywords = [
        "python",
        "javascript",
        "typescript",
        "react",
        "vue",
        "angular",
        "node",
        "express",
        "django",
        "flask",
        "fastapi",
        "sql",
        "nosql",
        "mongodb",
        "postgres",
        "mysql",
        "redis",
        "aws",
        "azure",
        "gcp",
        "docker",
        "kubernetes",
        "devops",
        "ci/cd",
        "ml",
        "ai",
        "machine learning",
        "data science",
        "golang",
        "rust",
        "java",
        "c++",
        "c#",
        ".net",
        "php",
        "laravel",
        "ruby",
        "rails",
        "swift",
        "kotlin",
        "flutter",
        "mobile",
        "frontend",
        "backend",
        "fullstack",
        "full-stack",
        "web",
    ]
    found_techs = []
    for tech in tech_keywords:
        if re.search(r"\b" + re.escape(tech) + r"\b", description, re.IGNORECASE):
            found_techs.append(tech)
    return found_techs


def clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


class ScrapeError(Exception):
    pass


def _scrape_hackernews(max_jobs):
    headers = {"User-Agent": "IntelliApply/1.0", "Accept-Language": "en"}
    response = requests.get(HN_JOBS_URL, headers=headers, timeout=(5, 15))
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    jobs = []
    for item in soup.select("tr.athing"):
        link = item.select_one(".titleline > a") or item.find("a")
        if not link:
            continue
        title = clean_text(link.get_text())
        from urllib.parse import urljoin, urlparse

        url = urljoin(HN_JOBS_URL, link.get("href", ""))
        if urlparse(url).scheme not in ("http", "https"):
            continue
        company = (
            re.split(r"\s+(?:is hiring|hiring|seeks|seeking)", title, flags=re.I)[0][
                :200
            ]
            or "Not specified"
        )
        jobs.append(
            {
                "title": title,
                "company": company,
                "location": extract_location(title),
                "description": title,
                "url": url,
                "source": "hackernews",
                "posted_date": datetime.now(),
            }
        )
        if len(jobs) >= min(max_jobs, 15):
            break
    return jobs


async def scrape_hackernews_jobs(max_jobs_param=15):
    import asyncio

    return await asyncio.to_thread(_scrape_hackernews, max_jobs_param)


def get_job_details(job_url, headers):
    from urllib.parse import urlparse

    if urlparse(job_url).hostname != "news.ycombinator.com":
        return {
            "description": "See the original listing for full details.",
            "location": "Not specified",
        }
    response = requests.get(job_url, headers=headers, timeout=(5, 15))
    response.raise_for_status()
    text = clean_text(BeautifulSoup(response.text, "html.parser").get_text())
    return {"description": text[:3000], "location": extract_location(text)}


async def run_hackernews_scraper(db=None, max_jobs=15):
    jobs = await scrape_hackernews_jobs(max_jobs)
    if jobs:
        await save_jobs_to_db(jobs, db)
    return jobs
