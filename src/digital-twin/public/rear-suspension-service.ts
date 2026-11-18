import type { AssemblyProcedure, AssemblyStep, ManualLink } from './assembly-service';
import type { Vec } from './model';
import { e30Handbook } from '../../series/e30-manual';
import e30Pin from '../../../data/digital-twin/e30-candidate.json';
import e34Pin from '../../../data/digital-twin/525i-service-release.json';

type Side = 'left' | 'right';
type Series = 'e30' | 'e34';
export type RearSuspensionServiceId =
  | `e30-${Side}-rear-${'shock' | 'spring' | 'arm'}`
  | `e34-${Side}-rear-${'strut' | 'arm'}`;

const zero: Vec = [0, 0, 0];
const move = (ids: string[], offset: Vec = zero): [string, Vec][] => ids.map(id => [id, offset]);
const page = (chapter: string, number: number, title: string): ManualLink => ({ title, href: '/manual/' + chapter + '?pdf=' + number });
const scan = (number: string, title: string): ManualLink => ({ title, href: 'https://e30mpower.com/33%20-%20Rear%20Axle/33-' + number + '.jpg' });
const factoryTorque = { title: 'BMW workshop archive · 33-17 shock torque table', href: 'https://sdfbbedf4bd486017.jimcontent.com/download/version/1557524722/module/7487515011/name/Anzugsdrehmomente%20BMW.pdf' };
const brakeUnionTorque = { title: 'BMW workshop archive · 34 32 brake line couplings', href: factoryTorque.href };
const laterShockTorque = { title: 'BMW TIS 33 52 · Shock torque and hardware', href: 'https://workshop-manuals.com/bmw/3_series_e30/316i_m10_sal/4_tightening_torques/33__rear_axle/52__shock_absorber/1_azd__shock_absorbers/' };
const pivotTorque = { title: 'BMW TIS 33 32 1AZ · Pivot bolt torque by grade', href: 'https://workshop-manuals.com/bmw/5_series_e34/525i_m50_sal/4_tightening_torques/33__rear_axle/32__control_arms_and_struts/1_azd__control_arms_and_struts/' };
const barTorque = { title: 'BMW TIS 33 55 · Rear anti-roll bar', href: 'https://workshop-manuals.com/bmw/3_series_e30/m3_s14_conver/4_tightening_torques/33__rear_axle/55__stabiliser_bar/1_azd__stabilizer_bar/' };
const axleTorque = { title: 'BMW TIS 33 21 · CV bolts by type', href: 'https://workshop-manuals.com/bmw/3_series_e30/320i_m20_conver/4_tightening_torques/33__rear_axle/21__output_shafts/1_azd__output_shaft/' };
const mountTorque = { title: 'BMW TIS 33 17 4AZ · Final drive rear mount', href: 'https://workshop-manuals.com/bmw/3_series_e30/320i_m20_conver/4_tightening_torques/33__rear_axle/17__final_drive_mounting/1_azd__final_drive_unit_mountings/page_1064/' };
const e30Wheel = { title: 'BMW 325i handbook · Wheel installation', href: e30Handbook + '#page=59' };
const e34Wheel = page('330', 302, 'Bentley 330-4 · Wheel and lower strut torques');
const loadedE34 = 'Bentley’s normal position uses a full tank, 68 kg on each front seat, 68 kg at the center of the rear seat and 21 kg in the trunk.';
const armTorque = 'Tighten at normal loaded ride height. BMW specifies 67 N·m for standard M12 pivot bolts and 77 N·m for bolts marked 10.9. Use new self-locking nuts.';
const e30Lower = 'With the car at normal loaded ride height, match the bolt grade and the shock maker’s instructions to the applicable torque table. The workshop archive lists 87 N·m for the standard E30 row and 130 N·m for its 10.9 row. The later BMW TIS table lists 77 N·m for its E30 application.';
const cvSpec = 'Use new screws. The later BMW 33 21 table specifies 60 N·m for the plain M10 × 50 class 10.9 bolts shown. Check the table for any different heads or locking teeth.';
const prepTools = 'Lift or rated stands, wheel chocks, and a jack under the trailing arm';
const wheelsOn = 'Refit the wheel, start the bolts by hand and torque them in a cross pattern. ';
const wheelValue = (e30: boolean) => e30 ? 'Use 110 N·m on the stock 325i wheels.' : 'Use 100 ± 10 N·m on the stock 525i wheels.';
const wheelSocket = '17 mm wheel-bolt socket and torque wrench';

