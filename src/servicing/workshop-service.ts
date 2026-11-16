import {manualGuides} from '../data/manual';
import {e30Guides} from '../series/e30-repairs';
import {e30Handbook} from '../series/e30-manual';
import type {Series} from '../series/registry';

export type ServiceLink = {label: string; href: string};
type ServiceJob = {
  title: string;
  tools?: readonly string[];
  guide?: string;
  manual: ServiceLink;
};
type PartService = {
  facts?: readonly {label:string; value:string; source?:ServiceLink}[];
  check?: string;
  jobs: ServiceJob[];
};

const e34Manual = (chapter: string, label: string, pdf?: number): ServiceLink =>
  ({label, href:'/manual/'+chapter+(pdf ? '?pdf='+pdf : '')});
const e30Manual = (group: string, label: string, pdf?: number): ServiceLink =>
  ({label, href:'/manual/'+group+(pdf ? '?pdf='+pdf : '')});
const e30HandbookPage = (pdf: number, label: string): ServiceLink =>
  ({label, href:e30Handbook+'#page='+pdf});
const e30Repair = (slug: string, label: string): ServiceLink => ({label,href:'/repairs/'+slug});
const bmwE34Tires = {label:'BMW E34 tire listings',href:'https://myair-bdr.bmwgroup.com/static/manual/RadReif/RadReif/00/reifenfabrikate_alte.htm'};
const e30Tires = e30HandbookPage(70,'BMW handbook · tire and wheel sizes, p. 69');
const boschBlades = {label:'Bosch North America blade catalog',href:'https://www.boschautoparts.com/documents/647135/656897/2025%20Bosch%20Wiper%20Blade%20Catalog.pdf'};
const placard = 'Check your tire sidewalls and door-pillar placard. Use the cold pressure for the fitted sizes, axle and load.';
const bladeTools = ['Folded towel to protect the glass','Matching replacement blade','Water or washer fluid'];
const brakeInspection = ['Wheel chocks','Rated jack and stands','Wheel socket and torque wrench','Pad gauge and brake disc micrometer'];

type NodeIdentity = {id:string; systemIds:string[]};
const e34Jobs: [RegExp,string,ServiceLink][] = [
  [/^(?:e34sys:airbox|e34sys:air-filter-element)$/, 'engine-air-filter-replacement', e34Manual('020','Bentley · air filter, 020-10',32)],
  [/^m50:(?:oil-filter|oil-pan|drain-plug)/, 'm50-engine-oil-and-filter', e34Manual('020','Bentley · oil and filter, 020-9',31)],
  [/^m50:spark-plug/, 'm50-spark-plug-replacement', e34Manual('020','Bentley · spark plugs, 020-10',32)],
  [/^m50:(?:accessory-belt|belt-tensioner)/, 'accessory-drive-belt-inspection', e34Manual('020','Bentley · accessory belts, 020-12',34)],
  [/^e34(?:bay:brake-reservoir|sys:brake-booster-master)$/, 'brake-fluid-level-inspection', e34Manual('020','Bentley · brake reservoir, 020-15',37)],
  [/^e34(?:bay:steering-reservoir|sys:power-steering-reservoir)/, 'power-steering-fluid-level-inspection', e34Manual('020','Bentley · steering fluid, 020-15',37)],
  [/^e34(?:sys:expansion-tank|bay:expansion-tank)/, 'cooling-system-visual-check', e34Manual('170','Bentley · cooling system')],
  [/^e34(?:bay:washer-tank|sys:washer-pump)/, 'windshield-washer-pump', e34Manual('611','Bentley · washers, 611-8',394)],
  [/^e34body:headlamp-/, 'factory-halogen-headlight-bulb', e34Manual('630','Bentley · exterior lighting')],
  [/^e34body:tail-light-/, 'sedan-tail-lamp-bulb', e34Manual('630','Bentley · exterior lighting')],
  [/^e34sys:brake-(?:pad|disc)-/, 'brake-pad-and-rotor-inspection', e34Manual('340','Bentley · disc brakes')],
  [/^e34sys:(?:battery|positive-junction)/, 'battery-connections-first-check', e34Manual('121','Bentley · battery, 121-1',163)],
];

