import type { RepairSpecs, RepairSource } from './repair-specs';
import { e30FactoryManualArchive } from '../series/e30-manual';

const page=(chapter:string,pdf:number,label:string):RepairSource=>({label,href:`/manual/${chapter}?pdf=${pdf}`});
const e30Torque=(label:string):RepairSource=>({label:'BMW E30 torque manual · '+label,href:e30FactoryManualArchive.download});
const factory=(series:'e30'|'e34', label:string, diagram:string):RepairSource=>({
  label:(series==='e30'?'1991 325i coupe':'1995 525i sedan')+' · '+label,
  href:'https://www.bmwpartsdeal.com/parts-list/'+(series==='e30'?'1991-bmw-325i-coupe_e30':'1995-bmw-525i-sedan_e34')+'/'+diagram+'.html',
});
const scope30='1991 U.S. E30 325i coupe, original rear-wheel-drive front axle.';
const scope34='1995 U.S. E34 525i sedan, original rear-wheel-drive front axle.';
const alignment='Have the alignment checked after replacing steering or suspension links. Counting turns is only a starting setting.';
const springSafety='Support the strut and use a spring compressor that fits the spring. Never loosen the center nut while the spring is loaded.';
const arms30=factory('e30','front wishbone and bushing diagram','front_rear_axle/front_axle_support_wishbone');
const arms34=factory('e34','control and thrust arm diagram','front_rear_axle/cross_member_wishbone_rod');
const rods30=factory('e30','steering linkage diagram','steering_drive_shaft/steering_linkage_tie_rods');
const rods34=factory('e34','steering linkage diagram','steering_drive_shaft/steering_linkage_tie_rods');
const struts30=factory('e30','front strut and damper diagram','front_rear_axle/front_spring_strut_shock_absorber');
const struts34=factory('e34','front strut and damper diagram','front_rear_axle/front_spring_strut_shock_absorber');
const mounts30=factory('e30','front upper mount diagram','front_rear_axle/guide_support_spring_pad_attaching_parts');
const mounts34=factory('e34','front upper mount diagram','front_rear_axle/guide_support_spring_pad_attaching_parts');
const torque30Rods=e30Torque('32-5 · PDF 117');
const torque30Mount=e30Torque('31-7 · PDF 107');
const toolsCatalog={label:'Baum Tools · front hub sockets, 36 mm and 46 mm',href:'https://www.myclassicparts.com/wp-content/uploads/2021/10/01_BMW_Baum_Tools_Catalogue.pdf'};
const outer34=page('320',295,'Bentley · 320-7, outer tie rods');
const center34=page('320',296,'Bentley · 320-8, center link and tie rod ends');
const strutTorque34=page('310',281,'Bentley · 310-5, strut cartridge and upper mount torques');
const strutOut34=page('310',279,'Bentley · 310-3, strut installation torques');
const steelBush34={name:'Steel wishbone bushing',number:'31121124622',condition:'For the steel arm only; replace both bushings as a pair.'};
const bush30={name:'Matching wishbone rubber mount set',number:'31129058931',condition:'Catalog listing from 09/1984 with A/C. Check the installed mounting style and orientation.'};
const thrustBush={name:'Thrust arm rubber mount',number:'31121136605',condition:'Replace both bushings as a pair.'};

