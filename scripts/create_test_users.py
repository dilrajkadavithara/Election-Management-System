import os
import sys
import django
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

# 1. Setup Django Environment
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(BASE_DIR, 'voter_vault')
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'voter_vault.settings')
django.setup()

from django.contrib.auth.models import User
from core_db.models import UserProfile, Constituency, LocalBody, Booth
from core.db_bridge import create_managed_user

def create_test_credentials():
    print("Initializing Test Credentials...")
    
    # Get some default IDs for assignment
    const = Constituency.objects.first()
    lb = LocalBody.objects.first()
    booth = Booth.objects.first()
    
    const_id = const.id if const else None
    lb_id = lb.id if lb else None
    booth_id = booth.id if booth else None
    
    roles = [
        ("SUPERUSER", "admin_super", "pass_super123", {}),
        ("MANAGER", "admin_mgr", "pass_mgr123", {}),
        ("OPERATOR", "admin_op", "pass_op123", {}),
        ("CONSTITUENCY_ADMIN", "admin_const", "pass_const123", {"constituencies": [const_id]} if const_id else {}),
        ("LOCAL_BODY_HEAD", "admin_lb", "pass_lb123", {"constituencies": [const_id], "local_bodies": [lb_id]} if lb_id else {}),
        ("ZONE_COMMANDER", "admin_zone", "pass_zone123", {"constituencies": [const_id], "local_bodies": [lb_id], "booths": [booth_id]} if booth_id else {}),
        ("BOOTH_AGENT", "admin_booth", "pass_booth123", {"constituencies": [const_id], "local_bodies": [lb_id], "booths": [booth_id]} if booth_id else {}),
    ]

    credentials_data = [["Role", "Username", "Password", "Scope"]]
    
    for role_code, username, password, assignments in roles:
        # Delete user if exists for clean state
        User.objects.filter(username=username).delete()
        
        success, msg = create_managed_user(username, password, role_code, assignments)
        if success:
            print(f"Created {role_code} as {username}")
            scope_desc = "Global" if not assignments else f"Assigned to {role_code.split('_')[0]}"
            credentials_data.append([role_code, username, password, scope_desc])
        else:
            print(f"Failed to create {role_code}: {msg}")

    # 2. Generate PDF
    doc = SimpleDocTemplate("Test_Credentials.pdf", pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=20,
        alignment=1
    )
    
    elements.append(Paragraph("Election Management System - Test Credentials", title_style))
    elements.append(Paragraph("System Version: 7-Tier RBAC Enabled", styles['Normal']))
    elements.append(Spacer(1, 0.4 * inch))
    
    t = Table(credentials_data, colWidths=[1.8*inch, 1.2*inch, 1.2*inch, 1.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
    ]))
    elements.append(t)
    
    elements.append(Spacer(1, 0.5 * inch))
    elements.append(Paragraph("<b>Note:</b> These IDs are created for development and UAT testing only. Please change default passwords after initial login.", styles['Normal']))
    
    doc.build(elements)
    print("PDF Generated: Test_Credentials.pdf")

if __name__ == "__main__":
    create_test_credentials()
