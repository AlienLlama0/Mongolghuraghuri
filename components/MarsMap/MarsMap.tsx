"use client";
import L from "leaflet";
import { createLucideIcon } from "./MapIcon";
import { useMapEvents, MapContainer, TileLayer, Marker, useMap} from "react-leaflet";
import { LatLngTuple } from "leaflet";
import { MapProps } from "./MarsMapLoader";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import { Crosshair, Pin } from "lucide";

const MarsEquirectangular = L.extend({}, L.CRS.EPSG4326, {
  code: "ESRI:104905",
});

const marsBounds = L.latLngBounds(
  [-90, -180],
  [90, 180]
);

function MapMoveHandler({ onPointerMove }: { onPointerMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    mousemove(event) {
      onPointerMove(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function normalizeLongitude(lon: number): number {
  return ((lon + 180) % 360 + 360) % 360 - 180;
}

function MapClickHandler({onClick}:{onClick:(p:LatLngTuple) => void}) {
  useMapEvents({
    click(event) {
      let lat = event.latlng.lat;
      let lng = event.latlng.lng;
      console.log("Lat", lat);
      console.log("Long", lng);

      if(lat < -90 || lat > 90){
        console.log("Invalid Latitude");
        return;
      }

      if(lng < -180 || lng > 180){
        console.log("Invalid Longitude");
        return;
      }

      onClick([
        event.latlng.lat,
        event.latlng.lng,
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
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  const startIcon = createLucideIcon(); 
  const destinationIcon = createLucideIcon(false);

  return (
    <div className="relative w-full h-[600px]">
      <MapContainer
        center={[0, 0]}
        zoom={2}
        minZoom={1}
        maxZoom={7}
        style={{
          height: "100%",
          width: "100%",
        }}
        crs={MarsEquirectangular}
        maxBounds={marsBounds}
        maxBoundsViscosity={1.0}
      >
        <MapCursor mode={mode}/>
        <DragCursorHandler mode={mode} />
        <MapMoveHandler onPointerMove={(lat, lng) => setCurrentCoords({ lat, lng })} />
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
          mode !== "pan" && (<MapClickHandler onClick={onClick}/>)
        }
      </MapContainer>

      <div className="absolute bottom-3 right-3 z-[1000] rounded bg-slate-900/80 px-3 py-1.5 font-mono text-xs text-white backdrop-blur border border-slate-700 pointer-events-none shadow-lg">
        {currentCoords ? (
          <span>
            Lat: {currentCoords.lat.toFixed(4)}° | Lng: {currentCoords.lng.toFixed(4)}°
          </span>
        ) : (
          <span>Lat: — | Lng: —</span>
        )}
      </div>
    </div>
  );
}