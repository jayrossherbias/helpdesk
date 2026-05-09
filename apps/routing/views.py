from rest_framework.viewsets import ModelViewSet

from apps.accounts.permissions import IsBranchSupervisorOrAbove
from .models import RoutingRule
from .serializers import RoutingRuleSerializer


class RoutingRuleViewSet(ModelViewSet):
    queryset = RoutingRule.objects.select_related('branch').order_by('priority_order')
    serializer_class = RoutingRuleSerializer
    permission_classes = (IsBranchSupervisorOrAbove,)
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
