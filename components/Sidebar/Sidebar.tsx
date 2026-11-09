"use client"

interface SidebarProps{
  side?:"left"|"right";
}

export default function Sidebar({side="left"}:SidebarProps){
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