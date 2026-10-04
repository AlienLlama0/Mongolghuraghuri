"use client";

import { createLucideIcon } from "./MapIcon";
import { useMapEvents, MapContainer, TileLayer, Marker, useMap} from "react-leaflet";
import { LatLngTuple } from "leaflet";
import { MapProps } from "./MarsMapLoader";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import { Crosshair, Pin } from "lucide";

function MapMoveHandler() {
  useMapEvents({
    mousemove(event) {
      console.log("Latitude:", event.latlng.lat);
      console.log("Longitude:", event.latlng.lng);
    },
  });

  return null;
}


function MapClickHandler({onClick}:{onClick:(p:LatLngTuple) => void}) {
  useMapEvents({
    click(event) {
      console.log("Latitude:", event.latlng.lat);
      console.log("Longitude:", event.latlng.lng);
      onClick([event.latlng.lat, event.latlng.lng])
    },
  });

  return null;
}

function MapCursor({ mode }: { mode: MapProps["mode"] }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    container.style.setProperty(
      "cursor",
      mode !== "pan" ? "crosshair" : "grab",
      "important"
    );
  }, [map, mode]);

  return null;
}

function DragCursorHandler({ mode }: { mode: MapProps["mode"] }) {
  useMapEvents({
    dragstart: (e) => {
      e.target.getContainer().style.cursor = 'grabbing';
    },
    dragend: (e) => {
      e.target.getContainer().style.cursor = mode !== "pan" ? "crosshair" : "grab";
    },
  });
  return null;
}


export default function MarsMap({onClick, startPosition, destinationPosition, mode}:MapProps) {
  console.log("MarsMap:", mode);

  const startIcon = createLucideIcon(); 
  const destinationIcon = createLucideIcon(false);

  return (
    <MapContainer
      center={[0, 0]}
      zoom={2}
      style={{
        height: "600px",
        width: "100%",
      }}
    >
      <MapCursor mode={mode}/>
      <DragCursorHandler mode={mode} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {
        startPosition ? <Marker position={startPosition} icon={startIcon}></Marker> : <div></div>
      }
      {
        destinationPosition ? <Marker position={destinationPosition} icon={destinationIcon}></Marker> : <div></div>
      }
      {
        mode !== "pan" && (      <MapClickHandler 
        onClick={onClick}
      />)
      }

    </MapContainer>
  );
}