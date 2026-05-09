from django.urls import path
from .views import BranchDashboardView, MainDashboardView, SLAConfigView

urlpatterns = [
    path('branch/', BranchDashboardView.as_view(), name='dashboard-branch'),
    path('main/', MainDashboardView.as_view(), name='dashboard-main'),
]

# Imported by helpdesk_project/urls.py for the /api/v1/config/ prefix
config_urlpatterns = [
    path('sla/', SLAConfigView.as_view(), name='config-sla'),
]
