"use client"

interface SidebarProps{
  side?:"left"|"right";
}

export default function Sidebar({side="left"}:SidebarProps){

  if(side=="right"){
    return (
      <aside className="panel-scroll order-2 border-line bg-panel lg:order-3 lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-l flex flex-col h-full bg-[#1e293b] border-l border-slate-700 text-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-300 tracking-wide">
            MISSION PLAN
          </h2>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* START */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              <span className="text-sm font-medium">START</span>
            </div>
            <p className="text-xs text-slate-400 ml-4 leading-relaxed">
              Choose Set start, then click the map.
            </p>
          </div>

          {/* DESTINATION */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="text-sm font-medium">DESTINATION</span>
            </div>
            <p className="text-xs text-slate-400 ml-4 leading-relaxed">
              Choose Set destination, then click the map.
            </p>
          </div>

          {/* ROUTE */}
          <div className="mt-auto">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">ROUTE</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Place a start and destination to plan a Marswalk.
              Use Example points for a ready-made traverse
              across the crater region.
            </p>
          </div>
        </div>
      </aside>
    );
  }


  return(
        <aside className="panel-scroll order-2 border-line bg-panel lg:order-1 lg:w-76 lg:shrink-0 lg:overflow-y-auto lg:border-r">

        {/* Data Layers */}
      <div className="p-4 flex-1 overflow-y-auto">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">DATA LAYERS</h2>



        {/* Terrain */}
        <div className="mb-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="mt-1 accent-orange-500"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Terrain</span>
                <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded">
                  Simulated
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Shaded-relief surface basemap
              </p>
              <p className="text-[10px] text-slate-500">
                Later: MOLA MEGDR / HRSC blended DEM
              </p>
            </div>
          </label>
        </div>



        {/* Elevation */}
        <div className="mb-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" className="mt-1 accent-orange-500" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Elevation</span>
                <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded">
                  Simulated
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Colour-coded relative elevation with 10 m contours
              </p>
              <p className="text-[10px] text-slate-500">
                Later: MOLA topography, CTX stereo DTM
              </p>
            </div>
          </label>
        </div>



        {/* Terrain difficulty */}
        <div className="mb-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="mt-1 accent-orange-500"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Terrain difficulty</span>
                <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded">
                  Simulated
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Slope, roughness and hazard classes used for routing
              </p>
              <p className="text-[10px] text-slate-500">
                Later: DTM slope + HiRISE rock abundance
              </p>
            </div>
          </label>
        </div>



        {/* CTX */}
        <div className="mb-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" className="mt-1 accent-orange-500" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">CTX</span>
                <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded">
                  Simulated
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Context Camera-style regional imagery
              </p>
              <p className="text-[10px] text-slate-500">
                Later: MRO CTX global mosaic (~5–6 m/px)
              </p>
            </div>
          </label>
        </div>


        {/* HiRISE */}
        <div className="mb-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" className="mt-1 accent-orange-500" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">HiRISE</span>
                <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded">
                  Simulated
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                High-resolution strip over the crater and scarp
              </p>
              <p className="text-[10px] text-slate-500">
                Later: MRO HiRISE RDR products via PDS (~0.25–0.5 m/px)
              </p>
            </div>
          </label>
        </div>


        <div className="mb-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" className="mt-1 accent-orange-500" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Science Targets</span>
                <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded">
                  Sample
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Example points of scientific interest
              </p>
              <p className="text-[10px] text-slate-500">
                Later: Science team target lists, CRISM detections
              </p>
            </div>
          </label>
        </div>


      </div>
        


        {/* Bottom Status Bar */}
      <div className="p-3 border-t border-slate-700 text-xs text-slate-400 flex justify-between">
        <span>STATUS: READY</span>
        <span>TERRAIN: —</span>
        <span>ROUTE: —</span>
      </div>

        </aside>
    )
}