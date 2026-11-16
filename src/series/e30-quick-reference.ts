import type { ServiceLocation } from "../data/quick-reference";
import { e30ElectricalManual, e30ElectricalSupplement, e30Handbook } from "./e30-manual";

export const e30FuseLayout = e30ElectricalManual.url + "#page=12";
export const e30FuseChart = e30ElectricalManual.url + "#page=13";
const fuseRows: [number | null, string][] = [
  [7.5, "Headlights"], [7.5, "Headlights"], [15, "Auxiliary fan"],
  [15, "Check control, glove-box lamp, turn signals and hazards"],
  [30, "Windshield wipers and washer"], [7.5, "Brake lights, cruise control, check control, ABS and map lamp"],
  [15, "Horn"], [30, "Rear window defogger"], [15, "Fuel injection electronics"],
  [7.5, "Instrument gauges and warnings, reversing lamps, starter control, fuel injection, check control, cruise control and on-board computer"],
  [null, "Fuel pump. The BMW chart lists 15 A and the circuit drawing shows 7.5 A. Check the fitted cover and correct wiring edition before replacing it."],
  [7.5, "Radio, antenna, speedometer, indicators and on-board computer"],
  [7.5, "Headlights"], [7.5, "Headlights"], [null, "Unused"], [null, "Unused"],
  [30, "Power windows and sunroof"], [30, "Auxiliary fan"],
  [7.5, "Auxiliary fan, interior lights and power mirrors"], [30, "Heater and A/C blower, auxiliary fan"],
  [7.5, "Interior and trunk lights, radio, antenna, fuel injection, instrument gauges, check control and on-board computer"],
  [7.5, "Front parking lights, tail lights, side markers and check control"],
  [7.5, "Instrument illumination, parking lights, tail lights, side markers, license plate lamps, rear defogger and check control"],
  [15, "Turn signals and hazards"], [null, "Unused"], [null, "Unused"],
  [30, "Interior lights, central locking, radio, antenna and on-board computer"],
  [30, "Cigarette lighter, 12 V socket, radio and antenna"],
  [7.5, "Front fog lights"], [7.5, "Front fog lights"],
];
export const e30FusePositions = fuseRows.map(([amps, circuits], index) => ({
  number: index + 1, panel: "front", amps, circuits,
  status: amps === null ? index === 10 ? "Check source" : "Unused" : "listed",
  source: index === 10 ? "BMW 1989 ETM 0670-1 and 0670-5" : "BMW 1989 ETM 0670-1",
  chart: index === 10 ? e30ElectricalManual.url + "#page=18" : e30FuseChart,
}));
const supplement91: Record<number,{circuits:string;page:number;section:string}> = {
  10: {circuits:"Reverse light switch or automatic range switch, instrument cluster, check control, seatbelt timer and K7 unloader relay",page:10,section:"0670-8"},
  22: {circuits:"Left-side parking, tail and front marker lamps and rear-light check control",page:12,section:"6314-0"},
  23: {circuits:"Right-side parking, tail and front marker lamps, rear-light check control and instrument illumination",page:11,section:"6300-0"},
};
const e30FusePositions1991=e30FusePositions.map(fuse=>{
  const revision=supplement91[fuse.number];
  if(!revision)return fuse;
  return {...fuse,circuits:revision.circuits,source:"BMW 1991 325i ETM · "+revision.section,chart:e30ElectricalSupplement+"#page="+revision.page};
});
export function e30FuseReference({year,model,body}:{year:string;model:string;body:string}) {
  return year==="1991"&&model==="325i"&&["Coupe","Sedan"].includes(body) ? e30FusePositions1991 : e30FusePositions;
}

export const e30FusePanel = {
  id: "front", title: "Power distribution box", location: "Left rear corner of the engine bay, by the firewall.",
  note: "1989 U.S. 325i / 325is layout. Read the fitted cover and the wiring manual for your build.",
};

export const e30RelayLayout = {
  title: "1989 325i / 325is",
  source: "BMW 1989 ETM 0670-0",
  labels: [
    "K1 · Auxiliary fan normal speed", "K2 · Horn", "K3 · High beams", "K4 · Low beams",
    "K5 · Unloader", "K6 · Auxiliary fan high speed", "K7 · Unloader", "K8 · Fog lights",
    "K10 · Wiper control unit",
  ],
};

const workshop = (node: string) => ({ href: "/workshop?reference=e30-325i-coupe-manual&system=system%3Aengine-bay&node=" + encodeURIComponent(node), label: "See it in the engine bay" });
const factory = (page: number, label: string) => ({href: e30Handbook + "#page=" + page, label});
const bay = (key: string) => workshop("e30assembly:engine-bay:" + key);

