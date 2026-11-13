
import { LatLngTuple } from "leaflet";

export type Position = LatLngTuple | [];

export type InteractionMode = "start" | "destination" | "pan";

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RouteStatus =
  | "success"
  | "success_with_relaxed_sections"
  | "partial";

export type RouteSection = {
  section: number;
  status:
    | "refined"
    | "refined_with_relaxed_slope"
    | "coarse_fallback";
  distance_km: number;
  points: number;
  requested_max_slope_deg?: number;
  used_max_slope_deg?: number;
  retry_count?: number;
  attempted_slope_limits_deg?: number[];
};

export type RouteSummary = {
  global_corridor_distance_km: number;
  regional_refined_distance_km: number;
  coarse_fallback_distance_km: number;
  returned_route_distance_km: number;
  global_corridor_points: number;
  regional_anchor_points: number;
  returned_route_points: number;
  simplified_route_points: number;
  regional_sections: number;
  refined_sections: number;
  relaxed_slope_sections: number;
  coarse_fallback_sections: number;
  sections_requiring_retry: number;
  total_regional_attempts: number;
  regional_explored_nodes: number;
  regional_calculation_seconds_sum: number;
  requested_max_slope_deg: number;
  retry_step_deg: number;
  max_retry_slope_deg: number;
};

export type RouteResponse = {
  status: RouteStatus;
  planner: string;
  route: RoutePoint[];
  simplified_route: RoutePoint[];
  global_corridor: RoutePoint[];
  summary: RouteSummary;
  sections: RouteSection[];
  warnings: string[];
};
