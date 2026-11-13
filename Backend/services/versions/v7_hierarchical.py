"""
Hierarchical route orchestration with transparent regional slope retries.

Global coarse A* proposes a corridor. Regional MOLA A* refines each corridor
section. If a section fails at the requested slope limit, optional retries
can test progressively more permissive limits. Any relaxed section is clearly
labelled and the requested limit is preserved in the response.
"""
from __future__ import annotations

from services.geo import haversine_m


class HierarchicalRouteService:
    def __init__(self, global_planner, regional_planner):
        self.global_planner = global_planner
        self.regional_planner = regional_planner

    @staticmethod
    def _coordinate(point):
        from schemas import Coordinate
        return Coordinate(latitude=point["latitude"], longitude=point["longitude"])

    @staticmethod
    def _select_corridor_waypoints(route, max_leg_km):
        if len(route) <= 2:
            return route[:]
        selected = [route[0]]
        accumulated = 0.0
        previous = route[0]
        for point in route[1:-1]:
            accumulated += haversine_m(
                previous["latitude"], previous["longitude"],
                point["latitude"], point["longitude"],
            ) / 1000.0
            if accumulated >= max_leg_km:
                selected.append(point)
                accumulated = 0.0
            previous = point
        if selected[-1] != route[-1]:
            selected.append(route[-1])
        return selected

    @staticmethod
    def _simplify_by_spacing(points, min_spacing_km=10.0):
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

    def plan(
        self,
        start,
        destination,
        max_leg_km=100.0,
        max_slope_deg=25.0,
        slope_penalty=3.0,
        slope_retry_steps=(5.0, 10.0),
        max_retry_slope_deg=40.0,
    ):
        if max_leg_km <= 0 or max_leg_km > 200:
            raise ValueError("max_leg_km must be greater than 0 and no more than 200.")
        if not 0 < max_slope_deg <= 90:
            raise ValueError("max_slope_deg must be greater than 0 and no more than 90.")
        if max_retry_slope_deg < max_slope_deg or max_retry_slope_deg > 90:
            raise ValueError("max_retry_slope_deg must be between requested slope and 90.")

        global_result = self.global_planner.plan(start, destination)
        corridor = global_result["route"]
        anchors = self._select_corridor_waypoints(corridor, max_leg_km)

        refined_points = []
        section_results = []
        failures = []
        total_regional_explored = 0
        total_regional_seconds = 0.0
        regional_distances = 0.0
        relaxed_sections = 0

        retry_limits = [float(max_slope_deg)]
        for step in slope_retry_steps:
            candidate = min(float(max_retry_slope_deg), float(max_slope_deg) + float(step))
            if candidate > retry_limits[-1]:
                retry_limits.append(candidate)
        if retry_limits[-1] < max_retry_slope_deg and len(retry_limits) > 1:
            retry_limits.append(float(max_retry_slope_deg))

        for index in range(len(anchors) - 1):
            leg_start = self._coordinate(anchors[index])
            leg_end = self._coordinate(anchors[index + 1])
            base_section = {
                "section": index + 1,
                "start": anchors[index],
                "destination": anchors[index + 1],
                "requested_max_slope_deg": float(max_slope_deg),
            }
            last_error = None
            successful_result = None
            used_limit = None

            for attempt_limit in retry_limits:
                try:
                    candidate_result = self.regional_planner.plan(
                        leg_start,
                        leg_end,
                        max_slope_deg=attempt_limit,
                        max_distance_km=min(250.0, max_leg_km * 1.5),
                        slope_penalty=slope_penalty,
                    )
                    successful_result = candidate_result
                    used_limit = attempt_limit
                    break
                except Exception as exc:
                    last_error = str(exc)

            if successful_result is not None:
                leg_points = successful_result["route"]
                if refined_points and leg_points:
                    leg_points = leg_points[1:]
                refined_points.extend(leg_points)
                summary = successful_result.get("summary", {})
                total_regional_explored += int(summary.get("explored_nodes", 0))
                total_regional_seconds += float(summary.get("calculation_seconds", 0.0))
                regional_distances += float(summary.get("route_distance_km", 0.0))
                was_relaxed = used_limit > max_slope_deg
                if was_relaxed:
                    relaxed_sections += 1
                section_results.append({
                    **base_section,
                    "status": "refined_with_relaxed_slope" if was_relaxed else "refined",
                    "used_max_slope_deg": float(used_limit),
                    "points": len(successful_result["route"]),
                    "distance_km": summary.get("route_distance_km"),
                    "explored_nodes": summary.get("explored_nodes"),
                    "calculation_seconds": summary.get("calculation_seconds"),
                })
            else:
                fallback = [anchors[index], anchors[index + 1]]
                if refined_points and fallback:
                    fallback = fallback[1:]
                refined_points.extend(fallback)
                failures.append({"section": index + 1, "reason": last_error})
                section_results.append({
                    **base_section,
                    "status": "coarse_fallback",
                    "reason": last_error,
                    "attempted_slope_limits_deg": retry_limits,
                })

        failed_count = len(failures)
        if failed_count:
            overall_status = "partial"
        elif relaxed_sections:
            overall_status = "success_with_relaxed_sections"
        else:
            overall_status = "success"

        simplified = self._simplify_by_spacing(refined_points, min_spacing_km=10.0)

        return {
            "status": overall_status,
            "planner": "global_then_regional_mola",
            "route": refined_points,
            "simplified_route": simplified,
            "global_corridor": corridor,
            "summary": {
                "global_corridor_distance_km": global_result["summary"]["coarse_route_distance_km"],
                "regional_refined_distance_km": round(regional_distances, 3),
                "global_corridor_points": len(corridor),
                "regional_anchor_points": len(anchors),
                "returned_route_points": len(refined_points),
                "simplified_route_points": len(simplified),
                "regional_sections": len(section_results),
                "refined_sections": sum(1 for x in section_results if x["status"] == "refined"),
                "relaxed_slope_sections": relaxed_sections,
                "coarse_fallback_sections": failed_count,
                "regional_explored_nodes": total_regional_explored,
                "regional_calculation_seconds_sum": round(total_regional_seconds, 3),
                "requested_max_slope_deg": float(max_slope_deg),
                "retry_slope_limits_deg": retry_limits,
            },
            "sections": section_results,
            "data_quality": {
                "global_source": "coarse average-resampled MOLA overview",
                "regional_source": "original full-resolution MOLA where regional refinement succeeded",
                "safety_status": "not crew-safety certified",
                "warnings": [
                    "Global route is a broad corridor, not a validated safe route.",
                    "Regional refinement uses MOLA only; astronaut-scale hazards remain unresolved.",
                    "Sections marked coarse_fallback use the global coarse corridor, not full-resolution refinement.",
                    "Sections marked refined_with_relaxed_slope exceeded the originally requested slope threshold; inspect their used_max_slope_deg.",
                    "MOLA NoData is unknown terrain and is not safe terrain.",
                    "The regional route cost is a prototype slope-weighted metric, not a validated mobility or energy model.",
                ] + (
                    ["One or more regional sections could not be refined; inspect section statuses."]
                    if failures else []
                ) + (
                    ["One or more sections required a more permissive slope threshold. These sections must not be represented as meeting the original slope constraint."]
                    if relaxed_sections else []
                ),
            },
        }
