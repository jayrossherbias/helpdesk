from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import MajorIncident
from .serializers import MajorIncidentSerializer


class MajorIncidentViewSet(ReadOnlyModelViewSet):
    serializer_class = MajorIncidentSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        qs = (
            MajorIncident.objects
            .select_related('branch')
            .prefetch_related('tickets')
            .order_by('-created_at')
        )
        if user.role != 'main_it_manager':
            qs = qs.filter(branch=user.branch)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs
