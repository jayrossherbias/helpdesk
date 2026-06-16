from django.db import transaction
from rest_framework import serializers as drf_serializers, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.accounts.models import UserProfile
from apps.escalations.models import EscalationLog
from apps.notifications.models import Notification
from apps.notifications.service import NotificationService
from .models import Ticket, TicketLog, SystemSettings
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
    SystemSettingsSerializer,
)


class TicketViewSet(ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        qs = (
            Ticket.objects.select_related(
                'branch', 'assigned_to', 'submitted_by', 'major_incident', 'related_to'
            )
            .prefetch_related('escalation_logs', 'logs', 'follow_ups')
            .order_by('-created_at')
        )

        if user.role == 'agent':
            qs = qs.filter(submitted_by=user)
        elif user.role not in ('main_it_manager', 'main_it_supervisor'):
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
        if self.action in ('update_status', 'assign', 'update_priority', 'update_resolution'):
            return [IsBranchTechnicianOrAbove()]
        if self.action in ('escalate', 'shift_handover'):
            return [IsBranchSupervisorOrAbove()]
        if self.action == 'resolve_escalation':
            return [IsBranchSupervisorOrAbove()]
        return [IsBranchTechnicianOrAbove()]

    # PATCH /api/v1/tickets/{id}/status/
    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        from django.utils import timezone
        ticket = self.get_object()
        new_status = request.data.get('status')
        valid = [c[0] for c in Ticket.Status.choices]
        if new_status not in valid:
            raise drf_serializers.ValidationError(
                {'status': f'Must be one of: {", ".join(valid)}'}
            )
        if ticket.status == new_status:
            return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

        ticket.status = new_status
        update_fields = ['status', 'updated_at']
        if new_status == Ticket.Status.RESOLVED and not ticket.resolved_at:
            ticket.resolved_at = timezone.now()
            update_fields.append('resolved_at')
        ticket.save(update_fields=update_fields)

        status_label = ticket.get_status_display()
        TicketLog.objects.create(
            ticket=ticket,
            action=f'Status changed to {status_label}.',
            actor=request.user,
        )

        if new_status == Ticket.Status.RESOLVED:
            NotificationService.notify_resolved(ticket)
        else:
            NotificationService.notify_status_update(ticket, new_status)

        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

    # PATCH /api/v1/tickets/{id}/resolve-escalation/
    @action(detail=True, methods=['patch'], url_path='resolve-escalation')
    def resolve_escalation(self, request, pk=None):
        from django.utils import timezone
        ticket = self.get_object()

        if not ticket.escalated:
            raise drf_serializers.ValidationError({'detail': 'This ticket has no active escalation.'})

        escalation_log = EscalationLog.objects.filter(
            ticket=ticket, resolved_at__isnull=True
        ).order_by('-escalated_at').first()

        if not escalation_log:
            raise drf_serializers.ValidationError({'detail': 'Escalation is already resolved.'})

        with transaction.atomic():
            now = timezone.now()
            escalation_log.resolved_by = request.user
            escalation_log.resolved_at = now
            escalation_log.save(update_fields=['resolved_by', 'resolved_at'])

            update_fields = ['updated_at']
            if ticket.status != Ticket.Status.RESOLVED:
                ticket.status = Ticket.Status.RESOLVED
                ticket.resolved_at = now
                update_fields.extend(['status', 'resolved_at'])
            ticket.save(update_fields=update_fields)

            actor_name = request.user.get_full_name().strip() or request.user.username
            TicketLog.objects.create(
                ticket=ticket,
                action=f'Escalation resolved by {actor_name} (Main Branch).',
                actor=request.user,
            )
            NotificationService.notify_resolved(ticket)

            # Cascade: auto-resolve the parent ticket if this was a follow-up
            parent = ticket.related_to
            if parent and parent.status != Ticket.Status.RESOLVED:
                parent.status = Ticket.Status.RESOLVED
                parent.resolved_at = now
                parent.save(update_fields=['status', 'resolved_at', 'updated_at'])
                TicketLog.objects.create(
                    ticket=parent,
                    action=(
                        f'Auto-resolved: linked follow-up ticket {ticket.ticket_number} '
                        f'was resolved via escalation by {actor_name} (Main Branch).'
                    ),
                    actor=request.user,
                )
                NotificationService.notify_resolved(parent)

        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

    # PATCH /api/v1/tickets/{id}/priority/
    @action(detail=True, methods=['patch'], url_path='priority')
    def update_priority(self, request, pk=None):
        ticket = self.get_object()
        new_priority = request.data.get('priority')
        valid = [c[0] for c in Ticket.Priority.choices]
        if new_priority not in valid:
            raise drf_serializers.ValidationError(
                {'priority': f'Must be one of: {", ".join(valid)}'}
            )
        old_priority = ticket.priority
        ticket.priority = new_priority
        ticket.save(update_fields=['priority', 'updated_at'])

        actor_name = request.user.get_full_name().strip() or request.user.username
        TicketLog.objects.create(
            ticket=ticket,
            action=f'Priority changed from {old_priority} to {new_priority} by {actor_name}.',
            actor=request.user,
        )

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

        tech_name = technician.get_full_name().strip() or technician.username
        TicketLog.objects.create(
            ticket=ticket,
            action=f'Manually assigned to {tech_name} · status set to In Progress.',
            actor=request.user,
        )

        NotificationService.notify_assignment(ticket)
        NotificationService.notify_status_update(ticket, Ticket.Status.IN_PROGRESS)

        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

    # PATCH /api/v1/tickets/{id}/flag-floor-wide/
    @action(detail=True, methods=['patch'], url_path='flag-floor-wide')
    def flag_floor_wide(self, request, pk=None):
        ticket = self.get_object()

        if ticket.status == Ticket.Status.RESOLVED:
            raise drf_serializers.ValidationError(
                {'detail': 'Cannot update a resolved ticket.'}
            )
        if ticket.is_floor_wide:
            raise drf_serializers.ValidationError(
                {'detail': 'Ticket is already marked as a floor-wide incident.'}
            )

        floor_team = request.data.get('floor_team', '').strip()

        ticket.is_floor_wide = True
        update_fields = ['is_floor_wide', 'updated_at']
        if floor_team:
            ticket.floor_team = floor_team
            update_fields.append('floor_team')
        ticket.save(update_fields=update_fields)

        actor_name = request.user.get_full_name().strip() or request.user.username
        detail_msg = f' · Floor/Team: {floor_team}' if floor_team else ''
        TicketLog.objects.create(
            ticket=ticket,
            action=f'Flagged as floor-wide incident by {actor_name}.{detail_msg}',
            actor=request.user,
        )

        NotificationService.notify_floor_wide(ticket, request.user)

        ticket = Ticket.objects.select_related(
            'branch', 'assigned_to', 'submitted_by', 'major_incident'
        ).get(pk=ticket.pk)
        return Response(
            TicketDetailSerializer(ticket, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )

    # POST /api/v1/tickets/shift-handover/
    @action(detail=False, methods=['post'], url_path='shift-handover')
    def shift_handover(self, request):
        from datetime import datetime
        from django.db.models import Count, Q as DQ
        from django.utils import timezone

        branch = request.user.branch
        if not branch:
            return Response(
                {'detail': 'Your account has no branch assigned.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        hour = datetime.now().hour
        if 6 <= hour < 14:
            current_shift = 'morning'
        elif 14 <= hour < 22:
            current_shift = 'afternoon'
        else:
            current_shift = 'night'

        # Least-loaded technician on the current shift
        new_assignee = UserProfile.objects.filter(
            branch=branch,
            role='branch_technician',
            shift=current_shift,
            is_active=True,
        ).annotate(
            open_count=Count(
                'assigned_tickets',
                filter=DQ(assigned_tickets__status__in=['open', 'in_progress'])
            )
        ).order_by('open_count').first()

        if not new_assignee:
            return Response(
                {'detail': f'No active technician found for the {current_shift} shift.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Exclude tickets already owned by a current-shift technician
        current_shift_tech_ids = list(
            UserProfile.objects.filter(
                branch=branch,
                role='branch_technician',
                shift=current_shift,
            ).values_list('id', flat=True)
        )

        excluded_ids = request.data.get('excluded_ticket_ids', [])

        tickets_qs = Ticket.objects.filter(
            branch=branch,
            status__in=[Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS],
        ).exclude(assigned_to_id__in=current_shift_tech_ids).select_related('assigned_to')

        if excluded_ids:
            tickets_qs = tickets_qs.exclude(pk__in=excluded_ids)

        tickets_list = list(tickets_qs)
        reassigned_count = len(tickets_list)

        actor_name = request.user.get_full_name().strip() or request.user.username
        new_name = new_assignee.get_full_name().strip() or new_assignee.username
        logs = [
            TicketLog(
                ticket=t,
                action=(
                    f'Shift handover by {actor_name}: reassigned from '
                    f'{(t.assigned_to.get_full_name().strip() or t.assigned_to.username) if t.assigned_to else "Unassigned"} '
                    f'to {new_name} ({current_shift} shift).'
                ),
                actor=request.user,
            )
            for t in tickets_list
        ]

        tickets_qs.update(assigned_to=new_assignee, shift=current_shift, updated_at=timezone.now())
        if logs:
            TicketLog.objects.bulk_create(logs)

        full_name = new_assignee.get_full_name().strip() or new_assignee.username
        return Response({
            'reassigned_count': reassigned_count,
            'new_assignee': new_assignee.username,
            'new_assignee_full_name': full_name,
            'current_shift': current_shift,
        })

    # PATCH /api/v1/tickets/{id}/resolution/
    @action(detail=True, methods=['patch'], url_path='resolution')
    def update_resolution(self, request, pk=None):
        ticket = self.get_object()
        notes = request.data.get('resolution_notes', '').strip()
        ticket.resolution_notes = notes
        ticket.save(update_fields=['resolution_notes', 'updated_at'])

        actor_name = request.user.get_full_name().strip() or request.user.username
        TicketLog.objects.create(
            ticket=ticket,
            action=f'Resolution notes updated by {actor_name}.',
            actor=request.user,
        )

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

            supervisors = UserProfile.objects.filter(role='main_it_supervisor')
            Notification.objects.bulk_create([
                Notification(
                    recipient=sup,
                    notification_type=Notification.NotificationType.ESCALATION_TRIGGERED,
                    ticket=ticket,
                    message=f'Ticket "{ticket.title}" has been escalated: {reason}',
                )
                for sup in supervisors
            ])
            TicketLog.objects.create(
                ticket=ticket,
                action=f'Escalated to Main Branch · Reason: {reason}',
                actor=request.user,
            )
            NotificationService.notify_submitter_escalation(ticket)

        return Response(
            TicketDetailSerializer(ticket, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class SystemSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(SystemSettingsSerializer(SystemSettings.get()).data)

    def patch(self, request):
        if request.user.role != 'main_it_manager':
            return Response(
                {'detail': 'Only the Main IT Manager can change system settings.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        obj = SystemSettings.get()
        serializer = SystemSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
