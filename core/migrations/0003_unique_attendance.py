from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_userprofile'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='ticket',
            unique_together={('user', 'event')},
        ),
        migrations.AlterUniqueTogether(
            name='participation',
            unique_together={('user', 'event')},
        ),
    ]
