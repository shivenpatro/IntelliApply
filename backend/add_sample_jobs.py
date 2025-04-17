"""
Script to add sample job data to the database for testing.
This lets us simulate the job matching functionality without running actual web scrapers.
"""

from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Job

# Sample job data
SAMPLE_JOBS = [
    {
        "title": "Frontend Developer",
        "company": "TechCorp",
        "location": "Remote",
        "description": "We're looking for a skilled Frontend Developer with experience in React, TypeScript, and TailwindCSS. The ideal candidate will have 2+ years of experience building responsive web applications.",
        "url": "https://example.com/jobs/frontend-dev",
        "source": "linkedin",
        "posted_date": datetime.now() - timedelta(days=2)
    },
    {
        "title": "Backend Engineer",
        "company": "InnovateSoft",
        "location": "New York, NY",
        "description": "Backend Engineer needed for a fast-growing startup. Must have experience with Python, FastAPI, and PostgreSQL. Knowledge of Redis and Celery is a plus.",
        "url": "https://example.com/jobs/backend-engineer",
        "source": "indeed",
        "posted_date": datetime.now() - timedelta(days=1)
    },
    {
        "title": "Full Stack Developer",
        "company": "WebWizards",
        "location": "San Francisco, CA",
        "description": "Join our team as a Full Stack Developer! We use React on the frontend and Node.js/Express on the backend. Experience with MongoDB and AWS is required.",
        "url": "https://example.com/jobs/fullstack-dev",
        "source": "linkedin",
        "posted_date": datetime.now() - timedelta(days=3)
    },
    {
        "title": "Data Scientist",
        "company": "AnalyticaAI",
        "location": "Boston, MA",
        "description": "Data Scientist position open for candidates with strong skills in Python, scikit-learn, and TensorFlow. Must have experience with NLP and computer vision projects.",
        "url": "https://example.com/jobs/data-scientist",
        "source": "indeed",
        "posted_date": datetime.now() - timedelta(days=5)
    },
    {
        "title": "DevOps Engineer",
        "company": "CloudNative",
        "location": "Remote",
        "description": "DevOps Engineer needed to manage our Kubernetes clusters and CI/CD pipelines. Experience with Docker, Kubernetes, and Terraform is essential.",
        "url": "https://example.com/jobs/devops-engineer",
        "source": "linkedin",
        "posted_date": datetime.now() - timedelta(days=4)
    },
    {
        "title": "Machine Learning Engineer",
        "company": "AIInnovate",
        "location": "Seattle, WA",
        "description": "Machine Learning Engineer needed to build and deploy ML models at scale. Experience with PyTorch, distributed computing, and model deployment required.",
        "url": "https://example.com/jobs/ml-engineer",
        "source": "indeed",
        "posted_date": datetime.now() - timedelta(days=7)
    },
    {
        "title": "UI/UX Designer",
        "company": "DesignMasters",
        "location": "Chicago, IL",
        "description": "UI/UX Designer with a strong portfolio needed. Must be proficient in Figma, have experience with design systems, and understand accessibility standards.",
        "url": "https://example.com/jobs/ui-ux-designer",
        "source": "linkedin",
        "posted_date": datetime.now() - timedelta(days=6)
    },
    {
        "title": "Product Manager",
        "company": "ProductForge",
        "location": "Austin, TX",
        "description": "Experienced Product Manager needed to lead our flagship product. Should have 3+ years of experience in agile environments and a technical background.",
        "url": "https://example.com/jobs/product-manager",
        "source": "indeed",
        "posted_date": datetime.now() - timedelta(days=8)
    },
    {
        "title": "React Native Developer",
        "company": "MobileFirst",
        "location": "Miami, FL",
        "description": "Seeking a React Native Developer to build cross-platform mobile applications. Experience with Redux, TypeScript, and native modules is required.",
        "url": "https://example.com/jobs/react-native-dev",
        "source": "linkedin",
        "posted_date": datetime.now() - timedelta(days=3)
    },
    {
        "title": "Software Engineer, Python",
        "company": "CodeWorks",
        "location": "Denver, CO",
        "description": "Python Software Engineer needed for a growing team. Must have experience with Django or Flask, RESTful APIs, and SQL databases.",
        "url": "https://example.com/jobs/python-engineer",
        "source": "indeed",
        "posted_date": datetime.now() - timedelta(days=5)
    }
]

def add_sample_jobs():
    """Add sample jobs to the database"""
    try:
        # Create DB session
        db = SessionLocal()
        
        print("Adding sample jobs to the database...")
        count = 0
        
        for job_data in SAMPLE_JOBS:
            # Check if job already exists (based on URL)
            existing_job = db.query(Job).filter(Job.url == job_data["url"]).first()
            if not existing_job:
                job = Job(**job_data)
                db.add(job)
                count += 1
        
        db.commit()
        db.close()
        
        print(f"Successfully added {count} sample jobs to the database!")
        
    except Exception as e:
        print(f"Error adding sample jobs: {str(e)}")
        if 'db' in locals():
            db.rollback()
            db.close()

if __name__ == "__main__":
    add_sample_jobs()
