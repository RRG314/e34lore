import { manualChapters, manualGuides, manualSource } from "../data/manual";
import { quickSymptoms } from "../data/catalog";
import { manualJobs } from "../data/manual-jobs";
import { chapterSystems } from "../data/manual-navigation";
import type { SearchRecord } from "./search";

const guideTopics: Record<string, string> = {
  "m50-engine-oil-and-filter": "engine oil change oil filter oil service cartridge sump drain plug",
  "factory-halogen-headlight-bulb": "headlight headlamp bulb low beam high beam halogen head light",
  "sedan-tail-lamp-bulb": "tail light tail lamp taillight brake light bulb rear bulb",
  "front-door-window-dropped-inspection": "front door window glass drops drop fell into door stuck crooked slide regulator",
  "identify-your-engine": "engine code engine identification motor identification",
  "cooling-system-visual-check": "overheat overheats overheating running hot coolant leak losing coolant temperature gauge",
  "cooling-fan-airflow-check": "fan clutch auxiliary aux fan overheating at idle hot in traffic radiator fan",
  "m50-water-pump-job-planning": "water pump waterpump coolant pump",
  "battery-connections-first-check": "no start no crank wont start does not crank dead battery starter clicks battery cable ground strap charging",
  "front-strut-component-identification": "front strut shock absorber upper mount suspension shimmy vibration",
  "engine-air-filter-replacement": "engine air filter intake air filter airbox air cleaner",
  "windshield-wiper-blade-replacement": "front wiper blade windshield wiper windscreen wiper streaking chatter",
  "accessory-drive-belt-inspection": "accessory drive belt serpentine belt alternator belt fan belt squeal v belt poly ribbed",
  "brake-fluid-level-inspection": "brake fluid clutch fluid reservoir low brake fluid",
  "power-steering-fluid-level-inspection": "power steering fluid steering reservoir steering fluid atf chf",
  "cold-tire-pressure-check": "tire pressure tyre pressure cold inflation tire psi",
};

// Topic pointers to the supplied manual. These are source records, not repair instructions.
const chapterTopics: Record<string, string> = {
  "020": "oil filter oil change air filter spark plug accessory belt serpentine belt fuel filter tire pressure brake fluid power steering fluid cabin air filter microfilter",
  "113": "head gasket head bolts cylinder head",
  "116": "valve stem seal valve clearance rocker arm camshaft",
  "117": "timing chain tensioner chain guide",
  "118": "timing belt cam belt cambelt",
  "119": "oil pump oil pressure oil pan oil sump",
  "120": "spark plug ignition coil distributor ignition timing",
  "121": "no start no crank dead battery starter clicks alternator charging",
  "130": "rough idle idle control valve oxygen sensor fuel injector DME",
  "160": "fuel pump fuel pressure fuel level sender fuel tank",
  "170": "water pump waterpump thermostat coolant bleed coolant leak heater hose radiator fan fan clutch overheating",
  "210": "clutch master cylinder clutch slave cylinder clutch pedal",
  "240": "automatic transmission fluid ATF transmission filter",
  "250": "shift bushings shifter linkage selector lever",
  "260": "guibo flex disc driveshaft center support bearing",
  "310": "front strut thrust arm control arm tie rod sway bar wheel bearing",
  "320": "power steering steering box tie rod wheel alignment toe",
  "330": "rear shock rear wheel bearing rear axle cv boot self leveling suspension",
  "331": "differential final drive limited slip gear oil",
  "340": "brake pad rotor disc caliper brake bleed brake hose ABS parking brake master cylinder",
  "411": "door handle door latch door panel",
  "512": "power window window regulator window motor",
  "515": "door lock central locking actuator",
  "540": "sunroof moonroof roof panel",
  "610": "fuse box relay location power distribution",
  "611": "windshield wiper blade washer pump washer nozzle wiper motor",
  "630": "headlight headlamp tail light bulb fog light",
  "640": "heater blower motor blower resistor climate control air conditioning ac HVAC IHKA IHKR cabin air filter microfilter",
  "721": "airbag SRS warning",
  EWD: "wiring diagram electrical circuit schematic",
};

const additionalGuideSystems: Record<string, string[]> = {
  "e34-blower-speed-diagnosis": ["climate"],
  "e34-cabin-filter-replacement": ["climate"],
  "e34-electric-fan-conversion": ["cooling", "electrical"],
  "e34-525i-five-speed-swap": ["electrical"],
  "e34-540i-six-speed-conversion": ["electrical"],
};
function jobTopics(title: string) {
  if (/ATF service/.test(title)) return 'automatic transmission fluid gearbox oil filter sump';
  if (/Flex disc/.test(title)) return 'guibo rubber coupling driveshaft center centre bearing';
  if (/Rotor/.test(title)) return 'brake disc disk';
  if (/microfilter/i.test(title)) return 'cabin air filter HVAC';
  return '';
}

