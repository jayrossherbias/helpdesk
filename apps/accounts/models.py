import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class Branch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    is_main_branch = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'branches'

    def __str__(self):
        return self.name


class UserProfile(AbstractUser):
    class Role(models.TextChoices):
        AGENT = 'agent', 'Agent'
        BRANCH_TECHNICIAN = 'branch_technician', 'Branch Technician'
        BRANCH_SUPERVISOR = 'branch_supervisor', 'Branch Supervisor'
        MAIN_IT_MANAGER = 'main_it_manager', 'Main IT Manager'

    class Shift(models.TextChoices):
        MORNING = 'morning', 'Morning (6AM–2PM)'
        AFTERNOON = 'afternoon', 'Afternoon (2PM–10PM)'
        NIGHT = 'night', 'Night (10PM–6AM)'

    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
    )
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.AGENT)
    shift = models.CharField(max_length=20, choices=Shift.choices, null=True, blank=True)

    def __str__(self):
        return self.username
