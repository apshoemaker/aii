# JPL Horizons API Reference

**Base URL**: `https://ssd.jpl.nasa.gov/api/horizons.api`  
**Documentation**: https://ssd-api.jpl.nasa.gov/doc/horizons.html

## Query Parameters Used

```
format=text
COMMAND='-1024'          # NAIF ID (-1024=Artemis II, 301=Moon, 10=Sun)
OBJ_DATA=NO
MAKE_EPHEM=YES
EPHEM_TYPE=VECTORS       # Cartesian state vectors
CENTER='500@399'         # Earth center (geocentric)
REF_PLANE=FRAME          # ICRF (not ecliptic!)
REF_SYSTEM=ICRF
VEC_TABLE=2              # Position + velocity
VEC_LABELS=NO
CSV_FORMAT=YES
START_TIME='2026-04-02 02:00'
STOP_TIME='2026-04-11 00:00'
STEP_SIZE='10 min'
```

**Critical**: `REF_PLANE=FRAME` produces ICRF coordinates. Without it, you get ecliptic coordinates which differ by tens of thousands of km due to the 23.4° tilt.

## Response Parsing

Data is between `$$SOE` and `$$EOE` markers:
```
$$SOE
2461133.052083333, A.D. 2026-Apr-02 13:15:00.0000, -1.35E+04, -6.58E+04, -3.55E+04, 9.39E-01, 5.24E-02, 3.42E-02,
$$EOE
```

CSV columns: `JD, Calendar Date, X(km), Y(km), Z(km), VX(km/s), VY(km/s), VZ(km/s)`

## Key Target IDs

| NAIF ID | Body |
|---------|------|
| -1024 | Artemis II (Orion) |
| 301 | Moon |
| 10 | Sun |
| 399 | Earth |
