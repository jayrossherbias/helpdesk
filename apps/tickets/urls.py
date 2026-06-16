from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import TicketViewSet, SystemSettingsView

router = DefaultRouter()
router.register(r'', TicketViewSet, basename='ticket')

urlpatterns = [
    path('settings/', SystemSettingsView.as_view(), name='system-settings'),
] + router.urls
