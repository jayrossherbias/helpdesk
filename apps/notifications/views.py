from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from .models import Notification


def _serialize(notification):
    return {
        'id': str(notification.id),
        'notification_type': notification.notification_type,
        'message': notification.message,
        'ticket': (
            {'id': str(notification.ticket.id), 'title': notification.ticket.title}
            if notification.ticket else None
        ),
        'is_read': notification.is_read,
        'created_at': notification.created_at,
    }


class NotificationViewSet(ViewSet):
    permission_classes = (IsAuthenticated,)

    def _qs(self, request):
        return (
            Notification.objects.filter(recipient=request.user)
            .select_related('ticket')
            .order_by('-created_at')
        )

    def list(self, request):
        qs = self._qs(request)
        return Response({
            'unread_count': qs.filter(is_read=False).count(),
            'results': [_serialize(n) for n in qs],
        })

    # PATCH /api/v1/notifications/{id}/read/
    @action(detail=True, methods=['patch'], url_path='read')
    def mark_read(self, request, pk=None):
        try:
            n = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        n.is_read = True
        n.save(update_fields=['is_read'])
        return Response({'id': str(n.id), 'is_read': True})

    # POST /api/v1/notifications/read-all/
    @action(detail=False, methods=['post'], url_path='read-all')
    def read_all(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({'marked_read': count})
