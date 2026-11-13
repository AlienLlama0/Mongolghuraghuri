export interface LayerConfig{
    id : string;
    name : string;
    badge : string;
    description : string;
    later : string ;
    defaultChecked : boolean;
    type : "basemap" | "overlay" | "analysis" | "points"; 
    appearance : string;
    realDataSource : string;
    interaction : string;
}


export const dataLayers : LayerConfig[]=[
    {
        id : "terrain",
        name : "Terrain",
        badge : "Simulated",
        description :"Shaded-relief surface basemap",
        later : "Later : MOLA MEGDR / HRSC blended DEM",
        defaultChecked: true,
        type : "basemap",
        appearance: "Color or grayscale hillshade showing craters, valleys and mountains",
        realDataSource: "NASA Mars Trek – MOLA/HRSC Color Hillshade Blend (WMTS)",
        interaction: "Zoom, pan and inspect large-scale surface features",

    },

    {
    id: "elevation",
    name: "Elevation",
    badge: "Simulated",
    description: "Colour-coded relative elevation with 10 m contours",
    later: "Later: MOLA topography, CTX stereo DTM",
    defaultChecked: false,
    type: "basemap",
    appearance: "Blue (low) → yellow/red (high) elevation colors + legend in meters",
    realDataSource: "USGS/NASA MGS MOLA DEM 463m (and higher-res stereo where available)",
    interaction: "Click a location to read elevation value (when raster is queryable)",
  },
  {
    id: "terrain-difficulty",
    name: "Terrain difficulty",
    badge: "Simulated",
    description: "Slope, roughness and hazard classes used for routing",
    later: "Later: DTM slope + HiRISE rock abundance",
    defaultChecked: false,
    type: "analysis",
    appearance: "Colored classification of easier vs steeper / rougher ground",
    realDataSource: "Slope derived from DEM + roughness / rock-abundance data",
    interaction: "Inspect slope or hazard class at a selected point",
  },
  {
    id: "ctx",
    name: "CTX",
    badge: "Simulated",
    description: "Context Camera-style regional imagery",
    later: "Later: MRO CTX global mosaic (~5–6 m/px)",
    defaultChecked: false,
    type: "basemap",
    appearance: "Genuine grayscale orbital photographs (crater rims, dunes, channels)",
    realDataSource: "Caltech Murray Lab Global CTX Mosaic V01",
    interaction: "Zoom into morphology of craters and scarps",
  },
  {
    id: "hirise",
    name: "HiRISE",
    badge: "Simulated",
    description: "High-resolution strip over the crater and scarp",
    later: "Later: MRO HiRISE RDR products via PDS (~0.25–0.5 m/px)",
    defaultChecked: false,
    type: "overlay",
    appearance: "Very detailed grayscale imagery only inside available footprints",
    realDataSource: "MRO HiRISE map-projected RDR products (PDS)",
    interaction: "Zoom into supported observation footprints (boulders, small channels)",
  },
];