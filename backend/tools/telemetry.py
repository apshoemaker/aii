"""Tool 2: Live GCS telemetry reader and analyzer."""
import math
import urllib.parse

import httpx
from langchain_core.tools import tool

GCS_BASE = "https://storage.googleapis.com/storage/v1/b"
GCS_BUCKET = "p-2-cen1"
GCS_OBJECT = "October/1/October_105_1.txt"

# Comprehensive parameter labels based on telemetry analysis
# Type 2 = float, Type 3 = hex/status code, Type 6 = integer
PARAM_LABELS = {
    # Position in FEET, Earth-centered ICRF (multiply by 0.0003048 for km)
    "2003": {"label": "Position X", "unit": "ft", "category": "position", "note": "Earth-centered ICRF. Multiply by 0.0003048 for km."},
    "2004": {"label": "Position Y", "unit": "ft", "category": "position", "note": "Earth-centered ICRF. Multiply by 0.0003048 for km."},
    "2005": {"label": "Position Z", "unit": "ft", "category": "position", "note": "Earth-centered ICRF. Multiply by 0.0003048 for km."},
    # Velocity in FEET/SECOND (multiply by 0.0003048 for km/s)
    "2009": {"label": "Velocity X", "unit": "ft/s", "category": "velocity", "note": "Multiply by 0.0003048 for km/s."},
    "2010": {"label": "Velocity Y", "unit": "ft/s", "category": "velocity", "note": "Multiply by 0.0003048 for km/s."},
    "2011": {"label": "Velocity Z", "unit": "ft/s", "category": "velocity", "note": "Multiply by 0.0003048 for km/s."},
    # Attitude quaternion (unitless, describes spacecraft orientation)
    "2012": {"label": "Attitude Quaternion X", "unit": "", "category": "attitude"},
    "2013": {"label": "Attitude Quaternion Y", "unit": "", "category": "attitude"},
    "2014": {"label": "Attitude Quaternion Z", "unit": "", "category": "attitude"},
    "2015": {"label": "Attitude Quaternion W", "unit": "", "category": "attitude"},
    # Status codes
    "2016": {"label": "Spacecraft Mode/Submode", "unit": "hex", "category": "status", "note": "Type 3 (hex status code)"},
    "2025": {"label": "Status Flag", "unit": "", "category": "status"},
    "2026": {"label": "Command Counter / Sequence ID", "unit": "", "category": "status"},
    # Solar array angles (radians) — 4 arrays, each with pitch and yaw
    "2048": {"label": "Solar Array Angle (reference)", "unit": "rad", "category": "solar_arrays"},
    "2049": {"label": "Solar Array 1 Pitch", "unit": "rad", "category": "solar_arrays"},
    "2050": {"label": "Solar Array 1 Yaw", "unit": "rad", "category": "solar_arrays"},
    "2051": {"label": "Solar Array 1 Roll", "unit": "rad", "category": "solar_arrays"},
    "2052": {"label": "Solar Array 2 Pitch", "unit": "rad", "category": "solar_arrays"},
    "2053": {"label": "Solar Array 2 Yaw", "unit": "rad", "category": "solar_arrays"},
    "2054": {"label": "Solar Array 2 Roll", "unit": "rad", "category": "solar_arrays"},
    "2055": {"label": "Solar Array 2 Angle 2", "unit": "rad", "category": "solar_arrays"},
    "2056": {"label": "Solar Array 3 Pitch", "unit": "rad", "category": "solar_arrays"},
    "2057": {"label": "Solar Array 3 Yaw", "unit": "rad", "category": "solar_arrays"},
    "2058": {"label": "Solar Array 3 Roll", "unit": "rad", "category": "solar_arrays"},
    "2059": {"label": "Solar Array 3 Angle 2", "unit": "rad", "category": "solar_arrays"},
    "2060": {"label": "Solar Array 4 Pitch", "unit": "rad", "category": "solar_arrays"},
    "2061": {"label": "Solar Array 4 Yaw", "unit": "rad", "category": "solar_arrays"},
    "2062": {"label": "Solar Array 4 Roll", "unit": "rad", "category": "solar_arrays"},
    "2063": {"label": "Solar Array 4 Angle 2", "unit": "rad", "category": "solar_arrays"},
    "2064": {"label": "Antenna Pitch", "unit": "rad", "category": "solar_arrays"},
    "2065": {"label": "Antenna Yaw", "unit": "rad", "category": "solar_arrays"},
    # Orbital elements / derived angles
    "2066": {"label": "Orbit Angle 1 (possibly RA)", "unit": "rad", "category": "orbital"},
    "2067": {"label": "Orbit Angle 2 (possibly Dec)", "unit": "rad", "category": "orbital"},
    "2068": {"label": "Orbit Angle 3", "unit": "rad", "category": "orbital"},
    "2069": {"label": "Sun Vector X", "unit": "", "category": "sun_vector"},
    "2070": {"label": "Sun Vector Y", "unit": "", "category": "sun_vector"},
    "2071": {"label": "Sun Vector Z", "unit": "", "category": "sun_vector"},
    "2072": {"label": "Moon Vector X", "unit": "", "category": "moon_vector"},
    "2073": {"label": "Moon Vector Y", "unit": "", "category": "moon_vector"},
    "2074": {"label": "Moon Vector Z", "unit": "", "category": "moon_vector"},
    "2075": {"label": "Earth Vector X (body frame)", "unit": "", "category": "earth_vector"},
    "2076": {"label": "Earth Vector Y (body frame)", "unit": "", "category": "earth_vector"},
    "2077": {"label": "Earth Vector Z (body frame)", "unit": "", "category": "earth_vector"},
    "2078": {"label": "Nadir Vector Magnitude", "unit": "", "category": "vectors"},
    "2079": {"label": "Angular Offset 1", "unit": "rad", "category": "vectors"},
    "2080": {"label": "Angular Offset 2", "unit": "rad", "category": "vectors"},
    "2081": {"label": "Angular Offset 3", "unit": "rad", "category": "vectors"},
    "2082": {"label": "Angular Offset 4", "unit": "rad", "category": "vectors"},
    "2083": {"label": "Thruster/RCS Metric 1", "unit": "", "category": "propulsion"},
    "2084": {"label": "Thruster/RCS Metric 2", "unit": "", "category": "propulsion"},
    "2085": {"label": "Thruster/RCS Metric 3", "unit": "", "category": "propulsion"},
    "2086": {"label": "Thruster/RCS Metric 4", "unit": "", "category": "propulsion"},
    "2087": {"label": "Delta-V Component 1", "unit": "", "category": "propulsion"},
    "2088": {"label": "Delta-V Component 2", "unit": "", "category": "propulsion"},
    "2089": {"label": "Delta-V Component 3", "unit": "", "category": "propulsion"},
    "2090": {"label": "GNC Mode Status", "unit": "hex", "category": "status", "note": "Type 3 (hex GNC mode)"},
    # Angular rates (rad/s — very small values indicate stable attitude)
    "2091": {"label": "Angular Rate X (Roll)", "unit": "rad/s", "category": "angular_rates"},
    "2092": {"label": "Angular Rate Y (Pitch)", "unit": "rad/s", "category": "angular_rates"},
    "2093": {"label": "Angular Rate Z (Yaw)", "unit": "rad/s", "category": "angular_rates"},
    "2094": {"label": "Angular Rate Magnitude", "unit": "rad/s", "category": "angular_rates"},
    # Star tracker / sensor angles (values near pi suggest pointing angles)
    "2095": {"label": "Sensor Angle 1", "unit": "rad", "category": "sensors"},
    "2096": {"label": "Sensor Angle 2", "unit": "rad", "category": "sensors"},
    "2097": {"label": "Sensor Angle 3", "unit": "rad", "category": "sensors"},
    "2098": {"label": "Sensor Angle 4", "unit": "rad", "category": "sensors"},
    "2099": {"label": "Sensor Status Code", "unit": "hex", "category": "status", "note": "Type 3 (hex sensor status)"},
    # Fine attitude control (very small values — residual rates or corrections)
    "2101": {"label": "Fine Attitude Correction X", "unit": "rad/s", "category": "fine_attitude"},
    "2102": {"label": "Fine Attitude Correction Y", "unit": "rad/s", "category": "fine_attitude"},
    "2103": {"label": "Fine Attitude Correction Z", "unit": "rad/s", "category": "fine_attitude"},
    # 5000-series: Navigation and time
    "5001": {"label": "Mission Elapsed Time (MET)", "unit": "s", "category": "time"},
    "5002": {"label": "Temperature Sensor 1", "unit": "°C", "category": "thermal"},
    "5003": {"label": "Temperature Sensor 2", "unit": "°C", "category": "thermal"},
    "5004": {"label": "Temperature Sensor 3", "unit": "°C", "category": "thermal"},
    "5005": {"label": "Temperature Sensor 4", "unit": "°C", "category": "thermal"},
    "5006": {"label": "Pointing/Sun Angle 1", "unit": "°", "category": "pointing", "note": "Likely antenna or body-to-Sun angle"},
    "5007": {"label": "Pointing/Sun Angle 2", "unit": "°", "category": "pointing", "note": "Likely antenna or body-to-Sun angle"},
    "5008": {"label": "Pointing/Sun Angle 3", "unit": "°", "category": "pointing", "note": "Likely antenna or body-to-Sun angle"},
    "5009": {"label": "Pointing/Sun Angle 4", "unit": "°", "category": "pointing", "note": "Likely antenna or body-to-Sun angle"},
    "5010": {"label": "GPS/Ground Time 1 (Unix epoch)", "unit": "s", "category": "time"},
    "5011": {"label": "GPS/Ground Time 2 (Unix epoch)", "unit": "s", "category": "time"},
    "5012": {"label": "GPS/Ground Time 3 (Unix epoch)", "unit": "s", "category": "time"},
    "5013": {"label": "Onboard Clock Reference", "unit": "s", "category": "time"},
    "5016": {"label": "MET Integer (seconds)", "unit": "s", "category": "time"},
    "5017": {"label": "MET Integer (duplicate)", "unit": "s", "category": "time"},
}

