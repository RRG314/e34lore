import type { AssemblyProcedure, AssemblyServiceId, AssemblyStep, ManualLink } from './assembly-service';
import type { Vec } from './model';
import { frontHubHardware } from './front-hub-service';
import { e30FactoryManualArchive, e30Handbook } from '../../series/e30-manual';

const front = 'system:front-suspension';
const steering = 'system:steering';
const installed: Vec = [0, 0, 0];
const out = (parts: readonly string[], offset: Vec): [string, Vec][] => parts.map(part => [part, offset]);
const sum = (a: Vec, b: Vec): Vec => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const bmw = (chapter: string, pdf: number, title: string): ManualLink => ({ title, href: '/e30/manual/'+chapter+'?pdf='+pdf });
const bentley = (chapter: string, pdf: number, title: string, anchor: string): ManualLink => ({
  title: 'Bentley '+title, href: '/manual/'+chapter+'?pdf='+pdf+'#job-'+anchor,
});
const manuals30 = {
  strut: bmw('31',516,'BMW 31-11 · Complete spring strut'),
  stack: bmw('31',519,'BMW 31-12 · Strut parts order'),
  spring: bmw('31',520,'BMW 31-13 · Spring compressor and shaft nut'),
  cartridge: bmw('31',521,'BMW 31-14 · Cartridge and collar'),
  arms: bmw('31',507,'BMW 31-6 · Wishbone removal and installation'),
  bush: bmw('31',510,'BMW 31-8 · Wishbone bushing fit'),
  bar: bmw('31',530,'BMW 31-17 · Front stabilizer link'),
  rod: bmw('32',583,'BMW 32-8 · Tie rod and securing plate'),
  wheel: { title:'BMW 325i / 325is handbook · Wheel installation', href:e30Handbook+'#page=59' },
  torque: { title:'BMW E30 torque manual · Groups 31 and 32', href:e30FactoryManualArchive.download },
};
const manuals34 = {
  strut: bentley('310',278,'310-2 · Complete spring strut','front-strut-assembly'),
  hardware: bentley('310',279,'310-3 · Steering arm, stabilizer and caliper','front-spring-and-damper-disassembly'),
  stack: bentley('310',280,'310-4 · Strut parts order','front-spring-and-damper-disassembly'),
  cartridge: bentley('310',281,'310-5 · Cartridge and shaft torques','front-spring-and-damper-disassembly'),
  arms: bentley('310',281,'310-5 · Lower control arm removal','front-ride-height-and-control-arms'),
  bush: bentley('310',282,'310-6 · Lower control arm installation','front-ride-height-and-control-arms'),
  thrust: bentley('310',285,'310-9 · Thrust arm removal','thrust-arm-replacement'),
  thrustFit: bentley('310',286,'310-10 · Thrust arm and loaded tightening','thrust-arm-bushings'),
  rod: bentley('320',295,'320-7 · Outer tie rods and ends','outer-tie-rods-and-ends'),
  center: bentley('320',296,'320-8 · Center link and clamp torques','center-link-camber-and-caster'),
  toe: bentley('320',297,'320-9 · Toe and alignment','toe-and-alignment-specifications'),
};

const axle30 = 'e30assembly:front-axle:';
const right30 = 'e30assembly:front-right:';
const prefix34 = 'e34axle:right-';
const wheel34 = 'wheel:front-right';
const strutKeys = ['strut','strut-spindle','damper','spring','lower-pad','upper-pad','upper-seat','gland-nut',
  'top-mount','shaft-washer','shaft-nut','top-cap','dust-boot','bump-stop','mount-insulator'];
const stable34: Record<string,string> = {
  strut:'e34sys:front-strut--1', damper:'e34sys:front-damper--1', spring:'e34sys:front-spring--1',
  'upper-seat':'e34sys:front-spring-seat--1','top-mount':'e34sys:front-top-mount--1',
  'dust-boot':'e34sys:front-dust-boot--1','control-arm':'e34sys:front-control-arm--1',
  'thrust-arm':'e34sys:front-thrust-arm--1','drop-link':'e34sys:front-drop-link--1','tie-rod':'e34sys:tie-rod--1',
};
const standTools = 'Wheel chocks, a rated lift or jack and axle stands, and a 17 mm wheel socket';
const stablePress30 = 'BMW 31 1 110 ball-joint separator and 19 mm socket for the original outer joint';
const toeReady = 'Have the wheel alignment set before returning the car to normal use.';
const preface = 'Work on level ground. Chock the rear wheels and support the front of the car at its approved chassis points.';
const wheelOff: Vec = [.70,-.035,.42];
const caliperHung: Vec = [-.29,.19,.10];

