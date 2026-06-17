import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


# [OOP: Class] Blueprint for a branch entity; each Branch instance represents one office location
class Branch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    is_main_branch = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'branches'

    # [OOP: Method Overriding] Overrides __str__ inherited from models.Model
    def __str__(self):
        return self.name


# [OOP: Inheritance] UserProfile extends Django's AbstractUser, inheriting built-in
# authentication fields (username, password, email, is_active) and methods (get_full_name)
class UserProfile(AbstractUser):
    # [OOP: Nested Class] Role choices scoped inside UserProfile to keep constants with their model
    class Role(models.TextChoices):
        AGENT = 'agent', 'Agent'
        BRANCH_TECHNICIAN = 'branch_technician', 'Branch Technician'
        BRANCH_SUPERVISOR = 'branch_supervisor', 'Branch Supervisor'
        MAIN_IT_SUPERVISOR = 'main_it_supervisor', 'Main IT Supervisor'
        MAIN_IT_MANAGER = 'main_it_manager', 'Main IT Manager'

    # [OOP: Nested Class] Shift choices scoped inside UserProfile
    class Shift(models.TextChoices):
        MORNING = 'morning', 'Morning (6AM–2PM)'
        AFTERNOON = 'afternoon', 'Afternoon (2PM–10PM)'
        NIGHT = 'night', 'Night (10PM–6AM)'

    # [OOP: Nested Class] Department choices scoped inside UserProfile
    class Department(models.TextChoices):
        IT_DEPARTMENT    = 'it_department',    'IT Department'
        SALES            = 'sales',            'Sales'
        CUSTOMER_SERVICE = 'customer_service', 'Customer Service'
        COLLECTIONS      = 'collections',      'Collections'
        TECHNICAL_SUPPORT = 'technical_support', 'Technical Support'
        QUALITY_ASSURANCE = 'quality_assurance', 'Quality Assurance'
        BACK_OFFICE      = 'back_office',      'Back Office'

    DEPARTMENT_CODES = {
        'it_department':    'IT',
        'sales':            'SLS',
        'customer_service': 'CS',
        'collections':      'COL',
        'technical_support': 'TS',
        'quality_assurance': 'QA',
        'back_office':      'BO',
    }

    IT_ROLES = {'branch_technician', 'branch_supervisor', 'main_it_supervisor', 'main_it_manager'}

    email = models.EmailField(unique=True)

    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
    )
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.AGENT)
    shift = models.CharField(max_length=20, choices=Shift.choices, null=True, blank=True)
    department = models.CharField(
        max_length=30,
        choices=Department.choices,
        null=True,
        blank=True,
    )

    # [OOP: Method Overriding] Overrides __str__ from AbstractUser with a custom representation
    def __str__(self):
        return self.username
