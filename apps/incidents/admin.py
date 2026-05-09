from django.contrib import admin
from .models import MajorIncident


@admin.register(MajorIncident)
class MajorIncidentAdmin(admin.ModelAdmin):
    list_display = ('title', 'branch', 'floor_team', 'status', 'reported_by', 'created_at')
    list_filter = ('status', 'branch')
    search_fields = ('title', 'description', 'floor_team')
    readonly_fields = ('created_at', 'updated_at')