function frontStrut(e30: boolean): AssemblyProcedure {
  const service = e30 ? manuals30 : manuals34;
  const part = (key:string) => e30 ? right30+key : stable34[key]??prefix34+key;
  const parts = (...keys:string[]) => keys.map(part);
  const wheel = e30 ? right30+'wheel' : wheel34;
  const hubParts = e30 ? parts('hub','rotor','shield','disc-screw')
    : ['hub','brake-disc','brake-shield'].map(key=>'e34sys:'+key+'-front--1').concat('e34brake:front-right-disc-screw');
  const hubHardware = frontHubHardware(e30?'e30':'e34','right');
  const brake = e30 ? parts('carrier','caliper','pad-inner','pad-outer','guide-bolt-upper','guide-bolt-lower',
    'guide-pin-upper','guide-pin-lower','guide-boot-upper','guide-boot-lower','carrier-bolt-upper','carrier-bolt-lower')
    : ['e34sys:brake-caliper-front--1','e34sys:brake-pad-front--1',...['carrier','inner-pad','spring-clip','guide-lower',
      'guide-upper','cap-lower','cap-upper','carrier-lower','carrier-upper'].map(key=>'e34brake:front-right-'+key)];
  const tower = parts('tower-nut-1','tower-nut-2','tower-nut-3');
  const levers = parts('lever-bolt-1','lever-bolt-2','lever-bolt-3');
  const strut = [...parts(...strutKeys,...(e30?['mount-washer']:[])),...hubParts];
  const benchFrame = parts(...strutKeys,...(e30?['mount-washer']:[]));
  const spring = part('spring');
  const top = parts('mount-insulator',...(e30?['mount-washer']:[]),'upper-seat','upper-pad');
  const center = parts('shaft-nut','shaft-washer');
  const boot = parts('dust-boot','bump-stop');
  const perch = parts('lower-pad');
  const bench: Vec = [.06,-.14,.43];
  const shaftOut = sum(bench,[-.02,.39,.09]);
  const collarOut = sum(bench,[-.15,.04,.215]);
  const topAside = sum(bench,[-.22,.17,-.04]);
  const capAside = sum(bench,[.14,.085,.19]);
  const springTray = sum(bench,[.24,.05,.04]);
  const bootAside = sum(bench,[.22,.145,-.165]);
  const mountAside = sum(bench,[-.205,.245,.13]);
  const padAside = sum(bench,[.15,-.07,-.05]);
  const jointDown: Vec = [0,-.075,0];
  const barFastener = parts('drop-link-fastener');
  const tie = parts('tie-outer','tie-rod','tie-clamp-1');
  const e30Bar = e30 ? parts('drop-link') : [];
  const factorySpringTool=e30?'BMW 31 3 111 compressor with the 31 3 115 / 116 RWD fittings, or an equivalent that fits this strut.'
    :'Rated strut spring compressor with correctly fitting jaws and retainers.';
  const shaftTool=e30?'BMW 31 3 170 shaft-nut tool and the counterhold that fits the installed damper.'
    :'22 mm pass-through wrench or socket for the factory M14 nut, with the correct internal or external shaft counterhold.';
  const collarTool=e30?'BMW 31 3 150 or 31 3 180 collar tool, matched to the retaining ring, and a torque wrench.'
    :'Slotted gland-nut wrench matched to the installed collar and a torque wrench rated for 130 N·m.';
  return {
    id:e30?'e30-front-strut':'e34-front-strut',modelId:e30?'e30-325i-coupe-manual':'e34-525i-sedan-automatic',
    scope:front,relatedScopes:['system:suspension'],prefix:e30?right30:prefix34,
    title:'Strut & spring service',entryView:[.30,.34,1.38],clearanceAxis:'y',
    parts:[wheel,...brake,...strut,part('drop-link'),...(e30?[axle30+'antiroll-bar']:[])],
    attachedParts:{[hubParts[0]]:Object.values(hubHardware)},
    manuals:[service.strut,service.stack,service.cartridge],
    completed:'Right front strut reinstalled. Replace springs or cartridges in axle pairs. Verify brake pedal pressure, clear hose and wire routing, and alignment before normal use.',
    steps:[
      { action:'Start strut service', focus:[wheel], description:(e30?'1991 325i coupe with 51 mm RWD front struts. ':'1995 525i sedan with standard front struts. ')+preface,
        tools:standTools },
      { action:'Remove front wheel',access:[wheel],focus:[wheel],move:out([wheel],wheelOff),
        description:'Loosen the wheel bolts before raising the car. Take off the wheel and set it aside.',tools:'17 mm socket for the original wheel bolts' },
      { action:'Hang brake caliper',access:brake.slice(0,2),focus:brake.slice(0,2),move:out(brake,caliperHung),
        description:'Unbolt the complete caliper and carrier. Hang them securely from the body with the hose connected. Free the brake line and wire clips from the strut. Disconnect the ABS lead and free its cable, and free the pad sensor lead where fitted.'+
          (e30?' Follow BMW 31-11 for the electrical connections.':' Remove the ABS pulse sensor from the strut.'),
        tools:'19 mm socket for the carrier bolts, caliper hanger and tools that fit the original sensor and lead fasteners',manual:service.strut },
      { action:'Disconnect stabilizer link',access:[part('drop-link')],focus:e30?e30Bar:barFastener,
        move:[...out(barFastener,[.11,.05,.08]),...out(e30Bar,[.095,-.055,0])],
        description:e30?'With both front wheels at the same height, release the link at the stabilizer bar. The other end stays with the wishbone.'
          :'With both front wheels at the same height, release the upper end of the link at the strut. The link stays on the stabilizer bar.',
        tools:'17 mm wrench for the original M10 locknut and a counterhold matched to the link flats',manual:e30?manuals30.bar:manuals34.hardware },
      e30
        ? { action:'Release the two tapered joints',access:parts('control-arm','tie-outer'),focus:parts('control-nut','tie-outer-nut'),
            move:[...out(parts('control-nut','tie-outer-nut'),[0,.075,.095]),...out(parts('control-arm'),jointDown),...out(tie,[0,-.06,-.04])],
            description:'Remove the wishbone outer nut and the steering tie rod locknut. Press both tapers out of the strut arms. Support the knuckle throughout and keep grease off the tapers.',
            tools:'BMW 31 1 110 and 32 2 070 separators, 19 mm wishbone and 17 mm tie rod sockets for the original nuts',manual:service.strut }
        : { action:'Unbolt the steering arm',access:parts('steering-arm'),focus:levers,move:[...out(levers,[.03,-.09,.16]),...out(parts('steering-arm'),jointDown)],
            description:'Support the strut, remove the three M12 steering arm bolts and ease the steering arm down. The ball joints and tie rod remain on the steering arm. Note the mating notch.',
            tools:'19 mm six-point socket',manual:manuals34.hardware },
      { action:'Remove the complete strut',access:parts('strut'),focus:tower,move:[...out(tower,[-.18,.12,.20]),...out(strut,bench)],
        description:'Support the strut from below. Remove the three outer nuts at the tower and lower the complete assembly out of the wheel well. Keep it upright and secure it for bench work. Leave the center nut in place.',
        tools:'13 mm socket and a stable strut support or vise with soft jaws',manual:service.strut },
      { action:'Compress the spring',frame:benchFrame,focus:[spring],scaleY:[[spring,.89]],
        description:'Fit the compressor with the jaws secured to the specified coils. Compress evenly until the spring is free at the upper seat. The center nut retains the loaded spring. Keep it installed until the seat is free.',
        tools:factorySpringTool,manual:e30?manuals30.spring:manuals34.stack },
      { action:'Remove cap, shaft nut and washer',frame:benchFrame,focus:[part('top-cap'),...center],
        move:[[part('top-cap'),capAside],...out(center,sum(bench,[.03,.235,.14]))],
        description:'Lift the cap off, counterhold the piston rod and undo the center nut. Lift off the washer. Keep the spring held by the compressor.',
        tools:shaftTool,manual:e30?manuals30.spring:manuals34.hardware },
      { action:'Lift off mount, plate and upper pad',frame:benchFrame,focus:parts('top-mount','upper-seat','upper-pad'),
        move:[[part('top-mount'),mountAside],...out(top,topAside)],
        description:'Lift the mount, its shield and the upper seat stack off the shaft. Lay them out in the illustrated order. Check the bearing for roughness and match the markings on any camber-correction mount.',
        manual:service.stack },
      { action:'Remove spring and lower pad',frame:benchFrame,focus:[spring,...perch],move:[[spring,springTray],...out(perch,padAside)],scaleY:[[spring,1.07]],
        description:'Lift the captured spring clear of the housing. Slowly back off the compressor evenly in a clear area. Inspect both rubber pads and note where the end coils meet the stops.',
        tools:factorySpringTool,manual:service.stack },
      { action:'Remove the protection tube and bump stop',frame:benchFrame,focus:boot,move:out(boot,bootAside),
        description:'Slide the protection tube and bump stop off the shaft. Replace split tubes or crumbling stops.',manual:service.stack },
      { action:'Withdraw collar and damper insert',frame:benchFrame,focus:parts('gland-nut','damper'),
        move:[[part('gland-nut'),collarOut],[part('damper'),shaftOut]],
        description:'Use the fitted collar tool and pull the cartridge straight out. Drain any old oil and clean the housing. Follow the cartridge instructions for the housing fill. BMW calls for heat-transfer oil on the specified hydraulic insert and a dry housing for a gas cartridge.',
        tools:collarTool,manual:service.cartridge },
      { action:'Seat cartridge and tighten collar',frame:benchFrame,focus:parts('gland-nut','damper'),move:out(parts('gland-nut','damper'),bench),
        description:'Seat the correct insert in the cleaned bore. Start the collar by hand. Tighten the original-style collar to 130 N·m. Use the cartridge manufacturer’s specification if it supplies a different collar.',
        tools:collarTool,manual:service.cartridge },
      { action:'Refit tube, bump stop and lower pad',frame:benchFrame,focus:[...boot,...perch],move:out([...boot,...perch],bench),
        description:'Slide the protection tube and stop onto the shaft and settle the lower rubber pad into its steel perch.',manual:service.stack },
      { action:'Fit spring and upper seat',frame:benchFrame,focus:[spring,...top],move:out([spring,...top],bench),scaleY:[[spring,.89]],
        description:'Compress the spring evenly. Seat its end against the lower stop, then install the upper pad and plate with the other end in its stop. Restore the upper shaft stack in the manual’s order.',
        tools:factorySpringTool,manual:service.stack },
      { action:'Fit mount and tighten shaft nut',frame:benchFrame,focus:[part('top-mount'),...center],move:out([part('top-mount'),...center],bench),
        description:'Seat the mount and fit a new locknut with its washer. Counterhold the shaft. '+(e30
          ? 'For the original M12 shaft, use 64 N·m with an external hex or 44 N·m with an internal hex.'
          : 'Bentley specifies 65 N·m for an external hex shaft or 45 N·m for an internal hex shaft.')+
          ' Follow the replacement insert instructions when its hardware differs.',
        tools:shaftTool,manual:e30?manuals30.torque:manuals34.cartridge },
      { action:'Release compressor and refit cap',frame:benchFrame,focus:[spring,part('top-cap')],move:out([part('top-cap')],bench),scaleY:[[spring,1]],
        description:'Release the compressor evenly while checking that both end coils stay against their stops. Remove the tool and put the cap back.',
        tools:factorySpringTool,manual:service.stack },
      { action:'Mount strut at the tower',frame:benchFrame,focus:tower,move:out([...strut,...tower],installed),
        description:'Guide the strut back into the tower from below. Install three new self-locking nuts and tighten each to 22 N·m.',
        tools:'13 mm socket and low-range torque wrench',manual:e30?manuals30.torque:manuals34.hardware },
      e30
        ? { action:'Seat wishbone and tie rod',focus:parts('control-nut','tie-outer-nut'),move:out([...parts('control-arm','control-nut','tie-outer-nut'),...tie],installed),
            description:'Seat both clean, dry tapers. With new factory-style locking hardware, torque the wishbone outer nut to 65 N·m and the tie rod nut to 36.5 ± 3.5 N·m. Retain the castle nut and cotter pin design if present.',
            tools:'19 mm wishbone and 17 mm tie rod sockets for the original nuts',manual:manuals30.torque }
        : { action:'Refit the steering arm',focus:levers,move:out([...levers,part('steering-arm')],installed),
            description:'Align the mating notch. Clean the threads and use Loctite 270 or equivalent as Bentley specifies. Torque the three steering-arm bolts to 110 N·m.',
            tools:'19 mm six-point socket and torque wrench',manual:manuals34.hardware },
      { action:'Reconnect stabilizer link',focus:barFastener,move:out([...barFastener,...e30Bar],installed),
        description:e30?'Fit the new nut at the bar and tighten to 47 N·m.':'Fit the new strut-side locknut and tighten to 59 N·m.',
        tools:'17 mm wrench for the original locknut and a counterhold',manual:e30?manuals30.torque:manuals34.hardware },
      { action:'Refit caliper and wiring',focus:brake.slice(0,2),move:out(brake,installed),
        description:'Refit the caliper assembly and secure the brake line, ABS lead and any wear lead in their mounts. '+(e30
          ? 'Torque the original threads of the Girling carrier bolts to 123 N·m, lightly oiled per BMW.'
          : 'Tighten the caliper carrier to the strut housing to 110 N·m.')+' Check for clearance through steering travel.',
        tools:'19 mm socket and torque wrench',manual:e30?bmw('34',643,'BMW 34-4 · Front Girling brakes'):manuals34.hardware },
      { action:'Refit wheel and check',focus:[wheel],move:out([wheel],installed),
        description:'Fit the wheel and tighten the original bolts crosswise to '+(e30?'110 N·m.':'100 ± 10 N·m.')+
          ' Pump the brake pedal until firm and check the pedal before moving the car. '+toeReady,
        tools:'17 mm socket and torque wrench',manual:e30?manuals30.wheel:manuals34.hardware },
    ],
  };
}

