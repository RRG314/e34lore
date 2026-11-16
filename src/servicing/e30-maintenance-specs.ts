import type { RepairSource, RepairSpecs } from './repair-specs';
import { e30FactoryManualArchive, e30Handbook } from '../series/e30-manual';

const coupe = 'https://www.bmwpartsdeal.com/parts-list/1991-bmw-325i-coupe_e30/';
const archivedTorque = (page: string): RepairSource => ({
  label:'BMW E30 torque manual · '+page, href:e30FactoryManualArchive.download,
});
const manual = (group: string, pdf: number, label: string): RepairSource => ({
  label:'BMW · '+label, href:'/manual/'+group+'?pdf='+pdf,
});
const drawing = (label: string, url: string): RepairSource => ({
  label:'1991 325i coupe · '+label, href:coupe+url+'.html',
});
const handbook = (page: number, title: string): RepairSource => ({
  label:'BMW 325i handbook · '+title+', p. '+page, href:e30Handbook+'#page='+(page+1),
});
const job = (slug: string, data: Omit<RepairSpecs,'id'|'series'|'topic'|'guide'>): RepairSpecs => {
  const id='e30-'+slug;
  return {id,series:'e30',topic:id,guide:id,...data};
};

const coolant = archivedTorque('17-1 · PDF 61');
const radiator = archivedTorque('17-2 · PDF 62');
const rearBrakes = archivedTorque('34-2 · PDF 137');
const stockWheel = handbook(58,'wheel installation');
const expansion = drawing('expansion tank diagram','cooling_exhaust_system/expansion_tank');
const heater = drawing('heater core, valves and blower diagram','heater_and_air_conditioning/heater_radiator_blower');
const parking = drawing('parking brake shoe diagram','brakes_pedals/parking_brake_brake_shoes');
const steering = manual('32',572,'32-6b, power steering filling and bleeding');
const late = 'Late rear-wheel-drive E30 325i with the original M20B25';

