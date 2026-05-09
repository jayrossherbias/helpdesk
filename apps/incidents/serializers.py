from rest_framework import serializers
from .models import MajorIncident


class _BranchSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()


class MajorIncidentSerializer(serializers.ModelSerializer):
    branch = _BranchSerializer(read_only=True)
    ticket_count = serializers.SerializerMethodField()

    class Meta:
        model = MajorIncident
        fields = ('id', 'title', 'floor_team', 'branch', 'status', 'created_at', 'ticket_count')

    def get_ticket_count(self, obj):
        return obj.tickets.count()