export const e30FuseLocation: ServiceLocation = {
  id: "front", title: "Fuse and relay box", group: "Engine bay", x: 29, y: 32,
  location: e30FusePanel.location,
  detail: "Look for the rectangular cover near the driver-side hood hinge and firewall. The fuse layout and circuit lookup use the 1989 325i / 325is wiring manual.",
  source: "BMW 1989 Electrical Troubleshooting Manual · 0670-0",
  links: [{href:"/quick-reference/fuses", label:"Open fuse diagram"}, bay("fuse-box")],
};

export const e30Locations: ServiceLocation[] = [
  { id: "oil", title: "Engine oil filler", group: "Engine bay", x: 51, y: 20,
    location: "On top of the M20 rocker cover.", detail: "Check the dipstick on level ground. Allow the oil to settle before taking the reading.",
    source: "BMW 325i owner’s handbook · Engine oil level",
    links: [workshop("e30assembly:engine:rocker-cover"), {href:"/quick-reference/fluids#engine-oil", label:"Oil fill quantity"}] },
  { id: "coolant", title: "Coolant expansion tank", group: "Engine bay", x: 28, y: 17,
    location: "At the left front of the modeled late M20 engine bay.",
    detail: "Check at the tank’s cold-level mark. Early M20 and other engines can use different layouts. Wait until the engine is cold before opening the cap.",
    source: "BMW repair operation 17 00 039 · M20 / M21",
    links: [bay("expansion-tank"), {href:"/guides/e30-cold-cooling-inspection", label:"Cooling system inspection"}] },
  { id: "brake", title: "Brake fluid reservoir", group: "Engine bay", x: 40, y: 30,
    location: "Above the master cylinder, forward of the brake booster.",
    detail: "Look at the level through the reservoir. Check for leaks or unusual pedal travel before driving if the level drops.",
    source: "BMW repair manual · 00-16, Brake test", links: [bay("brake-master")] },
  { id: "steering", title: "Power steering reservoir", group: "Engine bay", x: 37, y: 23,
    location: "Round reservoir between the intake duct and left strut tower.", detail: "Check the cap and installed system for the applicable fluid.",
    source: "1991 325i Coupe original parts catalog · Hydraulic steering oil pipes", links: [bay("power-steering")] },
  { id: "washer", title: "Windshield washer reservoir", group: "Engine bay", x: 71, y: 17,
    location: "Right front corner of the modeled engine bay.", detail: "Use a washer mix for the ambient temperature. Headlight washer equipment varies.",
    source: "BMW 325i owner’s handbook · Washer reservoir", links: [bay("washer-reservoir"), factory(85,"Factory fill quantities")] },
  e30FuseLocation,
  { id: "battery-rear", title: "Battery · 325i coupe", group: "Cabin & luggage", x: 69, y: 86,
    location: "Right side of the luggage compartment, behind the trim in the stock US 325i coupe.",
    detail: "Some E30 models have an underhood battery. Confirm where the battery and positive terminal are fitted before service.",
    source: "BMW 1989 ETM 0670-2 · Battery and junction", links: [bay("positive-junction")] },
  { id: "tires", title: "Tire pressure placard", group: "Cabin & luggage", x: 24, y: 56,
    location: "Check the driver’s door opening for the vehicle tire label.",
    detail: "Use the cold pressure for the fitted tire size and current load.", source: "BMW 325i owner’s handbook · Tire inflation", links: [factory(69,"Owner’s handbook")] },
  { id: "gearbox", title: "Transmission", group: "Underbody", x: 49, y: 42,
    location: "Directly behind the engine under the transmission tunnel.",
    detail: "Check the gearbox label and approved oil. Lifting equipment must support the car safely and keep it level.",
    source: "BMW 325i owner’s handbook · Filling capacities", links: [{href:"/workshop?reference=e30-325i-coupe-manual&system=system%3Atransmission",label:"See the manual gearbox"}, factory(85,"Factory fill quantities")] },
  { id: "differential", title: "Rear final drive", group: "Underbody", x: 50, y: 81,
    location: "Between the rear wheels, at the rear of the driveshaft.",
    detail: "Use the fitted tag to check the ratio and whether the unit is limited slip.",
    source: "BMW 325i owner’s handbook · Filling capacities", links: [{href:"/workshop?reference=e30-325i-coupe-manual&system=system%3Adifferential",label:"See the rear final drive"}, factory(85,"Factory fill quantities")] },
  { id: "center-support", title: "Driveshaft center support", group: "Underbody", x: 50, y: 55,
    location: "In the center tunnel at the two-piece driveshaft joint.",
    detail: "The mount includes a rubber support, bracket and bearing. Use the relevant procedure before removing the shaft.",
    source: "BMW repair manual · 26 12 001", links: [{href:"/guides/e30-driveshaft-center-support",label:"Inspection and source drawings"}, {href:"/workshop?reference=e30-325i-coupe-manual&node=e30assembly%3Apropeller%3Acenter-mount",label:"See the center support"}] },
];
