import type{ManualGuide}from'../data/manual';
import {e30FactoryGuides} from './e30-factory-guides.ts';
import { e30ServiceGuides } from './e30-service-guides';
export const e30RepairJobs=[
 {id:'e30-m20-alternator-terminals',title:'M20 alternator terminals',systems:['electrical'],engines:['M20']},
 {id:'e30-m20-starter-terminals',title:'M20 starter terminals',systems:['electrical'],engines:['M20']},
 {id:'e30-manual-gearbox-fluid',title:'Getrag 260 manual gearbox oil',systems:['drivetrain'],engines:['M20']},
 {id:'e30-m20-spark-plugs',title:'M20 spark plug service',systems:['engine'],engines:['M20']},
 {id:'e30-m20-timing-belt',title:'M20 timing belt replacement',systems:['engine'],engines:['M20']},
 {id:'e30-driveshaft-center-support',title:'Driveshaft center support inspection and replacement reference',systems:['drivetrain'],engines:['M20']},
 {id:'e30-m20-clutch',title:'Manual clutch and release bearing replacement',systems:['drivetrain'],engines:['M20']},
 {id:'e30-rear-brake-pads-discs',title:'Rear brake pad and disc replacement',systems:['brakes'],engines:[]},
 {id:'e30-front-brake-pads-discs',title:'Front brake pad and disc replacement',systems:['brakes'],engines:[]},
 {id:'e30-brake-fluid-flush',title:'Brake fluid flush and bleeding',systems:['brakes'],engines:[]},
 {id:'e30-handbrake-adjustment',title:'Parking brake shoe inspection and adjustment',systems:['brakes'],engines:[]},
 {id:'e30-rear-brake-shoes',title:'Rear drum brake shoe replacement',systems:['brakes'],engines:[]},
 {id:'e30-brake-caliper-rebuild',title:'Brake caliper inspection and rebuilding',systems:['brakes'],engines:[]},
 {id:'e30-m20-valve-clearance',title:'M10 and M20 valve clearance adjustment',systems:['engine'],engines:['M10','M20']},
 {id:'e30-s14-valve-clearance',title:'S14 valve clearance and shim adjustment',systems:['engine'],engines:['S14']},
 {id:'e30-cooling-system',title:'Cooling system inspection and component identification',systems:['cooling'],engines:[]},
 {id:'e30-suspension-reference',title:'Suspension inspection and component reference',systems:['suspension'],engines:[]},
] as const;
const bmw='https://www.bmwgroup-classic.com/en/services/spare-parts/bmw.html';
export const e30Guides:ManualGuide[]=[{
 slug:'e30-identify-your-configuration',title:'Identify an E30 configuration before ordering parts',system:'engine',engines:['M10','M20','M21','M40','M42','S14'],level:'Beginner',duration:'15–30 min',durationBasis:'Time to record visible details; obtaining an original build record may take longer.',kind:'reference',summary:'Record the actual engine, body, production details and drivetrain before choosing an E30 source.',reviewStatus:'draft',sourceChecked:true,applicability:'E30 identification only. A model badge is not proof of an installed engine, factory equipment or part compatibility.',source:{id:'e30-manufacturer-configuration',title:'BMW Group Classic model archive and manufacturer application evidence',section:'Named E30 model entries and type-code rows; no manual page numbers inferred',pdfPages:[]},evidence:[{label:'BMW model and type-code evidence',href:'/models'},{label:'BMW original parts references',href:bmw}],tools:['Camera','Paper or a device for notes','Original build/service records if available'],cautions:['Work with the engine off and cool. Do not reach near fans or belts.','Do not publish a full VIN or personal registration details in a public post.'],steps:[{title:'Record the car and source of each detail',body:'Note the model, body, build month, market and steering. Mark an uncertain detail unknown. Keep factory equipment codes separate from later modifications.',check:'Every recorded value has a document, marking or visible feature behind it.'},{title:'Check the installed engine and drivetrain',body:'Compare engine identification and service records with the manufacturer model evidence. Treat an engine swap separately. The 318i can have different four-cylinder families; M3/320is S14 and 325iX AWD need distinct references.',check:'The selected source matches the installed family or the uncertainty is recorded.'},{title:'Open the correct source and compare the actual item',body:'Use the model/type evidence, then compare the full BMW number, source production restrictions and equipment notes. Preserve the exact source link in your private notes. A similar-looking part or shared engine family does not establish interchange.',check:'No unknown configuration has been turned into a confirmed ordering claim.'}]},
{slug:'e30-cold-cooling-inspection',title:'E30 cold cooling-system visual inspection',system:'cooling',engines:['M10','M20','M21','M40','M42','S14'],level:'Beginner',duration:'15–25 min',durationBasis:'Visual inspection estimate; pressure testing or repair is outside this procedure.',kind:'inspection',summary:'With a cold, stopped engine, record visible leaks and identify the installed cooling layout before choosing a repair.',reviewStatus:'draft',sourceChecked:true,applicability:'E30 visual inspection. Pump, expansion tank, hoses and thermostat differ by engine/build; no removal, pressure test or hot-system work is included.',source:{id:'e30-cooling-reference',title:'E30 cooling reference and manufacturer component listings',section:'Cooling layout and engine-specific component evidence; exact repair-manual locator not yet verified',pdfPages:[]},evidence:[{label:'E30 Zone original cooling reference',href:'https://www.e30zone.net/e30wiki/index.php/Cooling'},{label:'BMW expansion-tank application source',href:'https://shop.bmw.co.uk/product/genuine-radiator-expansion-tank-17-11-1-712-641'}],tools:['Torch','Camera','Gloves','Paper or a device for notes'],cautions:['If the engine overheated, stop it and allow it to cool completely. Never open a hot pressurized cooling system.','Keep hands away from fans and belts. Do not start an engine to provoke an overheating symptom.'],steps:[{title:'Make the inspection safe',body:'Park safely, switch off the engine and wait until it is fully cold. If there was steam, rapid coolant loss or a red temperature reading, arrange assessment rather than continuing to drive.',check:'The engine is off, fully cold and safe to observe.'},{title:'Record the installed layout and visible evidence',body:'Photograph the expansion tank, hose routes and accessible pump/thermostat area without dismantling. Note wet areas, residue, damaged hoses and visible belt condition. Record where evidence begins; a nearby wet component is not automatically the cause.',check:'Notes distinguish a visible observation from a diagnosis.'},{title:'Choose the next verified procedure',body:'Match the installed engine and source application before selecting a pump or thermostat. M20 belt work and M42 cooling work follow different procedures. Use the applicable manual for pressure testing, bleeding and tightening values; these have not been established by a visual check.',check:'The repair source matches the configuration and missing specifications remain explicit.'}]}];

