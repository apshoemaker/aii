import pytest
from tests.conftest import TELEMETRY_FIXTURE


def test_parse_telemetry():
    from tools.telemetry import parse_telemetry
    result = parse_telemetry(TELEMETRY_FIXTURE)
    assert result["activity"] == "MIS"
    assert result["date"] == "2026/04/02 07:11:12"


def test_parse_telemetry_position():
    from tools.telemetry import parse_telemetry
    result = parse_telemetry(TELEMETRY_FIXTURE)
    # Positions are in feet, converted to km (1 ft = 0.0003048 km)
    assert result["position"]["x"] == pytest.approx(-44627650.62892 * 0.0003048, rel=1e-3)
    assert result["position"]["y"] == pytest.approx(-216067860.3622 * 0.0003048, rel=1e-3)
    assert result["position"]["z"] == pytest.approx(-116687911.8069 * 0.0003048, rel=1e-3)


def test_parse_telemetry_velocity():
    from tools.telemetry import parse_telemetry
    result = parse_telemetry(TELEMETRY_FIXTURE)
    # Velocities are in ft/s, converted to km/s
    assert result["velocity"]["x"] == pytest.approx(3080.0 * 0.0003048, rel=1e-3)
    assert result["velocity"]["y"] == pytest.approx(167.0 * 0.0003048, rel=1e-3)
    assert result["velocity"]["z"] == pytest.approx(109.3 * 0.0003048, rel=1e-3)


def test_parse_telemetry_met():
    from tools.telemetry import parse_telemetry
    result = parse_telemetry(TELEMETRY_FIXTURE)
    assert result["met"] == pytest.approx(48958.448, rel=1e-3)


def test_parse_telemetry_bad_status_excluded():
    from tools.telemetry import parse_telemetry
    result = parse_telemetry(TELEMETRY_FIXTURE)
    # Parameter 9999 has Status "Bad" — should not appear in known params
    assert "9999" not in str(result.get("raw_params", {}))


def test_parse_telemetry_missing_params():
    """Empty telemetry should not crash."""
    from tools.telemetry import parse_telemetry
    result = parse_telemetry({"File": {"Date": "2026/04/02", "Activity": "SIM", "Type": 253}})
    assert result["position"] is None
    assert result["velocity"] is None
    assert result["met"] is None


def test_format_telemetry_summary():
    from tools.telemetry import parse_telemetry, format_telemetry_summary
    parsed = parse_telemetry(TELEMETRY_FIXTURE)
    summary = format_telemetry_summary(parsed)
    assert isinstance(summary, str)
    assert "MIS" in summary
    assert "km" in summary.lower() or "position" in summary.lower()
