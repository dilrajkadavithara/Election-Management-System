
import os
import django
import sys
from django.conf import settings
from django.db import transaction

# Setup Django Environment for standalone script usage
# Correctly resolve the project root relative to this file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_PATH = os.path.join(BASE_DIR, 'voter_vault')

# Ensure prioritization: Add to front of sys.path
if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from core_db.models import Voter, Booth, Constituency

def get_constituencies():
    """Fetch list of constituency names for Streamlit dropdown"""
    return list(Constituency.objects.values_list('name', flat=True))

def save_booth_data(constituency_name, booth_number, voter_data_list, original_filename):
    """
    Saves a list of voters to the database.
    
    Args:
        constituency_name (str): Name of the constituency (e.g. 'Trippunithura')
        booth_number (int): Booth number
        voter_data_list (list): List of dictionaries containing voter data
        original_filename (str): Name of the uploaded PDF file
    
    Returns:
        (bool, str): (Success status, Message)
    """
    try:
        with transaction.atomic():
            # 1. Get or Create Constituency
            constituency, created = Constituency.objects.get_or_create(name=constituency_name)
            
            # 2. Check for Duplicate Booth
            if Booth.objects.filter(constituency=constituency, number=booth_number).exists():
                return False, f"Booth {booth_number} already exists in {constituency_name}. Please delete it from Admin before re-uploading."

            # 3. Create Booth
            booth = Booth.objects.create(
                constituency=constituency,
                number=booth_number,
                name=f"Booth {booth_number} from {original_filename}"
            )
            
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
                    status='VERIFIED'
                )
                voters_to_create.append(voter)
            
            # 5. Bulk Insert (Fast)
            Voter.objects.bulk_create(voters_to_create)
            
            return True, f"Successfully saved {len(voters_to_create)} voters to Booth {booth_number} ({constituency_name})"

    except Exception as e:
        return False, f"Database Error: {str(e)}"
