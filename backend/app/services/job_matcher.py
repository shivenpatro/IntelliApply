import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import asyncio
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import User, Profile, Skill, Experience, Job, UserJobMatch

def prepare_profile_text(profile, skills, experiences):
    """Prepare a text representation of a user profile for matching"""
    profile_text = ""
    
    # Add desired roles and locations if available
    if profile.desired_roles:
        profile_text += f"Desired roles: {profile.desired_roles} "
    if profile.desired_locations:
        profile_text += f"Desired locations: {profile.desired_locations} "
    
    # Add skills
    skill_text = " ".join([skill.name for skill in skills])
    profile_text += f"Skills: {skill_text} "
    
    # Add experiences
    for exp in experiences:
        profile_text += f"Experience: {exp.title} at {exp.company} "
        if exp.description:
            profile_text += f"{exp.description} "
    
    return profile_text.strip()

def calculate_job_matches(profile_text, jobs, top_n=50):
    """Calculate relevance scores between a profile and jobs using TF-IDF and cosine similarity"""
    if not jobs or not profile_text:
        return []
    
    # Create a list of all texts (profile + job descriptions)
    all_texts = [profile_text] + [f"{job.title} {job.company} {job.location} {job.description}" for job in jobs]
    
    # Create TF-IDF matrix
    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(all_texts)
    
    # The first row is the profile, the rest are jobs
    profile_vector = tfidf_matrix[0:1]
    job_vectors = tfidf_matrix[1:]
    
    # Calculate cosine similarity between profile and each job
    similarities = cosine_similarity(profile_vector, job_vectors).flatten()
    
    # Create list of (job_id, similarity) tuples
    job_matches = [(jobs[i].id, float(similarities[i])) for i in range(len(jobs))]
    
    # Sort by similarity (descending) and take top N
    job_matches.sort(key=lambda x: x[1], reverse=True)
    return job_matches[:top_n]

async def match_jobs_for_user(user_id):
    """Match jobs for a specific user based on their profile"""
    try:
        # Create DB session
        db = SessionLocal()
        
        # Get user profile data
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile:
            print(f"No profile found for user {user_id}")
            db.close()
            return
        
        # Get skills and experiences
        skills = db.query(Skill).filter(Skill.profile_id == profile.id).all()
        experiences = db.query(Experience).filter(Experience.profile_id == profile.id).all()
        
        # Prepare profile text
        profile_text = prepare_profile_text(profile, skills, experiences)
        if not profile_text.strip():
            print(f"Empty profile text for user {user_id}, cannot match jobs")
            db.close()
            return
        
        # Get all jobs
        jobs = db.query(Job).all()
        if not jobs:
            print("No jobs found in database")
            db.close()
            return
        
        # Calculate job matches
        job_matches = calculate_job_matches(profile_text, jobs)
        
        # Update the database with match results
        for job_id, relevance_score in job_matches:
            # Check if match exists
            existing_match = db.query(UserJobMatch).filter(
                UserJobMatch.user_id == user_id,
                UserJobMatch.job_id == job_id
            ).first()
            
            if existing_match:
                # Update existing match
                existing_match.relevance_score = relevance_score
            else:
                # Create new match
                match = UserJobMatch(
                    user_id=user_id,
                    job_id=job_id,
                    relevance_score=relevance_score
                )
                db.add(match)
        
        db.commit()
        db.close()
        print(f"Job matching completed for user {user_id}")
        
    except Exception as e:
        print(f"Error during job matching: {str(e)}")
        if 'db' in locals():
            db.close()

async def match_jobs_for_all_users():
    """Match jobs for all users in the system"""
    try:
        # Create DB session
        db = SessionLocal()
        
        # Get all active users
        users = db.query(User).filter(User.is_active == True).all()
        db.close()
        
        # Match jobs for each user
        for user in users:
            await match_jobs_for_user(user.id)
            # Pause to avoid overwhelming the system
            await asyncio.sleep(1)
            
        print("Job matching completed for all users")
        
    except Exception as e:
        print(f"Error during job matching for all users: {str(e)}")
        if 'db' in locals():
            db.close()
