from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.postgres.indexes import GistIndex

class Constituency(models.Model):
    name = models.CharField(max_length=200, unique=True, help_text="e.g. Trippunithura")
    code = models.CharField(max_length=50, blank=True, help_text="e.g. TPA")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Constituencies"
        ordering = ['name']

    def __str__(self):
        return self.name

class LocalBody(models.Model):
    TYPES = [
        ('PANCHAYAT', 'Panchayath'),
        ('MUNICIPALITY', 'Municipality'),
        ('CORPORATION', 'Corporation'),
    ]
    constituency = models.ForeignKey(Constituency, on_delete=models.CASCADE, related_name='local_bodies')
    name = models.CharField(max_length=200)
    body_type = models.CharField(max_length=20, choices=TYPES, default='PANCHAYAT')
    head_name = models.CharField(max_length=200, blank=True, null=True, help_text="Official in charge of this Local Body")
    head_phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Local Bodies"
        unique_together = ('constituency', 'name', 'body_type')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_body_type_display()})"

class Booth(models.Model):
    constituency = models.ForeignKey(Constituency, on_delete=models.CASCADE, related_name='booths')
    local_body = models.ForeignKey(LocalBody, on_delete=models.SET_NULL, null=True, blank=True, related_name='booths')
    number = models.CharField(max_length=50, help_text="Booth Number (e.g. 001, 145A)")
    polling_station_no = models.CharField(max_length=100, blank=True, help_text="Polling Station Number (if different from booth number)")
    polling_station_name = models.CharField(max_length=1000, blank=True, help_text="Physical location of the polling station")
    head_name = models.CharField(max_length=200, blank=True, null=True, help_text="Primary contact person for this booth")
    head_phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Prevent duplicate booths for the same constituency
        unique_together = ('constituency', 'number')
        ordering = ['constituency', 'number']

    def __str__(self):
        return f"{self.constituency.name} - Booth {self.number}"

class Voter(models.Model):
    SERIAL_STATUS = [
        ('VERIFIED', 'Verified'),
        ('FLAGGED', 'Flagged for Review'),
        ('AUTO_HEALED', 'Auto-Healed Serials'),
    ]

    # Links
    booth = models.ForeignKey(Booth, on_delete=models.CASCADE, related_name='voters')
    
    # Core Data
    serial_no = models.PositiveIntegerField()
    epic_id = models.CharField(max_length=50, db_index=True)  # Indexed for speed
    full_name = models.CharField(max_length=1000, db_index=True) # Indexed for search
    
    # Relations
    relation_type = models.CharField(max_length=50, blank=True) # Father, Mother, Husband
    relation_name = models.CharField(max_length=1000, blank=True)
    
    # Demographics
    house_no = models.CharField(max_length=100, blank=True)
    house_name = models.CharField(max_length=1000, blank=True, db_index=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    
    # Custom Fields (Actionable Campaign Intelligence)
    phone_no = models.CharField(max_length=20, blank=True, null=True, db_index=True)
    is_head_of_family = models.BooleanField(default=False, db_index=True)
    
    LOCATION_CHOICES = [
        ('LOCAL', 'Local'),
        ('ABROAD', 'Abroad'),
        ('STATE', 'Another State'),
        ('DISTRICT', 'Another District'),
    ]
    current_location = models.CharField(max_length=20, choices=LOCATION_CHOICES, db_index=True, null=True, blank=True)

    LEANING_CHOICES = [
        ('UDF', 'UDF'),
        ('LDF', 'LDF'),
        ('NDA', 'NDA'),
        ('NEUTRAL', 'Neutral'),
    ]
    voter_leaning = models.CharField(max_length=20, choices=LEANING_CHOICES, db_index=True, null=True, blank=True)

    PROBABILITY_CHOICES = [
        ('CONFIRMED', 'Confirmed'),
        ('LIKELY', 'Likely'),
        ('UNLIKELY', 'Unlikely'),
        ('OUT_OF_STATION', 'Out of Station'),
    ]
    voting_probability = models.CharField(max_length=20, choices=PROBABILITY_CHOICES, db_index=True, null=True, blank=True)
    
    # Election Day Arrangement
    has_voted = models.BooleanField(default=False, db_index=True)
    voted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    
    # Audit Trail
    source_file = models.CharField(max_length=1000, help_text="Original PDF Filename")
    original_serial = models.CharField(max_length=50, blank=True, help_text="Raw OCR value if needed")
    status = models.CharField(max_length=20, choices=SERIAL_STATUS, default='VERIFIED')
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_voters', help_text="User who uploaded this batch")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['booth', 'serial_no']
        permissions = [
            ("can_export_data", "Can export voter data to Excel"),
        ]
        indexes = [
            GistIndex(fields=['full_name'], name='voter_name_gist_trgm', opclasses=['gist_trgm_ops']),
            GistIndex(fields=['house_name'], name='voter_house_gist_trgm', opclasses=['gist_trgm_ops']),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.epic_id})"

