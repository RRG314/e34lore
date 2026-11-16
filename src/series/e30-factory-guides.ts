import type { ManualGuide } from "../data/manual";
import { e30FactoryManualArchive, e30Handbook } from "./e30-manual.ts";

export const e30FactorySourceHash = "fa72b3321315a2f2a0f4df6d6879eae4ec7c639f8b0f6f41fd154adcb0a4f095";
const manual = e30FactoryManualArchive.download;
const oilPanDiagram = "https://www.bmwpartsdeal.com/parts-list/1991-bmw-325i-coupe_e30/engine/oil_pan_oil_level_indicator.html";
const filterSpecification = "https://www.mann-filter.com/us-en/catalog/search-results/product.html/w719/15_mann-filter.html";
const drainPlugSpecification = "https://media.swg.de/Marketing/Katalog/KFZ_KAT_EN_77720040175_Befestigung.pdf";
const oilDrainSocket = "17 mm six-point socket for the listed BMW 11 13 1 273 093 plug";
const oilFilterTool = "Strap-type oil filter wrench that fits the installed canister (76 mm outside diameter for MANN W 719/15)";
const oilManual = {printed:"00-15",pdf:22,href:"/manual/00?pdf=22"};
const airManual = {printed:"13-39",pdf:272,href:"/manual/13?pdf=272"};

