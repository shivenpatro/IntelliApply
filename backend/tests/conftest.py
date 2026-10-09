import atexit
import os
import sys
import time
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlparse
from uuid import uuid4

import jwt
import psycopg2
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from psycopg2 import sql

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
admin_url = os.getenv(
    "TEST_DATABASE_ADMIN_URL", "postgresql://postgres@127.0.0.1:5432/postgres"
)
assert urlparse(admin_url).hostname in (
    "localhost",
    "127.0.0.1",
    "postgres",
), "Tests must use an isolated local PostgreSQL service."
name = "intelliapply_test_" + uuid4().hex[:12]
admin = psycopg2.connect(admin_url)
admin.autocommit = True
with admin.cursor() as cursor:
    cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))


def cleanup():
    with admin.cursor() as cursor:
        cursor.execute(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=%s",
            (name,),
        )
        cursor.execute(
            sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(name))
        )
    admin.close()


atexit.register(cleanup)
os.environ["DATABASE_URL"] = admin_url.rsplit("/", 1)[0] + "/" + name
os.environ["SCHEDULER_ENABLED"] = "false"
os.environ["ENVIRONMENT"] = "test"
os.environ["NEON_AUTH_AUDIENCE"] = "intelliapply-test"
from alembic import command
from alembic.config import Config

config = Config(str(BACKEND / "alembic.ini"))
config.set_main_option("script_location", str(BACKEND / "migrations"))
command.upgrade(config, "head")
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core import neon_auth
from app.core.config import settings
from app.db.database import engine
from app.main import app

assert engine.url.database == name


@pytest.fixture(autouse=True)
def reset_database():
    with engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE tasks,service_runs,user_job_matches,skills,experiences,profiles,jobs,users RESTART IDENTITY CASCADE"
            )
        )
    yield


@pytest.fixture
def client():
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


@pytest.fixture
def identity(monkeypatch):
    key = Ed25519PrivateKey.generate()
    monkeypatch.setattr(
        neon_auth,
        "_jwks_client",
        SimpleNamespace(
            get_signing_key_from_jwt=lambda token: SimpleNamespace(key=key.public_key())
        ),
    )

    def make(uid=None, **extra):
        uid = uid or uuid4()
        payload = {
            "sub": str(uid),
            "email": str(uid) + "@example.com",
            "exp": int(time.time()) + 3600,
            "iss": settings.NEON_AUTH_URL,
            "aud": settings.NEON_AUTH_AUDIENCE,
        }
        payload.update(extra)
        if payload["exp"] is None:
            payload.pop("exp")
        return uid, {
            "Authorization": "Bearer " + jwt.encode(payload, key, algorithm="EdDSA")
        }

    return make