const bmw = {
  layout: page('33', 618, 'BMW 33-0 · 15° rear axle layout'),
  shock: page('33', 636, 'BMW 33-16 · Rear shock removal and refit'),
  spring: page('33', 637, 'BMW 33-17 · Barrel spring removal and refit'),
  arm: page('33', 628, 'BMW 33-7 · Trailing arm removal and refit'),
  bush: page('33', 629, 'BMW 33-8 · Pressing both trailing arm bushings'),
  brakes: page('34', 640, 'BMW 34-1 to 34-3 · Bleeding and parking brake'),
  exhaust: page('18', 354, 'BMW 18-12 · Rear silencer access'),
  output: page('33', 625, 'BMW 33-4 · Rear axle shaft'),
};
const bentley = {
  strut: page('330', 301, 'Bentley 330-3 · Rear strut removal'),
  spring: page('330', 302, 'Bentley 330-4 · Rear strut on the bench'),
  stack: page('330', 303, 'Bentley 330-5 · Spring seating and piston-rod torque'),
  ride: page('330', 300, 'Bentley 330-2 · Normal loaded position'),
  arm: page('330', 306, 'Bentley 330-8 to 330-9 · Rear trailing arm'),
  bush: page('330', 308, 'Bentley 330-10 · Pivot bushings and arm torques'),
  output: page('330', 305, 'Bentley 330-7 · Drive axle CV joints'),
  brakes: page('340', 326, 'Bentley 340-10 to 340-11 · Parking brake'),
  bleed: page('340', 328, 'Bentley 340-12 · Bleeding the brakes'),
};

function corner(series: Series, side: Side) {
  const e30 = series === 'e30';
  const sign = side === 'left' ? -1 : 1;
  const suffix = side === 'left' ? '1' : '-1';
  const p30 = 'e30assembly:rear-' + side + ':';
  const rear34 = (name: string) => 'e34sys:rear-' + name + '-' + suffix;
  const hub = e30 ? p30 + 'hub' : 'e34sys:hub-rear-' + suffix;
  const cfg = {
    e30, side, sign,
    wheel: e30 ? p30 + 'wheel' : 'wheel:rear-' + side,
    carrier: e30 ? 'e30assembly:rear-axle:rear-subframe' : 'e34sys:rear-subframe',
    arm: e30 ? p30 + 'trailing-arm' : rear34('trailing-arm'),
    damper: e30 ? p30 + 'damper' : rear34('damper'),
    spring: e30 ? p30 + 'spring' : rear34('coil-spring'),
    lowerPad: e30 ? 'lower-pad' : rear34('spring-pads'),
    mount: e30 ? 'top-mount' : rear34('top-mount'),
    boot: e30 ? 'boot' : rear34('dust-tube'),
    axle: e30 ? p30 + 'halfshaft' : 'e34sys:halfshaft-' + suffix,
    hub,
    rotor: e30 ? p30 + 'rotor' : 'e34sys:brake-disc-rear-' + suffix,
    calipers: e30 ? [p30 + 'caliper', p30 + 'carrier'] : ['e34sys:brake-caliper-rear-' + suffix, 'e34brake:rear-' + side + '-carrier'],
    shield: e30 ? p30 + 'shield' : 'e34sys:brake-shield-rear-' + suffix,
    link: e30 ? 'drop-link' : rear34('drop-link'),
    shellAccess: e30 ? ['e30trim:trunk-liner-' + side] : ['e34sys:rear-seat-cushion', 'e34sys:rear-seat-backrest', 'e34trim:trunk-liner-' + side],
    pivots: ['inner-bushing', 'outer-bushing'],
    throughBolts: ['inner-bolt','outer-bolt'],
    lockNuts: ['inner-nut','outer-nut'],
    topNuts: e30 ? ['upper-nut-1','upper-nut-2'] : ['upper-nut-1','upper-nut-2','upper-nut-3'],
    topStuds: e30 ? ['upper-stud-1','upper-stud-2'] : ['upper-stud-1','upper-stud-2','upper-stud-3'],
  };
  return cfg;
}
type Corner = ReturnType<typeof corner>;

function basics(series: Series, c: Corner, topic: string, relatedTopics: string[] = []) {
  const pin = c.e30 ? e30Pin : e34Pin;
  return {
    modelId: pin.id, minimumRevision: c.e30 ? 1200 : 1055,
    scope: 'system:rear-suspension', prefix: series + 'rear-suspension:' + c.side + ':',
    topic, relatedTopics, side: c.side, relatedScopes: ['system:rear-brakes','system:differential'],
    entryView: [-.74,.37,1.32*c.sign] as Vec, clearanceAxis: 'y' as const,
  };
}

function support(c: Corner, manual: ManualLink): AssemblyStep {
  return { action:'Support the car and trailing arm', focus:[c.arm,c.damper,c.wheel],
    description:'Chock the wheels on level ground. Support the body at the approved lifting points and the trailing arm independently. A detached shock lets the arm droop.',
    tools:prepTools, manual };
}

function takeWheel(c: Corner): AssemblyStep {
  return { action:'Remove the road wheel', focus:[c.wheel,c.hub], access:[c.wheel],
    move:move([c.wheel],[.12,.03,c.sign*.32]),
    description:'Loosen the wheel bolts before raising the car. With the body supported, remove the bolts and lift the wheel clear. Confirm the arm jack is stable.',
    tools:wheelSocket, manual:c.e30?e30Wheel:e34Wheel };
}