const removeWheel = (wheel:string): AssemblyStep => ({
  action:'Remove front wheel',access:[wheel],focus:[wheel],move:out([wheel],wheelOff),description:'Break the wheel bolts loose on the ground, then lift the car and remove the wheel.',
  tools:standTools,
});

const finishWheel = (wheel:string,e30:boolean): AssemblyStep => ({
  action:'Refit wheel and check alignment',focus:[wheel],move:out([wheel],installed),
  description:'Tighten the stock wheel bolts crosswise to '+(e30?'110 N·m.':'100 ± 10 N·m.')+' Check steering travel, boot clearance and hose routing. '+toeReady,
  tools:'17 mm socket and torque wrench',manual:e30?manuals30.wheel:manuals34.toe,
});

const built30 = ['control-bolt-1','control-bolt-2'];
const e30Arms: AssemblyProcedure = {
  id:'e30-front-arms',modelId:'e30-325i-coupe-manual',scope:front,relatedScopes:['system:suspension'],
  prefix:right30,title:'Front wishbone service',entryView:[.63,.63,1.32],clearanceAxis:'y',
  parts:['wheel','strut','strut-spindle','hub','control-arm','control-bush',axle30+'subframe',axle30+'antiroll-bar'],
  manuals:[manuals30.arms,manuals30.bush,manuals30.torque],
  completed:'Right wishbone reinstalled. Check the opposite side for play, splits, or bushing movement. Have the front alignment checked.',
  steps:[
    {action:'Start wishbone service',focus:['control-arm'],description:'This is the original RWD steel wishbone and rear bushing. '+preface},
    removeWheel(right30+'wheel'),
    {action:'Release the stabilizer link',access:['drop-link'],focus:['drop-link-fastener','drop-link'],move:out(['drop-link-fastener'],[.11,.06,.06]),
      description:'Unload the stabilizer bar and undo the upper link nut. Support the hub and strut so the brake hose cannot be pulled.',
      tools:'17 mm wrench for the M10 link nut, with a counterhold on the stud flats',manual:manuals30.bar},
    {action:'Unbolt the rear bushing carrier',focus:built30,move:out(built30,[-.08,-.09,.16]),
      description:'Undo both bolts at the rear bushing carrier. Note the orientation of the carrier and the bushing marks.',
      tools:'17 mm socket for the original M10 bolts',manual:manuals30.arms},
    {action:'Separate inner and outer tapers',focus:['control-inner-nut','control-nut'],
      move:[['control-inner-nut',[.04,.105,-.025]],['control-nut',[.08,.075,.12]]],
      description:'Remove the inner and outer locking nuts. Break the inner taper from the carrier using the factory procedure and the outer taper from the strut with the separator. Protect the tapered studs and boots.',
      tools:'22 mm inner joint wrench, '+stablePress30,manual:manuals30.arms},
    {action:'Lower the wishbone and bushing carrier',focus:['control-arm','control-bush'],move:out(['control-arm','control-bush','drop-link'],[-.07,-.13,.29]),
      description:'Withdraw the wishbone with the rear carrier. If reusing the original rear carrier, use BMW 31 2 130 or the correct fitting tools for the bushing and align its marks. Follow the BMW normal-load fitting and settling procedure.',
      tools:'BMW 31 2 130 bushing fixture when reusing the carrier',manual:manuals30.bush},
    {action:'Refit the wishbone and torque the joints',focus:['control-arm','control-inner-nut','control-nut'],move:out(['control-arm','control-bush','drop-link','control-inner-nut','control-nut'],installed),
      description:'Seat both dry tapers, using their specified new locking nuts. Tighten the inner M14 joint to 85 N·m and the outer joint to 65 N·m.',
      tools:'22 mm inner and 19 mm outer factory nut tools and a torque wrench',manual:manuals30.torque},
    {action:'Secure the carrier and stabilizer link',focus:[...built30,'drop-link-fastener'],move:out([...built30,'drop-link-fastener'],installed),
      description:'Install both carrier bolts and torque them to 42 N·m. Refit the stabilizer link at the bar with its new locknut and tighten to 47 N·m.',
      tools:'17 mm socket and counterhold',manual:manuals30.torque},
    finishWheel(right30+'wheel',true),
  ],
};

