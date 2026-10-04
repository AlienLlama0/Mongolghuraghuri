"use client";

import dynamic from "next/dynamic";
import { LatLngTuple } from "leaflet";
import { InteractionMode } from "@/types/ MarsMap";

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
  startPosition:LatLngTuple | null,
  destinationPosition:LatLngTuple | null,
  onClick:(p:LatLngTuple) => void, 
  mode: InteractionMode
}

export default function MarsMapLoader({onClick, startPosition, destinationPosition, mode}: MapProps) {
  return (
    <MarsMap 
      onClick={onClick} 
      startPosition={startPosition}
      destinationPosition={destinationPosition} 
      mode={mode}
    />
  );
}