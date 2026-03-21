from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
import logging
from backend.dependencies import create_access_token, get_current_user
from backend.django_bridge import authenticate_async, change_password_async
from backend.schemas.auth import PasswordChange, TokenResponse

router = APIRouter(prefix="/api", tags=["Auth"])
logger = logging.getLogger("ElectionEngine")

@router.post("/token", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user_info = await authenticate_async(username=form_data.username, password=form_data.password)
    
    if not user_info:
        logger.warning(f"Failed login attempt for: {form_data.username}")
        raise HTTPException(401, detail="Invalid credentials. If you are admin, ensure the latest build is live.")
    
    access_token = create_access_token(data={"sub": user_info['username']})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": user_info['role'], 
        "username": user_info['username'],
        "assignments": user_info['assignments'],
        "can_download": user_info['can_download'],
        "can_upload": user_info['can_upload'],
        "can_verify": user_info['can_verify'],
        "can_edit_voters": user_info['can_edit_voters'],
        "can_send_broadcasts": user_info['can_send_broadcasts'],
        "can_manage_system": user_info['can_manage_system']
    }

@router.post("/user/change-password")
async def change_user_pass(data: PasswordChange, user_info=Depends(get_current_user)):
    success, msg = await change_password_async(user_info['username'], data.old_password, data.new_password)
    if not success:
        raise HTTPException(400, msg)
    return {"success": True, "message": msg}

@router.get("/user/me")
async def get_my_profile(user_info=Depends(get_current_user)):
    return user_info
