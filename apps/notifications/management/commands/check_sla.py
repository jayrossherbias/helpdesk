from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.notifications.models import Notification
from apps.notifications.service import NotificationService
from apps.tickets.models import Ticket


class Command(BaseCommand):
    help = 'Check SLA deadlines and send warning/breach notifications.'

    def handle(self, *args, **options):
        now = timezone.now()
        tickets = Ticket.objects.filter(
            status__in=[Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS],
            sla_deadline__isnull=False,
        ).select_related('assigned_to', 'submitted_by', 'branch')

        warned = breached = skipped = 0

        for ticket in tickets:
            total_window = (ticket.sla_deadline - ticket.created_at).total_seconds()
            if total_window <= 0:
                skipped += 1
                continue

            pct = (now - ticket.created_at).total_seconds() / total_window * 100

            if pct < 75:
                continue

            already_notified = Notification.objects.filter(
                ticket=ticket,
                notification_type=Notification.NotificationType.SLA_WARNING,
            ).exists()

            if already_notified:
                skipped += 1
                continue

            if pct >= 100:
                NotificationService.notify_sla_breach(ticket)
                breached += 1
            else:
                NotificationService.notify_sla_warning(ticket)
                warned += 1

        self.stdout.write(self.style.SUCCESS(
            f'SLA check complete — breached: {breached}, at risk: {warned}, skipped: {skipped}.'
        ))
