import { frontAxleSpecs } from './front-axle-specs';
import type { Series } from '../series/registry';
import type { ComponentContext } from './context';
import type { ManualLink } from '../digital-twin/public/catalog';
import { e30FactoryJobs } from '../series/e30-factory-jobs';
import { e30ManualGroupForPage } from '../series/e30-factory-index';
import { e30ElectricalManual, e30FactoryManualArchive, e30Handbook } from '../series/e30-manual';
import { e34ElectricalManual } from '../data/fuse-panel-layouts';

export type RepairSource = { label: string; href: string };
type Part = { name: string; number: string; condition?: string };
type Specification = { item: string; value: string; condition?: string; source?: RepairSource };
export type RepairSpecs = {
  id: string;
  series: Series;
  title: string;
  scope: string;
  guide?: string;
  topic?: string;
  relatedTopics?: readonly string[];
  manual: RepairSource;
  tools?: readonly string[];
  specs?: readonly Specification[];
  parts?: readonly Part[];
  catalog?: RepairSource;
  compare?: readonly RepairSource[];
  note?: string;
  nodes?: RegExp;
  modelNode?: string;
  modelReferenceId?: string;
  rightModelNode?: string;
  rightPartNumbers?: readonly string[];
  // Exact numbers with a direct relationship to this job. No descriptions or fuzzy matches.
  numbers?: readonly string[];
};

const page = (group: string, pdf: number, label: string): RepairSource => ({label, href:`/manual/${group}?pdf=${pdf}`});
const link = (label: string, href: string): RepairSource => ({label,href});
const bpd = 'https://www.bmwpartsdeal.com/parts-list/';
const coupe = bpd+'1991-bmw-325i-coupe_e30/';
const sedan = bpd+'1995-bmw-525i-sedan_e34/';
const bmwTorque = (label:string) => link('BMW E30 torque manual · '+label, e30FactoryManualArchive.download);
const tis = 'https://workshop-manuals.com/bmw/';
const e30M20 = tis+'3_series_e30/325i_m20_conver/';
const e34M50 = tis+'5_series_e34/525i_m50_sal/';
const plugChart = link('BMW spark plug application chart', 'https://bmwtechinfo.bmwgroup.com/sib_attachments/B120199SparkPlugChart.pdf');
const bmwGearboxOil = link('BMW · 00 11 229, manual gearbox oil change', 'https://workshop-manuals.com/bmw/3_series_e36/325i_m50_coupe/2_repair_instructions/0__maintenance_and_general_data/64_ra__oil_change_in_manual_transmission/');
const e30Sump = link('BMW TIS 11 13 · Oil pan', e30M20+'4_tightening_torques/11__engine_(m20)/13__oil_sump/1_azd__oil_pan/');
const e30HandbookWheel = link('BMW 325i / 325is handbook · p. 58 (PDF 59)', e30Handbook+'#page=59');
const e30FrontPads = link('1991 325i coupe · front caliper and pads diagram',coupe+'brakes_pedals/front_wheel_brake_brake_pad_sensor.html');
const e34FrontPads = link('1995 525i sedan · front caliper and pads diagram',sedan+'brakes_pedals/front_wheel_brake_brake_pad_sensor.html');
const e30BrakeFront = bmwTorque('34-1 · PDF 136');
const e30BrakeRear = bmwTorque('34-2 · PDF 137');
const e34Pads = page('340',321,'Bentley · 340-5, pad installation');
const e34Rotor = page('340',323,'Bentley · 340-7, rotor installation and checks');
const e34Caliper = page('340',322,'Bentley · 340-6, caliper and rotor removal');
const e34Wheel = page('010',19,'Bentley · 010-11, wheel installation');
const originalPlug = '17 mm six-point socket for the original BMW 11 13 1 273 093 drain plug; check the head on a replacement.';
const e30Scope = '1991 U.S. 325i coupe, M20, rear-wheel drive.';
const e34Scope = 'U.S. E34 525i with the original M50 or M50TU.';
const e30SparkSocket = '20.8 mm (13/16 in) deep spark plug socket for NGK ZGR5A.';
const e30Mount = {name:'Complete center mount',number:'26121226723',condition:'Late bracket from 09/1987 in the 325i coupe catalog.'};
const e34CenterCatalog = link('1995 525i sedan · driveshaft diagram',sedan+'steering_drive_shaft/drive_shaft_universal_joint_centre_mounting.html');
const e34AlternatorSpec = link('BMW TIS 12 31 1AZ · alternator terminals', e34M50+'4_tightening_torques/12__engine_electrical_system_(m50)/31__alternator_with_drive_and_mounting/1_azd__alternator_with_drive_and_mounting_parts/');
const e34AlternatorManual = page('121',166,'Bentley · 121-4, alternator service');
const e34StarterManual = page('121',168,'Bentley · 121-6, starter service');
const e34DistributionTorque = link('BMW TIS 12 42 1AZ · starter lead', tis+'5_series_e34/525i_m50_tour/4_tightening_torques/12__engine_electrical_system_(m50)/42__starter_lead/1_azd__wires_to_starter/');

// A locator keeps a model part connected while its tool list is still being checked.
function e30FactoryLocator(id:string,nodes:RegExp,modelNode:string,numbers:readonly string[] = []): RepairSpecs {
  const job=e30FactoryJobs.find(row=>row.id===id)!;
  const pdf=job.pages[0], group=e30ManualGroupForPage(pdf)!;
  return {id,series:'e30',title:job.title,scope:'BMW procedure '+job.section+'. Match the illustrated assembly before working.',topic:id,
    manual:page(group.id,pdf,'BMW · '+job.section),nodes,modelNode,numbers};
}

