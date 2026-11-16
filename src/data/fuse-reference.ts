// Factual ratings and original circuit labels from Bentley 610-3–610-5, Table a.
type TableRow = readonly [number, number | null, string];
const rows: TableRow[] = [
  [1, 15, "ABS/traction control, instruments, check control, lamp monitoring, brake lights, cruise control, trip computer, EML and transmission control"],
  [2, 7.5, "Fuel injection (M60 only), headlights/fog lights, lamp monitoring, turn signals/hazards and crash control"],
  [3, 7.5, "Headlights/fog lights, lamp monitoring, turn signals/hazards, headlight washers (Canada) and body electronics (ZKE)"],
  [4, 7.5, "Parking/tail/underhood lights, lamp monitoring, mirrors, headlight washers (Canada) and body electronics (ZKE)"],
  [5, 10, "Headlights/fog lights, headlight washers (Canada), parking/tail/underhood lights, plate/trunk lights, glovebox/12 V socket, interior lights, lamp monitoring, mirrors and body electronics (ZKE)"],
  [6, 15, "Turn signals/hazards and crash control"],
  [7, 15, "Headlights/fog lights and lamp monitoring"],
  [8, null, "Vacant in the source table"],
  [9, 15, "Horn, climate control (IHKR), phone and auxiliary fan"],
  [10, 7.5, "Headlights/fog lights, lamp monitoring and crash control"],
  [11, 7.5, "Headlights/fog lights, lamp monitoring and crash control"],
  [12, 15, "Washer nozzle heaters, reverse lights, mirrors, memory seats and transmission control"],
  [13, 7.5, "Headlights/fog lights, turn signals/hazards and lamp monitoring"],
  [14, 7.5, "Headlights/fog lights, turn signals/hazards and lamp monitoring"],
  [15, 7.5, "Parking/tail/underhood lights, plate/trunk lights, brake lights and lamp monitoring"],
  [16, 30, "Heated seats, memory seats and lumbar adjustment"],
  [17, 7.5, "Fuel injection, charging, starting, E-box fan, transmission control, ABS/traction control, heated locks, windows, sunroof, headlight washers (Canada), instruments/check control, lamp monitoring, brake/interior lights, EML, cruise control, trip computer and body electronics (ZKE)"],
  [18, 15, "Interior lights, glovebox/12 V socket, radio/CD, phone, memory seats, Alpine alarm and remote locking"],
  [19, 30, "Climate control (IHKR)"],
  [20, 7.5, "Instruments/check control, parking/tail/underhood lights, interior lights, climate control (IHKR), trip computer and EML"],
  [21, 7.5, "Plate/trunk lights, interior lights, glovebox/12 V socket and Alpine alarm"],
  [22, 30, "Wiper pressure control (ADV) and headlight washers (Canada)"],
  [23, 15, "Fuel pump and fuel injection"],
  [24, 10, "Headlight washers (outside the U.S.), wiper control (SWS) and body electronics (ZKE)"],
  [25, 30, "Auxiliary fan"],
  [26, 30, "Glovebox light and 12 V socket"],
  [27, 7.5, "Climate control (IHKR)"],
  [28, 15, "E-box fan, charging, front heated seats, rear defogger and Servotronic"],
  [29, 7.5, "Climate control (IHKR), auxiliary fan and instruments"],
  [30, 7.5, "Heated locks, central locking, windows, sunroof, body electronics (ZKE) and interior lights"],
  [31, 7.5, "Central locking, windows, sunroof and phone"],
  [32, null, "Vacant in the source table"],
  [34, 20, "Power steering column adjustment"],
  [36, 30, "Central locking"],
  [37, 20, "Rear wiper and washer (Touring)"],
  [40, null, "Vacant in the source table"],
  [41, 30, "Radio/CD and heated seats"],
  [42, 30, "Power and memory seats"],
  [43, 30, "Power seats"],
  [44, 30, "Windshield wiper control (SWS) and wiper pressure control"],
  [46, 30, "Climate control (IHKR)"],
  [47, 30, "Body electronics (ZKE), sunroof, windows and central locking"],
  [48, null, "Vacant in the source table. Check the installed auxiliary panel."],
  [49, null, "Vacant in the source table. Check the installed auxiliary panel."],
];

const range = (first: number, last: number) =>
  Array.from({ length: last - first + 1 }, (_, i) => first + i);

export const fusePanels = [
  { id: "front", title: "Front main box", location: "Left rear corner of the engine bay, by the firewall.", numbers: range(1, 29), note: "The main strip has positions F1–F29. Relay and control-module placement changes by year and equipment." },
  { id: "rear", title: "Rear distribution box", location: "Under the rear seat cushion.", numbers: [...range(30, 37), ...range(40, 47)], note: "Early and later rear blocks use different module arrangements. Some positions in the numbered ranges are unlisted." },
  { id: "auxiliary", title: "Auxiliary panel", location: "Left front of the engine bay, when equipped.", numbers: [48, 49, 55, 56], note: "The auxiliary layout uses F48/F49 or F55/F56 depending on equipment. Match the installed lid and wiring diagram." },
  { id: "electronics", title: "Electronics box", location: "Right rear corner of the engine bay, by the firewall.", numbers: [], note: "This enclosure contains control modules and relays. Engine electronics, fuel-pump and other relay assignments vary with engine and equipment." },
] as const;
export type FusePanel = typeof fusePanels[number];

