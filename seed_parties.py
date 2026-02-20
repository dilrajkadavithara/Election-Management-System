import os, sys, django
sys.path.insert(0, '/app/voter_vault')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import PoliticalParty

PARTIES = [
    {
        "name": "Indian National Congress",
        "short_label": "INC",
        "symbol_image": "party_symbols/inc.png",
        "primary_color": "#006400",
        "accent_gradient": "linear-gradient(135deg, #FF9933 0%, #FFFFFF 50%, #138808 100%)",
    },
    {
        "name": "Communist Party of India (Marxist)",
        "short_label": "CPM",
        "symbol_image": "party_symbols/cpm.png",
        "primary_color": "#CC0000",
        "accent_gradient": "linear-gradient(135deg, #CC0000 0%, #8B0000 100%)",
    },
    {
        "name": "Indian Union Muslim League",
        "short_label": "IUML",
        "symbol_image": "party_symbols/iuml.png",
        "primary_color": "#006400",
        "accent_gradient": "linear-gradient(135deg, #006400 0%, #004000 100%)",
    },
    {
        "name": "Communist Party of India",
        "short_label": "CPI",
        "symbol_image": "party_symbols/cpi.png",
        "primary_color": "#E30000",
        "accent_gradient": "linear-gradient(135deg, #E30000 0%, #CC0000 100%)",
    },
    {
        "name": "Kerala Congress (M)",
        "short_label": "KCM",
        "symbol_image": "party_symbols/kcm.png",
        "primary_color": "#004080",
        "accent_gradient": "linear-gradient(135deg, #004080 0%, #002050 100%)",
    },
    {
        "name": "Revolutionary Socialist Party",
        "short_label": "RSP",
        "symbol_image": "party_symbols/rsp.png",
        "primary_color": "#CC0000",
        "accent_gradient": "linear-gradient(135deg, #CC0000 0%, #000000 100%)",
    },
    {
        "name": "Bharatiya Janata Party",
        "short_label": "BJP",
        "symbol_image": "party_symbols/bjp.png",
        "primary_color": "#FF6600",
        "accent_gradient": "linear-gradient(135deg, #FF6600 0%, #FFFFFF 50%, #138808 100%)",
    },
]

created = 0
updated = 0

for party_data in PARTIES:
    obj, was_created = PoliticalParty.objects.update_or_create(
        short_label=party_data["short_label"],
        defaults={
            "name": party_data["name"],
            "symbol_image": party_data["symbol_image"],
            "primary_color": party_data["primary_color"],
            "accent_gradient": party_data["accent_gradient"],
            "is_active": True,
        }
    )
    if was_created:
        created += 1
        print(f"  CREATED: {obj.name} ({obj.short_label})")
    else:
        updated += 1
        print(f"  UPDATED: {obj.name} ({obj.short_label})")

print(f"\nDone. {created} created, {updated} updated.")
print(f"Total parties in DB: {PoliticalParty.objects.count()}")
