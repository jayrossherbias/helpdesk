from rest_framework.routers import SimpleRouter
from .views import RoutingRuleViewSet

router = SimpleRouter()
router.register(r'rules', RoutingRuleViewSet, basename='routing-rule')

urlpatterns = router.urls
