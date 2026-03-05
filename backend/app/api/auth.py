"""
Auth API router.

Registration and login are handled directly by Neon Auth (Better Auth).
The frontend speaks to Neon Auth for sign-up/sign-in and receives JWTs.
This backend only needs to verify those JWTs on protected routes.

We keep the /auth/me endpoint so the frontend can fetch the current user info.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.supabase_auth import get_current_active_user
from app.db.models import User as DBUser
from app.core.schemas import User as PydanticUser
from app.db.database import get_db

router = APIRouter()


@router.get("/me", response_model=PydanticUser)
async def read_users_me(current_user: DBUser = Depends(get_current_active_user)):
    """
    Get the currently authenticated user's info.
    JWT verification is handled by the get_current_active_user dependency.
    """
    return current_user
