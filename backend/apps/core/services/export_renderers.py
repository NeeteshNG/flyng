"""
Multi-Format Export Renderers

Renders querysets into JSON, XML, or PDF using field definitions
from export_fields.py.
"""

import csv
import json
import re
import xml.etree.ElementTree as ET

from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils.timezone import now

from weasyprint import HTML

from apps.organizations.views import get_user_organization


def resolve_attr(obj, dotted_path):
    """
    Resolve a dotted attribute path on an object.

    For dict objects (from flatten_fn), use dict key lookup.
    For model instances, walk attributes via getattr.
    Returns "" for None intermediates.
    """
    if isinstance(obj, dict):
        return obj.get(dotted_path, "")

    parts = dotted_path.split(".")
    current = obj
    for part in parts:
        if current is None:
            return ""
        try:
            current = getattr(current, part)
        except AttributeError:
            return ""
    if current is None:
        return ""
    return current


def iterate_data(config, queryset):
    """
    Prepare queryset and iterate over data rows.

    Handles select_related, prefetch_related, queryset_fn (for
    annotated queries like low-stock), and flatten_fn (for
    denormalized rows like orders with lines).
    """
    # Apply custom queryset transformation (e.g., low-stock annotations)
    if "queryset_fn" in config:
        queryset = config["queryset_fn"](queryset)
    else:
        # Apply select_related and prefetch_related
        if config.get("select_related"):
            queryset = queryset.select_related(*config["select_related"])
        if config.get("prefetch_related"):
            queryset = queryset.prefetch_related(*config["prefetch_related"])

    # Flatten function produces dict rows (e.g., orders with lines)
    if "flatten_fn" in config:
        return config["flatten_fn"](queryset)

    # Normal iteration
    if config.get("use_iterator", True):
        return queryset.iterator()
    return queryset


def _sanitize_tag(header):
    """Convert a header string to a valid XML tag name."""
    tag = header.lower().strip()
    tag = re.sub(r"[^a-z0-9_]", "_", tag)
    tag = re.sub(r"_+", "_", tag)
    tag = tag.strip("_")
    if tag and tag[0].isdigit():
        tag = f"field_{tag}"
    return tag or "field"


def render_csv(config, queryset):
    """Render data as CSV using field definitions."""
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{config["filename"]}.csv"'

    writer = csv.writer(response)
    headers = [h for h, _ in config["fields"]]
    writer.writerow(headers)

    for obj in iterate_data(config, queryset):
        row = [resolve_attr(obj, attr) for _, attr in config["fields"]]
        writer.writerow(row)

    return response


def render_json(config, queryset):
    """Render data as a JSON array of objects."""
    data = []
    for obj in iterate_data(config, queryset):
        row = {}
        for header, attr_path in config["fields"]:
            row[header] = resolve_attr(obj, attr_path)
        data.append(row)

    response = HttpResponse(
        json.dumps(data, default=str, indent=2, ensure_ascii=False),
        content_type="application/json",
    )
    response["Content-Disposition"] = f'attachment; filename="{config["filename"]}.json"'
    return response


def render_xml(config, queryset):
    """Render data as XML with <records><record> structure."""
    root = ET.Element("records")
    root.set("type", config.get("title", ""))

    for obj in iterate_data(config, queryset):
        record = ET.SubElement(root, "record")
        for header, attr_path in config["fields"]:
            field = ET.SubElement(record, _sanitize_tag(header))
            value = resolve_attr(obj, attr_path)
            field.text = str(value) if value != "" else ""

    xml_bytes = ET.tostring(root, encoding="unicode", xml_declaration=False)
    xml_content = f'<?xml version="1.0" encoding="utf-8"?>\n{xml_bytes}'

    response = HttpResponse(xml_content, content_type="application/xml")
    response["Content-Disposition"] = f'attachment; filename="{config["filename"]}.xml"'
    return response


def render_pdf(config, queryset, request):
    """Render data as a professionally styled PDF report."""
    rows = []
    for obj in iterate_data(config, queryset):
        row = []
        for _, attr_path in config["fields"]:
            value = resolve_attr(obj, attr_path)
            row.append(str(value) if value != "" else "")
        rows.append(row)

    org = get_user_organization(request.user)
    headers = [h for h, _ in config["fields"]]

    # Use landscape for wide tables (>8 columns)
    orientation = "landscape" if len(headers) > 8 else "portrait"

    html = render_to_string("exports/report.html", {
        "title": config.get("title", config["filename"]),
        "org_name": org.name if org else "",
        "exported_by": request.user.get_full_name() or request.user.email,
        "exported_at": now(),
        "headers": headers,
        "rows": rows,
        "total_records": len(rows),
        "orientation": orientation,
    })

    pdf = HTML(string=html).write_pdf()
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{config["filename"]}.pdf"'
    return response
