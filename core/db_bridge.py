
import os
import django
import sys
from django.conf import settings
from django.db import transaction
from django.db.models import Q

# Setup Django Environment for standalone script usage
# Correctly resolve the project root relative to this file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_PATH = os.path.join(BASE_DIR, 'voter_vault')

# Ensure prioritization: Add to front of sys.path
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

def save_booth_data(constituency_name, local_body_type, local_body_name, booth_number, voter_data_list, original_filename, polling_station_no="", polling_station_name="", user_id=None):
    """
    Saves a list of voters to the database with Local Body categorization.
    
    Args:
        constituency_name (str): Name of the constituency
        local_body_type (str): PANCHAYAT, MUNICIPALITY, or CORPORATION
        local_body_name (str): Name of the Local Body
        booth_number (int): Booth number
        voter_data_list (list): List of dictionaries containing voter data
        original_filename (str): Name of the uploaded PDF file
        polling_station_no (str): Optional Polling Station Number
        polling_station_name (str): Optional Polling Station Name
        user_id (int): Optional ID of the user who uploaded this batch
    
    Returns:
        (bool, str): (Success status, Message)
    """
    try:
        with transaction.atomic():
            # 1. Get or Create Constituency
            constituency, created = Constituency.objects.get_or_create(name=constituency_name)
            
            # 2. Get or Create Local Body
            local_body, lb_created = LocalBody.objects.get_or_create(
                constituency=constituency,
                name=local_body_name,
                body_type=local_body_type
            )

            # 3. Check for Duplicate Booth
            if Booth.objects.filter(constituency=constituency, number=booth_number).exists():
                return False, f"Booth {booth_number} already exists in {constituency_name}. Please delete it from Admin before re-uploading."

            # 4. Create Booth
            booth = Booth.objects.create(
                constituency=constituency,
                local_body=local_body,
                number=booth_number,
                polling_station_no=polling_station_no,
                polling_station_name=polling_station_name,
                name=polling_station_name or f"Booth {booth_number}"
            )
            
            # Get User object if user_id provided
            from django.contrib.auth.models import User
            created_by_user = None
            if user_id:
                try:
                    created_by_user = User.objects.get(id=user_id)
                except User.DoesNotExist:
                    pass
            
            # 4. Prepare Voter Objects
            voters_to_create = []
            for row in voter_data_list:
                # Sanitize Integer Fields
                try:
                    age_val = int(row.get('Age')) if str(row.get('Age')).isdigit() else None
                except:
                    age_val = None
                    
                try:
                    serial_val = int(row.get('Serial_OCR')) if str(row.get('Serial_OCR')).isdigit() else 0
                except:
                    serial_val = 0

                voter = Voter(
                    booth=booth,
                    serial_no=serial_val,
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
                    created_by=created_by_user  # Track who uploaded this batch
                )
                voters_to_create.append(voter)
            
            # 5. Bulk Insert (Fast)
            Voter.objects.bulk_create(voters_to_create)
            
            return True, f"Successfully saved {len(voters_to_create)} voters to Booth {booth_number} ({constituency_name})"

    except Exception as e:
        return False, f"Database Error: {str(e)}"

