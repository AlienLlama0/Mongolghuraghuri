import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from services.geo import polyline_distance_km
from services.hierarchical_common import (
    select_corridor_waypoints_with_indices,
    append_connected_points,
)


def test_fallback_slice_keeps_intermediate_corridor_points():
    corridor = [
        {"latitude": 0.0, "longitude": 0.0},
        {"latitude": 0.0, "longitude": 0.1},
        {"latitude": 0.0, "longitude": 0.2},
        {"latitude": 0.0, "longitude": 0.3},
        {"latitude": 0.0, "longitude": 0.4},
    ]
    anchors = select_corridor_waypoints_with_indices(corridor, 10_000)
    assert anchors[0][0] == 0
    assert anchors[-1][0] == 4
    start_index, _ = anchors[0]
    end_index, _ = anchors[-1]
    fallback = corridor[start_index:end_index + 1]
    assert len(fallback) == len(corridor)
    assert fallback[2] == corridor[2]


def test_polyline_distance_includes_intermediate_detour():
    straight = [
        {"latitude": 0.0, "longitude": 0.0},
        {"latitude": 0.0, "longitude": 1.0},
    ]
    detour = [
        {"latitude": 0.0, "longitude": 0.0},
        {"latitude": 1.0, "longitude": 0.5},
        {"latitude": 0.0, "longitude": 1.0},
    ]
    assert polyline_distance_km(detour) > polyline_distance_km(straight)


def test_append_only_drops_identical_join_vertex():
    a = {"latitude": 1.0, "longitude": 2.0}
    b = {"latitude": 1.0, "longitude": 2.0}
    c = {"latitude": 1.1, "longitude": 2.1}
    result = [a]
    append_connected_points(result, [b, c])
    assert result == [a, c]
    d = {"latitude": 1.2, "longitude": 2.2}
    result = [a]
    append_connected_points(result, [d])
    assert result == [a, d]


class FakeGlobalPlanner:
    def __init__(self, route):
        self.route = route

    def plan(self, start, destination):
        return {
            "route": self.route,
            "summary": {"coarse_route_distance_km": polyline_distance_km(self.route)},
        }


class AlwaysFailRegionalPlanner:
    def plan(self, *args, **kwargs):
        raise RuntimeError("synthetic regional failure")


def test_v7_fallback_returns_full_global_corridor_geometry():
    from services.hierarchical_routing_service import HierarchicalRouteService

    corridor = [
        {"latitude": 0.0, "longitude": 0.0},
        {"latitude": 0.0, "longitude": 0.1},
        {"latitude": 0.05, "longitude": 0.2},
        {"latitude": 0.0, "longitude": 0.3},
    ]
    planner = HierarchicalRouteService(
        FakeGlobalPlanner(corridor), AlwaysFailRegionalPlanner()
    )
    result = planner.plan(
        None, None, max_leg_km=200, max_slope_deg=25,
        slope_retry_steps=(5, 10), max_retry_slope_deg=40,
    )
    assert result["status"] == "partial"
    assert result["route"] == corridor
    assert result["sections"][0]["status"] == "coarse_fallback"
    assert result["summary"]["coarse_fallback_distance_km"] == round(
        polyline_distance_km(corridor), 3
    )
    assert result["summary"]["returned_route_distance_km"] == round(
        polyline_distance_km(corridor), 3
    )


def test_v6_fallback_returns_full_global_corridor_geometry():
    from services.versions.v6_hierarchical import HierarchicalRouteService

    corridor = [
        {"latitude": 0.0, "longitude": 0.0},
        {"latitude": 0.0, "longitude": 0.1},
        {"latitude": 0.05, "longitude": 0.2},
        {"latitude": 0.0, "longitude": 0.3},
    ]
    planner = HierarchicalRouteService(
        FakeGlobalPlanner(corridor), AlwaysFailRegionalPlanner()
    )
    result = planner.plan(None, None, max_leg_km=200, max_slope_deg=25)
    assert result["status"] == "partial"
    assert result["route"] == corridor
    assert result["sections"][0]["status"] == "coarse_fallback"
    assert result["summary"]["returned_route_distance_km"] == round(
        polyline_distance_km(corridor), 3
    )
