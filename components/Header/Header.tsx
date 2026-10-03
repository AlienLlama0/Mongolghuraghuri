export default function Header(){
    return(
      <header className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line bg-panel px-4 py-2.5">
        <div>
          <h1 className="font-condensed text-[15px] font-semibold tracking-[0.14em] sm:text-[17px] sm:tracking-[0.16em] text-ink">
            MARS MISSION PLANNER
          </h1>
          <p className="text-[12px] text-muted">Interplanetary Survival Guide: Martian Map</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-condensed text-[12px] tracking-[0.08em] text-muted">
          <span>
            MISSION: <span className="font-semibold text-ink">DEMO-001</span>
          </span>
          <span>
            REGION: <span className="font-semibold text-ink">"Demo"</span>
          </span>
        </div>
        <span className="ml-auto rounded border border-caution/40 px-2 py-0.5 text-[11px] font-medium text-caution">
          "Demo"
        </span>
      </header>
    )
}