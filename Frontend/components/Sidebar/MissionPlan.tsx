
import { LatLngTuple } from "leaflet";
import { RouteResponse } from "@/types/MarsMap";
import {
  LoaderCircle,
  AlertTriangle,
  Route,
  Mountain,
  Clock,
  Activity,
} from "lucide-react";

interface RightSidebarProps {
  startPosition?: LatLngTuple | null;
  destinationPosition?: LatLngTuple | null;
  routeData: RouteResponse | null;
  isRouting: boolean;
}

export function MissionPlan({
  startPosition = null,
  destinationPosition = null,
  routeData,
  isRouting,
}: RightSidebarProps) {
  function formatCoord(value: number, isLat: boolean) {
    const abs = Math.abs(value).toFixed(4);

    if (isLat) {
      return `${abs}°${value >= 0 ? "N" : "S"}`;
    }

    return `${abs}°${value >= 0 ? "E" : "W"}`;
  }

  const isPartial = routeData?.status === "partial";

  const hasRelaxedSections =
    (routeData?.summary.relaxed_slope_sections ?? 0) > 0;

  const statusLabel = isPartial
    ? "Partial route"
    : hasRelaxedSections
      ? "Completed with relaxed slope"
      : "Successfully calculated";

  const statusColor = isPartial
    ? "text-red-400"
    : hasRelaxedSections
      ? "text-amber-400"
      : "text-cyan-400";

  function formatDistance(value: number) {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  }

  return (
    <aside className="panel-scroll order-2 flex h-full flex-col border-line bg-panel text-white lg:order-3 lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-l">
      {/* Header */}
      <div className="border-b border-slate-700 p-4">
        <h2 className="text-sm font-semibold tracking-wide text-slate-300">
          MISSION PLAN
        </h2>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* START */}
        <div className="mb-5">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-sm font-medium">START</span>
          </div>

          {startPosition ? (
            <div className="ml-4 space-y-1 text-xs">
              <div className="font-medium text-slate-200">
                {formatCoord(startPosition[0], true)}
              </div>
              <div className="font-medium text-slate-200">
                {formatCoord(startPosition[1], false)}
              </div>
            </div>
          ) : (
            <p className="ml-4 text-xs text-slate-400">
              Choose Set start, then click the map.
            </p>
          )}
        </div>

        {/* DESTINATION */}
        <div className="mb-6">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-sm font-medium">DESTINATION</span>
          </div>

          {destinationPosition ? (
            <div className="ml-4 space-y-1 text-xs">
              <div className="font-medium text-slate-200">
                {formatCoord(destinationPosition[0], true)}
              </div>
              <div className="font-medium text-slate-200">
                {formatCoord(destinationPosition[1], false)}
              </div>
            </div>
          ) : (
            <p className="ml-4 text-xs text-slate-400">
              Choose Set destination, then click the map.
            </p>
          )}
        </div>

        <div className="my-2 border-t border-slate-700" />

        {/* ROUTE */}
        <div className="mt-3">
          <div className="mb-3 flex items-center gap-2">
            <Route size={15} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-300">
              ROUTE
            </h3>
          </div>

          {/* Loading */}
          {isRouting && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <LoaderCircle size={15} className="animate-spin" />
              Calculating Mars traverse...
            </div>
          )}

          {/* Route Results */}
          {!isRouting && routeData && (
            <div className="space-y-4">
              {/* Status */}
              <div>
                <span className="text-xs text-slate-400">
                  ROUTE STATUS
                </span>

                <p className={`mt-1 text-xs font-semibold ${statusColor}`}>
                  {statusLabel}
                </p>
              </div>

              {/* Total Distance */}
              <div>
                <span className="text-xs text-slate-400">
                  TOTAL DISTANCE
                </span>

                <p className="mt-1 text-2xl font-bold text-white">
                  {formatDistance(
                    routeData.summary.returned_route_distance_km
                  )}
                  <span className="ml-1 text-sm font-normal text-slate-400">
                    km
                  </span>
                </p>
              </div>

              {/* Planner */}
              <div className="border-t border-slate-700 pt-3">
                <span className="text-xs text-slate-400">
                  ROUTING PLANNER
                </span>

                <p className="mt-1 break-words text-xs font-medium text-cyan-400">
                  {routeData.planner}
                </p>
              </div>

              {/* Route Metrics */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Activity size={14} className="text-cyan-400" />
                  <h4 className="text-xs font-semibold text-slate-300">
                    ROUTE METRICS
                  </h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Global corridor
                    </span>
                    <span className="text-right">
                      {formatDistance(
                        routeData.summary.global_corridor_distance_km
                      )} km
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Regional refined
                    </span>
                    <span className="text-right">
                      {formatDistance(
                        routeData.summary.regional_refined_distance_km
                      )} km
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Coarse fallback
                    </span>
                    <span className="text-right">
                      {formatDistance(
                        routeData.summary.coarse_fallback_distance_km
                      )} km
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Regional sections
                    </span>
                    <span>
                      {routeData.summary.regional_sections}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Refined sections
                    </span>
                    <span className="text-cyan-400">
                      {routeData.summary.refined_sections}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Relaxed sections
                    </span>
                    <span className="text-amber-400">
                      {routeData.summary.relaxed_slope_sections}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Coarse fallbacks
                    </span>
                    <span
                      className={
                        routeData.summary.coarse_fallback_sections > 0
                          ? "text-red-400"
                          : "text-slate-200"
                      }
                    >
                      {routeData.summary.coarse_fallback_sections}
                    </span>
                  </div>
                </div>
              </div>

              {/* Calculation Details */}
              <div className="border-t border-slate-700 pt-3">
                <div className="mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-cyan-400" />
                  <h4 className="text-xs font-semibold text-slate-300">
                    CALCULATION DETAILS
                  </h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Regional calculation
                    </span>
                    <span>
                      {routeData.summary.regional_calculation_seconds_sum.toFixed(
                        2
                      )} s
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Explored nodes
                    </span>
                    <span>
                      {routeData.summary.regional_explored_nodes.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Regional attempts
                    </span>
                    <span>
                      {routeData.summary.total_regional_attempts}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Sections requiring retry
                    </span>
                    <span>
                      {routeData.summary.sections_requiring_retry}
                    </span>
                  </div>
                </div>
              </div>

              {/* Slope Configuration */}
              <div className="border-t border-slate-700 pt-3">
                <div className="mb-3 flex items-center gap-2">
                  <Mountain size={14} className="text-cyan-400" />
                  <h4 className="text-xs font-semibold text-slate-300">
                    SLOPE CONFIGURATION
                  </h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Requested maximum
                    </span>
                    <span>
                      {routeData.summary.requested_max_slope_deg}°
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Retry increment
                    </span>
                    <span>
                      {routeData.summary.retry_step_deg}°
                    </span>
                  </div>

                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">
                      Maximum retry slope
                    </span>
                    <span>
                      {routeData.summary.max_retry_slope_deg}°
                    </span>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {routeData.warnings?.length > 0 && (
                <div className="space-y-2 border-t border-slate-700 pt-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle size={14} />
                    <span className="text-xs font-semibold">
                      ROUTE WARNINGS
                    </span>
                  </div>

                  {routeData.warnings.map((warning, index) => (
                    <p
                      key={index}
                      className="text-xs leading-relaxed text-slate-400"
                    >
                      {warning}
                    </p>
                  ))}
                </div>
              )}

              {/* Safety Limitation */}
              <p className="border-t border-slate-700 pt-3 text-[11px] leading-relaxed text-slate-500">
                Route estimates are based on available terrain data.
                They do not certify astronaut mobility or crew safety.
              </p>
            </div>
          )}

          {/* No Route */}
          {!isRouting && !routeData && (
            <p className="text-xs leading-relaxed text-slate-400">
              {startPosition && destinationPosition
                ? "Coordinates selected. Generate a route to begin planning."
                : "Place a start and destination to plan a Marswalk. Use Example points for a ready-made traverse across the crater region."}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
