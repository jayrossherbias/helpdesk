import uuid
from django.conf import settings
from django.db import models


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        SLA_WARNING = 'sla_warning', 'SLA Warning'
        ESCALATION_TRIGGERED = 'escalation_triggered', 'Escalation Triggered'
        TICKET_ASSIGNED = 'ticket_assigned', 'Ticket Assigned'
        TICKET_RESOLVED = 'ticket_resolved', 'Ticket Resolved'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    notification_type = models.CharField(max_length=25, choices=NotificationType.choices)
    ticket = models.ForeignKey(
        'tickets.Ticket',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.get_notification_type_display()} → {self.recipient_id}'