def get_dashboard_stats(user_profile, constituency_id=None, booth_id=None):
    """Fetch aggregate stats for the dashboard based on user scope and filters"""
    voters = user_profile.get_accessible_voters()
    
    if constituency_id:
        voters = voters.filter(booth__constituency_id=constituency_id)
    if booth_id:
        voters = voters.filter(booth_id=booth_id)
        
    total = voters.count()
    male = voters.filter(gender__iexact='Male').count()
    female = voters.filter(gender__iexact='Female').count()
    
    # Campaign Intelligence Stats
    sentiment = {
        "UDF": voters.filter(voter_leaning='UDF').count(),
        "LDF": voters.filter(voter_leaning='LDF').count(),
        "NDA": voters.filter(voter_leaning='NDA').count(),
        "Neutral": voters.filter(voter_leaning='NEUTRAL').count(),
    }
    
    location = {
        "local": voters.filter(current_location='LOCAL').count(),
        "abroad": voters.filter(current_location='ABROAD').count(),
        "state": voters.filter(current_location='STATE').count(),
        "district": voters.filter(current_location='DISTRICT').count(),
    }

    outreach = {
        "with_phone": voters.filter(phone_no__isnull=False).exclude(phone_no='').count(),
        "total": total
    }
    
    # Age Distribution
    age_dist = {
        "18_25": voters.filter(age__gte=18, age__lte=25).count(),
        "26_35": voters.filter(age__gte=26, age__lte=35).count(),
        "36_45": voters.filter(age__gte=36, age__lte=45).count(),
        "46_60": voters.filter(age__gte=46, age__lte=60).count(),
        "60_plus": voters.filter(age__gt=60).count(),
    }

    # Tagging Progress (anyone with either leaning, location, or phone)
    tagged = voters.filter(
        Q(voter_leaning__isnull=False) | 
        Q(current_location__isnull=False) | 
        Q(phone_no__isnull=False)
    ).exclude(
        voter_leaning='', 
        current_location='', 
        phone_no=''
    ).count()

    return {
        "total": total,
        "male": male,
        "female": female,
        "age_dist": age_dist,
        "sentiment": sentiment,
        "location": location,
        "outreach": outreach,
        "tagging_progress": tagged
    }

def get_voter_list(user_profile, search=None, page=1, page_size=50, constituency_id=None, lb_id=None, booth_id=None, gender=None, age_from=None, age_to=None, leaning=None):
    """Fetch paginated voters with advanced filters"""
    voters = user_profile.get_accessible_voters()
    
    if search:
        voters = voters.filter(
            Q(full_name__icontains=search) | 
            Q(epic_id__icontains=search) |
            Q(house_name__icontains=search)
        )
    
    if constituency_id:
        voters = voters.filter(booth__constituency_id=constituency_id)
    if lb_id:
        voters = voters.filter(booth__local_body_id=lb_id)
    if booth_id:
        voters = voters.filter(booth_id=booth_id)
    if gender:
        voters = voters.filter(gender__iexact=gender)
    if age_from:
        voters = voters.filter(age__gte=age_from)
    if age_to:
        voters = voters.filter(age__lte=age_to)
    if leaning:
        voters = voters.filter(voter_leaning=leaning)

    total_count = voters.count()
    
    # Handle pagination if page is not None
    if page:
        start = (page - 1) * page_size
        end = start + page_size
        voters_slice = voters.select_related('booth', 'booth__constituency', 'booth__local_body')[start:end]
    else:
        voters_slice = voters.select_related('booth', 'booth__constituency', 'booth__local_body')

    results = []
    for v in voters_slice:
        results.append({
            "id": v.id,
            "serial_no": v.serial_no,
            "full_name": v.full_name,
            "epic_id": v.epic_id,
            "house_name": v.house_name,
            "house_no": v.house_no,
            "age": v.age,
            "gender": v.gender,
            "constituency": v.booth.constituency.name,
            "local_body": v.booth.local_body.name if v.booth.local_body else "N/A",
            "booth_no": v.booth.number,
            "ps_no": v.booth.polling_station_no,
            "ps_name": v.booth.polling_station_name,
            "phone_no": v.phone_no,
            "current_location": v.current_location,
            "voter_leaning": v.voter_leaning,
            "voting_probability": v.voting_probability
        })
    
    return {
        "total": total_count,
        "results": results,
        "page": page,
        "page_size": page_size
    }

def update_voter_in_db(voter_id, data):
    """Update a single voter's data in the database"""
    try:
        voter = Voter.objects.get(id=voter_id)
        if 'full_name' in data: voter.full_name = data['full_name']
        if 'epic_id' in data: voter.epic_id = data['epic_id']
        if 'house_name' in data: voter.house_name = data['house_name']
        if 'house_no' in data: voter.house_no = data['house_no']
        if 'age' in data: voter.age = int(data['age']) if str(data['age']).isdigit() else voter.age
        if 'gender' in data: voter.gender = data['gender']
        if 'phone_no' in data: voter.phone_no = data['phone_no'] if data['phone_no'] else None
        if 'current_location' in data: voter.current_location = data['current_location'] if data['current_location'] else None
        if 'voter_leaning' in data: voter.voter_leaning = data['voter_leaning'] if data['voter_leaning'] else None
        if 'voting_probability' in data: voter.voting_probability = data['voting_probability'] if data['voting_probability'] else None
        voter.save()
        return True, "Voter updated successfully"
    except Exception as e:
        return False, str(e)

