"""
V6 hierarchical planner with V8.2 reliability corrections.

Failed regional legs retain the full matching slice of the global coarse
corridor. Distances are measured from the returned geometry, with refined and
fallback contributions reported separately.
"""
from __future__ import annotations

from schemas import Coordinate
from services.geo import polyline_distance_km
from services.hierarchical_common import (
    select_corridor_waypoints_with_indices,
    append_connected_points,
)


class HierarchicalRouteService:
    def __init__(self, global_planner, regional_planner):
        self.global_planner = global_planner
        self.regional_planner = regional_planner

    @staticmethod
    def _coordinate(point):
        return Coordinate(latitude=point["latitude"], longitude=point["longitude"])

    @staticmethod
    def _simplify_by_spacing(points, min_spacing_km=10.0):
        from services.geo import haversine_m
        if len(points) <= 2:
            return points
        result = [points[0]]
        last = points[0]
        for point in points[1:-1]:
            distance = haversine_m(
                last["latitude"], last["longitude"],
                point["latitude"], point["longitude"],
            ) / 1000.0
            if distance >= min_spacing_km:
                result.append(point)
                last = point
        result.append(points[-1])
        return result

    def plan(self, start, destination, max_leg_km=100.0, max_slope_deg=25.0,
             slope_penalty=3.0, max_explored_nodes=None):
        if max_leg_km <= 0 or max_leg_km > 200:
            raise ValueError("max_leg_km must be greater than 0 and no more than 200.")
        if not 0 < max_slope_deg <= 90:
            raise ValueError("max_slope_deg must be greater than 0 and no more than 90.")

        global_result = self.global_planner.plan(start, destination)
        corridor = global_result["route"]
        anchors = select_corridor_waypoints_with_indices(corridor, max_leg_km)

        returned_route = []
        section_results = []
        failures = []
        regional_explored = 0
        regional_seconds = 0.0
        refined_distance = 0.0
        fallback_distance = 0.0

        for index in range(len(anchors) - 1):
            start_index, start_point = anchors[index]
            end_index, end_point = anchors[index + 1]
            try:
                result = self.regional_planner.plan(
                    self._coordinate(start_point), self._coordinate(end_point),
                    max_slope_deg=max_slope_deg,
                    max_distance_km=min(250.0, max_leg_km * 1.5),
                    slope_penalty=slope_penalty,
                )
                leg_points = result["route"]
                append_connected_points(returned_route, leg_points)
                section_distance = polyline_distance_km(leg_points)
                refined_distance += section_distance
                summary = result.get("summary", {})
                regional_explored += int(summary.get("explored_nodes", 0))
                regional_seconds += float(summary.get("calculation_seconds", 0.0))
                section_results.append({
                    "section": index + 1,
                    "status": "refined",
                    "points": len(leg_points),
                    "distance_km": round(section_distance, 3),
                    "explored_nodes": summary.get("explored_nodes"),
                    "calculation_seconds": summary.get("calculation_seconds"),
                })
            except Exception as exc:
                # Preserve every original coarse corridor vertex in this leg.
                fallback_points = corridor[start_index:end_index + 1]
                append_connected_points(returned_route, fallback_points)
                section_distance = polyline_distance_km(fallback_points)
                fallback_distance += section_distance
                failures.append({"section": index + 1, "reason": str(exc)})
                section_results.append({
                    "section": index + 1,
                    "status": "coarse_fallback",
                    "reason": str(exc),
                    "points": len(fallback_points),
                    "distance_km": round(section_distance, 3),
                    "corridor_start_index": start_index,
                    "corridor_end_index": end_index,
                })

        overall_distance = polyline_distance_km(returned_route)
        simplified = self._simplify_by_spacing(returned_route)
        global_distance = polyline_distance_km(corridor)

        return {
            "status": "success" if not failures else "partial",
            "planner": "global_then_regional_mola",
            "planner_version": "v6",
            "route": returned_route,
            "simplified_route": simplified,
            "global_corridor": corridor,
            "summary": {
                "global_corridor_distance_km": round(global_distance, 3),
                "regional_refined_distance_km": round(refined_distance, 3),
                "coarse_fallback_distance_km": round(fallback_distance, 3),
                "returned_route_distance_km": round(overall_distance, 3),
                "route_distance_km": round(overall_distance, 3),
                "global_corridor_points": len(corridor),
                "regional_anchor_points": len(anchors),
                "returned_route_points": len(returned_route),
                "simplified_route_points": len(simplified),
                "regional_sections": len(section_results),
                "refined_sections": sum(x["status"] == "refined" for x in section_results),
                "relaxed_slope_sections": 0,
                "coarse_fallback_sections": len(failures),
                "regional_explored_nodes": regional_explored,
                "regional_calculation_seconds_sum": round(regional_seconds, 3),
                "requested_max_slope_deg": float(max_slope_deg),
            },
            "sections": section_results,
            "data_quality": {
                "global_source": "coarse average-resampled MOLA overview",
                "regional_source": "original full-resolution MOLA where regional refinement succeeded",
                "fallback_source": "original global coarse corridor geometry for sections that failed regional refinement",
                "safety_status": "not crew-safety certified",
                "warnings": [
                    "Global route is a broad corridor, not a validated safe route.",
                    "Regional refinement uses MOLA only; astronaut-scale hazards remain unresolved.",
                    "Sections marked coarse_fallback preserve the complete global coarse corridor geometry, not full-resolution refinement.",
                    "MOLA NoData is unknown terrain and is not safe terrain.",
                    "The regional route cost is a prototype slope-weighted metric, not a validated mobility or energy model.",
                ] + (["One or more regional sections could not be refined; inspect section statuses."] if failures else []),
            },
        }
