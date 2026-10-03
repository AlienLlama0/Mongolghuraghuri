"use client";

import { useMapEvents } from "react-leaflet";
import { MapContainer, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

function MapClickHandler() {
  useMapEvents({
    mousemove(event) {
      console.log("Latitude:", event.latlng.lat);
      console.log("Longitude:", event.latlng.lng);
    },
  });

  return null;
}

export default function MarsMap() {
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

      <MapClickHandler />
    </MapContainer>
  );
}