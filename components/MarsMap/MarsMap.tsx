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
import { useEffect } from "react";

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

export default function MarsMap({
  onClick,
  startPosition,
  destinationPosition,
  mode,
  activeLayer,
  hasRoute = false,
}: MapProps) {
  const startIcon = createLucideIcon();
  const destinationIcon = createLucideIcon(false);

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
          style={{ height: "100%", width: "100%" }}
          crs={MarsCRS}
        >
          <MapCursor mode={mode} />
          <DragCursorHandler mode={mode} />

          <TileLayer
            key={layerId}
            url={tileUrl}
            noWrap={true}
            attribution="NASA / JPL / USGS"
          />

          {/* Start Marker */}
          {startPosition && (
            <Marker position={startPosition} icon={startIcon} />
          )}

          {/* Destination Marker */}
          {destinationPosition && (
            <Marker position={destinationPosition} icon={destinationIcon} />
          )}

          {/* Route Path (orange dashed line) */}
          {hasRoute && startPosition && destinationPosition && (
            <Polyline
              positions={[startPosition, destinationPosition]}
              pathOptions={{
                color: "#f97316", // orange
                weight: 4,
                opacity: 0.9,
                dashArray: "10, 10",
              }}
            />
          )}

          {mode !== "pan" && <MapClickHandler onClick={onClick} />}
        </MapContainer>
      </div>
    </div>
  );
}