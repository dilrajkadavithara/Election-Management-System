from django.contrib import admin
from .models import Constituency, Booth, Voter, UserProfile

@admin.register(Constituency)
class ConstituencyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'created_at')
    search_fields = ('name', 'code')
    ordering = ('name',)

@admin.register(Booth)
class BoothAdmin(admin.ModelAdmin):
    list_display = ('number', 'constituency', 'name', 'created_at')
    list_filter = ('constituency',)
    search_fields = ('number', 'name', 'constituency__name')
    ordering = ('constituency', 'number')

@admin.register(Voter)
class VoterAdmin(admin.ModelAdmin):
    list_display = ('serial_no', 'epic_id', 'full_name', 'gender', 'age', 'booth', 'status')
    list_filter = ('gender', 'status', 'booth__constituency')
    search_fields = ('epic_id', 'full_name', 'house_name', 'relation_name')
    ordering = ('booth', 'serial_no')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('booth', 'serial_no', 'epic_id', 'full_name', 'status')
        }),
        ('Demographics', {
            'fields': ('gender', 'age', 'relation_type', 'relation_name')
        }),
        ('Address', {
            'fields': ('house_no', 'house_name')
        }),
        ('Audit Trail', {
            'fields': ('source_file', 'original_serial', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'get_constituencies', 'get_booths')
    list_filter = ('role',)
    search_fields = ('user__username', 'user__email')
    filter_horizontal = ('assigned_constituencies', 'assigned_booths')
    
    fieldsets = (
        ('User Details', {
            'fields': ('user', 'role')
        }),
        ('Access Control', {
            'fields': ('assigned_constituencies', 'assigned_booths'),
            'description': 'Assign constituencies for CONSTITUENCY role, booths for BOOTH role. MANAGER role ignores these restrictions.'
        }),
    )
    
    def get_constituencies(self, obj):
        return ", ".join([c.name for c in obj.assigned_constituencies.all()[:3]])
    get_constituencies.short_description = 'Assigned Constituencies'
    
    def get_booths(self, obj):
        booths = obj.assigned_booths.all()[:3]
        return ", ".join([f"{b.constituency.name}-{b.number}" for b in booths])
    get_booths.short_description = 'Assigned Booths'
