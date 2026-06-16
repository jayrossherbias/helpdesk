from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0006_ticket_resolved_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='ticket',
            name='resolution_notes',
            field=models.TextField(blank=True, default=''),
        ),
    ]
