from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import BranchViewSet, LoginView, LogoutView, MeView, UserProfileViewSet

# Imported by helpdesk_project/urls.py for the /api/v1/auth/ prefix
auth_urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
]

router = SimpleRouter()
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'users', UserProfileViewSet, basename='user')

# Used by include('apps.accounts.urls') for the /api/v1/accounts/ prefix
urlpatterns = router.urls
