"""Optional WWR HTML scraper using the bounded Firecrawl REST API."""

import re
from datetime import datetime, timezone
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.core.config import settings
from app.services.db_utils import save_jobs_to_db

WWR_BASE_URL = "https://weworkremotely.com"
WWR_JOBS_PAGE_URL = WWR_BASE_URL + "/categories/remote-programming-jobs"


def clean_text(value):
    return re.sub(r"\s+", " ", value or "").strip()


async def scrape_weworkremotely_jobs(max_jobs_param=15):
    if not settings.FIRECRAWL_API_KEY:
        raise RuntimeError("WeWorkRemotely is enabled but Firecrawl is not configured.")
    async with httpx.AsyncClient(timeout=httpx.Timeout(35, connect=5)) as client:
        response = await client.post(
            "https://api.firecrawl.dev/v2/scrape",
            headers={"Authorization": "Bearer " + settings.FIRECRAWL_API_KEY},
            json={"url": WWR_JOBS_PAGE_URL, "formats": ["html"], "timeout": 30000},
        )
        response.raise_for_status()
        payload = response.json()
    html = (
        (payload.get("data") or {}).get("html")
        if isinstance(payload, dict) and payload.get("success") is not False
        else None
    )
    if not isinstance(html, str) or not html.strip():
        raise RuntimeError("Firecrawl returned no usable HTML.")
    soup = BeautifulSoup(html, "html.parser")
    elements = soup.select("li.new-listing-container")
    if not elements:
        raise RuntimeError("WWR listing layout is unavailable or has changed.")
    jobs = []
    for element in elements:
        title = element.select_one("h4.new-listing__header__title")
        company = element.select_one("p.new-listing__company-name")
        link = element.find("a", href=re.compile(r"(/listings/|/remote-jobs/)[^/]+"))
        title = clean_text(title.get_text()) if title else ""
        company = clean_text(company.get_text().splitlines()[0]) if company else ""
        if not title or not company or not link:
            continue
        locations = [
            clean_text(e.get_text())
            for e in element.select(
                "p.new-listing__company-headquarters, p.new-listing__categories__category"
            )
        ]
        location = (
            ", ".join(
                v
                for v in locations
                if v and "$" not in v and "featured" not in v.lower()
            )
            or "Not specified"
        )
        url = urljoin(WWR_BASE_URL, link["href"])
        if not url.startswith(WWR_BASE_URL + "/"):
            continue
        jobs.append(
            {
                "title": title,
                "company": company,
                "location": location,
                "description": f"{title} at {company}. Location/Type: {location}.",
                "url": url,
                "source": "weworkremotely",
                "posted_date": datetime.now(timezone.utc),
            }
        )
        if len(jobs) >= min(max_jobs_param, 30):
            break
    if not jobs:
        raise RuntimeError("WWR returned no usable listings.")
    return jobs


async def run_weworkremotely_scraper(db=None, max_jobs=15):
    jobs = await scrape_weworkremotely_jobs(max_jobs)
    await save_jobs_to_db(jobs)
    return jobs
