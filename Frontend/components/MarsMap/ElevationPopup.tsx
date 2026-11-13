
"use client";

import ElevationProfile from "./ElevationProfile";
import { RoutePoint } from "@/types/MarsMap";

interface Props {
  route: RoutePoint[];
  open: boolean;
  onClose: () => void;
}

export default function ElevationPopup({
  route,
  open,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="elevation-popup-title"
        className="flex max-h-[90%] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0a1020] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h2 id="elevation-popup-title" className="font-bold text-white">
              Elevation Profile
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Terrain elevation along the generated route
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close elevation profile"
            className="flex h-8 w-8 items-center justify-center rounded-md text-xl text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-5">
          <ElevationProfile route={route} />
        </div>

        <footer className="border-t border-slate-700 px-5 py-3">
          <p className="text-xs text-slate-500">
            MOLA elevation is approximately 463 m/pixel and does not
            represent astronaut-scale obstacles.
          </p>
        </footer>
      </section>
    </div>
  );
}
