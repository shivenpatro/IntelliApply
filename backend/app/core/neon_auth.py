"""
Authentication module using Neon Auth (Better Auth) JWTs.

Neon Auth handles user sign-up, sign-in, and session management.
This module verifies JWTs issued by Neon Auth using the JWKS endpoint
and manages the local user/profile records in our PostgreSQL database.
"""

import logging
import uuid

import jwt
from fastapi import Depends, HTTPException, Request, status
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError
from pydantic import EmailStr, TypeAdapter
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.db.models import Profile as ProfileModel
from app.db.models import User as UserModel

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Neon Auth Configuration ---
NEON_AUTH_URL = settings.NEON_AUTH_URL
JWKS_URL = f"{NEON_AUTH_URL}/.well-known/jwks.json"

# PyJWKClient handles fetching and caching JWKS keys automatically
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(JWKS_URL, cache_keys=True, timeout=5)
    return _jwks_client


def _verify_neon_auth_token(token: str) -> dict:
    """
    Verify a JWT issued by Neon Auth using the JWKS endpoint.
    Returns the decoded token payload (claims).
    """
    client = _get_jwks_client()
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["EdDSA", "RS256"],
            issuer=settings.NEON_AUTH_ISSUER or NEON_AUTH_URL,
            audience=settings.NEON_AUTH_AUDIENCE,
            options={
                "require": ["exp", "sub", "iss"],
                "verify_aud": bool(settings.NEON_AUTH_AUDIENCE),
            },
        )
        return payload
    except PyJWKClientConnectionError:
        raise HTTPException(
            503, "Authentication service temporarily unavailable. Please retry."
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_token_from_request(request: Request) -> str | None:
    """
    Extract the Bearer token from the Authorization header.
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]  # Strip "Bearer "
        return token

    return None


def get_current_user(request: Request, db: Session = Depends(get_db)):
    """
    Validate the Neon Auth JWT and return the current user from the database.
    If the user doesn't exist locally, create a record + profile.
    """
    token = get_token_from_request(request)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication token provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify with Neon Auth JWKS
    payload = _verify_neon_auth_token(token)

    # Extract user info from JWT claims
    # Better Auth / Neon Auth puts user ID in "sub" claim
    neon_user_id_str = payload.get("sub")
    neon_user_email = payload.get("email", "")

    if not neon_user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Convert to UUID
    try:
        neon_user_uuid = uuid.UUID(neon_user_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    try:
        neon_user_email = str(TypeAdapter(EmailStr).validate_python(neon_user_email))
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid identity claims.")
    # Transaction lock serializes first-use creation across all workers.
    try:
        db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": "identity:" + str(neon_user_uuid)},
        )
        user = (
            db.query(UserModel).filter(UserModel.supabase_id == neon_user_uuid).first()
        )
        if not user:
            user = UserModel(
                email=neon_user_email, supabase_id=neon_user_uuid, is_active=True
            )
            db.add(user)
            db.flush()
        if not db.query(ProfileModel).filter_by(id=neon_user_uuid).first():
            db.add(ProfileModel(id=neon_user_uuid))
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Identity could not be linked. Please contact support.",
        )
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=503, detail="Account service temporarily unavailable."
        )


def get_current_active_user(current_user: UserModel = Depends(get_current_user)):
    """
    Check if the current user is active.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )
    return current_user
