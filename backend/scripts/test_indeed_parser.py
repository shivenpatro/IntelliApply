import asyncio
import os
import sys

# Add the parent directory (backend) to sys.path to allow 'app' imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.job_scraper import parse_indeed_html

async def main():
    html_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "temp_indeed_scrape.html")
    
    print(f"Attempting to read HTML from: {html_file_path}")
    
    try:
        with open(html_file_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        print(f"Successfully read {len(html_content)} characters from HTML file.")
    except FileNotFoundError:
        print(f"Error: HTML file not found at {html_file_path}")
        return
    except Exception as e:
        print(f"Error reading HTML file: {e}")
        return

    if not html_content:
        print("HTML content is empty. Exiting.")
        return

    print("\nParsing Indeed HTML content...")
    indeed_jobs = await parse_indeed_html(html_content, max_results=15) # Parse up to 15 jobs

    if indeed_jobs:
        print(f"\nSuccessfully parsed {len(indeed_jobs)} jobs from Indeed HTML:")
        for i, job in enumerate(indeed_jobs):
            print(f"\n--- Job {i+1} ---")
            print(f"  Title: {job.get('title')}")
            print(f"  Company: {job.get('company')}")
            print(f"  Location: {job.get('location')}")
            print(f"  URL: {job.get('url')}")
            # print(f"  Description Snippet: {job.get('description')[:100]}...") # Print first 100 chars of description
    else:
        print("\nNo jobs parsed from the HTML content.")

if __name__ == "__main__":
    asyncio.run(main())
