import { LatLngTuple } from "leaflet"

export type Position = LatLngTuple | [];
export type InteractionMode = "start" | "destination" | "pan";