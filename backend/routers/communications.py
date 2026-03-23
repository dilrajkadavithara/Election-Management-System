import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from asgiref.sync import sync_to_async
from backend.dependencies import get_current_user
from backend.django_bridge import User
from backend.schemas.communications import BroadcastRequest, TemplateOp

audit_logger = logging.getLogger("AuditLog")

router = APIRouter(prefix="/api/comm", tags=["Communications"])

def sync_comm_stats(username):
    from core.comm_engine import CommunicationEngine
    user = User.objects.get(username=username)
    return CommunicationEngine.get_comm_stats(user.profile)

@router.get("/stats")
async def get_comm_stats(user_info=Depends(get_current_user)):
    return await sync_to_async(sync_comm_stats, thread_sensitive=True)(user_info['username'])

@router.get("/templates")
async def list_templates(user_info=Depends(get_current_user)):
    from core_db.models import MessageTemplate
    def get_templates(): return list(MessageTemplate.objects.filter(is_active=True).values())
    return await sync_to_async(get_templates, thread_sensitive=True)()

@router.post("/send-broadcast")
async def send_broadcast(data: BroadcastRequest, user_info=Depends(get_current_user)):
    if not user_info.get('can_send_broadcasts', False):
        raise HTTPException(403, "You do not have permission to send broadcasts")

    from core.comm_engine import CommunicationEngine
    from backend.django_bridge import get_voter_list

    def sync_broadcast():
        user = User.objects.get(username=user_info['username'])
        f = data.filters
        voters_data = get_voter_list(
            user.profile, "", 1, 10000,
            f.constituency, f.lb, f.booth, f.gender, f.ageFrom, f.ageTo,
            f.leaning, f.serialFrom, f.serialTo, f.location
        )
        voter_ids = [v['id'] for v in voters_data['results'] if v.get('phone_no')]

        audit_logger.info(f"AUDIT: {user_info['username']} BROADCAST medium={data.medium} recipients={len(voter_ids)}")

        return CommunicationEngine.send_direct_broadcast(
            voter_ids=voter_ids,
            heading=data.heading,
            message=data.message,
            medium=data.medium,
            image_path=data.image_path,
            user=user
        )
    return await sync_to_async(sync_broadcast, thread_sensitive=True)()
