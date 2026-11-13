import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { LocateFixed } from 'lucide';

// Helper function to convert a Lucide icon into a Leaflet DivIcon
export const createLucideIcon = (isStart = true) => {
  return L.divIcon({
    html: renderToString(
    <div
      className="pointer-events-none absolute"
      style={{transform: "translate(-50%, -50%)" }}
      aria-hidden
    >
      <div
        className={`h-4 w-4 rounded-full border-2 border-white shadow-[0_0_0_3px_rgba(5,9,18,0.7)] ${
          isStart ? "bg-go" : "bg-stop"
        }`}
      />
      <div
        className={`absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded-sm px-1.5 py-px font-[family-name:var(--font-condensed)] text-[10px] font-semibold tracking-[0.12em] text-[#06101c] ${
          isStart ? "bg-go" : "bg-stop"
        }`}
      >
        {isStart ? "START" : "DESTINATION"}
      </div>
    </div>
    ),
    className: 'lucide lucide-locate-fixed preview-icon', // Clear default background styling
    iconSize: [100, 100],              // Set dimensions
    iconAnchor: [0, 0],            // Point of the icon that corresponds to marker's location
    popupAnchor: [0, -32],           // Point from which the popup should open relative to the iconAnchor
  });
};
