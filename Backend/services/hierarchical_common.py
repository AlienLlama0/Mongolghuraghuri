"""Shared geometry helpers for hierarchical route planners."""
from __future__ import annotations

from services.geo import haversine_m, polyline_distance_km


def select_corridor_waypoints_with_indices(route, max_leg_km):
    """Select corridor anchors and retain their exact source indices."""
    if len(route) <= 2:
        return [(0, route[0])] + ([(len(route) - 1, route[-1])] if len(route) > 1 else [])
    selected = [(0, route[0])]
    accumulated = 0.0
    previous = route[0]
    for index, point in enumerate(route[1:-1], start=1):
        accumulated += haversine_m(
            previous["latitude"], previous["longitude"],
            point["latitude"], point["longitude"],
        ) / 1000.0
        if accumulated >= max_leg_km:
            selected.append((index, point))
            accumulated = 0.0
        previous = point
    if selected[-1][0] != len(route) - 1:
        selected.append((len(route) - 1, route[-1]))
    return selected


def append_connected_points(target, section_points):
    """Append section geometry, dropping only an exactly repeated join vertex."""
    points = list(section_points)
    if target and points:
        a, b = target[-1], points[0]
        same = (
            abs(float(a["latitude"]) - float(b["latitude"])) <= 1e-10
            and abs(float(a["longitude"]) - float(b["longitude"])) <= 1e-10
        )
        if same:
            points = points[1:]
    target.extend(points)


def route_geometry_summary(points):
    return {
        "returned_route_distance_km": round(polyline_distance_km(points), 3),
        "returned_route_points": len(points),
    }