CATEGORY_NAMES = {
    "position": "Position (Earth-centered ICRF)",
    "velocity": "Velocity",
    "attitude": "Attitude (Quaternion)",
    "status": "Status Codes",
    "solar_arrays": "Solar Array & Antenna Angles",
    "orbital": "Orbital Geometry",
    "sun_vector": "Sun Direction Vector (body frame)",
    "moon_vector": "Moon Direction Vector (body frame)",
    "earth_vector": "Earth Direction Vector (body frame)",
    "vectors": "Pointing Vectors",
    "propulsion": "Propulsion / RCS",
    "angular_rates": "Angular Rates (body frame)",
    "sensors": "Star Tracker / Sensor Angles",
    "fine_attitude": "Fine Attitude Control",
    "time": "Time References",
    "thermal": "Thermal Sensors",
    "pointing": "Pointing / Sun Angles",
}


def _get_param(raw: dict, param_id: str) -> float | None:
    key = f"Parameter_{param_id}"
    p = raw.get(key)
    if not p or p.get("Status") != "Good":
        return None
    try:
        return float(p["Value"])
    except (ValueError, KeyError):
        return None


async def _fetch_raw_telemetry() -> dict:
    """Fetch raw telemetry JSON from GCS."""
    obj_encoded = urllib.parse.quote(GCS_OBJECT, safe="")
    meta_url = f"{GCS_BASE}/{GCS_BUCKET}/o/{obj_encoded}"

    async with httpx.AsyncClient(timeout=15) as client:
        meta_resp = await client.get(meta_url)
        meta_resp.raise_for_status()
        meta = meta_resp.json()
        generation = meta["generation"]

        content_url = f"{meta_url}?alt=media&generation={generation}"
        content_resp = await client.get(content_url)
        content_resp.raise_for_status()
        return content_resp.json()


def parse_telemetry(raw: dict) -> dict:
    file_info = raw.get("File", {})

    pos_x = _get_param(raw, "2003")
    pos_y = _get_param(raw, "2004")
    pos_z = _get_param(raw, "2005")
    vel_x = _get_param(raw, "2009")
    vel_y = _get_param(raw, "2010")
    vel_z = _get_param(raw, "2011")
    met = _get_param(raw, "5001")

    has_pos = pos_x is not None and pos_y is not None and pos_z is not None
    has_vel = vel_x is not None and vel_y is not None and vel_z is not None

    good_params = {}
    for key, val in raw.items():
        if key.startswith("Parameter_") and isinstance(val, dict) and val.get("Status") == "Good":
            pid = key.replace("Parameter_", "")
            try:
                good_params[pid] = float(val["Value"])
            except (ValueError, TypeError):
                good_params[pid] = val["Value"]

    # Convert feet to km (0.0003048 km/ft)
    FT_TO_KM = 0.0003048

    return {
        "activity": file_info.get("Activity", "UNK"),
        "date": file_info.get("Date"),
        "type": file_info.get("Type"),
        # Position: raw values are in feet, convert to km
        "position": {
            "x": pos_x * FT_TO_KM, "y": pos_y * FT_TO_KM, "z": pos_z * FT_TO_KM,
        } if has_pos else None,
        # Velocity: raw values are in ft/s, convert to km/s
        "velocity": {
            "x": vel_x * FT_TO_KM, "y": vel_y * FT_TO_KM, "z": vel_z * FT_TO_KM,
        } if has_vel else None,
        "speed_ms": math.sqrt((vel_x*FT_TO_KM)**2 + (vel_y*FT_TO_KM)**2 + (vel_z*FT_TO_KM)**2) if has_vel else None,
        "met": met,
        "good_param_count": len(good_params),
        "good_params": good_params,
    }


