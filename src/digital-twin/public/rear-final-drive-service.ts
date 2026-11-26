import type { AssemblyProcedure, AssemblyStep, ManualLink } from './assembly-service';
import type { Vec } from './model';
import { e30Handbook } from '../../series/e30-manual';

type Series = 'e30' | 'e34';
type Side = 'left' | 'right';
const sides = ['left', 'right'] as const;
const installed: Vec = [0, 0, 0];
const move = (parts: string[], offset: Vec = installed): [string, Vec][] => parts.map(part => [part, offset]);
const numbered = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => prefix + (index + 1));
const direction = (side: Side) => side === 'left' ? -1 : 1;
export function axleSwing(series: Series, side: Side, degrees: number): Vec {
  const angle = degrees * Math.PI / 180;
  const span = series === 'e30' ? .5084 : .5224;
  const height = series === 'e30' ? .010 : .00125;
  return [
    0,
    span * Math.sin(angle) + height * (Math.cos(angle) - 1),
    direction(side) * (height * Math.sin(angle) + span * (1 - Math.cos(angle))),
  ];
}

export const cvHardware = (side: Side, end: 'inner' | 'outer') => [
  ...numbered(side + '-' + end + '-bolt-', 6),
  ...numbered(side + '-' + end + '-plate-', 3),
];
const BMW33 = 'https://workshop-manuals.com/bmw/3_series_e30/320i_m20_conver/4_tightening_torques/33__rear_axle/';
const axleTorque: ManualLink = { title: 'BMW 33 21 1AZ · CV fastener torque by bolt type', href: BMW33 + '21__output_shafts/1_azd__output_shaft/' };
const carrierTorque: ManualLink = { title: 'BMW 33 17 1AZ · Final drive to carrier', href: BMW33 + '17__final_drive_mounting/1_azd__final_drive_unit_mountings/' };
const rubberMountTorque: ManualLink = { title: 'BMW 33 17 3AZ–4AZ · Final drive rubber mounts', href: carrierTorque.href + 'page_1064/' };
const rearPropTorque: ManualLink = {
  title: 'BMW 26 11 4AZ · Propshaft rear flange',
  href: 'https://www.e34chassis.com/wp-content/uploads/2023/08/bmw_torq.pdf#page=123',
};
const collarTorque: ManualLink = { title: 'BMW 33 21 2AZ · E30 wheel-side collar nut',
  href: 'https://sdfbbedf4bd486017.jimcontent.com/download/version/1557524722/module/7487515011/name/Anzugsdrehmomente%20BMW.pdf' };
const fillTorque: ManualLink = {
  title: 'BMW · Differential oil level and plug seals',
  href: 'https://5series.net/forums/attachments/diy-do-yourself-14/how-change-transmisson-fluid-52611/mst_topping_up_oil_level_in_rear_differential-47170d1206757864',
};
const e30FinalScan: ManualLink = { title: 'BMW factory page · Rear final drive', href: 'https://e30mpower.com/33%20-%20Rear%20Axle/33-01.jpg' };
const e30ShaftScan: ManualLink = { title: 'BMW factory page · Rear output shaft', href: 'https://e30mpower.com/33%20-%20Rear%20Axle/33-04.jpg' };
const e30Wheel: ManualLink = { title: 'BMW 325i handbook · Wheel installation', href: e30Handbook + '#page=59' };

