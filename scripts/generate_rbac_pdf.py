from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_pdf():
    doc = SimpleDocTemplate("RBAC_Roles_and_Permissions.pdf", pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=30,
        alignment=1
    )
    elements.append(Paragraph("Election Engine - RBAC Specification", title_style))
    elements.append(Paragraph("Date: February 15, 2026", styles['Normal']))
    elements.append(Spacer(1, 0.5 * inch))

    # --- Developer Side Section ---
    elements.append(Paragraph("1. Developer Side (Internal Team)", styles['Heading2']))
    dev_data = [
        ["Role", "Scope", "Key Permissions"],
        ["SUPERUSER", "Global", "Full CRUD, OCR, User Mgmt, Audit, Settings"],
        ["MANAGER", "Global", "Stats, Lists, Reports, Export, OCR, Data Editing"],
        ["OPERATOR", "Owner-Only", "Upload PDF, Run OCR, Correct Data (Own Batches)"]
    ]
    t1 = Table(dev_data, colWidths=[1.2*inch, 1.2*inch, 3*inch])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
    ]))
    elements.append(t1)
    elements.append(Spacer(1, 0.4 * inch))

    # --- Client Side Section ---
    elements.append(Paragraph("2. Client Side (Campaign Hierarchy)", styles['Heading2']))
    client_data = [
        ["Role", "Scope", "Key Permissions"],
        ["CONSTITUENCY ADMIN", "Constituency", "View Analytics, Export, Manage Subordinates"],
        ["LOCAL BODY HEAD", "Municipality", "View LB Stats (80-120 booths), Manage Zones"],
        ["ZONE COMMANDER", "Zone", "View Cluster Stats (10-15 booths), Manage Agents"],
        ["BOOTH AGENT", "Booth", "Primary Editor (Intel: Phone, Leaning, Location)"]
    ]
    t2 = Table(client_data, colWidths=[1.5*inch, 1.2*inch, 3*inch])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2563eb")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
    ]))
    elements.append(t2)
    elements.append(Spacer(1, 0.4 * inch))

    # --- Summary Note ---
    elements.append(Paragraph("Key Enforcement Rules:", styles['Heading3']))
    rules = [
        "- <b>Read-Only Managers:</b> Cannot edit voter records to preserve integrity.",
        "- <b>Operator Isolation:</b> Operators only see what they personally upload.",
        "- <b>Constituency Locking:</b> Client roles cannot see cross-constituency data.",
        "- <b>Field Intelligence:</b> Booth Agents are the only role focused on updating field data."
    ]
    for r in rules:
        elements.append(Paragraph(r, styles['Normal']))
        elements.append(Spacer(1, 0.1 * inch))

    doc.build(elements)
    print("PDF Generated: RBAC_Roles_and_Permissions.pdf")

if __name__ == "__main__":
    generate_pdf()
