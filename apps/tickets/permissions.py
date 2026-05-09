from rest_framework.permissions import BasePermission

TECHNICIAN_AND_ABOVE = {'branch_technician', 'branch_supervisor', 'main_it_manager'}
SUPERVISOR_AND_ABOVE = {'branch_supervisor', 'main_it_manager'}
CAN_CREATE_TICKET = {'agent', 'branch_technician', 'branch_supervisor'}
CAN_VIEW_TICKETS = {'agent', 'branch_technician', 'branch_supervisor', 'main_it_manager'}


class IsBranchTechnicianOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in TECHNICIAN_AND_ABOVE


class IsBranchSupervisorOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in SUPERVISOR_AND_ABOVE


class IsMainITManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'main_it_manager'


class CanCreateTicket(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in CAN_CREATE_TICKET


class CanViewTickets(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in CAN_VIEW_TICKETS
