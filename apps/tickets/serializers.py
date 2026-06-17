from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import UserProfile
from apps.escalations.models import EscalationLog
from .models import Ticket, TicketLog, SystemSettings


class _BranchSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()


class _UserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    display_name = serializers.SerializerMethodField()

    def get_display_name(self, obj):
        return obj.get_full_name().strip() or obj.username


class _MajorIncidentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()


class _RelatedTicketSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    ticket_number = serializers.CharField()
    title = serializers.CharField()
    category = serializers.CharField()
    status = serializers.CharField()


def _compute_sla_status(ticket):
    if not ticket.sla_deadline:
        return 'on_track'
    if ticket.status == Ticket.Status.RESOLVED:
        resolved = ticket.resolved_at or ticket.updated_at
        if resolved and resolved > ticket.sla_deadline:
            return 'resolved_breached'
        return 'resolved_within_sla'
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
    submitted_by = _UserSerializer(read_only=True)
    related_to = _RelatedTicketSerializer(read_only=True)
    sla_status = serializers.SerializerMethodField()
    escalation_resolved = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            'id', 'ticket_number', 'title', 'category', 'priority', 'status', 'urgency',
            'branch', 'agents_affected', 'floor_team', 'is_floor_wide', 'sla_deadline', 'sla_status',
            'assigned_to', 'submitted_by', 'escalated', 'escalation_resolved', 'shift', 'created_at',
            'resolved_at', 'related_to', 'resolution_notes',
        )

    def get_sla_status(self, obj):
        return _compute_sla_status(obj)

    def get_escalation_resolved(self, obj):
        if not obj.escalated:
            return False
        log = obj.escalation_logs.order_by('-escalated_at').first()
        return bool(log and log.resolved_at)


class _TicketLogSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()

    class Meta:
        model = TicketLog
        fields = ('id', 'action', 'actor', 'created_at')

    def get_actor(self, obj):
        if not obj.actor:
            return 'System'
        return obj.actor.get_full_name().strip() or obj.actor.username


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
    logs = _TicketLogSerializer(many=True, read_only=True)
    follow_ups = serializers.SerializerMethodField()

    class Meta(TicketListSerializer.Meta):
        fields = TicketListSerializer.Meta.fields + (
            'description', 'floor_team', 'is_floor_wide',
            'submitted_by', 'major_incident', 'escalation_log', 'updated_at', 'logs',
            'follow_ups', 'resolution_notes',
        )

    def get_follow_ups(self, obj):
        qs = obj.follow_ups.only('id', 'ticket_number', 'title', 'category', 'status')
        return _RelatedTicketSerializer(qs, many=True).data

    def get_escalation_log(self, obj):
        log = obj.escalation_logs.order_by('-escalated_at').first()
        if not log:
            return None
        return _EscalationLogSerializer(log).data


class TicketCreateSerializer(serializers.ModelSerializer):
    # description is displayed as optional in the UI — accept empty strings
    description = serializers.CharField(required=False, allow_blank=True, default='')
    # accepts a ticket_number string; resolved to related_to FK on create
    related_ticket_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    # read-only — set by backend
    ticket_number = serializers.CharField(read_only=True)
    priority = serializers.CharField(read_only=True)
    sla_deadline = serializers.DateTimeField(read_only=True)
    assigned_to = _UserSerializer(read_only=True)
    branch = _BranchSerializer(read_only=True)
    related_to = _RelatedTicketSerializer(read_only=True)
    sla_status = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            'id', 'ticket_number', 'title', 'description', 'category', 'shift',
            'agents_affected', 'floor_team', 'is_floor_wide', 'major_incident',
            'urgency', 'related_ticket_number',
            # read-only
            'priority', 'sla_deadline', 'assigned_to', 'branch', 'sla_status',
            'status', 'escalated', 'created_at', 'related_to',
        )
        read_only_fields = ('id', 'ticket_number', 'status', 'escalated', 'created_at', 'related_to')

    def get_sla_status(self, obj):
        return _compute_sla_status(obj)

    def create(self, validated_data):
        request = self.context['request']
        if not request.user.branch:
            raise serializers.ValidationError(
                {'branch': 'Your account has no branch assigned.'}
            )
        related_ticket_number = validated_data.pop('related_ticket_number', '').strip()
        validated_data['branch'] = request.user.branch
        validated_data['submitted_by'] = request.user
        if related_ticket_number:
            try:
                validated_data['related_to'] = Ticket.objects.get(
                    ticket_number=related_ticket_number
                )
            except Ticket.DoesNotExist:
                raise serializers.ValidationError(
                    {'related_ticket_number': f'No ticket found with number "{related_ticket_number}".'}
                )
        with transaction.atomic():
            validated_data['ticket_number'] = Ticket.generate_ticket_number(
                category=validated_data['category'],
                submitter=request.user,
            )
            return super().create(validated_data)


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = ['auto_routing', 'auto_priority', 'email_notifications', 'sla_alerts']
