from fastapi import APIRouter, Depends, HTTPException
from backend.dependencies import get_current_user
from backend.django_bridge import get_stats_async, get_strategic_analytics_async

router = APIRouter(prefix="/api", tags=["Analytics & War Room"])

@router.get("/stats")
@router.get("/stats/summary")
async def get_stats(constituency: str = None, lb: str = None, booth: str = None, user_info=Depends(get_current_user)):
    c_id = int(constituency) if constituency and str(constituency).isdigit() else None
    l_id = int(lb) if lb and str(lb).isdigit() else None
    b_id = int(booth) if booth and str(booth).isdigit() else None
    data = await get_stats_async(user_info['username'], c_id, l_id, b_id)
    if isinstance(data, dict):
        data["total_voters"] = data.get("total", 0)
    return data

@router.get("/analytics/strategic")
async def get_strategic_analytics_api(constituency_id: str = None, user_info=Depends(get_current_user)):
    c_id = int(constituency_id) if constituency_id and str(constituency_id).isdigit() else None
    return await get_strategic_analytics_async(user_info['username'], c_id)

@router.get("/war-room/stats")
async def get_war_stats(
    constituency_id: str = None, lb: str = None, booth: str = None,
    perspective: str = 'UDF',
    user_info=Depends(get_current_user)
):
    c_id = int(constituency_id) if constituency_id and str(constituency_id).isdigit() else None
    l_id = int(lb) if lb and str(lb).isdigit() else None
    b_id = int(booth) if booth and str(booth).isdigit() else None
    
    # Inline sync_to_async for war stats to preserve session context easily
    from asgiref.sync import sync_to_async
    from core.db_bridge import get_war_room_tactical_stats
    from django.contrib.auth.models import User
    
    def sync_war_wrapper():
        user = User.objects.get(username=user_info['username'])
        return get_war_room_tactical_stats(user.profile, c_id, l_id, b_id, perspective)
        
    return await sync_to_async(sync_war_wrapper, thread_sensitive=True)()
