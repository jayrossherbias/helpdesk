from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.priority.engine import PriorityEngine
from apps.routing.engine import RoutingEngine
from .models import Ticket


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
    technician = RoutingEngine.route(instance)
    if technician:
        Ticket.objects.filter(pk=instance.pk).update(assigned_to=technician)
