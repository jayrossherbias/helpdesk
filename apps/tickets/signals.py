from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.notifications.service import NotificationService
from apps.priority.engine import PriorityEngine
from apps.routing.engine import RoutingEngine
from .models import Ticket, TicketLog


@receiver(pre_save, sender=Ticket)
def set_priority_and_sla(sender, instance, **kwargs):
    if instance._state.adding:
        instance.priority = PriorityEngine.calculate_priority(
            instance.agents_affected, instance.category
        )
        instance.sla_deadline = PriorityEngine.calculate_sla_deadline(instance.priority)


@receiver(post_save, sender=Ticket)
def auto_route_ticket(sender, instance, created, **kwargs):
    if not created:
        return

    submitter = instance.submitted_by.username if instance.submitted_by else 'Unknown'
    TicketLog.objects.create(
        ticket=instance,
        action=f'Ticket submitted by {submitter}.',
        actor=instance.submitted_by,
    )

    priority_label = instance.get_priority_display()
    sla_str = (
        instance.sla_deadline.strftime('%b %d %Y, %I:%M %p')
        if instance.sla_deadline else 'N/A'
    )
    TicketLog.objects.create(
        ticket=instance,
        action=f'Priority auto-set to {priority_label} · SLA deadline: {sla_str}.',
        actor=None,
    )

    technician = RoutingEngine.route(instance)
    if technician:
        Ticket.objects.filter(pk=instance.pk).update(assigned_to=technician)
        instance = Ticket.objects.select_related('assigned_to', 'submitted_by').get(pk=instance.pk)
        TicketLog.objects.create(
            ticket=instance,
            action=f'Auto-assigned to {technician.username} by routing engine.',
            actor=None,
        )
        NotificationService.notify_assignment(instance)
