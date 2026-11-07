"use client";

import { Flag, MapPin, Route } from "lucide-react";
import { InteractionMode } from "@/types/MarsMap";
import ControlButton from "./ControlButton";

interface Props {
  mode: InteractionMode;
  hasStart: boolean;
  hasDestination: boolean;
  hasRoute: boolean;
  onClick: (v: InteractionMode) => void;
  onGenerateRoute?: () => void; // new prop
}

const RouteControls = ({
  onClick,
  mode,
  hasStart,
  hasDestination,
  hasRoute,
  onGenerateRoute,
}: Props) => {
  const next = !hasStart
    ? "start"
    : !hasDestination
    ? "destination"
    : !hasRoute
    ? "generate"
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2">
      {/* Set Starting Position */}
      <ControlButton
        active={mode === "start"}
        emphasis={"start" === next}
        onClick={() => onClick("start")}
        icon={<MapPin size={14} className="text-go" />}
      >
        Set Starting Position
      </ControlButton>

      {/* Set Destination Position */}
      <ControlButton
        active={mode === "destination"}
        emphasis={"destination" === next}
        onClick={() => onClick("destination")}
        icon={<Flag size={14} className="text-stop" />}
      >
        Set Destination Position
      </ControlButton>


    </div>
  );
};

export default RouteControls;