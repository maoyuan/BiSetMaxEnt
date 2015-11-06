# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('datamng', '0007_auto_20150219_1409'),
    ]

    operations = [
        migrations.RenameField(
            model_name='orgdoc',
            old_name='doc_id',
            new_name='doc',
        ),
        migrations.RenameField(
            model_name='orgdoc',
            old_name='org_name',
            new_name='org',
        ),
    ]
