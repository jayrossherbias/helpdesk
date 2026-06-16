from rest_framework import serializers as drf_serializers, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Branch, UserProfile
from .permissions import IsBranchSupervisorOrAbove, IsMainITManager
from .serializers import (
    BranchDetailSerializer,
    BranchSerializer,
    LoginSerializer,
    UserCreateSerializer,
    UserProfileSerializer,
)


class LoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserProfileSerializer(user).data,
        }, status=status.HTTP_200_OK)


class GoogleLoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        import urllib.request
        import urllib.parse
        import json
        from django.conf import settings

        credential = request.data.get('credential', '').strip()
        if not credential:
            return Response({'detail': 'No credential provided.'}, status=status.HTTP_400_BAD_REQUEST)

        client_id = settings.GOOGLE_OAUTH_CLIENT_ID
        if not client_id:
            return Response({'detail': 'Google OAuth is not configured on this server.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Verify the ID token via Google's tokeninfo endpoint (no local cert fetching needed)
        url = 'https://oauth2.googleapis.com/tokeninfo?' + urllib.parse.urlencode({'id_token': credential})
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                idinfo = json.loads(resp.read().decode())
        except Exception:
            return Response({'detail': 'Could not verify Google token. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

        if idinfo.get('aud') != client_id:
            return Response({'detail': 'Google token was not issued for this application.'}, status=status.HTTP_400_BAD_REQUEST)

        email = idinfo.get('email')
        if not email or idinfo.get('email_verified') != 'true':
            return Response({'detail': 'Google account email is not verified.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = UserProfile.objects.get(email=email, is_active=True)
        except UserProfile.DoesNotExist:
            return Response(
                {'detail': 'No active account found for this Google email. Contact your IT administrator.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserProfileSerializer(user).data,
        }, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

    def patch(self, request):
        user = request.user
        first_name       = request.data.get('first_name')
        last_name        = request.data.get('last_name')
        current_password = request.data.get('current_password', '')
        new_password     = request.data.get('new_password', '')

        save_fields = []

        if first_name is not None:
            user.first_name = first_name.strip()
            save_fields.append('first_name')
        if last_name is not None:
            user.last_name = last_name.strip()
            save_fields.append('last_name')

        if new_password:
            if not current_password:
                return Response(
                    {'current_password': 'Current password is required.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not user.check_password(current_password):
                return Response(
                    {'current_password': 'Incorrect current password.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if len(new_password) < 8:
                return Response(
                    {'new_password': 'Password must be at least 8 characters.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.set_password(new_password)
            save_fields.append('password')

        if save_fields:
            user.save(update_fields=save_fields)

        return Response(UserProfileSerializer(user).data)


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {'detail': 'Token is invalid or already blacklisted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class BranchViewSet(ModelViewSet):
    serializer_class = BranchDetailSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        from django.db.models import Count, Q
        return Branch.objects.annotate(
            agent_count=Count(
                'users',
                filter=Q(users__role='agent', users__is_active=True),
            ),
            it_staff_count=Count(
                'users',
                filter=Q(
                    users__role__in=['branch_technician', 'branch_supervisor'],
                    users__is_active=True,
                ),
            ),
        ).order_by('name')

    def get_permissions(self):
        if self.action in ('create', 'partial_update'):
            return [IsMainITManager()]
        return [IsAuthenticated()]


class UserProfileViewSet(ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'main_it_manager':
            qs = UserProfile.objects.select_related('branch').order_by('username')
        else:
            qs = UserProfile.objects.filter(
                branch=user.branch
            ).select_related('branch').order_by('username')

        roles_param = self.request.query_params.get('role')
        if roles_param:
            role_list = [r.strip() for r in roles_param.split(',')]
            qs = qs.filter(role__in=role_list)

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserProfileSerializer

    def get_permissions(self):
        if self.action in ('create', 'partial_update'):
            return [IsMainITManager()]
        return [IsAuthenticated()]

    # PATCH /api/v1/accounts/users/{id}/shift/
    @action(detail=True, methods=['patch'], url_path='shift')
    def update_shift(self, request, pk=None):
        target = self.get_object()
        requester = request.user

        if requester.role == 'branch_supervisor':
            if target.branch != requester.branch:
                raise drf_serializers.ValidationError(
                    {'detail': 'Cannot update users outside your branch.'}
                )
            if target.role not in ('branch_technician',):
                raise drf_serializers.ValidationError(
                    {'detail': 'Supervisors can only update shift for branch technicians.'}
                )
        elif requester.role != 'main_it_manager':
            return Response(
                {'detail': 'You do not have permission to perform this action.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_shift = request.data.get('shift')
        valid = [c[0] for c in UserProfile.Shift.choices]
        if new_shift not in valid:
            raise drf_serializers.ValidationError(
                {'shift': f'Must be one of: {", ".join(valid)}'}
            )

        target.shift = new_shift
        target.save(update_fields=['shift'])
        return Response(UserProfileSerializer(target).data)
