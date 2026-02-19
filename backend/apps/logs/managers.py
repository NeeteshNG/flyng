"""
Logs Managers

Custom managers and querysets for logs models.
"""

from django.db import models


class DroneFlightLogQuerySet(models.QuerySet):
    """Custom QuerySet for DroneFlightLog model."""

    def for_organization(self, organization):
        """Get logs for a specific organization."""
        return self.filter(organization=organization)

    def for_warehouse(self, warehouse):
        """Get logs for a specific warehouse."""
        return self.filter(warehouse=warehouse)

    def for_drone(self, drone):
        """Get logs for a specific drone."""
        return self.filter(drone=drone)

    def processed(self):
        """Get processed logs."""
        return self.filter(is_processed=True)

    def unprocessed(self):
        """Get unprocessed logs."""
        return self.filter(is_processed=False)

    def with_errors(self):
        """Get logs with processing errors."""
        return self.exclude(processing_error="")

    def recent(self, limit=20):
        """Get most recent logs."""
        return self.order_by("-flight_date", "-created_at")[:limit]

    def by_date_range(self, start_date, end_date):
        """Get logs within a date range."""
        return self.filter(flight_date__gte=start_date, flight_date__lte=end_date)

    def search(self, query):
        """Search logs by filename or description."""
        return self.filter(
            models.Q(filename__icontains=query)
            | models.Q(description__icontains=query)
            | models.Q(drone__serial_number__icontains=query)
        )


class DroneFlightLogManager(models.Manager):
    """Custom manager for DroneFlightLog model."""

    def get_queryset(self):
        return DroneFlightLogQuerySet(self.model, using=self._db)

    def for_organization(self, organization):
        return self.get_queryset().for_organization(organization)

    def for_warehouse(self, warehouse):
        return self.get_queryset().for_warehouse(warehouse)

    def for_drone(self, drone):
        return self.get_queryset().for_drone(drone)

    def processed(self):
        return self.get_queryset().processed()

    def unprocessed(self):
        return self.get_queryset().unprocessed()

    def recent(self, limit=20):
        return self.get_queryset().recent(limit)

    def search(self, query):
        return self.get_queryset().search(query)


class FlightGraphTemplateQuerySet(models.QuerySet):
    """Custom QuerySet for FlightGraphTemplate model."""

    def active(self):
        """Get active templates."""
        return self.filter(is_active=True)

    def for_organization(self, organization):
        """Get templates for an organization."""
        return self.filter(organization=organization)

    def default_templates(self):
        """Get default system templates (no organization)."""
        return self.filter(organization__isnull=True)

    def by_graph_type(self, graph_type):
        """Get templates by graph type."""
        return self.filter(graph_type=graph_type)


class FlightGraphTemplateManager(models.Manager):
    """Custom manager for FlightGraphTemplate model."""

    def get_queryset(self):
        return FlightGraphTemplateQuerySet(self.model, using=self._db)

    def active(self):
        return self.get_queryset().active()

    def for_organization(self, organization):
        return self.get_queryset().for_organization(organization)

    def default_templates(self):
        return self.get_queryset().default_templates()

    def by_graph_type(self, graph_type):
        return self.get_queryset().by_graph_type(graph_type)


class FlightLogGraphQuerySet(models.QuerySet):
    """Custom QuerySet for FlightLogGraph model."""

    def for_log(self, log):
        """Get graphs for a specific log."""
        return self.filter(log=log)

    def by_template(self, template):
        """Get graphs using a specific template."""
        return self.filter(template=template)


class FlightLogGraphManager(models.Manager):
    """Custom manager for FlightLogGraph model."""

    def get_queryset(self):
        return FlightLogGraphQuerySet(self.model, using=self._db)

    def for_log(self, log):
        return self.get_queryset().for_log(log)

    def by_template(self, template):
        return self.get_queryset().by_template(template)
