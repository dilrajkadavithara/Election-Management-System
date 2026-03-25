import logging
from typing import Any, Optional
from .db_bridge import PROJECT_PATH
import sys
import os

# Ensure the comm engine can find the Django models
if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)

from core_db.models import CommunicationLog, Voter, MessageTemplate
from django.db import transaction
from django.db.models import Count, Q

logger = logging.getLogger(__name__)

class CommunicationEngine:
    """
    Unified engine for WhatsApp, SMS, and IVR Calls.
    Supports pluggable providers.
    """

    @staticmethod
    def send_broadcast(voter_ids: list[int], template_id: int, sent_by_user: Any) -> dict[str, int]:
        """
        Send a broadcast to a list of voters using a template.
        Bulk-fetches voters and bulk-creates logs for performance.
        """
        template = MessageTemplate.objects.get(id=template_id)
        results: dict[str, int] = {"success": 0, "failed": 0}
        log_entries: list[CommunicationLog] = []

        # Bulk fetch all voters in one query
        voters = {v.id: v for v in Voter.objects.filter(id__in=voter_ids)}

        for vid in voter_ids:
            voter = voters.get(vid)
            if not voter or not voter.phone_no:
                results["failed"] += 1
                continue

            try:
                if template.msg_type == 'WA':
                    success = CommunicationEngine.mock_whatsapp_provider(voter, template.content)
                elif template.msg_type == 'SMS':
                    success = CommunicationEngine.mock_sms_provider(voter, template.content)
                elif template.msg_type == 'CALL':
                    success = CommunicationEngine.mock_ivr_provider(voter, template.content)
                else:
                    success = False

                log_entries.append(CommunicationLog(
                    voter=voter,
                    template=template,
                    msg_type=template.msg_type,
                    status='SENT' if success else 'FAILED',
                    sent_by=sent_by_user,
                    response_metadata={"simulated": True}
                ))

                if success:
                    results["success"] += 1
                else:
                    results["failed"] += 1

            except Exception as e:
                logger.error(f"Failed to send to voter {vid}: {e}")
                results["failed"] += 1

        if log_entries:
            CommunicationLog.objects.bulk_create(log_entries)

        return results

    @staticmethod
    def send_direct_broadcast(voter_ids: list[int], heading: str, message: str, medium: str, image_path: Optional[str], user: Any) -> dict[str, int]:
        """
        Send a broadcast with direct content (no template).
        Bulk-fetches voters and bulk-creates logs for performance.
        """
        results: dict[str, int] = {"success": 0, "failed": 0}
        msg_type = 'WA' if medium == 'WATI' else 'SMS'
        content = f"{heading}\n\n{message}" if heading else message
        log_entries: list[CommunicationLog] = []

        # Bulk fetch all voters in one query
        voters = {v.id: v for v in Voter.objects.filter(id__in=voter_ids)}

        for vid in voter_ids:
            voter = voters.get(vid)
            if not voter or not voter.phone_no:
                results["failed"] += 1
                continue

            try:
                if msg_type == 'WA':
                    success = CommunicationEngine.mock_whatsapp_provider_with_media(voter, content, image_path)
                else:
                    success = CommunicationEngine.mock_sms_provider(voter, content)

                log_entries.append(CommunicationLog(
                    voter=voter,
                    msg_type=msg_type,
                    status='SENT' if success else 'FAILED',
                    sent_by=user,
                    response_metadata={"heading": heading, "has_image": bool(image_path), "simulated": True}
                ))

                if success:
                    results["success"] += 1
                else:
                    results["failed"] += 1

            except Exception as e:
                logger.error(f"Error in direct broadcast to {vid}: {e}")
                results["failed"] += 1

        if log_entries:
            CommunicationLog.objects.bulk_create(log_entries)

        return results

    @staticmethod
    def mock_whatsapp_provider_with_media(voter, content, image_path):
        """Simulates WhatsApp with optional image"""
        msg = content.replace("{{voter_name}}", voter.full_name)
        img_info = f" [IMAGE: {image_path}]" if image_path else ""
        print(f"[WATI MOCK] To {voter.phone_no}: {msg}{img_info}")
        return True

    @staticmethod
    def mock_whatsapp_provider(voter, content):
        """Simulates a WhatsApp API call (e.g. Twilio/Gupshup)"""
        return CommunicationEngine.mock_whatsapp_provider_with_media(voter, content, None)

    @staticmethod
    def mock_sms_provider(voter, content):
        """Simulates an SMS API call"""
        msg = content.replace("{{voter_name}}", voter.full_name)
        print(f"[SMS MOCK] To {voter.phone_no}: {msg}")
        return True

    @staticmethod
    def mock_ivr_provider(voter, content):
        """Simulates an Automated Call/IVR call"""
        print(f"[IVR MOCK] Dialing {voter.phone_no}... Reading: {content}")
        return True

    @staticmethod
    def get_comm_stats(user_profile: Any) -> dict[str, Any]:
        """Get summary of communications within user scope (single query)."""
        voters = user_profile.get_accessible_voters()
        stats = CommunicationLog.objects.filter(voter__in=voters).aggregate(
            total_sent=Count('id'),
            whatsapp=Count('id', filter=Q(msg_type='WA')),
            sms=Count('id', filter=Q(msg_type='SMS')),
            calls=Count('id', filter=Q(msg_type='CALL')),
            delivered=Count('id', filter=Q(status='DELIVERED')),
            sent=Count('id', filter=Q(status='SENT')),
            failed=Count('id', filter=Q(status='FAILED')),
        )

        return {
            "total_sent": stats['total_sent'],
            "whatsapp": stats['whatsapp'],
            "sms": stats['sms'],
            "calls": stats['calls'],
            "status_dist": {
                "delivered": stats['delivered'],
                "sent": stats['sent'],
                "failed": stats['failed'],
            }
        }
