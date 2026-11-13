
"use client";

import L from "leaflet";
import { createLucideIcon } from "./MapIcon";

import {
  useMapEvents,
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Rectangle,
  useMap,
  Popup,
  CircleMarker
} from "react-leaflet";
import {
  scientificTargets,
  toMapLongitude,
} from "@/data/scientificTargets";
import { LatLngTuple } from "leaflet";
import { MapProps } from "./MarsMapLoader";
import "leaflet/dist/leaflet.css";

import { useState, useEffect, useMemo } from "react";
import { RoutePoint } from "@/types/MarsMap";
import { useErrorToast } from "../ErrorMessage";

import ElevationPopup from "./ElevationPopup";

type SelectedRoutePoint = {
  index: number;
  coordinates: RoutePoint;
};

const MarsEquirectangular = L.extend({}, L.CRS.EPSG4326, {
  code: "ESRI:104905",
});

const marsBounds = L.latLngBounds(
  [-90, -180],
  [90, 180]
);

// Actual viewing area: focused around Jezero Crater.
// Approximate display bounds, not the CTX DEM footprint.
const jezeroViewBounds = L.latLngBounds(
  [18.25, 77.35],
  [18.65, 77.70]
);

// Full CTX DEM coverage, used for data availability.
const ctxCoverageBounds = L.latLngBounds(
  [17.58052, 76.997437],
  [19.290187, 78.582563]
);

