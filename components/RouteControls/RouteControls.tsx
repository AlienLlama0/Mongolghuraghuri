import { Flag, MapPin } from "lucide-react";
import { InteractionMode } from "@/types/ MarsMap"
import ControlButton from "./ControlButton"

interface Props{
  mode: InteractionMode
  hasStart: boolean,
  hasDestination: boolean,
  hasRoute: boolean,
  onClick:(v:InteractionMode)=>void
}

const RouteControls = ({onClick, mode, hasStart, hasDestination, hasRoute}:Props) => {
  const next = !hasStart ? "start" : !hasDestination ? "destination" : !hasRoute ? "generate" : null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2">
      <ControlButton 
        active={mode === "start"}
        emphasis={"start" === next}
        onClick={()=>onClick("start")}
        icon={<MapPin size={14} className="text-go" />}
        children={"Set Starting Position"}
      />
      <ControlButton 
        active={mode === "destination"}
        emphasis={"destination" === next}
        onClick={()=>onClick("destination")}
        icon={<Flag size={14} className="text-stop" />}
        children={"Set Destination Position"}
      />
    </div>
  )
}

export default RouteControls