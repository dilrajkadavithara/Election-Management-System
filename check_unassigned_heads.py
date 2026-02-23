import os
import django
import sys

# Setup paths
BASE_DIR = os.getcwd()
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, 'voter_vault'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import UserProfile, Booth, LocalBody

def check_unassigned_heads():
    print("--- 👤 BOOTH AGENTS / ZONE COMMANDERS WITHOUT BOOTHS ---")
    booth_heads = UserProfile.objects.filter(role__in=['BOOTH_AGENT', 'ZONE_COMMANDER'])
    unassigned_heads = []
    for head in booth_heads:
        if head.assigned_booths.count() == 0:
            unassigned_heads.append(f"{head.user.username} ({head.get_role_display()})")
    
    if unassigned_heads:
        for name in unassigned_heads:
            print(f"⚠️ Unassigned: {name}")
    else:
        print("✅ All Booth Heads have assigned booths.")

    print("\n--- 🏛️ LOCAL BODY HEADS WITHOUT LOCAL BODIES ---")
    lb_heads = UserProfile.objects.filter(role='LOCAL_BODY_HEAD')
    unassigned_lb_heads = []
    for head in lb_heads:
        if head.assigned_local_bodies.count() == 0:
            unassigned_lb_heads.append(f"{head.user.username}")
    
    if unassigned_lb_heads:
        for name in unassigned_lb_heads:
            print(f"⚠️ Unassigned: {name}")
    else:
        print("✅ All Local Body Heads have assigned areas.")

if __name__ == "__main__":
    check_unassigned_heads()
