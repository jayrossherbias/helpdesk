from rest_framework.permissions import BasePermission


class IsMainITManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'main_it_manager'


class IsBranchSupervisorOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in {
            'branch_supervisor', 'main_it_manager'
        }


class IsBranchTechnicianOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in {
            'branch_technician', 'branch_supervisor', 'main_it_manager'
        }