const arm34 = stable34['control-arm'];
const thrust34 = stable34['thrust-arm'];
const lever34 = ['lever-bolt-1','lever-bolt-2','lever-bolt-3'];
const e34Arms: AssemblyProcedure = {
  id:'e34-front-arms',modelId:'e34-525i-sedan-automatic',scope:front,relatedScopes:['system:suspension'],
  prefix:prefix34,title:'Control & thrust arm service',entryView:[.87,.39,1.35],clearanceAxis:'y',
  parts:[wheel34,arm34,thrust34,stable34.strut,'strut-spindle','steering-arm','e34sys:front-thrust-bracket--1','e34sys:front-subframe'],
  manuals:[manuals34.arms,manuals34.bush,manuals34.thrustFit],
  completed:'Both right-side arms reinstalled. Verify loaded bushing torque, steering freedom and front alignment.',
  steps:[
    {action:'Start control arm service',focus:[arm34,thrust34],description:'This RWD 525i shows the aluminum lower arm and separate thrust arm. '+preface},
    removeWheel(wheel34),
    {action:'Lower the steering arm',access:['steering-arm'],focus:lever34,move:[...out(lever34,[.02,-.075,.20]),['steering-arm',[0,-.062,.01]]],
      description:'Remove the three bolts and lower the steering arm just enough to expose the lower control arm ball joint. Support it and note the mating notch.',
      tools:'19 mm six-point socket',manual:manuals34.arms},
    {action:'Remove lower control arm',focus:[arm34,'control-nut','control-bolt','control-inner-nut'],
      move:[[arm34,[.15,-.095,.27]],['control-nut',[.02,.09,.15]],['control-bolt',[-.20,.025,.09]],['control-inner-nut',[.15,.01,.04]]],
      description:'Remove the joint nut and press out the ball joint. Undo the bushing through-bolt and withdraw the complete lower arm. Keep the washer on each side identified.',
      tools:'BMW 31 1 110 separator, 22 mm for the original M14 joint nut and 19 mm for the original M12 through-bolt hardware',manual:manuals34.bush},
    {action:'Fit lower control arm',focus:[arm34,'control-nut','control-inner-nut'],
      move:[[arm34,[0,-.028,0]],['control-nut',[0,-.048,0]],...out(['control-bolt','control-inner-nut'],installed)],
      description:'Install the through-bolt with its washers and a new nut. Leave the bushing bolt loose until the car is normally loaded. Seat the taper and torque the new ball joint nut to 93 N·m.',
      tools:'22 mm socket or offset wrench for the original M14 joint nut, 19 mm for the through-bolt hardware',manual:manuals34.bush},
    {action:'Bolt steering arm to strut',focus:lever34,move:out([...lever34,'steering-arm',arm34,'control-nut'],installed),
      description:'Align the notch and install the clean bolts with Loctite 270 or equivalent. Torque all three to 110 N·m.',
      tools:'19 mm socket and torque wrench',manual:manuals34.hardware},
    {action:'Remove the thrust arm',focus:[thrust34,'thrust-nut','thrust-bolt','thrust-inner-nut'],
      move:[[thrust34,[-.15,-.085,.30]],['thrust-nut',[-.14,.08,.14]],['thrust-bolt',[-.03,-.05,-.18]],['thrust-inner-nut',[.01,0,.14]]],
      description:'Remove the ball joint nut and separate the taper from the steering arm. Pull the bushing through-bolt and withdraw the arm. Inspect the hydraulic bushing for leaks and splits.',
      tools:'BMW 31 2 140 separator and 22 mm wrench or socket for the original M14 hardware',manual:manuals34.thrust},
    {action:'Fit the thrust arm',focus:[thrust34,'thrust-nut','thrust-inner-nut'],move:out([thrust34,'thrust-nut','thrust-bolt','thrust-inner-nut'],installed),
      description:'Fit the through-bolt with its washers and a new self-locking nut, still loose. Seat the ball joint and torque its new locknut to 93 N·m. If replacing a bushing, Bentley shows the press direction and alignment marks.',
      tools:'22 mm wrench or socket and torque wrench, plus BMW 31 1 052 / 053 press fittings if changing the thrust bush',manual:manuals34.thrustFit},
    {action:'Refit wheel and settle suspension',focus:[wheel34],move:out([wheel34],installed),
      description:'Torque the original wheel bolts crosswise to 100 ± 10 N·m. Lower the car onto a level drive-on platform and load the car as described in Bentley 310-5.',
      tools:'17 mm socket and torque wrench, and a drive-on lift or approved level ramps',manual:manuals34.arms},
    {action:'Torque bushings at normal load',focus:['control-inner-nut','thrust-inner-nut'],
      description:'With the suspension settled under the specified normal load, tighten the lower arm through-bolt to 78 N·m and the thrust arm through-bolt to 127 N·m. '+toeReady,
      tools:'19 mm and 22 mm tools for the original through-bolt hardware, and a torque wrench',manual:manuals34.thrustFit},
  ],
};

