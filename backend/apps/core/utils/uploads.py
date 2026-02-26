"""
Upload path utilities for FlyNG.

Provides functions for generating file upload paths.
"""

import os


def import_file_upload_path(instance, filename):
    """
    Generate upload path for import files.

    Path format: imports/{org_id}/{import_type}/{uuid}.{ext}
    """
    ext = os.path.splitext(filename)[1]
    new_filename = f"{instance.uuid}{ext}"
    return f"imports/{instance.organization_id}/{instance.import_type.lower()}/{new_filename}"


def import_error_file_upload_path(instance, filename):
    """
    Generate upload path for import error files.

    Path format: imports/{org_id}/errors/{uuid}_errors.csv
    """
    return f"imports/{instance.organization_id}/errors/{instance.uuid}_errors.csv"
