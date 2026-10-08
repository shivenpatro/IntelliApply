import asyncio

from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import settings
from app.db.database import SessionLocal
from app.db.models import Experience, Job, Profile, Skill, User, UserJobMatch
from app.services.vectorizer import for_corpus


def invalidate_recommendations(db, user_id):
    db.query(UserJobMatch).filter_by(user_id=user_id).update(
        {"is_current": False}, synchronize_session=False
    )


def prepare_profile_text(profile, skills, experiences):
    return " ".join(
        [
            " ".join([profile.desired_roles or ""] * 3),
            profile.desired_locations or "",
            " ".join([" ".join(s.name for s in skills)] * 3),
            " ".join(
                f'{e.title} {e.company} {e.description or ""}' for e in experiences
            ),
        ]
    )


def calculate_job_matches(profile_text, jobs, top_n=50):
    if not jobs or not profile_text.strip():
        return []
    corpus = [
        f'{j.title or ""} {j.company or ""} {j.location or ""} {j.description or ""}'
        for j in jobs
    ]
    vector = for_corpus(corpus)
    if vector is None:
        return []
    scores = cosine_similarity(
        vector.transform([profile_text]), vector.transform(corpus)
    ).flatten()
    return sorted(
        [(j.id, float(max(0, min(1, s)))) for j, s in zip(jobs, scores)],
        key=lambda pair: pair[1],
        reverse=True,
    )[:top_n]


def _match(user_id):
    with SessionLocal() as db:
        profile = db.query(Profile).filter_by(id=user_id).with_for_update().first()
        if not profile:
            raise ValueError("profile missing")
        skills = db.query(Skill).filter_by(profile_id=user_id).all()
        experiences = db.query(Experience).filter_by(profile_id=user_id).all()
        jobs = (
            db.query(Job)
            .order_by(Job.scraped_at.desc())
            .limit(settings.MATCHER_MAX_JOBS)
            .all()
        )
        text = prepare_profile_text(profile, skills, experiences)
        pairs = calculate_job_matches(text, jobs)
        roles = [
            r.strip().lower()
            for r in (profile.desired_roles or "").split(",")
            if r.strip()
        ]
        by_id = {j.id: j for j in jobs}
        # Recommendation membership is independent of saved application decisions.
        db.query(UserJobMatch).filter_by(user_id=user_id).update(
            {"is_current": False}, synchronize_session=False
        )
        count = 0
        for job_id, score in pairs:
            if any(role in by_id[job_id].title.lower() for role in roles):
                score = min(1, score + 0.1)
            if score <= 0.01:
                continue
            match = (
                db.query(UserJobMatch).filter_by(user_id=user_id, job_id=job_id).first()
            )
            if not match:
                match = UserJobMatch(user_id=user_id, job_id=job_id, status="pending")
                db.add(match)
            match.relevance_score = score
            match.is_current = True
            count += 1
        db.commit()
        return count


async def match_jobs_for_user(user_id, **kwargs):
    count = await asyncio.to_thread(_match, user_id)
    return "completed", f"Matching completed. {count} current recommendations."


def _active_user_ids():
    with SessionLocal() as db:
        ids = [
            u.supabase_id
            for u in db.query(User).filter_by(is_active=True).all()
            if u.supabase_id
        ]
    return ids


async def match_jobs_for_all_users():
    for user_id in await asyncio.to_thread(_active_user_ids):
        await match_jobs_for_user(user_id)
