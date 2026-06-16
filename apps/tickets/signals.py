from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from apps.notifications.service import NotificationService
from apps.priority.engine import PriorityEngine
from apps.routing.engine import RoutingEngine
from .models import Ticket, TicketLog, SystemSettings


@receiver(pre_save, sender=Ticket)
def set_priority_and_sla(sender, instance, **kwargs):
    if instance._state.adding:
        cfg = SystemSettings.get()
        if cfg.auto_priority:
            instance.priority = PriorityEngine.calculate_priority(
                instance.agents_affected, instance.category
            )
        else:
            instance.priority = 'low'
        instance.sla_deadline = PriorityEngine.calculate_sla_deadline(instance.priority)
        return

    try:
        old = Ticket.objects.get(pk=instance.pk)
    except Ticket.DoesNotExist:
        return

    if old.status != Ticket.Status.RESOLVED and instance.status == Ticket.Status.RESOLVED:
        instance.resolved_at = timezone.now()


@receiver(post_save, sender=Ticket)
def auto_route_ticket(sender, instance, created, **kwargs):
    if not created:
        return

    if instance.submitted_by:
        submitter = instance.submitted_by.get_full_name().strip() or instance.submitted_by.username
    else:
        submitter = 'Unknown'
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

    cfg = SystemSettings.get()

    if cfg.auto_routing:
        technician = RoutingEngine.route(instance)
        if technician:
            Ticket.objects.filter(pk=instance.pk).update(assigned_to=technician)
            instance = Ticket.objects.select_related('assigned_to', 'submitted_by').get(pk=instance.pk)
            tech_name = technician.get_full_name().strip() or technician.username
            TicketLog.objects.create(
                ticket=instance,
                action=f'Auto-assigned to {tech_name} by routing engine.',
                actor=None,
            )
            NotificationService.notify_assignment(instance)
    else:
        TicketLog.objects.create(
            ticket=instance,
            action='Auto-routing is disabled — ticket left unassigned.',
            actor=None,
        )

    if instance.priority == 'critical':
        NotificationService.notify_critical_ticket(instance)
