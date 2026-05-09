import uuid
from django.conf import settings
from django.db import models


class Ticket(models.Model):
    class Category(models.TextChoices):
        VOIP_DIALER = 'voip_dialer', 'VoIP & Dialer Issues'
        CRM_SOFTWARE = 'crm_software', 'CRM & Call Center Software'
        WORKSTATION = 'workstation', 'Workstation & Peripherals'
        NETWORK = 'network', 'Network & Connectivity'
        ACCOUNT_ACCESS = 'account_access', 'Account & Access Management'

    class Priority(models.TextChoices):
        CRITICAL = 'critical', 'Critical'
        HIGH = 'high', 'High'
        MEDIUM = 'medium', 'Medium'
        LOW = 'low', 'Low'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        PENDING = 'pending', 'Pending'
        RESOLVED = 'resolved', 'Resolved'

    class Shift(models.TextChoices):
        MORNING = 'morning', 'Morning (6AM–2PM)'
        AFTERNOON = 'afternoon', 'Afternoon (2PM–10PM)'
        NIGHT = 'night', 'Night (10PM–6AM)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices)
    priority = models.CharField(max_length=10, choices=Priority.choices, blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)
    branch = models.ForeignKey(
        'accounts.Branch',
        on_delete=models.CASCADE,
        related_name='tickets',
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='submitted_tickets',
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets',
    )
    shift = models.CharField(max_length=10, choices=Shift.choices)
    agents_affected = models.IntegerField(default=1)
    floor_team = models.CharField(max_length=100, blank=True)
    is_floor_wide = models.BooleanField(default=False)
    major_incident = models.ForeignKey(
        'incidents.MajorIncident',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets',
    )
    sla_deadline = models.DateTimeField(null=True, blank=True)
    escalated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        priority = self.priority.upper() if self.priority else 'UNSET'
        return f'[{priority}] {self.title}'
