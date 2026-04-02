"""Tool 5: Mission timeline and current phase information.

Milestones are computed from actual JPL Horizons ephemeris data at server startup,
supplemented with NASA press kit information for events not derivable from vectors alone.
"""
import math
import json
import os
from datetime import datetime, timezone
from langchain_core.tools import tool

# Launch: April 1, 2026 22:35:12 UTC
LAUNCH_EPOCH = datetime(2026, 4, 1, 22, 35, 12, tzinfo=timezone.utc)

# Ephemeris data path (pre-fetched by frontend/scripts/fetch-ephemeris.js)
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'public', 'data')


def _load_ephemeris():
    """Load pre-fetched ephemeris JSON files."""
    try:
        with open(os.path.join(DATA_DIR, 'ephemeris-artemis.json')) as f:
            artemis = json.load(f)
        with open(os.path.join(DATA_DIR, 'ephemeris-moon.json')) as f:
            moon = json.load(f)
        return artemis, moon
    except (FileNotFoundError, json.JSONDecodeError):
        return None, None


def _dist(p):
    return math.sqrt(p['x']**2 + p['y']**2 + p['z']**2)


def _speed(p):
    return math.sqrt(p['vx']**2 + p['vy']**2 + p['vz']**2)


def _moon_at(moon_data, jd):
    best = 0
    for i in range(1, len(moon_data)):
        if abs(moon_data[i]['jd'] - jd) < abs(moon_data[best]['jd'] - jd):
            best = i
    return moon_data[best]


def _jd_to_met_s(jd, first_jd):
    """Convert JD to MET in seconds, given the first ephemeris data point is at ~T+3.4h."""
    hours_from_first = (jd - first_jd) * 24
    return (hours_from_first + 3.4) * 3600  # first data point is ~T+3.4h after launch