def get_all_locations(user_profile=None):
    """Fetch the hierarchy for admin view, optionally filtered by user occupancy"""
    data = []
    
    # Get base constituency queryset
    if user_profile and user_profile.role not in ['SUPERUSER', 'MANAGER', 'OPERATOR']:
        # For localized roles, we need to filter
        if user_profile.role == 'CONSTITUENCY_ADMIN':
            c_qs = user_profile.assigned_constituencies.all()
        else:
            # For lower roles, they are still within a constituency
            # Determine constituencies from their lower-level assignments
            c_ids = set()
            if user_profile.role == 'LOCAL_BODY_HEAD':
                c_ids.update(user_profile.assigned_local_bodies.values_list('constituency_id', flat=True))
            elif user_profile.role in ['ZONE_COMMANDER', 'BOOTH_AGENT']:
                c_ids.update(user_profile.assigned_booths.values_list('constituency_id', flat=True))
            c_qs = Constituency.objects.filter(id__in=c_ids)
    else:
        c_qs = Constituency.objects.all()

    for c in c_qs:
        c_node = {
            "id": c.id, 
            "name": c.name, 
            "local_bodies": []
        }
        
        # Filter Local Bodies
        lb_qs = c.local_bodies.all()
        if user_profile and user_profile.role not in ['SUPERUSER', 'MANAGER', 'OPERATOR', 'CONSTITUENCY_ADMIN']:
            if user_profile.role == 'LOCAL_BODY_HEAD':
                lb_qs = lb_qs.filter(id__in=user_profile.assigned_local_bodies.all())
            elif user_profile.role in ['ZONE_COMMANDER', 'BOOTH_AGENT']:
                # For Booth Level, determine local bodies from assigned booths
                lb_ids = user_profile.assigned_booths.values_list('local_body_id', flat=True)
                lb_qs = lb_qs.filter(id__in=lb_ids)
        
        for lb in lb_qs:
            lb_node = {"id": lb.id, "name": lb.name, "type": lb.body_type, "booths": []}
            
            # Filter Booths
            b_qs = lb.booths.all()
            if user_profile and user_profile.role in ['ZONE_COMMANDER', 'BOOTH_AGENT']:
                b_qs = b_qs.filter(id__in=user_profile.assigned_booths.all())
                
            for b in b_qs:
                lb_node["booths"].append({
                    "id": b.id, 
                    "number": b.number, 
                    "polling_station_no": b.polling_station_no,
                    "name": b.name,
                    "polling_station_name": b.polling_station_name
                })
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
    c = Constituency.objects.get(id=const_id)
    lb = LocalBody.objects.get(id=lb_id)
    b, created = Booth.objects.get_or_create(
        constituency=c, 
        local_body=lb, 
        number=number
    )
    if ps_name:
        b.polling_station_name = ps_name
    if ps_no:
        b.polling_station_no = ps_no
    
    if ps_name or ps_no:
        b.save()
        
    return {"id": b.id, "number": b.number, "created": created}

def get_all_users():
    """Fetch all users and their profile details for admin"""
    from django.contrib.auth.models import User
    users = []
    for u in User.objects.all().select_related('profile'):
        profile = getattr(u, 'profile', None)
        if not profile: continue
        
        users.append({
            "id": u.id,
            "username": u.username,
            "role": profile.role,
            "can_download": profile.can_download,
            "can_upload": profile.can_upload,
            "can_verify": profile.can_verify,
            "can_edit_voters": profile.can_edit_voters,
            "can_send_broadcasts": profile.can_send_broadcasts,
            "can_manage_system": profile.can_manage_system,
            "constituencies": list(profile.assigned_constituencies.values_list('name', flat=True)),
            "constituency_ids": list(profile.assigned_constituencies.values_list('id', flat=True)),
            "local_bodies": list(profile.assigned_local_bodies.values_list('name', flat=True)),
            "local_body_ids": list(profile.assigned_local_bodies.values_list('id', flat=True)),
            "booths": list(profile.assigned_booths.values_list('number', flat=True)),
            "booth_ids": list(profile.assigned_booths.values_list('id', flat=True)),
        })
    return users