function finishWheel(c: Corner): AssemblyStep {
  return { action:'Refit the wheel', focus:[c.wheel,c.hub], move:move([c.wheel]),
    description:wheelsOn+wheelValue(c.e30), tools:wheelSocket, manual:c.e30?e30Wheel:e34Wheel };
}

function shockService(series: Series, side: Side): AssemblyProcedure {
  const c=corner(series,side);
  const e30=c.e30,s=c.sign;
  const main=e30?bmw.shock:bentley.strut;
  const lower=['lower-bolt', 'lower-washer'];
  const upper=[c.mount,'mount-gasket',...c.topStuds,'rod-nut','rod-washer'];
  const towerTrim=[...c.shellAccess,...(e30?[]:['top-cap'])];
  const springs=e30?[]:[c.spring,c.lowerPad,'upper-pad','spring-cup'];
  const pack=[c.damper,...upper,...springs,c.boot,'bump-stop'];
  const onStand:Vec=[-.10,-.19,s*.54];
  const benchTop:Vec=[-.16,.04,s*.64];
  const trimOff:Vec=[.30,.15,-s*.25];
  const springAside:Vec=[.095,-.14,s*.68];
  const topTools='13 mm socket, extension and low-range torque wrench';
  const pistonTools=e30
    ? 'Pass-through socket for the original M10 × 1 locknut, typically 17 mm, and a wrench on the rod flats'
    : 'Pass-through socket for the M10 × 1 locknut, 16 mm or 17 mm by nut style, and the damper’s rod counterhold';
  const lowerTools=(e30?'19 mm for the M12 hex bolt':'22 mm for the M14 hex bolt')+' and a torque wrench';
  const steps: AssemblyStep[]=[
    support(c,main),takeWheel(c),
    ...(e30?[{action:'Undo the lower shock bolt',focus:[c.damper,c.arm,...lower],frame:[c.damper,c.arm],access:lower,
      move:move(lower,[0,.018,s*.13]),
      description:'With the arm supported at its installed height, withdraw the lower bolt and washer. Keep the jack there while the shock is disconnected. The barrel spring remains in its seats.',
      tools:lowerTools,manual:main} satisfies AssemblyStep]:[]),
    {action:e30?'Expose the top mount in the trunk':'Expose the rear strut tower behind the seat',
      focus:towerTrim,frame:[c.mount,...c.topNuts],access:towerTrim,move:move(towerTrim,trimOff),
      description:e30?'Open the trunk and peel back the side liner on this side to expose the two mount nuts.'
        :'Lift out the rear seat cushion and unfasten the backrest per Group 520. Move the tower trim aside and lift its cap to reach the three mount nuts.',
      tools:'Trim clip tool and sockets for the rear seat fasteners where fitted',manual:main},
    {action:'Release the upper mount nuts',focus:[c.mount,...c.topNuts],frame:[c.mount,...c.topNuts],access:c.topNuts,
      move:move(c.topNuts,[.06,.07,s*.09]),
      description:'Hold the shock assembly from below. Remove the outer mount nuts. Leave the middle piston-rod locknut in place while the assembly is in the car.',
      tools:topTools,manual:main},
    ...(!e30?[{action:'Remove the lower strut mounting bolt',focus:[c.arm,c.damper,...lower],access:lower,
      move:move(lower,[0,.018,s*.14]),
      description:'Keep the arm and complete strut supported. Withdraw the lower bolt and washer, then free the lower eye from the arm.',
      tools:lowerTools,manual:main} satisfies AssemblyStep]:[]),
    {action:e30?'Take out the rear shock':'Lower the complete rear strut',focus:[c.damper,c.mount,...springs],frame:[c.damper,...springs],
      move:move(pack,onStand),
      description:'Guide the assembly down out of the tower. Keep it upright on the bench. Remove the old upper mounting gasket and inspect the tower for cracks or corrosion.',
      tools:'Padded support or bench stand, inspection light',manual:main},
    ...(!e30?[{action:'Compress the spring before loosening the center nut',focus:[c.spring,c.mount],frame:[c.spring,c.mount],
      scaleY:[[c.spring,.77]],
      description:'Engage a rated compressor squarely around the loaded coil. Compress evenly until the spring is free of pressure against the upper seat. Confirm the compressor jaws are secure before touching the center nut.',
      tools:'Rated strut spring compressor with correct coil jaws',manual:bentley.spring} satisfies AssemblyStep]:[]),
    {action:'Remove the piston-rod nut and top mount',focus:[c.mount,'rod-nut','rod-washer',...springs],frame:[c.damper,c.mount],
      move:move([...upper,...(!e30?['upper-pad','spring-cup']:[])],benchTop),
      description:(e30?'Counterhold the shaft and undo the central locknut.':'With the spring load fully contained, counterhold the shaft and remove the nut, washer, upper bearing and spring seat.')+
        ' Lay the stack out in order and keep gripping tools off the polished rod.',
      tools:pistonTools,manual:e30?factoryTorque:bentley.spring},
    {action:e30?'Lift off the sleeve and bump stop':'Lift the spring off the strut',focus:[c.damper,c.boot,'bump-stop',...springs],frame:[c.damper,...springs],
      move:[...move([c.boot,'bump-stop'],[.01,-.028,s*.68]),...move(springs.filter(id=>id!=='upper-pad'&&id!=='spring-cup'),springAside)],
      scaleY:e30?undefined:[[c.spring,1]],
      description:e30?'Slide the sleeve and bump stop off. Check for shaft leaks and replace worn rubber, damaged mounts and shocks as needed.'
        :'Relax the spring compressor evenly while the spring is safely contained. Lift off the spring and lower pad, then remove the protective tube and bump stop. Replace damaged or mismatched springs as an axle pair.',
      tools:e30?'Clean bench and inspection light':'Rated spring compressor and inspection light',manual:e30?main:bentley.spring},
    {action:'Rebuild the shock on the bench',focus:[c.damper,c.mount,'rod-nut',...springs],frame:[c.damper,c.mount],
      move:move(pack,onStand),scaleY:e30?undefined:[[c.spring,.77]],
      description:e30?'Fit the stop, sleeve, washers and mount in the manual’s order. Counterhold the rod and torque the new center nut to 15 N·m for the original damper. Use the replacement damper maker’s figure when specified.'
        :'Fit the stop and tube. Seat the lower pad and compress the spring for installation. Restore the upper pad, cup, mount and washer, then torque the new piston-rod nut to 25 N·m while counterholding the rod. Leave the compressor engaged until the nut is tight.',
      tools:pistonTools+' and a low-range torque wrench',manual:e30?laterShockTorque:bentley.stack},
    ...(!e30?[{action:'Release the compressor and check both spring ends',focus:[c.spring,c.lowerPad,'upper-pad'],
      scaleY:[[c.spring,1]], description:'Back the compressor off slowly and evenly. Confirm the spring ends register against both seats and the pads lie flat.',
      tools:'Rated spring compressor and inspection light',manual:bentley.stack} satisfies AssemblyStep]:[]),
    {action:'Refit the shock and start the lower bolt',focus:[c.damper,c.mount,...c.topNuts,...lower],frame:[c.damper,c.mount],
      move:move([...pack,...c.topNuts,...lower]),
      description:'Fit a fresh tower gasket. Start the upper mount nuts and torque the new M8 nuts to 22 N·m per the '+
        (e30?'workshop archive. The later TIS M8 row lists 24 N·m for its hardware. ':'Bentley procedure. ')+'Start the lower bolt and washer without applying final torque yet.',
      tools:topTools+' and '+lowerTools,manual:e30?factoryTorque:bentley.strut},
    finishWheel(c),
    {action:'Torque the lower bolt at loaded ride height',focus:[c.damper,c.arm,...lower],frame:[c.arm,...lower],
      move:move(towerTrim),
      description:(e30?e30Lower:'With the car at Bentley’s normal loaded position, tighten the lower strut bolt to 127 N·m. '+loadedE34+' Restore the seat and tower trim afterward.'),
      tools:lowerTools+' with the car safely supported at the specified ride height',manual:e30?factoryTorque:bentley.ride},
  ];
  return {
    ...basics(series,c,e30?'e30-rear-shock-absorbers':'330-job-rear-spring-and-shock-assembly',e30?['e30-rear-axle-layout']:[]),
    id:e30?`e30-${side}-rear-shock`:`e34-${side}-rear-strut`,
    title:e30?'Rear shocks and upper mounts':'Rear springs and shocks',
    parts:[c.arm,c.damper,c.mount,c.hub,...springs],steps,
    catalogParts:[c.damper,c.mount,...springs,c.boot,'bump-stop'],
    manuals:e30?[main,scan('16','BMW factory page · Rear shock'),factoryTorque,laterShockTorque]:[main,bentley.spring,bentley.stack,bentley.ride],
    before:e30?'1991 325i Coupe with separate springs and conventional rear shocks. The factory archive and later TIS give different lower-bolt values. Identify the installed hardware before choosing a row.'
      :'1995 525i Sedan with conventional rear struts. BMW self-levelling (LAD) cars require the hydraulic procedure. Replace worn springs and dampers in axle pairs.',
    supplies:e30?['Upper mount 33 52 1 128 819 and gasket 33 52 6 772 864.','New self-locking mount nuts and shaft locknut for the installed shock.']
      :['Guide support 33 52 1 132 270 and gasket 33 52 1 129 567.','New tower locknuts, piston-rod nut and spring pads if worn. Match the spring part and paint code.'],
    completed:'Check both sides for correct seating and normal ride height. Check for noise and loose trim on a short drive.',
  };
}

