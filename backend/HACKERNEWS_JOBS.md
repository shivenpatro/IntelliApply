# Hacker News Jobs Scraper

This document explains how to use the Hacker News Jobs scraper in IntelliApply.

## Overview

The Hacker News Jobs scraper fetches job listings from https://news.ycombinator.com/jobs and adds them to the IntelliApply database. These jobs can then be matched with user profiles to provide personalized job recommendations.

## Running the Scraper

There are several ways to run the Hacker News Jobs scraper:

### 1. Using the test script

The test script will scrape jobs from Hacker News, match them with a test user profile, and display the results:

```bash
python -m scripts.test_job_flow
```

### 2. Using the job scraper script

This script will run the job scraper and matcher for all users:

```bash
python run_job_scraper.py
```

### 3. Through the API endpoint

You can also trigger the job scraper through the API endpoint:

```
POST /api/jobs/refresh
```

This requires authentication and will schedule job scraping and matching in the background.

## Configuration

The scraper can be configured through environment variables in the `.env` file:

```
# Web Scraping Configuration
SCRAPER_INTERVAL_MINUTES=60
SCRAPER_MAX_JOBS_PER_SOURCE=30
SCRAPER_SOURCES=hackernews
```

## Job Matching

After jobs are scraped, they are automatically matched with user profiles based on:

1. Skills listed in the user profile
2. Experience details
3. Desired roles and locations

The matching algorithm uses TF-IDF and cosine similarity to calculate relevance scores between user profiles and job listings.

## Viewing Matched Jobs

Users can view their matched jobs through the frontend dashboard or by using the API endpoint:

```
GET /api/jobs/matched
```

This will return a list of jobs sorted by relevance score.