export const repairSpecs: readonly RepairSpecs[] = [
  ...frontAxleSpecs,
  {
    id:'e30-m20-starter-terminals',series:'e30',guide:'e30-m20-starter-terminals',title:'M20 starter terminals',topic:'e30-m20-starter-terminals',scope:e30Scope,
    manual:bmwTorque('12-6 · PDF 43'),
    tools:['8 mm, 10 mm and 13 mm six-point sockets for standard M5, M6 and M8 hex nuts, respectively. Confirm the fitted nut profile.', 'Low-range torque wrench covering 5–12 Nm.'],
    specs:[
      {item:'Terminal 30h wire nut (M5)',value:'5 Nm',condition:'Where the starter has an identified 30h terminal.'},
      {item:'Terminal 50 wire nut (M6)',value:'6 Nm'},
      {item:'Terminal 30 wire nut (M8)',value:'12 Nm'},
    ],
    parts:[{name:'1.4 kW starter',number:'12411726504',condition:'Catalog option. Match the starter label and terminal layout.'}],
    catalog:link('1991 325i coupe · starter diagram',coupe+'engine_electrical_system/starter.html'),
    compare:[link('1989 BMW 325i ETM · manual starter circuit',e30ElectricalManual.url+'#page=31')],
    note:'Disconnect the battery negative cable before touching the starter leads. Match the stamped terminal number before tightening.',
    nodes:/^wiring:starter(?::sleeve)?$/,modelNode:'wiring:starter',
    numbers:['12411726504'],
  },
  {
    id:'e30-m20-alternator-terminals',series:'e30',guide:'e30-m20-alternator-terminals',title:'M20 alternator terminals',topic:'e30-m20-alternator-terminals',scope:e30Scope,
    manual:bmwTorque('12-5 · PDF 42'),
    tools:['13 mm six-point socket for a standard M8 B+ hex nut. Match the D+ nut on the fitted alternator.', 'Low-range torque wrench covering 5–13 Nm.'],
    specs:[
      {item:'D+ signal terminal',value:'5 Nm',condition:'M20 on the BMW 12 31 1AZ table.'},
      {item:'B+ output terminal',value:'13 Nm',condition:'M20 on the BMW 12 31 1AZ table.'},
    ],
    parts:[{name:'90 A exchange alternator',number:'12312287828',condition:'Check the amperage and label on the installed unit.'}],
    catalog:link('1991 325i coupe · alternator diagram',coupe+'engine_electrical_system/alternator.html'),
    compare:[link('1989 BMW 325i ETM · charging circuit',e30ElectricalManual.url+'#page=29')],
    note:'Disconnect the battery negative cable before removing the B+ terminal cover.',
    nodes:/^(?:e30assembly:engine:alternator|wiring:alternator(?::sleeve)?)$/,modelNode:'e30assembly:engine:alternator',
  },
  {
    id:'e34-m50-alternator-terminals',series:'e34',title:'M50 alternator terminals',topic:'121-job-alternator-removal-and-installation',
    scope:'1995 U.S. 525i with the original-style M50TU alternator. Match the make, amperage and terminal markings.',
    manual:e34AlternatorManual,
    tools:['10 mm and 13 mm six-point sockets for standard M6 D+ and M8 B+ hex nuts. Confirm the installed nut profile.', 'Low-range torque wrench for the terminal nuts.', '32 mm fan-clutch wrench and pulley holder if removing the alternator using Bentley’s fan-removal steps. The fan coupling has a left-hand thread.'],
    specs:[
      {item:'D+ signal terminal',value:'7 Nm (BMW TIS)',condition:'Bentley lists 6 Nm. Confirm the specification for the installed alternator.',source:e34AlternatorSpec},
      {item:'B+ output terminal',value:'13 Nm (BMW TIS)',condition:'Bentley lists 14 Nm. Confirm the specification for the installed alternator.',source:e34AlternatorSpec},
    ],
    parts:[
      {name:'80 A compact alternator',number:'12311744560',condition:'Catalog lists from 04/1995. Compare the fitted rating and build date.'},
      {name:'140 A exchange compact alternator',number:'12311744567',condition:'Catalog alternative. Check the fitted unit and required hardware.'},
    ],
    catalog:link('1995 525i sedan · alternator diagram',sedan+'engine_electrical_system/alternator.html'),
    compare:[link('1995 BMW ETM · charging circuit',e34ElectricalManual+'#page=131')],
    note:'Disconnect the battery negative cable before removing the B+ terminal cover.',
    nodes:/^(?:m50:alternator|wiring:alternator(?::sleeve)?)$/,modelNode:'m50:alternator',
  },
  {
    id:'e34-m50-starter-terminals',series:'e34',title:'M50 starter terminals',topic:'121-job-starter-and-solenoid-replacement',scope:e34Scope,
    manual:e34StarterManual,
    tools:['Low-range torque wrench covering 5–12 Nm. For standard M5, M6 and M8 hex nuts use 8 mm, 10 mm and 13 mm sockets respectively; identify the fitted nuts first.'],
    specs:[
      {item:'Terminal 30h wire nut',value:'5 Nm'},
      {item:'Terminal 50 wire nut',value:'6 Nm'},
      {item:'Terminal 30 wire nut',value:'12 Nm',condition:'Bentley also lists 8 Nm for the battery positive cable to the starter. Resolve the attachment and starter type before applying either value.'},
    ],
    parts:[{name:'1.4 kW Bosch starter',number:'12411740374',condition:'Check the fitted starter. The catalog also lists Marelli units.'}],
    catalog:link('1995 525i sedan · starter diagram',sedan+'engine_electrical_system/starter.html'),
    compare:[link('1995 BMW ETM · terminals 30, 30h and 50',e34ElectricalManual+'#page=135')],
    note:'Disconnect the negative battery cable before working on the starter. Bentley specifies new intake gaskets when removing the M50 intake manifold for access.',
    nodes:/^(?:m50:starter|wiring:starter(?::sleeve)?)$/,modelNode:'m50:starter',
    numbers:['12411740374','12411740379'],
  },
  {
    id:'e34-battery-distribution-terminal',series:'e34',title:'Front distribution box positive terminal',scope:'E34 M8 battery-positive terminal at the distribution box.',
    manual:e34DistributionTorque,
    tools:['13 mm six-point socket for a standard M8 hex nut.', 'Torque wrench covering 20 Nm.'],
    specs:[{item:'Battery positive terminal at the distribution box (M8)',value:'20 Nm',source:e34DistributionTorque}],
    catalog:link('1995 525i sedan · battery cable diagram',sedan+'engine_electrical_system/battery_cable.html'),
    compare:[link('1995 BMW ETM · positive distribution',e34ElectricalManual+'#page=31'),link('1995 BMW ETM · junction locations',e34ElectricalManual+'#page=468')],
    note:'Disconnect the battery negative cable before disturbing the front positive terminal.',
    nodes:/^wiring:battery(?::sleeve)?$/,modelNode:'wiring:battery',
  },
  {
    id:'e30-oil-service',series:'e30',title:'M20 oil and filter service',guide:'e30-oil-service',
    scope:e30Scope+' Check the sump and the spin-on filter installed on the car.',
    manual:page('00',22,'BMW · 00-15, oil service'),
    tools:[originalPlug,'Strap wrench for filter removal; MANN W 719/15 is 76 mm outside diameter.'],
    parts:[{name:'Spin-on oil filter',number:'11421707779'},{name:'Copper drain seal, A12 × 17',number:'07119963151'},
      {name:'Original M12 × 1.5 drain plug',number:'11131273093',condition:'Catalog replacement 11 13 7 535 106; verify the head size on the part.'}],
    catalog:link('1991 325i coupe · oil filter diagram',coupe+'engine/lubrication_system_oil_filter.html'),
    compare:[e30Sump,link('1991 325i coupe · sump and drain hardware',coupe+'engine/oil_pan_oil_level_indicator.html'),
      link('BMW TIS 11 42 · Spin-on filter installation',tis+'3_series_e30/325i_m20_sal/4_tightening_torques/11__engine_(m20)/42__oil_filter_and_lines/1_azd__oil_filter_and_pipes/'),
      link('MANN · W 719/15 dimensions','https://www.mann-filter.com/us-en/catalog/search-results/product.html/w719/15_mann-filter.html'),
      link('SWG · Original drain plug hex size','https://media.swg.de/Marketing/Katalog/KFZ_KAT_EN_77720040175_Befestigung.pdf')],
    specs:[{item:'Spin-on filter',value:'Hand-tighten per the filter instructions',condition:'Use the filter maker’s seal-contact and turn instructions.'},
      {item:'Oil fill with new filter',value:'4.25 L',condition:'Use the dipstick for final level.',source:link('BMW 325i / 325is handbook · p. 84 (PDF 85)',e30Handbook+'#page=85')},
      {item:'M12 × 1.5 sump plug',value:'Check the specification for the fitted sump',condition:'The archived torque manual lists 35 Nm; the later BMW TIS table lists 25 Nm. Confirm which applies before tightening.',source:bmwTorque('11-10 · PDF 11')}],
    note:'BMW’s two references disagree on the sump plug. Confirm the applicable specification for your sump and plug before starting.',
    nodes:/^e30assembly:engine:(?:oil-filter|sump|oil-drain-plug)$/,modelNode:'e30assembly:engine:oil-filter',
    numbers:['11137535106'],
  },
  {
    id:'e30-air-filter',series:'e30',title:'M20 air filter',guide:'e30-air-filter',scope:e30Scope+' Stock clip-fastened airbox.',
    manual:page('13',272,'BMW · 13-39, air filter removal'),
    tools:['Release the lid clips by hand. Use a light and clean lint-free cloth.'],
    parts:[{name:'Panel filter',number:'13721720861'}],
    catalog:link('1991 325i coupe · air cleaner diagram',coupe+'fuel_system/intake_silencer_filter_cartridge.html'),
    nodes:/^e30assembly:engine-bay:(?:airbox|air-filter)$/,modelNode:'e30assembly:engine-bay:air-filter',
  },
  {
    id:'e30-m20-spark-plugs',series:'e30',guide:'e30-m20-spark-plugs',title:'M20 spark plugs',topic:'e30-m20-spark-plugs',
    scope:'E30 325i with the original M20 and factory-type M14 × 1.25 plugs. Install six of the same type.',
    manual:link('BMW TIS 12 12 · Spark plugs',tis+'3_series_e30/325i_m20_sal/4_tightening_torques/12__engine_electrical_system_(m20)/12__ignition_wires_spark_plugs/1_azd__spark_plugs/'),
    tools:['21 mm (13/16 in nominal) spark plug socket for the listed Bosch W-series plugs.',e30SparkSocket,'BMW 12 1 180 plug-lead pliers for original connectors. Pull by the boot.'],
    specs:[{item:'Original-type M14 × 1.25 spark plug',value:'30 ± 3 Nm',condition:'Ungreased, per BMW TIS. Follow the exact replacement plug’s installation instructions.'},
      {item:'BMW-listed Bosch plug gap',value:'0.7–0.8 mm',condition:'For the adjustable Bosch plug listed in the BMW application chart.',source:plugChart}],
    compare:[bmwTorque('12-2 · PDF 39'),plugChart,link('NGK · ZGR5A socket size','https://www.ngkntk.com/part-finder/quad-atv/spark-plugs/bush-hog/trail-hunter-zgr5a-1/'),
      link('BMW · tool 12 1 180',e30M20+'10_special_tool/12__engine_electrical_system_(m20)/1_swz__pliers/')],
    parts:[{name:'Bosch W8LCR plug',number:'12129061869',condition:'Check the markings and current supersession.'},{name:'Bosch W8LPR plug',number:'12121721895',condition:'Original catalog option.'}],
    catalog:link('1991 325i sedan · ignition wiring diagram',bpd+'1991-bmw-325i-sedan_e30/engine_electrical_system/ignition_wiring.html'),
    nodes:/^e30assembly:engine:spark-plug-[1-6]$/,modelNode:'e30assembly:engine:spark-plug-1',
  },
  {
    id:'e30-m20-timing-belt',series:'e30',title:'M20 timing belt and tensioner',topic:'e30-m20-timing-belt',
    scope:e30Scope+' Confirm the fitted sprocket profile and matched roller. The M40 procedure is separate.',
    manual:page('11',110,'BMW · 11-66a, M20 timing belt'),
    compare:[page('11',111,'BMW · 11-66b, timing marks and belt profile'),
      link('Continental · M20 timing belt and special tools','https://www.showmethepartsdb3.com/BIN/documents/Continental%20Elite/tb131k1a.pdf')],
    tools:['BMW 11 2 150 crankshaft hub holder if the hub is removed. Consult the full procedure before disturbing the hub.','32 mm fan-clutch wrench and pulley holder for the original left-hand coupling.'],
    specs:[{item:'M10 camshaft toothed pulley to camshaft',value:'65 Nm',condition:'M20 only. This is the pulley bolt, not either tensioner bolt.',source:bmwTorque('11-18 · PDF 19')}],
    parts:[{name:'127-tooth semicircular profile timing belt',number:'11311711081'},
      {name:'Matching adjusting pulley',number:'11311711154',condition:'BMW catalog specifies use with the listed belt.'},
      {name:'Tensioner spring',number:'11311267746',condition:'Inspect and renew as needed.'},{name:'Tensioner pin',number:'11311280960',condition:'Inspect and renew as needed.'}],
    catalog:link('1991 325i coupe · timing parts diagram',coupe+'engine/timing_and_valve_train_tooth_belt.html'),
    note:'Use the full M20 procedure for timing and tensioning. Do not move the crank and cam independently with the belt off.',
    nodes:/^e30assembly:engine:timing$/,modelNode:'e30assembly:engine:timing',
  },
  {
    id:'e30-driveshaft-center-support',series:'e30',title:'Driveshaft center support',guide:'e30-driveshaft-center-support',
    scope:e30Scope+' Two-piece shaft with the late center mount. Check the shaft and flange before ordering.',
    manual:page('26',466,'BMW · 26-10, center mount replacement'),
    compare:[page('26',467,'BMW · 26-11, bearing shield and clearance'),page('26',454,'BMW · driveshaft removal and installation')],
    tools:['BMW 26 1 040 for the threaded sleeve.','Bearing puller and BMW 24 1 050 driver for fitting the support.'],
    specs:[{item:'Center mount to body',value:'21 Nm',condition:'Bracket fasteners; follow the shaft installation and preload procedure first.',source:bmwTorque('26-2 · PDF 99')},
      {item:'Sliding joint clamp ring',value:'10 Nm',condition:'Factory rear-wheel-drive E30 ring after installation in the car. BMW lists a different value for the iX.',source:bmwTorque('26-1 · PDF 98')}],
    parts:[e30Mount],
    catalog:link('1991 325i coupe · center mount diagram',coupe+'steering_drive_shaft/drive_shaft_universal_joint_centre_mounting.html'),
    nodes:/^e30assembly:propeller:center-mount$/,modelNode:'e30assembly:propeller:center-mount',
    note:'Keep the two shaft halves indexed. Support the shaft and use the full procedure before loosening the bracket.',
  },
  {
    id:'e30-rear-shock-absorbers',series:'e30',title:'Rear shocks and upper mounts',topic:'e30-rear-shock-absorbers',
    scope:e30Scope+' Conventional rear shocks, without ride-height control.',
    manual:page('33',636,'BMW · 33-16, rear shock replacement'),
    tools:['Support jack for the trailing arm and rated stands.','Piston-rod counterhold for the fitted shock; size depends on the shaft.'],
    specs:[{item:'Upper mount to body',value:'22 Nm',condition:'M8 fasteners.',source:bmwTorque('33-17 · PDF 134')},
      {item:'Original shock piston rod to upper mount',value:'15 Nm',condition:'For factory hardware; use the maker’s value for a replacement shock.',source:bmwTorque('33-17 · PDF 134')}],
    compare:[link('BMW TIS 33 52 · Rear shock tightening table',tis+'3_series_e30/325e_m20_sal/4_tightening_torques/33__rear_axle/52__shock_absorber/1_azd__shock_absorbers/')],
    parts:[{name:'Rear shock upper mount',number:'33521128819'},{name:'Mount gasket',number:'33526772864'}],
    catalog:link('U.S. 325i · shock and mount diagram','https://www.realoem.com/bmw/enUS/showparts?diagId=33_0327&id=1123-USA---E30-BMW-325i'),
    note:'The archived and later BMW tables differ for the lower mount. Confirm the bolt grade and the applicable value before tightening at normal ride height.',
    nodes:/^e30assembly:rear-(?:left|right):damper$/,modelNode:'e30assembly:rear-left:damper',
  },
  {
    id:'e30-front-brake-pads-discs',series:'e30',guide:'e30-front-brake-pads-discs',title:'Front brake pads and discs',topic:'e30-front-brake-pads-discs',
    scope:e30Scope+' Factory ventilated front discs and matching sliding calipers; iX hardware differs.',
    manual:page('34',643,'BMW · 34-4, front brake pads and caliper'),
    compare:[page('34',644,'BMW · 34-5, front disc removal'),e30FrontPads],
    tools:['Counterhold wrench on the guide pin. Check the hex on the fitted caliper.','Disc micrometer, caliper hanger, rated stands and torque wrench.'],
    specs:[{item:'Front disc retaining screw',value:'16 Nm',source:e30BrakeFront},
      {item:'Front caliper carrier to steering knuckle',value:'123 Nm',condition:'Rear-wheel-drive E30 row; BMW specifies lightly oiled bolt threads.',source:e30BrakeFront},
      {item:'Front guide-pin bolts',value:'35 Nm',condition:'Renew the bolts for this E30 design.',source:e30BrakeFront}],
    parts:[{name:'Ventilated front disc, 260 × 22 mm',number:'34111160915'},{name:'Catalog-listed front disc alternative, 260 × 22 mm',number:'34116752352'},{name:'Front brake pad set',number:'34111162481',condition:'Confirm the fitted caliper from the front pad diagram.'},{name:'Front brake wear sensor',number:'34351153966',condition:'Inspect and replace if worn through or damaged.'}],
    catalog:link('1991 325i coupe · front disc diagram',coupe+'brakes_pedals/front_brake_brake_disc.html'),
    nodes:/^e30assembly:front-(?:left|right):(?:rotor|caliper|pad)/,modelNode:'e30assembly:front-left:rotor',
  },
  {
    id:'e30-rear-brake-pads-discs',series:'e30',guide:'e30-rear-brake-pads-discs',title:'Rear brake pads and discs',topic:'e30-rear-brake-pads-discs',
    scope:e30Scope+' Factory rear discs and the capped guide bolts in BMW’s illustration.',
    manual:page('34',647,'BMW · 34-8, rear brake pads and caliper'),
    compare:[page('34',649,'BMW · 34-9, rear disc removal')],
    tools:['7 mm hex bit for the factory rear guide bolts.','Disc micrometer, caliper hanger, rated stands and torque wrench.'],
    specs:[{item:'Rear disc retaining screw',value:'16 Nm',source:e30BrakeRear},
      {item:'Rear caliper carrier to trailing arm',value:'67 Nm',source:e30BrakeRear},
      {item:'Original 7 mm hex rear guide bolts',value:'30 Nm, −5 Nm tolerance',source:e30BrakeRear}],
    parts:[{name:'Rear disc, 258 × 10 mm',number:'34216755408',condition:'Catalog replacement for 34 21 6 755 407.'},{name:'Rear brake pad set',number:'34211158912',condition:'For the matching rear disc caliper.'}],
    numbers:['34216755407'],
    catalog:link('1991 325i coupe · rear brake diagram',coupe+'brakes_pedals/rear_wheel_brake_brake_pad_sensor.html'),
    nodes:/^e30assembly:rear-(?:left|right):(?:rotor|caliper|pad)/,modelNode:'e30assembly:rear-left:rotor',
  },
  {
    id:'e30-brake-fluid-flush',series:'e30',guide:'e30-brake-fluid-flush',title:'Brake fluid flush and bleeding',topic:'e30-brake-fluid-flush',
    scope:e30Scope+' Factory hydraulic brakes. Use the procedure for the installed ABS or non-ABS system.',
    manual:page('34',641,'BMW · 34-2, conventional and ABS bleeding'),
    tools:['7 mm or 9 mm six-point bleeder wrench, according to the fitted screw.', 'Reservoir pressure bleeder, clear hose, catch bottle and low-range torque wrench.'],
    specs:[{item:'Bleeder screw with a 7 mm wrench size',value:'5 Nm',source:e30BrakeFront},
      {item:'Bleeder screw with a 9 mm wrench size',value:'6 Nm',source:e30BrakeFront},
      {item:'Maximum reservoir bleeder pressure',value:'2 bar',condition:'Follow the bleeder and factory instructions for the ABS or non-ABS procedure.',source:page('34',641,'BMW · 34-2')}],
    nodes:/^e30assembly:engine-bay:brake-master(?:$|:)/,modelNode:'e30assembly:engine-bay:brake-master',
  },
  {
    id:'e30-wheel-removal',series:'e30',guide:'e30-wheel-removal',title:'Remove or install a wheel',topic:'e30-wheel-removal',
    scope:'U.S. E30 325i / 325is, stock wheel and bolts described in the owner’s handbook.',
    manual:page('36',724,'BMW · 36-6, wheel removal and installation'),
    tools:['Wheel bolt wrench or matching socket, chock and calibrated torque wrench. Use the wheel-lock key if fitted.'],
    specs:[{item:'Wheel bolts',value:'110 Nm (81 lb-ft)',condition:'This handbook configuration. The BMW torque book gives 100 Nm with +10 Nm tolerance. Use the applicable specification for different wheels.',source:e30HandbookWheel}],
    parts:[{name:'Factory black wheel bolt, M12 × 1.5',number:'36136781150',condition:'Match the original seat and length.'}],
    catalog:link('1991 325i coupe · cross-spoke wheel diagram',coupe+'wheels/cross_spoke_styling.html'),
    compare:[bmwTorque('36-1 · PDF 144')],
    nodes:/^e30assembly:(?:front|rear)-(?:left|right):wheel$/,modelNode:'e30assembly:front-left:wheel',
  },
  {
    id:'e30-manual-gearbox-fluid',series:'e30',guide:'e30-manual-gearbox-fluid',title:'Getrag 260 manual gearbox oil',topic:'e30-manual-gearbox-fluid',
    scope:e30Scope+' Identify the original Getrag 260/5 and read the fluid label on the installed case.',
    manual:bmwGearboxOil,
    compare:[bmwTorque('23-2 · PDF 71')],
    tools:['Oil pump or filling hose, drain pan, level supported lift and torque wrench. Match the socket or hex bit to the installed plugs.'],
    specs:[{item:'Fill and drain plugs',value:'50 Nm',condition:'BMW table for the original manual gearbox; check replacement plug instructions.',source:bmwTorque('23-2 · PDF 71')}],
    parts:[{name:'Magnetic drain plug, M24 × 1.5',number:'23117546876',condition:'Catalog replacement where this plug type is listed.'},{name:'Filler screw plug, M24 × 1.5',number:'23117527440',condition:'Confirm the plug type in the case.'}],
    catalog:link('1991 325i coupe · Getrag 260 housing and plug diagram',coupe+'manual_transmission/housing_attaching_parts_getrag_260_5_50.html'),
    note:'Open the fill plug first. Confirm the gearbox label and approved fluid before draining.',
    nodes:/^e30assembly:gearbox:(?:drain-plug|filler-plug)$/,modelNode:'e30assembly:gearbox:filler-plug',modelReferenceId:'e30-325i-coupe-manual',
  },
  {
    id:'e30-4hp22-sump',series:'e30',guide:'e30-4hp22-sump',title:'ZF 4HP22 transmission pan and fluid',topic:'e30-4hp22-sump',
    scope:e30Scope+' ZF 4HP22 with the original dipstick, drain plug and steel pan. Read the gearbox plate and fluid recommendation first.',
    manual:page('24',388,'BMW · 24-110, 4HP22 oil sump'),
    compare:[page('24',392,'BMW · 24-113, oil screen and hydraulic control')],
    tools:['BMW 24 0 080 filling funnel, drain pan and level lift.', 'Low-range torque wrench covering 7–16 Nm. Check the installed pan screws and plug before choosing sockets.'],
    specs:[{item:'M6 pan screws',value:'7 Nm',condition:'4HP22/24 entry in the E30 workshop archive. Use the instructions for the installed pan if it differs.',source:bmwTorque('24-3 · PDF 81')},
      {item:'Original M10 drain plug',value:'16 Nm',source:bmwTorque('24-3 · PDF 81')},
      {item:'Final dipstick check',value:'Approx. 80 °C',condition:'Vehicle level, selector in P, engine idling.',source:page('24',388,'BMW · 24-110, fluid level')}],
    parts:[{name:'Pan profile gasket',number:'24111217082'},{name:'M10 × 1 drain plug with sealing ring',number:'24111421387'},
      {name:'Oil pan',number:'24111215935',condition:'Replace if the sealing flange is distorted.'}],
    catalog:link('1991 325i coupe · 4HP22 pan and housing diagram',coupe+'automatic_transmission/housing_parts_lubrication_system_zf_4hp22_24.html'),
    nodes:/^e30assembly:automatic:(?:pan|drain-plug)$/,modelNode:'e30assembly:automatic:pan',modelReferenceId:'e30-325i-coupe-automatic',
  },
  {
    id:'m50-engine-oil-and-filter',series:'e34',title:'M50 oil and filter service',guide:'m50-engine-oil-and-filter',
    scope:e34Scope+' Identify the actual plug and filter cover before choosing the torque.',
    manual:page('020',31,'Bentley · 020-9, oil and filter change'),
    tools:[originalPlug,'Torque wrench covering 25–33 Nm; match the cap tool to the installed housing.'],
    specs:[{item:'M12 sump drain plug',value:'25 Nm',condition:'M12 plug and stock sump only.'},
      {item:'Filter cover with M10 or M12 center bolt',value:'33 Nm',condition:'Tighten the center bolt; check its thread size.'},
      {item:'Screw-on filter cover',value:'25 Nm',condition:'For the cover that threads into the housing. This is a separate design.'}],
    parts:[{name:'Oil filter element set',number:'11421730389'},{name:'Copper drain seal, A12 × 17',number:'07119963151'},
      {name:'Original M12 × 1.5 drain plug',number:'11131273093',condition:'Catalog replacement 11 13 7 535 106; recheck tool size.'}],
    catalog:link('1995 525i sedan · oil filter diagram',sedan+'engine/lubrication_system_oil_filter.html'),
    compare:[link('1995 525i sedan · sump and drain hardware',sedan+'engine/oil_pan_oil_level_indicator.html')],
    nodes:/^m50:(?:oil-filter-(?:element|housing)|oil-pan|oil-drain-plug)$/,modelNode:'m50:oil-filter-element',
    numbers:['11137535106','11421741000','11421738639','11421738640','11429063133'],
  },
  {
    id:'m50-spark-plug-replacement',series:'e34',title:'M50 and M50TU spark plugs',guide:'m50-spark-plug-replacement',
    scope:e34Scope+' Select six identical plugs for the fitted engine.',
    manual:page('020',32,'Bentley · 020-10, spark plug access'),
    tools:['16 mm (5/8 in) deep spark plug socket for the listed Bosch F7LDCR or NGK BKR6EK.','Straight extension and torque wrench.'],
    specs:[{item:'Bentley’s original plug specification',value:'30 Nm',condition:'Bentley describes lightly oiled threads. Use the replacement plug maker’s instructions for torque and thread condition. NGK plated plugs go in dry.',source:page('020',33,'Bentley · 020-11, plug specifications')},
      {item:'Dual-electrode plug gap',value:'Non-adjustable',source:plugChart}],
    parts:[{name:'Bosch F7LDCR plug',number:'12129063428',condition:'From 01/1993 in the 1995 sedan catalog.'},{name:'NGK BKR6EK plug',number:'12129064619',condition:'From 01/1993 in the 1995 sedan catalog.'}],
    catalog:link('1995 525i sedan · coil and plug diagram',sedan+'engine_electrical_system/ignition_coil_spark_plug.html'),
    compare:[plugChart,link('NGK · dry installation of plated plugs','https://ngksparkplugs.com/en/resources/5-things-you-should-know-about-spark-plugs')],
    nodes:/^m50:spark-plug:[1-6]$/,modelNode:'m50:spark-plug:1',numbers:['12129064617','12131730521'],
  },
  {
    id:'m50-valve-cover-gasket',series:'e34',title:'M50 and M50TU valve cover gasket',guide:'m50-valve-cover-gasket',
    scope:e34Scope+' Confirm the cover and production split at September 1992.',
    manual:page('116',101,'Bentley · 116-3, valve cover removal'),
    tools:['Low-range torque wrench. Check the actual cover fasteners and the coil/ground fasteners before choosing sockets.'],
    specs:[{item:'Original M6 valve-cover hardware',value:'10 Nm',condition:'For the cover-to-head fasteners.',source:page('116',102,'Bentley · 116-4, gasket and cover installation')}],
    parts:[{name:'Profile gasket set',number:'11120034107',condition:'From 09/1992.'},{name:'Profile gasket set',number:'11120034106',condition:'Catalog lists this set up to 09/1992. Confirm the installed cover.'}],
    catalog:link('1995 525i sedan · valve cover diagram',sedan+'engine/cylinder_head_cover.html'),
    compare:[link('BMW TIS 11 12 · Cover fastener sizes',e34M50+'4_tightening_torques/11__engine_(m50)/12__cylinder_head_with_cover/2_azd__cylinder_head_with_cover/')],
    nodes:/^m50:valve-cover$/,modelNode:'m50:valve-cover',numbers:['11121738410','11121722385','11121738171'],
  },
  {
    id:'m50-water-pump-job-planning',series:'e34',title:'M50 coolant pump',guide:'m50-water-pump-job-planning',
    scope:e34Scope+' Four-stud pump, original pulley and mechanical fan.',
    manual:page('170',212,'Bentley · 170-8, M50 coolant pump'),
    tools:['32 mm fan-clutch wrench and pulley holder. The clutch nut has left-hand threads.','Two M6 extraction bolts for the pump ears.','Low-range torque wrench, coolant catch pan and refill tools.'],
    specs:[{item:'Pump to timing cover and pulley to pump',value:'10 Nm each',condition:'Original M50 fasteners; seat the pump evenly first.',source:page('170',213,'Bentley · 170-9, M50 pump installation')},
      {item:'Fan clutch nut to pump',value:'40 Nm at the nut',condition:'Left-hand thread. Bentley lists a 30 Nm wrench setting with BMW 11 5 040 installed in the stated configuration.',source:page('170',216,'Bentley · 170-12, cooling fan installation')}],
    parts:[{name:'Coolant pump',number:'11517527799'},{name:'Pump body O-ring',number:'11511711484',condition:'New seal; check whether it comes with the pump.'}],
    catalog:link('1995 525i sedan · pump and thermostat diagram',sedan+'engine/water_pump_thermostat.html'),
    compare:[page('170',209,'Bentley · 170-5, coolant draining and bleeding')],
    nodes:/^(?:m50:(?:water-pump(?:-impeller)?|pulley:water-pump)|e34sys:engine-cooling-fan)$/,modelNode:'m50:water-pump',
  },
  {
    id:'e34-m50-thermostat',series:'e34',title:'M50 thermostat replacement',topic:'170-job-thermostat-replacement',
    scope:e34Scope+' Compare the thermostat temperature and housing before ordering.',
    manual:page('170',214,'Bentley · 170-10, thermostat removal and orientation'),
    tools:['Low-range torque wrench and coolant catch pan. If removing the factory clutch fan for access, use a 32 mm wrench and pulley holder.'],
    specs:[{item:'Thermostat cover to housing',value:'10 Nm',source:page('170',215,'Bentley · 170-11, thermostat tightening values')},
      {item:'Engine lifting bracket bolt to thermostat housing',value:'22 Nm',condition:'M50 bracket bolt only.',source:page('170',215,'Bentley · 170-11, thermostat tightening values')}],
    parts:[{name:'88 °C thermostat',number:'11537511580',condition:'Confirm the production/equipment listing; this is one catalog option.'},{name:'92 °C thermostat',number:'11537511083',condition:'Separate catalog option. Match the specified opening temperature.'},{name:'Thermostat O-ring, 60 × 3.5 mm',number:'11531265084'}],
    catalog:link('1995 525i sedan · pump and thermostat diagram',sedan+'engine/water_pump_thermostat.html'),
    compare:[page('170',209,'Bentley · 170-5, coolant draining and bleeding')],
    note:'Let the engine cool before opening the system. Reconnect the ground at the thermostat housing on the M50.',
    nodes:/^m50:thermostat(?:-housing)?$/,modelNode:'m50:thermostat',
    numbers:['11531722531'],
  },
  {
    id:'e34-manual-gearbox-fluid',series:'e34',title:'Manual gearbox oil',guide:'manual-transmission-fluid',
    scope:'E34 with the original manual gearbox covered by Bentley. Identify the transmission and fluid label before using a specification.',
    manual:page('230',231,'Bentley · 230-1, gearbox codes and fluid check'),
    tools:['17 mm six-point socket for the external-hex plugs on the factory ATF-filled gearboxes described by Bentley. Verify the actual plug head.','Filling hose or pump, drain pan, level supported lift and torque wrench.'],
    specs:[{item:'Fill and drain plugs',value:'50 Nm',condition:'Bentley’s 250 G, 260 G and 310 Z row.',source:page('230',232,'Bentley · 230-2, tightening values')},
      {item:'Fill and drain plugs',value:'52 Nm',condition:'Bentley’s 560 G six-speed row only.',source:page('230',232,'Bentley · 230-2, tightening values')}],
    note:'Open the filler first. Match the listed gearbox code and approved fluid to the installed unit.',
  },
  {
    id:'e34-front-brake-rotors',series:'e34',title:'Front brake pads and rotors',guide:'factory-sliding-caliper-brake-pads',topic:'340-job-rotor-removal-and-runout-checks',
    scope:'1995 U.S. 525i sedan with 302 × 22 mm front discs and the factory sliding caliper in Bentley. Check the installed axle and calipers.',
    manual:e34Caliper,compare:[e34Pads,e34Rotor,e34FrontPads],
    tools:['7 mm hex bit for the factory capped guide bolts.','Caliper hanger, piston press and brake disc micrometer.'],
    specs:[{item:'Caliper guide bolt',value:'35 Nm',condition:'Clean, dry guide bolts in Bentley’s pad procedure.',source:e34Pads},
      {item:'Front caliper carrier to strut',value:'110 Nm',source:e34Rotor},
      {item:'Rotor retaining screw',value:'16 Nm',source:e34Rotor}],
    parts:[{name:'Ventilated front rotor, 302 × 22 mm',number:'34116756534',condition:'Catalog replacement for 34 11 1 160 936.'},{name:'Front brake pad kit',number:'34112282995',condition:'Catalog replacement for 34 11 1 162 535. Confirm the fitted caliper.'}],
    catalog:link('1995 525i sedan · front rotor diagram',sedan+'brakes_pedals/front_brake_brake_disc.html'),
    nodes:/^e34sys:brake-(?:disc|caliper|pad)-front-/,modelNode:'e34sys:brake-disc-front-1',
    numbers:['34111160936','34111157501','34111157502','34111162535'],
  },
  {
    id:'e34-rear-brake-rotors',series:'e34',title:'Rear brake pads and rotors',guide:'factory-sliding-caliper-brake-pads',topic:'340-job-rotor-removal-and-runout-checks',
    scope:'1995 U.S. 525i sedan with the factory rear disc and sliding caliper in Bentley.',
    manual:e34Caliper,compare:[e34Pads,e34Rotor,page('340',327,'Bentley · 340-11, parking brake shoes')],
    tools:['7 mm hex bit for the factory capped guide bolts.','Caliper hanger, piston press and brake disc micrometer.'],
    specs:[{item:'Caliper guide bolt',value:'35 Nm',condition:'Clean, dry guide bolts in Bentley’s pad procedure.',source:e34Pads},
      {item:'Rear caliper carrier to trailing arm',value:'67 Nm',source:e34Rotor},
      {item:'Rotor retaining screw',value:'16 Nm',source:e34Rotor}],
    parts:[{name:'Rear rotor',number:'34216756537',condition:'Catalog replacement for 34 21 1 162 305.'},{name:'Rear brake pad set',number:'34211162536',condition:'For the factory rear disc caliper.'}],
    catalog:link('1995 525i sedan · rear brake diagram',sedan+'brakes_pedals/rear_wheel_brake_brake_pad_sensor.html'),
    nodes:/^e34sys:brake-(?:disc|caliper|pad)-rear-/,modelNode:'e34sys:brake-disc-rear-1',
    numbers:['34211162305','34211162536'],
  },
  {
    id:'e34-driveshaft-center-support',series:'e34',title:'Driveshaft center support',topic:'260-job-flex-disc-and-center-support-bearing',
    scope:'1995 U.S. 525i sedan with the original two-piece propeller shaft. Match the shaft by build and transmission.',
    manual:page('260',267,'Bentley · 260-7, center bearing replacement'),
    compare:[page('260',266,'Bentley · 260-6, center bearing preload'),page('260',268,'Bentley · 260-8, bearing, circlip and shield')],
    tools:['Bearing puller that bears on the inner hub, circlip pliers and a way to support and index both shaft sections.'],
    specs:[{item:'Center mount preload',value:'4–6 mm toward the front',condition:'Before tightening the bracket; follow the alignment sequence.',source:page('260',266,'Bentley · 260-6, Fig. 8')},
      {item:'Clamping sleeve',value:'10 Nm',condition:'Factory sliding joint, if present.',source:page('260',268,'Bentley · 260-8, sliding sleeve')}],
    parts:[{name:'Complete center mount',number:'26121226723'},{name:'Separate ball bearing, 55 × 30 mm',number:'26121225071',condition:'For the illustrated shaft; distinct from the complete bracket.'}],
    catalog:e34CenterCatalog,
    nodes:/^e34sys:center-bearing(?:-insert)?$/,modelNode:'e34sys:center-bearing',
  },
  {
    id:'e34-rear-strut',series:'e34',title:'Rear strut removal and installation',topic:'330-job-rear-spring-and-shock-assembly',
    scope:'U.S. 525i sedan with conventional rear struts. Hydraulic self-leveling suspension uses separate instructions.',
    manual:page('330',301,'Bentley · 330-3, rear strut removal'),
    tools:['Rated support for the trailing arm and low- and high-range torque wrenches. Use a suitable spring compressor only if disassembling the strut.'],
    specs:[{item:'Strut upper mount to body',value:'22 Nm',condition:'Use new self-locking nuts.',source:page('330',302,'Bentley · 330-4, rear strut installation')},
      {item:'Strut to trailing arm',value:'127 Nm',condition:'For the hardware in the Bentley procedure, at normal loaded position. Verify the grade and any different replacement hardware.',source:page('330',302,'Bentley · 330-4, rear strut installation')}],
    catalog:link('1995 525i sedan · conventional rear strut diagram',sedan+'front_rear_axle/rear_spring_strut.html'),
    nodes:/^e34sys:rear-damper-/,modelNode:'e34sys:rear-damper-1',
    numbers:['33521133601','33521135613','33521136063'],
  },
  {
    id:'e34-m20-timing-belt',series:'e34',title:'M20 timing belt and tensioner',guide:'m20-timing-belt',
    scope:'U.S. 1989–90 E34 525i with the original M20 and the timing hardware shown in Bentley.',
    manual:page('118',141,'Bentley · 118-1, M20 timing belt removal'),
    tools:['22 mm crank socket to turn the crank on the source hardware.','32 mm wrench and pulley holder for the original fan clutch; left-hand thread.','Torque wrench and coolant catch pan.'],
    specs:[{item:'Tensioner to block',value:'22 ± 2 Nm',source:page('118',144,'Bentley · 118-4, timing belt torques')},
      {item:'Vibration damper to crank hub, M8 bolts',value:'22 ± 2 Nm',condition:'Peripheral damper bolts only.',source:page('118',144,'Bentley · 118-4, timing belt torques')}],
    parts:[{name:'Timing belt, semicircular profile',number:'11311711081',condition:'Match the installed sprocket profile and roller.'},{name:'Adjusting pulley',number:'11311711154',condition:'Use with the listed belt if the catalog confirms it for the build.'}],
    catalog:link('1990 525i sedan · M20 timing parts diagram',bpd+'1990-bmw-525i-sedan_e34/engine/timing_and_valve_train_tooth_belt.html'),
    note:'Use the full timing procedure and prove the timing by hand before starting the engine. The M50 uses a chain.',
  },
  {
    id:'e34-wheel-removal',series:'e34',title:'Remove or install a wheel',topic:'010-job-change-a-roadside-wheel',
    scope:'U.S. E34 with stock wheels and fasteners covered by Bentley. Check the specification for any replacement wheel.',
    manual:e34Wheel,
    tools:['Wheel bolt wrench or matching socket, chock and calibrated torque wrench. Use the wheel-lock key if fitted.'],
    specs:[{item:'Wheel bolts',value:'100 ± 10 Nm',condition:'Tighten in a crisscross pattern with the car on the ground.'}],
    nodes:/^wheel:(?:front|rear)-(?:left|right)$/,modelNode:'wheel:front-left',
    numbers:['36136781150'],
  },
  e30FactoryLocator('e30-heater-blower',/^e30hvac:blower-(?:motor|upper|lower)$/,'e30hvac:blower-motor',['64111466014']),
  e30FactoryLocator('e30-blower-resistor',/^e30hvac:blower-resistor$/,'e30hvac:blower-resistor',['64116912633']),
  e30FactoryLocator('e30-heater-core',/^e30hvac:heater-core(?:-pad)?$/,'e30hvac:heater-core',['64118391363']),
  e30FactoryLocator('e30-front-door-shell',/^e30body:door-(?:left|right)(?::(?:inner-shell|upper-hinge|lower-hinge))?$/,'e30body:door-left'),
  e30FactoryLocator('e30-front-bumper',/^e30body:front-bumper$/,'e30body:front-bumper'),
  e30FactoryLocator('e30-rear-bumper',/^e30body:rear-bumper$/,'e30body:rear-bumper'),
  e30FactoryLocator('e30-sunroof-alignment',/^e30body:sunroof$/,'e30body:sunroof',['54121906710']),
  {
    id:'e34-heater-core',series:'e34',title:'Heater core access',topic:'640-job-auxiliary-pump-and-heater-core',
    scope:'E34 HVAC differs by heater box. Identify the installed heater and hose arrangement first.',
    manual:page('640',416,'Bentley · 640-4, heater core access'),
    compare:[page('640',417,'Bentley · 640-5, heater core removal and installation')],
    nodes:/^e34hvac:heater-core(?:-pad)?$/,modelNode:'e34hvac:heater-core',numbers:['64118351171'],
  },
  {
    id:'e34-sunroof-adjustment',series:'e34',title:'Single-panel sunroof adjustment',topic:'540-job-sunroof-height-adjustment',
    scope:'E34 with a single sliding roof panel. Touring dual panels have a different mechanism.',
    manual:page('540',372,'Bentley · 540-2, sunroof height adjustment'),
    tools:['Non-marring trim tool to release the liner clips. Match the driver to the small panel screws.'],
    specs:[{item:'Sunroof panel to drive gate',value:'3.5 Nm',condition:'Panel mounting screws in Figure 6.'},
      {item:'Closed panel height at the front',value:'1 mm below the surrounding roof'},
      {item:'Closed panel height at the rear',value:'1 mm above the surrounding roof'}],
    nodes:/^e34body:sunroof$/,modelNode:'e34body:sunroof',numbers:['54128148903'],
  }
];