const tieTools30 = 'BMW 32 2 070 tapered-joint separator and 17 mm socket for the original M10 nut';
const bootClamps = ['rack-boot-clip','rack-outer-clip'];
const rackOff: Vec = [-.12,-.105,.20];
const tie30: AssemblyProcedure = {
  id:'e30-front-tie-rods',modelId:'e30-325i-coupe-manual',scope:steering,relatedScopes:[front,'system:suspension'],
  prefix:right30,title:'Steering tie rod service',entryView:[-.66,.45,1.24],clearanceAxis:'z',
  parts:['wheel','strut-spindle',axle30+'steering-rack'],
  manuals:[manuals30.rod,manuals30.torque],
  completed:'Right tie rod seated and boot sealed. The recorded length is a starting setting. Set toe at normal load before returning the car to use.',
  steps:[
    {action:'Start tie rod service',focus:['tie-rod','tie-outer'],description:'This is the hydraulic rack on the RWD 325i. '+preface},
    removeWheel(right30+'wheel'),
    {action:'Record the tie rod length',focus:['tie-outer','tie-clamp-1'],
      description:'Center the steering and measure the complete tie rod to repeatable points. Mark the outer end’s depth in the threaded sleeve. Keep the measurement for this side.',
      tools:'Vernier caliper or steel rule and paint marker',manual:manuals30.rod},
    {action:'Release the outer tie rod taper',focus:['tie-outer-nut','tie-outer'],
      move:[['tie-outer-nut',[.04,.09,.10]],['tie-outer',[0,-.048,0]],['tie-rod',[0,-.020,0]],['tie-clamp-1',[0,-.040,0]]],
      description:'Remove the locknut and press the taper from the strut arm. Keep the joint bore clean and dry. Preserve the original castle nut and cotter pin design if fitted.',
      tools:tieTools30,manual:manuals30.rod},
    {action:'Open clamps and slide back boot',access:['rack-boot'],focus:[...bootClamps,'rack-boot'],
      move:[...out(bootClamps,[.058,.065,-.10]),['rack-boot',[.137,.004,.23]]],
      description:'Free the boot clamps and slide the bellows off the rack end. Inspect it for splits or trapped fluid. Keep grit out of the rack.',
      tools:'Boot clamp pliers or the release tool for the fitted straps',manual:manuals30.rod},
    {action:'Unlock securing plate',access:['rack-lock'],focus:['rack-lock'],move:[['rack-lock',[.07,.06,.11]]],
      description:'Unbend the securing tab with pliers. Keep the steering away from full lock while working at the open rack.',
      tools:'Water-pump pliers to release the original locking tab',manual:manuals30.rod},
    {action:'Unscrew tie rod from rack',focus:['tie-rod','tie-outer'],move:out(['tie-rod','tie-outer','tie-clamp-1'],rackOff),
      description:'Counterhold the rack as shown for the fitted unit and remove the inner joint. Keep the rack threads and seal surfaces clean.',
      tools:'BMW 32 2 100 standard inner-joint tool, or 32 2 110 on the steering-damper version',manual:manuals30.rod},
    {action:'Unthread the outer end',focus:['tie-outer','tie-clamp-1'],
      move:[['tie-clamp-1',sum(rackOff,[.04,.07,-.04])],['tie-outer',sum(rackOff,[.02,-.02,.125])]],
      description:'Hold the rod, loosen the pinch clamp and count turns as you remove the outer end. Match the joint and threads before fitting a replacement.',
      tools:'13 mm tools for the original M8 pinch fastener and a wrench that fits the rod flats',manual:manuals30.rod},
    {action:'Set the new outer end',focus:['tie-outer','tie-clamp-1'],move:out(['tie-outer','tie-clamp-1'],rackOff),
      description:'Thread the outer end in to the recorded starting length. Check thread engagement and leave the clamp ready for final toe adjustment.',
      tools:'13 mm tools and a caliper or steel rule',manual:manuals30.rod},
    {action:'Fit plate and torque inner joint',focus:['rack-lock','tie-rod'],
      move:[['rack-lock',installed],['tie-rod',installed],['tie-clamp-1',[0,-.040,0]],['tie-outer',[0,-.048,0]]],
      description:'Fit a new securing plate with its shoulder in the rack opening. Tighten the inner joint to 75 N·m, then bend the tab into place with pliers. Support the rack as the procedure specifies.',
      tools:'BMW 32 2 100 or 32 2 110, torque wrench and water-pump pliers',manual:manuals30.torque},
    {action:'Seal the rack boot',focus:['rack-boot',...bootClamps],move:out(['rack-boot',...bootClamps],installed),
      description:'Seat the boot at both grooves without twisting it. Secure both clamps and restore the vent connection if fitted.',
      tools:'Boot clamp pliers matched to the fitted straps',manual:manuals30.rod},
    {action:'Seat the outer taper',focus:['tie-outer','tie-outer-nut'],move:out(['tie-outer','tie-outer-nut','tie-clamp-1'],installed),
      description:'Fit the correct locking hardware. BMW gives 36.5 ± 3.5 N·m for the original design. A stud drilled for a cotter pin uses its castle nut and a new pin.',
      tools:'17 mm socket on the original M10 nut and a torque wrench',manual:manuals30.torque},
    {action:'Fit wheel and set toe',focus:[right30+'wheel','tie-clamp-1'],move:out([right30+'wheel'],installed),
      description:'Tighten the original wheel bolts crosswise to 110 N·m. With the car at normal load and toe set, tighten the original tie rod clamp bolt to 14 N·m.',
      tools:'17 mm socket for wheel bolts, 13 mm tools for the factory M8 clamp, torque wrench and alignment equipment',manual:manuals30.torque},
  ],
};