type RepairSearchRecord = SearchRecord & {
  kind: "Guide" | "Source" | "Diagnostic" | "Manual job";
  scope?: string;
  topics: string;
  systems: string[];
};
const repairSearchRecords: RepairSearchRecord[] = [
  ...manualGuides.map((guide) => ({
    id: guide.slug,
    title: guide.title,
    summary: guide.summary,
    kind: "Guide" as const,
    scope: guide.kind,
    href: "/guides/" + guide.slug,
    system: guide.system,
    systems: [guide.system, ...(additionalGuideSystems[guide.slug] || [])],
    engines: guide.engines,
    topics: guide.searchTerms || guideTopics[guide.slug] || "",
  })),
  ...[...manualChapters, ...manualSource.appendices].map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    summary: "Bentley · " + chapter.printedPages,
    kind: "Source" as const,
    href: "/manual/" + chapter.id,
    systems: chapterSystems(chapter.id),
    topics: chapterTopics[chapter.id] || "",
  })),
  ...manualChapters.flatMap((chapter) =>
    manualJobs(chapter.id).map((job) => ({
      id: chapter.id + "-" + job.anchor,
      title: job.title,
      summary: `Bentley ${chapter.id}-${job.page} · PDF p. ${chapter.pdfStart + job.page - 1}`,
      kind: "Manual job" as const,
      href: `/repairs/${chapter.id}-${job.anchor}`,
      systems: chapterSystems(chapter.id),
      topics: jobTopics(job.title),
    })),
  ),
];

const symptomRoutes = [
  { pattern: /\bbrak(e|ing)\b.*\b(pulsat\w*|vibrat\w*|shak\w*|sinking)\b|\b(sinking|soft) brake pedal\b/, diagnostic: "braking", chapter: "340" },
  { pattern: /\b(steering wheel|front end)\b.*\b(shak\w*|shimmy|vibrat\w*)\b/, diagnostic: "vibration", chapter: "310" },
  { pattern: /\b(window|glass)\b.*\b(drop\w*|fell|stuck)\b/, chapter: "512" },
  { pattern: /\b(blower|heater fan)\b.*\b(high|speed|stopped|dead|wont|won t)\b/, chapter: "640" },
  { pattern: /\b(overheat\w*|temperature rising|running hot)\b/, diagnostic: "overheating", chapter: "170" },
  { pattern: /\b(no crank|no start|wont start|won t start|won t crank)\b/, diagnostic: "no-start", chapter: "121" },
] as const;

const diagnostics: RepairSearchRecord[] = quickSymptoms.map((symptom) => ({
  id: symptom.id,
  title: symptom.title,
  summary: symptom.description,
  kind: "Diagnostic",
  href: "/diagnostics?symptom=" + symptom.id,
  systems: [symptom.system],
  topics: "",
}));

const filler = new Set(
  "a an and at be bmw can car change changing check checking do does e34 fix for from guide help how i in inspect inspection install is it its just me my need of on or please remove repair replace replacement replacing service should the to walkthrough what when where which why will with you your".split(" "),
);
function words(value: string) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\btyres?\b/g, "tire")
    .replace(/\bwaterpump\b/g, "water pump")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.length > 3 && word.endsWith("s") && !/(ss|abs|srs)$/.test(word) ? word.slice(0, -1) : word);
}
const vehicleToken = /^(?:19\d{2}|5\d{2}[a-z]+|m\d{1,2}(?:tu)?|s38|usa)$/;
const indexed = repairSearchRecords.map((record) => ({
  record,
  title: new Set(words(record.title)),
  topics: new Set(words(record.topics)),
  summary: new Set(words(record.summary)),
}));

export function searchRepairReferences(query: string, engine = "", system = "") {
  const queryWords = [...new Set(words(query).filter((word) => !filler.has(word)))];
  const terms = queryWords.filter((word) => !vehicleToken.test(word));
  const selectedEngine = engine || queryWords.find((word) => /^(?:m\d{1,2}(?:tu)?|s38)$/.test(word))?.toUpperCase();
  if (!query.trim())
    return repairSearchRecords.filter((r) => r.kind !== "Manual job" && (!system || r.systems.includes(system)));
  if (!terms.length) {
    return selectedEngine
      ? repairSearchRecords.filter((r) => r.engines?.includes(selectedEngine) && (!system || r.systems.includes(system)))
      : [];
  }
  const symptom = symptomRoutes.find((route) => route.pattern.test(query.toLowerCase().replace(/['’]/g, "")));
  const diagnosis = symptom && "diagnostic" in symptom
    ? diagnostics.find((record) => record.id === symptom.diagnostic && (!system || record.systems.includes(system)))
    : undefined;
  const replacementRequested = /\b(?:replace|replacing|replacement|installing|installation)\b/i.test(query);
  const results = indexed.flatMap(({ record, title, topics, summary }) => {
    if (system && !record.systems.includes(system)) return [];
    if (replacementRequested && record.scope === "inspection") return [];
    if (record.kind === "Source" && terms.length === 1 && record.id.toLowerCase() === terms[0]) {
      return [{ record, score: 100 }];
    }
    if (record.kind === "Source" && record.id === symptom?.chapter) {
      return [{ record, score: 20 }];
    }
    const strengths = terms.map((term) =>
      title.has(term) ? 6 : topics.has(term) ? 4 : summary.has(term) ? 1 : 0,
    );
    const matched = strengths.filter(Boolean).length;
    // Avoid presenting a single generic word as a match to a multi-part job.
    if (matched < Math.ceil(terms.length * 0.75) || !strengths.some((score) => score >= 4)) return [];
    const engineBonus = selectedEngine && record.engines?.includes(selectedEngine) ? 2 : 0;
    return [{ record, score: strengths.reduce<number>((a, b) => a + b, 0) + engineBonus }];
  }).sort((a, b) => b.score - a.score).map(({ record }) => record);
  return diagnosis ? [diagnosis, ...results] : results;
}
