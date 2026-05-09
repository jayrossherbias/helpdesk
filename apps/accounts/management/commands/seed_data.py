from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Branch, UserProfile
from apps.routing.models import RoutingRule


BRANCHES = [
    {'name': 'Main Branch',   'location': 'Head Office, Ortigas',   'is_main_branch': True},
    {'name': 'Makati Branch', 'location': 'Ayala Ave, Makati City', 'is_main_branch': False},
    {'name': 'BGC Branch',    'location': 'BGC, Taguig City',       'is_main_branch': False},
]

USERS = [
    # Makati Branch
    {'username': 'supervisor_mkti', 'email': 'sup.mkti@helpdesk.local',   'role': 'branch_supervisor',  'shift': 'morning',   'branch_name': 'Makati Branch'},
    {'username': 'tech_mkti1',      'email': 'tech1.mkti@helpdesk.local', 'role': 'branch_technician',  'shift': 'morning',   'branch_name': 'Makati Branch'},
    {'username': 'tech_mkti2',      'email': 'tech2.mkti@helpdesk.local', 'role': 'branch_technician',  'shift': 'afternoon', 'branch_name': 'Makati Branch'},
    {'username': 'agent_mkti1',     'email': 'agent1.mkti@helpdesk.local','role': 'agent',              'shift': 'morning',   'branch_name': 'Makati Branch'},
    # BGC Branch
    {'username': 'supervisor_bgc',  'email': 'sup.bgc@helpdesk.local',    'role': 'branch_supervisor',  'shift': 'afternoon', 'branch_name': 'BGC Branch'},
    {'username': 'tech_bgc1',       'email': 'tech1.bgc@helpdesk.local',  'role': 'branch_technician',  'shift': 'afternoon', 'branch_name': 'BGC Branch'},
    {'username': 'agent_bgc1',      'email': 'agent1.bgc@helpdesk.local', 'role': 'agent',              'shift': 'night',     'branch_name': 'BGC Branch'},
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
        'target_role': 'branch_supervisor',
        'priority_order': 5,
    },
]


class Command(BaseCommand):
    help = 'Seed the database with branches, users, and routing rules.'

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
        for data in USERS:
            branch = branch_map[data['branch_name']]
            if UserProfile.objects.filter(username=data['username']).exists():
                continue
            user = UserProfile(
                username=data['username'],
                email=data['email'],
                role=data['role'],
                shift=data['shift'],
                branch=branch,
            )
            user.set_password('Test1234!')
            user.save()
            users_created += 1
            self.stdout.write(f'  User created: {user.username} ({user.role})')

        # --- Routing Rules ---
        rules_created = 0
        for data in ROUTING_RULES:
            _, created = RoutingRule.objects.get_or_create(
                category=data['category'],
                branch=None,
                defaults={
                    'keywords': data['keywords'],
                    'assigned_team_name': data['assigned_team_name'],
                    'target_role': data['target_role'],
                    'priority_order': data['priority_order'],
                },
            )
            if created:
                rules_created += 1
                self.stdout.write(f'  Rule created: {data["category"]} -> {data["assigned_team_name"]}')

        self.stdout.write(self.style.SUCCESS(
            f'\nSeed complete - '
            f'branches: {branches_created} new, '
            f'users: {users_created} new, '
            f'routing rules: {rules_created} new.'
        ))
