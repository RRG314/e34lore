import { additionalParts, additionalAssemblies } from "./catalog-expansion.ts";
import { manualFigureParts, manualFigureAssemblies } from "./manual-assemblies.ts";
export type Vehicle = {
  model: string;
  engine: string;
  year: string;
  month: string;
  market: string;
  body: string;
  transmission: string;
  steering: string;
};
export const emptyVehicle: Vehicle = {
  model: "",
  engine: "",
  year: "",
  month: "",
  market: "",
  body: "",
  transmission: "",
  steering: "",
};
export function sanitizeVehicle(input: Partial<Vehicle>): Vehicle {
  const result = { ...emptyVehicle };
  for (const key of Object.keys(result) as (keyof Vehicle)[]) {
    const value = input[key];
    if (typeof value === "string") result[key] = value.slice(0, 80);
  }
  return result;
}
export const models = [
  {
    id: "518g",
    engines: ["M43"],
    label: "Petrol / natural-gas Touring",
    coverage: "Outside supplied manual",
  },
  {
    id: "518i",
    engines: ["M40", "M43"],
    label: "Four-cylinder petrol",
    coverage: "Outside supplied manual",
  },
  {
    id: "520i",
    engines: ["M20", "M50", "M50TU"],
    label: "Six-cylinder petrol",
    coverage: "Outside supplied manual",
  },
  {
    id: "524td",
    engines: ["M21"],
    label: "Six-cylinder diesel",
    coverage: "Outside supplied manual",
  },
  {
    id: "525td",
    engines: ["M51"],
    label: "Six-cylinder diesel",
    coverage: "Outside supplied manual",
  },
  {
    id: "525tds",
    engines: ["M51"],
    label: "Six-cylinder diesel",
    coverage: "Outside supplied manual",
  },
  {
    id: "525i",
    engines: ["M20", "M50", "M50TU"],
    label: "Six-cylinder petrol",
    coverage: "U.S. 1989–1995",
  },
  {
    id: "525iX",
    engines: ["M50", "M50TU"],
    label: "All-wheel drive",
    coverage: "Outside supplied manual",
  },
  {
    id: "530i",
    engines: ["M30", "M60"],
    label: "Six-cylinder / V8 petrol",
    coverage: "U.S. M60, 1994–1995",
  },
  {
    id: "535i",
    engines: ["M30"],
    label: "Six-cylinder petrol",
    coverage: "U.S. 1989–1993",
  },
  {
    id: "540i",
    engines: ["M60"],
    label: "V8 petrol",
    coverage: "U.S. 1994–1995",
  },
  {
    id: "M5",
    engines: ["S38"],
    label: "BMW Motorsport",
    coverage: "Outside supplied manual",
  },
] as const;
export const systems = [
  {
    id: "cooling",
    name: "Cooling system",
    group: "17",
    icon: "thermometer",
    section: "170",
    description: "Coolant circulation, temperature control and airflow.",
  },
  {
    id: "engine",
    name: "Engine & ignition",
    group: "11",
    icon: "engine",
    section: "100",
    description: "Engine identification, valvetrain, lubrication and ignition.",
  },
  {
    id: "suspension",
    name: "Suspension & steering",
    group: "31",
    icon: "suspension",
    section: "310",
    description: "Struts, links, wheel bearings and steering.",
  },
  {
    id: "brakes",
    name: "Brakes",
    group: "34",
    icon: "disc",
    section: "340",
    description: "Hydraulics, discs, parking brake and ABS.",
  },
  {
    id: "electrical",
    name: "Electrical",
    group: "61",
    icon: "bolt",
    section: "600",
    description: "Starting, charging, fuses, relays and wiring.",
  },
  {
    id: "drivetrain",
    name: "Transmission & drive",
    group: "23",
    icon: "gear",
    section: "200",
    description: "Clutch, gearbox, driveshaft and final drive.",
  },
  {
    id: "body",
    name: "Body & interior",
    group: "41",
    icon: "car",
    section: "400",
    description: "Body panels, seals, trim, windows and seats.",
  },
  {
    id: "climate",
    name: "Heating & A/C",
    group: "64",
    icon: "fan",
    section: "640",
    description: "Cabin airflow, heater operation and air conditioning.",
  },
] as const;
export type Part = {
  id: string;
  number: string | null;
  name: string;
  detail: string;
  quantity: number;
  assembly: string;
  ref: string;
  source: string;
  sourceLabel: string;
  engines: string[];
  model: string;
  market: string;
  from?: string;
  to?: string;
  review: "catalog-listed" | "reference-only";
  note: string;
  shape: string;
  sourceId?: string;
  body?: string;
};
const coolingSource =
  "https://www.realoem.com/bmw/enUS/showparts?diagId=11_4931&id=HD61-EUR-05_1989_E34_BMW_525i";
