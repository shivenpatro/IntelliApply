import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import asyncio
from sqlalchemy.orm import Session
import logging 
from typing import Dict, Optional, Any 

from app.db.database import SessionLocal
from app.db.models import User, Profile, Skill, Experience, Job, UserJobMatch
from app.services.vectorizer import get_global_vectorizer # Import the global vectorizer

logger = logging.getLogger(__name__) 

def prepare_profile_text(profile, skills, experiences):
    profile_text = ""
    if profile.desired_roles:
        repeated_roles = (f"{profile.desired_roles} ") * 3 
        profile_text += f"Key Roles: {repeated_roles} "
    if profile.desired_locations: 
        profile_text += f"Desired locations: {profile.desired_locations} "
    if skills:
        skill_text = " ".join([skill.name for skill in skills])
        repeated_skills = (f"{skill_text} ") * 3 
        profile_text += f"Key Skills: {repeated_skills} "
    for exp in experiences:
        profile_text += f"Experience: {exp.title} at {exp.company} "
        if exp.description:
            profile_text += f"{exp.description} "
    return profile_text.strip()

def calculate_job_matches(profile_text: str, jobs: list[Job], top_n=50):
    if not jobs or not profile_text:
        return []
    
    vectorizer = get_global_vectorizer()
    if not hasattr(vectorizer, 'vocabulary_') or not vectorizer.vocabulary_:
        logger.error("Global TF-IDF vectorizer is not fitted. Cannot calculate job matches. Please ensure it's fitted on startup or via admin action.")
        return []

    job_texts = [f"{job.title or ''} {job.company or ''} {job.location or ''} {job.description or ''}" for job in jobs]
    
    try:
        # Transform profile and job texts using the globally fitted vectorizer
        profile_vector = vectorizer.transform([profile_text])
        job_vectors = vectorizer.transform(job_texts)
    except Exception as e:
        logger.error(f"Error transforming texts with global vectorizer: {e}", exc_info=True)
        # This might happen if the vectorizer was loaded but is incompatible, or texts are problematic
        # Fallback or re-fitting might be needed in a more robust system.
        return []

    similarities = cosine_similarity(profile_vector, job_vectors).flatten()
    
    job_matches = []
    for i in range(len(jobs)):
        # Ensure relevance_score is a standard Python float
        score = float(similarities[i]) if similarities[i] is not None else 0.0
        job_matches.append((jobs[i].id, score))
        
    job_matches.sort(key=lambda x: x[1], reverse=True)
    return job_matches[:top_n]

