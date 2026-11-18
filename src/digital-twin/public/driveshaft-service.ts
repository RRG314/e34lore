import type { AssemblyProcedure, AssemblyStep, ManualLink } from './assembly-service';
import type { Vec } from './model';

const torqueTable = 'https://www.e34chassis.com/wp-content/uploads/2023/08/bmw_torq.pdf';
const tis = 'https://adkusters.dsmynas.com/Website%20mynas/TIS%20documents%20PDF/';
export const e34DriveshaftPreload = {
  title: 'BMW 26-4 · E34 M50 driveshaft settings',
  href: 'https://www.shiftbmw.com/wp-content/uploads/2017/07/Technical-Data-4.pdf#page=376',
};
const frontTorque: ManualLink = { title: 'BMW 26 11 1AZ · Flex disc torque', href: torqueTable + '#page=122' };
const rearTorque: ManualLink = { title: 'BMW 26 11 4AZ–6AZ · Rear flange and support torque', href: torqueTable + '#page=123' };
const exhaustTorque: ManualLink = { title: 'BMW 18 00 · Exhaust torque', href: torqueTable + '#page=90' };
const e30Manual = (pdf: number, title: string): ManualLink => ({ title, href: '/e30/manual/26?pdf=' + pdf });
const manuals = {
  e30: {
    exhaust: { title: 'BMW 18 00 020 · Exhaust removal and refit', href: '/e30/manual/18?pdf=340' },
    access: e30Manual(454, 'BMW 26 11 000 · Driveshaft removal'),
    refit: e30Manual(455, 'BMW 26-4 · Rear flange and support preload'),
    support: e30Manual(466, 'BMW 26 12 001 · Bearing, dust shields and circlip'),
    disc: e30Manual(459, 'BMW 26 11 051 · Flex disc replacement'),
    arrows: e30Manual(460, 'BMW 26-7 · Flex disc arrows and support preload'),
    preload: e30Manual(455, 'BMW 26-4 · E30 support preload'),
  },
  e34: {
    exhaust: { title: 'Bentley 180-3 · Exhaust removal and refit', href: '/manual/180?pdf=219' },
    access: { title: 'Bentley 260-4 · Driveshaft access', href: '/manual/260?pdf=264' },
    refit: { title: 'BMW 26 11 000 · Driveshaft with rear CV joint', href: tis + '26/11/RA_26_11_000_Removing_and_installing_propeller_shaft-version_with_rear_constant-velocity_joint.pdf' },
    support: { title: 'BMW 26 12 001 · Center mount, bolted shaft', href: tis + '26/12/RA_26_12_001_Replacing_complete_propeller_shaft_centre_mount-version_without_slide.pdf' },
    disc: { title: 'Bentley 260-7 · Flex disc orientation', href: '/manual/260?pdf=267' },
    arrows: { title: 'BMW 26 11 051 · Flex disc replacement', href: tis + '26/11/RA_26_11_051_Replacing_flexible_disk_for_propeller_shaft.pdf' },
    preload: e34DriveshaftPreload,
  },
};

const shaftIds = {
  e30: {
    exhaust: ['e30assembly:underbody:exhaust-pipes'],
    front: 'e30assembly:propeller:front-section',
    rear: 'e30assembly:propeller:rear-section',
    disc: 'e30assembly:propeller:flex-disc',
    mount: 'e30assembly:propeller:center-mount',
    bearing: 'bearing',
    output: 'e30assembly:gearbox:output-flange',
    differential: 'differential-flange',
  },
  e34: {
    exhaust: ['e34sys:exhaust-downpipes', 'e34sys:catalyst-center-resonator', 'e34sys:rear-exhaust-pipes', 'e34sys:rear-muffler'],
    front: 'e34sys:propeller-shaft',
    rear: 'rear-section',
    disc: 'e34sys:flexible-drive-coupling',
    mount: 'e34sys:center-bearing',
    bearing: 'e34sys:center-bearing-insert',
    output: 'e34auto:output-flange',
    differential: 'e34sys:differential-input-flange',
  },
};

