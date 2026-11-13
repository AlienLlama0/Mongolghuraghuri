"""V9 hierarchical planner with minimum-threshold adaptive slope retries."""
from __future__ import annotations

from schemas import Coordinate
from services.geo import haversine_m, polyline_distance_km
from services.hierarchical_common import select_corridor_waypoints_with_indices, append_connected_points


class V9HierarchicalRouteService:
    def __init__(self, global_planner, regional_planner, ctx_planner=None):
        self.global_planner = global_planner
        self.regional_planner = regional_planner
        self.ctx_planner = ctx_planner

    @staticmethod
    def _coordinate(point):
        return Coordinate(latitude=point["latitude"], longitude=point["longitude"])

    @staticmethod
    def _simplify_by_spacing(points, min_spacing_km=10.0):
        if len(points) <= 2:
            return points
        result = [points[0]]
        last = points[0]
        for point in points[1:-1]:
            distance = haversine_m(last["latitude"], last["longitude"],
                                   point["latitude"], point["longitude"]) / 1000.0
            if distance >= min_spacing_km:
                result.append(point)
                last = point
        result.append(points[-1])
        return result

    @staticmethod
    def _build_retry_limits(requested, maximum, step):
        """Return requested threshold followed by ascending fixed increments and capped max."""
        if step <= 0 or step > 10:
            raise ValueError("retry_step_deg must be greater than 0 and no more than 10.")
        if maximum < requested or maximum > 90:
            raise ValueError("max_retry_slope_deg must be between requested slope and 90.")
        limits = [round(float(requested), 6)]
        candidate = float(requested) + float(step)
        while candidate < maximum - 1e-9:
            limits.append(round(candidate, 6))
            candidate += step
        if maximum > limits[-1] + 1e-9:
            limits.append(round(float(maximum), 6))
        return limits

    def plan(self, start, destination, max_leg_km=100.0, max_slope_deg=25.0,
             slope_penalty=3.0, max_retry_slope_deg=40.0, retry_step_deg=1.0):
        if max_leg_km <= 0 or max_leg_km > 200:
            raise ValueError("max_leg_km must be greater than 0 and no more than 200.")
        if not 0 < max_slope_deg <= 90:
            raise ValueError("max_slope_deg must be greater than 0 and no more than 90.")
        retry_limits = self._build_retry_limits(max_slope_deg, max_retry_slope_deg, retry_step_deg)

        global_result = self.global_planner.plan(start, destination)
        corridor = global_result["route"]
        if len(corridor) < 2:
            raise ValueError("Global planner returned fewer than two corridor points.")
        anchors = select_corridor_waypoints_with_indices(corridor, max_leg_km)

        returned_route = []
        section_results = []
        failures = []
        regional_explored = 0
        regional_seconds = 0.0
        refined_distance = 0.0
        fallback_distance = 0.0
        relaxed_sections = 0
        retried_sections = 0
        total_retry_attempts = 0

        for index in range(len(anchors) - 1):
            start_index, start_point = anchors[index]
            end_index, end_point = anchors[index + 1]
            base_section = {
                "section": index + 1,
                "start": start_point,
                "destination": end_point,
                "requested_max_slope_deg": float(max_slope_deg),
                "corridor_start_index": start_index,
                "corridor_end_index": end_index,
            }

            last_error = None
            successful_result = None
            used_limit = None
            used_planner = None
            used_source = None
            attempted_limits = []
            attempted_sources = []

            # Try CTX first, but only if both endpoints have valid coverage.
            candidate_planners = []

            if self.ctx_planner is not None:
                try:
                    ctx_covers_start = self.ctx_planner.contains_valid_coordinate(
                        self._coordinate(start_point)
                    )
                    ctx_covers_end = self.ctx_planner.contains_valid_coordinate(
                        self._coordinate(end_point)
                    )

                    if ctx_covers_start and ctx_covers_end:
                        candidate_planners.append(("CTX", self.ctx_planner))
                except Exception as exc:
                    last_error = f"CTX coverage check failed: {exc}"

            # MOLA is always available as the regional fallback.
            candidate_planners.append(("MOLA", self.regional_planner))

            for source_name, planner in candidate_planners:
                for attempt_limit in retry_limits:
                    attempted_limits.append(attempt_limit)
                    attempted_sources.append(source_name)
                    total_retry_attempts += 1

                    try:
                        candidate_result = planner.plan(
                            self._coordinate(start_point),
                            self._coordinate(end_point),
                            max_slope_deg=attempt_limit,
                            max_distance_km=min(250.0, max_leg_km * 1.5),
                            slope_penalty=slope_penalty,
                        )

                        successful_result = candidate_result
                        used_limit = attempt_limit
                        used_planner = planner
                        used_source = source_name
                        break

                    except Exception as exc:
                        last_error = f"{source_name}: {exc}"

                if successful_result is not None:
                    break


            # for attempt_limit in retry_limits:
            #     attempted_limits.append(attempt_limit)
            #     total_retry_attempts += 1
            #     try:
            #         candidate_result = self.regional_planner.plan(
            #             self._coordinate(start_point), self._coordinate(end_point),
            #             max_slope_deg=attempt_limit,
            #             max_distance_km=min(250.0, max_leg_km * 1.5),
            #             slope_penalty=slope_penalty,
            #         )
            #         successful_result = candidate_result
            #         used_limit = attempt_limit
            #         break
            #     except Exception as exc:
            #         last_error = str(exc)

            if successful_result is not None:
                leg_points = used_planner.add_elevations(
                    successful_result["route"]
                )
                if not leg_points:
                    raise ValueError(f"Regional planner returned an empty route for section {index + 1}.")
                append_connected_points(returned_route, leg_points)
                section_distance = polyline_distance_km(leg_points)
                refined_distance += section_distance
                summary = successful_result.get("summary", {})
                regional_explored += int(summary.get("explored_nodes", 0))
                regional_seconds += float(summary.get("calculation_seconds", 0.0))
                was_relaxed = used_limit > max_slope_deg + 1e-9
                retry_count = len(attempted_limits) - 1
                if was_relaxed:
                    relaxed_sections += 1
                if retry_count:
                    retried_sections += 1
                section_results.append({
                    **base_section,
                    "status": "refined_with_relaxed_slope" if was_relaxed else "refined",
                    "used_max_slope_deg": float(used_limit),
                    "retry_count": retry_count,
                    "attempted_slope_limits_deg": attempted_limits,
                    "points": len(leg_points),
                    "distance_km": round(section_distance, 3),
                    "explored_nodes": summary.get("explored_nodes"),
                    "calculation_seconds": summary.get("calculation_seconds"),
                    "regional_dataset": used_source,
                    "attempted_datasets": attempted_sources,
                })
            else:
                # Preserve every coarse-corridor vertex between these anchor indices.
                fallback_points = self.regional_planner.add_elevations(
                    corridor[start_index:end_index + 1]
                )
                if not fallback_points:
                    raise ValueError(f"Global corridor slice was empty for section {index + 1}.")
                append_connected_points(returned_route, fallback_points)
                section_distance = polyline_distance_km(fallback_points)
                fallback_distance += section_distance
                failures.append({"section": index + 1, "reason": last_error})
                section_results.append({
                    **base_section,
                    "status": "coarse_fallback",
                    "reason": last_error,
                    "retry_count": max(0, len(attempted_limits) - 1),
                    "attempted_slope_limits_deg": attempted_limits,
                    "points": len(fallback_points),
                    "distance_km": round(section_distance, 3),
                    "regional_dataset": "global_coarse_mola",
                    "attempted_datasets": attempted_sources
                })

        if failures:
            overall_status = "partial"
        elif relaxed_sections:
            overall_status = "success_with_relaxed_sections"
        else:
            overall_status = "success"

        overall_distance = polyline_distance_km(returned_route)
        # returned_route = self.regional_planner.add_elevations(returned_route)
        simplified = self._simplify_by_spacing(returned_route)
        global_distance = polyline_distance_km(corridor)
        return {
            "status": overall_status,
            "planner": "global_then_regional_ctx_mola",
            "planner_version": "v9",
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
                "relaxed_slope_sections": relaxed_sections,
                "coarse_fallback_sections": len(failures),
                "sections_requiring_retry": retried_sections,
                "total_regional_attempts": total_retry_attempts,
                "regional_explored_nodes": regional_explored,
                "regional_calculation_seconds_sum": round(regional_seconds, 3),
                "requested_max_slope_deg": float(max_slope_deg),
                "retry_step_deg": float(retry_step_deg),
                "max_retry_slope_deg": float(max_retry_slope_deg),
                "retry_slope_limits_deg": retry_limits,
            },
            "sections": section_results,
            "data_quality": {
                "global_source": "coarse average-resampled MOLA overview",
                "regional_source": "CTX where valid coverage and routing succeed; otherwise original full-resolution MOLA",
                "fallback_source": "original global coarse corridor geometry for sections that failed regional refinement",
                "safety_status": "not crew-safety certified",
                "warnings": [
                    "Global route is a broad corridor, not a validated safe route.",
                    "CTX and MOLA elevation data do not resolve all astronaut-scale hazards.",
                    "Sections marked coarse_fallback preserve the complete global coarse corridor geometry, not full-resolution refinement.",
                    "Sections marked refined_with_relaxed_slope exceeded the originally requested slope threshold; inspect their used_max_slope_deg.",
                    "NoData is unknown terrain and is not safe terrain.",
                    "The slope-weighted cost is a prototype metric, not a validated mobility or energy model.",
                    "Adaptive retries do not establish a terrain-safety limit."
                ] + (
                    ["One or more regional sections could not be refined; inspect section statuses."]
                    if failures else []
                ) + (
                    ["One or more sections required a more permissive slope threshold."]
                    if relaxed_sections else []
                )
            },
        }
