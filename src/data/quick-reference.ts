import type { SearchRecord } from "../domain/search";
import type { Vehicle } from "./catalog";
import { findFuseIn, fusePositions, fusePanels } from "./fuse-reference";

export const referenceSections = [
  { id: "fluids", title: "Fluids & capacities", detail: "Oil, coolant, brake fluid and driveline fills." },
  { id: "fuses", title: "Fuse diagrams", detail: "Find a fuse by number or by the circuit it protects." },
  { id: "locations", title: "Component locations", detail: "Find reservoirs, fuse boxes, batteries and service points." },
  { id: "model", title: "3D exploded view", detail: "Separate the car’s parts and inspect their catalog and repair references." },
] as const;

export const referenceModels = [
  { id: "525i-m20", model: "525i", engine: "M20", first: 1989, last: 1990, oil: null, coolant: null },
  { id: "525i-m50", model: "525i", engine: "M50", first: 1991, last: 1992, oil: 5.75, coolant: 10.5 },
  { id: "525i-m50tu", model: "525i", engine: "M50TU", first: 1993, last: 1995, oil: 5.75, coolant: 10.5 },
  { id: "535i-m30", model: "535i", engine: "M30", first: 1989, last: 1993, oil: 5.75, coolant: 12 },
  { id: "530i-m60", model: "530i", engine: "M60", first: 1994, last: 1995, oil: 7.5, coolant: 12.5 },
  { id: "540i-m60", model: "540i", engine: "M60", first: 1994, last: 1995, oil: 7.5, coolant: 12.5 },
] as const;
export type ReferenceModel = typeof referenceModels[number];
export const referenceModelLabel = (row: ReferenceModel) =>
  `${row.model} · ${row.engine} · ${row.first}–${row.last}`;
export function referenceModelForVehicle(vehicle: Vehicle) {
  if (vehicle.market !== "USA" || !/^\d{4}$/.test(vehicle.year)) return undefined;
  const year = Number(vehicle.year);
  return referenceModels.find((row) =>
    row.model === vehicle.model &&
    row.engine === vehicle.engine &&
    year >= row.first && year <= row.last &&
    (vehicle.body !== "Touring" || ((row.model === "525i" && year >= 1992) || row.model === "530i")),
  );
}

export const referenceScope = "U.S. 525i (1989–95), 535i (1989–93), 530i and 540i (1994–95)";

type ReferenceLink = { href: string; label: string };
export type ServiceLocation = {
  id: string;
  title: string;
  group: "Engine bay" | "Cabin & luggage" | "Underbody";
  x: number;
  y: number;
  location: string;
  detail: string;
  source: string;
  links: ReferenceLink[];
};

const sourceChapter = (id: string): ReferenceLink => ({ href: "/manual/" + id, label: "Manual " + id });
const guide = (id: string): ReferenceLink => ({ href: "/guides/" + id, label: "Open walkthrough" });
const fluid = (id: string): ReferenceLink => ({ href: "/quick-reference/fluids#" + id, label: "Fluid reference" });

const panelPoints = {
  front: [25, 34],
  rear: [44, 68],
  auxiliary: [24, 17],
  electronics: [76, 34],
} as const;

export const fuseLocations: ServiceLocation[] = fusePanels.map((panel) => ({
  id: panel.id,
  title: panel.title,
  group: panel.id === "rear" ? "Cabin & luggage" : "Engine bay",
  x: panelPoints[panel.id][0],
  y: panelPoints[panel.id][1],
  location: panel.location,
  detail: panel.note,
  source: panel.id === "front" ? "Bentley 610-1 · PDF p. 381" :
    panel.id === "auxiliary" ? "Bentley 610-2–610-3 · PDF pp. 382–383" : "Bentley 610-2 · PDF p. 382",
  links: [{ href: "/quick-reference/fuses?panel=" + panel.id, label: "Open fuse panel" }, sourceChapter("610")],
}));

