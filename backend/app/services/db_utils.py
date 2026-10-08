import asyncio
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.dialects.postgresql import insert

from app.db.database import SessionLocal
from app.db.models import Job


def canonical_url(value):
    parsed = urlparse(value or "")
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return None
    params = {
        k: v
        for k, v in parse_qs(parsed.query).items()
        if not k.lower().startswith("utm_")
        and k.lower() not in ("gclid", "fbclid", "mc_cid", "mc_eid", "_ga")
    }
    return urlunparse(parsed._replace(query=urlencode(params, doseq=True), fragment=""))


def _save(jobs):
    with SessionLocal() as db:
        for item in jobs:
            value = dict(item)
            value["url"] = canonical_url(value.get("url"))
            value["scraped_at"] = datetime.now(timezone.utc)
            if not value["url"]:
                continue
            statement = (
                insert(Job)
                .values(**value)
                .on_conflict_do_update(
                    index_elements=[Job.url],
                    set_={
                        k: v
                        for k, v in value.items()
                        if k not in ("url", "posted_date")
                    },
                )
            )
            db.execute(statement)
        db.commit()


async def save_jobs_to_db(jobs, db=None):
    await asyncio.to_thread(_save, jobs)