function e30SpringClearance(s: number): {access: AssemblyStep[]; restore: AssemblyStep} {
  const exhaust=['e30assembly:underbody:exhaust-pipes'];
  const rearMount=['e30rear:rear-mount-bolt','e30rear:rear-mount-nut'];
  const rearDrive=[
    'e30assembly:rear-final-drive:case','e30assembly:rear-final-drive:rear-cover','e30assembly:rear-final-drive:ring-gear',
    'e30assembly:rear-final-drive:pinion','e30rear:cover-mount','e30shaft:differential-flange',
    'e30rear:left-output','e30rear:right-output','e30rear:sender','e30rear:sender-plug','e30rear:fill-plug','e30rear:drain-plug',
  ];
  return {access:[
    {action:'Support the exhaust and clear the rear mount',focus:exhaust,access:exhaust,
      move:move(exhaust,[0,-.10,-s*.16]),
      description:'Let the exhaust cool. Support it, release the hangers or opened connection as required by BMW 33-17, and suspend it clear of the rear final drive mount.',
      tools:'Padded exhaust support, hanger pliers and 13 mm socket for original M8 clamp hardware',manual:bmw.exhaust},
    {action:'Support the final drive and release its rear mount',focus:rearMount,frame:rearDrive,access:rearMount,
      move:[...move(rearMount,[0,.03,.11]),...move(rearDrive,[0,-.021,0])],
      description:'Secure the final drive on a transmission jack. Remove the rear through-bolt and lower the rear of the housing only enough to gain clearance. Leave the upper carrier bolts installed.',
      tools:'Transmission jack and strap, 19 mm socket and 19 mm counterhold wrench',manual:bmw.spring},
  ],restore:
    {action:'Secure the final drive and refit the exhaust',focus:[...rearMount,...exhaust],frame:rearDrive,
      move:move([...rearDrive,...rearMount,...exhaust]),
      description:'Refit the rear final drive through-bolt with a new self-locking nut and torque it to 77 N·m. Restore the exhaust hangers and check clearance to the axle and body.',
      tools:'19 mm socket and counterhold wrench, torque wrench and exhaust support',manual:mountTorque}
  };
}

