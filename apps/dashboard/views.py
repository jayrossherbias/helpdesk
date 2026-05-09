from django.db.models import Avg, ExpressionWrapper, F, FloatField, Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Branch
from apps.accounts.permissions import (
    IsBranchTechnicianOrAbove,
    IsBranchSupervisorOrAbove,
    IsMainITManager,
)
from apps.escalations.models import EscalationLog
from apps.incidents.models import MajorIncident
from apps.tickets.models import Ticket


def _current_shift():
    hour = timezone.localtime(timezone.now()).hour
    if 6 <= hour < 14:
        return 'morning'
    if 14 <= hour < 22:
        return 'afternoon'
    return 'night'


def _sla_compliance(resolved_today_qs):
    total = resolved_today_qs.count()
    if total == 0:
        return 100.0
    on_time = resolved_today_qs.filter(
        Q(sla_deadline__isnull=True) | Q(updated_at__lte=F('sla_deadline'))
    ).count()
    return round(on_time / total * 100, 2)


def _resolved_today_qs(branch_qs):
    today = timezone.localtime(timezone.now()).date()
    return branch_qs.filter(
        status=Ticket.Status.RESOLVED,
        updated_at__date=today,
    )


class BranchDashboardView(APIView):
    permission_classes = (IsBranchTechnicianOrAbove,)

    def get(self, request):
        branch = request.user.branch
        branch_tickets = Ticket.objects.filter(branch=branch)
        active_qs = branch_tickets.filter(
            status__in=[Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS]
        )
        resolved_today = _resolved_today_qs(branch_tickets)

        tickets_by_priority = {
            priority: active_qs.filter(priority=priority).count()
            for priority in ('critical', 'high', 'medium', 'low')
        }
        tickets_by_category = {
            cat: active_qs.filter(category=cat).count()
            for cat in ('voip_dialer', 'crm_software', 'workstation', 'network', 'account_access')
        }

        incidents = MajorIncident.objects.filter(
            branch=branch, status=MajorIncident.Status.ACTIVE
        ).values('id', 'title', 'floor_team', 'status', 'created_at')

        return Response({
            'open_count': branch_tickets.filter(status=Ticket.Status.OPEN).count(),
            'in_progress_count': branch_tickets.filter(status=Ticket.Status.IN_PROGRESS).count(),
            'pending_count': branch_tickets.filter(status=Ticket.Status.PENDING).count(),
            'resolved_today_count': resolved_today.count(),
            'sla_compliance_pct': _sla_compliance(resolved_today),
            'current_shift': _current_shift(),
            'active_major_incidents': list(incidents),
            'tickets_by_priority': tickets_by_priority,
            'tickets_by_category': tickets_by_category,
        })


class SLAConfigView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        from apps.priority.engine import PriorityEngine
        h = PriorityEngine.SLA_HOURS
        return Response({
            'critical_hours': h['critical'],
            'high_hours': h['high'],
            'medium_hours': h['medium'],
            'low_hours': h['low'],
            'warning_threshold_pct': 75,
        })


class MainDashboardView(APIView):
    permission_classes = (IsMainITManager,)

    def get(self, request):
        all_tickets = Ticket.objects.all()

        branch_summaries = []
        for branch in Branch.objects.all().order_by('name'):
            branch_tickets = all_tickets.filter(branch=branch)
            active_qs = branch_tickets.filter(
                status__in=[Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS]
            )
            resolved_today = _resolved_today_qs(branch_tickets)

            avg_result = resolved_today.annotate(
                resolution_seconds=ExpressionWrapper(
                    (F('updated_at') - F('created_at')),
                    output_field=FloatField(),
                )
            ).aggregate(avg=Avg('resolution_seconds'))
            avg_secs = avg_result['avg'] or 0.0
            avg_minutes = round(avg_secs / 60_000_000, 2)

            branch_summaries.append({
                'branch_id': str(branch.id),
                'branch_name': branch.name,
                'open_tickets': active_qs.count(),
                'sla_compliance_pct': _sla_compliance(resolved_today),
                'avg_resolution_minutes': avg_minutes,
                'escalated_tickets': active_qs.filter(escalated=True).count(),
            })

        return Response({
            'total_open': all_tickets.filter(status=Ticket.Status.OPEN).count(),
            'critical_systemwide': all_tickets.filter(
                status=Ticket.Status.OPEN, priority='critical'
            ).count(),
            'escalations_pending': EscalationLog.objects.filter(
                resolved_at__isnull=True
            ).count(),
            'branches': branch_summaries,
        })