async def match_jobs_for_user(user_id: str, **kwargs: Any): 
    task_id: Optional[str] = kwargs.get("task_id")
    task_statuses_ref: Optional[Dict[str, Dict[str, str]]] = kwargs.get("task_statuses_ref")

    def _update_status(status_message: str, current_status_verb: str = "matching"):
        if task_id and task_statuses_ref is not None:
            task_statuses_ref[task_id] = {"status": current_status_verb, "message": status_message}
            logger.info(f"Task ID {task_id}, User {user_id}: Status updated - {status_message}")

    db: Optional[Session] = None
    try:
        _update_status("Matching process started after delay.")
        await asyncio.sleep(3) 
        logger.info(f"User {user_id} - Starting match_jobs_for_user after delay (Task ID: {task_id}).")

        db = SessionLocal()
        _update_status("Fetching profile data.")
        profile = db.query(Profile).filter(Profile.id == user_id).first()
        if not profile:
            logger.warning(f"User {user_id} - No profile found.")
            _update_status("No profile found.", current_status_verb="failed")
            return
        
        skills = db.query(Skill).filter(Skill.profile_id == profile.id).all()
        experiences = db.query(Experience).filter(Experience.profile_id == profile.id).all()
        
        profile_text = prepare_profile_text(profile, skills, experiences)
        logger.info(f"User {user_id} - Profile text (first 300 chars): {profile_text[:300]}")
        if not profile_text.strip():
            logger.warning(f"User {user_id} - Empty profile text, cannot match jobs.")
            _update_status("Profile text is empty.", current_status_verb="failed")
            return
        
        _update_status("Fetching jobs from database.")
        jobs = db.query(Job).order_by(Job.scraped_at.desc()).limit(500).all() # Consider if 500 is too many for every run
        logger.info(f"User {user_id} - Found {len(jobs)} jobs in DB to match against.")
        if not jobs:
            logger.warning(f"User {user_id} - No jobs found in database for matching.")
            _update_status("No jobs in DB to match against.", current_status_verb="completed") 
            return 
        
        _update_status("Calculating TF-IDF and cosine similarities using global vectorizer.")
        raw_job_matches = calculate_job_matches(profile_text, jobs)
        if not raw_job_matches and jobs: # If vectorizer failed or returned empty
             _update_status("Failed to calculate similarities with global vectorizer.", current_status_verb="failed")
             return

        logger.info(f"User {user_id} - Calculated {len(raw_job_matches)} raw matches (before boost/filter). Top 5: {raw_job_matches[:5]}")
        
        job_matches_with_boost = []
        if profile.desired_roles:
            _update_status("Applying boost for desired roles.")
            desired_roles_keywords = [role.strip().lower() for role in profile.desired_roles.split(',')]
            for job_id_val, score in raw_job_matches:
                job_for_boost_check = next((job for job in jobs if job.id == job_id_val), None)
                if job_for_boost_check and job_for_boost_check.title:
                    job_title_lower = job_for_boost_check.title.lower()
                    for role_keyword in desired_roles_keywords:
                        if role_keyword in job_title_lower:
                            score += 0.1 
                            score = min(score, 1.0) 
                            break 
                job_matches_with_boost.append((job_id_val, score))
            job_matches_with_boost.sort(key=lambda x: x[1], reverse=True)
            job_matches_to_save = job_matches_with_boost
        else:
            job_matches_to_save = raw_job_matches

        _update_status("Saving relevant matches to database.")
        saved_matches_count = 0
        for job_id_val, relevance_score in job_matches_to_save:
            if relevance_score <= 0.01: 
                continue
            existing_match = db.query(UserJobMatch).filter(
                UserJobMatch.user_id == user_id,
                UserJobMatch.job_id == job_id_val
            ).first()
            if existing_match:
                existing_match.relevance_score = relevance_score
            else:
                match = UserJobMatch(
                    user_id=user_id, job_id=job_id_val,
                    relevance_score=relevance_score, status='pending'
                )
                db.add(match)
            saved_matches_count += 1
        
        if saved_matches_count > 0:
            db.commit()
            logger.info(f"User {user_id} - Saved/updated {saved_matches_count} job matches to UserJobMatch table.")
            _update_status(f"Matching completed. {saved_matches_count} matches found/updated.", current_status_verb="completed")
        else:
            logger.info(f"User {user_id} - No relevant job matches (score > 0.01) found to save.")
            _update_status("Matching completed. No new relevant matches found.", current_status_verb="completed")
        
        logger.info(f"Job matching completed for user {user_id} (Task ID: {task_id})")
        
    except Exception as e:
        logger.error(f"Error during job matching for user {user_id} (Task ID: {task_id}): {str(e)}", exc_info=True)
        if task_id and task_statuses_ref is not None:
             _update_status(f"Matching failed: {str(e)}", current_status_verb="failed")
    finally:
        if db: db.close()

async def match_jobs_for_all_users():
    db: Optional[Session] = None
    try:
        db = SessionLocal()
        users = db.query(User).filter(User.is_active == True).all()
        
        for user in users:
            if user.supabase_id: 
                logger.info(f"Scheduler: Triggering matching for user with supabase_id: {user.supabase_id}")
                await match_jobs_for_user(user_id=user.supabase_id, task_id=None, task_statuses_ref=None) 
                await asyncio.sleep(1)
            else:
                logger.warning(f"Scheduler: Skipping user with local id {user.id} as they don't have a supabase_id.")
            
        logger.info("Job matching completed for all users by scheduler.")
        
    except Exception as e:
        logger.error(f"Error during scheduled job matching for all users: {str(e)}", exc_info=True)
    finally:
        if db: db.close()
