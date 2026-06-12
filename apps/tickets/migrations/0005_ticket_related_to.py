import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0004_ticketcounter_ticket_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='ticket',
            name='related_to',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='follow_ups',
                to='tickets.ticket',
            ),
        ),
    ]
