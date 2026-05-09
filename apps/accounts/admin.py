from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Branch, UserProfile


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'is_main_branch', 'created_at')
    list_filter = ('is_main_branch',)
    search_fields = ('name', 'location')


@admin.register(UserProfile)
class UserProfileAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'shift', 'branch', 'is_staff')
    list_filter = ('role', 'shift', 'branch')
    fieldsets = UserAdmin.fieldsets + (
        ('Helpdesk Info', {'fields': ('role', 'shift', 'branch')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Helpdesk Info', {'fields': ('role', 'shift', 'branch')}),
    )
