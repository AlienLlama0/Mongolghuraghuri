"use client";
import L from "leaflet";
import { createLucideIcon } from "./MapIcon";
import { useMapEvents, MapContainer, TileLayer, Marker, useMap} from "react-leaflet";
import { LatLngTuple } from "leaflet";
import { MapProps } from "./MarsMapLoader";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import { Crosshair, Pin } from "lucide";

const MarsCRS = L.extend({}, L.CRS.Simple, {
  projection: L.Projection.LonLat,

  transformation: new L.Transformation(
    1 / 360,
    0.5,
    -1 / 360,
    0.25
  ),

  scale(zoom: number) {
    return 512 * Math.pow(2, zoom);
  },

  infinite: false,
});

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
      const marsLongitude =
      event.latlng.lng < 0
      ? event.latlng.lng + 360
      : event.latlng.lng;
      
      console.log("Latitude:", event.latlng.lat);
      console.log("Longitude:", marsLongitude);
      onClick([
        event.latlng.lat,
        marsLongitude,
      ]);
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
      crs={MarsCRS}
    >
      <MapCursor mode={mode}/>
      <DragCursorHandler mode={mode} />
      <TileLayer
        url="https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg"
        noWrap={true}
        
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