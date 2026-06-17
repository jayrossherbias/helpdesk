import uuid
from django.conf import settings
from django.db import models


# [OOP: Class / Composition] EscalationLog is composed with Ticket via ForeignKey —
# it cannot exist without a parent Ticket, forming a dependent object relationship
class EscalationLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(
        'tickets.Ticket',
        on_delete=models.CASCADE,
        related_name='escalation_logs',
    )
    escalated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='escalations_made',
    )
    reason = models.TextField()
    escalated_at = models.DateTimeField(auto_now_add=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='escalations_resolved',
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    # [OOP: Method Overriding] Overrides __str__ from models.Model
    def __str__(self):
        return f'Escalation for ticket {self.ticket_id}'
