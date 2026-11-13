from pathlib import Path
import sys
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from schemas import Coordinate
from services.v9_hierarchical import V9HierarchicalRouteService


def pt(lat, lon):
    return {"latitude": lat, "longitude": lon}


class FakeGlobal:
    def __init__(self, route=None):
        self.route = route or [pt(0, 0), pt(0, 1), pt(0, 2), pt(0, 3)]
    def plan(self, start, destination):
        return {"route": self.route}


class FakeRegional:
    def __init__(self, succeeds_at=27, always_fail=False):
        self.calls = []
        self.succeeds_at = succeeds_at
        self.always_fail = always_fail
    def plan(self, start, destination, **kwargs):
        threshold = kwargs["max_slope_deg"]
        self.calls.append(threshold)
        if self.always_fail or threshold < self.succeeds_at:
            raise ValueError(f"No route below {threshold}")
        return {
            "route": [pt(start.latitude, start.longitude), pt(destination.latitude, destination.longitude)],
            "summary": {"explored_nodes": 10, "calculation_seconds": 0.01},
        }


def test_retry_stops_at_first_successful_integer_threshold():
    regional = FakeRegional(succeeds_at=27)
    service = V9HierarchicalRouteService(FakeGlobal(), regional)
    result = service.plan(Coordinate(latitude=0, longitude=0), Coordinate(latitude=0, longitude=3),
                          max_leg_km=200, max_slope_deg=25, max_retry_slope_deg=30, retry_step_deg=1)
    assert regional.calls == [25.0, 26.0, 27.0]
    assert result["status"] == "success_with_relaxed_sections"
    section = result["sections"][0]
    assert section["status"] == "refined_with_relaxed_slope"
    assert section["used_max_slope_deg"] == 27.0
    assert section["retry_count"] == 2
    assert section["attempted_slope_limits_deg"] == [25.0, 26.0, 27.0]


def test_requested_threshold_success_does_not_relax():
    regional = FakeRegional(succeeds_at=25)
    service = V9HierarchicalRouteService(FakeGlobal(), regional)
    result = service.plan(Coordinate(latitude=0, longitude=0), Coordinate(latitude=0, longitude=3),
                          max_leg_km=200, max_slope_deg=25, max_retry_slope_deg=30)
    assert regional.calls == [25.0]
    assert result["status"] == "success"
    assert result["sections"][0]["status"] == "refined"
    assert result["sections"][0]["retry_count"] == 0


def test_fallback_preserves_complete_corridor_segment():
    corridor = [pt(0, 0), pt(0.2, 1), pt(0.3, 2), pt(0, 3)]
    regional = FakeRegional(always_fail=True)
    service = V9HierarchicalRouteService(FakeGlobal(corridor), regional)
    result = service.plan(Coordinate(latitude=0, longitude=0), Coordinate(latitude=0, longitude=3),
                          max_leg_km=200, max_slope_deg=25, max_retry_slope_deg=27)
    assert result["status"] == "partial"
    assert result["route"] == corridor
    assert result["sections"][0]["status"] == "coarse_fallback"
    assert result["sections"][0]["attempted_slope_limits_deg"] == [25.0, 26.0, 27.0]


def test_retry_limit_validation_and_non_integer_cap():
    assert V9HierarchicalRouteService._build_retry_limits(25, 27.5, 1) == [25.0, 26.0, 27.0, 27.5]
    with pytest.raises(ValueError):
        V9HierarchicalRouteService._build_retry_limits(25, 27, 0)
