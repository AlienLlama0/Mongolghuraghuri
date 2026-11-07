"use client";

import { useState, useCallback } from "react";
import { LatLngTuple } from "leaflet";
import { InteractionMode } from "@/types/MarsMap";
import Header from "../Header/Header";
import RouteControls from "../RouteControls/RouteControls";
import Sidebar from "@/components/Sidebar/Sidebar";
import MarsMapLoader from "../MarsMap/MarsMapLoader";
import { LayerConfig } from "../Sidebar/sidebar";

export default function MissionPlanner() {
  const [mode, setMode] = useState<InteractionMode>("pan");
  const [start, setStart] = useState<LatLngTuple | null>(null);
  const [destination, setDestination] = useState<LatLngTuple | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerConfig | null>(null);
  const [hasRoute, setHasRoute] = useState(false); // new

  const placePoint = useCallback(
    (c: LatLngTuple) => {
      if (mode === "start") {
        setStart(c);
        setHasRoute(false); // reset route when start changes
      }
      if (mode === "destination") {
        setDestination(c);
        setHasRoute(false); // reset route when destination changes
      }
      setMode("pan");
    },
    [mode]
  );

  const generateRoute = useCallback(() => {
    if (start && destination) {
      setHasRoute(true);
      console.log("Route generated from", start, "to", destination);
    }
  }, [start, destination]);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Header />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left Sidebar */}
        <Sidebar
          side="left"
          onLayerChange={(layer) => {
            setActiveLayer(layer);
          }}
        />

        {/* Center Map */}
        <main className="order-1 flex h-[68vh] min-h-95 flex-col lg:order-2 lg:h-auto lg:min-h-0 lg:flex-1">
          <RouteControls
            mode={mode}
            hasStart={!!start}
            hasDestination={!!destination}
            hasRoute={hasRoute}
            onClick={setMode}
            onGenerateRoute={generateRoute}
          />

          <MarsMapLoader
            mode={mode}
            startPosition={start}
            destinationPosition={destination}
            onClick={placePoint}
            activeLayer={activeLayer}
            hasRoute={hasRoute} // pass to map so it can draw the line
          />
        </main>

        {/* Right Sidebar */}
        <Sidebar
          side="right"
          startPosition={start}
          destinationPosition={destination}
        />
      </div>
    </div>
  );
}