function MapMoveHandler({
  onPointerMove,
}: {
  onPointerMove: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    mousemove(event) {
      onPointerMove(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

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

function MapCursor({
  mode,
}: {
  mode: MapProps["mode"];
}) {
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

function DragCursorHandler({
  mode,
}: {
  mode: MapProps["mode"];
}) {
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

function RouteAutoFit({
  routeCoordinates,
  scope,
}: {
  routeCoordinates: LatLngTuple[];
  scope: MapScope;
}) {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates.length === 0) return;

    const bounds = L.latLngBounds(routeCoordinates);

    map.fitBounds(bounds, {
      padding: [48, 48],
      maxZoom: scope === "jezero" ? 7 : 5,
      animate: true,
      duration: 1,
    });
  }, [map, routeCoordinates, scope]);

  return null;
}
  type MapScope = "jezero" | "global";


function MapViewport({ scope }: { scope: MapScope }) {
  const map = useMap();

  useEffect(() => {
    if (scope === "jezero") {
      map.setMaxBounds(jezeroViewBounds);

      const minZoom = map.getBoundsZoom(
        jezeroViewBounds,
        false,
        L.point([25, 25])
      );

      map.setMinZoom(minZoom);

      map.fitBounds(jezeroViewBounds, {
        padding: [25, 25],
        animate: true,
        duration: 1,
      });
    } else {
      map.setMaxBounds(marsBounds);
      map.setMinZoom(1);

      map.setView([0, 0], 2, {
        animate: true,
        duration: 1,
      });
    }
  }, [map, scope]);

  return null;
}


export default function MarsMap({
  onClick,
  startPosition,
  destinationPosition,
  mode,
  activeLayer,
  routeData,
  scope,
  showScientificTargets,
}: MapProps) {
  const [currentCoords, setCurrentCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [selectedRoutePoint, setSelectedRoutePoint] =
    useState<SelectedRoutePoint | null>(null);

  // Elevation popup visibility
  const [isElevationOpen, setIsElevationOpen] =
    useState(false);

  function mapDistance(
    clicked: L.LatLng,
    point: LatLngTuple
  ) {
    return clicked.distanceTo(
      L.latLng(point[0], point[1])
    );
  }

  const startIcon = createLucideIcon();
  const destinationIcon = createLucideIcon(false);

  // Convert API coordinates into Leaflet coordinates.
  const routeCoordinates = useMemo<LatLngTuple[]>(
    () =>
      routeData?.route?.map((point) => [
        point.latitude,
        point.longitude,
      ]) ?? [],
    [routeData?.route]
  );

  const isPartialRoute = routeData?.status === "partial";

  const hasRelaxedSections =
    routeData?.status === "success_with_relaxed_sections";

const [isScienceLegendOpen, setIsScienceLegendOpen] =
  useState(false);

  function MapClickHandler({
    onClick,
  }: {
    onClick: (p: LatLngTuple) => void;
  }) {
    useMapEvents({
      click(event) {
        const lat = event.latlng.lat;
        const lng = event.latlng.lng;

        if (
          lng < -180 ||
          lng > 180 ||
          lat < -90 ||
          lat > 90
        ) {
          return;
        }

        onClick([lat, lng]);
      },
    });

    return null;
  }
  const layerId = activeLayer?.id || "terrain";
  const isScienceTargetsLayer = layerId === "science-targets";
  const tileUrl = isScienceTargetsLayer
    ? LAYER_TILES.terrain
    : LAYER_TILES[layerId] || LAYER_TILES.terrain;
  const filter = isScienceTargetsLayer
  ? "none"
  : LAYER_FILTERS[layerId] || "none";

  useEffect(() => {
    if (!showScientificTargets) {
      setIsScienceLegendOpen(false);
    }
  }, [showScientificTargets]);


  // Close popup and clear inspection when route changes.
  useEffect(() => {
    setIsElevationOpen(false);
    setSelectedRoutePoint(null);
  }, [routeData]);

  const hasRoute = routeCoordinates.length > 0;

  return (
    <div
      style={{
        position: "relative",
        height: "600px",
        width: "100%",
      }}
    >
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

      {/* Route Status */}
      {routeData && (
        <div
          className="absolute top-12 left-[60px] z-[1000] rounded px-3 py-1.5 text-xs font-semibold text-white"
          style={{
            background: isPartialRoute
              ? "#991b1b"
              : hasRelaxedSections
                ? "#92400e"
                : "#075985",
          }}
        >
          {isPartialRoute
            ? "Partial Route"
            : hasRelaxedSections
              ? "Route Calculated — Slope Relaxed"
              : "V9 Route Calculated"}
        </div>
      )}

      {/* Map Filter */}
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
          <MapViewport scope={scope} />
          <MapCursor mode={mode} />
          <DragCursorHandler mode={mode} />

          <RouteAutoFit
            routeCoordinates={routeCoordinates}
            scope={scope}
          />

          <MapMoveHandler
            onPointerMove={(lat, lng) =>
              setCurrentCoords({ lat, lng })
            }
          />

          <TileLayer
            key={layerId}
            url={tileUrl}
            noWrap={true}
            attribution="NASA / JPL / USGS"
          />
          {scope === "jezero" && (
            <Rectangle
              bounds={ctxCoverageBounds}
              pathOptions={{
                color: "#22d3ee",
                weight: 2,
                opacity: 0.9,
                fillColor: "#22d3ee",
                fillOpacity: 0.08,
                dashArray: "6 5",
              }}
            />
          )}
          {showScientificTargets &&
            scientificTargets
              .filter((target) =>
                scope === "global"
                  ? true
                  : ctxCoverageBounds.contains([
                      target.latitude,
                      toMapLongitude(target.longitudeEast),
                    ])
              )
              .map((target) => {
              const color =
                target.category === "mission"
                  ? "#F8FAFC"
                  : target.category === "candidate"
                    ? "#A3E635"
                    : "#E879F9";
                return (
                  <CircleMarker
                    key={target.id}
                    center={[
                      target.latitude,
                      toMapLongitude(target.longitudeEast),
                    ]}
                    radius={7}
                    pathOptions={{
                      color: "#0F172A",
                      fillColor: color,
                      fillOpacity: 1,
                      weight: 2.5,
                    }}
                  >
                    <Popup>
                      <div className="min-w-[190px] space-y-2">
                        <strong>{target.name}</strong>

                        <div className="text-xs">
                          <span className="font-semibold">
                            {target.category === "mission"
                              ? "NASA Mission Site"
                              : target.category === "candidate"
                                ? "Candidate Landing Site"
                                : "Scientific Interest"}
                          </span>
                        </div>

                        <p className="text-xs">
                          {target.description}
                        </p>

                        {target.mission && (
                          <p className="text-xs">
                            {target.mission} · {target.year}
                          </p>
                        )}

                        <p className="text-xs">
                          {target.latitude.toFixed(4)}°,
                          {" "}
                          {toMapLongitude(target.longitudeEast).toFixed(4)}°
                        </p>

                        <a
                          href={target.source}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 underline"
                        >
                          Source / Learn more
                        </a>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
          {startPosition && (
            <Marker
              position={startPosition}
              icon={startIcon}
            />
          )}

          {destinationPosition && (
            <Marker
              position={destinationPosition}
              icon={destinationIcon}
            />
          )}

          {mode !== "pan" && (
            <MapClickHandler onClick={onClick} />
          )}

          {/* V9 Route */}
          {routeCoordinates.length > 0 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: isPartialRoute
                  ? "#ef4444"
                  : hasRelaxedSections
                    ? "#f59e0b"
                    : "#38bdf8",
                weight: 4,
                opacity: 0.9,
                dashArray: isPartialRoute ? "8 8" : undefined,
              }}
              eventHandlers={{
                click(event) {
                  const clickedPoint = event.latlng;

                  let closestIndex = 0;
                  let closestDistance = Infinity;

                  routeCoordinates.forEach((point, index) => {
                    const distance = mapDistance(
                      clickedPoint,
                      point
                    );

                    if (distance < closestDistance) {
                      closestDistance = distance;
                      closestIndex = index;
                    }
                  });

                  setSelectedRoutePoint({
                    index: closestIndex,
                    coordinates: routeData!.route[closestIndex],
                  });
                },
              }}
            />
          )}
        </MapContainer>
        {layerId === "science-targets" && (
          <button
            type="button"
            onClick={() =>
              setIsScienceLegendOpen((previous) => !previous)
            }
            className="absolute bottom-16 right-3 z-[1000] flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-950/95 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur hover:bg-slate-800"
          >
            <span className="text-fuchsia-400">◎</span>
            Map Legend
          </button>
        )}
      </div>

      {/* Live Coordinates */}
      <div className="absolute bottom-3 right-3 z-[1000] rounded bg-slate-900/80 px-3 py-1.5 font-mono text-xs text-white backdrop-blur border border-slate-700 pointer-events-none shadow-lg">
        {currentCoords ? (
          <span>
            Lat: {currentCoords.lat.toFixed(4)}° | Lng:{" "}
            {currentCoords.lng.toFixed(4)}°
          </span>
        ) : (
          <span>Lat: — | Lng: —</span>
        )}
      </div>
      {showScientificTargets && isScienceLegendOpen && (
        <div className="absolute bottom-28 right-3 z-[1001] w-64 rounded-xl border border-slate-600 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Scientific Targets
            </h3>

            <button
              type="button"
              onClick={() => setIsScienceLegendOpen(false)}
              className="text-slate-400 hover:text-white"
              aria-label="Close map legend"
            >
              ✕
            </button>
          </div>

          <p className="mb-3 text-xs leading-relaxed text-slate-400">
            Explore historical mission sites and scientifically
            interesting locations across Mars.
          </p>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full border border-slate-900 bg-slate-50" />
              NASA mission sites
            </div>

            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full border border-slate-900 bg-fuchsia-400" />
              Scientific-interest sites
            </div>

            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full border border-slate-900 bg-lime-400" />
              Candidate landing sites
            </div>
          </div>

          <div className="mt-4 border-t border-slate-700 pt-3 text-[10px] text-slate-500">
            Select a map marker to view its description and source.
          </div>
        </div>
      )}

      {/* Elevation Profile Button */}
      {hasRoute && (
        <button
          type="button"
          onClick={() => setIsElevationOpen(true)}
          className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-slate-900/95 px-4 py-2.5 text-sm font-semibold text-cyan-300 shadow-lg backdrop-blur transition hover:border-cyan-400 hover:bg-slate-800"
        >
          <span aria-hidden="true">⌁</span>
          Elevation Profile
        </button>
      )}

      {/* Separate Elevation Popup Component */}
      {hasRoute && (
        <ElevationPopup
          route={routeData!.route}
          open={isElevationOpen}
          onClose={() => setIsElevationOpen(false)}
        />
      )}
    </div>
  );
}