export const e30FactoryGuides: ManualGuide[] = [
  {
    slug: "e30-rear-lamp-bulb", title: "Replace a rear lamp bulb", system: "electrical",
    engines: ["M10","M20","M21","M40","M42","S14"], level: "Beginner", kind: "replacement",
    duration: "15–25 min", durationBasis: "Estimate for access, replacement and a lamp check on the late coupe.",
    summary: "Reach the lamp carrier from inside the trunk and replace the bulb for the failed circuit.",
    reviewStatus: "draft", sourceChecked: true,
    applicability: "Late E30 325i coupe with the 1988-on rear lamp carrier. Check the actual lamp, build date and bulb markings. The early body, M3 and some convertibles use different assemblies.",
    source: {id:"e30-factory-repair-upload", title:"BMW E30 Repair Manual", section:"63-7 · 1988-on rear lamp bulb access", pdfPages:[1192]},
    evidence: [
      {label:"BMW 1991 325i coupe rear lamp diagram",href:"https://www.bmwpartsdeal.com/parts-list/1991-bmw-325i-coupe_e30/lighting/rear_light.html"},
      {label:"See the left rear lamp on the car",href:"/workshop?node=e30body%3Atail-light-left"},
      {label:"BMW workshop manual download",href:manual},
    ],
    tools: ["Flashlight","Correct replacement bulb","Clean cloth","Helper for brake and reverse checks"],
    cautions: ["Park, set the parking brake and switch the lamps and ignition off before touching the holder.", "Let the bulb cool. Avoid forcing the carrier or fitting a different wattage."],
    steps: [
      {title:"Identify the circuit that failed",body:"Compare the two sides with the parking lights, hazards and brake lamps operated separately. If testing the reverse lights, secure the car and have a helper observe with the engine off.",check:"You know which function and side have failed."},
      {title:"Release the trunk-side cover",body:"Open the trunk and turn the fastener on the cover behind the affected lens. Lift out the cover and expose the bulb carrier. Compare the installed layout with the rear lamp diagram.",check:"The carrier is accessible without levering the exterior lens."},
      {title:"Match and replace the bulb",body:"Remove the bulb from the affected socket. Match the wattage, base and contact arrangement to the original and the catalog. Check that the contacts and carrier are clean, dry and intact. Fit the matching bulb and refit the cover.",check:"The bulb seats securely and the cover fastens without force."},
      {title:"Test every function on that side",body:"Switch the circuits on one at a time with a helper. If a lamp still fails or the carrier is damaged, check the matching wiring diagram and connector before replacing anything else.",check:"The repaired lamp, its neighboring lamps and any check-control warning behave normally."},
    ],
    jobSupport: {
      reviewedOn:"2026-11-11", sourceSha256:e30FactorySourceHash,
      requiredParts:["Bulb with the wattage, base and contacts listed for the fitted lamp"],
      conditionalParts:["Bulb carrier or gasket if the housing shows damage or water entry"],
      stopConditions:["The socket is melted, heavily corroded or wet.","The replacement base or contacts differ from the fitted bulb."],
      steps:[
        {number:1,tools:["Helper"],source:{printed:"00-16",pdf:23,href:manual}},
        {number:2,tools:["Flashlight"],source:{printed:"63-7",pdf:1192,href:manual}},
        {number:3,tools:["Matching bulb","Clean cloth"],source:{printed:"63-7",pdf:1192,href:manual}},
        {number:4,tools:["Helper"],source:{printed:"00-16",pdf:23,href:manual}},
      ],
    },
  },
  {
    slug: "e30-oil-service", title: "M20 oil and filter change preparation", system: "engine",
    engines:["M20"], level:"Beginner", kind:"reference",
    duration:"15–25 min preparation", durationBasis:"Time to identify the fitted hardware and gather supplies. Drain and refill time varies.",
    summary:"Match the filter and drain hardware, then find the factory fill quantities and service checks.",
    reviewStatus:"draft", sourceChecked:true,
    applicability:"US 325i / 325is M20 handbook figures. Identify the installed sump and filter, especially on a swapped engine.",
    source:{id:"e30-factory-repair-upload",title:"BMW E30 Repair Manual",section:"00-15 · Engine oil service, operation 00 00 249",pdfPages:[22]},
    evidence:[
      {label:"BMW 325i handbook · filling capacities, p. 84",href:e30Handbook+"#page=85"},
      {label:"BMW 1991 325i oil filter diagram",href:"https://www.bmwpartsdeal.com/parts-list/1991-bmw-325i-coupe_e30/engine/lubrication_system_oil_filter.html"},
      {label:"Oil pan and original drain plug diagram",href:oilPanDiagram},
      {label:"Find the oil filter and sump in Workshop",href:"/quick-reference/model?focus=oil-change"},
      {label:"Oil filler location",href:"/quick-reference/locations?point=oil"},
    ],
    tools:[oilDrainSocket,oilFilterTool,"Torque wrench that covers the installed plug specification","Drain pan of at least 5 L","Funnel","Gloves and eye protection"],
    cautions:["Use level ground for the final oil reading and rated supports if access requires lifting.", "Avoid hot oil. Check plug thread and tightening specification against the installed sump."],
    steps:[
      {title:"Identify the service parts",body:"Compare the fitted filter, drain plug and seal against the two catalog drawings. The listed M12 × 1.5 BMW plug takes a 17 mm socket. Check replacement plug heads and filter canister dimensions before choosing a tool.",check:"The socket seats fully and the filter, drain plug and new seal match the installed parts."},
      {title:"Check the handbook fill amount",body:"The 325i handbook lists 4.25 L with the filter changed, or 4.0 L without. Confirm the procedure for the installed sump and use the dipstick for the final level.",check:"You have enough oil and a way to verify the level."},
      {title:"Plan the final checks",body:"After following the service procedure, check for leaks at the filter and drain plug. On level ground, allow oil to drain back and recheck the dipstick. Take used oil and the filter to an approved collection point.",check:"The level is in range and the filter and drain plug stay dry."},
    ],
    jobSupport:{
      reviewedOn:"2026-11-14", sourceSha256:e30FactorySourceHash,
      requiredParts:["Engine oil to the applicable BMW specification","Matched spin-on oil filter","New drain plug sealing washer"],
      conditionalParts:["Replacement plug if the head, threads or sealing face are damaged"],
      stopConditions:["The sump or drain plug differs from the catalog and you cannot establish the matching specification.","The plug turns without tightening, or the old filter seal has not come off with the old filter."],
      additionalSources:[{title:"SWG catalog · 17 mm hex for BMW 11 13 1 273 093",url:drainPlugSpecification},{title:"MANN W 719/15 size and fitment",url:filterSpecification}],
      steps:[
        {number:1,tools:[oilDrainSocket,oilFilterTool],source:oilManual},
        {number:2,tools:["Drain pan of at least 5 L","Funnel"],source:{printed:"Handbook p. 84",pdf:85,href:e30Handbook+"#page=85"}},
        {number:3,tools:["Gloves and eye protection"],source:oilManual},
      ],
    },
  },
  {
    slug:"e30-air-filter", title:"Replace the M20 engine air filter", system:"engine",
    engines:["M20"], level:"Beginner", kind:"replacement",
    duration:"10–20 min", durationBasis:"Estimate for an intact stock clip-fastened housing.",
    summary:"Open the airbox, fit the correct panel filter and check the lid seal.",
    reviewStatus:"draft", sourceChecked:true,
    applicability:"1991 325i M20 with the stock clip-fastened airbox. Check that the lid and filter match the catalog before opening.",
    source:{id:"e30-factory-repair-upload",title:"BMW E30 Repair Manual",section:"13-39 to 13-40 · 13 72 001, replacing the air filter element",pdfPages:[272,273]},
    evidence:[
      {label:"Open air cleaner and filter on the car",href:"/workshop?reference=e30-325i-coupe-manual&node=e30assembly%3Aengine-bay%3Aair-filter"},
      {label:"Find the installed air filter in the OEM catalog",href:"/parts/catalog?part=bmw-13721720861"},
    ],
    tools:["Flashlight","Clean lint-free cloth"],
    cautions:["Switch the engine off before opening the airbox. Keep dust and loose objects out of the clean side of the intake."],
    steps:[
      {title:"Open the clips",body:"If the intake funnel traps the lid as shown on page 13-39, turn the funnel a quarter turn and slide it forward. Release the airbox lid clips by hand and lift the lid enough to withdraw the filter. Keep the air meter wiring and duct supported.",check:"The lid lifts without pulling on a wire, duct or clip."},
      {title:"Replace the element",body:"Lift the old element out and wipe loose debris from the dirty side of the housing. Seat the new element flat in the same orientation, with its sealing edge fully in the channel.",check:"No corner of the seal is rolled or standing proud."},
      {title:"Close and check the airbox",body:"Set the lid squarely onto the filter and close all clips. Refit the intake funnel if you moved it. Check that the outlet duct has stayed seated.",check:"The lid closes flush, the clips hold and both ducts are secure."},
    ],
    jobSupport:{
      reviewedOn:"2026-11-14", sourceSha256:e30FactorySourceHash,
      requiredParts:["Panel filter matched to the installed airbox"],
      conditionalParts:["Lid clip or intake duct if cracked or unable to seal"],
      stopConditions:["The lid binds, the clips are broken, or the new filter does not sit flat."],
      steps:[
        {number:1,tools:["Flashlight"],source:airManual},
        {number:2,tools:["Clean lint-free cloth"],source:airManual},
        {number:3,tools:["Flashlight"],source:airManual},
      ],
    },
  },
];