const coolingBase = {
  assembly: "water-pump",
  source: coolingSource,
  sourceLabel: "RealOEM · 11_4931",
  engines: ["M50", "M50TU"],
  model: "525i",
  market: "EUR",
  review: "catalog-listed" as const,
};
const initialParts: Part[] = [
  {
    ...coolingBase,
    id: "coolant-pump",
    number: "11517527799",
    name: "Mechanical coolant pump",
    detail: "Pump assembly",
    quantity: 1,
    ref: "01",
    note: "Historical catalog number. Check current supersession directly; this is not a current ordering recommendation.",
    shape: "pump",
  },
  {
    ...coolingBase,
    id: "pump-seal",
    number: "11511711484",
    name: "Water pump O-ring",
    detail: "68 × 5 mm",
    quantity: 1,
    ref: "02",
    note: "Catalog dimension. Confirm the pump and its supplied seal before ordering.",
    shape: "seal",
  },
  {
    ...coolingBase,
    id: "pump-nut",
    number: "07129904553",
    name: "Hex nut with plate",
    detail: "AM6-8-ZNNIV SI",
    quantity: 4,
    ref: "03",
    note: "Quantity shown per catalog assembly. Tightening specification is not yet verified here.",
    shape: "nut",
  },
  {
    ...coolingBase,
    id: "thermostat-housing",
    number: "11531722531",
    name: "Thermostat housing",
    detail: "Connection flange",
    quantity: 1,
    ref: "04",
    note: "Gasket selection changes around 05/1992. Inspect the actual housing and production date.",
    shape: "housing",
  },
  {
    ...coolingBase,
    id: "thermostat",
    number: "11537511580",
    name: "Thermostat",
    detail: "88 °C catalog option",
    quantity: 1,
    ref: "05",
    to: "1995-12",
    note: "The same catalog also lists a 92 °C option. Do not select by temperature alone.",
    shape: "thermostat",
  },
  {
    ...coolingBase,
    id: "thermostat-seal",
    number: "11531265084",
    name: "Thermostat O-ring",
    detail: "60 × 3.5 mm",
    quantity: 1,
    ref: "06",
    note: "Confirm housing and thermostat configuration.",
    shape: "seal",
  },
  {
    ...coolingBase,
    id: "early-gasket",
    number: "11531748047",
    name: "Early housing gasket",
    detail: "Asbestos-free gasket",
    quantity: 1,
    ref: "07",
    to: "1992-05",
    note: "Catalog date boundary overlaps May 1992. Verify actual assembly; not interchangeable by assumption.",
    shape: "gasket",
  },
  {
    ...coolingBase,
    id: "profile-gasket",
    number: "11531740437",
    name: "Housing profile gasket",
    detail: "Profile seal",
    quantity: 1,
    ref: "08",
    from: "1992-05",
    note: "Also listed with the earlier connection flange as an additional requirement. Exact fitment requires review.",
    shape: "gasket",
  },
  {
    ...coolingBase,
    id: "housing-bolt-m6",
    number: "11531740317",
    name: "Housing bolt, M6",
    detail: "M6 × 25",
    quantity: 3,
    ref: "09",
    note: "Historical number marked ENDED in this catalog. Replacement not verified.",
    shape: "bolt",
  },
  {
    ...coolingBase,
    id: "housing-bolt-m8",
    number: "11531740316",
    name: "Housing bolt, M8",
    detail: "M8 × 30",
    quantity: 1,
    ref: "10",
    note: "Historical number marked ENDED in this catalog. Replacement not verified.",
    shape: "bolt",
  },
  ...[
    [
      "strut-mount",
      "Upper strut mount",
      "Mount design varies by production date",
      "mount",
    ],
    [
      "upper-seat",
      "Upper spring seat",
      "Configuration-specific spring support",
      "seat",
    ],
    [
      "coil-spring",
      "Coil spring",
      "Selection depends on vehicle equipment",
      "spring",
    ],
    ["bump-stop", "Bump stop & dust cover", "Protective components", "boot"],
    [
      "strut-insert",
      "Shock absorber insert",
      "Damper inside strut housing",
      "damper",
    ],
    [
      "strut-housing",
      "Strut housing",
      "Wheel carrier and lower spring seat",
      "strut",
    ],
  ].map((p, i): Part => ({
    id: p[0],
    number: null,
    name: p[1],
    detail: p[2],
    quantity: 1,
    assembly: "front-strut",
    ref: String(i + 1).padStart(2, "0"),
    source: "manual:310-4",
    sourceLabel: "Bentley · 310-4 / PDF 280",
    engines: [],
    model: "",
    market: "",
    review: "reference-only",
    note: "Original component-identification schematic. OEM number and exact vehicle applicability have not been cataloged. 1989–1992 and 1993+ mount stacks differ.",
    shape: p[3],
  })),
  ...[
    [
      "brake-disc",
      "Brake disc",
      "Disc dimensions vary by configuration",
      "disc",
    ],
    [
      "brake-carrier",
      "Caliper carrier",
      "Carrier and mounting interface",
      "carrier",
    ],
    ["brake-pads", "Brake pad set", "Inner and outer friction pads", "pads"],
    ["brake-caliper", "Brake caliper", "Hydraulic actuator", "caliper"],
    ["wear-sensor", "Pad wear sensor", "Circuit monitors pad wear", "sensor"],
  ].map((p, i): Part => ({
    id: p[0],
    number: null,
    name: p[1],
    detail: p[2],
    quantity: 1,
    assembly: "front-brake",
    ref: String(i + 1).padStart(2, "0"),
    source: "manual:340",
    sourceLabel: "Bentley · section 340",
    engines: [],
    model: "",
    market: "",
    review: "reference-only",
    note: "Schematic identification only. Brake dimensions, hardware and applicability require configuration-specific verification before ordering or repair.",
    shape: p[3],
  })),
  ...additionalParts,
];
// Preserve bookmarked component IDs when a catalog identity replaces a draft record.
const upgrades: Record<string, string> = { "brake-disc": "front-disc-current", "brake-carrier": "caliper-carrier-oem", "brake-pads": "front-pad-kit", "brake-caliper": "caliper-housing-left", "wear-sensor": "pad-wear-sensor-oem" };
const replacedCatalogIds = new Set(Object.values(upgrades));
const manualPartIds = new Set(manualFigureParts.map((p) => p.id));
export const parts: Part[] = initialParts.filter((p) => !replacedCatalogIds.has(p.id) && !manualPartIds.has(p.id)).map((part) => {
  const replacement = initialParts.find((p) => p.id === upgrades[part.id]);
  return replacement ? { ...replacement, id: part.id } : part;
}).concat(manualFigureParts);
export const assemblies = [
  {
    id: "water-pump",
    title: "Water pump & thermostat",
    system: "cooling",
    group: "11",
    code: "11 / 51",
    source: "11_4931",
    description:
      "M50 coolant pump, thermostat, seals and housing fasteners.",
    boundary:
      "Catalog reference is EUR 525i M50. U.S. applicability and current replacement numbers require verification.",
  },
  {
    id: "front-strut",
    title: "Front spring strut",
    system: "suspension",
    group: "31",
    code: "31 / 10",
    source: "310-4",
    description: "Spring, damper and upper mounting stack, including the production change shown in Bentley Fig. 5.",
    boundary:
      "Identification schematic. Mount stacks vary by production date. OEM identities are not yet cataloged.",
  },
  {
    id: "front-brake",
    title: "Front caliper & brake pads",
    system: "brakes",
    group: "34",
    code: "34 / 10",
    source: "340",
    description: "ATE caliper, carrier, guides, seals, pads and wear contact.",
    boundary:
      "Catalog selection: 1994 525i Sedan. Alternate and discontinued numbers are retained; quantities are catalog quantities, not package counts.",
  },
  ...additionalAssemblies,
  ...manualFigureAssemblies,
];
export const quickSymptoms = [
  {
    id: "overheating",
    title: "Temperature rising",
    system: "cooling",
    description: "Record when it happens, then follow the evidence.",
  },
  {
    id: "no-start",
    title: "Engine won’t start",
    system: "electrical",
    description: "Separate no-crank from crank-but-no-start.",
  },
  {
    id: "vibration",
    title: "Vibration or shimmy",
    system: "suspension",
    description: "Identify speed, load and braking conditions.",
  },
  {
    id: "braking",
    title: "Brake concern",
    system: "brakes",
    description: "Recognize when the car needs professional recovery.",
  },
];
export const articles = [
  {
    slug: "know-your-e34",
    title: "Vehicle identification and applicability",
    system: "engine",
    summary:
      "Two 525i cars can have different engines, cooling parts and electrical systems. Start with the production configuration.",
    body: [
      "E34 identifies a chassis generation, not a single mechanical specification. Model designation, production date, market, body style, engine, transmission and factory equipment all affect applicability.",
      "The vehicle selector records only the information you supply. It does not decode a VIN or infer factory options. A model year is not a substitute for the production month.",
      "The supplied Bentley manual covers U.S. 525i (1989–1995), 535i (1989–1993), and 530i/540i (1994–1995). Other E34 configurations need additional sources.",
    ],
    source: "Bentley foreword · PDF 5",
  },
  {
    slug: "cooling-system",
    title: "Cooling system: circulation and temperature control",
    system: "cooling",
    summary:
      "Follow coolant circulation, temperature regulation and airflow before replacing parts.",
    body: [
      "The pump circulates coolant through the engine. The thermostat regulates the path to the radiator as the engine warms. The radiator transfers heat to passing air.",
      "Cooling at low road speed depends on fan operation and unobstructed airflow. A temperature increase at idle is an observation to investigate, not proof of a failed fan clutch.",
      "Start with the engine cold: inspect coolant level, visible leaks, hose condition and belt condition. Never open a hot pressurized system or place your hands near a running fan.",
    ],
    source: "Bentley 170-1–170-3 · PDF 205–207",
  },
  {
    slug: "fitment-evidence",
    title: "Part fitment and interchange criteria",
    system: "engine",
    summary:
      "Catalog listings, production changes and owner reports carry different kinds of evidence.",
    body: [
      "A shared engine name does not establish that two assemblies interchange. Mounting, interfaces, production changes and equipment must all agree.",
      "A historical part number may have a replacement chain with conditions. This site preserves the original catalog source and does not infer compatibility through another part.",
      "Catalog-listed means a number was observed in the named catalog. Reference-only means a component has been identified but an OEM identity or applicability has not been established.",
    ],
    source: "E34 Collective evidence policy · revision 1",
  },
  {
    slug: "first-inspection",
    title: "Vehicle intake inspection",
    system: "body",
    summary:
      "Build a useful baseline: identify the car, collect records and document observations.",
    body: [
      "Record the model, engine identification, production date and market. Keep the VIN private. Gather prior service invoices and note modifications whose origin is uncertain.",
      "With the car parked safely and cold, document visible leaks, damaged hoses, warning lamps and unusual behavior. Photograph the location and context, not just the suspected part.",
      "Do not go beneath a car supported only by a jack. Brake, steering, fuel, restraint and structural concerns need appropriate equipment and qualified assessment.",
    ],
    source: "Bentley fundamentals · section 010; original inspection outline",
  },
];
