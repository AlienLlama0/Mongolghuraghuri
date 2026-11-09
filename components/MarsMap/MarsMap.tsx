"use client";

import L from "leaflet";
import { createLucideIcon } from "./MapIcon";
import {
  useMapEvents,
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import { LatLngTuple } from "leaflet";
import { MapProps } from "./MarsMapLoader";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";

import { useErrorToast } from "../ErrorMessage";

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
const MarsCRS = L.extend({}, L.CRS.Simple, {
  projection: L.Projection.LonLat,
  transformation: new L.Transformation(1 / 360, 0.5, -1 / 360, 0.25),
  scale(zoom: number) {
    return 512 * Math.pow(2, zoom);
  },
  infinite: false,
});

// Real NASA Trek tile sources
const LAYER_TILES: Record<string, string> = {
  terrain:
    "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",

  elevation:
    "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",

  "terrain-difficulty":
    "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",

  ctx:
    "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",

  hirise:
    "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",

  "science-targets":
    "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
};

// Strong visual differences
const LAYER_FILTERS: Record<string, string> = {
  terrain: "none",
  elevation: "saturate(1.8) contrast(1.25) hue-rotate(-15deg)",
  "terrain-difficulty":
    "grayscale(0.4) contrast(1.6) brightness(0.85) sepia(0.4)",
  ctx: "grayscale(1) contrast(1.3) brightness(1.1)",
  hirise: "contrast(1.7) brightness(1.15) saturate(0.5)",
  "science-targets": "none",
};

function MapClickHandler({ onClick }: { onClick: (p: LatLngTuple) => void }) {
  useMapEvents({
    click(event) {
      const marsLongitude =
        event.latlng.lng < 0 ? event.latlng.lng + 360 : event.latlng.lng;
      onClick([event.latlng.lat, marsLongitude]);
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
      e.target.getContainer().style.cursor = "grabbing";
    },
    dragend: (e) => {
      e.target.getContainer().style.cursor =
        mode !== "pan" ? "crosshair" : "grab";
    },
  });
  return null;
}

export default function MarsMap({onClick, startPosition, destinationPosition, mode, activeLayer, hasRoute = false}:MapProps) {
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  const startIcon = createLucideIcon(); 
  const destinationIcon = createLucideIcon(false);

  const {showError} = useErrorToast();

  function MapClickHandler({onClick}:{onClick:(p:LatLngTuple) => void}) {
    useMapEvents({
      click(event) {
        let lat = event.latlng.lat;
        let lng = event.latlng.lng;
        console.log("Lat", lat);
        console.log("Long", lng);

        if((lng < -180 || lng > 180) || (lat < -90 || lat > 90)){
          showError("Invalid Position! Select any position inside the map.");
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

  const layerId = activeLayer?.id || "terrain";
  const tileUrl = LAYER_TILES[layerId] || LAYER_TILES["terrain"];
  const filter = LAYER_FILTERS[layerId] || "none";

  return (
    <div style={{ position: "relative", height: "600px", width: "100%" }}>

      {/* Active Layer Badge */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 60,
          zIndex: 1000,
          background: "rgba(15, 23, 42, 0.9)",
          color: "white",
          padding: "6px 14px",
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: 600,
          border: "1px solid #475569",
        }}
      >
        Active Layer: {activeLayer?.name || "Terrain"}
      </div>

      {/* Filter wrapper */}
      <div
        style={{
          height: "100%",
          width: "100%",
          filter: filter,
        }}
      >
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
          key={layerId}
          url={tileUrl}
          noWrap={true}
          attribution="NASA / JPL / USGS"
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

        {startPosition && destinationPosition && (
          <Polyline
            positions={[startPosition, destinationPosition]}
            pathOptions={{
              color: "#38bdf8",
              weight: 4,
            }}
          />
        )}
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
    </div>
  );
}