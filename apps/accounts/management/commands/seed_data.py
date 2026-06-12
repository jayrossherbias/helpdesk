from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Branch, UserProfile
from apps.routing.models import RoutingRule


BRANCHES = [
    {'name': 'Main Branch',   'location': 'Head Office, Ortigas',    'is_main_branch': True},
    {'name': 'Makati Branch', 'location': 'Ayala Ave, Makati City',  'is_main_branch': False},
    {'name': 'BGC Branch',    'location': 'BGC, Taguig City',        'is_main_branch': False},
    {'name': 'Cebu Branch',   'location': 'IT Park, Cebu City',      'is_main_branch': False},
    {'name': 'Davao Branch',  'location': 'Lanang, Davao City',      'is_main_branch': False},
    {'name': 'Manila Branch', 'location': 'Ermita, Manila',          'is_main_branch': False},
]

USERS = [
    # Main Branch
    {'username': 'supervisor_main',  'first_name': 'Diana',   'last_name': 'Reyes',        'email': 'sup.main@helpdesk.local',          'role': 'branch_supervisor', 'shift': 'morning',   'branch_name': 'Main Branch'},
    {'username': 'tech_main1',       'first_name': 'Ana',     'last_name': 'Lim',          'email': 'tech1.main@helpdesk.local',        'role': 'branch_technician', 'shift': 'morning',   'branch_name': 'Main Branch'},
    {'username': 'tech_main2',       'first_name': 'Joan',    'last_name': 'Mercado',      'email': 'tech2.main@helpdesk.local',        'role': 'branch_technician', 'shift': 'afternoon', 'branch_name': 'Main Branch'},
    {'username': 'tech_main3',       'first_name': 'Renz',    'last_name': 'Cruz',         'email': 'tech3.main@helpdesk.local',        'role': 'branch_technician', 'shift': 'night',     'branch_name': 'Main Branch'},
    {'username': 'agent_main1',      'first_name': 'Mark',    'last_name': 'Dela Cruz',    'email': 'agent1.main@helpdesk.local',       'role': 'agent',             'shift': 'morning',   'branch_name': 'Main Branch',   'department': 'sales'},
    # Makati Branch
    {'username': 'supervisor_mkti',  'first_name': 'Brian',   'last_name': 'Torres',       'email': 'sup.mkti@helpdesk.local',          'role': 'branch_supervisor', 'shift': 'morning',   'branch_name': 'Makati Branch'},
    {'username': 'tech_mkti1',       'first_name': 'Carlos',  'last_name': 'Reyes',        'email': 'tech1.mkti@helpdesk.local',        'role': 'branch_technician', 'shift': 'morning',   'branch_name': 'Makati Branch'},
    {'username': 'tech_mkti2',       'first_name': 'Maria',   'last_name': 'Torres',       'email': 'tech2.mkti@helpdesk.local',        'role': 'branch_technician', 'shift': 'afternoon', 'branch_name': 'Makati Branch'},
    {'username': 'tech_mkti3',       'first_name': 'Leon',    'last_name': 'Pascual',      'email': 'tech3.mkti@helpdesk.local',        'role': 'branch_technician', 'shift': 'night',     'branch_name': 'Makati Branch'},
    {'username': 'agent_mkti1',      'first_name': 'Jenny',   'last_name': 'Garcia',       'email': 'agent1.mkti@helpdesk.local',       'role': 'agent',             'shift': 'morning',   'branch_name': 'Makati Branch', 'department': 'customer_service'},
    # BGC Branch
    {'username': 'supervisor_bgc',   'first_name': 'Kevin',   'last_name': 'Tan',          'email': 'sup.bgc@helpdesk.local',           'role': 'branch_supervisor', 'shift': 'afternoon', 'branch_name': 'BGC Branch'},
    {'username': 'tech_bgc1',        'first_name': 'Felix',   'last_name': 'Aquino',       'email': 'tech1.bgc@helpdesk.local',         'role': 'branch_technician', 'shift': 'morning',   'branch_name': 'BGC Branch'},
    {'username': 'tech_bgc2',        'first_name': 'Gina',    'last_name': 'Flores',       'email': 'tech2.bgc@helpdesk.local',         'role': 'branch_technician', 'shift': 'afternoon', 'branch_name': 'BGC Branch'},
    {'username': 'tech_bgc3',        'first_name': 'Dex',     'last_name': 'Hernandez',    'email': 'tech3.bgc@helpdesk.local',         'role': 'branch_technician', 'shift': 'night',     'branch_name': 'BGC Branch'},
    {'username': 'agent_bgc1',       'first_name': 'Laura',   'last_name': 'Bautista',     'email': 'agent1.bgc@helpdesk.local',        'role': 'agent',             'shift': 'night',     'branch_name': 'BGC Branch',    'department': 'collections'},
    # Cebu Branch
    {'username': 'supervisor_cebu',  'first_name': 'Rose',    'last_name': 'Navarro',      'email': 'sup.cebu@helpdesk.local',          'role': 'branch_supervisor', 'shift': 'morning',   'branch_name': 'Cebu Branch'},
    {'username': 'tech_cebu1',       'first_name': 'Marco',   'last_name': 'Santos',       'email': 'tech1.cebu@helpdesk.local',        'role': 'branch_technician', 'shift': 'morning',   'branch_name': 'Cebu Branch'},
    {'username': 'tech_cebu2',       'first_name': 'Iris',    'last_name': 'Jimenez',      'email': 'tech2.cebu@helpdesk.local',        'role': 'branch_technician', 'shift': 'afternoon', 'branch_name': 'Cebu Branch'},
    {'username': 'tech_cebu3',       'first_name': 'Bea',     'last_name': 'Castillo',     'email': 'tech3.cebu@helpdesk.local',        'role': 'branch_technician', 'shift': 'night',     'branch_name': 'Cebu Branch'},
    {'username': 'agent_cebu1',      'first_name': 'Jun',     'last_name': 'Villanueva',   'email': 'agent1.cebu@helpdesk.local',       'role': 'agent',             'shift': 'morning',   'branch_name': 'Cebu Branch',   'department': 'quality_assurance'},
    # Davao Branch
    {'username': 'supervisor_davao', 'first_name': 'Victor',  'last_name': 'Ocampo',       'email': 'sup.davao@helpdesk.local',         'role': 'branch_supervisor', 'shift': 'afternoon', 'branch_name': 'Davao Branch'},
    {'username': 'tech_davao1',      'first_name': 'Juan',    'last_name': 'Dela Rosa',    'email': 'tech1.davao@helpdesk.local',       'role': 'branch_technician', 'shift': 'morning',   'branch_name': 'Davao Branch'},
    {'username': 'tech_davao2',      'first_name': 'Tony',    'last_name': 'Kuizon',       'email': 'tech2.davao@helpdesk.local',       'role': 'branch_technician', 'shift': 'afternoon', 'branch_name': 'Davao Branch'},
    {'username': 'tech_davao3',      'first_name': 'Rey',     'last_name': 'Ong',          'email': 'tech3.davao@helpdesk.local',       'role': 'branch_technician', 'shift': 'night',     'branch_name': 'Davao Branch'},
    {'username': 'agent_davao1',     'first_name': 'Nora',    'last_name': 'Esperanza',    'email': 'agent1.davao@helpdesk.local',      'role': 'agent',             'shift': 'morning',   'branch_name': 'Davao Branch',  'department': 'back_office'},
    # Manila Branch
    {'username': 'supervisor_mla',   'first_name': 'Grace',   'last_name': 'Valdez',       'email': 'sup.mla@helpdesk.local',           'role': 'branch_supervisor', 'shift': 'night',     'branch_name': 'Manila Branch'},
    {'username': 'tech_mla1',        'first_name': 'Eric',    'last_name': 'Villafuerte',  'email': 'tech1.mla@helpdesk.local',         'role': 'branch_technician', 'shift': 'morning',   'branch_name': 'Manila Branch'},
    {'username': 'tech_mla2',        'first_name': 'Noel',    'last_name': 'Buenaventura', 'email': 'tech2.mla@helpdesk.local',         'role': 'branch_technician', 'shift': 'afternoon', 'branch_name': 'Manila Branch'},
    {'username': 'tech_mla3',        'first_name': 'Sara',    'last_name': 'Quijano',      'email': 'tech3.mla@helpdesk.local',         'role': 'branch_technician', 'shift': 'night',     'branch_name': 'Manila Branch'},
    {'username': 'agent_mla1',       'first_name': 'Cris',    'last_name': 'Manalo',       'email': 'agent1.mla@helpdesk.local',        'role': 'agent',             'shift': 'afternoon', 'branch_name': 'Manila Branch', 'department': 'technical_support'},
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
        users_updated = 0
        for data in USERS:
            branch = branch_map[data['branch_name']]
            user, created = UserProfile.objects.get_or_create(
                username=data['username'],
                defaults={
                    'email':      data['email'],
                    'role':       data['role'],
                    'shift':      data['shift'],
                    'department': data.get('department'),
                    'branch':     branch,
                    'first_name': data.get('first_name', ''),
                    'last_name':  data.get('last_name', ''),
                },
            )
            if created:
                user.set_password('Test1234!')
                user.save()
                users_created += 1
                self.stdout.write(f'  User created: {user.username} ({user.role})')
            else:
                update_fields = []
                if not user.first_name and data.get('first_name'):
                    user.first_name = data['first_name']
                    user.last_name = data.get('last_name', '')
                    update_fields += ['first_name', 'last_name']
                if data.get('department') and user.department != data['department']:
                    user.department = data['department']
                    update_fields.append('department')
                if update_fields:
                    user.save(update_fields=update_fields)
                    users_updated += 1
                    self.stdout.write(f'  User updated ({", ".join(update_fields)}): {user.username}')

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
            f'\nSeed complete - '
            f'branches: {branches_created} new, '
            f'users: {users_created} new / {users_updated} updated, '
            f'routing rules: {rules_created} new.'
        ))
