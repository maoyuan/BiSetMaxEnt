# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('datamng', '0014_globalentid_idshift'),
    ]

    operations = [
        migrations.AddField(
            model_name='globalentid',
            name='entTotal',
            field=models.IntegerField(default=0),
            preserve_default=True,
        ),
    ]
