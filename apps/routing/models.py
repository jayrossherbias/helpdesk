import uuid
from django.db import models


class RoutingRule(models.Model):
    class Category(models.TextChoices):
        VOIP_DIALER = 'voip_dialer', 'VoIP & Dialer Issues'
        CRM_SOFTWARE = 'crm_software', 'CRM & Call Center Software'
        WORKSTATION = 'workstation', 'Workstation & Peripherals'
        NETWORK = 'network', 'Network & Connectivity'
        ACCOUNT_ACCESS = 'account_access', 'Account & Access Management'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.CharField(max_length=20, choices=Category.choices)
    keywords = models.TextField(help_text='Comma-separated keywords')
    assigned_team_name = models.CharField(max_length=100)
    target_role = models.CharField(max_length=30)
    branch = models.ForeignKey(
        'accounts.Branch',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='routing_rules',
    )
    priority_order = models.IntegerField(default=1)

    class Meta:
        ordering = ['priority_order']

    def __str__(self):
        return f'{self.category} → {self.assigned_team_name}'
