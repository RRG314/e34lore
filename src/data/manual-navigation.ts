import { manualChapters, manualGuides } from "./manual";
import { systems } from "./catalog";
export function chapterSystems(id: string): string[] {
  const c = manualChapters.find((c) => c.id === id);
  if (id === "EWD") return ["electrical"];
  if (["010", "020", "INDEX"].includes(id)) return systems.map((s) => s.id);
  if (["130", "160", "120"].includes(id)) return ["engine", "electrical"];
  if (id === "180") return ["engine"];
  if (id === "320") return ["suspension"];
  if (["513", "520", "720"].includes(id)) return ["body"];
  if (id === "721") return ["body", "electrical"];
  if (id === "300") return ["suspension", "brakes"];
  return c && systems.some((s) => s.id === c.system) ? [c.system] : [];
}
export function chapterGuides(id: string) {
  const c = manualChapters.find((c) => c.id === id);
  return c
    ? manualGuides.filter((g) =>
        g.source.pdfPages.some((p) => p >= c.pdfStart && p <= c.pdfEnd),
      )
    : [];
}
export const chapterAssemblies: Record<string, string[]> = {
  170: ["water-pump", "radiator-service"],
  310: ["front-strut", "front-strut-upper", "front-strut-damper"],
  340: [
    "front-brake",
    "front-brake-disc",
    "front-caliper-service",
    "rear-caliper-service",
    "master-cylinder-service",
    "parking-brake-service",
  ],
};
export const sourceOrientations: Record<
  string,
  { title: string; locator: string; paragraphs: string[]; record: string[] }
> = {
  "020": {
    title: "Organize maintenance by the work area",
    locator: "Printed 020-1 · PDF 23",
    paragraphs: [
      "The maintenance chapter separates engine-bay, under-car and body/interior work. Use those work areas to organize an inspection record before choosing the full procedure for the installed engine and equipment.",
      "Keep the car’s observed condition, the source you consulted and the work actually performed as separate entries. My Garage can record service dates, odometer readings, installed parts and the next date or mileage you choose. It does not supply a factory service schedule from this contents page.",
    ],
    record: [
      "Installed engine and relevant equipment",
      "Work date and odometer reading",
      "Observed condition, source locator and parts used",
      "Next check chosen from the applicable full schedule",
    ],
  },
  "600": {
    title: "Keep electrical observations tied to the car",
    locator: "Printed 600-1 · PDF 375",
    paragraphs: [
      "The electrical overview distinguishes where the supply path or load is being investigated: before a fuse, between the fuse and load, or at the load and its ground. This is a useful way to make a fault report precise. A symptom alone does not identify which section failed.",
      "Record which function failed, whether the failure is intermittent and which conditions reproduce it. A fuse check, connection observation and electrical measurement are different evidence. Include the actual test points and units when a qualified test is performed; use the matching circuit and full test method before drawing a conclusion.",
    ],
    record: [
      "Model, production period, installed engine and modifications",
      "Function affected and repeatable conditions",
      "Exact test point, units and observed value if measured",
      "Matching circuit/source locator and what remains unknown",
    ],
  },
  "610": {
    title: "Match the installed fuse and relay arrangement",
    locator: "Printed 610-1 · PDF 381",
    paragraphs: [
      "The manual separates front and rear power distribution, auxiliary relay locations and the electronics box. The opening page shows different front-box arrangements and calls out V8 differences. A position from another E34 can therefore be the wrong reference for the car in front of you.",
      "Start with the installed cover, location and markings, then match the applicable source arrangement. Keep the printed chapter and circuit reference with a question. A relay’s location or appearance does not establish its OEM identity, rating or interchange, and this overview does not provide a universal map for every year.",
    ],
    record: [
      "Production period, engine and relevant optional equipment",
      "Physical box location and installed cover markings",
      "Printed fuse/relay designation as observed",
      "Applicable circuit/source arrangement and unresolved differences",
    ],
  },
  "640": {
    title: "Identify the installed heating and air conditioning system",
    locator: "Printed 640-1 · PDF 413",
    paragraphs: [
      "The manual distinguishes IHKR variants from IHKA. These systems have different control and service references, so “E34 heater problem” is not enough context for selecting a blower, control or air-conditioning procedure.",
      "Record the installed control panel and known modifications alongside the car’s production period and engine. Use the relevant full procedure once the configuration is established. This identification reference supplies no refrigerant quantity, electrical test limit or component-removal instruction.",
    ],
    record: [
      "Installed control-panel arrangement and known system identification",
      "Production period and installed engine",
      "Which fan speeds, temperatures or air directions are affected",
      "Whether heating, ventilation or air conditioning is involved",
    ],
  },
};
