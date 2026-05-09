from django.db import transaction
from rest_framework import serializers as drf_serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.accounts.models import UserProfile
from apps.escalations.models import EscalationLog
from apps.notifications.models import Notification
from .models import Ticket
from .permissions import (
    CanCreateTicket,
    CanViewTickets,
    IsBranchSupervisorOrAbove,
    IsBranchTechnicianOrAbove,
)
from .serializers import (
    TicketCreateSerializer,
    TicketDetailSerializer,
    TicketListSerializer,
)


class TicketViewSet(ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        qs = (
            Ticket.objects.select_related(
                'branch', 'assigned_to', 'submitted_by', 'major_incident'
            )
            .prefetch_related('escalation_logs')
            .order_by('-created_at')
        )

        if user.role == 'agent':
            qs = qs.filter(submitted_by=user)
        elif user.role != 'main_it_manager':
            qs = qs.filter(branch=user.branch)

        params = self.request.query_params
        if params.get('branch'):
            qs = qs.filter(branch__id=params['branch'])
        if params.get('shift'):
            qs = qs.filter(shift=params['shift'])
        if params.get('priority'):
            qs = qs.filter(priority=params['priority'])
        if params.get('category'):
            qs = qs.filter(category=params['category'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('escalated') is not None:
            val = params['escalated'].lower()
            if val in ('true', '1'):
                qs = qs.filter(escalated=True)
            elif val in ('false', '0'):
                qs = qs.filter(escalated=False)

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return TicketCreateSerializer
        if self.action == 'retrieve':
            return TicketDetailSerializer
        return TicketListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        # The post_save routing signal uses queryset.update(), which does not
        # touch the in-memory instance. Re-fetch from DB so assigned_to (and any
        # other signal-written fields) appear correctly in the 201 response.
        instance = Ticket.objects.select_related(
            'branch', 'assigned_to', 'submitted_by', 'major_incident'
        ).get(pk=instance.pk)
        return Response(
            self.get_serializer(instance).data,
            status=status.HTTP_201_CREATED,
        )

    def get_permissions(self):
        if self.action == 'create':
            return [CanCreateTicket()]
        if self.action in ('list', 'retrieve'):
            return [CanViewTickets()]
        if self.action in ('update_status', 'assign'):
            return [IsBranchTechnicianOrAbove()]
        if self.action == 'escalate':
            return [IsBranchSupervisorOrAbove()]
        return [IsBranchTechnicianOrAbove()]

    # PATCH /api/v1/tickets/{id}/status/
    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        ticket = self.get_object()
        new_status = request.data.get('status')
        valid = [c[0] for c in Ticket.Status.choices]
        if new_status not in valid:
            raise drf_serializers.ValidationError(
                {'status': f'Must be one of: {", ".join(valid)}'}
            )
        ticket.status = new_status
        ticket.save(update_fields=['status', 'updated_at'])
        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

    # PATCH /api/v1/tickets/{id}/assign/
    @action(detail=True, methods=['patch'], url_path='assign')
    def assign(self, request, pk=None):
        ticket = self.get_object()
        technician_id = request.data.get('assigned_to')
        if not technician_id:
            raise drf_serializers.ValidationError({'assigned_to': 'This field is required.'})

        try:
            technician = UserProfile.objects.get(
                pk=technician_id,
                role__in=['branch_technician', 'branch_supervisor'],
            )
        except UserProfile.DoesNotExist:
            raise drf_serializers.ValidationError(
                {'assigned_to': 'Technician not found.'}
            )

        ticket.assigned_to = technician
        ticket.status = Ticket.Status.IN_PROGRESS
        ticket.save(update_fields=['assigned_to', 'status', 'updated_at'])
        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

    # POST /api/v1/tickets/{id}/escalate/
    @action(detail=True, methods=['post'], url_path='escalate')
    def escalate(self, request, pk=None):
        ticket = self.get_object()
        reason = request.data.get('reason', '').strip()
        if not reason:
            raise drf_serializers.ValidationError({'reason': 'This field is required.'})

        with transaction.atomic():
            ticket.escalated = True
            ticket.save(update_fields=['escalated', 'updated_at'])

            EscalationLog.objects.create(
                ticket=ticket,
                escalated_by=request.user,
                reason=reason,
            )

            managers = UserProfile.objects.filter(role='main_it_manager')
            Notification.objects.bulk_create([
                Notification(
                    recipient=manager,
                    notification_type=Notification.NotificationType.ESCALATION_TRIGGERED,
                    ticket=ticket,
                    message=f'Ticket "{ticket.title}" has been escalated: {reason}',
                )
                for manager in managers
            ])

        return Response(
            TicketDetailSerializer(ticket, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )
