"""Tool 1: JPL Horizons ephemeris query."""
import math
from datetime import datetime, timedelta, timezone

import httpx
from langchain_core.tools import tool

HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api"


def build_horizons_params(
    target: str = "-1024",
    start_time: str | None = None,
    stop_time: str | None = None,
    step_size: str = "10 min",
) -> dict:
    now = datetime.now(timezone.utc)
    if not start_time:
        start_time = (now - timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M")
    if not stop_time:
        stop_time = (now + timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M")

    return {
        "format": "text",
        "COMMAND": f"'{target}'",
        "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "VECTORS",
        "CENTER": "'500@399'",
        "REF_PLANE": "FRAME",
        "REF_SYSTEM": "ICRF",
        "VEC_TABLE": "2",
        "VEC_LABELS": "NO",
        "CSV_FORMAT": "YES",
        "START_TIME": f"'{start_time}'",
        "STOP_TIME": f"'{stop_time}'",
        "STEP_SIZE": f"'{step_size}'",
    }


def parse_horizons_csv(text: str) -> list[dict]:
    lines = text.split("\n")
    try:
        soe_idx = next(i for i, l in enumerate(lines) if l.strip() == "$$SOE")
        eoe_idx = next(i for i, l in enumerate(lines) if l.strip() == "$$EOE")
    except StopIteration:
        return []

    data = []
    for i in range(soe_idx + 1, eoe_idx):
        parts = [s.strip() for s in lines[i].split(",")]
        if len(parts) < 8:
            continue
        try:
            jd = float(parts[0])
        except ValueError:
            continue
        data.append({
            "jd": jd,
            "x": float(parts[2]),
            "y": float(parts[3]),
            "z": float(parts[4]),
            "vx": float(parts[5]),
            "vy": float(parts[6]),
            "vz": float(parts[7]),
        })
    return data


def compute_distance(x: float, y: float, z: float) -> float:
    return math.sqrt(x**2 + y**2 + z**2)


def compute_speed(vx: float, vy: float, vz: float) -> float:
    return math.sqrt(vx**2 + vy**2 + vz**2)


def format_state_vector(sv: dict) -> str:
    dist_km = compute_distance(sv["x"], sv["y"], sv["z"])
    dist_mi = dist_km * 0.621371
    speed_kms = compute_speed(sv["vx"], sv["vy"], sv["vz"])
    speed_mph = speed_kms * 2236.94

    return (
        f"Position (ICRF, Earth-centered):\n"
        f"  X: {sv['x']:,.2f} km\n"
        f"  Y: {sv['y']:,.2f} km\n"
        f"  Z: {sv['z']:,.2f} km\n"
        f"  Distance from Earth: {dist_km:,.2f} km ({dist_mi:,.2f} mi)\n"
        f"Velocity:\n"
        f"  VX: {sv['vx']:.6f} km/s\n"
        f"  VY: {sv['vy']:.6f} km/s\n"
        f"  VZ: {sv['vz']:.6f} km/s\n"
        f"  Speed: {speed_kms:.4f} km/s ({speed_mph:,.2f} mph)"
    )


@tool
async def horizons_query(
    target: str = "-1024",
    start_time: str | None = None,
    stop_time: str | None = None,
    step_size: str = "5 min",
) -> str:
    """Query JPL Horizons for the position and velocity of a solar system body.

    Args:
        target: NAIF ID. Use -1024 for Artemis II (Orion), 301 for Moon, 399 for Earth.
        start_time: UTC datetime string like '2026-04-02 13:00'. Defaults to now minus 5 min.
        stop_time: UTC datetime string like '2026-04-02 14:00'. Defaults to now plus 5 min.
        step_size: Time step like '5 min', '1 h', '1 d'.
    """
    params = build_horizons_params(target, start_time, stop_time, step_size)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(HORIZONS_API, params=params)
        resp.raise_for_status()

    data = parse_horizons_csv(resp.text)
    if not data:
        return f"No ephemeris data returned for target {target}. The Horizons response may not contain vector data for this time range."

    result_lines = [f"Ephemeris for target {target} ({len(data)} data points):"]
    # Show first and last points, plus current (middle) if multiple
    points_to_show = [data[0]]
    if len(data) > 2:
        points_to_show.append(data[len(data) // 2])
    if len(data) > 1:
        points_to_show.append(data[-1])

    for sv in points_to_show:
        result_lines.append(f"\n--- JD {sv['jd']:.6f} ---")
        result_lines.append(format_state_vector(sv))

    return "\n".join(result_lines)
