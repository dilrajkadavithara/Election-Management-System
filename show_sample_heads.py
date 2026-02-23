import os
import django
import sys
import random

# Setup paths
BASE_DIR = os.getcwd()
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, 'voter_vault'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Booth, LocalBody

def show_sample():
    print("--- 🏛️ SAMPLE LOCAL BODY HEADS ---")
    lbs = LocalBody.objects.all()[:3]
    for lb in lbs:
        print(f"{lb.name}: {lb.head_name} ({lb.head_phone})")

    print("\n--- 👤 SAMPLE BOOTH HEADS ---")
    booths = Booth.objects.all()[:10]
    for b in booths:
        lb_name = b.local_body.name if b.local_body else "N/A"
        print(f"Booth {b.number} ({lb_name}): {b.head_name} ({b.head_phone})")

if __name__ == "__main__":
    show_sample()
