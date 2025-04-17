from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import logging

from app.db.supabase import supabase
from app.db.database import get_db
from app.db.models import User as UserModel, Profile as ProfileModel

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use HTTPBearer for token extraction
security = HTTPBearer(auto_error=False)

async def get_token_from_request(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Extract token from request headers, supporting both Bearer auth and custom header
    """
    token = None

    # Try to get token from HTTPBearer credentials
    if credentials:
        token = credentials.credentials
        logger.info(f"Token extracted from Bearer auth: {token[:10]}...")
        return token

    # Fallback to Authorization header directly
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.replace('Bearer ', '')
        logger.info(f"Token extracted from Authorization header: {token[:10]}...")
        return token

    # Try custom header as last resort
    custom_token = request.headers.get('X-Supabase-Auth')
    if custom_token:
        logger.info(f"Token extracted from X-Supabase-Auth header: {custom_token[:10]}...")
        return custom_token

    # No token found
    logger.warning("No authentication token found in request")
    return None

async def get_current_user(request: Request, db: Session = Depends(get_db)):
    """
    Validate the token and return the current user from Supabase Auth
    """
    token = await get_token_from_request(request)

    if not token:
        logger.warning("No token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication token provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Verify the access token with Supabase
        logger.info(f"Verifying token with Supabase: {token[:10]}...")
        response = supabase.auth.get_user(token)
        supabase_user = response.user

        if not supabase_user:
            logger.warning("Token verification succeeded but no user returned")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials - no user found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        logger.info(f"Supabase user verified: {supabase_user.email}")

        # Get or create user in our database based on Supabase user ID
        try:
            user = db.query(UserModel).filter(UserModel.supabase_id == supabase_user.id).first()

            if not user:
                logger.info(f"Creating new user in local DB for {supabase_user.email}")
                # Create new user
                user = UserModel(
                    email=supabase_user.email,
                    supabase_id=supabase_user.id,
                    is_active=True
                )
                db.add(user)
                db.flush()  # Get the ID without committing

                # Create empty profile for the user
                profile = ProfileModel(user_id=user.id)
                db.add(profile)

                # Now commit both together
                db.commit()
                db.refresh(user)
                logger.info(f"Created new user with ID: {user.id}")
            else:
                logger.info(f"Found existing user in DB: {user.id}")

            return user

        except SQLAlchemyError as db_error:
            db.rollback()
            logger.error(f"Database error: {str(db_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(db_error)}",
            )

    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_active_user(current_user: UserModel = Depends(get_current_user)):
    """
    Check if the current user is active
    """
    if not current_user.is_active:
        logger.warning(f"User {current_user.id} is not active")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    return current_user
