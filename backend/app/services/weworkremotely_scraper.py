import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime, timezone
import time
import random
from typing import List, Dict, Any, Optional
import logging
from sqlalchemy.orm import Session
from urllib.parse import urljoin

from firecrawl import FirecrawlApp
from app.core.config import settings
from app.services.db_utils import save_jobs_to_db 

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

WWR_BASE_URL = "https://weworkremotely.com"
WWR_JOBS_PAGE_URL = "https://weworkremotely.com/categories/remote-programming-jobs"

def clean_text(text: Optional[str]) -> str:
    if text is None: return ""
    return re.sub(r'\s+', ' ', text).strip()

async def scrape_weworkremotely_jobs(max_jobs_param: int = 30) -> List[Dict[str, Any]]: # Renamed param
    # Apply a hard cap of 30 for WeWorkRemotely, or use smaller value from param
    effective_max_jobs = min(max_jobs_param, 30)
    logger.info(f"Starting to scrape WeWorkRemotely jobs (param max: {max_jobs_param}, effective max: {effective_max_jobs}) from {WWR_JOBS_PAGE_URL}")
    jobs_data: List[Dict[str, Any]] = []

    if not settings.FIRECRAWL_API_KEY:
        logger.error("FIRECRAWL_API_KEY not configured. Aborting WeWorkRemotely scraping.")
        return jobs_data
    
    firecrawl_app = FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)
    
    try:
        # Matching the log: "Attempting to scrape ... explicitly requesting HTML"
        # This implies 'formats' parameter might have been used.
        logger.info(f"Attempting to scrape WeWorkRemotely URL with Firecrawl SDK, explicitly requesting HTML via formats=['html']: {WWR_JOBS_PAGE_URL}")
        
        scraped_data = firecrawl_app.scrape_url(
            WWR_JOBS_PAGE_URL,
            formats=['html'], # Explicitly request HTML format
            timeout=60000 
        )

        html_content = None
        if scraped_data:
            if hasattr(scraped_data, 'html') and scraped_data.html:
                html_content = scraped_data.html
                logger.info("Successfully obtained HTML from scraped_data.html")
            elif hasattr(scraped_data, 'source_html') and scraped_data.source_html: 
                 html_content = scraped_data.source_html
                 logger.info("Successfully obtained HTML from scraped_data.source_html")
            elif hasattr(scraped_data, 'data'): 
                if isinstance(scraped_data.data, dict) and scraped_data.data.get('html'):
                    html_content = scraped_data.data.get('html')
                    logger.info("Successfully obtained HTML from scraped_data.data['html']")
                elif isinstance(scraped_data.data, str) and scraped_data.data.strip().startswith("<"): # Check if data itself is HTML
                    html_content = scraped_data.data
                    logger.info("Interpreting scraped_data.data as HTML string")
        
        if not html_content:
            logger.error(f"Firecrawl: Failed to extract usable HTML content (formats=['html'] used). Markdown might be in scraped_data.markdown. Full response: {vars(scraped_data) if scraped_data and hasattr(scraped_data, '__dict__') else scraped_data}")
            return jobs_data
            
        logger.info(f"Successfully fetched HTML content for WWR. Length: {len(html_content)}")
        
        soup = BeautifulSoup(html_content, "html.parser")
        
        job_elements_found = []
        job_sections = soup.find_all("section", class_="jobs", id=re.compile(r"category-\d+"))
        if not job_sections:
             logger.warning("WWR HTML: Could not find job sections with id 'category-X'. Trying broader search for 'li.new-listing-container'.")
             job_elements_found = soup.find_all("li", class_="new-listing-container")
        else:
            for section in job_sections:
                list_items = section.find_all("li", class_=lambda x: x and "new-listing-container" in x and "metana-ad" not in x)
                job_elements_found.extend(list_items)
        
        logger.info(f"Found {len(job_elements_found)} potential job <li> elements in WWR HTML.")

        for i, job_elem in enumerate(job_elements_found):
            if len(jobs_data) >= effective_max_jobs: break
            try:
                title_elem = job_elem.select_one("h4.new-listing__header__title")
                title = clean_text(title_elem.text) if title_elem else None
                company_elem = job_elem.select_one("p.new-listing__company-name")
                company = clean_text(company_elem.text.splitlines()[0]) if company_elem else None
                location_details = []
                hq_elem = job_elem.select_one("p.new-listing__company-headquarters")
                if hq_elem: location_details.append(clean_text(hq_elem.text))
                categories_div = job_elem.select_one("div.new-listing__categories")
                if categories_div:
                    for cat_elem in categories_div.find_all("p", class_="new-listing__categories__category"):
                        cat_text = clean_text(cat_elem.text)
                        if "featured" not in cat_text.lower() and "top 100" not in cat_text.lower() and "$" not in cat_text:
                            location_details.append(cat_text)
                job_location_info = ", ".join(filter(None, location_details)) or "Not specified"
                link_tag = job_elem.find("a", href=re.compile(r"(/listings/|/remote-jobs/)[^/]+"))
                if not link_tag: 
                    link_container = job_elem.select_one("div.new-listing")
                    if link_container: link_tag = link_container.find_parent("a", href=re.compile(r"(/listings/|/remote-jobs/)[^/]+"))
                
                if not title or not company or not link_tag or not link_tag.get('href'):
                    logger.warning(f"Skipping WWR job item due to missing title, company, or link: {str(job_elem)[:150]}")
                    continue

                absolute_url = urljoin(WWR_BASE_URL, link_tag['href'])
                description = f"{title} at {company}. Location/Type: {job_location_info}."
                jobs_data.append({"title": title, "company": company, "location": job_location_info, "description": description, "url": absolute_url, "source": "weworkremotely", "posted_date": datetime.now(timezone.utc)})
                logger.info(f"Scraped WWR job (from HTML): {title} at {company}")
            except Exception as e_parse:
                logger.error(f"Error parsing WWR HTML job item: {e_parse} - Item: {str(job_elem)[:200]}", exc_info=True)
            if i < len(job_elements_found) - 1: time.sleep(random.uniform(0.2, 0.5))
            
    except Exception as e_outer:
        logger.error(f"Outer error during WeWorkRemotely scraping: {e_outer}", exc_info=True)
        if 'scraped_data' in locals() and scraped_data:
            logger.error(f"Scraped_data object details: {vars(scraped_data) if hasattr(scraped_data, '__dict__') else scraped_data}")

    logger.info(f"Finished scraping WeWorkRemotely, found {len(jobs_data)} jobs.")
    return jobs_data

async def run_weworkremotely_scraper(db: Session, max_jobs: int = 30) -> List[Dict[str, Any]]:
    try:
        jobs_list = await scrape_weworkremotely_jobs(max_jobs)
        if jobs_list:
            await save_jobs_to_db(jobs_list, db)
        return jobs_list
    except Exception as e:
        logger.error(f"Error in run_weworkremotely_scraper: {e}", exc_info=True)
        return []