class PoliticalParty(models.Model):
    name = models.CharField(max_length=200, unique=True)
    short_label = models.CharField(max_length=10, blank=True, help_text="e.g. INC, CPIM, BJP")
    symbol_image = models.CharField(max_length=300, help_text="Path or filename of the party symbol")
    primary_color = models.CharField(max_length=20, default="#000080", help_text="Primary Hex Color (e.g. #000080)")
    accent_gradient = models.CharField(max_length=500, default="linear-gradient(to bottom, #FF9933, #ffffff, #138808)", help_text="CSS gradient string")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Political Parties"

    def __str__(self):
        return self.name

from django.contrib.auth.models import User

class UserProfile(models.Model):
    """
    Extends Django User model with role-based access control.
    Supports 7-tier hierarchy:
    1. SUPERUSER: Global Admin
    2. MANAGER: Global Monitor & Data Manager (Full Access: Upload/OCR/Edit/Export)
    3. OPERATOR: Data Entry (Upload/OCR/Edit - Own batches only)
    4. CONSTITUENCY_ADMIN: Constituency Scope
    5. LOCAL_BODY_HEAD: Local Body Scope (Municipality/Panchayat - 80-120 booths)
    6. ZONE_COMMANDER: Cluster Scope (10-15 Booths)
    7. BOOTH_AGENT: Single/Multi Booth Scope
    """
    ROLE_CHOICES = [
        ('SUPERUSER', "Superuser (Global Admin)"),
        ('MANAGER', "Manager (Global Monitor)"),
        ('OPERATOR', "Operator (Data Entry - Own Batches)"),
        ('CONSTITUENCY_ADMIN', 'Constituency Admin'),
        ('LOCAL_BODY_HEAD', 'Local Body Head'),
        ('ZONE_COMMANDER', 'Zone Commander'),
        ('BOOTH_AGENT', 'Booth Agent'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='BOOTH_AGENT')
    
    # Profile Info
    full_name = models.CharField(max_length=200, blank=True, null=True, help_text="Common name for display")
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    
    # Granular Permissions
    can_download = models.BooleanField(default=False, help_text="Can this user export CSV/Excel?")
    can_upload = models.BooleanField(default=False, help_text="Can access OCR Engine & upload lists")
    can_verify = models.BooleanField(default=True, help_text="Can approve/save OCR results to DB")
    can_edit_voters = models.BooleanField(default=True, help_text="Can update voter intelligence & phone numbers")
    can_send_broadcasts = models.BooleanField(default=False, help_text="Can access Communication Hub & send messages")
    can_manage_system = models.BooleanField(default=False, help_text="Can add locations & manage parties")
    
    # Access Restrictions (Scopes)
    assigned_constituencies = models.ManyToManyField(
        Constituency, 
        blank=True,
        related_name='assigned_users'
    )
    assigned_local_bodies = models.ManyToManyField(
        LocalBody,
        blank=True,
        related_name='assigned_users'
    )
    assigned_booths = models.ManyToManyField(
        Booth,
        blank=True,
        related_name='assigned_users'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
    
    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"
    
    def get_accessible_voters(self):
        """
        Returns queryset of voters this user can access based on their role and scope.
        Strict Enforcement via Backend.
        """
        if self.role == 'SUPERUSER':
            return Voter.objects.all()
        
        elif self.role == 'MANAGER':
            # Manager sees all but cannot edit (Edit restriction handled in View)
            return Voter.objects.all()
        
        elif self.role == 'OPERATOR':
            # Operator sees only voters from batches they personally uploaded
            return Voter.objects.filter(created_by=self.user)
            
        elif self.role == 'CONSTITUENCY_ADMIN':
            return Voter.objects.filter(booth__constituency__in=self.assigned_constituencies.all())
        
        elif self.role == 'LOCAL_BODY_HEAD':
            # Local Body Head manages all booths in their municipality/panchayat
            return Voter.objects.filter(booth__local_body__in=self.assigned_local_bodies.all())
            
        elif self.role == 'ZONE_COMMANDER':
            # Zone Commander manages a cluster of booths
            # We use assigned_booths to define the "Zone"
            return Voter.objects.filter(booth__in=self.assigned_booths.all())
            
        elif self.role == 'BOOTH_AGENT':
            return Voter.objects.filter(booth__in=self.assigned_booths.all())
            
        return Voter.objects.none()

class MessageTemplate(models.Model):
    TYPES = [
        ('WA', 'WhatsApp'),
        ('SMS', 'SMS'),
        ('CALL', 'Voice Call/IVR'),
    ]
    name = models.CharField(max_length=200)
    msg_type = models.CharField(max_length=10, choices=TYPES)
    content = models.TextField(help_text="Message body with {{voter_name}} placeholders")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.msg_type})"

