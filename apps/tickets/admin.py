from django.contrib import admin
from .models import Ticket


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'priority', 'status', 'branch', 'submitted_by', 'created_at')
    list_filter = ('status', 'priority', 'category', 'shift', 'branch', 'escalated')
    search_fields = ('title', 'description')
    readonly_fields = ('created_at', 'updated_at', 'sla_deadline')