const models = {
  e30: {
    id: 'e30-325i-coupe-manual',
    caption: '1991 325i Coupe, rear-wheel drive, Type 188 final drive, ABS and the four-nut rear propshaft flange.',
    carrier: 'e30assembly:rear-axle:rear-subframe',
    case: 'e30assembly:rear-final-drive:case',
    cover: 'e30assembly:rear-final-drive:rear-cover',
    gears: ['e30assembly:rear-final-drive:ring-gear', 'e30assembly:rear-final-drive:pinion'],
    propshaft: 'e30assembly:propeller:rear-section',
    input: 'e30shaft:differential-flange',
    axle: (side: Side) => 'e30assembly:rear-' + side + ':halfshaft',
    hub: (side: Side) => 'e30assembly:rear-' + side + ':hub',
    wheel: (side: Side) => 'e30assembly:rear-' + side + ':wheel',
    final: { title: 'BMW 33-1 · Rear final drive removal and installation', href: '/e30/manual/33?pdf=621' },
    shaft: { title: 'BMW 33-4 · Rear output shaft, tools and lockplate', href: '/e30/manual/33?pdf=625' },
    inspection: { title: 'BMW 33-5 · CV joint and boots', href: '/e30/manual/33?pdf=626' },
    oil: { title: 'BMW 33-1 · Gear oil and replacement-unit break-in', href: '/e30/manual/33?pdf=621' },
    cvTool: 'E12 external Torx socket and extension for the illustrated BMW 33 21 1 227 279 bolts',
    cvSpec: 'For new plain black M10 × 50 class 10.9 E12 bolts, BMW 33 21 1AZ (12/2007) specifies 60 N·m. Match other bolt finishes and under-head serrations to their own row.',
    replacementBolts: '33 21 1 227 279 M10 × 50 CV bolts for the illustrated late shaft.',
  },
  e34: {
    id: 'e34-525i-sedan-automatic',
    caption: '1995 525i Sedan, rear-wheel drive, automatic and the six-nut rear propshaft CV flange.',
    carrier: 'e34sys:rear-subframe',
    case: 'e34sys:differential-case',
    cover: 'cover',
    gears: ['ring-gear', 'pinion'],
    propshaft: 'e34shaft:rear-section',
    input: 'e34sys:differential-input-flange',
    axle: (side: Side) => side === 'left' ? 'e34sys:halfshaft-1' : 'e34sys:halfshaft--1',
    hub: (side: Side) => side + '-hub-flange',
    wheel: (side: Side) => 'wheel:rear-' + side,
    final: { title: 'Bentley 331-2 · Rear final drive removal and installation', href: '/manual/331?pdf=314' },
    shaft: { title: 'Bentley 330-7 · Rear drive axle removal and installation', href: '/manual/330?pdf=305' },
    inspection: { title: 'Bentley 330-7 to 330-8 · CV joint and boots', href: '/manual/330?pdf=306' },
    oil: { title: 'Bentley 331-4 · Differential oil level and filling', href: '/manual/331?pdf=316' },
    cvTool: '8 mm internal hex socket and extension for the illustrated BMW 07 11 9 919 620 bolts',
    cvSpec: 'For new plain M10 × 50 class 10.9 hex-socket bolts, BMW 33 21 1AZ (12/2007) specifies 60 N·m. Bentley gives different values for its period hardware. Match the bolt head and locking hardware before choosing the specification.',
    replacementBolts: '07 11 9 919 620 M10 × 50 CV bolts for the illustrated hex-socket hardware.',
  },
};

