from django.db.models import Count, Q


# [OOP: Abstraction] Hides all routing complexity (keyword matching, load balancing, fallback)
# behind a single method call — callers only need to call RoutingEngine.route(ticket)
class RoutingEngine:
    # [OOP: Static Method] No instance or class state needed; pure logic given a ticket object
    @staticmethod
    def route(ticket):
        from apps.routing.models import RoutingRule
        from apps.accounts.models import UserProfile

        rules = RoutingRule.objects.filter(
            category=ticket.category
        ).filter(
            Q(branch=ticket.branch) | Q(branch=None)
        ).order_by('priority_order')

        # Try keyword match first for specificity
        matched_rule = None
        text = f"{ticket.title} {ticket.description}".lower()
        for rule in rules:
            keywords = [k.strip().lower() for k in rule.keywords.split(',')]
            if any(kw in text for kw in keywords):
                matched_rule = rule
                break

        # Fall back to first rule for this category if no keyword matched
        if matched_rule is None:
            matched_rule = rules.first()

        if matched_rule is None:
            return None

        return UserProfile.objects.filter(
            branch=ticket.branch,
            role=matched_rule.target_role,
            shift=ticket.shift,
        ).annotate(
            open_count=Count(
                'assigned_tickets',
                filter=Q(assigned_tickets__status__in=['open', 'in_progress'])
            )
        ).order_by('open_count').first()
