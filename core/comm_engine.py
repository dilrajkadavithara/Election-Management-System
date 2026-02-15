import time
import random
import logging
from .db_bridge import PROJECT_PATH
import sys
import os

# Ensure the comm engine can find the Django models
if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)

from core_db.models import CommunicationLog, Voter, MessageTemplate
from django.db import transaction

logger = logging.getLogger(__name__)

class CommunicationEngine:
    """
    Unified engine for WhatsApp, SMS, and IVR Calls.
    Supports pluggable providers.
    """
    
    @staticmethod
    def send_broadcast(voter_ids, template_id, sent_by_user):
        """
        Send a broadcast to a list of voters.
        This would typically be queued in a real system.
        """
        template = MessageTemplate.objects.get(id=template_id)
        results = {"success": 0, "failed": 0, "logs": []}
        
        for vid in voter_ids:
            try:
                voter = Voter.objects.get(id=vid)
                if not voter.phone_no:
                    results["failed"] += 1
                    continue
                
                # Logic to determine which provider to use
                if template.msg_type == 'WA':
                    success = CommunicationEngine.mock_whatsapp_provider(voter, template.content)
                elif template.msg_type == 'SMS':
                    success = CommunicationEngine.mock_sms_provider(voter, template.content)
                elif template.msg_type == 'CALL':
                    success = CommunicationEngine.mock_ivr_provider(voter, template.content)
                else:
                    success = False

                # Log the communication
                CommunicationLog.objects.create(
                    voter=voter,
                    template=template,
                    msg_type=template.msg_type,
                    status='SENT' if success else 'FAILED',
                    sent_by=sent_by_user,
                    response_metadata={"simulated": True}
                )
                
                if success:
                    results["success"] += 1
                else:
                    results["failed"] += 1
                    
            except Exception as e:
                logger.error(f"Failed to send to voter {vid}: {str(e)}")
                results["failed"] += 1
                
        return results

    @staticmethod
    def mock_whatsapp_provider(voter, content):
        """Simulates a WhatsApp API call (e.g. Twilio/Gupshup)"""
        # Replace placeholders
        msg = content.replace("{{voter_name}}", voter.full_name)
        print(f"[WHATSAPP MOCK] Sent to {voter.phone_no}: {msg}")
        return True

    @staticmethod
    def mock_sms_provider(voter, content):
        """Simulates an SMS API call"""
        msg = content.replace("{{voter_name}}", voter.full_name)
        print(f"[SMS MOCK] Sent to {voter.phone_no}: {msg}")
        return True

    @staticmethod
    def mock_ivr_provider(voter, content):
        """Simulates an Automated Call/IVR call"""
        print(f"[IVR MOCK] Dialing {voter.phone_no}... Reading: {content}")
        return True

    @staticmethod
    def get_comm_stats(user_profile):
        """Get summary of communications within user scope"""
        voters = user_profile.get_accessible_voters()
        logs = CommunicationLog.objects.filter(voter__in=voters)
        
        return {
            "total_sent": logs.count(),
            "whatsapp": logs.filter(msg_type='WA').count(),
            "sms": logs.filter(msg_type='SMS').count(),
            "calls": logs.filter(msg_type='CALL').count(),
            "status_dist": {
                "delivered": logs.filter(status='DELIVERED').count(),
                "sent": logs.filter(status='SENT').count(),
                "failed": logs.filter(status='FAILED').count(),
            }
        }
