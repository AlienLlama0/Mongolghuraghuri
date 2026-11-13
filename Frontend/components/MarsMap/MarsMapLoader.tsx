
"use client";

import dynamic from "next/dynamic";
import { LatLngTuple } from "leaflet";
import {
  InteractionMode,
  RouteResponse,
} from "@/types/MarsMap";
import { LayerConfig } from "../Sidebar/sidebar";

const MarsMap = dynamic(() => import("./MarsMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "600px",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      Loading Mars map...
    </div>
  ),
});

export interface MapProps {
  startPosition: LatLngTuple | null;
  destinationPosition: LatLngTuple | null;
  onClick: (p: LatLngTuple) => void;
  mode: InteractionMode;
  activeLayer?: LayerConfig | null;
  routeData: RouteResponse | null;
  scope: "jezero" | "global";
  showScientificTargets: boolean;
}

export default function MarsMapLoader({
  onClick,
  startPosition,
  destinationPosition,
  mode,
  activeLayer,
  routeData,
  scope,
  showScientificTargets,
}: MapProps) {
  return (
    <MarsMap
      onClick={onClick}
      startPosition={startPosition}
      destinationPosition={destinationPosition}
      mode={mode}
      scope={scope}
      activeLayer={activeLayer}
      routeData={routeData}
      showScientificTargets={showScientificTargets}
    />
  );
}
