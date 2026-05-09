from django.contrib import admin
from .models import RoutingRule


@admin.register(RoutingRule)
class RoutingRuleAdmin(admin.ModelAdmin):
    list_display = ('category', 'assigned_team_name', 'target_role', 'branch', 'priority_order')
    list_filter = ('category', 'branch')
    search_fields = ('keywords', 'assigned_team_name')
