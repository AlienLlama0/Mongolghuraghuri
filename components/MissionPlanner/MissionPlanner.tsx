"use client"

import { useState, useCallback } from "react"
import { LatLngTuple } from "leaflet"
import { InteractionMode } from "@/types/ MarsMap"
import Header from "../Header/Header"
import RouteControls from "../RouteControls/RouteControls"
import Sidebar from "../Sidebar/Sidebar"
import MarsMapLoader from "../MarsMap/MarsMapLoader"

export default function MissionPlanner(){
    const [mode, setMode] = useState<InteractionMode>("pan")
    const [start, setStart] = useState<LatLngTuple | null>(null);
    const [destination, setdestination] = useState<LatLngTuple | null>(null);


  const placePoint = useCallback(
    (c:LatLngTuple) => {
      if (mode === "start") setStart(c);
      if (mode === "destination") setdestination(c);
      setMode("pan");
    },
    [mode],
  );
    return(
        <div className="flex min-h-dvh flex-col lg:h-dvh">
            <Header />
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <Sidebar side="left" />
                <main className="order-1 flex h-[68vh] min-h-95 flex-col lg:order-2 lg:h-auto lg:min-h-0 lg:flex-1">
                    <RouteControls 
                        mode={mode}
                        hasStart={!!start}
                        hasDestination={!!destination}
                        hasRoute={false}
                        onClick={setMode}
                    />
                    <MarsMapLoader
                        mode={mode}
                        startPosition={start}
                        destinationPosition={destination}
                        onClick={placePoint}
                    />
                </main>

                <Sidebar side="right" />
            </div>
        </div>
    )
}