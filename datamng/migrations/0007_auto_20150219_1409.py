# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('datamng', '0006_auto_20150219_1405'),
    ]

    operations = [
        migrations.RenameField(
            model_name='miscdoc',
            old_name='doc_id',
            new_name='doc',
        ),
        migrations.RenameField(
            model_name='miscdoc',
            old_name='misc_string',
            new_name='misc',
        ),
    ]