def format_telemetry_summary(parsed: dict) -> str:
    lines = [
        f"Telemetry Status: {parsed['activity']}",
        f"Timestamp: {parsed['date']}",
        f"Good parameters: {parsed['good_param_count']}",
    ]

    if parsed["position"]:
        p = parsed["position"]
        dist_km = math.sqrt(p["x"]**2 + p["y"]**2 + p["z"]**2)
        dist_mi = dist_km * 0.621371
        lines.append(f"\nPosition (Earth-centered ICRF, converted from feet):")
        lines.append(f"  X: {p['x']:,.2f} km")
        lines.append(f"  Y: {p['y']:,.2f} km")
        lines.append(f"  Z: {p['z']:,.2f} km")
        lines.append(f"  Distance from Earth center: {dist_km:,.2f} km ({dist_mi:,.2f} mi)")

    if parsed["velocity"]:
        v = parsed["velocity"]
        speed_kms = parsed["speed_ms"]
        speed_mph = speed_kms * 2236.94
        lines.append(f"\nVelocity (converted from ft/s):")
        lines.append(f"  VX: {v['x']:.4f} km/s")
        lines.append(f"  VY: {v['y']:.4f} km/s")
        lines.append(f"  VZ: {v['z']:.4f} km/s")
        lines.append(f"  Speed: {speed_kms:.4f} km/s ({speed_mph:,.2f} mph)")
        lines.append(f"  VZ: {v['z']:.1f} m/s")
        lines.append(f"  Speed: {parsed['speed_ms']:.1f} m/s ({speed_mph:,.1f} mph)")

    if parsed["met"] is not None:
        days = parsed["met"] / 86400
        hours = (parsed["met"] % 86400) / 3600
        lines.append(f"\nMET: {parsed['met']:,.1f} s ({days:.2f} days, {hours:.1f} hours into current day)")

    return "\n".join(lines)


