from rest_framework.routers import SimpleRouter
from .views import MajorIncidentViewSet

router = SimpleRouter()
router.register(r'', MajorIncidentViewSet, basename='incident')
urlpatterns = router.urls
