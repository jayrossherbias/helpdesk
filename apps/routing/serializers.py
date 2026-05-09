from rest_framework import serializers
from .models import RoutingRule


class RoutingRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutingRule
        fields = (
            'id', 'category', 'keywords', 'assigned_team_name',
            'target_role', 'branch', 'priority_order',
        )