export const e30MaintenanceSpecs: readonly RepairSpecs[] = [
  job('coolant-bleeding',{
    title:'Fill and bleed the M20 cooling system',scope:late+' and its separate expansion tank.',
    tools:['8 mm wrench for the original thermostat-housing bleed screw.','Low-range torque wrench, clean funnel and drain pan.'],
    manual:manual('17',332,'17-6, bleeding the M20 cooling system'),
    compare:[manual('17',337,'17-8/1, late expansion-tank cold level')],
    specs:[{item:'Original 8 mm wrench-size bleeder',value:'8 Nm',source:coolant},{item:'Cold level reference',value:'About 20 °C',source:manual('17',337,'17-8/1, late expansion tank')}],
    nodes:/^e30assembly:engine-bay:(?:expansion-tank|radiator-hose)/,modelNode:'e30assembly:engine-bay:expansion-tank',
    catalog:expansion,
  }),
  job('radiator',{
    title:'Replace the late M20 manual radiator',scope:late+' and manual transmission. Check A/C equipment before matching the radiator and thermoswitch.',
    tools:['10 mm socket for an original M6 hex-head mount. Use the drive profile supplied with the actual drain plug.','Low-range torque wrench covering 2.5–10 Nm, clamp driver, catch pan and gloves.'],
    manual:manual('17',333,'17-7, radiator removal and installation'),
    compare:[manual('17',334,'17-7/1, late radiator and drain position')],
    specs:[{item:'Radiator mount screw, M6',value:'10 Nm',source:radiator},{item:'Original-type radiator drain plug',value:'2.5 Nm',source:radiator},{item:'Original 32–48 mm coolant hose clamps',value:'2.5 Nm',source:coolant}],
    parts:[{name:'550 mm manual radiator',number:'17112241912',condition:'From 09/1987 in the 325i coupe catalog.'},{name:'M10 radiator drain plug',number:'17111719384'}],
    nodes:/^e30assembly:radiator-pack:radiator$/,modelNode:'e30assembly:radiator-pack:radiator',modelReferenceId:'e30-325i-coupe-manual',
    catalog:drawing('radiator and supports diagram','cooling_exhaust_system/radiator_frame'),
  }),
  job('expansion-tank',{
    title:'Replace the late M20 expansion tank',scope:late+' and clip-mounted tank from 09/1987.',
    tools:['30 mm wrench for the original level switch.','Low-range torque wrench, clamp driver, 8 mm bleeder wrench and drain pan.'],
    manual:manual('17',337,'17-8/1, 1988-on expansion tank'),
    specs:[{item:'Original 30 mm wrench-size level switch',value:'3 Nm',source:coolant}],
    parts:[{name:'Late expansion tank',number:'17111712641',condition:'From 09/1987.'},{name:'Original level switch, 109 mm',number:'61311378320',condition:'Check the connector and sensor length.'}],
    catalog:expansion,nodes:/^e30assembly:engine-bay:expansion-tank$/,modelNode:'e30assembly:engine-bay:expansion-tank',
  }),
  job('clutch-bleeding',{
    title:'Bleed the clutch hydraulics',scope:late+' and hydraulic clutch on the manual transmission.',
    tools:['Reservoir pressure bleeder with the fitted cap adapter, clear hose and fluid bottle. Match the six-point wrench to the installed vent screw.'],
    manual:manual('21',358,'21-1, clutch bleeding'),
    specs:[{item:'Original catalog slave cylinder bore',value:'20.64 mm',condition:'Check the installed slave. The BMW bleeding page gives the bleeding sequence without a vent-screw torque.'}],
    parts:[{name:'Clutch slave vent screw',number:'21521116360',condition:'Match the installed slave. Renew only if damaged or leaking.'},{name:'Clutch slave cylinder',number:'21521157212',condition:'Verify bore and connection if the slave leaks.'}],
    nodes:/^e30assembly:cabin-floor:clutch$/,modelNode:'e30assembly:cabin-floor:clutch',modelReferenceId:'e30-325i-coupe-manual',
    catalog:drawing('clutch cylinder and vent screw diagram','gearshift_clutch/clutch_control'),
  }),
  job('driveshaft-flex-disc',{
    title:'Replace the driveshaft flex disc',scope:late+' and Getrag 260. Match the flange diameter and bolt grade before choosing hardware.',
    tools:['BMW 26 1 040 for the sliding ring; socket and counterhold for fitted flange bolts. Use 17 mm for standard M10 hex heads when fitted and verify the actual tool fit.','Rated exhaust and shaft supports, torque wrench, and a ruler for 4–6 mm preload.'],
    manual:manual('26',459,'26-6, flex disc replacement'),
    compare:[manual('26',460,'26-6, flex disc orientation and preload')],
    specs:[{item:'M10 class 8.8 coupling hardware',value:'48 Nm',source:archivedTorque('26-1 · PDF 98')},{item:'M10 class 10.9 coupling hardware',value:'64 Nm',source:archivedTorque('26-1 · PDF 98')},
      {item:'Center mount to body',value:'21 Nm',source:archivedTorque('26-2 · PDF 99')},{item:'RWD sliding clamp ring',value:'10 Nm',source:archivedTorque('26-1 · PDF 98')}],
    parts:[{name:'Flex disc, 78 mm bolt circle',number:'26111225624',condition:'Verify the installed flange.'},{name:'M10 × 50 class 10.9 hex bolt',number:'26111209498'},{name:'M10 locking nut',number:'07129964672'}],
    nodes:/^e30assembly:propeller:flex-disc$/,modelNode:'e30assembly:propeller:flex-disc',modelReferenceId:'e30-325i-coupe-manual',
    catalog:drawing('driveshaft and flex disc diagram','steering_drive_shaft/drive_shaft_universal_joint_centre_mounting'),
  }),
  job('handbrake-adjustment',{
    title:'Adjust the rear-disc parking brake',scope:'Rear-wheel-drive E30 with the separate shoes inside the rear rotor hats. Rear drum versions use their own adjustment.',
    tools:['Slotted screwdriver that reaches through the wheel bolt hole, spanners matched to the cable nuts, and a wheel socket and torque wrench.'],
    manual:manual('34',642,'34-3, parking brake adjustment'),catalog:parking,
    specs:[{item:'Shoe adjuster back-off',value:'3–4 clicks',source:manual('34',642,'34-3, rear disc layout')},
      {item:'Lever setting for cable adjustment',value:'5 clicks',source:manual('34',642,'34-3, cable balance')},{item:'Stock US wheel bolts',value:'110 Nm',source:stockWheel}],
    nodes:/^e30assembly:rear-(?:left|right):rotor$/,modelNode:'e30assembly:rear-left:rotor',
  }),
  job('parking-brake-shoes',{
    title:'Replace the rear-disc parking brake shoes',scope:'E30 325i with the original rear disc and internal parking-brake shoes.',
    tools:['BMW 34 4 000 spring-retainer tool. Use the rear brake procedure for the 7 mm hex guide bolts, caliper hanger and rotor fasteners.'],
    manual:manual('34',660,'34-17, parking brake shoe replacement'),
    compare:[manual('34',642,'34-3, parking brake adjustment'),manual('34',649,'34-9, rear disc removal')],
    specs:[{item:'Rear disc retaining screw',value:'16 Nm',source:rearBrakes},{item:'Original rear 7 mm guide bolts',value:'30 Nm, −5 Nm tolerance',source:rearBrakes}],
    parts:[{name:'Parking brake shoe set',number:'34411159467',condition:'Match to the disc-brake parking mechanism.'}],
    nodes:/^e30assembly:rear-(?:left|right):rotor$/,modelNode:'e30assembly:rear-left:rotor',catalog:parking,
  }),
  job('sunroof-alignment',{
    title:'Align the steel sunroof panel',scope:'E30 factory sliding and tilting steel sunroof with the guide and gate shown in BMW 54 12 004.',
    tools:['Two 4 mm keys for the guide locks, BMW 00 2 102/103 for the adjusters, straightedge, 0.2 mm plastic gauge and low-range torque wrench.'],
    manual:manual('54',1057,'54-1, panel height and adjustment'),
    specs:[{item:'Front panel height',value:'1 mm below roof'},{item:'Rear panel height',value:'1 mm above roof'},
      {item:'Front and rear clearance',value:'About 0.2 mm, even front and rear'},{item:'New panel adjuster screws',value:'3.5 Nm'}],
    parts:[{name:'Steel sliding panel',number:'54121906710',condition:'Inspect the existing panel and contact edges before ordering.'}],
    nodes:/^e30body:sunroof$/,modelNode:'e30body:sunroof',
  }),
  job('heater-blower',{
    title:'Replace the heater blower motor',scope:'E30 cowl-access blower shown in BMW 64 11 210. Match the motor code and housing before buying.',
    tools:['Fastener driver matched to the cowl access panel, trim tool and side cutters for the original loom tie.'],
    manual:manual('64',1205,'64-9, blower motor removal and code'),
    specs:[{item:'Replacement assembly',value:'Motor and both balanced fan wheels',condition:'Keep the motor and fan wheels together. The factory page specifies a retaining clamp.'}],
    parts:[{name:'Catalog blower motor',number:'64111466015',condition:'Compare the label, housing, and equipment options.'},{name:'Microfilter blower',number:'64111466014',condition:'Only where the original equipment and motor code match.'}],
    nodes:/^e30hvac:blower-(?:motor|upper|lower)$/,modelNode:'e30hvac:blower-motor',catalog:heater,
  }),
  job('blower-resistor',{
    title:'Replace the heater blower resistor',scope:'E30 cowl-access resistor plate shown in BMW 64 11 220. Check its connector and fitted housing.',
    tools:['Driver for the actual cowl cover screws, trim tool and cutters for the original loom tie.'],
    manual:manual('64',1206,'64-11, blower resistor access'),
    specs:[{item:'Resistor retention',value:'Press-in plate',condition:'The illustrated plate and connector seat by hand.'}],
    parts:[{name:'Blower resistor',number:'64116912633',condition:'Verify the fitted plate and connector.'}],
    nodes:/^e30hvac:blower-resistor$/,modelNode:'e30hvac:blower-resistor',catalog:heater,
  }),
  job('heater-valve',{
    title:'Replace the heater water valve',scope:'Left-hand-drive E30 325i with the valve and pipe joints shown in BMW 64 11 271.',
    tools:['Trim driver, clamp driver, short socket or driver matched to the valve joint and an 8 mm wrench for the original M20 bleeder.'],
    manual:manual('64',1207,'64-12, heater valve and seal'),
    specs:[{item:'Original M20 thermostat bleeder after refilling',value:'8 Nm',source:coolant}],
    parts:[{name:'Heater water valve',number:'64111386707',condition:'Compare valve and connector against the installed box.'},{name:'Heater pipe seal',number:'64118377824',condition:'Catalog ring for the matching 17.12 mm joint.'}],
    catalog:heater,
  }),
  job('heater-core',{
    title:'Replace the heater core',scope:'Left-hand-drive E30 325i with the heater case and footwell pipe routing in BMW 64 11 531.',
    tools:['Trim driver and short sockets or drivers matched to the pipe and core fasteners. Use an 8 mm wrench and low-range torque wrench for the M20 bleed screw.'],
    manual:manual('64',1210,'64-14, heater core and pipe seals'),
    specs:[{item:'Heater pipe seal diameter for the catalog joint',value:'17.12 mm'},{item:'Original M20 thermostat bleeder after refilling',value:'8 Nm',source:coolant}],
    parts:[{name:'Heater core',number:'64118391363',condition:'Check case, pipe orientation and market.'},{name:'Pipe sealing ring',number:'64118377824',condition:'Match to the original flange.'}],
    nodes:/^e30hvac:heater-core(?:-pad)?$/,modelNode:'e30hvac:heater-core',catalog:heater,
  }),
  job('mirror-switch',{
    title:'Replace the power-mirror switch',scope:'E30 with the door-mounted selector and adjustment switch shown in BMW 61 31 255.',
    tools:['BMW 61 1 300 switch extractor or a non-marring tool that supports the switch edge.'],
    manual:manual('61',1146,'61-7, power mirror switch replacement'),
    specs:[{item:'Switch retention',value:'Press-fit switch and removable knob',condition:'The workshop manual shows a clip fit without a tightening operation.'}],
    parts:[{name:'Mirror switch with selector',number:'61311378847',condition:'Compare the connector.'},{name:'Mirror switch knob',number:'61311372463'}],
    catalog:drawing('outside mirror and switch diagram','vehicle_trim/outside_mirror'),
  }),
  job('sealed-beam-headlight',{
    title:'Replace a sealed-beam headlight insert',scope:'U.S. E30 325i with four sealed-beam lamps, the late arrangement cataloged from 06/1989.',
    tools:['Driver that seats in the grille and three clamping-ring screws. Proper beam-setting equipment for the aim check.'],
    manual:handbook(60,'sealed-beam headlight installation'),
    specs:[{item:'Outer low-beam insert',value:'H5006'},{item:'Inner high-beam insert',value:'H5001'}],
    compare:[{label:'Philips · U.S. 1990–91 325i lighting applications',href:'https://www.philips.com/c-dam/b2c/en_US/generic/support-home/support-page-product-flyers/automotive-lighting-tab-product-flyers/philips-classic-car-lighting-catalog-1946-2002.pdf'}],
    parts:[{name:'Low-beam sealed insert',number:'63121373059',condition:'06/1989-on in the coupe catalog.'},{name:'High-beam sealed insert',number:'63121373060',condition:'06/1989-on in the coupe catalog.'}],
    nodes:/^e30body:headlamps-(?:left|right)$/,modelNode:'e30body:headlamps-left',
    catalog:drawing('late sealed-beam lamp diagram','lighting/single_components_for_headlight'),
  }),
  job('fog-light-bulb',{
    title:'Replace a late front fog light bulb',scope:'Late E30 with the 09/1987-on front housing that accepts the H3 bulb.',
    tools:['Driver that fits the lamp frame retaining screws and a clean cloth for handling the bulb.'],
    manual:manual('63',1191,'63 99 201, front fog bulb replacement'),
    specs:[{item:'Original fog bulb',value:'H3 · 12 V · 55 W'}],
    parts:[{name:'H3 front fog lamp bulb',number:'63217160779',condition:'Match the original housing.'}],
    catalog:drawing('late fog lamp diagram','lighting/fog_lights'),
  }),
  job('wiper-blades',{
    title:'Replace the front wiper blades',scope:'E30 325i with original spring-latch front wiper arms. Match any replacement arm’s latch.',
    tools:['Folded towel to protect the windshield and a ruler to verify both blade lengths.'],
    manual:handbook(59,'front wiper blade removal'),
    specs:[{item:'Standard pair',value:'500 mm each (20 in nominal)',condition:'Compare both installed blades before ordering.'}],
    parts:[{name:'Wiper blade with air baffle',number:'61611380759'},{name:'Right wiper blade',number:'61611387678'}],
    nodes:/^e30body:wiper-blade-(?:left|right)$/,modelNode:'e30body:wiper-blade-left',
    catalog:drawing('wiper arms and blades diagram','vehicle_electrical_system/wiper_arm_wiper_blade'),
  }),
  job('power-steering-bleed',{
    title:'Fill and bleed the power steering',scope:'E30 with the hydraulic rack and dipstick-equipped reservoir in BMW 32 13 006.',
    tools:['Clean funnel, absorbent cloth and the reservoir dipstick.'],
    manual:steering,
    specs:[{item:'Fluid check',value:'Dipstick MAX with engine stopped',source:steering},{item:'Initial steering strokes',value:'Twice to each side',source:steering}],
    nodes:/^e30assembly:engine-bay:power-steering$/,modelNode:'e30assembly:engine-bay:power-steering',
  }),
];
