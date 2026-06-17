from rest_framework.permissions import BasePermission


# [OOP: Inheritance] Extends DRF's BasePermission, inheriting the permission-checking contract
# [OOP: Polymorphism] All three classes respond to the same has_permission() call differently
# [OOP: Method Overriding] Each class overrides has_permission() with its own role check

# Allows only the Main IT Manager role
class IsMainITManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'main_it_manager'


# Allows Branch Supervisor and above
class IsBranchSupervisorOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in {
            'branch_supervisor', 'main_it_manager'
        }


# Allows Branch Technician and above
class IsBranchTechnicianOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in {
            'branch_technician', 'branch_supervisor', 'main_it_manager'
        }
