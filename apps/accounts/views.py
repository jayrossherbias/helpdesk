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


class MeView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)


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
    queryset = Branch.objects.all().order_by('name')
    serializer_class = BranchSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

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
