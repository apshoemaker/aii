"""Tool 10: TDRS (Tracking and Data Relay Satellite) constellation status."""
import math
from datetime import datetime, timezone

import httpx
from langchain_core.tools import tool

CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=tdrss&FORMAT=json"


def compute_geo_longitude(sat: dict) -> float | None:
    """Approximate sub-satellite longitude from TLE orbital elements."""
    try:
        mean_motion = float(sat.get("MEAN_MOTION", 0))
        if mean_motion < 0.9 or mean_motion > 1.1:
            return None  # not geostationary

        raan = float(sat.get("RA_OF_ASC_NODE", 0))
        argp = float(sat.get("ARG_OF_PERICENTER", 0))
        ma = float(sat.get("MEAN_ANOMALY", 0))
        epoch = datetime.fromisoformat(sat["EPOCH"])

        # GMST at epoch
        jd = epoch.timestamp() / 86400 + 2440587.5
        gmst_deg = (280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360

        lon = ((raan + argp + ma - gmst_deg) % 360 + 360) % 360
        if lon > 180:
            lon -= 360
        return lon
    except (ValueError, KeyError, TypeError):
        return None


def format_tdrs_status(sats: list[dict]) -> str:
    """Format TDRS constellation data."""
    tdrs = [s for s in sats if s.get("OBJECT_NAME", "").startswith("TDRS")]

    lines = [
        "## TDRS Space Network — Constellation Status",
        "",
        "The Tracking and Data Relay Satellite System provides relay communications",
        "for spacecraft in low/medium Earth orbit, including Artemis II during Earth orbit phases.",
        "",
        "**Note:** No public real-time link status is available for TDRS.",
        "Positions are derived from NORAD TLE data via CelesTrak.",
        "",
    ]

    geo_sats = []
    for sat in tdrs:
        name = sat.get("OBJECT_NAME", "?")
        norad = sat.get("NORAD_CAT_ID", "?")
        inc = float(sat.get("INCLINATION", 0))
        mean_motion = float(sat.get("MEAN_MOTION", 0))
        epoch = sat.get("EPOCH", "?")[:10]
        is_geo = 0.9 < mean_motion < 1.1

        lon = compute_geo_longitude(sat)
        lon_str = f"{lon:.1f}°" if lon is not None else "—"

        status = "GEO (active)" if is_geo else "non-GEO"

        lines.append(f"- **{name}** (NORAD {norad})")
        lines.append(f"  - Status: {status}")
        lines.append(f"  - Inclination: {inc:.1f}°")
        if lon is not None:
            lines.append(f"  - Approx longitude: {lon_str}")

            # Describe coverage zone
            if -100 < lon < -30:
                zone = "Atlantic/Americas"
            elif -30 < lon < 60:
                zone = "Europe/Africa"
            elif 60 < lon < 150:
                zone = "Indian Ocean/Asia"
            else:
                zone = "Pacific"
            lines.append(f"  - Coverage zone: {zone}")
            geo_sats.append(name)

        lines.append(f"  - Epoch: {epoch}")
        lines.append("")

    lines.insert(2, f"**{len(geo_sats)} TDRS satellites in geostationary orbit:** {', '.join(geo_sats)}\n")

    return "\n".join(lines)


@tool
async def tdrs_status() -> str:
    """Get the current status of NASA's TDRS (Tracking and Data Relay Satellite) constellation.
    Shows all TDRS satellites, their geostationary positions, and coverage zones.
    TDRS provides relay communications for Artemis II during Earth orbit phases."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(CELESTRAK_URL)
        resp.raise_for_status()

    sats = resp.json()
    return format_tdrs_status(sats)
