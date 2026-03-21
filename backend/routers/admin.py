from fastapi import APIRouter, Depends, HTTPException
from backend.dependencies import get_current_user
from backend.django_bridge import (
    get_all_locations_async, add_const_async, add_lb_async, add_booth_async,
    update_const_async, update_lb_async, update_booth_async,
    get_all_users_async, create_user_async, delete_user_async, update_user_async
)
from backend.schemas.admin import (
    ConstituencyCreate, LocalBodyCreate, BoothCreate,
    ConstituencyUpdate, LocalBodyUpdate, BoothUpdate,
    UserCreate, UserUpdate
)

router = APIRouter(prefix="/api/admin", tags=["Admin Management"])

@router.get("/locations")
async def admin_get_locations(user_info=Depends(get_current_user)):
    return await get_all_locations_async(user_info['username'])

@router.post("/add-const")
async def admin_add_const(data: ConstituencyCreate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'CONSTITUENCY_ADMIN', 'MANAGER', 'OPERATOR']
    if user_info['role'] not in allowed:
        raise HTTPException(403, "Access Denied: High-level privilege required")
    return await add_const_async(data.name)

@router.post("/add-lb")
async def admin_add_lb(data: LocalBodyCreate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'MANAGER', 'OPERATOR']
    if user_info['role'] not in allowed:
        raise HTTPException(403, "Access Denied: High-level privilege required")
    return await add_lb_async(data.const_id, data.name, data.type)

@router.post("/add-booth")
async def admin_add_booth(data: BoothCreate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'MANAGER', 'OPERATOR', 'ZONE_COMMANDER']
    if user_info['role'] not in allowed:
        raise HTTPException(403, "Access Denied: High-level privilege required")
    return await add_booth_async(data.const_id, data.lb_id, data.number, data.ps_name, data.ps_no)

@router.put("/update-const/{uid}")
async def admin_update_const(uid: int, data: ConstituencyUpdate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN']
    if user_info['role'] not in allowed: raise HTTPException(403)
    success, msg = await update_const_async(uid, data.name, data.code)
    return {"success": success, "message": msg}

@router.put("/update-lb/{uid}")
async def admin_update_lb(uid: int, data: LocalBodyUpdate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD']
    if user_info['role'] not in allowed: raise HTTPException(403)
    success, msg = await update_lb_async(uid, data.name, data.type, data.head_name, data.head_phone)
    return {"success": success, "message": msg}

@router.put("/update-booth/{uid}")
async def admin_update_booth(uid: int, data: BoothUpdate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER']
    if user_info['role'] not in allowed: raise HTTPException(403)
    success, msg = await update_booth_async(uid, data.number, data.ps_name, data.ps_no, data.head_name, data.head_phone)
    return {"success": success, "message": msg}

@router.get("/users")
async def admin_get_users(user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER']
    if user_info['role'] not in allowed: raise HTTPException(403)
    return await get_all_users_async()

@router.post("/create-user")
async def admin_create_user(data: UserCreate, user_info=Depends(get_current_user)):
    allowed_roles = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER']
    if user_info['role'] not in allowed_roles:
        raise HTTPException(403, "You do not have permission to create users")
    
    success, msg = await create_user_async(
        data.username, data.password, data.role, data.dict()
    )
    return {"success": success, "message": msg}

@router.delete("/delete-user/{uid}")
async def admin_delete_user(uid: int, user_info=Depends(get_current_user)):
    if user_info['role'] not in ['SUPERUSER', 'MANAGER']: raise HTTPException(403)
    success, msg = await delete_user_async(uid)
    return {"success": success, "message": msg}

@router.put("/update-user/{uid}")
async def admin_update_user(uid: int, data: UserUpdate, user_info=Depends(get_current_user)):
    allowed = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER']
    if user_info['role'] not in allowed: raise HTTPException(403)
    success, msg = await update_user_async(uid, data.dict(exclude_unset=True))
    return {"success": success, "message": msg}
