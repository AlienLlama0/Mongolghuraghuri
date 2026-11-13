
"use client";

import { useState, useCallback } from "react";
import { LatLngTuple } from "leaflet";
import { dataLayers, LayerConfig } from "./sidebar";

interface SidebarProps {
  side?: "left" | "right";
  onLayerChange?: (layer: LayerConfig | null) => void;
  onScientificTargetsChange?: (enabled: boolean) => void;
  startPosition?: LatLngTuple | null;
  destinationPosition?: LatLngTuple | null;
}

export default function Sidebar({
  side = "left",
  onLayerChange,
  onScientificTargetsChange,
  startPosition = null,
  destinationPosition = null,
}: SidebarProps) {
  const [activeLayerId, setActiveLayerId] = useState<string>("terrain");
  const [showScientificTargets, setShowScientificTargets] = useState(true);

  const getAvailableLayers = useCallback((): LayerConfig[] => {
    return dataLayers.filter((layer) => layer.id !== "science-targets");
  }, []);

  const getActiveLayer = useCallback((): LayerConfig | null => {
    return dataLayers.find((l) => l.id === activeLayerId) || null;
  }, [activeLayerId]);

  const validateLayer = useCallback((layerId: string): boolean => {
    return dataLayers.some(
      (l) => l.id === layerId && l.id !== "science-targets"
    );
  }, []);

  const setActiveLayer = useCallback(
    (layerId: string) => {
      if (!validateLayer(layerId)) {
        console.warn("Unknown layer:", layerId);
        return;
      }

      setActiveLayerId(layerId);
      const layer = dataLayers.find((l) => l.id === layerId) ?? null;
      onLayerChange?.(layer);
    },
    [validateLayer, onLayerChange]
  );

  const handleLayerSelect = (layerId: string) => {
    setActiveLayer(layerId);
  };

  const handleScientificTargetsChange = (enabled: boolean) => {
    setShowScientificTargets(enabled);
    onScientificTargetsChange?.(enabled);
  };

  return (
    <aside className="panel-scroll order-2 border-line bg-panel lg:order-1 lg:w-76 lg:shrink-0 lg:overflow-y-auto lg:border-r flex flex-col h-full bg-[#1e293b] border-r border-slate-700 text-white">
      <div className="p-4 flex-1 overflow-y-auto">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">
          DATA LAYERS
        </h2>

        {/* Independent Scientific Targets overlay */}
        <div
          onClick={() => handleScientificTargetsChange(!showScientificTargets)}
          className={`mb-3 p-3 rounded-lg border cursor-pointer transition-all ${
            showScientificTargets
              ? "bg-slate-800/70 border-fuchsia-500/70"
              : "bg-slate-800/30 border-slate-700/50 hover:border-slate-500"
          }`}
        >
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={showScientificTargets}
              onChange={(event) =>
                handleScientificTargetsChange(event.target.checked)
              }
              onClick={(event) => event.stopPropagation()}
              className="mt-1 accent-fuchsia-500"
            />

            <div>
              <span className="text-sm font-medium">Scientific Targets</span>
              <p className="text-xs text-slate-400 mt-1">
                Show mission sites, scientific-interest locations, and
                candidate landing sites.
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Independent map overlay
              </p>
            </div>
          </div>
        </div>

        {/* Mutually exclusive base layers */}
        {getAvailableLayers().map((layer) => {
          const isActive = activeLayerId === layer.id;

          return (
            <div
              key={layer.id}
              onClick={() => handleLayerSelect(layer.id)}
              className={`mb-3 p-3 rounded-lg border cursor-pointer transition-all ${
                isActive
                  ? "bg-slate-800/70 border-orange-500/70 shadow-md"
                  : "bg-slate-800/30 border-slate-700/50 hover:border-slate-500"
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  readOnly
                  className="mt-1 accent-orange-500 pointer-events-none"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{layer.name}</span>
                    <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded">
                      {layer.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {layer.description}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {layer.later}
                  </p>

                  {isActive && (
                    <div className="mt-2 pt-2 border-t border-slate-600/50 text-[10px] text-slate-400 space-y-0.5">
                      <p>
                        <span className="text-slate-300">Appearance:</span>{" "}
                        {layer.appearance}
                      </p>
                      <p>
                        <span className="text-slate-300">Source:</span>{" "}
                        {layer.realDataSource}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-700 text-xs text-slate-400 flex justify-between">
        <span>STATUS: READY</span>
        <span>LAYER: {getActiveLayer()?.name || "—"}</span>
        <span>ROUTE: —</span>
      </div>
    </aside>
  );
}
