"""
Flight Log Processing & Graph Generation

Processes uploaded flight log files (ULog, CSV) to extract metadata
and time-series data, then generates graph data from templates.
"""

import csv
import hashlib
import io
import logging
import math
import traceback

from django.utils import timezone

logger = logging.getLogger(__name__)

# Maximum data points to store per topic (downsample larger datasets)
MAX_SERIES_POINTS = 1000


def _downsample(data: list, max_points: int = MAX_SERIES_POINTS) -> list:
    """Downsample a list by taking every Nth item."""
    if len(data) <= max_points:
        return data
    step = max(1, len(data) // max_points)
    # Always include first and last points
    result = data[::step]
    if data[-1] != result[-1]:
        result.append(data[-1])
    return result


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two GPS coordinates."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _compute_sha256(file_field) -> str:
    """Compute SHA256 hash of a file."""
    h = hashlib.sha256()
    file_field.seek(0)
    for chunk in file_field.chunks(8192):
        h.update(chunk)
    file_field.seek(0)
    return h.hexdigest()


# ── ULog Parsing ──


def _parse_ulog(file_field) -> dict:
    """Parse a ULog file and extract time-series topics."""
    from pyulog.core import ULog

    file_field.seek(0)
    content = file_field.read()
    file_field.seek(0)

    ulog = ULog(io.BytesIO(content))

    topics = {}
    columns = set()
    total_points = 0

    # Extract GPS data
    for d in ulog.data_list:
        if d.name == "vehicle_gps_position":
            gps_data = []
            ts = d.data.get("timestamp", [])
            lats = d.data.get("lat", d.data.get("latitude_deg", []))
            lons = d.data.get("lon", d.data.get("longitude_deg", []))
            alts = d.data.get("alt", d.data.get("altitude_msl_m", []))

            t0 = ts[0] if len(ts) > 0 else 0
            for i in range(len(ts)):
                point = {"t": round((ts[i] - t0) / 1e6, 2)}  # microseconds → seconds
                if i < len(lats):
                    # ULog stores lat/lon as int32 * 1e-7 or as float
                    lat_val = lats[i]
                    lon_val = lons[i] if i < len(lons) else 0
                    # If values look like int32 (> 1000), convert
                    if abs(lat_val) > 1000:
                        lat_val = lat_val / 1e7
                        lon_val = lon_val / 1e7
                    point["lat"] = round(lat_val, 7)
                    point["lon"] = round(lon_val, 7)
                if i < len(alts):
                    alt_val = alts[i]
                    # ULog may store alt in mm
                    if abs(alt_val) > 100000:
                        alt_val = alt_val / 1000.0
                    point["alt"] = round(alt_val, 2)
                gps_data.append(point)

            if gps_data:
                topics["gps"] = _downsample(gps_data)
                columns.update(["t", "lat", "lon", "alt"])
                total_points += len(gps_data)
            break

    # Extract battery data
    for d in ulog.data_list:
        if d.name == "battery_status":
            batt_data = []
            ts = d.data.get("timestamp", [])
            pct = d.data.get("remaining", d.data.get("battery_remaining", []))
            volts = d.data.get("voltage_v", d.data.get("voltage_filtered_v", []))

            t0 = ts[0] if len(ts) > 0 else 0
            for i in range(len(ts)):
                point = {"t": round((ts[i] - t0) / 1e6, 2)}
                if i < len(pct):
                    point["percent"] = round(float(pct[i]) * 100, 1) if pct[i] <= 1.0 else round(float(pct[i]), 1)
                if i < len(volts):
                    point["voltage"] = round(float(volts[i]), 2)
                batt_data.append(point)

            if batt_data:
                topics["battery"] = _downsample(batt_data)
                columns.update(["t", "percent", "voltage"])
                total_points += len(batt_data)
            break

    # Extract local position data (x, y, z, speed)
    for d in ulog.data_list:
        if d.name == "vehicle_local_position":
            pos_data = []
            ts = d.data.get("timestamp", [])
            xs = d.data.get("x", [])
            ys = d.data.get("y", [])
            zs = d.data.get("z", [])
            vxs = d.data.get("vx", [])
            vys = d.data.get("vy", [])

            t0 = ts[0] if len(ts) > 0 else 0
            for i in range(len(ts)):
                point = {"t": round((ts[i] - t0) / 1e6, 2)}
                if i < len(xs):
                    point["x"] = round(float(xs[i]), 2)
                if i < len(ys):
                    point["y"] = round(float(ys[i]), 2)
                if i < len(zs):
                    point["z"] = round(abs(float(zs[i])), 2)  # NED → positive altitude
                speed = 0.0
                if i < len(vxs) and i < len(vys):
                    speed = math.sqrt(float(vxs[i]) ** 2 + float(vys[i]) ** 2)
                point["speed"] = round(speed, 2)
                pos_data.append(point)

            if pos_data:
                topics["position"] = _downsample(pos_data)
                columns.update(["t", "x", "y", "z", "speed"])
                total_points += len(pos_data)
            break

    # Extract all remaining ULog topics for interactive explorer
    _extracted_names = {"vehicle_gps_position", "battery_status", "vehicle_local_position"}
    for d in ulog.data_list:
        if d.name in _extracted_names:
            continue
        topic_key = d.name.replace(".", "_")
        if topic_key in topics:
            continue
        ts = d.data.get("timestamp", [])
        if not ts:
            continue
        t0 = ts[0]
        topic_data = []
        for i in range(len(ts)):
            point = {"t": round((ts[i] - t0) / 1e6, 2)}
            for field_name, values in d.data.items():
                if field_name == "timestamp":
                    continue
                if i < len(values):
                    val = values[i]
                    if isinstance(val, (int, float)):
                        point[field_name] = round(float(val), 4)
            topic_data.append(point)
        if topic_data:
            topics[topic_key] = _downsample(topic_data)
            columns.update(topic_data[0].keys())
            total_points += len(topic_data)

    return {
        "topics": topics,
        "columns": sorted(columns),
        "summary": {
            "total_points": total_points,
            "topics_found": list(topics.keys()),
        },
    }


def _extract_ulog_metadata(extracted_data: dict) -> dict:
    """Extract summary metadata from parsed ULog data."""
    meta = {}
    topics = extracted_data.get("topics", {})

    # GPS metadata
    gps = topics.get("gps", [])
    if gps:
        meta["start_latitude"] = gps[0].get("lat")
        meta["start_longitude"] = gps[0].get("lon")
        meta["start_altitude"] = gps[0].get("alt")
        meta["end_latitude"] = gps[-1].get("lat")
        meta["end_longitude"] = gps[-1].get("lon")
        meta["end_altitude"] = gps[-1].get("alt")

        # Compute total distance
        total_dist = 0.0
        for i in range(1, len(gps)):
            lat1 = gps[i - 1].get("lat", 0)
            lon1 = gps[i - 1].get("lon", 0)
            lat2 = gps[i].get("lat", 0)
            lon2 = gps[i].get("lon", 0)
            if lat1 and lon1 and lat2 and lon2:
                total_dist += _haversine(lat1, lon1, lat2, lon2)
        meta["flight_distance_meters"] = round(total_dist, 2)

        # Max altitude
        alts = [p.get("alt") for p in gps if p.get("alt") is not None]
        if alts:
            meta["max_altitude"] = max(alts)

    # Position metadata (speed)
    pos = topics.get("position", [])
    if pos:
        speeds = [p.get("speed", 0) for p in pos if p.get("speed") is not None]
        if speeds:
            meta["max_speed"] = round(max(speeds), 2)
            meta["avg_speed"] = round(sum(speeds) / len(speeds), 2)

        # Duration from position timestamps
        if len(pos) >= 2:
            meta["flight_duration_seconds"] = round(pos[-1].get("t", 0) - pos[0].get("t", 0), 1)
    elif gps and len(gps) >= 2:
        meta["flight_duration_seconds"] = round(gps[-1].get("t", 0) - gps[0].get("t", 0), 1)

    # Battery metadata
    batt = topics.get("battery", [])
    if batt:
        first_pct = batt[0].get("percent")
        last_pct = batt[-1].get("percent")
        if first_pct is not None:
            meta["start_battery_percent"] = round(first_pct, 1)
        if last_pct is not None:
            meta["end_battery_percent"] = round(last_pct, 1)
        if first_pct is not None and last_pct is not None:
            meta["battery_used_percent"] = round(first_pct - last_pct, 1)

    return meta


# ── CSV Parsing ──

# Common column name aliases
_GPS_LAT_NAMES = {"lat", "latitude", "gps_lat", "latitude_deg"}
_GPS_LON_NAMES = {"lon", "longitude", "lng", "gps_lon", "longitude_deg"}
_GPS_ALT_NAMES = {"alt", "altitude", "height", "altitude_m", "altitude_msl_m"}
_TIME_NAMES = {"t", "time", "timestamp", "time_s", "elapsed", "seconds"}
_SPEED_NAMES = {"speed", "ground_speed", "airspeed", "velocity"}
_BATTERY_NAMES = {"battery", "battery_percent", "batt", "remaining", "soc"}


def _find_column(headers: list[str], aliases: set[str]) -> str | None:
    """Find a column name from a set of aliases (case-insensitive)."""
    lower_headers = {h.lower().strip(): h for h in headers}
    for alias in aliases:
        if alias in lower_headers:
            return lower_headers[alias]
    return None


def _parse_csv(file_field) -> dict:
    """Parse a CSV file and extract data."""
    file_field.seek(0)
    content = file_field.read()
    file_field.seek(0)

    if isinstance(content, bytes):
        content = content.decode("utf-8", errors="replace")

    reader = csv.DictReader(io.StringIO(content))
    headers = reader.fieldnames or []

    rows = []
    for row in reader:
        parsed = {}
        for key, val in row.items():
            if val is None or val.strip() == "":
                continue
            try:
                parsed[key] = float(val)
            except ValueError:
                parsed[key] = val.strip()
        if parsed:
            rows.append(parsed)

    if not rows:
        return {"topics": {}, "columns": list(headers), "summary": {"total_points": 0, "topics_found": []}}

    # Try to build standardized topics from detected columns
    topics = {}
    t_col = _find_column(headers, _TIME_NAMES)
    lat_col = _find_column(headers, _GPS_LAT_NAMES)
    lon_col = _find_column(headers, _GPS_LON_NAMES)
    alt_col = _find_column(headers, _GPS_ALT_NAMES)
    speed_col = _find_column(headers, _SPEED_NAMES)
    batt_col = _find_column(headers, _BATTERY_NAMES)

    # Build GPS topic
    if lat_col and lon_col:
        gps_data = []
        for i, row in enumerate(rows):
            point = {"t": float(row.get(t_col, i)) if t_col else float(i)}
            if lat_col in row and isinstance(row[lat_col], (int, float)):
                point["lat"] = round(row[lat_col], 7)
            if lon_col in row and isinstance(row[lon_col], (int, float)):
                point["lon"] = round(row[lon_col], 7)
            if alt_col and alt_col in row and isinstance(row[alt_col], (int, float)):
                point["alt"] = round(row[alt_col], 2)
            if "lat" in point and "lon" in point:
                gps_data.append(point)
        if gps_data:
            topics["gps"] = _downsample(gps_data)

    # Build position/speed topic
    if speed_col or alt_col:
        pos_data = []
        for i, row in enumerate(rows):
            point = {"t": float(row.get(t_col, i)) if t_col else float(i)}
            if speed_col and speed_col in row and isinstance(row[speed_col], (int, float)):
                point["speed"] = round(row[speed_col], 2)
            if alt_col and alt_col in row and isinstance(row[alt_col], (int, float)):
                point["z"] = round(row[alt_col], 2)
            if len(point) > 1:  # has more than just "t"
                pos_data.append(point)
        if pos_data:
            topics["position"] = _downsample(pos_data)

    # Build battery topic
    if batt_col:
        batt_data = []
        for i, row in enumerate(rows):
            if batt_col in row and isinstance(row[batt_col], (int, float)):
                point = {
                    "t": float(row.get(t_col, i)) if t_col else float(i),
                    "percent": round(row[batt_col], 1),
                }
                batt_data.append(point)
        if batt_data:
            topics["battery"] = _downsample(batt_data)

    # Also store raw CSV data as a topic for flexible graph generation
    topics["csv"] = _downsample(rows)

    return {
        "topics": topics,
        "columns": list(headers),
        "summary": {
            "total_points": len(rows),
            "topics_found": list(topics.keys()),
        },
    }


# ── Main Processing ──


def process_flight_log(log_id: int) -> None:
    """
    Process an uploaded flight log file.

    Extracts metadata and time-series data, then auto-generates
    graphs from active templates.
    """
    from .models import DroneFlightLog, FlightGraphTemplate, FlightLogGraph

    try:
        log = DroneFlightLog.objects.get(id=log_id)
    except DroneFlightLog.DoesNotExist:
        logger.error("Flight log %s not found", log_id)
        return

    try:
        # Compute file hash
        log.file_hash = _compute_sha256(log.file)

        # Parse based on file extension
        ext = log.filename.lower().rsplit(".", 1)[-1] if "." in log.filename else ""

        if ext in ("ulg", "ulog"):
            extracted = _parse_ulog(log.file)
            meta = _extract_ulog_metadata(extracted)
        elif ext in ("csv", "log", "txt"):
            extracted = _parse_csv(log.file)
            meta = _extract_ulog_metadata(extracted)  # Same extraction logic works
        else:
            # Unknown format — store raw as empty
            extracted = {"topics": {}, "columns": [], "summary": {"total_points": 0, "topics_found": []}}
            meta = {}

        # Update log with extracted data and metadata
        log.extracted_data = extracted
        update_fields = ["file_hash", "extracted_data", "is_processed", "processed_at", "processing_error"]

        for field, value in meta.items():
            if value is not None and getattr(log, field, None) is None:
                setattr(log, field, value)
                update_fields.append(field)

        log.is_processed = True
        log.processed_at = timezone.now()
        log.processing_error = ""
        log.save(update_fields=update_fields)

        logger.info("Processed flight log %s (%s points)", log.filename, extracted["summary"]["total_points"])

        # Auto-generate graphs from active templates
        _auto_generate_graphs(log)

    except Exception:
        log.processing_error = traceback.format_exc()
        log.is_processed = False
        log.processed_at = None
        log.save(update_fields=["processing_error", "is_processed", "processed_at"])
        logger.exception("Failed to process flight log %s", log.filename)


def _auto_generate_graphs(log) -> None:
    """Generate graphs for a processed log using all active templates."""
    from .models import FlightGraphTemplate, FlightLogGraph

    # Get active templates (org-specific + system-wide)
    templates = FlightGraphTemplate.objects.filter(is_active=True).filter(
        models_Q_org_or_system(log.organization_id)
    )

    for template in templates:
        graph, created = FlightLogGraph.objects.get_or_create(
            log=log,
            template=template,
            defaults={"title": ""},
        )
        if created or not graph.is_generated:
            generate_graph_data(graph.id)


def models_Q_org_or_system(org_id):
    """Return Q filter for org-specific or system-wide templates."""
    from django.db.models import Q
    return Q(organization_id=org_id) | Q(organization__isnull=True)


# ── Graph Generation ──


def generate_graph_data(graph_id: int) -> None:
    """
    Generate visualization data for a FlightLogGraph.

    Reads extracted_data from the log, matches fields from the template,
    and produces a series ready for Recharts consumption.
    """
    from .models import FlightLogGraph

    try:
        graph = FlightLogGraph.objects.select_related("log", "template").get(id=graph_id)
    except FlightLogGraph.DoesNotExist:
        logger.error("FlightLogGraph %s not found", graph_id)
        return

    try:
        log = graph.log
        template = graph.template
        extracted = log.extracted_data or {}
        topics = extracted.get("topics", {})

        if not topics:
            graph.generation_error = "No extracted data available. Process the log first."
            graph.save(update_fields=["generation_error"])
            return

        x_field = template.x_axis_field
        y_field = template.y_axis_field
        z_field = template.z_axis_field or ""

        # Find the topic containing our fields
        series = _extract_series(topics, x_field, y_field, z_field)

        if not series:
            graph.generation_error = f"Fields '{x_field}' / '{y_field}' not found in extracted data."
            graph.save(update_fields=["generation_error"])
            return

        # Downsample for frontend performance
        series = _downsample(series)

        graph.graph_data = {
            "series": series,
            "x_label": template.x_axis_label or x_field,
            "y_label": template.y_axis_label or y_field,
            "z_label": template.z_axis_label or z_field if z_field else None,
            "chart_type": template.graph_type,
        }
        graph.is_generated = True
        graph.generated_at = timezone.now()
        graph.generation_error = ""
        graph.save(update_fields=["graph_data", "is_generated", "generated_at", "generation_error"])

        logger.info("Generated graph '%s' (%d points)", graph.display_title, len(series))

    except Exception:
        graph.generation_error = traceback.format_exc()
        graph.is_generated = False
        graph.save(update_fields=["generation_error", "is_generated"])
        logger.exception("Failed to generate graph %s", graph_id)


def _extract_series(
    topics: dict, x_field: str, y_field: str, z_field: str = ""
) -> list[dict]:
    """
    Extract a data series from topics matching the requested fields.

    Searches through all topics to find data points containing both
    x_field and y_field.
    """
    # Search each topic for matching fields
    for topic_name, data_points in topics.items():
        if not data_points or not isinstance(data_points, list):
            continue

        sample = data_points[0]
        if not isinstance(sample, dict):
            continue

        has_x = x_field in sample
        has_y = y_field in sample
        has_z = z_field in sample if z_field else True

        if has_x and has_y:
            series = []
            for point in data_points:
                entry = {
                    x_field: point.get(x_field),
                    y_field: point.get(y_field),
                }
                if z_field and z_field in point:
                    entry[z_field] = point.get(z_field)
                if entry[x_field] is not None and entry[y_field] is not None:
                    series.append(entry)
            return series

    # If no topic matches directly, try building from multiple topics
    # e.g., x=t from gps, y=percent from battery — merge by timestamp
    x_topic = None
    y_topic = None
    for topic_name, data_points in topics.items():
        if not data_points or not isinstance(data_points[0], dict):
            continue
        if x_field in data_points[0]:
            x_topic = (topic_name, data_points)
        if y_field in data_points[0]:
            y_topic = (topic_name, data_points)

    if x_topic and y_topic and x_topic[0] != y_topic[0]:
        # Cross-topic merge using nearest timestamp matching
        x_data = x_topic[1]
        y_data = y_topic[1]

        # Build y-value lookup by time
        y_by_time = {}
        for p in y_data:
            t = p.get("t")
            if t is not None:
                y_by_time[round(t, 1)] = p.get(y_field)

        series = []
        for p in x_data:
            t = p.get("t")
            x_val = p.get(x_field)
            if t is not None and x_val is not None:
                # Find nearest y value
                t_rounded = round(t, 1)
                y_val = y_by_time.get(t_rounded)
                if y_val is None:
                    # Find closest
                    closest_t = min(y_by_time.keys(), key=lambda k: abs(k - t), default=None)
                    if closest_t is not None and abs(closest_t - t) < 5.0:
                        y_val = y_by_time[closest_t]
                if y_val is not None:
                    series.append({x_field: x_val, y_field: y_val})
        return series

    return []
