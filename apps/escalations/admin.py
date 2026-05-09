from django.contrib import admin
from .models import EscalationLog


@admin.register(EscalationLog)
class EscalationLogAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'escalated_by', 'escalated_at', 'resolved_by', 'resolved_at')
    list_filter = ('escalated_at',)
    search_fields = ('reason', 'notes')
    readonly_fields = ('escalated_at',)