const entries = new Map(rows.map((row) => [row[0], row]));
export const fusePositions = fusePanels.flatMap((panel) =>
  panel.numbers.map((number) => {
    const entry = entries.get(number);
    const page = number <= 6 ? 383 : number <= 23 ? 384 : 385;
    return {
      number,
      panel: panel.id,
      amps: entry?.[1] ?? null,
      status: !entry ? "unlisted" : entry[1] === null ? "vacant" : "listed",
      circuits: entry?.[2] ?? "Circuit and rating are unlisted. Check the car’s cover and applicable wiring diagram.",
      source: entry
        ? `Bentley 610-${page - 380}, Table a · PDF p. ${page}`
        : number >= 55 ? "Bentley 610-3, Figs. 6–7 and panel note · PDF p. 383" : "Bentley 610-2, 610-5 · PDF pp. 382, 385",
    } as const;
  }),
);
export const listedFuseCount = rows.length;

const circuitAliases: Record<string, string> = {
  blower: "climate control",
  heater: "climate control",
  cigarette: "12 v socket",
  lighter: "12 v socket",
  outlet: "12 v socket",
  indicators: "turn signals",
  indicator: "turn signals",
  defrost: "defogger",
  defroster: "defogger",
};

export function findFuseIn<T extends {number: number}>(query: string, positions: readonly T[]) {
  const match = query.trim().match(/^(?:f(?:use)?\s*#?\s*)?(\d{1,2})$/i);
  return match ? positions.find((fuse) => fuse.number === Number(match[1])) : undefined;
}

export function findFuseNumber(query: string) {
  return findFuseIn(query, fusePositions);
}

export function filterFusePositions<T extends {number:number;circuits:string}>(query: string, positions: T[]) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return positions;
  if (/^(?:f(?:use)?\s*#?\s*)?\d+$/.test(trimmed)) {
    const fuse = findFuseIn(trimmed, positions);
    return fuse ? [fuse] : [];
  }
  const words = trimmed.replace(/\b12\s*v\b/g, "12 v").replace(/[^a-z0-9]+/g, " ").split(" ").filter(
    (word) => word && !["fuse", "fuses", "for", "the"].includes(word),
  );
  return positions.filter((fuse) => {
    const circuits = fuse.circuits.toLowerCase();
    return words.every((word) => circuits.includes(word) || circuits.includes(circuitAliases[word] || word));
  });
}

export function filterFuses(query: string) {
  return filterFusePositions(query, fusePositions);
}

export const relayLayouts = {
  front: [
  {
    title: "1989–90 front box", source: "Bentley 610-1, Fig. 1 · PDF p. 381",
    labels: ["Starter relay", "Horn relay", "KLR unloader", "Blower relay", "Vacant", "Phone alert relay", "K61 unloader", "Water pump relay", "K15 unloader", "Hazard flasher", "Check control", "Crash control", "Lamp control"],
  },
  {
    title: "1991–94 front box example", source: "Bentley 610-1, Fig. 2 · PDF p. 381",
    labels: ["Horn/phone jumper", "Starter relay", "Terminal R unloader", "Blower relay", "Compressor control", "Washer pump relay", "ABS relay (see year limits)", "K61 unloader", "K15 unloader", "Auxiliary water pump", "Horn relay", "Hazard flasher", "Check control", "Crash control", "Lamp control"],
  },
  ],
  rear: [
    {
      title: "1989–90 rear box", source: "Bentley 610-2, Fig. 3 · PDF p. 382",
      labels: ["Fuse block", "General module", "Relay module", "Power protection relay", "Wiper relay", "Rear defogger relay", "Fuse block", "Fuse block", "Wiper pressure relay (if equipped)"],
    },
    {
      title: "1991–92 rear box example", source: "Bentley 610-2, Fig. 4 · PDF p. 382",
      labels: ["Relay module", "General module", "Rear defogger relay", "Wiper relay", "Power protection relay", "Fuse blocks", "Additional fuse block (1992 onward)"],
    },
  ],
  auxiliary: [
    {
      title: "1989–90 auxiliary panel", source: "Bentley 610-3, Fig. 6 · PDF p. 383",
      labels: ["Headlight washer module (Canada)", "High-speed relay", "Normal-speed relay", "Phone horn alert relay", "Air conditioning relay", "Fuse positions"],
    },
    {
      title: "1991 auxiliary panel example", source: "Bentley 610-3, Fig. 7 · PDF p. 383",
      labels: ["Headlight washer module (Canada)", "Normal-speed relay", "High-speed relay", "Phone horn alert relay", "Air conditioning relay", "Fuse positions"],
    },
  ],
  electronics: [
    {
      title: "E-box example", source: "Bentley 610-2, Fig. 5 · PDF p. 382",
      labels: ["ABS or traction control module", "DME module", "Cruise control module", "Main relay", "Fuel pump relay", "Oxygen-sensor heater relay"],
    },
  ],
};
