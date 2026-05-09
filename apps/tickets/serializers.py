from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import UserProfile
from apps.escalations.models import EscalationLog
from .models import Ticket


class _BranchSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()


class _UserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


class _MajorIncidentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()


def _compute_sla_status(ticket):
    if not ticket.sla_deadline or ticket.status == Ticket.Status.RESOLVED:
        return 'on_track'
    now = timezone.now()
    if ticket.sla_deadline <= now:
        return 'breached'
    total_window = (ticket.sla_deadline - ticket.created_at).total_seconds()
    time_remaining = (ticket.sla_deadline - now).total_seconds()
    if total_window > 0 and time_remaining < total_window * 0.25:
        return 'at_risk'
    return 'on_track'


class TicketListSerializer(serializers.ModelSerializer):
    branch = _BranchSerializer(read_only=True)
    assigned_to = _UserSerializer(read_only=True)
    sla_status = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            'id', 'title', 'category', 'priority', 'status',
            'branch', 'agents_affected', 'sla_deadline', 'sla_status',
            'assigned_to', 'escalated', 'shift', 'created_at',
        )

    def get_sla_status(self, obj):
        return _compute_sla_status(obj)


class _EscalationLogSerializer(serializers.ModelSerializer):
    escalated_by = serializers.SerializerMethodField()

    class Meta:
        model = EscalationLog
        fields = ('reason', 'escalated_by', 'escalated_at', 'resolved_at', 'notes')

    def get_escalated_by(self, obj):
        if obj.escalated_by:
            return {'username': obj.escalated_by.username}
        return None


class TicketDetailSerializer(TicketListSerializer):
    submitted_by = _UserSerializer(read_only=True)
    major_incident = _MajorIncidentSerializer(read_only=True)
    escalation_log = serializers.SerializerMethodField()

    class Meta(TicketListSerializer.Meta):
        fields = TicketListSerializer.Meta.fields + (
            'description', 'floor_team', 'is_floor_wide',
            'submitted_by', 'major_incident', 'escalation_log', 'updated_at',
        )

    def get_escalation_log(self, obj):
        log = obj.escalation_logs.order_by('-escalated_at').first()
        if not log:
            return None
        return _EscalationLogSerializer(log).data


class TicketCreateSerializer(serializers.ModelSerializer):
    # read-only — set by backend
    priority = serializers.CharField(read_only=True)
    sla_deadline = serializers.DateTimeField(read_only=True)
    assigned_to = _UserSerializer(read_only=True)
    branch = _BranchSerializer(read_only=True)
    sla_status = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            'id', 'title', 'description', 'category', 'shift',
            'agents_affected', 'floor_team', 'is_floor_wide', 'major_incident',
            # read-only
            'priority', 'sla_deadline', 'assigned_to', 'branch', 'sla_status',
            'status', 'escalated', 'created_at',
        )
        read_only_fields = ('id', 'status', 'escalated', 'created_at')

    def get_sla_status(self, obj):
        return _compute_sla_status(obj)

    def create(self, validated_data):
        request = self.context['request']
        if not request.user.branch:
            raise serializers.ValidationError(
                {'branch': 'Your account has no branch assigned.'}
            )
        validated_data['branch'] = request.user.branch
        validated_data['submitted_by'] = request.user
        return super().create(validated_data)
