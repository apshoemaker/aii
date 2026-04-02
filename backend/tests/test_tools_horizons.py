import math
import pytest
from tests.conftest import HORIZONS_CSV_FIXTURE


def test_parse_horizons_csv():
    from tools.horizons import parse_horizons_csv
    data = parse_horizons_csv(HORIZONS_CSV_FIXTURE)
    assert len(data) == 2
    assert data[0]["jd"] == pytest.approx(2461133.052083333)
    assert data[0]["x"] == pytest.approx(-1.359633287842628e4)
    assert data[0]["y"] == pytest.approx(-6.586347358689297e4)
    assert data[0]["z"] == pytest.approx(-3.557374039864614e4)
    assert data[0]["vx"] == pytest.approx(9.392825709819910e-1)
    assert data[0]["vy"] == pytest.approx(5.248620935585149e-2)
    assert data[0]["vz"] == pytest.approx(3.428539963806906e-2)


def test_parse_horizons_csv_empty():
    from tools.horizons import parse_horizons_csv
    data = parse_horizons_csv("no SOE markers here")
    assert data == []


def test_compute_distance():
    from tools.horizons import compute_distance
    # Known: (3, 4, 0) -> distance = 5
    assert compute_distance(3.0, 4.0, 0.0) == pytest.approx(5.0)


def test_compute_speed():
    from tools.horizons import compute_speed
    assert compute_speed(3.0, 4.0, 0.0) == pytest.approx(5.0)


def test_build_horizons_params():
    from tools.horizons import build_horizons_params
    params = build_horizons_params(
        target="-1024",
        start_time="2026-04-02 13:00",
        stop_time="2026-04-02 14:00",
        step_size="10 min"
    )
    assert params["COMMAND"] == "'-1024'"
    assert params["EPHEM_TYPE"] == "VECTORS"
    assert params["CENTER"] == "'500@399'"
    assert params["REF_PLANE"] == "FRAME"
    assert params["CSV_FORMAT"] == "YES"


def test_format_state_vector():
    from tools.horizons import format_state_vector
    result = format_state_vector({
        "jd": 2461133.052083333,
        "x": -13596.33,
        "y": -65863.47,
        "z": -35573.74,
        "vx": 0.9393,
        "vy": 0.0525,
        "vz": 0.0343,
    })
    assert "km" in result
    assert "mi" in result
    assert "mph" in result
