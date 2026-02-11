from django.db import models
from django.utils.translation import gettext_lazy as _

class Constituency(models.Model):
    name = models.CharField(max_length=200, unique=True, help_text="e.g. Trippunithura")
    code = models.CharField(max_length=50, blank=True, help_text="e.g. TPA")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Constituencies"
        ordering = ['name']

    def __str__(self):
        return self.name

class Booth(models.Model):
    constituency = models.ForeignKey(Constituency, on_delete=models.CASCADE, related_name='booths')
    number = models.PositiveIntegerField(help_text="Booth Number")
    name = models.CharField(max_length=300, blank=True, help_text="Optional name/location of the booth")
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
    full_name = models.CharField(max_length=300, db_index=True) # Indexed for search
    
    # Relations
    relation_type = models.CharField(max_length=50, blank=True) # Father, Mother, Husband
    relation_name = models.CharField(max_length=300, blank=True)
    
    # Demographics
    house_no = models.CharField(max_length=100, blank=True)
    house_name = models.CharField(max_length=300, blank=True, db_index=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    
    # Audit Trail
    source_file = models.CharField(max_length=300, help_text="Original PDF Filename")
    original_serial = models.CharField(max_length=50, blank=True, help_text="Raw OCR value if needed")
    status = models.CharField(max_length=20, choices=SERIAL_STATUS, default='VERIFIED')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['booth', 'serial_no']
        permissions = [
            ("can_export_data", "Can export voter data to Excel"),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.epic_id})"


from django.contrib.auth.models import User

class UserProfile(models.Model):
    """
    Extends Django User model with role-based access control.
    Supports 3-tier hierarchy: Bird's Eye View, Constituency Level, Booth Level
    """
    ROLE_CHOICES = [
        ('MANAGER', "Bird's Eye View (All Data)"),
        ('CONSTITUENCY', 'Constituency Level Access'),
        ('BOOTH', 'Booth Level Access'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='BOOTH')
    
    # Access Restrictions
    assigned_constituencies = models.ManyToManyField(
        Constituency, 
        blank=True,
        related_name='assigned_users',
        help_text="Constituencies this user can access (for CONSTITUENCY role)"
    )
    assigned_booths = models.ManyToManyField(
        Booth,
        blank=True,
        related_name='assigned_users',
        help_text="Specific booths this user can access (for BOOTH role)"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
    
    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"
    
    def get_accessible_voters(self):
        """
        Returns queryset of voters this user can access based on their role.
        """
        if self.role == 'MANAGER':
            # Bird's Eye View - all voters
            return Voter.objects.all()
        elif self.role == 'CONSTITUENCY':
            # Constituency Level - only assigned constituencies
            return Voter.objects.filter(
                booth__constituency__in=self.assigned_constituencies.all()
            )
        elif self.role == 'BOOTH':
            # Booth Level - only assigned booths
            return Voter.objects.filter(
                booth__in=self.assigned_booths.all()
            )
        else:
            # No access by default
            return Voter.objects.none()
