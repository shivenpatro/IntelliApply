import os
from bs4 import BeautifulSoup
import time
import random
from datetime import datetime
import asyncio
from sqlalchemy.orm import Session
from firecrawl import FirecrawlApp # Import FirecrawlApp
import spacy # Import Spacy

from app.db.database import SessionLocal
from app.db.models import Job
from app.core.config import settings
from app.services.hackernews_scraper import run_hackernews_scraper
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO) # Ensure logs are visible

# Load Spacy model
# Make sure to download the model if you haven't:
# python -m spacy download en_core_web_sm
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.error("Spacy model 'en_core_web_sm' not found. Please download it by running: python -m spacy download en_core_web_sm")
    nlp = None # Set nlp to None if model loading fails to prevent further errors

# User agent strings are not directly used by Firecrawl SDK but good to keep if we ever revert
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    # ... (other user agents)
]

def get_random_user_agent():
    return random.choice(USER_AGENTS)

async def parse_indeed_html(html_content: str, source_url: str, max_results=10):
    """Parse job listings from Indeed HTML content"""
    jobs = []
    if not html_content:
        logger.warning(f"No HTML content provided to parse_indeed_html for URL: {source_url}")
        return jobs

    try:
        soup = BeautifulSoup(html_content, "html.parser")
        # Selectors might need significant adjustment based on Firecrawl's HTML output vs direct browser HTML
        job_cards = soup.find_all("div", attrs={"data-jk": True}) # Primary selector
        if not job_cards:
            job_cards = soup.find_all("div", class_="job_seen_beacon")
        if not job_cards: # Fallback to a common list structure
             job_cards = soup.select('ul#mosaic-provider-jobcards > li div.cardOutline')
        if not job_cards: # Final fallback
            job_cards = soup.find_all("div", class_=lambda x: x and "jobsearch-SerpJobCard" in x)


        logger.info(f"Found {len(job_cards)} potential job cards on Indeed page: {source_url}")

        for i, card in enumerate(job_cards):
            if i >= max_results:
                break
            try:
                title_elem = card.select_one("h2 a[id^='jobTitle-'], h2 span[id^='jobTitle-'], a.jcs-JobTitle, h2.jobTitle") 
                title = title_elem.get_text(strip=True) if title_elem else "Unknown Title"
                
                job_url_from_title = None
                if title_elem and title_elem.name == 'a' and title_elem.get('href'):
                    job_url_from_title = title_elem.get('href')

                company_elem = card.find(attrs={"data-testid": "company-name"}) or card.select_one("span.css-1h7lukg, span.companyName")
                company = company_elem.get_text(strip=True) if company_elem else "Unknown Company"

                location_elem = card.find(attrs={"data-testid": "text-location"}) or card.select_one("div.css-1restlb, div.companyLocation")
                job_location = location_elem.get_text(strip=True) if location_elem else "Unknown Location"
                
                job_url = ""
                job_jk_on_card = card.get('data-jk')
                if job_jk_on_card:
                    job_url = f"https://www.indeed.com/viewjob?jk={job_jk_on_card}"
                elif job_url_from_title:
                     job_url = job_url_from_title
                else: # Fallback for URL
                    link_elem = card.find("a", attrs={"data-jk": True}) or card.find("a", href=lambda href: href and ("/rc/clk" in href or "/viewjob" in href))
                    if link_elem and link_elem.get('href'):
                        job_url = link_elem['href']
                
                if job_url and job_url.startswith('/'):
                    job_url = "https://www.indeed.com" + job_url
                
                summary_elem = card.select_one("div.job-snippet, ul[style*='list-style-type:circle'], div[data-testid='belowJobSnippet'] ul, div.result-section-inner-html")
                summary = summary_elem.get_text(separator=" ", strip=True) if summary_elem else ""
                
                spacy_entities = {}
                if nlp and summary:
                    doc = nlp(summary[:nlp.max_length]) # Process summary, ensure it's not too long for the model
                    spacy_entities = {ent.label_: ent.text for ent in doc.ents}

                if title != "Unknown Title" and company != "Unknown Company":
                    jobs.append({
                        "title": title, "company": company, "location": job_location,
                        "description": summary, "url": job_url, "source": "indeed",
                        "posted_date": datetime.now(), # Placeholder, actual date often requires visiting job detail page
                        "spacy_entities": spacy_entities # Add extracted Spacy entities
                    })
            except Exception as e:
                logger.error(f"Error parsing Indeed job card for {source_url}: {str(e)}", exc_info=True)
                continue
    except Exception as e:
        logger.error(f"Error processing HTML from Firecrawl for Indeed URL {source_url}: {str(e)}", exc_info=True)
    return jobs

async def parse_linkedin_html(html_content: str, source_url: str, max_results=10):
    """Placeholder for parsing LinkedIn HTML content from Firecrawl"""
    jobs = []
    if not html_content:
        logger.warning(f"No HTML content provided to parse_linkedin_html for URL: {source_url}")
        return jobs
    logger.info(f"LinkedIn HTML parsing not yet implemented. Received {len(html_content)} chars for {source_url}.")
    # TODO: Implement BeautifulSoup parsing logic for LinkedIn job search results page HTML
    # Selectors will be different from Indeed. Example (likely needs adjustment):
    # soup = BeautifulSoup(html_content, "html.parser")
    # job_cards = soup.find_all("div", class_="base-search-card")
    # for card in job_cards: ...
    return jobs


