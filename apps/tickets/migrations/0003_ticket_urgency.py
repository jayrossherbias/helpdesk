from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0002_ticketlog'),
    ]

    operations = [
        migrations.AddField(
            model_name='ticket',
            name='urgency',
            field=models.CharField(
                choices=[
                    ('cannot_work',        'Cannot work — completely blocked'),
                    ('severely_impacted',  'Severely impacted — major disruption'),
                    ('partially_impacted', 'Partially impacted — can work with workarounds'),
                    ('minor_issue',        'Minor issue — slight inconvenience'),
                ],
                default='minor_issue',
                max_length=20,
            ),
        ),
    ]
