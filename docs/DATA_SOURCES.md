# Data Sources

## JPL Horizons

**API**: `https://ssd.jpl.nasa.gov/api/horizons.api`  
**Type**: REST (GET with query params)  
**CORS**: No (proxied via Vite in frontend, called directly from backend)

**Query parameters used**:
- `COMMAND`: Target body (`-1024` Artemis II, `301` Moon, `10` Sun)
- `EPHEM_TYPE`: `VECTORS` (cartesian state vectors)
- `CENTER`: `500@399` (Earth center)
- `REF_PLANE`: `FRAME` (ICRF, not ecliptic)
- `CSV_FORMAT`: `YES`
- `STEP_SIZE`: `10 min` (1,285 points over 9 days)

**Response format**: Text with `$$SOE` / `$$EOE` markers containing CSV rows:
```
JD, Calendar Date, X, Y, Z, VX, VY, VZ,
```
Positions in km, velocities in km/s, Earth-centered ICRF.

## NASA GCS Telemetry

**Bucket**: `p-2-cen1`  
**Object**: `October/1/October_105_1.txt`  
**Base URL**: `https://storage.googleapis.com/storage/v1/b/p-2-cen1/o/`  
**Auth**: Public (no authentication required)  
**Update frequency**: ~1 second  
**CORS**: Enabled

**Fetch pattern** (two-step for cache-busting):
1. GET metadata → extract `generation` field
2. GET content with `?alt=media&generation={gen}`

**Data format**: JSON with `File` header and `Parameter_NNNN` entries:
```json
{
  "File": {"Date": "2026/04/02 07:11:12", "Activity": "MIS", "Type": 4},
  "Parameter_2003": {"Number": "2003", "Status": "Good", "Value": "-44627650.62892", "Type": "2"}
}
```

**Units**: Position in feet, velocity in ft/s. Convert with `× 0.0003048` for km.

## NASA Textures

| Asset | Source | Resolution |
|-------|--------|-----------|
| Earth | NASA Blue Marble (visibleearth.nasa.gov) | 5400×2700 |
| Moon | NASA LROC CGI Moon Kit (svs.gsfc.nasa.gov/4720) | 2048×1024 |
| Orion | NASA 3D Resources GitHub (capsule STL) | 51,736 triangles |

All NASA assets are public domain per NASA Media Usage Guidelines.

## NASA Deep Space Network

**XML Feed**: `https://eyes.nasa.gov/dsn/data/dsn.xml`
**Visual**: `https://eyes.nasa.gov/dsn/dsn.html` (embedded as iframe)
**CORS**: No (proxied via Vite at `/api/dsn`)
**Update frequency**: ~5 seconds
**Auth**: Public

**XML structure**: `<station>` and `<dish>` are siblings under `<dsn>` (not nested).
Artemis II appears as spacecraft name **"EM2"** with ID -24.

**Data provided**: Active antennas, target spacecraft, azimuth/elevation, signal bands, data rates, range, round-trip light time.

## TDRS Constellation

**Source**: CelesTrak NORAD TLE data
**URL**: `https://celestrak.org/NORAD/elements/gp.php?GROUP=tdrss&FORMAT=json`
**CORS**: No (proxied via Vite at `/api/tdrs`)
**Auth**: Public
**Update frequency**: TLEs update every few hours

**Note**: No public real-time link status is available for TDRS. Only orbital positions can be determined from TLE data. Active TDRS fleet: TDRS-3, 5, 6, 7, 8, 11, 12, 13.