def create_managed_user(username, password, role, assignments):
    """Create a new user with specific role and scope assignments"""
    from django.contrib.auth.models import User
    try:
        if User.objects.filter(username=username).exists():
            return False, "Username already exists"
        
        with transaction.atomic():
            user = User.objects.create_user(username=username, password=password)
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = role
            
            # Default Permissions Logic
            # Superuser & Manager get everything
            if role in ['SUPERUSER', 'MANAGER']:
                profile.can_download = True
                profile.can_upload = True
                profile.can_verify = True
                profile.can_edit_voters = True
                profile.can_send_broadcasts = True
                profile.can_manage_system = (role == 'SUPERUSER')
            elif role == 'OPERATOR':
                profile.can_upload = True
                profile.can_verify = True
                profile.can_edit_voters = True
            elif role in ['CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD']:
                profile.can_download = True
                profile.can_send_broadcasts = True
            
            # Allow manual overrides from 'data' if passed
            if isinstance(assignments, dict):
                profile.can_download = assignments.get('can_download', profile.can_download)
                profile.can_upload = assignments.get('can_upload', profile.can_upload)
                profile.can_verify = assignments.get('can_verify', profile.can_verify)
                profile.can_edit_voters = assignments.get('can_edit_voters', profile.can_edit_voters)
                profile.can_send_broadcasts = assignments.get('can_send_broadcasts', profile.can_send_broadcasts)
                profile.can_manage_system = assignments.get('can_manage_system', profile.can_manage_system)
            
            if 'constituencies' in assignments:
                profile.assigned_constituencies.add(*assignments['constituencies'])
            if 'local_bodies' in assignments:
                profile.assigned_local_bodies.add(*assignments['local_bodies'])
            if 'booths' in assignments:
                # Allow shared assignment (Zone Commander + Booth Agent can both have Booth 45)
                profile.assigned_booths.add(*assignments['booths'])
            
            profile.save()
            return True, "User created successfully"
    except Exception as e:
        return False, str(e)

def delete_user(user_id):
    """Delete a managed user and free up their assignments"""
    from django.contrib.auth.models import User
    try:
        user = User.objects.get(id=user_id)
        if user.is_superuser:
            return False, "Cannot delete root superuser"
        user.delete()
        return True, "User deleted successfully"
    except Exception as e:
        return False, str(e)

def update_user_profile(user_id, data):
    """Update an existing user profile's role, permissions, and scope"""
    from django.contrib.auth.models import User
    try:
        with transaction.atomic():
            user = User.objects.get(id=user_id)
            profile = user.profile
            
            if 'role' in data:
                profile.role = data['role']
            if 'can_download' in data:
                profile.can_download = data['can_download']
            if 'can_upload' in data:
                profile.can_upload = data['can_upload']
            if 'can_verify' in data:
                profile.can_verify = data['can_verify']
            if 'can_edit_voters' in data:
                profile.can_edit_voters = data['can_edit_voters']
            if 'can_send_broadcasts' in data:
                profile.can_send_broadcasts = data['can_send_broadcasts']
            if 'can_manage_system' in data:
                profile.can_manage_system = data['can_manage_system']
            
            if 'assignments' in data:
                assignments = data['assignments']
                if 'constituencies' in assignments:
                    profile.assigned_constituencies.set(assignments['constituencies'])
                if 'local_bodies' in assignments:
                    profile.assigned_local_bodies.set(assignments['local_bodies'])
                if 'booths' in assignments:
                    profile.assigned_booths.set(assignments['booths'])
            
            profile.save()
            return True, "User updated successfully"
    except Exception as e:
        return False, str(e)
