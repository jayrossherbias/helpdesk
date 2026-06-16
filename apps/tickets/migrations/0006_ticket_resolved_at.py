from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0005_ticket_related_to'),
    ]

    operations = [
        migrations.AddField(
            model_name='ticket',
            name='resolved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