const e30Jobs: [RegExp,ServiceJob][] = [
  [/^e30assembly:(?:engine:oil-filter|engine:sump)/, {title:'Engine oil and filter service',guide:'e30-oil-service',manual:e30Manual('00','BMW factory manual · oil service, 00-15',22)}],
  [/^e30assembly:(?:engine-bay:airbox|engine-bay:air-filter)/, {title:'Replace the air filter',guide:'e30-air-filter',manual:e30Manual('13','BMW factory manual · air filter, 13-39',272)}],
  [/^e30assembly:engine:(?:spark-plug|ignition)/, {title:'Spark plug service',tools:['20.8 mm (13/16 in) spark-plug socket for NGK ZGR5A','Extension and torque wrench'],manual:{label:'NGK · ZGR5A wrench size and plug specifications',href:'https://www.ngkntk.com/part-finder/quad-atv/spark-plugs/bush-hog/trail-hunter-zgr5a-1/'}}],
  [/^e30assembly:engine:timing$/, {title:'M20 timing belt replacement',manual:e30Manual('11','BMW factory manual · M20 timing belt, 11-66a',110)}],
  [/^e30assembly:engine-bay:(?:expansion-tank|radiator-hose)/, {title:'Cold cooling-system inspection',guide:'e30-cold-cooling-inspection',manual:e30Repair('e30-coolant-bleeding','BMW factory manual · filling and bleeding')}],
  [/^e30assembly:engine-bay:brake-master/, {title:'Check brake fluid level',tools:['Flashlight'],manual:e30Repair('e30-roadworthiness-check','BMW factory manual · safety checks, 00-16')}],
  [/^e30assembly:front-(?:left|right):(?:rotor|caliper|pad)/, {title:'Inspect front pads and discs',tools:brakeInspection,manual:e30Manual('34','BMW factory manual · front pads and discs, 34-4',643)}],
  [/^e30assembly:rear-(?:left|right):(?:rotor|caliper|pad)/, {title:'Inspect rear pads and discs',tools:brakeInspection,manual:e30Manual('34','BMW factory manual · rear pads and discs, 34-8',647)}],
  [/^e30assembly:rear-(?:left|right):damper$/, {title:'Replace a rear shock absorber',tools:['Rated stands','Support jack for the trailing arm','Match sockets to the upper and lower mounts before lifting'],manual:e30Manual('33','BMW factory manual · rear shocks, 33-16',636)}],
  [/^e30assembly:rear-(?:left|right):spring$/, {title:'Service a rear coil spring',manual:e30Manual('33','BMW factory manual · rear springs, 33-17',637)}],
  [/^e30assembly:rear-final-drive:(?:case|rear-cover)$/, {title:'Remove or install the final drive',tools:['Rated stands','Jack to support the final drive','Sockets and torque wrench'],manual:e30Repair('e30-rear-final-drive','BMW factory manual · final drive, 33-1')}],
  [/^e30body:tail-light-/, {title:'Replace the rear bulb',guide:'e30-rear-lamp-bulb',manual:e30Manual('63','BMW factory manual · rear lamps, 63-7',1192)}],
  [/^e30body:(?:headlamps?|headlight)-/, {title:'Service the headlight',tools:['Clean cloth','Screwdriver that fits the fitted retainer'],manual:e30HandbookPage(61,'BMW handbook · headlight replacement, p. 60')}],
  [/^e30assembly:engine-bay:washer-reservoir$/, {title:'Check washer level',tools:['Washer fluid','Clean funnel'],manual:e30HandbookPage(55,'BMW handbook · washer fluid tank, p. 54')}],
  [/^e30assembly:engine-bay:power-steering/, {title:'Check the steering reservoir',tools:['Flashlight','Clean lint-free cloth'],manual:e30Repair('e30-roadworthiness-check','BMW factory manual · steering inspection')}],
  [/^e30assembly:(?:engine-bay:positive-junction|luggage:battery)/, {title:'Inspect battery connections',tools:['Flashlight','Eye protection'],manual:e30HandbookPage(56,'BMW handbook · battery access, p. 55')}],
];

export function workshopGuide(series:Series, slug:string) {
  return (series==='e30' ? e30Guides : manualGuides).find(guide=>guide.slug===slug);
}