async def save_jobs_to_db(jobs, db: Session):
    """Save scraped jobs to the database"""
    new_jobs_count = 0
    for job_data in jobs:
        if not job_data.get("url"): # Skip jobs without a URL
            logger.warning(f"Skipping job due to missing URL: {job_data.get('title', 'N/A')}")
            continue
        existing_job = db.query(Job).filter(Job.url == job_data["url"]).first()
        if not existing_job:
            job = Job(**job_data)
            db.add(job)
            new_jobs_count +=1
    if new_jobs_count > 0:
        db.commit()
        logger.info(f"Added {new_jobs_count} new jobs to the database.")
    else:
        logger.info("No new jobs to add to the database from this batch.")


async def trigger_job_scraping():
    """Main function to trigger job scraping using Firecrawl SDK"""
    if not settings.FIRECRAWL_API_KEY:
        logger.error("FIRECRAWL_API_KEY not configured. Aborting scraping.")
        return

    firecrawl_app = FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)
    db = SessionLocal()

    try:
        search_terms = [
            ("software developer", "remote"), ("data scientist", "new york"),
            ("full stack developer", "san francisco"), ("machine learning engineer", "boston"),
            ("frontend developer", "remote"),
        ]
        enabled_sources = [source.strip().lower() for source in settings.SCRAPER_SOURCES.split(',')]
        logger.info(f"Enabled scraper sources: {enabled_sources}")

        if "hackernews" in enabled_sources:
            logger.info("Scraping Hacker News Jobs...")
            # run_hackernews_scraper is synchronous, consider making it async or running in thread
            # For now, assuming it's okay as a blocking call within this async function
            hn_jobs = await run_hackernews_scraper(db, max_jobs=settings.SCRAPER_MAX_JOBS_PER_SOURCE or 30) # Assuming it's async now
            logger.info(f"Hacker News scraping yielded {len(hn_jobs) if hn_jobs else 0} jobs (already saved by its function).")

        all_scraped_jobs = []
        scrape_params = {
            'pageOptions': {
                'onlyMainContent': False, # Get full HTML for better parsing
                'includeHtml': True
            },
            'timeout': 30000 # 30 seconds timeout for scrape
        }

        for keywords, location in search_terms:
            term_jobs = []
            if "indeed" in enabled_sources:
                indeed_url = f"https://www.indeed.com/jobs?q={'+'.join(keywords.split())}&l={'+'.join(location.split())}"
                logger.info(f"Attempting to scrape Indeed URL with Firecrawl SDK: {indeed_url}")
                try:
                    scraped_data = firecrawl_app.scrape_url(indeed_url, params=scrape_params)
                    if scraped_data and scraped_data.get('html'):
                        logger.info(f"Successfully fetched HTML for Indeed URL: {indeed_url}")
                        indeed_jobs = await parse_indeed_html(scraped_data['html'], indeed_url, max_results=settings.SCRAPER_MAX_JOBS_PER_SOURCE or 10)
                        term_jobs.extend(indeed_jobs)
                    else:
                        logger.warning(f"No HTML content from Firecrawl for Indeed URL: {indeed_url}. Response: {scraped_data}")
                except Exception as e:
                    logger.error(f"Error scraping Indeed URL {indeed_url} with Firecrawl SDK: {e}", exc_info=True)
            
            if "linkedin" in enabled_sources:
                linkedin_url = f"https://www.linkedin.com/jobs/search?keywords={'+'.join(keywords.split())}&location={'+'.join(location.split())}&f_TPR=r86400&f_E=2"
                logger.info(f"Attempting to scrape LinkedIn URL with Firecrawl SDK: {linkedin_url}")
                try:
                    scraped_data = firecrawl_app.scrape_url(linkedin_url, params=scrape_params)
                    if scraped_data and scraped_data.get('html'):
                        logger.info(f"Successfully fetched HTML for LinkedIn URL: {linkedin_url}")
                        # We need a parse_linkedin_html function
                        linkedin_jobs = await parse_linkedin_html(scraped_data['html'], linkedin_url, max_results=settings.SCRAPER_MAX_JOBS_PER_SOURCE or 10)
                        term_jobs.extend(linkedin_jobs)
                    else:
                        logger.warning(f"No HTML content from Firecrawl for LinkedIn URL: {linkedin_url}. Response: {scraped_data}")
                except Exception as e:
                    logger.error(f"Error scraping LinkedIn URL {linkedin_url} with Firecrawl SDK: {e}", exc_info=True)

            if term_jobs:
                logger.info(f"Saving {len(term_jobs)} jobs from Indeed/LinkedIn for term '{keywords} in {location}'...")
                all_scraped_jobs.extend(term_jobs)
            
            await asyncio.sleep(random.uniform(settings.SCRAPER_MAX_JOBS_PER_SOURCE or 5, 10.0)) # Longer sleep between terms

        if all_scraped_jobs: # Save all Indeed/LinkedIn jobs collected from terms
            await save_jobs_to_db(all_scraped_jobs, db)

        logger.info("Job scraping cycle completed.")

    except Exception as e:
        logger.error(f"Critical error in trigger_job_scraping: {str(e)}", exc_info=True)
    finally:
        if db:
            db.close()
