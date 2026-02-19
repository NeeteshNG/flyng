"""
Unfold Admin Callbacks for FlyNG
These callbacks provide dynamic content for the admin dashboard
"""

import os


def environment_callback(request):
    """
    Returns environment badge for the admin header.
    Shows different colors based on DEBUG setting.
    """
    debug = os.environ.get("DEBUG", "True").lower() == "true"

    if debug:
        return {
            "text": "Development",
            "color": "warning",  # Yellow/Orange
        }
    return {
        "text": "Production",
        "color": "danger",  # Red
    }


def dashboard_callback(request, context):
    """
    Adds custom context to the admin dashboard.
    This will be expanded as we build more features.
    """
    # Import here to avoid circular imports
    from apps.users.models import User

    # Get stats for dashboard
    context.update(
        {
            "stats": {
                "total_users": User.objects.count(),
                "active_users": User.objects.filter(is_active=True).count(),
                "admin_users": User.objects.filter(is_superuser=True).count(),
            },
            "kpis": [
                {
                    "title": "Total Users",
                    "metric": User.objects.count(),
                    "icon": "person",
                    "footer": {
                        "text": "Active users in the system",
                    },
                },
                {
                    "title": "Active Drones",
                    "metric": 0,  # Will be updated when drone model exists
                    "icon": "flight",
                    "footer": {
                        "text": "Drones currently operational",
                    },
                },
                {
                    "title": "Open Orders",
                    "metric": 0,  # Will be updated when orders model exists
                    "icon": "shopping_cart",
                    "footer": {
                        "text": "Orders pending fulfillment",
                    },
                },
                {
                    "title": "Jobs in Queue",
                    "metric": 0,  # Will be updated when jobs model exists
                    "icon": "queue",
                    "footer": {
                        "text": "Jobs waiting to be processed",
                    },
                },
            ],
        }
    )
    return context


def warehouse_badge(request):
    """
    Returns badge count for warehouses.
    Will show total warehouse count.
    """
    # TODO: Update when warehouse model exists
    # from apps.warehouses.models import Warehouse
    # count = Warehouse.objects.count()
    count = 0
    return count if count > 0 else None


def drone_badge(request):
    """
    Returns badge count for active drones.
    Will show count of drones currently active.
    """
    # TODO: Update when drone model exists
    # from apps.drones.models import Drone
    # count = Drone.objects.filter(status='ACTIVE').count()
    count = 0
    return count if count > 0 else None


def jobs_badge(request):
    """
    Returns badge count for pending jobs.
    Shows jobs that need attention.
    """
    # TODO: Update when jobs model exists
    # from apps.orders.models import Job
    # count = Job.objects.filter(status__in=['NEW', 'QUEUED']).count()
    count = 0
    return count if count > 0 else None