export function workshopPartService(series:Series,node:NodeIdentity,referenceId?:string):PartService | undefined {
  const {id}=node, e30=series==='e30';
  const stockReference=e30 ? referenceId==='e30-325i-coupe-manual'
    : referenceId==='e34-525i-sedan-automatic'||referenceId==='e34-reconstruction-reference';
  if (/^(?:wheel:(?:front|rear)-(?:left|right)|e30assembly:(?:front|rear)-(?:left|right):wheel)$/.test(id)) {
    return {
      ...(stockReference ? {facts:[{label:'Reference tire size',value:e30?'195/65 R14':'205/65 R15',source:e30?e30Tires:bmwE34Tires}]} : {}),
      check:placard,
      jobs:[
        {title:'Check cold tire pressure',tools:['Tire pressure gauge','Air supply'],guide:e30?undefined:'cold-tire-pressure-check',
          manual:e30?e30HandbookPage(86,'BMW handbook · cold tire pressures, p. 85'):e34Manual('020','Bentley · tire pressures, 020-16',38)},
        {title:'Remove or install the wheel',tools:['Wheel chock','Correct jack and support','Socket for the fitted wheel bolts and a calibrated torque wrench'],
          manual:e30?e30HandbookPage(58,'BMW handbook · changing a wheel, pp. 57–58'):e34Manual('020','Bentley · wheels and tires, 020-16',38)},
      ],
    };
  }
  if (/^(?:e30body:wipers|(?:e30|e34)body:wiper-(?:blade|arm)-(?:left|right))$/.test(id)) {
    return {
      ...(stockReference ? {facts:[{label:e30?'Front blade size':'Bosch front set',
        value:e30?'500 mm each (nominal 20 in)':'3397118302 · 600 mm pair',source:boschBlades}]} : {}),
      check:'Compare both lengths and the attachment on each installed arm.',
      jobs:[{title:'Replace the front blade',tools:bladeTools,guide:e30?undefined:'windshield-wiper-blade-replacement',
        manual:e30?e30HandbookPage(60,'BMW handbook · wiper blades, p. 59'):e34Manual('611','Bentley · wiper blades, 611-1',387)}],
    };
  }
  const fuse=id.match(/^e30assembly:engine-bay:fuse-(\d{1,2})$/)?.[1];
  if(fuse){
    return {jobs:[{title:'Identify fuse F'+fuse,tools:['Fuse puller','Flashlight'],
      manual:{href:'/quick-reference/fuses?panel=front&fuse='+fuse,label:'BMW layout and circuit for F'+fuse}}]};
  }
  if (/(?:^e34(?:sys|bay):front-fuse|^e30assembly:engine-bay:fuse-box)/.test(id)) {
    return {jobs:[{title:'Identify a fuse',tools:['Fuse puller','Flashlight'],
      manual:{href:'/quick-reference/fuses?panel=front',label:'Factory fuse-box layout and circuit chart'}}]};
  }
  if (e30) {
    const row=e30Jobs.find(([pattern])=>pattern.test(id));
    return row ? {jobs:[row[1]]} : undefined;
  }
  const row=e34Jobs.find(([pattern])=>pattern.test(id));
  const guide=row&&workshopGuide(series,row[1]);
  return row&&guide ? {jobs:[{title:guide.title,guide:guide.slug,manual:row[2]}]} : undefined;
}

const manualSystems: [string, ServiceLink, ServiceLink][] = [
  ['braking', e34Manual('340','Bentley · brakes'), e30Manual('34','BMW factory manual · brakes')],
  ['transmission', e34Manual('240','Bentley · transmission'), e30Manual('23','BMW factory manual · manual transmission')],
  ['driveshaft', e34Manual('260','Bentley · driveshaft'), e30Repair('e30-driveshaft-center-support','BMW factory manual · driveshaft')],
  ['differential', e34Manual('331','Bentley · final drive'), e30Repair('e30-rear-axle-layout','BMW factory manual · rear axle drawing, 33-0')],
  ['cooling', e34Manual('170','Bentley · cooling system'), e30Manual('17','BMW factory manual · cooling')],
  ['rear-suspension', e34Manual('330','Bentley · rear suspension'), e30Manual('33','BMW factory manual · rear axle')],
  ['suspension', e34Manual('310','Bentley · suspension'), e30Manual('31','BMW factory manual · front axle')],
  ['steering', e34Manual('320','Bentley · steering'), e30Manual('32','BMW factory manual · steering')],
  ['exhaust', e34Manual('180','Bentley · exhaust'), e30Repair('e30-rear-muffler','BMW factory manual · final muffler, 18-12')],
  ['engine', e34Manual('100','Bentley · engine'), e30Manual('11','BMW factory manual · engine')],
  ['lighting', e34Manual('630','Bentley · lights'), e30Manual('63','BMW factory manual · lights')],
  ['electrical', e34Manual('EWD','Bentley · wiring diagrams'), e30Manual('EWD','BMW electrical manuals')],
  ['interior', e34Manual('520','Bentley · cabin and trim'), e30Manual('51','BMW factory manual · body and trim')],
  ['body', e34Manual('400','Bentley · body'), e30Manual('41','BMW factory manual · body')],
];
export function workshopManualForSystem(series:Series,node:NodeIdentity):ServiceLink {
  const match=manualSystems.find(([system])=>node.systemIds.includes('system:'+system));
  return match?.[series==='e30'?2:1] ?? {label:'Browse the service manual',href:'/manual'};
}
