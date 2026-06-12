from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0003_ticket_urgency'),
    ]

    operations = [
        migrations.CreateModel(
            name='TicketCounter',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('prefix', models.CharField(max_length=20, unique=True)),
                ('last_number', models.IntegerField(default=0)),
            ],
        ),
        migrations.AddField(
            model_name='ticket',
            name='ticket_number',
            field=models.CharField(blank=True, db_index=True, max_length=20, null=True, unique=True),
        ),
    ]
