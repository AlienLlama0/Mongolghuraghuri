"use client";
import { createLucideIcon } from "./MapIcon";
import { useMapEvents, MapContainer, TileLayer, Marker } from "react-leaflet";
import { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { Pin } from "lucide";

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

export default function MarsMap() {
  const [position, setPosition] = useState<LatLngTuple | null>(null);
  const pinIcon = createLucideIcon('#3b82f6'); 

  return (
    <MapContainer
      center={[0, 0]}
      zoom={2}
      style={{
        height: "600px",
        width: "100%",
      }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {
        position ? <Marker position={position} icon={pinIcon}></Marker> : <div></div>
      }
      
      <MapClickHandler 
        onClick={setPosition}
      />
    </MapContainer>
  );
}