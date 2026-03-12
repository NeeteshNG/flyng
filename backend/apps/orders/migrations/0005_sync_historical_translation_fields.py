"""
Add translation fields to HistoricalPickOrder table.

django-modeltranslation adds _en/_hi variants to PickOrder dynamically,
but django-simple-history's HistoricalPickOrder doesn't pick them up
automatically. This migration adds the missing columns.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_add_customer_model"),
    ]

    operations = [
        migrations.AddField(
            model_name="historicalpickorder",
            name="notes_en",
            field=models.TextField(blank=True, default="", null=True),
        ),
        migrations.AddField(
            model_name="historicalpickorder",
            name="notes_hi",
            field=models.TextField(blank=True, default="", null=True),
        ),
        migrations.AddField(
            model_name="historicalpickorder",
            name="internal_notes_en",
            field=models.TextField(blank=True, default="", null=True),
        ),
        migrations.AddField(
            model_name="historicalpickorder",
            name="internal_notes_hi",
            field=models.TextField(blank=True, default="", null=True),
        ),
        migrations.AddField(
            model_name="historicalpickorder",
            name="cancellation_reason_en",
            field=models.TextField(blank=True, default="", null=True),
        ),
        migrations.AddField(
            model_name="historicalpickorder",
            name="cancellation_reason_hi",
            field=models.TextField(blank=True, default="", null=True),
        ),
    ]
