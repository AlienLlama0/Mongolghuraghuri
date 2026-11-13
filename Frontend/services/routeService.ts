
import { RoutePoint, RouteResponse } from "@/types/MarsMap";

const API_URL =
  process.env.NEXT_PUBLIC_MARS_API_URL || "http://127.0.0.1:8000";

type GlobalRouteRequest = {
  planner_version: "v9";
  start: RoutePoint;
  destination: RoutePoint;
  max_leg_km?: number;
  max_slope_deg?: number;
  slope_penalty?: number;
  retry_step_deg?: number;
  max_retry_slope_deg?: number;
};

export async function calculateMarsRoute(
  request: GlobalRouteRequest,
  signal?: AbortSignal
): Promise<RouteResponse> {
  const response = await fetch(`${API_URL}/api/route/versioned`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    let message = "Unable to calculate Mars route.";

    try {
      const errorData = await response.json();
      message =
        typeof errorData.detail === "string"
          ? errorData.detail
          : message;
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  const data: RouteResponse = await response.json();

  if (
    !["success", "success_with_relaxed_sections", "partial"].includes(
      data.status
    ) ||
    !Array.isArray(data.route) ||
    data.route.length === 0
  ) {
    throw new Error("The planner did not return a usable route.");
  }

  return data;
}
