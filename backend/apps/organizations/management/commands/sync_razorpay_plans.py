"""
Sync local Plans to Razorpay.

Creates Razorpay plan records for each active non-free Plan,
storing the external plan IDs in razorpay_plan_id and razorpay_annual_plan_id.

Usage:
    python manage.py sync_razorpay_plans          # Sync new plans only
    python manage.py sync_razorpay_plans --force   # Recreate all plans
"""

from django.core.management.base import BaseCommand

from apps.core.choices import PlanType
from apps.organizations.models import Plan
from apps.organizations.payment import RazorpayService


class Command(BaseCommand):
    help = "Sync subscription plans to Razorpay"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Recreate Razorpay plans even if already synced",
        )

    def handle(self, *args, **options):
        force = options["force"]
        service = RazorpayService()

        plans = Plan.objects.filter(is_active=True).exclude(plan_type=PlanType.FREE)
        if not plans.exists():
            self.stdout.write(self.style.WARNING("No active paid plans found."))
            return

        for plan in plans:
            try:
                if not force and plan.razorpay_plan_id and plan.razorpay_annual_plan_id:
                    self.stdout.write(f"  Skipping {plan.name} (already synced)")
                    continue

                service.sync_plan(plan, force=force)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  Synced {plan.name}: "
                        f"monthly={plan.razorpay_plan_id}, "
                        f"annual={plan.razorpay_annual_plan_id}"
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"  Failed to sync {plan.name}: {e}")
                )

        self.stdout.write(self.style.SUCCESS("Plan sync complete."))
