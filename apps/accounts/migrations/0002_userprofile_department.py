from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='department',
            field=models.CharField(
                blank=True,
                choices=[
                    ('sales', 'Sales'),
                    ('customer_service', 'Customer Service'),
                    ('collections', 'Collections'),
                    ('technical_support', 'Technical Support'),
                    ('quality_assurance', 'Quality Assurance'),
                    ('back_office', 'Back Office'),
                ],
                max_length=30,
                null=True,
            ),
        ),
    ]
