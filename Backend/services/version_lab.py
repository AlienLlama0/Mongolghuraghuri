from __future__ import annotations
import importlib
from services.hierarchical_routing_service import HierarchicalRouteService as V7Hierarchical
from services.v9_hierarchical import V9HierarchicalRouteService
from services.geo import polyline_distance_km

class VersionLab:
    def __init__(self, global_planner, regional_planner, ctx_planner=None):
        self.global_planner = global_planner
        self.regional_planner = regional_planner
        self.ctx_planner = ctx_planner

        self.v6_class = importlib.import_module(
            "services.versions.v6_hierarchical"
        ).HierarchicalRouteService

        self.v6 = self.v6_class(global_planner, regional_planner)
        self.v7 = V7Hierarchical(global_planner, regional_planner)

        self.v9 = V9HierarchicalRouteService(
            global_planner,
            regional_planner,
            ctx_planner=ctx_planner
        )

    def run(self, version, start, destination, *, max_leg_km=100, max_slope_deg=25,
            slope_penalty=3, slope_retry_steps=(5,10), max_retry_slope_deg=40,
            retry_step_deg=1):
        if version == "v5":
            result = self.global_planner.plan(start, destination)
            result["planner_version"] = "v5"
            result["planner"] = "global_coarse_mola_astar"
            return result
        if version == "v6":
            planner = self.v6
            kwargs = {"max_leg_km":max_leg_km, "max_slope_deg":max_slope_deg, "slope_penalty":slope_penalty}
        elif version == "v7":
            planner = self.v7
            kwargs = {"max_leg_km":max_leg_km, "max_slope_deg":max_slope_deg,
                      "slope_penalty":slope_penalty, "slope_retry_steps":slope_retry_steps,
                      "max_retry_slope_deg":max_retry_slope_deg}
        elif version == "v9":
            planner = self.v9
            kwargs = {"max_leg_km":max_leg_km, "max_slope_deg":max_slope_deg,
                      "slope_penalty":slope_penalty, "max_retry_slope_deg":max_retry_slope_deg,
                      "retry_step_deg":retry_step_deg}
        else:
            raise ValueError("planner_version must be one of v5, v6, v7, v9")
        result = planner.plan(start, destination, **kwargs)
        result["planner_version"] = version
        return result

    @staticmethod
    def metrics(result):
        summary = result.get("summary", {})
        sections = result.get("sections", [])
        statuses = [x.get("status") for x in sections]
        hierarchical = bool(sections)
        route = result.get("route", [])
        measured_distance = round(polyline_distance_km(route), 3) if route else 0.0
        return {
            "status": result.get("status", "unknown"),
            "planner_version": result.get("planner_version"),
            "route_distance_km": measured_distance,
            "global_corridor_distance_km": (summary.get("global_corridor_distance_km") if hierarchical else summary.get("coarse_route_distance_km")),
            "regional_refined_distance_km": summary.get("regional_refined_distance_km") if hierarchical else None,
            "coarse_fallback_distance_km": summary.get("coarse_fallback_distance_km") if hierarchical else None,
            "calculation_seconds": (summary.get("regional_calculation_seconds_sum") if hierarchical else summary.get("calculation_seconds")),
            "total_points": len(route),
            "explored_nodes": (summary.get("regional_explored_nodes") if hierarchical else summary.get("explored_nodes")),
            "sections_total": len(sections) if hierarchical else None,
            "sections_at_requested_slope": statuses.count("refined") if hierarchical else None,
            "relaxed_sections": statuses.count("refined_with_relaxed_slope") if hierarchical else None,
            "fallback_sections": statuses.count("coarse_fallback") if hierarchical else None,
            "sections_requiring_retry": summary.get("sections_requiring_retry") if result.get("planner_version") == "v9" else None,
            "total_regional_attempts": summary.get("total_regional_attempts") if result.get("planner_version") == "v9" else None,
        }