function springService(side: Side): AssemblyProcedure {
  const c=corner('e30',side);
  const s=c.sign, lower=['lower-bolt','lower-washer'];
  const clearance = e30SpringClearance(s);
  const armPack=[c.arm,c.hub,c.rotor,c.shield,...c.calipers,c.axle,'abs','brake-union',c.lowerPad,c.spring];
  const pads=[c.lowerPad,'upper-pad'];
  const pivot=(degrees:number,parts=armPack):AssemblyStep['pivot']=>({between:['inner-bolt','outer-bolt'],degrees:degrees*s,parts});
  const looseSpring:Vec=[-.10,-.14,s*.31];
  const steps: AssemblyStep[]=[
    support(c,bmw.spring),takeWheel(c),
    ...clearance.access,
    {action:'Disconnect this side of the anti-roll bar',focus:[c.link,'link-bolt'],access:['link-bolt'],
      move:move(['link-bolt'],[.04,-.055,s*.09]),
      description:'Undo the lower link bolt so the trailing arm can droop without twisting the bar. Support the arm before releasing anything else.',
      tools:'13 mm socket and 13 mm wrench for the original M8 fastener',manual:barTorque},
    {action:'Release the lower shock bolt and lower the arm',focus:[c.arm,c.damper,c.spring,...lower],frame:[c.arm,c.spring],access:lower,
      move:move(lower,[.02,.01,s*.12]),pivot:pivot(30),
      description:'Remove the lower shock bolt with the arm supported. Lower the jack slowly until the spring is loose enough to lift out. Watch the brake hose and CV joints throughout. If the spring remains loaded, stop and use a suitable compressor.',
      tools:'19 mm socket, adjustable support jack and a rated compressor if needed',manual:bmw.spring},
    {action:'Lift out the spring and both rubber pads',focus:[c.spring,...pads],frame:[c.spring,...pads],access:[c.spring],
      pivot:pivot(0,[c.spring,c.lowerPad]),move:[...move([c.spring],looseSpring),...move(pads,[.07,-.09,s*.38])],
      description:'Lift out the unloaded spring and note the rubber pad thickness, paint codes and clocking. Clean both perches. Replace cracked pads and match both new rear springs to the BMW spring table for the car’s equipment.',
      tools:'Inspection light and a caliper for pad thickness',manual:bmw.spring},
    {action:'Seat the spring and pads',focus:[c.spring,...pads,'body-perch'],frame:[c.spring,...pads],
      move:move([c.spring,...pads]),pivot:pivot(30,[c.spring,c.lowerPad]),
      description:'Set the upper and lower pads against their seats. Index the spring ends against the molded stops. Bring the spring up under control as you raise the arm.',
      tools:'Support jack and inspection light',manual:bmw.spring},
    {action:'Raise the arm and start the lower shock and link bolts',focus:[c.arm,c.spring,c.damper,...lower],
      pivot:pivot(0),move:move([...lower,'link-bolt']),
      description:'Raise the arm until the shock eye and anti-roll bar link line up. Start both bolts and leave them ready for final tightening at ride height.',
      tools:'19 mm lower shock socket and 13 mm socket and wrench for the link',manual:bmw.spring},
    clearance.restore,
    finishWheel(c),
    {action:'Torque the shock and anti-roll bar link at ride height',focus:[c.arm,c.damper,'link-bolt'],
      description:e30Lower+' Tighten the original M8 anti-roll bar link fastener to 22 N·m at normal loaded position.',
      tools:'19 mm and 13 mm six-point sockets and torque wrench',manual:barTorque},
  ];
  return {...basics('e30',c,'e30-rear-coil-springs',['e30-rear-axle-layout']),id:`e30-${side}-rear-spring`,
    title:'Rear coil springs',parts:[c.arm,c.spring,c.damper,...pads,'body-perch'],catalogParts:[c.spring,...pads],
    before:'1991 325i Coupe with a separate barrel spring and conventional shock. Keep the arm supported as you release the shock.',
    supplies:['Matched pair of rear springs from the BMW spring table and pads in the correct thickness.','New self-locking rear differential mount and stabilizer link nuts as applicable.'],
    steps,manuals:[bmw.spring,bmw.layout,scan('17','BMW factory page · Rear barrel spring'),factoryTorque,laterShockTorque,barTorque,mountTorque],
    completed:'Both spring ends should sit against their pad stops. Check ride height, brake hose slack and exhaust clearance before road testing.',
  };
}