const zero: Vec = [0, 0, 0];
const exhaustOff: Vec = [0, -.20, .66];
const shieldOff: Vec = [0, -.17, -.43];
const onBench: Vec = [.055, -.26, .30];
const splitFront: Vec = [.24, -.26, .30];
const splitRear: Vec = [-.15, -.26, .30];
const positions = (parts: string[], at: Vec = zero): [string, Vec][] => parts.map(part => [part, at]);
const numbered = (name: string, count: number) => Array.from({ length: count }, (_, i) => name + (i + 1));

function driveshaftService(series: 'e30' | 'e34', centerBearing: boolean): AssemblyProcedure {
  const e30 = series === 'e30';
  const fullRemoval = centerBearing || !e30;
  const m = manuals[series];
  const { exhaust, front, rear, disc, mount, bearing, output, differential } = shaftIds[series];
  const shield = 'tunnel-shield';
  const fastenerSets = ['gearbox', 'shaft'].map(side => [
    ...numbered(side + '-bolt-', 3),
    ...numbered(side + '-nut-', 3),
  ]);
  const [toGearbox, toShaft] = fastenerSets;
  const bodyBolts = numbered('support-bolt-', 2);
  const rearNuts = numbered('rear-nut-', e30 ? 4 : 6);
  const frontHardware = [...toShaft, disc];
  const retainer = e30 ? 'sleeve' : 'pivot-bolt';
  const dustShields = e30 ? ['front-dust-shield', 'rear-dust-shield'] : ['rear-dust-shield'];
  const jointParts = e30 ? ['spline-washer', 'spline-seal'] : ['pivot-washer'];
  const mountParts = [mount, bearing, ...dustShields, ...(e30 ? ['circlip'] : [])];
  const frontParts = [front, ...frontHardware, retainer, ...jointParts];
  const rearParts = [rear, ...mountParts, ...(!e30 ? ['cv-gasket'] : [])];
  const shaftParts = [...frontParts, ...rearParts];
  const loweredFront: Vec = [-.040, -.078, 0];
  const loweredMount: Vec = [-.003, -.074, 0];
  const frontAway = fullRemoval ? onBench : loweredFront;
  const boltsForDisc = e30
    ? 'BMW 1AZ lists 60 N·m for M10 class 10.9 and 48 N·m for M10 class 8.8. Confirm the class stamped on the bolt.'
    : 'BMW 1AZ lists 100 N·m for M12 class 10.9 and 81 N·m for M12 class 8.8. Confirm the class stamped on the bolt.';
  const frontTools = e30 ? '17 mm six-point socket and 17 mm counterhold wrench' : '18 or 19 mm six-point socket and matching counterhold wrench, according to the fitted M12 hardware';
  const rearTools = e30 ? '17 mm socket, extension and torque wrench' : '13 mm socket for the M8 nuts, extension and torque wrench';
  const mountTools = '13 mm socket for the M8 mount hardware';
  const mainManual = centerBearing ? m.access : m.disc;
  const steps: AssemblyStep[] = [
    { action: 'Support the car and mark the driveline', focus: [front, rear, disc],
      description: 'Let the exhaust cool. Use a lift or rated stands on solid, level ground and secure the wheels. Once the driveshaft is off, the transmission cannot hold the car. Mark the shaft and flanges before loosening them. Support the exhaust and shaft separately.',
      tools: 'Lift or rated stands, wheel chocks, paint marker, and a transmission jack or padded supports', manual: mainManual },
    { action: 'Lower the exhaust', focus: exhaust, access: exhaust, frame: [front, rear, ...exhaust],
      move: positions(exhaust, exhaustOff),
      description: e30
        ? 'Support the front and rear silencer assembly. Disconnect the joints and rubber hangers as shown in Group 18. Free the oxygen sensor connector from its holder where it crosses the shield.'
        : 'Support the exhaust at several points. Unplug the oxygen sensor connector before lowering the front pipes. Release the transmission support and hangers in the exhaust procedure, then lower the assembly together.',
      tools: 'Exhaust support jack, 13 mm socket for M8 hex hardware, extension, hanger pliers and penetrating oil', manual: m.exhaust },
    { action: 'Remove the tunnel heat shield', focus: [shield], access: [shield], frame: [shield, front, rear],
      move: positions([shield], shieldOff),
      description: 'Remove the shield fasteners and lower the shield to expose the center support. Release the oxygen sensor lead or bracket if it crosses the shield. Keep the shield clear of the fuel tank connection.',
      tools: '10 mm socket for M6 shield nuts and a trim tool for push-on retainers where fitted', manual: mainManual },
    ...(e30 ? [{ action: 'Loosen the sliding sleeve', focus: [retainer], access: [retainer],
      move: positions([retainer], [.024, 0, 0]),
      description: 'Back the sleeve off several turns so the shaft can shorten. Keep the two sections engaged until the shaft is on the bench.',
      tools: 'BMW 26 1 040 clamping sleeve wrench', manual: mainManual } satisfies AssemblyStep] : []),
    { action: 'Unbolt the flex disc from the gearbox', focus: [disc, output, ...toGearbox], access: [disc, toGearbox[0]],
      move: [...positions(toGearbox.slice(0, 3), [-.080, -.075, -.10]), ...positions(toGearbox.slice(3), [.075, -.08, -.10])],
      description: 'Remove the three fasteners at the gearbox flange. Leave the disc attached to the driveshaft for now. Counterhold the bolt heads and save their orientation for refitting.' +
        (e30 ? ' If a bolted vibration damper is fitted, turn it clear as shown in BMW 26-4 and keep it with the shaft.' : ''),
      tools: frontTools, manual: mainManual },
    ...(fullRemoval ? [{ action: e30 ? 'Unbolt the rear universal-joint flange' : 'Unbolt the rear CV flange', focus: [rear, differential, ...rearNuts],
      access: [rear, rearNuts[0]], move: positions(rearNuts, [-.075, -.12, -.09]),
      description: e30
        ? 'Mark the orientation at the differential. Support the rear shaft, then remove the four M10 nuts at its universal-joint flange.'
        : 'Mark the rear CV joint against its flange. Support the rear shaft, remove the six nuts and free the CV from the drive flange. Keep the joint supported and cap its exposed face to keep dirt out.',
      tools: rearTools, manual: m.refit } satisfies AssemblyStep] : []),
    { action: 'Unbolt the center support', focus: [mount, ...bodyBolts], access: bodyBolts,
      move: positions(bodyBolts, [0, -.13, -.15]),
      description: 'Hold both shaft sections on padded supports as you undo the two mount fasteners. Keep the shaft clear of the fuel tank connection and avoid hanging its weight from either joint.',
      tools: mountTools + ', with a padded support or adjustable jack', manual: fullRemoval ? m.refit : m.arrows },
    { action: fullRemoval ? 'Lower the complete driveshaft' : 'Lower the front of the driveshaft',
      focus: [front, rear, disc, mount], frame: [front, rear, output], access: [front, mount],
      move: fullRemoval ? positions(shaftParts, onBench) : [
        ...positions(frontParts, loweredFront), ...positions(mountParts, loweredMount),
        ...positions([retainer], [-.020, -.070, 0]),
      ],
      rotateZ: fullRemoval ? undefined : [rear, ...mountParts].map(id => [id, -7]),
      description: fullRemoval
        ? 'Lower the supported shaft at the center until the front clears the gearbox pilot. Withdraw the complete assembly and set it on padded bench supports. Keep the halves indexed.'
        : 'Shorten the shaft at its sliding joint as needed, then lower it just enough to clear the gearbox pilot. The rear flange stays bolted. Keep both halves engaged and supported so the rear joint cannot overextend.',
      tools: 'Adjustable shaft supports and a helper for the complete assembly', manual: fullRemoval ? m.refit : m.arrows },
  ];

  if (centerBearing) {
    const bearingOff: Vec = [-.06, -.29, .51];
    const shieldOffFront: Vec = [.30, -.21, .39];
    steps.push(
      { action: 'Mark both shaft halves at the joint', focus: [front, rear, retainer], frame: [mount, retainer],
        description: 'Add a paint mark across the joint before separating it. These marks preserve the assembly’s original balance. If factory punch marks are present, record their original relationship too.',
        tools: 'Paint marker', manual: m.support },
      { action: e30 ? 'Unscrew the sleeve and split the shaft' : 'Remove the pivot bolt and split the shaft',
        focus: [retainer, ...jointParts, front, rear], frame: [mount, retainer, ...jointParts],
        move: [
          ...positions(frontParts, splitFront), ...positions(rearParts, splitRear),
          ...positions([retainer, ...jointParts], [.02, -.31, .48]),
        ],
        description: e30
          ? 'Unscrew the sleeve completely. Pull the sections apart and set out the sleeve, washer and rubber ring in order. Inspect the seal and splines.'
          : 'Counterhold the shaft on padded supports. Undo the M12 center pivot bolt and retain the washer in its original orientation. Withdraw the front shaft section from the indexed joint.',
        tools: e30 ? 'BMW 26 1 040 clamping sleeve wrench' : '19 mm socket for the M12 center pivot hex bolt and a padded shaft holder',
        manual: m.support },
      ...(e30 ? [{ action: 'Remove the circlip and outer dust shield',
        focus: ['circlip', 'front-dust-shield'], move: positions(['circlip', 'front-dust-shield'], shieldOffFront),
        description: 'Expand and lift off the external circlip. Withdraw the outer dust shield, then note which way the inner shield faces.',
        tools: 'External circlip pliers and a pick', manual: m.support } satisfies AssemblyStep] : []),
      { action: 'Pull the support and bearing off the shaft', focus: [mount, bearing], frame: [mount, bearing, 'rear-dust-shield'],
        move: positions([mount, bearing], bearingOff),
        description: 'Set the puller behind the bearing’s inner hub and withdraw the support along the shaft. Inspect the journal and dust cover. If a U-joint has play, binds or feels notched, follow BMW’s shaft replacement policy.',
        tools: 'Bearing separator and puller with jaws that reach behind the inner race', manual: m.support },
      { action: 'Press the bearing out of the bracket', focus: [mount, bearing],
        move: positions([bearing], [-.07, -.29, .65]),
        description: 'When reusing a sound rubber mount, support its housing and press the outer race out squarely. A complete new support already contains the bearing. Check the stamped size and compare the replacement before fitting.',
        tools: 'Bench press and a driver that contacts the 55 mm outer race', manual: m.support },
      { action: 'Seat the new bearing in the support', focus: [mount, bearing], move: positions([bearing], bearingOff),
        description: 'Press the bearing into the supported mount by its outer race. If fitting a complete mount, check that the bearing turns smoothly and the rubber is intact.',
        tools: 'Bench press and outer-race driver', manual: m.support },
      { action: 'Drive the assembled support onto the shaft', focus: [mount, bearing, ...dustShields],
        move: [
          ...positions([mount, bearing, ...dustShields], splitRear),
          ...(e30 ? positions(['circlip'], splitRear) : []),
        ],
        description: 'Fit the inner shield in its original direction. Press the support onto the exposed journal by the inner race alone until it seats.' + (e30 ? ' Refit the outer shield and snap the circlip fully into its groove.' : ' Check the cover clears the support.'),
        tools: e30 ? 'BMW 24 1 050 bearing driver, and external circlip pliers' : 'BMW 24 1 040 bearing driver or equivalent inner-race driver',
        manual: m.support },
      { action: 'Rejoin the shaft on its balance marks', focus: [front, rear, retainer, ...jointParts],
        frame: [mount, retainer, ...jointParts], move: positions(shaftParts, onBench),
        description: e30
          ? 'Grease the sliding splines lightly with Molykote Longterm 2. Refit the washer, rubber ring and sleeve and align the marks made during removal. Leave the sleeve loose until the shaft is in the car.'
          : 'Match the marks made during removal and restore the washer and pivot bolt. Apply BMW-specified threadlocker to the pivot screw and tighten it to 97 N·m. Check that the support rotates freely and the shields clear it.',
        tools: e30 ? 'BMW 26 1 040 sleeve wrench' : '19 mm socket and torque wrench', manual: e30 ? m.support : rearTorque },
    );
  } else {
    const discOff: Vec = [.105, -.17, .27];
    steps.push(
      { action: 'Remove the flex disc from the shaft', focus: [disc, front, ...toShaft], frame: [disc, front],
        move: [
          ...positions([disc], discOff), ...positions(toShaft.slice(0, 3), [.145, -.22, .38]),
          ...positions(toShaft.slice(3), [-.06, -.23, .44]),
        ],
        description: 'Undo the other three fasteners and remove the disc. Check for cracks down to the sleeves, elongated holes and damaged flange faces. Check the centering sleeve for play or binding and renew it if damaged.',
        tools: frontTools, manual: m.arrows },
      { action: 'Fit the new flex disc', focus: [disc, front, ...toShaft],
        frame: [disc, front], move: positions([disc, ...toShaft], frontAway),
        description: 'Match the disc diameter, bolt circle and sleeves to the original. The molded arrows point toward the flange arm each bushing bolts to. Refit the original bolt directions and use new locknuts. Counterhold the bolt heads while tightening the nuts on the flange side. ' + boltsForDisc,
        tools: frontTools + ', plus a torque wrench', manual: frontTorque },
    );
  }

  steps.push(
    { action: 'Seat the shaft on the gearbox pilot', focus: [front, disc, output, rear], frame: [front, rear, output, differential],
      move: [...positions(shaftParts), ...(e30 ? positions([retainer], [.012, 0, 0]) : [])],
      rotateZ: fullRemoval ? undefined : [rear, ...mountParts].map(id => [id, 0]),
      description: 'Lightly lubricate the centering guide with Molykote Longterm 2. ' +
        (fullRemoval ? (e30 ? 'Offer the rear universal-joint flange to the differential at the original marks.' : 'Check the grease fill per BMW 26 11 000. Fit a new gasket on clean rear mating faces, then offer up the rear CV with the joint extended.') : 'Keep the attached rear universal joint supported as you raise the front.') +
        ' Register the front pilot, align the flange marks and start the center support bolts loosely.',
      tools: 'Adjustable shaft supports and a helper', manual: fullRemoval ? m.refit : m.arrows },
    { action: 'Torque the three gearbox-side flex disc fasteners', focus: [disc, ...toGearbox],
      move: positions(toGearbox),
      description: 'Start the original bolt directions with new self-locking nuts. Counterhold the bolts and turn the nuts at the flange to avoid twisting the rubber. ' + boltsForDisc + ' Remove any shipping clamp as directed for the new disc.',
      tools: frontTools + ', plus a torque wrench', manual: frontTorque },
  );

  if (fullRemoval) steps.push(
    { action: e30 ? 'Torque the rear universal-joint flange' : 'Seat and torque the rear CV flange',
      focus: [rear, differential, ...rearNuts], move: positions(rearNuts),
      description: e30
        ? 'Fit new M10 ribbed nuts. BMW’s later 4AZ table gives 80 N·m for the specified ribbed nuts at this universal-joint flange. Verify the nut style and the specification for the installed hardware.'
        : 'Use new M8 ribbed nuts. Draw the CV into the drive flange evenly with two opposing nuts, then torque all six to 43 N·m per BMW 4AZ. Keep the joint extended while starting it so grease does not dislodge the gasket.',
      tools: rearTools, manual: rearTorque },
  );

  steps.push(
    { action: 'Preload and torque the center support', focus: [mount, bearing, ...bodyBolts], frame: [mount, ...bodyBolts],
      move: [...positions([mount], [e30 ? .005 : .003, 0, 0]), ...positions(bodyBolts)],
      description: 'With both shaft ends seated, measure the original relaxed bracket position. Slide the bracket ' +
        (e30 ? '4–6 mm' : '2–4 mm') + ' forward, toward the engine, and hold it there while tightening both M8 fasteners to 21 N·m. Turn the shaft by hand and check that the support and shields clear it.',
      tools: mountTools + ', low-range torque wrench and a millimeter rule or caliper', manual: m.preload },
    ...(e30 ? [{ action: 'Tighten the sliding sleeve', focus: [retainer], move: positions([retainer]),
      description: 'With the shaft located at both ends and the center mount tightened, torque the sliding sleeve to 10 N·m.',
      tools: 'BMW 26 1 040 sleeve wrench and low-range torque wrench. Account for any inline adapter length.', manual: frontTorque } satisfies AssemblyStep] : []),
    { action: 'Refit the tunnel shield', focus: [shield, mount], frame: [shield, front, rear], move: positions([shield]),
      description: 'Refit the shield and its original retainers. Keep it clear of the shaft and the fuel tank. Reattach any sensor lead or connector holder to its original location.',
      tools: '10 mm socket for the M6 nuts', manual: mainManual },
    { action: 'Refit the exhaust and check clearance', focus: exhaust, frame: [front, rear, ...exhaust], move: positions(exhaust),
      description: e30
        ? 'Raise the exhaust with its joints and hangers supported. Fit new seals where opened and align the system. BMW lists 15 N·m for the M8 resonator clamp. For other joints, use the Group 18 procedure and the value for the hardware fitted. Reconnect the oxygen sensor if disconnected.'
        : 'Refit the exhaust with new disturbed gaskets and self-locking nuts. Bentley specifies 35 N·m then 55 N·m at the M50 manifold connections, 24 N·m at the transmission support and 22 N·m for its mounting clamps. Align it and reconnect the oxygen sensor before checking for leaks or vibration.',
      tools: 'Exhaust support jack, sockets for the flange hardware, and torque wrench', manual: m.exhaust },
  );

  return {
    id: `${series}-${centerBearing ? 'center-bearing' : 'flex-disc'}`,
    modelId: e30 ? 'e30-325i-coupe-manual' : 'e34-525i-sedan-automatic',
    scope: 'system:driveshaft', relatedScopes: ['system:exhaust'], prefix: series + 'shaft:',
    title: centerBearing ? 'Driveshaft center support bearing' : 'Driveshaft flex disc',
    topic: e30
      ? centerBearing ? 'e30-driveshaft-center-support' : 'e30-driveshaft-flex-disc'
      : '260-job-flex-disc-and-center-support-bearing',
    entryView: [.27, -.87, 1], clearanceAxis: 'x', parts: [front, rear, output, differential, disc],
    steps,
    before: e30
      ? '1991 325i with Getrag 260, rear-wheel drive and the sliding two-piece shaft. This walkthrough uses the later BMW torque table for the specified service hardware. The period E30 torque archive lists different flex disc and flange values, so match the bolts and replacement nuts to the applicable table.'
      : '1995 525i automatic with the 96 mm front bolt circle, bolted center joint and rear CV flange shown in the BMW catalog. Match the joint and fasteners on your car. The preload and front fastener values follow BMW’s model data and torque tables.',
    supplies: [
      ...(centerBearing ? ['Center mount 26 12 1 226 723, or separate 55 × 30 × 13 mm bearing 26 12 1 225 071 if reusing a sound bracket.'] : [
        e30 ? 'Flex disc 26 11 1 225 624, 78 mm bolt circle and 110 mm outer diameter.'
          : 'Flex disc 26 11 7 511 454 for the illustrated 96 mm bolt circle and M12 hardware.']),
      e30 ? 'New M10 flex disc locknuts and, for shaft removal, new M10 ribbed rear flange nuts.' : 'New M12 flex disc locknuts, M8 ribbed rear CV nuts and a rear CV gasket.',
      'Molykote Longterm 2 grease, or the BMW-specified equivalent, and gaskets for the exhaust joints opened.',
      ...(!e30 && centerBearing ? ['BMW-specified threadlocker for the bolted center joint.'] : []),
    ],
    manuals: [centerBearing ? m.support : m.disc, centerBearing ? m.refit : m.arrows, m.preload, frontTorque, rearTorque, ...(e30 ? [exhaustTorque] : [])],
    catalogParts: centerBearing ? [mount, bearing] : [disc],
    completed: 'Driveshaft, heat shield and exhaust are back in place. Confirm clearances, lower the car, then listen for leaks, rattles or new vibration on a short test drive.',
  };
}

export const driveshaftServices = {
  'e30-center-bearing': driveshaftService('e30', true),
  'e30-flex-disc': driveshaftService('e30', false),
  'e34-center-bearing': driveshaftService('e34', true),
  'e34-flex-disc': driveshaftService('e34', false),
};
