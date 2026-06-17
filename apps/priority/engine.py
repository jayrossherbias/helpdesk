from datetime import timedelta


# [OOP: Encapsulation] All priority and SLA calculation logic is bundled inside one class;
# callers interact through clean method calls without knowing the internal rules
class PriorityEngine:
    # [OOP: Encapsulation] SLA_HOURS is class-level data kept together with the methods that use it
    SLA_HOURS = {
        'critical': 1,
        'high': 4,
        'medium': 8,
        'low': 24,
    }

    # [OOP: Static Method] Pure calculation — no instance or class state needed, only input values
    # [OOP: Abstraction] Callers just pass agents_affected; internal thresholds are hidden here
    @staticmethod
    def calculate_priority(agents_affected, category):
        if agents_affected >= 20:
            return 'critical'
        if agents_affected >= 5:
            return 'high'
        if agents_affected >= 2:
            return 'medium'
        return 'low'

    # [OOP: Class Method] Uses cls to access SLA_HOURS defined on the class itself
    @classmethod
    def calculate_sla_deadline(cls, priority):
        from django.utils import timezone
        hours = cls.SLA_HOURS.get(priority, 24)
        return timezone.now() + timedelta(hours=hours)
