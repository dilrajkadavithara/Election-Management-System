from core_db.models import Booth, Voter
from django.utils import timezone

today = timezone.now().date()
target_booths = Booth.objects.filter(number="51", created_at__date=today)
v_del = Voter.objects.filter(booth__in=target_booths).delete()
b_del = target_booths.delete()

print(f"Cleanup Successful: Deleted {v_del[0]} voters from Booth 51")
