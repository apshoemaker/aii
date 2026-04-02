"""Tool 6: Math calculator for orbital mechanics computations."""
import math
from langchain_core.tools import tool


SAFE_NAMES = {
    "math": math,
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "asin": math.asin,
    "acos": math.acos,
    "atan": math.atan,
    "atan2": math.atan2,
    "pi": math.pi,
    "e": math.e,
    "log": math.log,
    "log10": math.log10,
    "exp": math.exp,
    "pow": pow,
    "abs": abs,
    "round": round,
    "min": min,
    "max": max,
    "degrees": math.degrees,
    "radians": math.radians,
    # Useful constants for orbital mechanics
    "G": 6.67430e-11,          # gravitational constant (m^3 kg^-1 s^-2)
    "M_earth": 5.972e24,       # Earth mass (kg)
    "M_moon": 7.342e22,        # Moon mass (kg)
    "M_sun": 1.989e30,         # Sun mass (kg)
    "R_earth": 6371.0,         # Earth radius (km)
    "R_moon": 1737.4,          # Moon radius (km)
    "AU": 149597870.7,         # astronomical unit (km)
    "c": 299792.458,           # speed of light (km/s)
    "km_to_mi": 0.621371,
    "mi_to_km": 1.60934,
    "ms_to_mph": 2.23694,
    "kms_to_mph": 2236.94,
}


@tool
def calculate(expression: str) -> str:
    """Evaluate a math expression. Has access to math functions and orbital mechanics constants.

    Available functions: sqrt, sin, cos, tan, asin, acos, atan, atan2, log, log10, exp, pow,
    abs, round, min, max, degrees, radians, pi, e

    Available constants:
    - G (gravitational constant), M_earth, M_moon, M_sun (masses in kg)
    - R_earth (6371 km), R_moon (1737.4 km), AU (149597870.7 km), c (speed of light km/s)
    - km_to_mi, mi_to_km, ms_to_mph, kms_to_mph (unit conversions)

    Args:
        expression: A Python math expression, e.g. 'sqrt(3**2 + 4**2)' or '76528 * km_to_mi'
    """
    try:
        result = eval(expression, {"__builtins__": {}}, SAFE_NAMES)
        return f"{expression} = {result}"
    except Exception as ex:
        return f"Error evaluating '{expression}': {ex}"
