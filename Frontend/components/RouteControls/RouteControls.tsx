
"use client";

import {
  Flag,
  MapPin,
  CircleX,
  Route,
  LoaderCircle,
} from "lucide-react";

import {
  InteractionMode,
  RouteResponse,
} from "@/types/MarsMap";

import ControlButton from "./ControlButton";

interface Props {
  mode: InteractionMode;
  hasStart: boolean;
  hasDestination: boolean;
  routeData: RouteResponse | null;
  reset: () => void;
  onClick: (v: InteractionMode) => void;
  generateRoute: () => void | Promise<void>;
  isRouting: boolean;
}

const RouteControls = ({
  onClick,
  mode,
  hasStart,
  hasDestination,
  routeData,
  reset,
  generateRoute,
  isRouting,
}: Props) => {
  const hasRoute = !!routeData;

  const next = !hasStart
    ? "start"
    : !hasDestination
      ? "destination"
      : !hasRoute
        ? "generate"
        : null;

  const canGenerate = hasStart && hasDestination && !isRouting;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2">

      {/* Set Starting Position */}
      <ControlButton
        active={mode === "start"}
        emphasis={next === "start"}
        onClick={() => onClick("start")}
        icon={<MapPin size={14} className="text-go" />}
      >
        Set Starting Position
      </ControlButton>

      {/* Set Destination Position */}
      <ControlButton
        active={mode === "destination"}
        emphasis={next === "destination"}
        onClick={() => onClick("destination")}
        icon={<Flag size={14} className="text-stop" />}
      >
        Set Destination Position
      </ControlButton>

      {/* Generate Route */}
      <button
        type="button"
        onClick={generateRoute}
        disabled={!canGenerate}
        className={`flex h-8 items-center gap-2 rounded-md border px-3 text-[13px] transition-colors ${
          canGenerate
            ? "border-route bg-route/15 text-ink hover:bg-route/25"
            : "cursor-not-allowed border-line text-muted opacity-50"
        }`}
      >
        {isRouting ? (
          <LoaderCircle size={14} className="animate-spin" />
        ) : (
          <Route size={14} />
        )}

        {isRouting ? "Calculating Route..." : "Generate Route"}
      </button>

      {/* Clear */}
      <ControlButton
        active={false}
        emphasis={false}
        onClick={reset}
        icon={<CircleX size={14} className="text-stop" />}
      >
        Clear
      </ControlButton>

      {/* Route Status */}
      {routeData && (
        <span className="ml-auto text-xs text-muted">
          {routeData.status === "partial"
            ? "Partial route"
            : routeData.status === "success_with_relaxed_sections"
              ? "Route calculated · Slope relaxed"
              : "Route calculated"}
        </span>
      )}
    </div>
  );
};

export default RouteControls;
