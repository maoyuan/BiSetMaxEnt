# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('datamng', '0012_auto_20150219_1412'),
    ]

    operations = [
        migrations.CreateModel(
            name='GlobalEntID',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('domain', models.CharField(max_length=50)),
                ('gIDstart', models.IntegerField(default=0)),
                ('gIDend', models.IntegerField(default=0)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
