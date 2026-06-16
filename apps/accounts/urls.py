from django.urls import path
from rest_framework.routers import SimpleRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import BranchViewSet, GoogleLoginView, LoginView, LogoutView, MeView, UserProfileViewSet

# Imported by helpdesk_project/urls.py for the /api/v1/auth/ prefix
auth_urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('google-login/', GoogleLoginView.as_view(), name='auth-google-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
]

router = SimpleRouter()
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'users', UserProfileViewSet, basename='user')

# Used by include('apps.accounts.urls') for the /api/v1/accounts/ prefix
urlpatterns = router.urls