function differentialService(series: Series): AssemblyProcedure {
  const e30 = series === 'e30';
  const car = models[series];
  const propHardware = numbered(series + 'shaft:rear-nut-', e30 ? 4 : 6);
  const stubHardware = e30 ? [] : ['e34shaft:cv-gasket'];
  const prop = [car.propshaft, ...stubHardware];
  const flanges = sides.map(side => side + '-output');
  const shafts = sides.map(car.axle);
  const inner = sides.flatMap(side => cvHardware(side, 'inner'));
  const mounts = e30
    ? ['front-mount-left', 'front-mount-right', 'rear-mount-left', 'rear-mount-right']
    : ['front-mount-bolt'];
  const rearMount = e30 ? ['rear-mount-bolt', 'rear-mount-nut'] : ['rear-mount-bolt-left', 'rear-mount-bolt-right'];
  const plugs = ['fill-plug', 'drain-plug'];
  const unit = [car.case, car.cover, ...car.gears, car.input, ...flanges, 'sender', ...plugs, ...(e30 ? ['cover-mount'] : [])];
  const lowered: Vec = [0, -.19, 0];
  const onJack: Vec = [-.15, -.27, -.24];
  const parked: [string, Vec][] = sides.map(side => [car.axle(side), axleSwing(series, side, 6)]);
  const axleRotation: [string, number][] = sides.map(side => [car.axle(side), 6 * direction(side)]);
  const prep: AssemblyStep = {
    action: 'Support the car and loosen the fill plug', focus: [car.case, ...plugs],
    description: 'Chock the front wheels and support the car level at its approved lift points. Support each shaft independently. Test that the fill plug opens before draining. For a refill or replacement, drain the oil, then fit a new O-ring drain plug and torque it to 60 N·m. For the plug with a separate sealing ring, use a new ring and torque to 65 N·m.',
    tools: 'Lift or rated stands, wheel chocks, 14 mm hex bit for the illustrated plugs, drain pan and fluid pump',
    manual: car.oil,
  };
  const steps: AssemblyStep[] = [
    prep,
    { action: 'Mark and unbolt the driveshaft flange', focus: [car.propshaft, car.input, ...propHardware],
      frame: [car.input, ...propHardware], access: [car.propshaft],
      move: move(propHardware, [.074, -.068, .072]),
      description: 'Match-mark the rear shaft and input flange. Hold the flange while undoing the ' +
        (e30 ? 'four M10 locknuts at the universal joint.' : 'six M8 locknuts at the rear CV joint. Cap the open CV joint to keep grease in and dirt out.'),
      tools: e30 ? 'Paint marker, 17 mm socket and extension, flange counterhold' : 'Paint marker, 13 mm socket and extension, flange counterhold',
      manual: car.final },
    { action: 'Move and support the driveshaft', focus: [car.propshaft, car.input], frame: [car.input, car.case],
      move: move(prop, [.034, -.012, 0]),
      description: 'Move the supported rear end of the driveshaft just far enough to clear the flange pilot. Tie it to a suitable body support. Avoid loading the center bearing or hanging the shaft on its front joint.',
      tools: 'Adjustable shaft support and a securing strap', manual: car.final },
    { action: 'Unbolt both inner CV joints', focus: [...flanges, ...inner], access: shafts, frame: [...shafts, ...flanges],
      move: [...move(cvHardware('left', 'inner'), [.044, -.072, -.068]), ...move(cvHardware('right', 'inner'), [.044, -.072, .068])],
      description: 'Clean the fastener heads so the bit seats fully. Support one halfshaft at a time. Remove the six bolts and retain the reinforcement plates in their original positions. The wheel-side connections stay assembled.',
      tools: car.cvTool + ', plus a strap on each shaft', manual: car.shaft },
    { action: 'Tie the halfshafts clear of the differential', focus: [...shafts, ...flanges], move: parked, rotateX: axleRotation,
      description: 'Ease each inner joint off its pilot and suspend it clear of the final drive. Keep the boots relaxed and the exposed mating faces clean. Support the inner ends until they are bolted back in place.',
      tools: 'Two adjustable straps or padded supports', manual: car.final },
    { action: 'Support the differential and release its carrier bolts', focus: [car.case, car.carrier, ...mounts],
      frame: [car.case, ...mounts], access: mounts,
      move: move(mounts, e30 ? [0, .084, .047] : [.093, -.035, .069]),
      description: e30
        ? 'Secure the final drive to a transmission jack. Loosen the four upper carrier bolts. Remove the rear pair on top, then the front bolts on the left and right.'
        : 'Secure the final drive to a transmission jack and unload the bushings just enough to free the front mounting bolt. Remove the front bolt while the jack carries the weight.',
      tools: 'Transmission jack with retaining strap, 19 mm six-point socket and short 19 mm ring wrench for the original M12 heads',
      manual: car.final },
    { action: 'Unplug the speedometer sender', focus: ['sender-plug', 'sender'], frame: [car.cover, 'sender'],
      move: move(['sender-plug'], [-.038, .071, -.027]), access: ['sender-plug'],
      description: 'Release the connector and free its lead from the final drive clips. Keep the wiring out of the path of the jack.',
      tools: 'Small flat pick for the connector clip', manual: car.final },
    { action: 'Release the rear mount and lower the differential', focus: [car.case, car.cover, ...rearMount], access: rearMount,
      frame: [car.case, car.cover, ...rearMount],
      move: [...move(rearMount, e30 ? [0, -.043, .138] : [-.116, -.05, 0]), ...move(unit, lowered)],
      description: (e30 ? 'Remove the through-bolt and its self-locking nut.' : 'Remove the left and right rear mounting bolts.') +
        ' Check that the propeller shaft, output shafts and wiring are clear. Lower the unit carefully on the jack. Leave the input flange nut in place to preserve pinion bearing preload.',
      tools: e30 ? 'Transmission jack, 19 mm socket and 19 mm counterhold wrench' : 'Transmission jack and 19 mm six-point socket',
      manual: car.final },
    { action: 'Inspect the final drive on the jack', focus: [car.case, car.cover, ...flanges], move: move(unit, onJack),
      description: 'Check the mount rubber, housing, output flange seals and input seal. If fitting another unit, match the ratio and differential type on the identification tag. Compare the input and output interfaces before installation.',
      tools: 'Inspection light and a caliper for flange comparison', manual: car.final },
    { action: 'Raise the differential and start the carrier bolts', focus: [car.case, car.carrier, ...mounts], frame: [car.case, ...mounts],
      move: [...move(unit), ...move(mounts)],
      description: e30
        ? 'Raise the unit squarely to the axle carrier. Start all four upper bolts by hand before fitting the rear through-bolt.'
        : 'Raise the unit to its three mount points. Start the front bolt loosely to locate the housing before installing the two rear bolts.',
      tools: 'Transmission jack and 19 mm socket or short ring wrench', manual: car.final },
    { action: 'Refit and torque the mounts', focus: [car.case, ...mounts, ...rearMount], move: move(rearMount),
      description: (e30 ? 'Fit a new self-locking nut at the rear through-bolt. ' : 'Start both rear bolts by hand. ') +
        'With the final drive seated and unstressed, torque the carrier ' + (e30 ? 'bolts' : 'bolt') +
        ' to 110 N·m and the rubber mount fastener' + (e30 ? '' : 's') + ' to 77 N·m using BMW 33 17. Remove the jack after every mount is secure.',
      tools: '19 mm six-point socket, 19 mm counterhold where required and a torque wrench', manual: carrierTorque },
    { action: 'Seat and torque both inner CV joints', focus: [...flanges, ...shafts, ...inner], frame: [...flanges, ...shafts],
      move: move([...shafts, ...inner]), rotateX: shafts.map(id => [id, 0]),
      description: 'Seat the clean pilots. Refit any reinforcement plates in their original positions. Start all bolts by hand, then tighten the six in a cross pattern on each side. ' + car.cvSpec,
      tools: car.cvTool + ' and a torque wrench', manual: axleTorque },
    { action: 'Reconnect the driveshaft at its balance marks', focus: [car.propshaft, car.input, ...propHardware],
      frame: [car.input, ...propHardware], move: move([...prop, ...propHardware]),
      description: e30
        ? 'Align the marks and seat the flange squarely. Use new M10 ribbed nuts of the specified type and tighten to 80 N·m per BMW 26 11 4AZ. Use the alternate table entry if different hardware is fitted.'
        : 'Clean the flange faces and fit a new CV gasket. Align the marks, seat the extended CV joint evenly with opposing nuts and tighten all six new M8 ribbed nuts to 43 N·m per BMW 26 11 4AZ.',
      tools: (e30 ? '17 mm' : '13 mm') + ' socket and extension, flange counterhold and torque wrench', manual: rearPropTorque },
    { action: 'Reconnect the sender and set the oil level', focus: ['sender', 'sender-plug', ...plugs], frame: [car.cover, 'sender'],
      move: move(['sender-plug']),
      description: 'Seat the connector and return the lead to its clips. With the car level, add BMW-approved gear oil for the fitted differential until it reaches the lower edge of the fill opening. Fit a new O-ring fill plug and torque it to 60 N·m. For the plug with a separate sealing ring, use a new ring and torque to 65 N·m. Wipe the housing clean and check for leaks.',
      tools: '14 mm hex bit, fluid pump and torque wrench', manual: fillTorque },
  ];
  return {
    id: `${series}-rear-differential`, modelId: car.id, minimumRevision:e30?1199:1054,
    topic:e30?'e30-rear-final-drive':'331-job-differential-removal-and-rubber-mounts', scope: 'system:differential', relatedScopes: ['system:rear-suspension'],
    prefix: series + 'rear:', title: 'Rear differential removal & refit', entryView: [-.57, -.82, 1.06], clearanceAxis: 'y',
    parts: [car.case, car.cover, car.carrier, car.input, ...flanges],
    steps, manuals: [car.final, car.shaft, carrierTorque, rubberMountTorque, axleTorque, rearPropTorque, car.oil, fillTorque, ...(e30 ? [e30FinalScan] : [])],
    catalogParts: [car.case, car.cover, ...flanges],
    before: car.caption + ' Read the identification tag and check the hardware before using the torque values. This job removes the assembled final drive. Pinion depth, preload and backlash are separate bench settings.',
    supplies: [
      car.replacementBolts,
      e30 ? 'Four new M10 rear propshaft nuts and one new rear differential mount locknut.'
        : 'Six new M8 rear propshaft nuts and rear CV flange gasket 26 11 1 229 502.',
      'BMW-approved final drive oil for the fitted unit and new O-ring plugs or separate sealing rings for the hardware fitted.',
    ],
    completed: 'Check for leaks, speedometer operation and driveline vibration on a short drive. Follow the manual’s break-in schedule if the differential was replaced or rebuilt.',
  };
}

