from datetime import timedelta


class PriorityEngine:
    SLA_HOURS = {
        'critical': 1,
        'high': 4,
        'medium': 8,
        'low': 24,
    }

    @staticmethod
    def calculate_priority(agents_affected, category):
        if agents_affected >= 20:
            return 'critical'
        if agents_affected >= 5:
            return 'high'
        if agents_affected >= 2:
            return 'medium'
        return 'low'

    @classmethod
    def calculate_sla_deadline(cls, priority):
        from django.utils import timezone
        hours = cls.SLA_HOURS.get(priority, 24)
        return timezone.now() + timedelta(hours=hours)
