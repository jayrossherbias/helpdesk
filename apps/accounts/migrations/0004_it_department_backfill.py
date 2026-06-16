from django.db import migrations


def set_it_department(apps, schema_editor):
    UserProfile = apps.get_model('accounts', 'UserProfile')
    UserProfile.objects.filter(
        role__in=['branch_technician', 'branch_supervisor', 'main_it_manager'],
        department__isnull=True,
    ).update(department='it_department')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_userprofile_email_unique'),
    ]

    operations = [
        migrations.RunPython(set_it_department, migrations.RunPython.noop),
    ]