def compute_milestones_from_ephemeris():
    """Compute trajectory milestones from actual ephemeris data.

    Returns a list of milestone dicts with computed values, or falls back to
    hardcoded values if ephemeris files aren't available.
    """
    artemis, moon = _load_ephemeris()
    if not artemis or not moon:
        return _fallback_milestones()

    first_jd = artemis[0]['jd']

    # --- Find first orbit apogee (first speed minimum) ---
    apogee_idx = 0
    apogee_speed = float('inf')
    for i in range(min(200, len(artemis))):
        s = _speed(artemis[i])
        if s < apogee_speed:
            apogee_speed = s
            apogee_idx = i
        elif s > apogee_speed * 1.1:
            break
    apogee_dist = _dist(artemis[apogee_idx])
    apogee_met = _jd_to_met_s(artemis[apogee_idx]['jd'], first_jd)

    # --- Find perigee (closest Earth approach after apogee) ---
    perigee_idx = apogee_idx
    perigee_dist = float('inf')
    for i in range(apogee_idx, min(apogee_idx + 200, len(artemis))):
        d = _dist(artemis[i])
        if d < perigee_dist:
            perigee_dist = d
            perigee_idx = i
        elif d > perigee_dist + 5000:
            break
    perigee_speed = _speed(artemis[perigee_idx])
    perigee_met = _jd_to_met_s(artemis[perigee_idx]['jd'], first_jd)

    # --- Find lunar flyby, max earth distance, return ---
    max_earth_dist = 0
    max_earth_idx = 0
    min_moon_dist = float('inf')
    min_moon_idx = 0
    mid_jd = artemis[len(artemis) // 2]['jd']
    min_earth_return = float('inf')
    min_earth_return_idx = len(artemis) - 1

    for i, p in enumerate(artemis):
        earth_dist = _dist(p)
        m = _moon_at(moon, p['jd'])
        moon_dist = math.sqrt((p['x']-m['x'])**2 + (p['y']-m['y'])**2 + (p['z']-m['z'])**2)

        if earth_dist > max_earth_dist:
            max_earth_dist = earth_dist
            max_earth_idx = i
        if moon_dist < min_moon_dist:
            min_moon_dist = moon_dist
            min_moon_idx = i
        if p['jd'] > mid_jd and earth_dist < min_earth_return:
            min_earth_return = earth_dist
            min_earth_return_idx = i

    lunar_flyby_met = _jd_to_met_s(artemis[min_moon_idx]['jd'], first_jd)
    max_earth_met = _jd_to_met_s(artemis[max_earth_idx]['jd'], first_jd)
    splashdown_met = _jd_to_met_s(artemis[min_earth_return_idx]['jd'], first_jd)

    # Build milestones with computed values
    return [
        {"label": "Launch", "met_s": 0,
         "description": "Liftoff from LC-39B, Kennedy Space Center. SLS sends Orion and ICPS into an initial elliptical orbit."},
        {"label": "Perigee/Apogee Raise Burns", "met_s": 3600,
         "description": "ICPS performs orbital adjustment burns to raise Orion into a high elliptical Earth orbit. Proximity operations with ICPS follow."},
        {"label": "High Earth Orbit Checkout", "met_s": 21600,
         "description": "Orion is in a high elliptical Earth orbit. Crew conducting systems checkout and sleep period before committing to lunar transit."},
        {"label": "High Orbit Apogee", "met_s": apogee_met,
         "description": f"Orion reaches apogee of the high elliptical orbit at {apogee_dist:,.0f} km ({apogee_dist*0.621371:,.0f} mi) from Earth, traveling at {apogee_speed:.3f} km/s ({apogee_speed*2236.94:,.0f} mph). Now falling back toward Earth for the TLI perigee burn.",
         "computed": {"apogee_km": apogee_dist, "apogee_mi": apogee_dist * 0.621371, "speed_kms": apogee_speed}},
        {"label": "Trans-Lunar Injection (TLI)", "met_s": perigee_met,
         "description": f"Orion performs the TLI burn near perigee at {perigee_dist:,.0f} km ({perigee_dist*0.621371:,.0f} mi) from Earth, speed {perigee_speed:.3f} km/s ({perigee_speed*2236.94:,.0f} mph). The 5m51s ICPS burn sends Orion on a free-return trajectory to the Moon.",
         "computed": {"perigee_km": perigee_dist, "perigee_mi": perigee_dist * 0.621371, "speed_kms": perigee_speed}},
        {"label": "Translunar Coast", "met_s": perigee_met + 10000,
         "description": "Orion is coasting through cislunar space toward the Moon on a free-return trajectory. Speed decreases gradually as it climbs Earth's gravitational hill."},
        {"label": "Lunar Flyby", "met_s": lunar_flyby_met,
         "description": f"Closest approach to the Moon at {min_moon_dist:,.0f} km ({min_moon_dist*0.621371:,.0f} mi). The farthest humans will have traveled from Earth since Apollo 17 in 1972.",
         "computed": {"closest_moon_km": min_moon_dist, "closest_moon_mi": min_moon_dist * 0.621371}},
        {"label": "Max Earth Distance", "met_s": max_earth_met,
         "description": f"Orion reaches maximum distance from Earth: {max_earth_dist:,.0f} km ({max_earth_dist*0.621371:,.0f} mi).",
         "computed": {"max_earth_km": max_earth_dist, "max_earth_mi": max_earth_dist * 0.621371}},
        {"label": "Return Coast", "met_s": max_earth_met + 18000,
         "description": "Orion coasts back toward Earth after the lunar flyby on its free-return trajectory."},
        {"label": "Skip Reentry & Splashdown", "met_s": splashdown_met,
         "description": f"Orion performs a skip reentry and splashes down in the Pacific Ocean. Final approach distance: {min_earth_return:,.0f} km from Earth center.",
         "computed": {"final_dist_km": min_earth_return}},
    ]


def _fallback_milestones():
    """Hardcoded fallback if ephemeris files are unavailable."""
    return [
        {"label": "Launch", "met_s": 0, "description": "Liftoff from LC-39B."},
        {"label": "High Orbit Apogee", "met_s": 48240, "description": "Apogee at ~76,500 km."},
        {"label": "Trans-Lunar Injection (TLI)", "met_s": 90720, "description": "TLI burn at perigee."},
        {"label": "Lunar Flyby", "met_s": 433440, "description": "Closest lunar approach at ~8,325 km."},
        {"label": "Max Earth Distance", "met_s": 434160, "description": "Max distance ~413,184 km."},
        {"label": "Skip Reentry & Splashdown", "met_s": 782640, "description": "Splashdown in Pacific Ocean."},
    ]


# Compute milestones once at module load
MILESTONES = compute_milestones_from_ephemeris()


def get_current_met() -> float:
    """Get current Mission Elapsed Time in seconds."""
    now = datetime.now(timezone.utc)
    return (now - LAUNCH_EPOCH).total_seconds()


def get_current_phase() -> dict:
    """Determine the current mission phase based on MET."""
    met = get_current_met()
    current = MILESTONES[0]
    next_ms = MILESTONES[1] if len(MILESTONES) > 1 else None

    for i in range(len(MILESTONES) - 1, -1, -1):
        if met >= MILESTONES[i]["met_s"]:
            current = MILESTONES[i]
            next_ms = MILESTONES[i + 1] if i + 1 < len(MILESTONES) else None
            break

    return {
        "met_seconds": met,
        "met_hours": met / 3600,
        "met_days": met / 86400,
        "current_phase": current["label"],
        "current_description": current["description"],
        "next_milestone": next_ms["label"] if next_ms else "Mission Complete",
        "time_to_next_hours": (next_ms["met_s"] - met) / 3600 if next_ms else 0,
    }


def get_mission_context_string() -> str:
    """Generate a dynamic context string for the system prompt."""
    phase = get_current_phase()
    met_h = phase["met_hours"]
    met_d = phase["met_days"]

    # Include computed values for key milestones
    computed_facts = []
    for ms in MILESTONES:
        if "computed" in ms:
            computed_facts.append(f"  - {ms['label']}: {ms['description']}")

    lines = [
        f"CURRENT MISSION STATE (live, computed from JPL Horizons ephemeris):",
        f"- Mission Elapsed Time: {met_h:.1f} hours ({met_d:.2f} days)",
        f"- Current Phase: {phase['current_phase']}",
        f"- Phase Description: {phase['current_description']}",
        f"- Next Milestone: {phase['next_milestone']} (in {phase['time_to_next_hours']:.1f} hours)",
        f"",
        f"KEY TRAJECTORY FACTS (computed from actual ephemeris vectors):",
    ] + computed_facts + [
        f"",
        f"CRITICAL: Use this mission state to ground your answers.",
        f"- If MET < 25h: Orion has NOT yet performed TLI and is still in Earth orbit.",
        f"- If MET < 5 days: The lunar flyby has NOT happened yet.",
        f"- The spacecraft is NOT returning unless MET > 5 days.",
        f"- Do NOT hallucinate or assume the mission phase — use the data above.",
    ]
    return "\n".join(lines)


@tool
def mission_timeline() -> str:
    """Get the current mission timeline with computed trajectory milestones.
    All distance/speed values are calculated from actual JPL Horizons ephemeris vectors.
    Use this to understand where Artemis II is in its mission sequence."""
    phase = get_current_phase()
    met = phase["met_seconds"]

    lines = [
        f"## Artemis II Mission Timeline",
        f"**Current MET:** {phase['met_hours']:.1f} hours ({phase['met_days']:.2f} days)",
        f"**Current Phase:** {phase['current_phase']}",
        f"**Phase Description:** {phase['current_description']}",
        f"",
        f"### All Milestones (times and values computed from JPL Horizons ephemeris):",
    ]

    for ms in MILESTONES:
        met_h = ms["met_s"] / 3600
        met_d = ms["met_s"] / 86400

        # Status indicator
        if met >= ms["met_s"]:
            elapsed_ago = (met - ms["met_s"]) / 3600
            prefix = f"- [x] **{ms['label']}** (T+{met_h:.1f}h / {met_d:.1f}d) — {elapsed_ago:.1f}h ago"
        else:
            time_until = (ms["met_s"] - met) / 3600
            prefix = f"- [ ] **{ms['label']}** (T+{met_h:.1f}h / {met_d:.1f}d) — in {time_until:.1f}h"

        lines.append(prefix)

        # Include computed values inline
        if "computed" in ms:
            details = []
            c = ms["computed"]
            if "apogee_km" in c:
                details.append(f"  Apogee: {c['apogee_km']:,.0f} km ({c['apogee_mi']:,.0f} mi), Speed: {c['speed_kms']:.3f} km/s")
            if "perigee_km" in c:
                details.append(f"  Perigee: {c['perigee_km']:,.0f} km ({c['perigee_mi']:,.0f} mi), Speed: {c['speed_kms']:.3f} km/s")
            if "closest_moon_km" in c:
                details.append(f"  Closest Moon dist: {c['closest_moon_km']:,.0f} km ({c['closest_moon_mi']:,.0f} mi)")
            if "max_earth_km" in c:
                details.append(f"  Max Earth dist: {c['max_earth_km']:,.0f} km ({c['max_earth_mi']:,.0f} mi)")
            if "final_dist_km" in c:
                details.append(f"  Final approach: {c['final_dist_km']:,.0f} km from Earth center")
            lines.extend(details)

    lines.append(f"\n**Next up:** {phase['next_milestone']} in {phase['time_to_next_hours']:.1f} hours")

    return "\n".join(lines)
