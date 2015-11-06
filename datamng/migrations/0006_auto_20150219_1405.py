# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('datamng', '0005_docname_doc_content'),
    ]

    operations = [
        migrations.RenameField(
            model_name='moneydoc',
            old_name='doc_id',
            new_name='doc',
        ),
        migrations.RenameField(
            model_name='moneydoc',
            old_name='money_string',
            new_name='money',
        ),
    ]
