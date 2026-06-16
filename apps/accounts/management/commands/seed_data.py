from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Branch, UserProfile
from apps.routing.models import RoutingRule


BRANCHES = [
    {'name': 'Main Branch',      'location': 'Mandaluyong City, Metro Manila', 'is_main_branch': True},
    {'name': 'Victorias Branch', 'location': 'Victorias City, Negros Occidental', 'is_main_branch': False},
]

USERS = [
    {
        'username':   'admin',
        'first_name': 'Jay Ross',
        'last_name':  'Herbias',
        'email':      'jayrossrusselherbias@gmail.com',
        'role':       'main_it_manager',
        'shift':      None,
        'branch_name': 'Main Branch',
    },
]

ROUTING_RULES = [
    {
        'category': 'voip_dialer',
        'keywords': 'voip,dialer,phone,headset,call drop,no audio,echo',
        'assigned_team_name': 'VoIP Support',
        'target_role': 'branch_technician',
        'priority_order': 1,
    },
    {
        'category': 'crm_software',
        'keywords': 'crm,salesforce,zendesk,software,crash,freeze,slow app',
        'assigned_team_name': 'CRM Support',
        'target_role': 'branch_technician',
        'priority_order': 2,
    },
    {
        'category': 'workstation',
        'keywords': 'workstation,pc,laptop,monitor,keyboard,mouse,printer,hardware',
        'assigned_team_name': 'Hardware Support',
        'target_role': 'branch_technician',
        'priority_order': 3,
    },
    {
        'category': 'network',
        'keywords': 'network,wifi,internet,connectivity,vpn,slow connection,no internet',
        'assigned_team_name': 'Network Support',
        'target_role': 'branch_technician',
        'priority_order': 4,
    },
    {
        'category': 'account_access',
        'keywords': 'password,account,login,access,reset,unlock,locked out,credentials',
        'assigned_team_name': 'Access Management',
        'target_role': 'branch_technician',
        'priority_order': 5,
    },
]


class Command(BaseCommand):
    help = 'Seed the database with branches, the admin account, and routing rules.'

    @transaction.atomic
    def handle(self, *args, **options):
        # --- Branches ---
        branch_map = {}
        branches_created = 0
        for data in BRANCHES:
            obj, created = Branch.objects.get_or_create(
                name=data['name'],
                defaults={'location': data['location'], 'is_main_branch': data['is_main_branch']},
            )
            branch_map[data['name']] = obj
            if created:
                branches_created += 1
                self.stdout.write(f'  Branch created: {obj.name}')

        # --- Users ---
        users_created = 0
        users_updated = 0
        for data in USERS:
            branch = branch_map[data['branch_name']]
            user, created = UserProfile.objects.get_or_create(
                email=data['email'],
                defaults={
                    'username':   data['username'],
                    'role':       data['role'],
                    'shift':      data.get('shift'),
                    'branch':     branch,
                    'first_name': data.get('first_name', ''),
                    'last_name':  data.get('last_name', ''),
                },
            )
            if created:
                user.set_password('Admin1234!')
                user.save()
                users_created += 1
                self.stdout.write(f'  User created: {user.username} ({user.role})')
            elif user.email != data['email']:
                user.email = data['email']
                user.first_name = data.get('first_name', '')
                user.last_name = data.get('last_name', '')
                user.set_password('Admin1234!')
                user.save()
                users_updated += 1
                self.stdout.write(f'  User updated: {user.username}')

        # --- Routing Rules ---
        rules_created = 0
        for data in ROUTING_RULES:
            _, created = RoutingRule.objects.get_or_create(
                category=data['category'],
                branch=None,
                defaults={
                    'keywords':           data['keywords'],
                    'assigned_team_name': data['assigned_team_name'],
                    'target_role':        data['target_role'],
                    'priority_order':     data['priority_order'],
                },
            )
            if created:
                rules_created += 1
                self.stdout.write(f'  Rule created: {data["category"]} -> {data["assigned_team_name"]}')

        self.stdout.write(self.style.SUCCESS(
            f'\nSeed complete — '
            f'branches: {branches_created} new, '
            f'users: {users_created} new / {users_updated} updated, '
            f'routing rules: {rules_created} new.'
        ))