export function specsForGuide(series: Series, guide: string) {
  return repairSpecs.filter(job => job.series === series && job.guide === guide);
}

export function specsForTopic(series: Series, topic: string) {
  return repairSpecs.filter(job => job.series === series && (job.topic === topic || job.relatedTopics?.includes(topic)));
}

export function specsForNode(series: Series, node: string) {
  return repairSpecs.filter(job => job.series === series && job.nodes?.test(node));
}

export function specsForPart(series: Series, value: string) {
  const number = value.replace(/^bmw-/, '').replace(/[\s-]/g, '');
  if (!/^\d{11}$/.test(number)) return [];
  return repairSpecs.filter(job => job.series === series && (job.numbers?.includes(number) || job.parts?.some(part => part.number === number)));
}

/** Keep distinct related references, and prefer the exact page over the old chapter anchor. */
export function supplementalServiceLinks(jobs: readonly RepairSpecs[], guideIds: readonly string[], manual: readonly ManualLink[]) {
  const exactGuideIds = new Set(jobs.flatMap(job => job.guide ? [job.guide] : []));
  const sparkPlug = exactGuideIds.has('m50-spark-plug-replacement');
  const wrongGuide = (id:string) => sparkPlug && id === 'engine-air-filter-replacement';
  const exactTopics = new Set(jobs.filter(job=>job.series==='e34').flatMap(job=>[job.topic,...(job.relatedTopics??[])]));
  const isSameTopic = (entry:ManualLink) => {
    const anchor=entry.href.split('#')[1];
    return anchor && exactTopics.has(entry.chapter+'-'+anchor);
  };
  return {
    guideIds: [...new Set(guideIds)].filter(id => !exactGuideIds.has(id) && !wrongGuide(id)),
    manual: manual.filter(entry => !isSameTopic(entry) && !jobs.some(job => job.manual.href === entry.href || job.compare?.some(source=>source.href===entry.href))
      && !(sparkPlug && (entry.href.includes('job-air-filter-replacement') || entry.guides.some(wrongGuide)))),
  };
}

// Shared procedures can cover both axles. A selected part narrows the cards only
// when it actually matches a verified job; a stand-alone guide shows both.
export function specsForSelection(jobs: readonly RepairSpecs[], series: Series, component?: Partial<ComponentContext>) {
  if (jobs.length < 2 || !component) return jobs;
  const matches = component.nodeId ? specsForNode(series,component.nodeId) : [];
  const nodes = jobs.filter(job=>matches.includes(job));
  if (nodes.length) return nodes;
  const part = component.partId ? specsForPart(series,component.partId) : [];
  const exact = jobs.filter(job=>part.includes(job));
  return exact.length ? exact : jobs;
}

export function repairModelNode(job: RepairSpecs, component: Partial<ComponentContext>) {
  if (component.nodeId && (!job.nodes || job.nodes.test(component.nodeId))) return component.nodeId;
  const number = component.partId?.replace(/^bmw-/, '');
  if (number && job.rightPartNumbers?.includes(number)) return job.rightModelNode;
  return job.modelNode;
}
