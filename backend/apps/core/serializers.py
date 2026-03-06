"""
Core Serializers

Serializers for ImportJob and CSV import/export operations.
"""

from rest_framework import serializers

from .choices import ImportType
from .models import ImportJob


class ImportJobListSerializer(serializers.ModelSerializer):
    """Serializer for listing import jobs."""

    created_by_email = serializers.EmailField(source="created_by.email", read_only=True, default="")

    class Meta:
        model = ImportJob
        fields = [
            "uuid",
            "import_type",
            "status",
            "original_filename",
            "total_rows",
            "processed_rows",
            "success_count",
            "error_count",
            "skipped_count",
            "progress_percent",
            "created_by_email",
            "created_at",
            "completed_at",
        ]


class ImportJobDetailSerializer(serializers.ModelSerializer):
    """Serializer for import job details."""

    created_by_email = serializers.EmailField(source="created_by.email", read_only=True, default="")

    class Meta:
        model = ImportJob
        fields = [
            "uuid",
            "import_type",
            "status",
            "original_filename",
            "total_rows",
            "processed_rows",
            "success_count",
            "error_count",
            "skipped_count",
            "progress_percent",
            "has_errors",
            "duration_seconds",
            "error_summary",
            "error_message",
            "created_by_email",
            "created_at",
            "completed_at",
            "started_at",
            "notes",
        ]


class ImportJobUploadSerializer(serializers.Serializer):
    """Serializer for CSV upload requests."""

    file = serializers.FileField(help_text="CSV file to import")
    import_type = serializers.ChoiceField(
        choices=ImportType.choices,
        help_text="Type of data being imported",
    )
    warehouse = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Warehouse UUID (required for LOCATIONS and INVENTORY imports)",
    )

    def validate(self, attrs):
        import_type = attrs.get("import_type")
        warehouse = attrs.get("warehouse")

        # Warehouse required for location and inventory imports
        if import_type in [ImportType.LOCATIONS, ImportType.INVENTORY] and not warehouse:
            raise serializers.ValidationError(
                {"warehouse": "Warehouse is required for this import type."}
            )

        # Validate file extension
        uploaded_file = attrs.get("file")
        if uploaded_file:
            name = uploaded_file.name.lower()
            if not name.endswith(".csv"):
                raise serializers.ValidationError(
                    {"file": "Only CSV files are supported."}
                )

        return attrs
