from fastapi import APIRouter, Depends
from app.core.supabase_auth import get_current_active_user
from app.db.models import User as UserModel
from app.core.schemas import User

router = APIRouter()

@router.get("/me", response_model=User)
async def read_users_me(current_user: UserModel = Depends(get_current_active_user)):
    return current_user