export const frontAxleSpecs: readonly RepairSpecs[]=[
  {
    id:'e30-control-arm',series:'e30',guide:'e30-front-control-arm',title:'Front control arm replacement',topic:'e30-front-control-arm',
    scope:scope30+' Factory steel wishbones; use the separate procedure for the 325iX or M3.',
    manual:page('31',507,'BMW · 31-6, front control arm replacement'),
    tools:['BMW 31 1 110 ball joint separator for the standard strut.','Torque wrench covering 42–85 Nm. Use the socket that fully fits each replacement nut.'],
    specs:[
      {item:'Inner ball joint to front axle carrier',value:'85 Nm',source:e30Torque('31-3 · PDF 104')},
      {item:'Outer ball joint to spring strut',value:'65 Nm',condition:'Keep the taper and bore clean and free of grease. Install the locking hardware specified for each joint.',source:e30Torque('31-3 · PDF 104')},
      {item:'Control arm bushing bracket to carrier',value:'42 Nm',source:e30Torque('31-4 · PDF 105')},
    ],
    parts:[{name:'Left steel wishbone',number:'31121127725'},{name:'Right steel wishbone',number:'31121127726'},
      {name:'M14 × 1.5 self-locking nut',number:'31106774714',condition:'Match to the inner joint and check the repair manual’s hardware note.'},
      {name:'M12 × 1.5 self-locking nut',number:'32216769539',condition:'Match to the outer joint.'}],
    note:alignment,catalog:arms30,nodes:/^e30assembly:front-(?:left|right):(?:control-arm|control-nut|control-inner-nut|control-bolt-[12])$/,modelNode:'e30assembly:front-left:control-arm',
    rightModelNode:'e30assembly:front-right:control-arm',rightPartNumbers:['31121127726'],
  },
  {
    id:'e30-control-arm-bush',series:'e30',guide:'e30-front-control-arm-bush',title:'Front wishbone bushings',topic:'e30-front-control-arm-bush',
    scope:scope30+' Use matching left and right bushings and keep their installation marks aligned.',
    manual:page('31',510,'BMW · 31-8, wishbone bushing installation'),
    tools:['BMW 31 2 130 press fixture for the bushing and bracket; feeler gauge for the factory wear check.'],
    specs:[{item:'Bushing bracket to carrier',value:'42 Nm',source:e30Torque('31-4 · PDF 105')},
      {item:'Installed bushing check, clearance A',value:'0.7–1.7 mm',condition:'Check the gap at the point in the BMW drawing, with the car at the specified normal load.'}],
    parts:[bush30],catalog:arms30,nodes:/^e30assembly:front-(?:left|right):control-(?:arm|bush)$/,modelNode:'e30assembly:front-left:control-arm',
  },
  {
    id:'e30-tie-rod',series:'e30',guide:'e30-tie-rod',title:'Steering tie rod and outer end',topic:'e30-tie-rod',
    scope:scope30+' Rack-and-pinion steering. Match the fitted lock plate and the steering damper arrangement.',
    manual:page('32',583,'BMW · 32-8, tie rod replacement'),
    tools:['BMW 32 2 070 separator for the outer joint.','BMW 32 2 100 for the standard inner joint, or 32 2 110 for the steering-damper version shown. Use pliers on the lock plate.'],
    specs:[{item:'Inner tie rod to rack',value:'75 Nm',condition:'Use a new securing plate. Follow the lock plate procedure; do not hammer it.',source:torque30Rods},
      {item:'Outer tie rod stud to steering arm',value:'36.5 ± 3.5 Nm',condition:'Use the correct locknut or original castle nut and cotter pin design.',source:torque30Rods},
      {item:'Tie rod adjuster clamp bolt',value:'14 Nm',condition:'For the clamp bolt shown, at normal load after setting toe.',source:torque30Rods}],
    parts:[{name:'Complete tie rod (either side)',number:'32111126360',condition:'Replacement for catalog number 32 11 1 125 186.'},
      {name:'Outer ball joint',number:'32111126757'},{name:'Inner joint securing plate',number:'32111124540'},{name:'Rack boot',number:'32111127104',condition:'Inspect for cracks and renew if damaged.'}],
    catalog:rods30,note:alignment,nodes:/^e30assembly:front-(?:axle:steering-rack|(?:left|right):(?:tie-(?:rod|outer|outer-nut|clamp-1)|rack-(?:boot(?:-clip)?|outer-clip|lock)))$/,modelNode:'e30assembly:front-axle:steering-rack',
    numbers:['32111125186'],
  },
  {
    id:'e30-power-steering-rack',series:'e30',title:'Power steering rack and hydraulic fittings',topic:'e30-power-steering-rack',
    scope:scope30+' Original hydraulic steering rack. Identify each fitting by its thread.',
    manual:page('32',572,'BMW · 32-6b, rack removal and bleeding'),
    compare:[page('32',573,'BMW · 32-7, rack installation continuation')],
    tools:['Fluid suction tool, catch pan and caps for open lines. Use a wrench that seats fully on each hydraulic fitting.'],
    specs:[{item:'Pipe coupling bolt to rack, M10',value:'10 Nm',source:e30Torque('32-4 · PDF 116')},
      {item:'Pipe coupling bolt to rack, M12',value:'20 Nm',source:e30Torque('32-4 · PDF 116')},
      {item:'Steering coupling to gear or column',value:'22 Nm',condition:'Factory coupling fastener with the matching locking hardware.',source:e30Torque('32-8 · PDF 120')}],
    catalog:factory('e30','rack pipe diagram','steering_drive_shaft/hydro_steering_pipe_steering_box'),
    note:'Renew opened seals, use fluid specified for the installed system and follow the bleed procedure before checking for leaks.',
    nodes:/^e30assembly:front-axle:steering-rack$/,modelNode:'e30assembly:front-axle:steering-rack',
    numbers:['32131132816','32131132817','32131132818','32131132819','32131132820'],
  },
  {
    id:'e30-front-strut',series:'e30',guide:'e30-front-strut',title:'Front strut, upper mount and damper',topic:'e30-front-strut',relatedTopics:['e30-front-strut-layout'],
    scope:scope30+' Check the damper and upper mount type before applying shaft torque.',
    manual:page('31',516,'BMW · 31-11, front strut removal'),
    compare:[page('31',520,'BMW · 31-13, spring compressor and shaft counterhold'),
      page('31',521,'BMW · 31-14, retaining ring and parts order'),mounts30],
    tools:['BMW 31 3 111 spring compressor with the fitting shown, and 31 3 170 shaft-nut tool with a counterhold.',
      'BMW 31 3 150 or 31 3 180 retaining-ring tool, according to the installed collar.'],
    specs:[{item:'Upper mount to body',value:'22 Nm',condition:'Replace the self-locking nuts.',source:torque30Mount},
      {item:'Damper shaft nut, original M12 external hex shaft',value:'64 Nm',source:torque30Mount},
      {item:'Damper shaft nut, original M12 internal hex shaft',value:'44 Nm',source:torque30Mount},
      {item:'Original damper retaining collar',value:'130 Nm',condition:'Check replacement damper instructions if the supplied ring differs.',source:e30Torque('31-8 · PDF 108')}],
    parts:[{name:'Standard guide support',number:'31331139452',condition:'Check upper mount and alignment before choosing standard or correction mount.'},
      {name:'Camber correction guide support',number:'31331139484',condition:'Only when the specified correction is needed.'}],
    catalog:struts30,note:springSafety,nodes:/^e30assembly:front-(?:left|right):(?:strut(?:-spindle)?|spring|top-(?:mount|cap)|tower-nut-[1-3]|damper|gland-nut|(?:lower|upper)-pad|upper-seat|shaft-(?:nut|washer)|mount-(?:insulator|washer)|dust-boot|bump-stop)$/,
    modelNode:'e30assembly:front-left:strut',rightModelNode:'e30assembly:front-right:strut',rightPartNumbers:['31311127316'],
    numbers:['31311127315','31311127316','31321135892','31301133438','31321130065'],
  },
  {
    id:'e30-front-hub',series:'e30',guide:'e30-front-wheel-bearing',title:'Front hub and wheel bearing',topic:'e30-front-wheel-bearing',
    scope:scope30+' RWD stub axle with a hub and integral bearing. The 325iX bearing is pressed into a different assembly.',
    manual:page('31',514,'BMW · 31-10, RWD front hub removal'),
    compare:[page('31',515,'BMW · 31-10.1, installing the new hub'),toolsCatalog],
    tools:['36 mm thin-wall six-point socket for the original M24 collar nut (BMW 11 2 180).',
      'BMW 31 2 101 / 102 / 104 hub puller set and 31 2 120 installer, or the correct equivalents.',
      'Torque wrench rated for 290 Nm; staking tool for the new nut.'],
    specs:[{item:'New front collar nut to stub axle',value:'290 Nm',condition:'Stake the new collar nut after tightening. Replace the grease cap.',source:e30Torque('31-6 · PDF 106')}],
    parts:[{name:'Front hub with ABS provision',number:'31211129576',condition:'Catalog replacement for 31 21 1 131 297; verify the fitted hub.'},
      {name:'New M24 × 1.5 collar nut',number:'31211125826'},{name:'New grease cap',number:'31211130125'}],
    catalog:factory('e30','front hub and wheel bearing diagram','front_rear_axle/wheel_bearings'),
    nodes:/^e30assembly:front-(?:left|right):hub$/,modelNode:'e30assembly:front-left:hub',numbers:['31211131297'],
  },
  {
    id:'e30-front-anti-roll',series:'e30',guide:'e30-front-stabilizer',title:'Front anti-roll bar, links and mounts',topic:'e30-front-stabilizer',
    scope:scope30+' Link mounts to the control arm; use different specs for an iX or M3 strut-mounted design.',
    manual:page('31',530,'BMW · 31-17, front anti-roll bar'),
    tools:['Counterhold wrench for the flats on the link. Measure the actual bar diameter before buying bushes.'],
    specs:[{item:'Link to anti-roll bar',value:'47 Nm',source:e30Torque('31-10 · PDF 110')},
      {item:'Link pivot bracket to control arm',value:'42 Nm',source:e30Torque('31-10 · PDF 110')},
      {item:'M8 bar clamp to axle carrier',value:'22 Nm',source:e30Torque('31-9 · PDF 109')}],
    parts:[{name:'Stabilizer link',number:'31351091764'},{name:'20 mm stabilizer rubber mount',number:'31351129139',condition:'Only for the 20 mm bar; confirm diameter.'}],
    catalog:factory('e30','front stabilizer diagram','front_rear_axle/stabilizer_front'),
    nodes:/^e30assembly:front-(?:axle:antiroll-bar|(?:left|right):drop-link(?:-fastener)?)$/,numbers:['31351130850'],
  },
  {
    id:'e34-outer-tie-rod',series:'e34',title:'Outer steering tie rods and ends',topic:'320-job-outer-tie-rods-and-ends',
    scope:scope34+' Conventional steering box and center link. Check the thread direction of a separate end.',
    manual:outer34,compare:[center34],
    tools:['BMW 32 2 050 tapered joint separator, or an equivalent that fits. Measure the toe adjuster before disassembly.'],
    specs:[{item:'Outer tie rod end to steering arm or center link',value:'37 Nm',condition:'Use new self-locking nuts on the factory joints.'},
      {item:'Tie rod adjuster clamp bolt',value:'14 Nm',source:center34}],
    parts:[{name:'Complete outer tie rod (either side)',number:'32211135668',condition:'Catalog replacement for 32 21 1 135 666.'},
      {name:'Left-hand-thread ball joint',number:'32211135822'},{name:'Right-hand-thread ball joint',number:'32211135824',condition:'Catalog replacement for 32 21 1 135 820. Thread direction refers to the adjuster, not the side of the car.'}],
    catalog:rods34,note:alignment,nodes:/^(?:e34sys:tie-rod--?1|e34axle:(?:left|right)-tie-(?:outer(?:-nut)?|inner(?:-nut)?|clamp-[12]))$/,modelNode:'e34sys:tie-rod-1',numbers:['32211135666','32211135819','32211135820'],
  },
  {
    id:'e34-center-steering-link',series:'e34',title:'Center steering link',topic:'320-job-center-link-camber-and-caster',
    scope:scope34+' Center steering link between the pitman and idler arms.',
    manual:center34,
    tools:['BMW 32 2 050 separator at the outer tie rod joints; 32 2 040 at the pitman and idler arm joints.'],
    specs:[{item:'Center link to pitman arm',value:'59 Nm',condition:'Use a new self-locking nut.'},{item:'Center link to idler arm',value:'37 Nm',condition:'Use a new self-locking nut.'},
      {item:'Outer tie rod ends to center link',value:'37 Nm',condition:'Use new self-locking nuts.'}],
    parts:[{name:'Center tie rod',number:'32211138864',condition:'Catalog replacement for 32 21 1 138 854.'}],
    catalog:rods34,note:alignment,nodes:/^(?:e34sys:(?:center-drag-link|pitman-arm)|e34steer:center-(?:left|right)-nut)$/,modelNode:'e34sys:center-drag-link',numbers:['32211138854'],
  },
  {
    id:'e34-steering-idler',series:'e34',title:'Steering idler arm and bushing',topic:'320-job-idler-arm',
    scope:scope34+' Check the arm bore and bolt size. The catalog calls the idler a pitman arm; it mounts to the axle carrier, opposite the steering box.',
    manual:page('320',294,'Bentley · 320-6, idler arm removal'),
    compare:[page('320',295,'Bentley · 320-7, bushing and idler torques')],
    tools:['BMW 32 2 040 joint separator; 32 1 050 and 32 2 032 press fittings for replacing the bushing.'],
    specs:[{item:'Idler to crossmember, M10 bolt',value:'42 Nm',source:outer34},
      {item:'Idler to crossmember, M12 bolt',value:'85 Nm',source:outer34},
      {item:'Center link to idler arm',value:'37 Nm',source:outer34}],
    parts:[{name:'Idler arm, 27 mm bore',number:'32211136450'},{name:'Idler arm rubber mount, 27 mm',number:'32211136452'}],
    catalog:rods34,note:alignment,nodes:/^e34sys:idler-arm$/,modelNode:'e34sys:idler-arm',
  },
  {
    id:'e34-steering-box',series:'e34',title:'Steering gearbox and hydraulic connections',topic:'320-job-steering-box-replacement',
    scope:scope34+' Stock hydraulic steering gearbox. Verify the box, steering column coupling and actual banjo thread sizes.',
    manual:page('320',293,'Bentley · 320-5, steering gearbox removal'),
    compare:[page('320',294,'Bentley · 320-6, gearbox installation'),page('310',288,'Bentley · 310-12, subframe mount table'),page('320',292,'Bentley · 320-4, hydraulic filling and bleeding')],
    tools:['BMW 32 2 040 separator for the center link at the pitman arm, a fluid suction tool and caps for opened lines.'],
    specs:[{item:'Steering box to subframe, M10 class 10.9 bolts',value:'42 Nm',condition:'Bentley’s steering box replacement procedure. Use new self-locking nuts.',source:page('320',294,'Bentley · 320-6, steering gearbox mounts')},
      {item:'Steering column universal joint clamp',value:'22 Nm',condition:'Use the new locking nut and check alignment to the groove on the shaft.',source:page('320',294,'Bentley · 320-6, steering shaft coupling')},
      {item:'M14 / M16 hydraulic banjo bolts',value:'35 Nm / 40 Nm',condition:'Identify the thread first and use fresh sealing washers.',source:page('320',294,'Bentley · 320-6, hydraulic fitting torques')}],
    note:'Bentley lists 85 Nm for M12 in 320-6 and 80 Nm in 310-12. Confirm the steering box mount specification for the actual hardware before tightening.',
    nodes:/^e34sys:steering-gearbox$/,modelNode:'e34sys:steering-gearbox',numbers:['32131141813','32131136051'],
  },
  {
    id:'e34-control-arm',series:'e34',title:'Lower control arms and steel-arm bushings',topic:'310-job-front-ride-height-and-control-arms',relatedTopics:['310-job-steel-control-arm-bushing'],
    scope:scope34+' The catalog lists aluminum and steel arms. Only press a separate control arm bushing into a steel arm.',
    manual:page('310',281,'Bentley · 310-5, front control arm removal'),
    compare:[page('310',282,'Bentley · 310-6, control arm installation and steel bushing')],
    tools:['BMW 31 1 110 ball joint separator if the taper needs pressing out.',
      'BMW 31 1 051 and 33 3 141 / 142 / 144 fittings for an in-car steel bushing press, or a service press with the appropriate adapters on the bench.'],
    specs:[{item:'Control arm ball joint to steering arm',value:'93 Nm',source:page('310',282,'Bentley · 310-6, ball joint torque')},
      {item:'Control arm to crossmember',value:'78 Nm',condition:'Tighten the new self-locking nut at the normal loaded position.',source:page('310',282,'Bentley · 310-6, bushing through-bolt torque')}],
    parts:[{name:'Left aluminum wishbone',number:'31121139987'},{name:'Right aluminum wishbone',number:'31121139988'},
      {name:'Left steel wishbone',number:'31121139991'},{name:'Right steel wishbone',number:'31121139992'},steelBush34],
    catalog:arms34,note:alignment,nodes:/^(?:e34sys:front-control-arm--?1|e34axle:(?:left|right)-control-(?:nut|inner-nut|bolt))$/,modelNode:'e34sys:front-control-arm-1',
    rightModelNode:'e34sys:front-control-arm--1',rightPartNumbers:['31121139988','31121139992'],
  },
  {
    id:'e34-thrust-arm',series:'e34',title:'Front thrust arms and bushings',topic:'310-job-thrust-arm-replacement',relatedTopics:['310-job-thrust-arm-bushings'],
    scope:scope34+' Forward thrust arm and its separate chassis bushing.',
    manual:page('310',285,'Bentley · 310-9, thrust arm removal'),
    compare:[page('310',286,'Bentley · 310-10, thrust arm installation and bushings'),page('310',287,'Bentley · 310-11, loaded-position tightening')],
    tools:['BMW 31 2 140 ball joint separator or equivalent. For bushings, use the proper press adapters.'],
    specs:[{item:'Thrust arm ball joint to steering arm',value:'93 Nm',source:page('310',286,'Bentley · 310-10, ball joint torque')},
      {item:'Thrust arm to crossmember',value:'127 Nm',condition:'Tighten with the car normally loaded. Install new locking nuts and the washers shown.',source:page('310',286,'Bentley · 310-10, thrust arm torque')}],
    parts:[{name:'Left thrust arm without bushing',number:'31121141097'},{name:'Right thrust arm without bushing',number:'31121141098'},thrustBush],
    catalog:arms34,note:alignment,nodes:/^(?:e34sys:front-thrust-(?:arm|bracket)--?1|e34axle:(?:left|right)-thrust-(?:nut|inner-nut|bolt))$/,modelNode:'e34sys:front-thrust-arm-1',
    rightModelNode:'e34sys:front-thrust-arm--1',rightPartNumbers:['31121141098'],
  },
  {
    id:'e34-front-strut',series:'e34',title:'Front strut, upper mount and damper',topic:'310-job-front-spring-and-damper-disassembly',guide:'front-strut-component-identification',
    scope:scope34+' Standard front strut. Identify EDC, sport suspension and any camber correction mount before ordering.',
    manual:page('310',280,'Bentley · 310-4, front strut spring and damper'),
    compare:[page('310',278,'Bentley · 310-2, removing the complete strut'),mounts34],
    tools:['Rated spring compressor, damper shaft counterhold that fits the fitted hex and a tool for the damper retaining collar.'],
    specs:[{item:'Strut upper mount to body',value:'22 Nm',condition:'New self-locking nuts.',source:strutOut34},
      {item:'Steering arm to strut housing',value:'110 Nm',condition:'Follow the procedure for cleaning threads and using Loctite 270 or equivalent.',source:strutOut34},
      {item:'Damper retaining collar to strut',value:'130 Nm',source:strutTorque34},
      {item:'Upper mount to original damper shaft',value:'65 Nm external hex / 45 Nm internal hex',condition:'Use the row for the installed shaft design and a new self-locking nut. Check instructions for replacement dampers.',source:strutTorque34}],
    parts:[{name:'Standard upper guide support',number:'31331139452',condition:'From 09/1992. Check for a marked camber correction mount.'},
      {name:'Standard Boge/Sachs damper insert',number:'31321092283',condition:'From 09/1992, non-EDC standard strut.'}],
    catalog:struts34,note:springSafety,nodes:/^(?:e34sys:front-(?:strut|damper|spring|spring-seat|top-mount|dust-boot)--?1|e34axle:(?:left|right)-(?:strut-spindle|top-cap|tower-nut-[1-3]|gland-nut|(?:lower|upper)-pad|shaft-(?:nut|washer)|mount-insulator|bump-stop|steering-arm|lever-bolt-[1-3]))$/,
    modelNode:'e34sys:front-strut-1',rightModelNode:'e34sys:front-strut--1',rightPartNumbers:['31311138488','31319065429'],
    numbers:['31311138487','31311138488','31319065428','31319065429','31331139484','31331139437'],
  },
  {
    id:'e34-front-hub',series:'e34',title:'Front hub and wheel bearing',topic:'310-job-front-wheel-bearing',
    scope:scope34+' RWD front hub assembly. Verify production date and the symmetric or asymmetric hub style.',
    manual:page('310',283,'Bentley · 310-7, front hub removal'),
    compare:[page('310',284,'Bentley · 310-8, front hub installation'),toolsCatalog],
    tools:['46 mm thin-wall six-point socket for the original collar nut (BMW 31 2 080).',
      'BMW 31 2 102 / 105 / 106 puller set and 31 2 110 installer, or the correct equivalents.',
      'Torque wrench rated for 290 Nm and a tool to stake the new collar nut.'],
    specs:[{item:'New collar nut to stub axle',value:'290 Nm',condition:'Stake the nut after tightening.',source:page('310',284,'Bentley · 310-8, front hub torque')},
      {item:'Brake rotor retaining screw',value:'16 Nm',source:page('310',284,'Bentley · 310-8, rotor retention')}],
    parts:[{name:'Symmetric front hub, 83 mm',number:'31221139345',condition:'From 03/1991, where the catalog lists the symmetric hub.'},
      {name:'New front collar nut',number:'31211128336'},{name:'Dust protection collar, 69 mm',number:'31206777788',condition:'From 03/1991.'}],
    catalog:factory('e34','front wheel bearing diagram','front_rear_axle/wheel_bearings'),
    nodes:/^e34sys:hub-front--?1$/,modelNode:'e34sys:hub-front-1',numbers:['31211129386','31221139348'],
  },
  {
    id:'e34-front-anti-roll',series:'e34',title:'Front anti-roll bar and drop links',topic:'310-job-front-anti-roll-bar',
    scope:scope34+' Match the actual bar diameter. The standard and low-slung sport bars use different mounts.',
    manual:page('310',284,'Bentley · 310-8, stabilizer removal'),
    compare:[page('310',285,'Bentley · 310-9, stabilizer and link torques')],
    tools:['Counterhold wrench for the drop link. Keep both sides near the same height to unload the bar before removing a link.'],
    specs:[{item:'Link to strut or stabilizer bar',value:'59 Nm',condition:'Use new self-locking nuts.',source:page('310',285,'Bentley · 310-9, link torque')},
      {item:'Stabilizer brackets to subframe',value:'22 Nm',source:page('310',285,'Bentley · 310-9, bracket torque')}],
    parts:[{name:'Front stabilizer link',number:'31351134582'},{name:'23 mm standard bar rubber mount',number:'31351135805'},
      {name:'25 mm low-slung sport bar rubber mount',number:'31351140193',condition:'From 09/1991, with the matching 25 mm bar.'}],
    catalog:factory('e34','front stabilizer diagram','front_rear_axle/stabilizer_front'),nodes:/^(?:e34sys:front-(?:antiroll-bar|drop-link--?1)|e34chassis:front-bar-clamp--?1|e34axle:(?:left|right)-drop-link-fastener)$/,
    modelNode:'e34sys:front-antiroll-bar',numbers:['31351130075','31351139017','31351140192','31352226334'],
  },
];
