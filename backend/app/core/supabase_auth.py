from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import logging
import uuid # Import the uuid module

from app.db.supabase import supabase
from app.db.database import get_db, SessionLocal # Import SessionLocal
from app.db.models import User as UserModel, Profile as ProfileModel

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use HTTPBearer for token extraction - REMOVED as we will parse manually
# security = HTTPBearer(auto_error=False)

async def get_token_from_request(request: Request): # Removed credentials dependency
    """
    Extract token directly from request headers.
    """
    token = None

    # Try Authorization header first
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.replace('Bearer ', '')
        logger.info(f"Token extracted from Authorization header: {token[:10]}...")
        return token

    # Fallback to custom header
    custom_token = request.headers.get('X-Supabase-Auth')
    if custom_token:
        logger.info(f"Token extracted from X-Supabase-Auth header: {custom_token[:10]}...")
        return custom_token

    # No token found
    logger.warning("No authentication token found in request headers (Authorization or X-Supabase-Auth)")
    return None

async def get_current_user(request: Request, db: Session = Depends(get_db)):
    """
    Validate the token and return the current user from Supabase Auth
    """
    # Pass request directly to get_token_from_request
    token = await get_token_from_request(request)

    if not token:
        logger.warning("get_current_user: No token found by get_token_from_request")
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

        logger.info(f"Supabase user verified: {supabase_user.email} (ID: {supabase_user.id})")
        # Convert the string UUID from Supabase to a Python UUID object
        try:
            supabase_uuid = uuid.UUID(supabase_user.id)
        except ValueError:
            logger.error(f"Invalid UUID format received from Supabase: {supabase_user.id}")
            raise HTTPException(status_code=400, detail="Invalid user ID format")

        # Get or create user in our database based on Supabase user ID (using the UUID object)
        user = db.query(UserModel).filter(UserModel.supabase_id == supabase_uuid).first()

        if not user:
            logger.info(f"[AUTH_DEBUG] User {supabase_user.email} (UUID: {supabase_uuid}) not found in main DB session. Attempting creation in isolated session...")
            # Use a NEW, independent session to create the user to ensure commit isolation
            local_db = None # Initialize to None
            try:
                logger.info("[AUTH_DEBUG] Creating isolated DB session (SessionLocal())...")
                local_db = SessionLocal()
                logger.info("[AUTH_DEBUG] Isolated session created. Checking for existing user again...")
                # Double-check within the new session in case of race conditions (use UUID object)
                existing_user_check = local_db.query(UserModel).filter(UserModel.supabase_id == supabase_uuid).first()
                if existing_user_check:
                     logger.info(f"User {supabase_user.email} (UUID: {supabase_uuid}) was created by another request. Using existing.")
                     user = existing_user_check # Use the one found in the new session
                     # We have the user now, so we can skip the creation logic below
                     pass # User already found in the isolated check
                else:
                    logger.info(f"[AUTH_DEBUG] Creating new UserModel instance for {supabase_user.email}...")
                    # Create new user within the isolated session (use UUID object)
                    new_user = UserModel(
                        email=supabase_user.email,
                        supabase_id=supabase_uuid, # Store the UUID object
                        is_active=True
                    )
                    logger.info(f"[AUTH_DEBUG] Adding new user (UUID: {supabase_uuid}) to isolated session...")
                    local_db.add(new_user)
                    logger.info(f"[AUTH_DEBUG] Committing isolated session...")
                    local_db.commit()
                    logger.info(f"[AUTH_DEBUG] Commit successful. Refreshing new_user object...")
                    local_db.refresh(new_user)
                    logger.info(f"[AUTH_DEBUG] Committed new user via isolated session. Local ID: {new_user.id}, Supabase ID: {new_user.supabase_id}")

                    # Re-fetch to ensure it's available and assign to the 'user' variable for return (use UUID object)
                    logger.info(f"[AUTH_DEBUG] Re-fetching user {supabase_uuid} from isolated session to verify...")
                    user = local_db.query(UserModel).filter(UserModel.supabase_id == supabase_uuid).first()
                    if not user:
                         logger.error(f"[AUTH_DEBUG] !!! FAILED to re-fetch user from DB after isolated commit for Supabase ID: {supabase_uuid}")
                         raise HTTPException(status_code=500, detail="Failed to verify user creation in local DB")
                    logger.info(f"[AUTH_DEBUG] Successfully re-fetched user from DB after isolated commit. Local ID: {user.id}")

            except SQLAlchemyError as isolated_db_error:
                local_db.rollback()
                logger.error(f"Database error during isolated user creation: {str(isolated_db_error)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error during user creation: {str(isolated_db_error)}",
                )
            finally:
                if local_db: # Check if session was successfully created before closing
                    logger.info("[AUTH_DEBUG] Closing isolated DB session.")
                    local_db.close()
                else:
                    logger.warning("[AUTH_DEBUG] Isolated DB session was None, cannot close.")


            # If user creation failed above, user might still be None here, handle this?
            # For now, assume if we reach here, 'user' holds the valid user object (either found initially or created)

            # --- Remove the old profile creation and commit logic that used the main 'db' session ---
            # Create empty profile for the user, linking its ID to the user's supabase_id
            # --- End of removed logic ---

        else: # User already existed in the main DB session check
            logger.info(f"Found existing user in main DB session: {user.id} (Supabase ID: {user.supabase_id})")

        # If we reach here, 'user' should hold the valid user object
        if not user:
             # This should theoretically not happen if logic above is correct
             logger.error(f"User object is unexpectedly None after get/create logic for Supabase ID: {supabase_uuid}")
             raise HTTPException(status_code=500, detail="Failed to retrieve or create user record.")

        return user # Return the found or newly created user

    except SQLAlchemyError as db_error: # Catch errors from the initial user check using main 'db'
        # db.rollback() # Rollback might be handled by FastAPI dependency management
        logger.error(f"Database error during initial user check: {str(db_error)}")
        raise HTTPException( # Correct indentation for raise
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
      logger.warning(f"User {current_user.id} is not active") # Corrected indentation
      raise HTTPException(
          status_code=status.HTTP_403_FORBIDDEN,
          detail="User account is inactive",
      )
    return current_user
# Removed duplicated lines below
