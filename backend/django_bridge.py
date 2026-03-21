import os
import sys
from pathlib import Path
from asgiref.sync import sync_to_async
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

# Core imports
from core.db_bridge import (
    get_constituencies, get_local_bodies, check_booth_exists, save_booth_data,
    get_dashboard_stats, get_strategic_analytics, get_voter_list, update_voter_in_db,
    get_all_locations, add_constituency, add_local_body, add_booth,
    get_all_users, create_managed_user, delete_user, update_user_profile, 
    change_user_password, get_parties, add_party,
    update_constituency, update_local_body, update_booth,
    get_live_voting_stats, toggle_voter_attendance
)

# THREAD-SAFE SYNC WRAPPERS
def sync_authenticate(username, password):
    user = authenticate(username=username, password=password)
    if user:
        return {
            "id": user.id,
            "username": user.username,
            "role": user.profile.role,
            "can_download": user.profile.can_download,
            "can_upload": user.profile.can_upload,
            "can_verify": user.profile.can_verify,
            "can_edit_voters": user.profile.can_edit_voters,
            "can_send_broadcasts": user.profile.can_send_broadcasts,
            "can_manage_system": user.profile.can_manage_system,
            "assignments": {
                "constituencies": list(user.profile.assigned_constituencies.values_list('id', flat=True)),
                "local_bodies": list(user.profile.assigned_local_bodies.values_list('id', flat=True)),
                "booths": list(user.profile.assigned_booths.values_list('id', flat=True))
            }
        }
    return None

def sync_get_user_info(username):
    user = User.objects.filter(username=username).first()
    if user:
        return {
            "id": user.id,
            "username": user.username,
            "role": user.profile.role,
            "can_download": user.profile.can_download,
            "can_upload": user.profile.can_upload,
            "can_verify": user.profile.can_verify,
            "can_edit_voters": user.profile.can_edit_voters,
            "can_send_broadcasts": user.profile.can_send_broadcasts,
            "can_manage_system": user.profile.can_manage_system,
            "assignments": {
                "constituencies": list(user.profile.assigned_constituencies.values_list('id', flat=True)),
                "local_bodies": list(user.profile.assigned_local_bodies.values_list('id', flat=True)),
                "booths": list(user.profile.assigned_booths.values_list('id', flat=True))
            }
        }
    return None

def sync_dashboard_wrapper(username, constituency_id=None, lb_id=None, booth_id=None):
    user = User.objects.get(username=username)
    return get_dashboard_stats(user.profile, constituency_id, lb_id, booth_id)

def sync_strategic_analytics_wrapper(username, constituency_id=None):
    user = User.objects.get(username=username)
    return get_strategic_analytics(user.profile, constituency_id)

def sync_voter_list_wrapper(username, search, page, page_size, **filters):
    user = User.objects.get(username=username)
    return get_voter_list(user.profile, search, page, page_size, **filters)

def sync_locations_wrapper(username):
    user = User.objects.get(username=username)
    return get_all_locations(user.profile)

# ASYNC WRAPPERS
authenticate_async = sync_to_async(sync_authenticate, thread_sensitive=True)
get_user_info_async = sync_to_async(sync_get_user_info, thread_sensitive=True)
get_constituencies_async = sync_to_async(get_constituencies, thread_sensitive=True)
get_local_bodies_async = sync_to_async(get_local_bodies, thread_sensitive=True)
check_booth_exists_async = sync_to_async(check_booth_exists, thread_sensitive=True)
save_booth_data_async = sync_to_async(save_booth_data, thread_sensitive=True)
get_stats_async = sync_to_async(sync_dashboard_wrapper, thread_sensitive=True)
get_voters_async = sync_to_async(sync_voter_list_wrapper, thread_sensitive=True)
edit_voter_async = sync_to_async(update_voter_in_db, thread_sensitive=True)
get_strategic_analytics_async = sync_to_async(sync_strategic_analytics_wrapper, thread_sensitive=True)

def sync_voting_stats_wrapper(username, constituency_id=None, lb_id=None, booth_id=None):
    user = User.objects.get(username=username)
    return get_live_voting_stats(user.profile, constituency_id, lb_id, booth_id)

get_voting_stats_async = sync_to_async(sync_voting_stats_wrapper, thread_sensitive=True)
toggle_attendance_async = sync_to_async(toggle_voter_attendance, thread_sensitive=True)

# Admin Async Wrappers
get_all_locations_async = sync_to_async(sync_locations_wrapper, thread_sensitive=True)
add_const_async = sync_to_async(add_constituency, thread_sensitive=True)
add_lb_async = sync_to_async(add_local_body, thread_sensitive=True)
add_booth_async = sync_to_async(add_booth, thread_sensitive=True)
get_all_users_async = sync_to_async(get_all_users, thread_sensitive=True)
create_user_async = sync_to_async(create_managed_user, thread_sensitive=True)
delete_user_async = sync_to_async(delete_user, thread_sensitive=True)
update_user_async = sync_to_async(update_user_profile, thread_sensitive=True)
change_password_async = sync_to_async(change_user_password, thread_sensitive=True)
get_parties_async = sync_to_async(get_parties, thread_sensitive=True)
add_party_async = sync_to_async(add_party, thread_sensitive=True)
update_const_async = sync_to_async(update_constituency, thread_sensitive=True)
update_lb_async = sync_to_async(update_local_body, thread_sensitive=True)
update_booth_async = sync_to_async(update_booth, thread_sensitive=True)
