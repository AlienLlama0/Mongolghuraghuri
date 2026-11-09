import { LatLngTuple } from "leaflet";
import { LayerConfig } from "./sidebar";

interface RightSidebarProps {
  startPosition?: LatLngTuple | null;
  destinationPosition?: LatLngTuple | null;
}

export function MissionPlan({
  startPosition = null,
  destinationPosition = null,
}: RightSidebarProps){

  function formatCoord(value: number, isLat: boolean) {
    const abs = Math.abs(value).toFixed(4);
    if (isLat) {
      return `${abs}°${value >= 0 ? "N" : "S"}`;
    }
    return `${abs}°${value >= 0 ? "E" : "W"}`;
  }
  
    return (
      <aside className="panel-scroll order-2 border-line bg-panel lg:order-3 lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-l flex flex-col h-full bg-[#1e293b] border-l border-slate-700 text-white">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-300 tracking-wide">
            MISSION PLAN
          </h2>
        </div>

        <div className="p-4 flex-1 flex flex-col">
          {/* START */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              <span className="text-sm font-medium">START</span>
            </div>

            {startPosition ? (
              <div className="ml-4 text-xs space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-200 font-medium">
                    {formatCoord(startPosition[0], true)}
                  </span>
                  <span className="text-slate-400">Elev.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-200 font-medium">
                    {formatCoord(startPosition[1], false)}
                  </span>
                  <span className="text-slate-400">— m</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 ml-4">
                Choose Set start, then click the map.
              </p>
            )}
          </div>

          {/* DESTINATION */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="text-sm font-medium">DESTINATION</span>
            </div>

            {destinationPosition ? (
              <div className="ml-4 text-xs space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-200 font-medium">
                    {formatCoord(destinationPosition[0], true)}
                  </span>
                  <span className="text-slate-400">Elev.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-200 font-medium">
                    {formatCoord(destinationPosition[1], false)}
                  </span>
                  <span className="text-slate-400">— m</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 ml-4">
                Choose Set destination, then click the map.
              </p>
            )}
          </div>

          {/* ROUTE */}
          <div className="mt-auto">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">ROUTE</h3>
            {startPosition && destinationPosition ? (
              <p className="text-xs text-slate-300 leading-relaxed">
                Start and destination are set.
                <br />
                Ready to plan a Marswalk.
              </p>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed">
                Place a start and destination to plan a Marswalk.
                Use Example points for a ready-made traverse
                across the crater region.
              </p>
            )}
          </div>
        </div>
      </aside>
    );
}