const tie34Service: AssemblyProcedure = {
  id:'e34-front-tie-rods',modelId:'e34-525i-sedan-automatic',scope:steering,relatedScopes:[front,'system:suspension'],
  prefix:prefix34,title:'Outer tie rod service',entryView:[-.65,.54,1.23],clearanceAxis:'y',
  parts:[wheel34,'steering-arm','e34sys:center-drag-link'],
  manuals:[manuals34.rod,manuals34.center,manuals34.toe],
  completed:'Right outer tie rod reinstalled. Verify steering travel and set toe before normal use.',
  steps:[
    {action:'Start outer tie rod service',focus:[stable34['tie-rod']],
      description:'This 525i uses a steering box, center link and a separate adjustable tie rod on each side. '+preface},
    removeWheel(wheel34),
    {action:'Measure the installed tie rod',focus:['tie-inner','tie-outer'],
      description:'Center the steering. Measure the complete tie rod between repeatable points and mark each end. Record thread direction and engagement.',
      tools:'Vernier caliper or steel rule and a paint marker',manual:manuals34.rod},
    {action:'Separate both tapered joints',focus:['tie-inner-nut','tie-outer-nut'],
      move:[['tie-inner-nut',[0,.08,-.12]],['tie-outer-nut',[.06,.09,.13]]],
      description:'Remove the two locknuts. Press the tapers out at the steering arm and the center link without damaging the boots.',
      tools:'BMW 32 2 050 separator and 17 mm socket for the original M10 nuts',manual:manuals34.rod},
    {action:'Remove the outer tie rod',focus:[stable34['tie-rod'],'tie-inner','tie-outer'],
      move:out([stable34['tie-rod'],'tie-inner','tie-outer','tie-clamp-1','tie-clamp-2'],[.04,-.14,.20]),
      description:'Lower the complete tie rod to the bench with its adjustment sleeve and clamps.',
      manual:manuals34.rod},
    {action:'Unthread the two tie rod ends',focus:['tie-inner','tie-outer','tie-clamp-1','tie-clamp-2'],
      move:[['tie-inner',[-.07,-.15,.103]],['tie-outer',[.20,-.145,.29]],['tie-clamp-1',[.04,-.06,.14]],['tie-clamp-2',[.09,-.07,.24]]],
      description:'Loosen the clamp bolts and count turns as you remove each end. Identify the left-hand and right-hand threads before fitting replacements.',
      tools:'13 mm tools for the original M8 clamp bolts and a wrench matched to the joint flats',manual:manuals34.rod},
    {action:'Set both ends to the recorded length',focus:[stable34['tie-rod'],'tie-inner','tie-outer'],
      move:out(['tie-inner','tie-outer','tie-clamp-1','tie-clamp-2'],[.04,-.14,.20]),
      description:'Thread in the matching ends to the recorded length and check thread engagement. Fit new clamp locking nuts.',
      tools:'13 mm tools and a caliper or steel rule',manual:manuals34.rod},
    {action:'Seat and torque both ends',focus:['tie-inner-nut','tie-outer-nut'],
      move:out([stable34['tie-rod'],'tie-inner','tie-outer','tie-inner-nut','tie-outer-nut','tie-clamp-1','tie-clamp-2'],installed),
      description:'Seat both tapers with clean bores and install new locknuts. Tighten each joint to 37 N·m.',
      tools:'17 mm socket for the original M10 nuts and a torque wrench',manual:manuals34.rod},
    {action:'Fit wheel and set toe',focus:[wheel34,'tie-clamp-1','tie-clamp-2'],move:out([wheel34],installed),
      description:'Torque the stock wheel bolts crosswise to 100 ± 10 N·m. Once toe is set, tighten each tie rod clamp bolt to 14 N·m.',
      tools:'17 mm socket, 13 mm tools for the original M8 clamp bolts, torque wrench and alignment equipment',manual:manuals34.center},
  ],
};

