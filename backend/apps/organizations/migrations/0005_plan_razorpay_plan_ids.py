"""
Add Razorpay plan ID fields to Plan model.

Stores external Razorpay plan IDs for monthly and annual billing cycles.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0004_alter_historicalsubscription_currency_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="plan",
            name="razorpay_plan_id",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Plan ID from Razorpay for monthly billing",
                max_length=255,
                verbose_name="Razorpay Monthly Plan ID",
            ),
        ),
        migrations.AddField(
            model_name="plan",
            name="razorpay_annual_plan_id",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Plan ID from Razorpay for annual billing",
                max_length=255,
                verbose_name="Razorpay Annual Plan ID",
            ),
        ),
    ]
