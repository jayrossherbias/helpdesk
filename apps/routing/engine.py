from django.db.models import Count, Q


class RoutingEngine:
    @staticmethod
    def route(ticket):
        from apps.routing.models import RoutingRule
        from apps.accounts.models import UserProfile

        rules = RoutingRule.objects.filter(
            category=ticket.category
        ).filter(
            Q(branch=ticket.branch) | Q(branch=None)
        ).order_by('priority_order')

        for rule in rules:
            keywords = [k.strip().lower() for k in rule.keywords.split(',')]
            text = f"{ticket.title} {ticket.description}".lower()
            if any(kw in text for kw in keywords):
                technician = UserProfile.objects.filter(
                    branch=ticket.branch,
                    role=rule.target_role,
                ).annotate(
                    open_count=Count(
                        'assigned_tickets',
                        filter=Q(assigned_tickets__status__in=['open', 'in_progress'])
                    )
                ).order_by('open_count').first()

                if technician:
                    return technician
        return None
