from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('sla_warning', 'SLA Warning'),
                    ('escalation_triggered', 'Escalation Triggered'),
                    ('ticket_assigned', 'Ticket Assigned'),
                    ('ticket_resolved', 'Ticket Resolved'),
                    ('ticket_updated', 'Ticket Updated'),
                ],
                max_length=25,
            ),
        ),
    ]
