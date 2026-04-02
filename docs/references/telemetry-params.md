# Telemetry Parameter Reference

Parameters from GCS bucket `p-2-cen1`, file `October_105_1.txt`.

**Note**: These labels are reverse-engineered from value analysis, not official documentation. The unit discovery (feet, not meters) was confirmed by cross-referencing with JPL Horizons at matching timestamps.

## Position & Velocity

| ID | Label | Unit | Notes |
|----|-------|------|-------|
| 2003 | Position X | ft | Earth-centered ICRF. `× 0.0003048` for km |
| 2004 | Position Y | ft | |
| 2005 | Position Z | ft | |
| 2009 | Velocity X | ft/s | `× 0.0003048` for km/s |
| 2010 | Velocity Y | ft/s | |
| 2011 | Velocity Z | ft/s | |

## Attitude

| ID | Label | Unit |
|----|-------|------|
| 2012 | Quaternion X | — |
| 2013 | Quaternion Y | — |
| 2014 | Quaternion Z | — |
| 2015 | Quaternion W | — |

Magnitude is exactly 1.0 (valid unit quaternion).

## Thermal

| ID | Label | Unit |
|----|-------|------|
| 5002 | Temperature Sensor 1 | °C |
| 5003 | Temperature Sensor 2 | °C |
| 5004 | Temperature Sensor 3 | °C |
| 5005 | Temperature Sensor 4 | °C |

## Time

| ID | Label | Unit |
|----|-------|------|
| 5001 | Mission Elapsed Time | seconds |
| 5010-5012 | GPS/Ground Time | Unix epoch (s) |
| 5013 | Onboard Clock Reference | seconds |
| 5016-5017 | MET (integer) | seconds |

## Status Codes (Type 3 — hex)

| ID | Label |
|----|-------|
| 2016 | Spacecraft Mode/Submode |
| 2090 | GNC Mode Status |
| 2099 | Sensor Status Code |

See `backend/tools/telemetry.py` PARAM_LABELS for the complete mapping of all ~78 parameters.