function halfshaftService(series: Series, side: Side): AssemblyProcedure {
  const e30 = series === 'e30';
  const car = models[series];
  const sign = direction(side);
  const axle = car.axle(side);
  const hub = car.hub(side);
  const wheel = car.wheel(side);
  const flange = side + '-output';
  const inner = cvHardware(side, 'inner');
  const outer = e30 ? [] : cvHardware(side, 'outer');
  const stub = side + '-stub';
  const collar = side + '-collar';
  const lock = side + '-lock';
  const axleParts = e30 ? [axle, stub] : [axle];
  const swingAngle = -21;
  const loweredInnerEnd = axleSwing(series, side, swingAngle);
  const stubOut: Vec = [0, 0, -.105 * sign];
  const shiftedShaft: Vec = [loweredInnerEnd[0], loweredInnerEnd[1], loweredInnerEnd[2] + stubOut[2]];
  const shaftAside: Vec = [.195, -.19, sign * .25];
  const stepAway: Vec = [0, -.012, sign * .21];
  const steps: AssemblyStep[] = [
    { action: 'Support the car and identify the axle hardware', focus: [axle, hub, flange],
      description: 'Chock the front wheels. Raise and support the car at its approved chassis points. Identify the fitted CV screws and check both boots. Support the shaft as soon as either end is free.',
      tools: 'Lift or rated stands, wheel chocks and a padded support', manual: car.shaft },
  ];

  if (e30) steps.push(
    { action: 'Remove the wheel', focus: [wheel, hub], move: move([wheel], stepAway), access: [wheel],
      description: 'Loosen the wheel bolts before raising the car. With the car supported, remove the wheel bolts and wheel to expose the axle nut.',
      tools: '17 mm wheel-bolt socket and breaker bar', manual: e30Wheel },
    { action: 'Lift out the lockplate and remove the collar nut', focus: [lock, collar, hub],
      frame: [lock, collar, hub], access: [lock, collar],
      move: [...move([lock], [.037, .062, sign * .10]), ...move([collar], [-.052, -.032, sign * .13])],
      description: 'Pry out the old lockplate. Have a helper apply the service brake or use a proper hub counterhold, then loosen the M22 × 1.5 collar nut.',
      tools: 'Small flat screwdriver, 30 mm thin-wall deep socket for the illustrated collar nut, breaker bar and hub counterhold',
      manual: car.shaft },
  );

  steps.push(
    { action: 'Disconnect the inner CV joint', focus: [flange, axle, ...inner], frame: [flange, ...inner], access: inner,
      move: move(inner, [.056, -.066, sign * .060]),
      description: 'Support the axle. Clean the screw heads and remove all six screws. Keep the reinforcement plates in order and keep dirt off the mating surfaces.',
      tools: car.cvTool, manual: car.shaft },
    ...(e30 ? [{
      action: 'Lower the supported inner joint', focus: [flange, axle, hub], frame: [flange, axle, hub],
      move: move([axle], loweredInnerEnd), rotateX: [[axle, swingAngle * sign]],
      description: 'Free the inner joint from the differential flange. Lower it onto a padded support just far enough to clear the housing as the outer splines move inward.',
      tools: 'Padded adjustable axle support', manual: car.shaft,
    } satisfies AssemblyStep] : []),
    e30 ? {
      action: 'Press the outer splines out of the hub', focus: [stub, axle, hub], frame: [stub, hub],
      move: [...move([axle], shiftedShaft), ...move([stub], stubOut)],
      description: 'Fix the press tool to the hub with the wheel bolts. Keep the spindle square and press the stub out toward the differential while supporting the inner CV. Withdraw the shaft from below. Protect the axle threads.',
      tools: 'BMW 33 2 110 push/pull set with the 33 2 116 bridge and 33 2 117 adapters, and a padded support',
      manual: car.shaft,
    } : {
      action: 'Disconnect the outer CV joint', focus: [hub, axle, ...outer], frame: [hub, ...outer], access: outer,
      move: move(outer, [.056, -.066, -sign * .061]),
      description: 'Support the shaft and remove the six bolts at the wheel-side CV flange. The wheel hub, its stub axle and its collar nut stay assembled. Ease the pilots free and lower the shaft.',
      tools: car.cvTool + ' and a padded support', manual: car.shaft,
    },
    { action: 'Remove and inspect the halfshaft', focus: axleParts, move: move(axleParts, shaftAside),
      rotateX: e30 ? [[axle, 0]] : undefined,
      description: 'On the bench, inspect each boot and clamp. Rotate and articulate both joints by hand. Check for rough movement, binding, excessive play or grease loss. Compare the replacement shaft, joint and retaining hardware to the removed assembly.',
      tools: 'Padded bench supports, inspection light and caliper', manual: car.inspection },
    e30 ? {
      action: 'Draw the splined stub into the hub', focus: [axle, stub, hub], frame: [stub, hub],
      move: [...move([axle], loweredInnerEnd), ...move([stub])],
      rotateX: [[axle, swingAngle * sign]],
      description: 'Clean the hub bore and axle splines and start them squarely. Thread the pull-in spindle fully onto the axle and draw the stub home with the bridge and nut. Keep the inner joint supported.',
      tools: 'BMW 33 2 110 set with 33 2 114 pull-in spindle, 33 2 116 bridge and 33 2 115 nut',
      manual: car.shaft,
    } : {
      action: 'Seat the axle on both flange pilots', focus: [hub, axle, flange], move: move(axleParts),
      description: 'Clean the mating faces and threaded holes. Set the replacement axle on the two pilots with the boots relaxed. Refit the reinforcement plates and start the new bolts by hand at both ends.',
      tools: 'Padded axle support, lint-free cloth and thread-cleaning brush', manual: car.shaft,
    },
    { action: e30 ? 'Torque the inner joint' : 'Torque both CV joints', focus: [axle, flange, ...inner, ...outer],
      frame: e30 ? [flange, ...inner] : [axle, flange, hub],
      move: move([...axleParts, ...inner, ...outer]), rotateX: e30 ? [[axle, 0]] : undefined,
      description: (e30 ? 'Raise the supported inner joint and seat its pilot. ' : '') +
        'Seat the plates evenly and tighten the bolts in a cross pattern at each serviced flange. ' + car.cvSpec,
      tools: car.cvTool + ' and a torque wrench', manual: axleTorque },
  );

  if (e30) steps.push(
    { action: 'Torque the collar nut', focus: [stub, hub, collar], frame: [stub, hub, collar], move: move([collar]),
      description: 'Lightly oil the collar nut’s bearing face. Hold the hub with the service brake or a hub counterhold and torque the illustrated rear collar nut to 200 N·m per BMW 33 21 2AZ.',
      tools: '30 mm thin-wall deep socket, hub counterhold and torque wrench rated for 200 N·m', manual: collarTorque },
    { action: 'Seat a new lockplate', focus: [stub, collar, lock], move: move([lock]),
      description: 'Drive a new lockplate fully into place over the nut with the factory drift. Check that it is seated all the way around.',
      tools: 'BMW 33 4 050 lockplate driver and 00 5 000 driving handle', manual: car.shaft },
    { action: 'Refit the wheel', focus: [hub, wheel], move: move([wheel]),
      description: 'Clean the wheel and hub mating faces. Start all wheel bolts by hand and torque them in a cross pattern to 110 N·m for the stock 325i wheels.',
      tools: '17 mm wheel-bolt socket and torque wrench', manual: e30Wheel },
  );

  return {
    id: `${series}-${side}-halfshaft`, modelId: car.id, minimumRevision:e30?1199:1054, side,
    topic:e30?'e30-rear-output-shaft':'330-job-drive-axle-cv-joint-and-boot', scope: 'system:differential', relatedScopes: ['system:rear-suspension'],
    prefix: series + 'rear:', title: 'Rear halfshaft service',
    entryView: [-.55, -.68, 1.36 * sign], clearanceAxis: e30 ? 'z' : 'y',
    parts: [axle, flange, hub, ...(e30 ? [stub, wheel] : [])],
    steps, manuals: [car.shaft, car.inspection, axleTorque, ...(e30 ? [collarTorque, e30Wheel, e30ShaftScan] : [])],
    catalogParts: [axle, flange, e30 ? collar : hub],
    before: car.caption + ' Confirm the shaft, CV screws and wheel-side connection before ordering parts.',
    supplies: [
      e30 ? 'ABS output shaft 33 21 1 226 901. Check the build date in the catalog.' : 'Exchange output shaft 33 21 1 226 720 for the illustrated flange.',
      car.replacementBolts,
      ...(e30 ? ['New lockplate 33 41 1 124 945 and a serviceable M22 × 1.5 collar nut 33 41 1 125 664.'] : []),
    ],
    completed: 'Turn the hub by hand before lowering the car. Check the boots and clearances, then listen for clicking or vibration on a short drive.',
  };
}

export const rearFinalDriveServices = {
  'e30-rear-differential': differentialService('e30'),
  'e30-left-halfshaft': halfshaftService('e30', 'left'),
  'e30-right-halfshaft': halfshaftService('e30', 'right'),
  'e34-rear-differential': differentialService('e34'),
  'e34-left-halfshaft': halfshaftService('e34', 'left'),
  'e34-right-halfshaft': halfshaftService('e34', 'right'),
};
