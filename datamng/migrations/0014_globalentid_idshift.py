# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('datamng', '0013_globalentid'),
    ]

    operations = [
        migrations.AddField(
            model_name='globalentid',
            name='idShift',
            field=models.IntegerField(default=0),
            preserve_default=True,
        ),
    ]
