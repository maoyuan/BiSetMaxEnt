# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('datamng', '0008_auto_20150219_1410'),
    ]

    operations = [
        migrations.RenameField(
            model_name='datedoc',
            old_name='date_string',
            new_name='date',
        ),
        migrations.RenameField(
            model_name='datedoc',
            old_name='doc_id',
            new_name='doc',
        ),
    ]
