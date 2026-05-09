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
