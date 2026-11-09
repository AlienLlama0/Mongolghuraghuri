export function MissionPlan(){
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