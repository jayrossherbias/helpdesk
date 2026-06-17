import uuid
from django.conf import settings
from django.db import models


CATEGORY_CODES = {
    'voip_dialer':    'VIP',
    'crm_software':   'CRM',
    'workstation':    'WST',
    'network':        'NET',
    'account_access': 'ACC',
}

BRANCH_CODES = {
    'Main Branch':      'MAIN',
    'Victorias Branch': 'VIC',
}


# [OOP: Class] Blueprint for tracking auto-incrementing ticket ID sequences per prefix
class TicketCounter(models.Model):
    prefix = models.CharField(max_length=20, unique=True)
    last_number = models.IntegerField(default=0)

    # [OOP: Class Method] Operates on the class (via cls) to fetch and increment the counter
    # without needing a pre-existing instance
    @classmethod
    def next_for(cls, prefix: str) -> int:
        obj, _ = cls.objects.select_for_update().get_or_create(prefix=prefix)
        obj.last_number += 1
        obj.save(update_fields=['last_number'])
        return obj.last_number


# [OOP: Class] Core ticket entity — bundles all ticket data and behavior into one blueprint
# [OOP: Encapsulation] Ticket data (title, priority, status) and related logic
# (generate_ticket_number, __str__) are kept together inside this class
class Ticket(models.Model):
    # [OOP: Nested Class] Category constants scoped inside Ticket to avoid global name collisions
    class Category(models.TextChoices):
        VOIP_DIALER = 'voip_dialer', 'VoIP & Dialer Issues'
        CRM_SOFTWARE = 'crm_software', 'CRM & Call Center Software'
        WORKSTATION = 'workstation', 'Workstation & Peripherals'
        NETWORK = 'network', 'Network & Connectivity'
        ACCOUNT_ACCESS = 'account_access', 'Account & Access Management'

    # [OOP: Nested Class] Priority constants scoped inside Ticket
    class Priority(models.TextChoices):
        CRITICAL = 'critical', 'Critical'
        HIGH = 'high', 'High'
        MEDIUM = 'medium', 'Medium'
        LOW = 'low', 'Low'

    # [OOP: Nested Class] Status constants scoped inside Ticket
    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        PENDING = 'pending', 'Pending'
        RESOLVED = 'resolved', 'Resolved'

    # [OOP: Nested Class] Shift constants scoped inside Ticket
    class Shift(models.TextChoices):
        MORNING = 'morning', 'Morning (6AM–2PM)'
        AFTERNOON = 'afternoon', 'Afternoon (2PM–10PM)'
        NIGHT = 'night', 'Night (10PM–6AM)'

    # [OOP: Nested Class] Urgency constants scoped inside Ticket
    class Urgency(models.TextChoices):
        CANNOT_WORK        = 'cannot_work',        'Cannot work — completely blocked'
        SEVERELY_IMPACTED  = 'severely_impacted',  'Severely impacted — major disruption'
        PARTIALLY_IMPACTED = 'partially_impacted', 'Partially impacted — can work with workarounds'
        MINOR_ISSUE        = 'minor_issue',        'Minor issue — slight inconvenience'

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
    urgency = models.CharField(
        max_length=20,
        choices=Urgency.choices,
        default=Urgency.MINOR_ISSUE,
    )
    ticket_number = models.CharField(max_length=20, unique=True, null=True, blank=True, db_index=True)
    related_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='follow_ups',
    )
    resolution_notes = models.TextField(blank=True, default='')
    sla_deadline = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    escalated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # [OOP: Class Method] Factory method — generates a formatted ticket number using class-level
    # logic (branch code + category code + sequence) before any instance is fully saved
    @classmethod
    def generate_ticket_number(cls, category: str, submitter) -> str:
        branch_name = getattr(submitter.branch, 'name', '') if submitter.branch else ''
        branch_code = BRANCH_CODES.get(branch_name, 'GEN')
        cat_code = CATEGORY_CODES.get(category, 'GEN')
        prefix = f'{branch_code}-{cat_code}'
        seq = TicketCounter.next_for(prefix)
        return f'{prefix}-{seq:04d}'

    # [OOP: Method Overriding] Overrides __str__ from models.Model with a priority-prefixed label
    def __str__(self):
        priority = self.priority.upper() if self.priority else 'UNSET'
        return f'[{priority}] {self.title}'


# [OOP: Singleton Design Pattern] Only one row (pk=1) is ever created; get() enforces this
# [OOP: Encapsulation] All workflow toggle states and their accessor logic are bundled here
class SystemSettings(models.Model):
    """Singleton — always pk=1. Stores global workflow toggle states."""
    auto_routing        = models.BooleanField(default=True)
    auto_priority       = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    sla_alerts          = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'System Settings'

    # [OOP: Class Method] Singleton accessor — retrieves or creates the single settings record
    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


# [OOP: Class / Composition] TicketLog cannot exist without a Ticket — it is composed of a Ticket
# reference, making it a dependent object in an object relationship
class TicketLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='logs')
    action = models.CharField(max_length=300)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_logs',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    # [OOP: Method Overriding] Overrides __str__ from models.Model
    def __str__(self):
        return f'{self.ticket_id} — {self.action[:60]}'
