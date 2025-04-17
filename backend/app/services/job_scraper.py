import requests
from bs4 import BeautifulSoup
import time
import random
from datetime import datetime
import asyncio
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Job
from app.core.config import settings
from app.services.hackernews_scraper import run_hackernews_scraper

# User agent strings to rotate for scraping
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
]

def get_random_user_agent():
    """Return a random user agent string"""
    return random.choice(USER_AGENTS)

async def scrape_indeed_jobs(keywords, location, max_results=10):
    """Scrape job listings from Indeed"""
    base_url = "https://www.indeed.com/jobs"
    jobs = []

    # Format the search URL
    keywords_param = "+".join(keywords.split())
    location_param = "+".join(location.split())
    url = f"{base_url}?q={keywords_param}&l={location_param}"

    try:
        # Set up headers with random user agent
        headers = {
            "User-Agent": get_random_user_agent(),
            "Accept-Language": "en-US,en;q=0.9",
        }

        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Failed to fetch Indeed page: {response.status_code}")
            return jobs

        soup = BeautifulSoup(response.text, "html.parser")
        job_cards = soup.find_all("div", {"class": "jobsearch-SerpJobCard"})

        for i, card in enumerate(job_cards):
            if i >= max_results:
                break

            # Extract job details
            try:
                title_elem = card.find("h2", {"class": "title"})
                company_elem = card.find("span", {"class": "company"})
                location_elem = card.find("div", {"class": "recJobLoc"})
                summary_elem = card.find("div", {"class": "summary"})

                title = title_elem.text.strip() if title_elem else "Unknown Title"
                company = company_elem.text.strip() if company_elem else "Unknown Company"
                job_location = location_elem.get("data-rc-loc", "Unknown Location") if location_elem else "Unknown Location"
                summary = summary_elem.text.strip() if summary_elem else ""

                # Get the job URL
                job_link = title_elem.find("a", href=True)
                job_url = "https://www.indeed.com" + job_link["href"] if job_link else ""

                jobs.append({
                    "title": title,
                    "company": company,
                    "location": job_location,
                    "description": summary,
                    "url": job_url,
                    "source": "indeed",
                    "posted_date": datetime.now()  # Approximate
                })

            except Exception as e:
                print(f"Error parsing job card: {str(e)}")
                continue

            # Be nice to the server
            time.sleep(random.uniform(1.0, 2.0))

    except Exception as e:
        print(f"Error scraping Indeed: {str(e)}")

    return jobs

async def scrape_linkedin_jobs(keywords, location, max_results=10):
    """Scrape job listings from LinkedIn"""
    base_url = "https://www.linkedin.com/jobs/search"
    jobs = []

    # Format the search URL
    keywords_param = "%20".join(keywords.split())
    location_param = "%20".join(location.split())
    url = f"{base_url}?keywords={keywords_param}&location={location_param}&f_TPR=r86400&f_E=2"

    try:
        # Set up headers with random user agent
        headers = {
            "User-Agent": get_random_user_agent(),
            "Accept-Language": "en-US,en;q=0.9",
        }

        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Failed to fetch LinkedIn page: {response.status_code}")
            return jobs

        soup = BeautifulSoup(response.text, "html.parser")
        job_cards = soup.find_all("div", {"class": "base-card"})

        for i, card in enumerate(job_cards):
            if i >= max_results:
                break

            # Extract job details
            try:
                title_elem = card.find("h3", {"class": "base-search-card__title"})
                company_elem = card.find("h4", {"class": "base-search-card__subtitle"})
                location_elem = card.find("span", {"class": "job-search-card__location"})
                link_elem = card.find("a", {"class": "base-card__full-link"})

                title = title_elem.text.strip() if title_elem else "Unknown Title"
                company = company_elem.text.strip() if company_elem else "Unknown Company"
                job_location = location_elem.text.strip() if location_elem else "Unknown Location"
                job_url = link_elem["href"] if link_elem and "href" in link_elem.attrs else ""

                # Since we can't get full description from the search page,
                # we'll use a placeholder and potentially fetch it later if needed
                jobs.append({
                    "title": title,
                    "company": company,
                    "location": job_location,
                    "description": f"Job at {company} for {title} position in {job_location}.",
                    "url": job_url,
                    "source": "linkedin",
                    "posted_date": datetime.now()  # Approximate
                })

            except Exception as e:
                print(f"Error parsing job card: {str(e)}")
                continue

            # Be nice to the server
            time.sleep(random.uniform(1.0, 2.0))

    except Exception as e:
        print(f"Error scraping LinkedIn: {str(e)}")

    return jobs

async def save_jobs_to_db(jobs, db: Session):
    """Save scraped jobs to the database"""
    for job_data in jobs:
        # Check if job already exists (based on URL)
        existing_job = db.query(Job).filter(Job.url == job_data["url"]).first()
        if not existing_job:
            job = Job(**job_data)
            db.add(job)

    db.commit()

async def trigger_job_scraping():
    """Main function to trigger job scraping"""
    try:
        # Create DB session
        db = SessionLocal()

        # Define search parameters - in a real app, these would come from user profiles
        search_terms = [
            ("software developer", "remote"),
            ("data scientist", "new york"),
            ("full stack developer", "san francisco"),
            ("machine learning engineer", "boston"),
            ("frontend developer", "remote"),
        ]

        # First, scrape Hacker News Jobs
        print("Scraping Hacker News Jobs...")
        hn_jobs = await run_hackernews_scraper(db, max_jobs=30)
        print(f"Found {len(hn_jobs) if hn_jobs else 0} jobs from Hacker News")

        # Then scrape other sources based on search terms
        for keywords, location in search_terms:
            # Scrape from different sources
            indeed_jobs = await scrape_indeed_jobs(keywords, location)
            linkedin_jobs = await scrape_linkedin_jobs(keywords, location)

            # Combine results
            all_jobs = indeed_jobs + linkedin_jobs

            # Save to database
            await save_jobs_to_db(all_jobs, db)

            # Be nice to the servers
            await asyncio.sleep(random.uniform(2.0, 5.0))

        db.close()
        print("Job scraping completed successfully.")

    except Exception as e:
        print(f"Error during job scraping: {str(e)}")
        if 'db' in locals():
            db.close()
