"""Tool 9: Deep Space Network status reader."""
import xml.etree.ElementTree as ET

import httpx
from langchain_core.tools import tool

DSN_XML_URL = "https://eyes.nasa.gov/dsn/data/dsn.xml"

STATION_NAMES = {
    "gdscc": "Goldstone (California)",
    "mdscc": "Madrid (Spain)",
    "cdscc": "Canberra (Australia)",
}

# Spacecraft names that refer to Artemis II
ARTEMIS_NAMES = {"orion", "artemis", "a2", "artemis ii", "artemis 2", "em2", "em-2"}


def parse_dsn_xml(xml_text: str) -> list[dict]:
    """Parse DSN XML into structured station/dish data.

    The XML structure has <station> and <dish> as siblings under <dsn>,
    NOT dishes nested inside stations. Dishes belong to the station
    that precedes them.
    """
    root = ET.fromstring(xml_text)
    stations = []
    current_station = None

    for child in root:
        if child.tag == "station":
            station_id = child.get("name", "")
            current_station = {
                "id": station_id,
                "name": child.get("friendlyName", STATION_NAMES.get(station_id, station_id)),
                "time_utc": child.get("timeUTC", ""),
                "dishes": [],
            }
            stations.append(current_station)

        elif child.tag == "dish" and current_station is not None:
            dish_name = child.get("name", "")
            azimuth = child.get("azimuthAngle", "0")
            elevation = child.get("elevationAngle", "0")
            activity = child.get("activity", "")

            targets = []
            for target in child.findall("target"):
                t_name = target.get("name", "")
                if t_name:
                    targets.append({
                        "name": t_name,
                        "id": target.get("id", ""),
                        "upleg_km": target.get("uplegRange", ""),
                        "downleg_km": target.get("downlegRange", ""),
                        "rtlt_s": target.get("rtlt", ""),
                    })

            signals = []
            for sig in child.findall("downSignal"):
                if sig.get("active") == "true":
                    signals.append({
                        "type": "downlink",
                        "data_rate": sig.get("dataRate", "0"),
                        "frequency": sig.get("frequency", ""),
                        "band": sig.get("band", ""),
                        "power": sig.get("power", ""),
                        "spacecraft": sig.get("spacecraft", ""),
                    })

            for sig in child.findall("upSignal"):
                if sig.get("active") == "true":
                    signals.append({
                        "type": "uplink",
                        "data_rate": sig.get("dataRate", "0"),
                        "frequency": sig.get("frequency", ""),
                        "band": sig.get("band", ""),
                        "power": sig.get("power", ""),
                        "spacecraft": sig.get("spacecraft", ""),
                    })

            current_station["dishes"].append({
                "name": dish_name,
                "azimuth": azimuth,
                "elevation": elevation,
                "activity": activity,
                "targets": targets,
                "signals": signals,
            })

    return stations


def _is_artemis(name: str) -> bool:
    return name.lower() in ARTEMIS_NAMES


def format_dsn_status(stations: list[dict]) -> str:
    """Format DSN status for human readability."""
    lines = ["## Deep Space Network — Real-Time Status\n"]

    artemis_contacts = []

    for station in stations:
        lines.append(f"### {station['name']}")

        for dish in station["dishes"]:
            target_names = [t["name"] for t in dish["targets"]]
            is_active = len(target_names) > 0 and not all(n in ("DSN", "DSS") for n in target_names)
            is_artemis = any(_is_artemis(n) for n in target_names)

            status = "ACTIVE" if is_active else "idle"
            marker = " **[ARTEMIS II]**" if is_artemis else ""

            lines.append(f"- **{dish['name']}** — {status}{marker}")

            if is_active:
                lines.append(f"  - Targets: {', '.join(target_names)}")
                lines.append(f"  - Az: {float(dish['azimuth']):.1f}°  El: {float(dish['elevation']):.1f}°")

                for t in dish["targets"]:
                    if t["downleg_km"]:
                        try:
                            dist_km = float(t["downleg_km"])
                            if dist_km > 0:
                                dist_mi = dist_km * 0.621371
                                lines.append(f"  - Range to {t['name']}: {dist_km:,.0f} km ({dist_mi:,.0f} mi)")
                        except ValueError:
                            pass
                    if t["rtlt_s"]:
                        try:
                            rtlt = float(t["rtlt_s"])
                            if rtlt > 0:
                                lines.append(f"  - Round-trip light time: {rtlt:.2f} s")
                        except ValueError:
                            pass

                for sig in dish["signals"]:
                    rate = float(sig["data_rate"]) if sig["data_rate"] else 0
                    if rate > 0:
                        if rate > 1e6:
                            rate_str = f"{rate/1e6:.1f} Mb/s"
                        elif rate > 1e3:
                            rate_str = f"{rate/1e3:.1f} kb/s"
                        else:
                            rate_str = f"{rate:.0f} b/s"
                        band = sig.get("band", "")
                        sc = sig.get("spacecraft", "")
                        sig_type = "↑ uplink" if sig["type"] == "uplink" else "↓ downlink"
                        lines.append(f"  - {sig_type}: {rate_str} ({band}-band) — {sc}")

                if is_artemis:
                    artemis_contacts.append(f"{dish['name']} at {station['name']}")

        lines.append("")

    if artemis_contacts:
        lines.insert(1, f"**Artemis II (EM2) is currently being tracked by: {', '.join(artemis_contacts)}**\n")
    else:
        lines.insert(1, "**Artemis II is not currently being tracked by any DSN antenna.**\n")

    return "\n".join(lines)


@tool
async def dsn_status() -> str:
    """Get the current real-time status of NASA's Deep Space Network.
    Shows which antennas at Goldstone, Madrid, and Canberra are tracking which spacecraft,
    signal strength, data rates, and whether any are communicating with Artemis II (EM2/Orion)."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(DSN_XML_URL)
        resp.raise_for_status()

    stations = parse_dsn_xml(resp.text)
    return format_dsn_status(stations)
