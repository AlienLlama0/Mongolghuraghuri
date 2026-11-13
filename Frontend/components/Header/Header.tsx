
"use client";

type PlanningScope = "jezero" | "global";

interface HeaderProps {
  scope: PlanningScope;
  onScopeChange: (scope: PlanningScope) => void;
  isRouting: boolean;
  hasRoute: boolean;
}

export default function Header({
  scope,
  onScopeChange,
  isRouting,
  hasRoute,
}: HeaderProps) {
  const regionName =
    scope === "jezero" ? "Jezero Crater" : "Global Mars";

  const status = isRouting
    ? "CALCULATING"
    : hasRoute
      ? "ROUTE GENERATED"
      : "READY";

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line bg-panel px-4 py-3">
      {/* Project title */}
      <div>
        <h1 className="font-condensed text-[15px] font-semibold tracking-[0.14em] text-ink sm:text-[17px] sm:tracking-[0.16em]">
          MONGOL GHURA GHURI
        </h1>
        <p className="text-[12px] text-muted">
          Interplanetary Survival Guide: Martian Map
        </p>
      </div>

      {/* Mission information */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-condensed text-[12px] tracking-[0.08em] text-muted">
        <span>
          MISSION:{" "}
          <span className="font-semibold text-ink">DEMO-001</span>
        </span>

        {/* Region selector */}
        <div className="flex items-center gap-2">
          <span>REGION:</span>

          <select
            value={scope}
            onChange={(event) =>
              onScopeChange(event.target.value as PlanningScope)
            }
            disabled={isRouting}
            className="rounded border border-line bg-raised px-2 py-1 font-semibold text-ink outline-none focus:border-cyan-400 disabled:opacity-50"
          >
            <option value="jezero">Jezero Crater</option>
            <option value="global">Global Mars</option>
          </select>
        </div>
      </div>

      {/* Status */}
      <span
        className={`ml-auto rounded border px-2 py-1 text-[11px] font-medium ${
          isRouting
            ? "border-caution/40 text-caution"
            : hasRoute
              ? "border-cyan-400/40 text-cyan-400"
              : "border-line text-muted"
        }`}
      >
        {status}
      </span>
    </header>
  );
}