const centerLink = 'e34sys:center-drag-link';
const outerEndCenters = ['e34axle:left-tie-inner','e34axle:right-tie-inner'];
const outerEndNuts = ['e34axle:left-tie-inner-nut','e34axle:right-tie-inner-nut'];
const centerNuts = ['center-left-nut','center-right-nut'];
const center34: AssemblyProcedure = {
  id:'e34-center-link',modelId:'e34-525i-sedan-automatic',scope:steering,relatedScopes:[front],
  prefix:'e34steer:',title:'Center tie rod service',entryView:[-.48,-.77,1.13],clearanceAxis:'y',
  parts:[centerLink,'e34sys:pitman-arm','e34sys:idler-arm','e34sys:tie-rod-1','e34sys:tie-rod--1',
    'e34axle:left-tie-outer','e34axle:right-tie-outer'],
  manuals:[manuals34.center,manuals34.toe],
  completed:'Center tie rod reinstalled. Check steering freedom and verify alignment.',
  steps:[
    {action:'Start center tie rod service',focus:[centerLink],description:'The center link runs from the steering box pitman arm on the left to the idler arm on the right. '+preface},
    {action:'Release both outer tie rods',focus:outerEndNuts,
      move:[...out(outerEndNuts,[.05,.08,.04]),...out(outerEndCenters,[0,.056,0])],
      description:'Support the linkage. Remove the locknuts at the two outer tie rod joints and press the tapers out. Leave the outer ends and toe adjustments in place.',
      tools:'BMW 32 2 050 separator and 17 mm wrench for the original M10 nuts',manual:manuals34.center},
    {action:'Separate pitman and idler joints',focus:centerNuts,
      move:[['center-left-nut',[-.10,.09,-.06]],['center-right-nut',[.10,.08,.08]]],
      description:'Remove the two remaining locknuts and separate the tapers from the pitman and idler arms. Support the link while pressing the final joint free.',
      tools:'BMW 32 2 040 separator and wrenches that seat fully on the fitted locknuts',manual:manuals34.center},
    {action:'Lower center link',focus:[centerLink],move:out([centerLink],[.11,-.14,.09]),
      description:'Lower the center link clear. Compare the replacement with the original and check the pitman and idler arms for play.',manual:manuals34.center},
    {action:'Install pitman and idler joints',focus:centerNuts,move:out([centerLink,...centerNuts],installed),
      description:'Install new locknuts. Torque the pitman arm connection to 59 N·m and the idler connection to 37 N·m.',
      tools:'Wrenches matched to the original hardware and a torque wrench',manual:manuals34.center},
    {action:'Reconnect outer tie rods',focus:outerEndNuts,move:out([...outerEndNuts,...outerEndCenters],installed),
      description:'Seat the outer tie rods in the link with new self-locking nuts. Torque both to 37 N·m. '+toeReady,
      tools:'17 mm socket for the original M10 nuts and a torque wrench',manual:manuals34.center},
  ],
};

export const frontAxleServices = {
  'e30-front-strut':frontStrut(true),
  'e34-front-strut':frontStrut(false),
  'e30-front-arms':e30Arms,
  'e34-front-arms':e34Arms,
  'e30-front-tie-rods':tie30,
  'e34-front-tie-rods':tie34Service,
  'e34-center-link':center34,
} satisfies Partial<Record<AssemblyServiceId,AssemblyProcedure>>;
