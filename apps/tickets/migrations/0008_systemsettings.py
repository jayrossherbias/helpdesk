from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0007_ticket_resolution_notes'),
    ]

    operations = [
        migrations.CreateModel(
            name='SystemSettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('auto_routing', models.BooleanField(default=True)),
                ('auto_priority', models.BooleanField(default=True)),
                ('email_notifications', models.BooleanField(default=True)),
                ('sla_alerts', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'System Settings',
            },
        ),
    ]