export const e30CenterSupportGuide: ManualGuide = {
  slug: "e30-driveshaft-center-support",
  title: "Inspect the driveshaft center support",
  system: "drivetrain",
  engines: ["M20"],
  level: "Intermediate",
  duration: "20–40 min inspection",
  durationBasis: "Estimate for visual checks with safe access. Shaft removal, bearing work and road testing take additional time.",
  kind: "inspection",
  summary: "Find the support at the shaft joint, inspect the rubber and mounting bracket, and find the illustrated replacement procedure.",
  reviewStatus: "draft",
  sourceChecked: true,
  applicability: "Rear-wheel-drive E30 325i with the illustrated two-piece shaft. Confirm flange, bearing and bracket details from your build. The iX and M3 need their own catalog and procedure checks.",
  source: {
    id: "e30-factory-propeller-shaft",
    title: "BMW E30 Repair Manual · Propeller shaft",
    section: "26-03 through 26-04 for shaft removal, 26-10 through 26-11 for the center mount",
    pdfPages: [],
  },
  evidence: [
    { label: "BMW center mount replacement · page 26-10", href: "https://e30mpower.com/26%20-%20Propellor%20Shaft/26-10.jpg" },
    { label: "BMW center mount replacement · page 26-11", href: "https://e30mpower.com/26%20-%20Propellor%20Shaft/26-11.jpg" },
  ],
  tools: ["Torch", "Inspection mirror", "Camera", "Lift or rated vehicle supports for underbody access"],
  cautions: ["Never work underneath a vehicle supported only by a jack.", "Let the exhaust cool. Support the shaft before loosening the bracket.", "Separation, reassembly and preload require the complete procedure and specified tools."],
  steps: [
    { title: "Locate the complete center mount", body: "With the vehicle safely supported, identify the bracket at the center joint of the two-piece shaft. Match the bearing, rubber and mounting ears to the catalog callout.", check: "The bracket is distinguished from the front flex disc and the loose bearing." },
    { title: "Inspect the rubber and bracket", body: "Look for split or detached rubber, witness marks from contact, and bent or loose mounting ears. Check the nearby flex disc visually as well. Record visible observations before choosing the repair.", check: "Photographs show the support and its location." },
    { title: "Match the source before removing the shaft", body: "Check the build date and hardware, then consult the linked BMW removal and replacement pages. Plan to support the shaft and retain the relative alignment of both halves. Use the specified puller and fitting tools, the applicable preload and all tightening values from the procedure.", check: "You have the procedure, tools and applicable specifications for the installed shaft." },
  ],
};
e30Guides.push(e30CenterSupportGuide,...e30FactoryGuides,...e30ServiceGuides);
