
export type ScientificTarget = {
  id: string;
  name: string;
  latitude: number;
  longitudeEast: number;
  category: "mission" | "science" | "candidate";
  description: string;
  mission?: string;
  year?: number;
  source: string;
};

export function toMapLongitude(longitude: number) {
  return ((longitude + 180) % 360 + 360) % 360 - 180;
}

export const scientificTargets: ScientificTarget[] = [
  {
    id: "perseverance",
    name: "Perseverance Landing Site",
    latitude: 18.445,
    longitudeEast: 77.451,
    category: "mission",
    description:
      "NASA's Perseverance rover explores Jezero Crater, investigating ancient environments and collecting rock and regolith samples.",
    mission: "Mars 2020",
    year: 2021,
    source: "https://science.nasa.gov/mission/mars-2020-perseverance/",
  },
  {
    id: "curiosity",
    name: "Curiosity Landing Site",
    latitude: -4.59,
    longitudeEast: 137.44,
    category: "mission",
    description:
      "Gale Crater landing site of Curiosity. The mission investigates Martian geology, climate history, and past habitability.",
    mission: "Mars Science Laboratory",
    year: 2012,
    source: "https://science.nasa.gov/mission/msl-curiosity/",
  },
  {
    id: "spirit",
    name: "Spirit Landing Site",
    latitude: -14.571892,
    longitudeEast: 175.47848,
    category: "mission",
    description:
      "Gusev Crater landing site. Spirit investigated rocks and soils to study the history of water on Mars.",
    mission: "Mars Exploration Rover",
    year: 2004,
    source: "https://ode.rsl.wustl.edu/mars/pagehelp/Content/Missions_Instruments/Landing_Sites.htm",
  },
  {
    id: "opportunity",
    name: "Opportunity Landing Site",
    latitude: -1.9483,
    longitudeEast: 354.47417,
    category: "mission",
    description:
      "Meridiani Planum landing site. Opportunity investigated geological evidence of ancient water activity.",
    mission: "Mars Exploration Rover",
    year: 2004,
    source: "https://ode.rsl.wustl.edu/mars/pagehelp/Content/Missions_Instruments/Landing_Sites.htm",
  },
  {
    id: "phoenix",
    name: "Phoenix Landing Site",
    latitude: 68.22,
    longitudeEast: 234.25,
    category: "mission",
    description:
      "Northern plains landing site where Phoenix investigated water ice and the Martian soil.",
    mission: "Phoenix",
    year: 2008,
    source: "https://ode.rsl.wustl.edu/mars/pagehelp/Content/Missions_Instruments/Landing_Sites.htm",
  },
  {
    id: "pathfinder",
    name: "Pathfinder Landing Site",
    latitude: 19.095,
    longitudeEast: 326.747,
    category: "mission",
    description:
      "Ares Vallis landing site of the Pathfinder lander and Sojourner rover.",
    mission: "Mars Pathfinder",
    year: 1997,
    source: "https://science.nasa.gov/mission/mars-pathfinder/",
  },
  {
    id: "viking1",
    name: "Viking 1 Landing Site",
    latitude: 22.269,
    longitudeEast: 312.049,
    category: "mission",
    description:
      "Chryse Planitia landing site of the first spacecraft to successfully operate on the Martian surface.",
    mission: "Viking 1",
    year: 1976,
    source: "https://ode.rsl.wustl.edu/mars/pagehelp/Content/Missions_Instruments/Landing_Sites.htm",
  },
  {
    id: "viking2",
    name: "Viking 2 Landing Site",
    latitude: 47.668,
    longitudeEast: 134.280,
    category: "mission",
    description:
      "Utopia Planitia landing site of the Viking 2 lander.",
    mission: "Viking 2",
    year: 1976,
    source: "https://ode.rsl.wustl.edu/mars/pagehelp/Content/Missions_Instruments/Landing_Sites.htm",
  },
  {
    id: "mawrth-vallis",
    name: "Mawrth Vallis",
    latitude: 24.7,
    longitudeEast: 339.5,
    category: "science",
    description:
      "Ancient outflow-channel region with mapped clay minerals, including iron-magnesium and aluminum phyllosilicates. A significant target for studying past aqueous environments.",
    source: "https://science.nasa.gov/resource/clay-minerals-in-mawrth-vallis-region-of-mars/",
  },
  {
    id: "eberswalde",
    name: "Eberswalde Crater",
    latitude: -23.8953,
    longitudeEast: 326.7426,
    category: "candidate",
    description:
      "A former Mars Science Laboratory candidate landing area, notable for its preserved delta and evidence of ancient fluvial activity.",
    source: "https://ode.rsl.wustl.edu/mars/pagehelp/Content/Missions_Instruments/Landing_Sites.htm",
  },
  {
    id: "holden",
    name: "Holden Crater",
    latitude: -26.4007,
    longitudeEast: 325.1615,
    category: "candidate",
    description:
      "A former Mars Science Laboratory candidate landing area with geological features associated with ancient water activity.",
    source: "https://ode.rsl.wustl.edu/mars/pagehelp/Content/Missions_Instruments/Landing_Sites.htm",
  },
];
