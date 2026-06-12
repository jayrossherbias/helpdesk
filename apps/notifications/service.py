from .models import Notification


class NotificationService:
    @staticmethod
    def notify_assignment(ticket):
        if not ticket.assigned_to:
            return
        Notification.objects.bulk_create([
            Notification(
                recipient=ticket.assigned_to,
                notification_type=Notification.NotificationType.TICKET_ASSIGNED,
                ticket=ticket,
                message=f'Ticket "{ticket.title}" has been assigned to you.',
            )
        ])

    @staticmethod
    def notify_sla_warning(ticket):
        from apps.accounts.models import UserProfile
        recipients = {}
        if ticket.assigned_to:
            recipients[ticket.assigned_to.pk] = ticket.assigned_to
        for user in UserProfile.objects.filter(branch=ticket.branch, role='branch_supervisor'):
            recipients[user.pk] = user

        Notification.objects.bulk_create([
            Notification(
                recipient=user,
                notification_type=Notification.NotificationType.SLA_WARNING,
                ticket=ticket,
                message=f'SLA warning: ticket "{ticket.title}" deadline is approaching.',
            )
            for user in recipients.values()
        ])

    @staticmethod
    def notify_sla_breach(ticket):
        from apps.accounts.models import UserProfile
        recipients = {}
        if ticket.assigned_to:
            recipients[ticket.assigned_to.pk] = ticket.assigned_to
        for user in UserProfile.objects.filter(branch=ticket.branch, role='branch_supervisor'):
            recipients[user.pk] = user
        for user in UserProfile.objects.filter(role='main_it_manager'):
            recipients[user.pk] = user

        Notification.objects.bulk_create([
            Notification(
                recipient=user,
                notification_type=Notification.NotificationType.SLA_WARNING,
                ticket=ticket,
                message=f'SLA breached: ticket "{ticket.title}" has exceeded its deadline.',
            )
            for user in recipients.values()
        ])

    @staticmethod
    def notify_escalation(ticket, escalated_by):
        from apps.accounts.models import UserProfile
        managers = UserProfile.objects.filter(role='main_it_manager')
        Notification.objects.bulk_create([
            Notification(
                recipient=manager,
                notification_type=Notification.NotificationType.ESCALATION_TRIGGERED,
                ticket=ticket,
                message=f'Ticket "{ticket.title}" has been escalated by {escalated_by.username}.',
            )
            for manager in managers
        ])

    @staticmethod
    def notify_resolved(ticket):
        if not ticket.submitted_by:
            return
        Notification.objects.bulk_create([
            Notification(
                recipient=ticket.submitted_by,
                notification_type=Notification.NotificationType.TICKET_RESOLVED,
                ticket=ticket,
                message=f'Your ticket "{ticket.title}" has been resolved.',
            )
        ])

    @staticmethod
    def notify_status_update(ticket, new_status):
        """Notify the ticket submitter when status changes (excluding resolved, which has its own method)."""
        if not ticket.submitted_by:
            return
        status_labels = {
            'in_progress': 'is now being worked on',
            'pending': 'is pending — awaiting further information or escalation review',
            'open': 'has been reopened',
        }
        label = status_labels.get(new_status, f'status has been updated to {new_status}')
        Notification.objects.bulk_create([
            Notification(
                recipient=ticket.submitted_by,
                notification_type=Notification.NotificationType.TICKET_UPDATED,
                ticket=ticket,
                message=f'Your ticket "{ticket.title}" {label}.',
            )
        ])

    @staticmethod
    def notify_floor_wide(ticket, flagged_by):
        """Notify the assigned technician and branch supervisor when a ticket is flagged floor-wide."""
        from apps.accounts.models import UserProfile
        recipients = {}
        if ticket.assigned_to:
            recipients[ticket.assigned_to.pk] = ticket.assigned_to
        for user in UserProfile.objects.filter(branch=ticket.branch, role='branch_supervisor'):
            recipients[user.pk] = user
        recipients.pop(flagged_by.pk, None)

        Notification.objects.bulk_create([
            Notification(
                recipient=user,
                notification_type=Notification.NotificationType.TICKET_UPDATED,
                ticket=ticket,
                message=(
                    f'Ticket "{ticket.title}" has been flagged as a floor-wide incident '
                    f'by {flagged_by.username}.'
                ),
            )
            for user in recipients.values()
        ])

    @staticmethod
    def notify_submitter_escalation(ticket):
        """Notify the ticket submitter that their ticket has been escalated."""
        if not ticket.submitted_by:
            return
        Notification.objects.bulk_create([
            Notification(
                recipient=ticket.submitted_by,
                notification_type=Notification.NotificationType.ESCALATION_TRIGGERED,
                ticket=ticket,
                message=(
                    f'Your ticket "{ticket.title}" has been escalated to the Main Branch IT team '
                    f'for further assistance.'
                ),
            )
        ])
