from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm # For login form data
from sqlalchemy.orm import Session
import uuid # Ensure uuid is imported

from app.core.supabase_auth import get_current_active_user
from app.db.models import User as DBUser, Profile as ProfileModel # Import ProfileModel
from app.core.schemas import User as PydanticUser, UserCreate, Token # PydanticUser for response
from app.db.supabase import supabase # Supabase client
from app.db.database import get_db # To get DB session for local user table

router = APIRouter()

@router.post("/register", response_model=PydanticUser, status_code=status.HTTP_201_CREATED)
async def register_user(user_create: UserCreate, db: Session = Depends(get_db)):
    try:
        # Create user in Supabase
        supabase_response = supabase.auth.sign_up({
            "email": user_create.email,
            "password": user_create.password,
        })
        
        supabase_user = supabase_response.user
        # supabase_session = supabase_response.session # Contains access_token, refresh_token etc.

        if not supabase_user:
            # This case might indicate an issue if sign_up doesn't error but returns no user
            # or if email confirmation is required and user is not immediately active.
            # Supabase might return an error directly if user exists or password is weak.
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not create user in Supabase or email confirmation pending")

        # Check if user already exists in our local DB (by Supabase ID)
        # Supabase ID is the primary key for linking.
        db_user_local_check = db.query(DBUser).filter(DBUser.supabase_id == supabase_user.id).first()
        if db_user_local_check:
            # This shouldn't happen if Supabase sign_up is the first step and unique,
            # but good for robustness or if there's a manual sync process.
            # Or if Supabase user exists but not locally (e.g. migration)
            # For now, assume if Supabase created, we create locally or update.
            # For simplicity, we'll assume this means the local user is already synced.
            # A more robust flow might update local fields if necessary.
            return db_user_local_check 

        # Create user in local database
        new_local_user = DBUser(
            supabase_id=str(supabase_user.id), # Ensure it's string if UUID
            email=supabase_user.email,
            # is_active might depend on email verification status from Supabase
            # Supabase user object has an 'email_confirmed_at' field.
            # For now, let's assume active if Supabase created them.
            is_active=True 
        )
        db.add(new_local_user)
        db.commit()
        db.refresh(new_local_user)

        # Now, create an associated profile
        print(f"[AUTH_REGISTER_PROFILE] Attempting profile creation for Supabase ID: {supabase_user.id}")
        try:
            profile_id_uuid = uuid.UUID(str(supabase_user.id)) # Ensure it's a UUID object
            print(f"[AUTH_REGISTER_PROFILE] Converted Supabase ID to UUID: {profile_id_uuid}")
        except ValueError as ve:
            print(f"[AUTH_REGISTER_PROFILE] ERROR: Could not convert Supabase ID '{supabase_user.id}' to UUID: {ve}")
            # Decide how to handle this - for now, we'll let it proceed and likely fail later or skip profile creation
            # Or raise an HTTPException here
            raise HTTPException(status_code=500, detail=f"Invalid Supabase user ID format: {supabase_user.id}")

        print(f"[AUTH_REGISTER_PROFILE] Checking for existing profile with ID: {profile_id_uuid}")
        existing_profile = db.query(ProfileModel).filter(ProfileModel.id == profile_id_uuid).first()
        
        if not existing_profile:
            print(f"[AUTH_REGISTER_PROFILE] No existing profile found. Creating new profile for {profile_id_uuid}.")
            new_profile = ProfileModel(
                id=profile_id_uuid
                # Add any other default fields for ProfileModel if necessary
            )
            db.add(new_profile)
            try:
                db.commit()
                print(f"[AUTH_REGISTER_PROFILE] Successfully committed new profile for user {new_local_user.email} with profile_id {profile_id_uuid}")
                # db.refresh(new_profile) # Optional
            except Exception as commit_exc:
                print(f"[AUTH_REGISTER_PROFILE] ERROR: Failed to commit new profile: {commit_exc}")
                db.rollback() # Rollback on error
                # Decide if this should be a critical error for the registration
        else:
            print(f"[AUTH_REGISTER_PROFILE] Profile already existed for user {new_local_user.email} with profile_id {profile_id_uuid}. Profile local ID: {existing_profile.id if hasattr(existing_profile, 'id') else 'N/A'}")

        # Convert DBUser to PydanticUser for the response
        # Note: The PydanticUser schema might need adjustment if its fields
        # don't perfectly match DBUser or what we want to return.
        # Specifically, UserInDB (base for PydanticUser) expects 'id' (int), 'created_at'.
        # Our DBUser has 'id' (int, auto-incrementing local PK) and 'supabase_id' (UUID/str).
        # We should return data consistent with the PydanticUser model.
        # For now, let's construct it carefully.
        
        # The PydanticUser (based on UserInDB) expects an int 'id'.
        # We should return the local DB user.
        return new_local_user

    except Exception as e:
        # Catching Supabase specific errors or general exceptions
        # Supabase client might raise specific exceptions for user already exists, weak password etc.
        # e.g. if e.status == 400 and "User already registered" in e.message:
        # For now, a generic error.
        error_detail = f"Error during registration: {str(e)}"
        # Check for common Supabase errors if possible from the exception object `e`
        # For example, the Supabase Python client might raise `gotrue.errors.AuthApiError`
        # We might need to inspect `e` to provide more specific HTTP status codes.
        # If it's a known "user already exists" type error from Supabase, 409 Conflict might be better.
        if "User already registered" in str(e): # Basic check
             raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists.")
        if "Password should be at least 6 characters" in str(e): # Supabase default is 6
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is too weak.")

        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_detail)


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        # Supabase uses email for username in sign_in_with_password
        response = supabase.auth.sign_in_with_password({
            "email": form_data.username, # form_data.username is the email
            "password": form_data.password
        })
        
        if not response.session or not response.session.access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Optionally, update last_login for the user in your local DB
        # user_supabase_id = response.user.id
        # local_user = db.query(DBUser).filter(DBUser.supabase_id == str(user_supabase_id)).first()
        # if local_user:
        #     local_user.last_login_at = datetime.utcnow()
        #     db.commit()

        return Token(access_token=response.session.access_token, token_type="bearer")

    except Exception as e: # Catch Supabase AuthApiError or other issues
        # Log the actual error e for debugging
        print(f"Login error: {e}") 
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.get("/me", response_model=PydanticUser) # Changed to PydanticUser
async def read_users_me(current_user: DBUser = Depends(get_current_active_user)): # current_user is DBUser
    # The PydanticUser model expects fields like id (int), created_at.
    # Ensure current_user (DBUser instance) can be serialized by PydanticUser.
    # If get_current_active_user returns a DBUser model instance that has these fields,
    # FastAPI will handle the conversion.
    return current_user
