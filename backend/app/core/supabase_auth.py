"""
Authentication module using Neon Auth (Better Auth) JWTs.

Neon Auth handles user sign-up, sign-in, and session management.
This module verifies JWTs issued by Neon Auth using the JWKS endpoint
and manages the local user/profile records in our PostgreSQL database.
"""

import os
import logging
import uuid

import httpx
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import get_db, SessionLocal
from app.db.models import User as UserModel, Profile as ProfileModel

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Neon Auth Configuration ---
NEON_AUTH_URL = os.getenv(
    "NEON_AUTH_URL",
    "https://ep-green-glade-ajuf7urf.neonauth.c-3.us-east-2.aws.neon.tech/neondb/auth"
)
JWKS_URL = f"{NEON_AUTH_URL}/.well-known/jwks.json"

# PyJWKClient handles fetching and caching JWKS keys automatically
_jwks_client: PyJWKClient | None = None

def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(JWKS_URL, cache_keys=True)
    return _jwks_client

async def _verify_neon_auth_token(token: str) -> dict:
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
            options={
                "verify_aud": False,  # Neon Auth may not set audience
                "verify_iss": False,  # Flexible issuer checking
            },
        )
        logger.info(f"[NeonAuth] Token verified for sub={payload.get('sub')}")
        return payload
    except Exception as e:
        logger.warning(f"[NeonAuth] Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_token_from_request(request: Request) -> str | None:
    """
    Extract the Bearer token from the Authorization header.
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]  # Strip "Bearer "
        logger.debug(f"[NeonAuth] Token extracted: {token[:10]}...")
        return token

    logger.warning("[NeonAuth] No Bearer token found in Authorization header.")
    return None


async def get_current_user(request: Request, db: Session = Depends(get_db)):
    """
    Validate the Neon Auth JWT and return the current user from the database.
    If the user doesn't exist locally, create a record + profile.
    """
    token = await get_token_from_request(request)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication token provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify with Neon Auth JWKS
    payload = await _verify_neon_auth_token(token)

    # Extract user info from JWT claims
    # Better Auth / Neon Auth puts user ID in "sub" claim
    neon_user_id_str = payload.get("sub")
    neon_user_email = payload.get("email", "")

    if not neon_user_id_str:
        logger.error("[NeonAuth] Token payload missing 'sub' claim.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Convert to UUID
    try:
        neon_user_uuid = uuid.UUID(neon_user_id_str)
    except ValueError:
        logger.error(f"[NeonAuth] Invalid UUID in 'sub' claim: {neon_user_id_str}")
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    logger.info(f"[NeonAuth] Verified user: {neon_user_email} (ID: {neon_user_uuid})")

    # Look up user in our local database
    user = db.query(UserModel).filter(UserModel.supabase_id == neon_user_uuid).first()

    if not user:
        logger.info(f"[NeonAuth] User {neon_user_email} not found locally. Creating...")
        local_db = None
        try:
            local_db = SessionLocal()

            # Double-check (race condition guard)
            existing = local_db.query(UserModel).filter(
                UserModel.supabase_id == neon_user_uuid
            ).first()
            if existing:
                user = existing
                logger.info(f"[NeonAuth] User was created by concurrent request.")
            else:
                # Create user record
                new_user = UserModel(
                    email=neon_user_email,
                    supabase_id=neon_user_uuid,
                    is_active=True,
                )
                local_db.add(new_user)
                local_db.flush()

                # Create empty profile linked to the same UUID
                new_profile = ProfileModel(id=neon_user_uuid)
                local_db.add(new_profile)

                local_db.commit()
                local_db.refresh(new_user)
                user = new_user
                logger.info(
                    f"[NeonAuth] Created user + profile: local_id={user.id}, "
                    f"neon_id={neon_user_uuid}"
                )

        except SQLAlchemyError as e:
            if local_db:
                local_db.rollback()
            logger.error(f"[NeonAuth] DB error creating user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during user creation: {e}",
            )
        finally:
            if local_db:
                local_db.close()
    else:
        logger.info(f"[NeonAuth] Found existing user: local_id={user.id}")

    if not user:
        logger.error(f"[NeonAuth] User is unexpectedly None after get/create for {neon_user_uuid}")
        raise HTTPException(status_code=500, detail="Failed to retrieve or create user.")

    return user


async def get_current_active_user(current_user: UserModel = Depends(get_current_user)):
    """
    Check if the current user is active.
    """
    if not current_user.is_active:
        logger.warning(f"[NeonAuth] User {current_user.id} is inactive.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )
    return current_user