function armService(series: Series, side: Side): AssemblyProcedure {
  const c=corner(series,side);
  const e30=c.e30,s=c.sign;
  const m=e30?bmw.arm:bentley.arm,bush=e30?bmw.bush:bentley.bush;
  const arms=[c.arm,c.hub,c.shield,...c.pivots,...(e30?[c.axle,'brake-union']:[])];
  const pivots=[...c.throughBolts,...c.lockNuts];
  const link34=e30?[]:[`e34sys:rear-pitman-link-${side==='left'?'1':'-1'}`];
  const brace=!e30&&side==='right'?['diagonal-brace','brace-bolt']:[];
  const rearHardware=['lower-bolt','lower-washer','link-bolt',...link34,...brace];
  const clearance=e30?e30SpringClearance(s):null;
  const bench:Vec=[-.12,-.21,s*.44];
  const pressAxis= e30 ? [-.258,0,s*.966] : [-.499,.082,s*.862];
  const bushingOut = c.pivots.map((part,index):[string,Vec]=>[
    part,
    bench.map((coordinate,axis)=>coordinate+(index===0?-1:1)*.104*pressAxis[axis]) as Vec,
  ]);
  const brakeClear:Vec=[-.05,.10,s*.19];
  const jointPrefix=series+'rear:'+side+(e30?'-inner':'-outer');
  const cv=[...Array.from({length:6},(_,i)=>jointPrefix+'-bolt-'+(i+1)),...Array.from({length:3},(_,i)=>jointPrefix+'-plate-'+(i+1))];
  const park=side==='right'?(e30?['e30assembly:rear-right:wear-sensor']:['e34brake:rear-right-wear-sensor']):[];
  const workBrakes=[...c.calipers,c.rotor,...park];
  const pivotTools='19 mm six-point socket and 19 mm ring wrench for the original M12 hardware';
  const cvTools=e30?'E12 external Torx socket for the illustrated late CV bolts':'8 mm hex bit for the original socket-head CV bolts';
  const press=e30?'BMW 33 3 050 puller with 33 3 053 collar, thrust disc and tabbed sleeve':'Press with a receiver cup and driver sized for the 44 mm outer shell';
  const brakeManual=e30?bmw.brakes:bentley.brakes;
  const springParts=e30?[c.spring,c.lowerPad,'upper-pad']:[];
  const armDrop=[...arms,c.spring,c.lowerPad];
  const armPivot=(degrees: number,parts=armDrop): AssemblyStep['pivot']=>
    ({between:['inner-bolt','outer-bolt'],degrees:degrees*s,parts});
  const strutPivot=(degrees: number): AssemblyStep['pivot']=>
    ({between:[c.mount,c.topStuds[0]],degrees:degrees*s,parts:[c.damper,c.spring,c.lowerPad,'upper-pad','spring-cup',c.boot,'bump-stop']});

  const steps: AssemblyStep[]=[
    support(c,m),takeWheel(c),
    {action:e30?'Separate the inner CV joint':'Separate the outer CV joint',
      focus:[c.axle,c.hub,...cv],frame:[c.axle,c.hub],access:cv,move:[...move(cv,[.07,-.065,s*.10]),...(!e30?move([c.axle],[0,-.025,-s*.045]):[])],
      description:(e30?'Undo all six inner CV screws. Keep the splined stub and axle in the wheel hub if the arm is coming out complete. Support the disconnected inboard end.':
        'Undo the six bolts at the wheel-side CV joint and retain the reinforcement plates. Suspend the halfshaft with the boots relaxed.'),
      tools:cvTools+', extension and padded axle support',manual:e30?bmw.output:bentley.output},
    {action:'Disconnect the brake pipe and wheel wiring',focus:['brake-union','abs',...park],frame:[c.hub,'brake-union'],
      access:['brake-union','abs'],move:move(['brake-union','abs',...park],[.08,.10,-s*.14]),
      description:'Disconnect the brake line at the arm union, cap the openings and catch fluid with a brake-only syringe and pan. Remove the ABS sensor and free its lead.'+
        (side==='right'?' Disconnect the right-side brake pad wear lead.':''),
      tools:'11 mm line wrench, counterhold wrench for the hose flats, 5 mm hex bit for the original M6 sensor screw, caps and drain pan',
      manual:m},
    {action:'Clear the rear brakes and parking-brake cable',focus:[...workBrakes,c.hub],frame:[c.rotor,c.hub],access:workBrakes,
      move:move(workBrakes,brakeClear),
      description:'Release the parking brake and slacken its cable. Unbolt the caliper and carrier, lift the rotor off and unhook the cable from the expander. Free the cable from the arm and protect the brake components. If the rotor binds, back off the shoe adjuster.',
      tools:(e30?'17 mm':'16 mm')+' caliper carrier socket, 5 mm hex bit for the rotor screw, and a slotted adjuster tool',manual:brakeManual},
    ...(clearance?.access ?? []),
    {action:e30?'Disconnect the link and lower the arm':'Release the stabilizer link and lower strut bolt',
      focus:[c.arm,c.damper,...rearHardware,...springParts],frame:[c.arm,c.damper],
      move:[...move(rearHardware.filter(part=>!brace.includes(part)),[.06,-.05,s*.13]),...move(brace,[.10,-.032,.16])],
      pivot:e30?armPivot(30):strutPivot(7),access:rearHardware,
      description:e30?'With the arm and halfshaft supported, release the anti-roll link and lower shock bolt. Lower the arm under control until the spring is loose.'
        :'Release the stabilizer link and connecting link at the arm. Support the arm and withdraw the lower strut bolt. Move the lower eye clear while the intact strut stays attached at the top.'+
          (side==='right'?' If the diagonal support is fitted, remove its bolt at the connecting link and swing it clear as in Bentley Fig. 16.':''),
      tools:e30?'19 mm shock bolt socket, 13 mm link socket and wrench, arm jack and a suitable spring compressor if needed'
        :'22 mm socket for the M14 hardware, 13 mm socket and wrench for the M8 stabilizer link, and a support jack',manual:m},
    ...(e30?[{action:'Lift out the unloaded spring and pads',focus:springParts,access:[c.spring],
      pivot:armPivot(0,[c.spring,c.lowerPad]),move:move(springParts,[-.04,-.11,s*.32]),
      description:'Lift the loose spring and both pads clear. Note their seating and paint marks before moving the arm.',
      tools:'Inspection light and a suitable spring compressor if required',manual:bmw.spring} satisfies AssemblyStep]:[]),
    {action:'Remove the two pivot bolts and lower the arm',focus:[c.arm,...c.pivots,...pivots],frame:[c.arm,...pivots],access:pivots,
      move:[...move(pivots,[.04,-.06,s*.14]),...move(arms,bench),...(!e30?move(['brake-union'],brakeClear):[])],
      pivot:e30?armPivot(0):undefined,
      description:'Support the arm’s weight. Remove both self-locking nuts and through-bolts, then lower the arm clear of the carrier. If extraction is blocked, follow the manual’s carrier access steps. Inspect the arm eyes and confirm the bearing and brake shield can be transferred or replaced as required.',
      tools:pivotTools+', a support jack, and a drift where required',manual:m},
    {action:'Press both bushings out',focus:[c.arm,...c.pivots],frame:[c.arm,...c.pivots],
      move:bushingOut,
      description:'Mark both installed depths and directions. Support each arm eye close to the bore. Drive the bush squarely into the receiver cup, then clean and inspect the eye.',
      tools:press,manual:bush},
    {action:'Press the new bushings in from the correct sides',focus:[c.arm,...c.pivots],frame:[c.arm,...c.pivots],move:move(c.pivots,bench),
      description:(e30?'Use the assembly lubricant specified by BMW 33-8. Pull the 30 mm concentric bushes in squarely with the collar end of each facing out.':
        'Press the 44 mm concentric bushes in so the longer end of each inner sleeve faces the center of the car.')+
        ' Check that each shoulder seats at the recorded depth. Use the alignment procedure if eccentric bushes were fitted.',
      tools:press+' and a depth gauge or caliper',manual:bush},
    {action:'Raise the arm and start the inner pivot bolt first',focus:[c.carrier,c.arm,...pivots],frame:[c.arm,...pivots],
      move:move([...arms,...pivots]),
      description:'Guide the arm back into the carrier with the inner bolt first. Start both new locknuts loosely. Keep the bushings free to settle before final torque at normal loaded ride height.',
      tools:pivotTools+' and a support jack',manual:m},
    {action:'Refit the strut or spring and reconnect the links',focus:[c.arm,c.damper,...rearHardware,...springParts],
      move:move([c.damper,...rearHardware,...springParts]),pivot:e30?undefined:strutPivot(0),
      description:e30?'Fit the spring and rubber pads against both seat stops, then raise the arm to refit the shock and link. Set the lower shock bolt and the 22 N·m M8 link torque at normal loaded height using the shock and spring procedures.'
        :'Seat the lower strut eye, stabilize the arm and reconnect both links. Where fitted, torque the right diagonal support to the subframe to 110 N·m per Bentley. Leave the 127 N·m lower strut and connecting-link fasteners for final tightening in their loaded position.',
      tools:e30?'19 mm and 13 mm sockets and torque wrench':'22 mm and 13 mm sockets and torque wrench',manual:e30?bmw.spring:bentley.bush},
    ...(clearance?[clearance.restore]:[]),
    {action:'Reconnect the axle, brake line and sensors',focus:[c.axle,c.hub,...cv,'brake-union','abs'],
      move:move([c.axle,...cv,'brake-union','abs',...park]),
      description:'Reconnect the CV joint at its clean pilot and refit the reinforcement plates in their original positions. '+cvSpec+
        ' Counterhold the hose and tighten the original M10 × 1 brake-line coupling to 19 N·m per BMW 34 32. Seat the ABS sensor and route the leads clear of the axle.',
      tools:cvTools+', 11 mm line wrench, sensor bit and torque wrench',manual:axleTorque},
    {action:'Refit and adjust the rear brakes',focus:[...workBrakes,c.hub],move:move(workBrakes),
      description:'Hook up the parking-brake cable. Refit the rotor, carrier and caliper per Group 34. Torque the original rear carrier bolts to 67 N·m and adjust the parking brake. Fill with specified brake fluid, bleed the complete system and check for leaks. Use the applicable ABS or ASC+T bleed procedure.',
      tools:(e30?'17 mm':'16 mm')+' carrier socket, 5 mm hex rotor bit and an approved brake bleeder',manual:e30?bmw.brakes:bentley.bleed},
    finishWheel(c),
    {action:'Set ride height and torque the trailing arm pivots',focus:[c.arm,...c.pivots,...pivots],frame:[c.arm,...pivots],
      description:armTorque+' '+(e30?e30Lower+' Torque the original M8 anti-roll link to 22 N·m.'
        :'Torque the lower strut and connecting link to 127 N·m in the loaded position. '+loadedE34),
      tools:pivotTools+', '+(e30?'19 mm and 13 mm sockets':'22 mm socket')+', and torque wrenches covering all specified values',
      manual:e30?pivotTorque:bentley.bush},
  ];
  return {...basics(series,c,e30?'e30-rear-trailing-arm':'330-job-rear-trailing-arm',e30?['e30-rear-axle-layout']:[]),
    id:`${series}-${side}-rear-arm`,title:'Rear trailing arms and bushings',
    parts:[c.arm,c.hub,c.carrier,...c.pivots,'inner-bracket','outer-bracket'],
    steps,catalogParts:[c.arm,...c.pivots,...pivots],
    before:(e30?'1991 325i Coupe with standard 30 mm trailing arm bushings.':'1995 525i Sedan with standard 44 mm trailing arm bushings and conventional rear struts.')+
      ' Opening the brake line makes a complete brake bleed part of this job.',
    supplies:[e30?'Standard bushing set 33 32 9 061 945.':'Standard bushing set 33 32 9 061 946.',
      'New M12 × 1.5 pivot locknuts, applicable CV screws and brake fluid. Check the pivot bolt grade and any offset bushings before ordering.'],
    manuals:e30?[m,bush,scan('07','BMW factory page · Trailing arm'),scan('08','BMW factory page · Bushing press'),pivotTorque,bmw.brakes,factoryTorque,axleTorque,brakeUnionTorque,mountTorque]
      :[m,bush,bentley.ride,bentley.bleed,pivotTorque,axleTorque,brakeUnionTorque],
    completed:'Confirm a firm pedal and no leaks before moving the car. Check parking brake operation and have the rear alignment measured after the bushes settle.',
  };
}

export const rearSuspensionServices = {
  'e30-left-rear-spring':springService('left'),
  'e30-right-rear-spring':springService('right'),
  'e30-left-rear-shock':shockService('e30','left'),
  'e30-right-rear-shock':shockService('e30','right'),
  'e30-left-rear-arm':armService('e30','left'),
  'e30-right-rear-arm':armService('e30','right'),
  'e34-left-rear-strut':shockService('e34','left'),
  'e34-right-rear-strut':shockService('e34','right'),
  'e34-left-rear-arm':armService('e34','left'),
  'e34-right-rear-arm':armService('e34','right'),
} satisfies Record<RearSuspensionServiceId, AssemblyProcedure>;
