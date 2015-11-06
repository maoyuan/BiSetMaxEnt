# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('datamng', '0004_docname_dataset'),
    ]

    operations = [
        migrations.AddField(
            model_name='docname',
            name='doc_content',
            field=models.TextField(default=b''),
            preserve_default=True,
        ),
    ]