class CommunicationLog(models.Model):
    STATUS = [
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('FAILED', 'Failed'),
        ('READ', 'Read/Answered'),
    ]
    voter = models.ForeignKey(Voter, on_delete=models.CASCADE, related_name='comm_logs')
    template = models.ForeignKey(MessageTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    msg_type = models.CharField(max_length=10) # Duplicate for convenience
    status = models.CharField(max_length=20, choices=STATUS, default='PENDING')
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    response_metadata = models.JSONField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']

class DailyProgress(models.Model):
    """
    Tracks tactical metrics on a daily basis for War Room analysis.
    This allows monitoring of digitization speed and political conversion rates.
    """
    booth = models.ForeignKey(Booth, on_delete=models.CASCADE, related_name='tracking_stats')
    date = models.DateField(db_index=True)
    
    # Cumulative Totals (Snapshots)
    digitized_total = models.PositiveIntegerField(default=0, help_text="Total voters digitized in this booth so far")
    udf_total = models.PositiveIntegerField(default=0, help_text="Total confirmed UDF supporters")
    ldf_total = models.PositiveIntegerField(default=0)
    nda_total = models.PositiveIntegerField(default=0)
    neutral_total = models.PositiveIntegerField(default=0)
    
    # Daily Delta (Activity of the day)
    new_digitized = models.IntegerField(default=0, help_text="Net new digitized today")
    new_udf = models.IntegerField(default=0, help_text="Net new UDF converts today (from Neutrals/Others)")
    new_ldf = models.IntegerField(default=0)
    new_nda = models.IntegerField(default=0)
    
    # Analytic Snapshot
    winning_chance = models.FloatField(default=0.0, help_text="Winning probability based on current confirmed + likely trend")
    
    class Meta:
        unique_together = ('booth', 'date')
        ordering = ['-date', 'booth']
        verbose_name_plural = "Daily Progress Tracking"

    def __str__(self):
        return f"{self.booth.number} - {self.date}"
