
import os
import django
import sys
from django.conf import settings
from django.db import transaction
from django.db.models import Q

# Setup Django Environment for standalone script usage
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_PATH = os.path.join(BASE_DIR, 'voter_vault')

if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter, Booth, Constituency, LocalBody, PoliticalParty, UserProfile

def get_parties():
    """Fetch list of active political parties"""
    return list(PoliticalParty.objects.filter(is_active=True).values('id', 'name', 'short_label', 'symbol_image', 'primary_color', 'accent_gradient'))

def add_party(name, symbol_image, short_label="", primary_color="#000080", accent_gradient="linear-gradient(to bottom, #FF9933, #ffffff, #138808)"):
    """Create a new political party with branding"""
    p, created = PoliticalParty.objects.get_or_create(name=name)
    p.symbol_image = symbol_image
    p.short_label = short_label
    p.primary_color = primary_color
    p.accent_gradient = accent_gradient
    p.save()
    return {"id": p.id, "name": p.name, "created": created}

def get_constituencies():
    """Fetch list of constituency names for dropdown"""
    return list(Constituency.objects.values_list('name', flat=True))

def get_local_bodies(constituency_name=None):
    """Fetch list of local bodies for a constituency"""
    qs = LocalBody.objects.all()
    if constituency_name:
        qs = qs.filter(constituency__name=constituency_name)
    return list(qs.values('id', 'name', 'body_type'))

def check_booth_exists(constituency_name, booth_number):
    """Verifies if a booth already has voters"""
    return Booth.objects.filter(constituency__name=constituency_name, number=str(booth_number)).exists()

def save_booth_data(constituency_name, local_body_type, local_body_name, booth_number, voter_data_list, original_filename, polling_station_no="", polling_station_name="", user_id=None):
    try:
        with transaction.atomic():
            constituency, _ = Constituency.objects.get_or_create(name=constituency_name)
            local_body, _ = LocalBody.objects.get_or_create(constituency=constituency, name=local_body_name, body_type=local_body_type)

            if Booth.objects.filter(constituency=constituency, number=booth_number).exists():
                return False, f"Booth {booth_number} already exists."

            booth = Booth.objects.create(
                constituency=constituency,
                local_body=local_body,
                number=booth_number,
                polling_station_no=polling_station_no,
                polling_station_name=polling_station_name,
                name=polling_station_name or f"Booth {booth_number}"
            )
            
            from django.contrib.auth.models import User
            created_by_user = None
            if user_id:
                try: created_by_user = User.objects.get(id=user_id)
                except: pass
            
            voters_to_create = []
            for row in voter_data_list:
                age_val = int(row.get('Age')) if str(row.get('Age')).isdigit() else None
                voter = Voter(
                    booth=booth,
                    serial_no=row.get('Serial_OCR', 0),
                    epic_id=row.get('EPIC_ID', 'UNK'),
                    full_name=row.get('Full Name', 'N/A'),
                    relation_type=row.get('Relation Type', ''),
                    relation_name=row.get('Relation Name', ''),
                    house_no=row.get('House Number', ''),
                    house_name=row.get('House Name', ''),
                    age=age_val,
                    gender=row.get('Gender', ''),
                    source_file=original_filename,
                    status='VERIFIED',
                    created_by=created_by_user
                )
                voters_to_create.append(voter)
            
            Voter.objects.bulk_create(voters_to_create)
            return True, f"Successfully saved {len(voters_to_create)} voters."

    except Exception as e:
        return False, f"Database Error: {str(e)}"

def get_dashboard_stats(user_profile, constituency_id=None, booth_id=None):
    voters = user_profile.get_accessible_voters()
    if constituency_id: voters = voters.filter(booth__constituency_id=constituency_id)
    if booth_id: voters = voters.filter(booth_id=booth_id)
        
    total = voters.count()
    sentiment = {
        "UDF": voters.filter(voter_leaning='UDF').count(),
        "LDF": voters.filter(voter_leaning='LDF').count(),
        "NDA": voters.filter(voter_leaning='NDA').count(),
        "Neutral": voters.filter(voter_leaning='NEUTRAL').count(),
    }
    return {"total": total, "sentiment": sentiment}

def get_voter_list(user_profile, search=None, page=1, page_size=50, constituency_id=None, lb_id=None, booth_id=None, gender=None, age_from=None, age_to=None, leaning=None):
    voters = user_profile.get_accessible_voters()
    if search:
        voters = voters.filter(Q(full_name__icontains=search) | Q(epic_id__icontains=search))
    
    total_count = voters.count()
    start = (page - 1) * page_size
    voters_slice = voters.select_related('booth')[start:start+page_size]

    results = []
    for v in voters_slice:
        results.append({
            "id": v.id, "full_name": v.full_name, "epic_id": v.epic_id,
            "gender": v.gender, "age": v.age, "booth_no": v.booth.number
        })
    return {"total": total_count, "results": results}

def update_voter_in_db(voter_id, data):
    try:
        voter = Voter.objects.get(id=voter_id)
        if 'full_name' in data: voter.full_name = data['full_name']
        voter.save()
        return True, "Voter updated"
    except Exception as e: return False, str(e)

def get_all_locations(user_profile=None):
    data = []
    for c in Constituency.objects.all():
        c_node = {"id": c.id, "name": c.name, "local_bodies": []}
        for lb in c.local_bodies.all():
            lb_node = {"id": lb.id, "name": lb.name, "booths": []}
            for b in lb.booths.all():
                lb_node["booths"].append({"id": b.id, "number": b.number})
            c_node["local_bodies"].append(lb_node)
        data.append(c_node)
    return data

def add_constituency(name):
    c, created = Constituency.objects.get_or_create(name=name)
    return {"id": c.id, "name": c.name, "created": created}

def add_local_body(const_id, name, btype):
    c = Constituency.objects.get(id=const_id)
    lb, created = LocalBody.objects.get_or_create(constituency=c, name=name, body_type=btype)
    return {"id": lb.id, "name": lb.name, "created": created}

def add_booth(const_id, lb_id, number, ps_name="", ps_no=""):
    b, created = Booth.objects.get_or_create(constituency_id=const_id, local_body_id=lb_id, number=number)
    if ps_name or ps_no:
        b.polling_station_name = ps_name
        b.polling_station_no = ps_no
        b.save()
    return {"id": b.id, "number": b.number, "created": created}

def get_all_users():
    from django.contrib.auth.models import User
    users = []
    for u in User.objects.all():
        if hasattr(u, 'profile'):
            users.append({"id": u.id, "username": u.username, "role": u.profile.role})
    return users

def create_managed_user(username, password, role, assignments):
    from django.contrib.auth.models import User
    user = User.objects.create_user(username=username, password=password)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = role
    profile.save()
    return True, "User created"

def delete_user(user_id):
    from django.contrib.auth.models import User
    User.objects.get(id=user_id).delete()
    return True, "User deleted"

def update_user_profile(user_id, data):
    from django.contrib.auth.models import User
    user = User.objects.get(id=user_id)
    if 'role' in data: user.profile.role = data['role']; user.profile.save()
    return True, "User updated"