def format_full_telemetry(raw: dict) -> str:
    """Format ALL parameters grouped by category with labels."""
    file_info = raw.get("File", {})
    lines = [
        f"## Full Telemetry Dump",
        f"**Activity:** {file_info.get('Activity', 'UNK')}",
        f"**Timestamp:** {file_info.get('Date', 'N/A')}",
        f"**Type:** {file_info.get('Type', 'N/A')}",
        "",
    ]

    # Collect all parameters
    params_by_category = {}
    unlabeled = []

    for key, val in sorted(raw.items()):
        if not key.startswith("Parameter_") or not isinstance(val, dict):
            continue
        pid = key.replace("Parameter_", "")
        status = val.get("Status", "Unknown")
        value = val.get("Value", "N/A")
        ptype = val.get("Type", "?")
        time = val.get("Time", "")

        info = PARAM_LABELS.get(pid)
        if info:
            cat = info["category"]
            if cat not in params_by_category:
                params_by_category[cat] = []
            params_by_category[cat].append({
                "pid": pid, "label": info["label"], "unit": info["unit"],
                "value": value, "status": status, "type": ptype, "time": time,
                "note": info.get("note", ""),
            })
        else:
            unlabeled.append({"pid": pid, "value": value, "status": status, "type": ptype, "time": time})

    for cat_key, cat_label in CATEGORY_NAMES.items():
        params = params_by_category.get(cat_key, [])
        if not params:
            continue
        lines.append(f"### {cat_label}")
        for p in params:
            status_mark = "✓" if p["status"] == "Good" else "✗"
            unit_str = f" {p['unit']}" if p['unit'] else ""
            note_str = f" ({p['note']})" if p['note'] else ""
            lines.append(f"- [{status_mark}] **{p['pid']}** {p['label']}: `{p['value']}`{unit_str}{note_str}")
        lines.append("")

    if unlabeled:
        lines.append("### Unlabeled Parameters")
        for p in unlabeled:
            status_mark = "✓" if p["status"] == "Good" else "✗"
            lines.append(f"- [{status_mark}] **{p['pid']}**: `{p['value']}` (Type {p['type']})")
        lines.append("")

    lines.append(f"**Total parameters:** {sum(len(v) for v in params_by_category.values()) + len(unlabeled)}")
    return "\n".join(lines)


@tool
async def read_telemetry() -> str:
    """Fetch and interpret the current live telemetry from the Artemis II ground control system.
    Returns a summary with position, velocity, mission elapsed time, and signal status."""
    raw = await _fetch_raw_telemetry()
    parsed = parse_telemetry(raw)
    return format_telemetry_summary(parsed)


@tool
async def inspect_telemetry(category: str = "all") -> str:
    """Fetch the full raw telemetry stream and show ALL parameters with labels, organized by category.
    Use this when the user asks about specific parameters, sensor readings, thermal data,
    angular rates, solar array angles, attitude, propulsion, or any detailed telemetry question.

    Args:
        category: Filter to a specific category. Options: all, position, velocity, attitude,
                  status, solar_arrays, orbital, sun_vector, moon_vector, earth_vector,
                  vectors, propulsion, angular_rates, sensors, fine_attitude, time, thermal.
                  Use 'all' to see everything.
    """
    raw = await _fetch_raw_telemetry()

    if category == "all":
        return format_full_telemetry(raw)

    # Filter to specific category
    file_info = raw.get("File", {})
    lines = [
        f"## Telemetry: {CATEGORY_NAMES.get(category, category)}",
        f"**Timestamp:** {file_info.get('Date', 'N/A')}",
        "",
    ]

    found = False
    for key, val in sorted(raw.items()):
        if not key.startswith("Parameter_") or not isinstance(val, dict):
            continue
        pid = key.replace("Parameter_", "")
        info = PARAM_LABELS.get(pid)
        if info and info["category"] == category:
            found = True
            status = val.get("Status", "Unknown")
            value = val.get("Value", "N/A")
            status_mark = "✓" if status == "Good" else "✗"
            unit_str = f" {info['unit']}" if info['unit'] else ""
            note_str = f" ({info.get('note', '')})" if info.get('note') else ""
            lines.append(f"- [{status_mark}] **{pid}** {info['label']}: `{value}`{unit_str}{note_str}")

    if not found:
        lines.append(f"No parameters found for category '{category}'.")
        lines.append(f"Available categories: {', '.join(CATEGORY_NAMES.keys())}")

    return "\n".join(lines)
