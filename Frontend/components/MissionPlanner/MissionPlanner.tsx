
"use client";

import { calculateMarsRoute } from "@/services/routeService";
import { RouteResponse } from "@/types/MarsMap";
import { useErrorToast } from "../ErrorMessage";
import { useState, useCallback, useRef } from "react";
import { LatLngTuple } from "leaflet";
import { InteractionMode } from "@/types/MarsMap";
import Header from "../Header/Header";
import RouteControls from "../RouteControls/RouteControls";
import Sidebar from "@/components/Sidebar/Sidebar";
import MarsMapLoader from "../MarsMap/MarsMapLoader";
import { LayerConfig } from "../Sidebar/sidebar";
import { MissionPlan } from "../Sidebar/MissionPlan";

export default function MissionPlanner() {
  const requestId = useRef(0);

  const [mode, setMode] = useState<InteractionMode>("pan");
  const [start, setStart] = useState<LatLngTuple | null>(null);
  const [destination, setDestination] = useState<LatLngTuple | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerConfig | null>(null);

  // Independent Scientific Targets overlay state
  const [showScientificTargets, setShowScientificTargets] = useState(true);

  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  const [scope, setScope] = useState<"jezero" | "global">("jezero");

  const isInsideJezero = (lat: number, lng: number) => {
    return (
      lat >= 17.5805 &&
      lat <= 19.2902 &&
      lng >= 76.9974 &&
      lng <= 78.5826
    );
  };

  const { showError } = useErrorToast();

  const placePoint = useCallback(
    (coordinates: LatLngTuple) => {
      const [lat, lng] = coordinates;

      // Restrict point selection in Jezero mode.
      if (scope === "jezero" && !isInsideJezero(lat, lng)) {
        showError(
          "This location is outside the Jezero Crater planning area."
        );
        return;
      }

      requestId.current++;

      if (mode === "start") {
        setStart(coordinates);
        setRouteData(null);
      }

      if (mode === "destination") {
        setDestination(coordinates);
        setRouteData(null);
      }

      setIsRouting(false);
      setMode("pan");
    },
    [mode, scope, showError]
  );

  const reset = () => {
    requestId.current++;

    setStart(null);
    setDestination(null);
    setRouteData(null);
    setIsRouting(false);
    setMode("pan");
  };

  const generateRoute = useCallback(async () => {
    const currentRequest = ++requestId.current;

    if (!start || !destination) {
      showError("Please select both start and destination.");
      return;
    }

    try {
      setIsRouting(true);
      setRouteData(null);

      const result = await calculateMarsRoute({
        planner_version: "v9",
        start: {
          latitude: start[0],
          longitude: start[1],
        },
        destination: {
          latitude: destination[0],
          longitude: destination[1],
        },
        max_leg_km: 100,
        max_slope_deg: 25,
        slope_penalty: 3,
        retry_step_deg: 1,
        max_retry_slope_deg: 40,
      });

      if (currentRequest === requestId.current) {
        setRouteData(result);
      }
    } catch (error) {
      if (currentRequest === requestId.current) {
        if (error instanceof Error) {
          showError(error.message);
        }
      }
    } finally {
      if (currentRequest === requestId.current) {
        setIsRouting(false);
      }
    }
  }, [start, destination, showError]);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Header
        scope={scope}
        onScopeChange={(newScope) => {
          requestId.current++;

          setScope(newScope);
          setStart(null);
          setDestination(null);
          setRouteData(null);
          setIsRouting(false);
          setMode("pan");
        }}
        isRouting={isRouting}
        hasRoute={!!routeData}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left Sidebar */}
        <Sidebar
          side="left"
          onLayerChange={setActiveLayer}
          onScientificTargetsChange={setShowScientificTargets}
        />

        {/* Center Map */}
        <main className="order-1 flex h-[68vh] min-h-95 flex-col lg:order-2 lg:h-auto lg:min-h-0 lg:flex-1">
          <RouteControls
            mode={mode}
            hasStart={!!start}
            hasDestination={!!destination}
            routeData={routeData}
            reset={reset}
            onClick={setMode}
            generateRoute={generateRoute}
            isRouting={isRouting}
          />

          <MarsMapLoader
            mode={mode}
            startPosition={start}
            destinationPosition={destination}
            onClick={placePoint}
            activeLayer={activeLayer}
            routeData={routeData}
            scope={scope}
            showScientificTargets={showScientificTargets}
          />
        </main>

        <MissionPlan
          startPosition={start}
          destinationPosition={destination}
          routeData={routeData}
          isRouting={isRouting}
        />
      </div>
    </div>
  );
}