export const serviceLocations: ServiceLocation[] = [
  { id: "oil", title: "Engine oil cap & dipstick", group: "Engine bay", x: 50, y: 25,
    location: "Look for the oil filler on the engine’s upper cover and the separate dipstick at the engine.",
    detail: "Check the oil level on level ground. Cap, dipstick and filter housing positions vary with the engine.",
    source: "Bentley 020-8–020-10 · PDF pp. 30–32",
    links: [fluid("engine-oil"), guide("m50-engine-oil-and-filter"), sourceChapter("119")] },
  { id: "coolant", title: "Coolant expansion tank", group: "Engine bay", x: 49, y: 13,
    location: "Look along the radiator or for a separate expansion tank in the engine bay.",
    detail: "The marker identifies the radiator area. Follow the cold-level markings on the installed tank and wait for the engine to cool before opening the cap.",
    source: "Bentley 170-1, 170-5 · PDF pp. 205, 209",
    links: [fluid("cooling-system"), guide("cooling-system-visual-check"), sourceChapter("170")] },
  { id: "brake", title: "Brake fluid reservoir", group: "Engine bay", x: 42, y: 35,
    location: "The translucent reservoir sits on the brake master cylinder at the rear of the engine bay.",
    detail: "Find the MIN and MAX marks on the reservoir. On manual cars, the hydraulic clutch shares this supply.",
    source: "Bentley 020-15, Fig. 16 · PDF p. 37",
    links: [fluid("brake-fluid"), guide("brake-fluid-level-inspection"), sourceChapter("340")] },
  { id: "steering", title: "Power steering reservoir", group: "Engine bay", x: 25, y: 44,
    location: "On the manual’s layout, look just behind the front fuse and relay panel.",
    detail: "The reservoir cap has a level dipstick. Read the fluid designation on the installed reservoir before adding anything.",
    source: "Bentley 020-15, Fig. 15 · PDF p. 37",
    links: [fluid("steering-fluid"), guide("power-steering-fluid-level-inspection")] },
  { id: "washer", title: "Windshield washer reservoir", group: "Engine bay", x: 77, y: 17,
    location: "Front right corner of the engine bay. Look for the windshield washer symbol.",
    detail: "Cars with headlight washers have an additional reservoir above the windshield washer reservoir in the documented layout.",
    source: "Bentley 611-8, Fig. 22 · PDF p. 394",
    links: [fluid("washer-fluid"), sourceChapter("611")] },
  { id: "battery-front", title: "Battery · early 525i", group: "Engine bay", x: 65, y: 27,
    location: "Front right of the engine bay on the U.S. 1989–91 525i.",
    detail: "For the 1992–95 525i and covered 530i, 535i and 540i, select the under-seat battery marker.",
    source: "Bentley 020-12, 121-1 · PDF pp. 34, 163",
    links: [{ href: "/quick-reference/locations?point=battery-rear", label: "Under-seat battery" }, guide("battery-connections-first-check")] },
  { id: "battery-rear", title: "Battery · under rear seat", group: "Cabin & luggage", x: 73, y: 68,
    location: "Beneath the rear seat on the U.S. 1992–95 525i and covered 530i, 535i and 540i.",
    detail: "The U.S. 1989–91 525i uses the engine-bay battery location. Confirm the actual installation before lifting the seat.",
    source: "Bentley 121-1 · PDF p. 163",
    links: [{ href: "/quick-reference/locations?point=battery-front", label: "Engine-bay battery" }, guide("battery-connections-first-check")] },
  { id: "tires", title: "Tire pressure placard", group: "Cabin & luggage", x: 23, y: 56,
    location: "Driver’s door pillar. Open the driver’s door and look for the tire label.",
    detail: "Read the cold pressures for the installed tire size and load. Front and rear targets may differ.",
    source: "Bentley 020-16 · PDF p. 38",
    links: [guide("cold-tire-pressure-check"), { href: "https://www.nhtsa.gov/vehicle-safety/tires", label: "NHTSA tire guidance" }] },
  { id: "washer-rear", title: "Rear washer reservoir · Touring", group: "Cabin & luggage", x: 76, y: 83,
    location: "Behind the right rear trim panel in the Touring luggage compartment.",
    detail: "The rear window washer uses a separate reservoir and pump on the Touring.",
    source: "Bentley 611-8 · PDF p. 394",
    links: [fluid("washer-fluid"), sourceChapter("611")] },
  { id: "gearbox", title: "Transmission", group: "Underbody", x: 52, y: 49,
    location: "Under the center tunnel, immediately behind the engine.",
    detail: "Identify the gearbox from its case tag before choosing a fluid or level-check procedure. Use properly supported, level lifting equipment for underbody access.",
    source: "Bentley 230-1–230-2, 240-1 · PDF pp. 231–232, 237",
    links: [fluid("transmission-fluid"), sourceChapter("230"), sourceChapter("240")] },
  { id: "differential", title: "Rear differential", group: "Underbody", x: 52, y: 80,
    location: "Between the rear wheels, below the car. Look for the differential’s identification tag at the left rear of its housing.",
    detail: "Confirm whether the unit is open or limited slip before choosing a lubricant.",
    source: "Bentley 331-4, Fig. 6 · PDF p. 316",
    links: [fluid("differential-fluid"), sourceChapter("331")] },
  ...fuseLocations,
];

export function quickReferenceSearch(query: string, positions: readonly {number:number;circuits:string}[] = fusePositions): SearchRecord[] {
  const fuse = findFuseIn(query, positions);
  if (fuse && /^f/i.test(query.trim())) return [{
    id: "quick-fuse-" + fuse.number, title: "Fuse F" + fuse.number, kind: "Source",
    href: "/quick-reference/fuses?fuse=" + fuse.number, summary: fuse.circuits,
  }];
  const q = query.toLowerCase();
  const fluidPattern = /\b(capacit(?:y|ies)|fluid|atf|antifreeze|oil type|what oil|how much oil|coolant type|dexron)\b/;
  const locationPattern = /\b(where|locat(?:e|ion|ions)|battery|dipstick|placard|reservoir)\b/;
  const fusePattern = /\b(fuses?|relay box|fusebox)\b/;
  const modelPattern = /\b(explod(?:e|ed|ing)|3d model|interactive car)\b/;
  const point = /\bbattery\b/.test(q) ? "battery-rear" :
    /\b(placard|tire pressure)\b/.test(q) ? "tires" :
      /\bwasher\b/.test(q) ? "washer" :
        /\bsteering\b/.test(q) ? "steering" :
          /\bbrake\b/.test(q) ? "brake" :
            /\bcoolant\b/.test(q) ? "coolant" :
              /\b(oil|dipstick)\b/.test(q) ? "oil" : "";
  return referenceSections
    .filter((section) => ({ fluids: fluidPattern, fuses: fusePattern, locations: locationPattern, model: modelPattern })[section.id].test(q))
    .map((section) => ({
      id: "quick-" + section.id, title: section.title, kind: "Source", summary: section.detail,
      href: "/quick-reference/" + section.id +
        (section.id === "locations" && point ? "?point=" + point : ""),
    }));
}
