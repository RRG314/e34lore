import type { AssemblyProcedure, ManualLink } from './assembly-service';
import type { Vec } from './model';

const pads: ManualLink = { title: 'Bentley 340-4 · Pads and caliper guides', href: '/manual/340?pdf=320#job-brake-pad-replacement' };
const carrierManual: ManualLink = { title: 'Bentley 340-5 to 340-6 · Caliper and carrier', href: '/manual/340?pdf=321#job-caliper-removal' };
const discs: ManualLink = { title: 'Bentley 340-6 to 340-7 · Disc removal and measurements', href: '/manual/340?pdf=322#job-rotor-removal-and-runout-checks' };

const wheel = 'wheel:front-left';
const hub = 'e34sys:hub-front-1';
const shield = 'e34sys:brake-shield-front-1';
const rotor = 'e34sys:brake-disc-front-1';
const caliper = 'e34sys:brake-caliper-front-1';
const outerPad = 'e34sys:brake-pad-front-1';
const innerPad = 'inner-pad';
const sensor = 'wear-sensor';
const caps = ['cap-upper', 'cap-lower'];
const guides = ['guide-upper', 'guide-lower'];
const bolts = ['carrier-upper', 'carrier-lower'];
const seats: Vec = [0, 0, 0];
const hung: Vec = [-.145, .20, -.07];
const wheelOff: Vec = [.59, -.045, -.17];
const move = (parts: string[], at: Vec): [string, Vec][] => parts.map(part => [part, at]);

export const frontBrakeService: AssemblyProcedure = {
  id: 'e34-front-brakes', modelId: 'e34-525i-sedan-automatic', scope: 'system:front-brakes',
  relatedScopes: ['system:braking', 'system:front-suspension'],
  prefix: 'e34brake:front-left-', title: 'Front brake service', clearanceAxis: 'z', entryView: [-.57, .47, -1.3],
  manuals: [pads, discs],
  parts: [wheel, hub, shield, rotor, caliper, outerPad, innerPad, sensor, ...caps, ...guides, ...bolts,
    'spring-clip', 'carrier', 'disc-screw'],
  completed: 'Left front assembly reinstalled. Service the right side as part of the same axle job. Pump the pedal until firm, confirm the fluid level and check for leaks before moving the car.',
  steps: [
    { action: 'Start front brake service', focus: [wheel],
      description: 'This shows the left front ATE service on the 1995 525i with 302 × 22 mm ventilated discs. Confirm the hardware on your car. Replace pads and discs in axle sets. Work on level ground, chock the rear wheels and support the car at its approved lift points. Keep brake dust out of the air.',
      tools: 'Wheel chocks and a rated lift or floor jack and stands' },
    { action: 'Remove the front wheel', access: [wheel], focus: [wheel], move: move([wheel], wheelOff),
      description: 'Loosen the wheel bolts before lifting, then remove them and lift the wheel off the center pilot.', tools: '17 mm socket for the original road-wheel bolts' },
    { action: 'Remove the guide bolt caps', focus: caps, move: move(caps, [-.24, .13, .09]),
      description: 'Pull both protective caps from the back of the caliper. Check the guide sleeves for tears.' },
    { action: 'Withdraw the guide bolts', focus: guides, move: move(guides, [-.22, .075, .105]),
      description: 'Withdraw the two guide bolts from the inboard side. Keep the brake hose supported.', tools: '7 mm hex bit' },
    { action: 'Unplug the wear sensor', focus: [sensor],
      description: 'Disconnect the left front wear-sensor plug, then free the lead from its holders. Leave the probe in the pad until it is accessible.' },
    { action: 'Unhook the anti-rattle clip', focus: ['spring-clip'], move: move(['spring-clip'], [-.17, -.105, -.11]),
      description: 'Hold the clip as you release its ends. A loaded spring can jump free.', tools: 'Flat-blade screwdriver and eye protection' },
    { action: 'Lift and support the caliper', access: [caliper], focus: [caliper], move: move([caliper, outerPad, innerPad, sensor], hung),
      description: 'Lift the housing with the pads clear of the disc and hang it securely from the chassis. Keep the hose attached without twisting or stretching it. A wear ridge may require slight piston retraction first.',
      tools: 'Caliper hanger and piston press as needed' },
    { action: 'Remove and inspect the pads', focus: [outerPad, innerPad, sensor],
      move: [[sensor, [-.21,.31,-.13]], [innerPad, [-.26,.18,-.17]], [outerPad, [-.09,.25,-.23]]],
      description: 'Release the wear probe from the inner pad. Remove both pads and check whether wear is even. Inspect the boot, hose and piston for damage or leakage. Keep the piston supported while the pads are out.' },
    { action: 'Unbolt the pad carrier', focus: bolts, move: move(bolts, [.075, -.10, .12]),
      description: 'Support the carrier and remove its two bolts from the steering knuckle.', tools: '19 mm six-point socket for the factory carrier bolts', manual: carrierManual },
    { action: 'Lift off the pad carrier', access: ['carrier'], focus: ['carrier'], move: move(['carrier'], [-.30, -.04, -.045]),
      description: 'Clear the carrier from the disc and clean the pad contact lands. Check for corrosion or damage.', manual: carrierManual },
    { action: 'Remove the disc screw', focus: ['disc-screw'], move: move(['disc-screw'], [.08,.10,-.20]),
      description: 'Remove the single M8 × 14 retaining screw from the disc hat.', tools: '6 mm hex bit for the cataloged screw', manual: discs },
    { action: 'Pull the disc off the hub', focus: [rotor, hub], move: move([rotor], [.12,.13,-.27]),
      description: 'Draw the disc straight off the center pilot. Check for cracks, scoring and uneven wear. Bentley lists 20.4 mm minimum for this original ventilated disc. Check the marking on the disc fitted to your car.',
      tools: 'Disc micrometer and dial indicator for inspection', manual: discs },
    { action: 'Seat the replacement disc', focus: [rotor, hub], move: move([rotor], seats),
      description: 'Clean both mating faces and remove residue from the new disc. Align the screw hole and check that the disc sits flat on the hub.', manual: discs },
    { action: 'Tighten the disc screw', focus: ['disc-screw'], move: move(['disc-screw'], seats),
      description: 'Tighten the factory retaining screw to 16 N·m.', tools: '6 mm hex bit and a low-range torque wrench', manual: discs },
    { action: 'Refit the carrier and bolts', focus: ['carrier', ...bolts], move: move(['carrier', ...bolts], seats),
      description: 'Seat the carrier against the knuckle and start both bolts by hand. Tighten to 110 N·m for this carrier.', tools: '19 mm socket and torque wrench', manual: carrierManual },
    { action: 'Seat the pads and wear sensor', focus: [innerPad, outerPad, sensor], move: move([innerPad, outerPad, sensor], hung),
      description: 'Retract the piston slowly and monitor the reservoir. Stop if the piston binds or leaks. Keep friction faces clean. Seat the inner pad spring in the piston and fit the outer pad. Replace a triggered or damaged sensor.',
      tools: 'Piston press and approved brake pad paste at specified contact points' },
    { action: 'Lower the caliper into place', focus: [caliper, innerPad, outerPad], move: move([caliper, innerPad, outerPad, sensor], seats),
      description: 'Seat the housing over the installed disc. Route the sensor lead through the original holders and leave enough slack for steering. Check that the hose is untwisted.' },
    { action: 'Install the guide bolts', focus: guides, move: move(guides, seats),
      description: 'Start both clean, dry guide bolts by hand. Bentley gives 35 N·m for the shown guide bolts. Confirm the applicable specification if the caliper or hardware has changed.',
      tools: '7 mm hex bit and torque wrench' },
    { action: 'Refit the caps and spring clip', focus: [...caps, 'spring-clip', sensor],
      move: move([...caps, 'spring-clip'], seats),
      description: 'Seat both protective caps, hook the clip into both recesses and reconnect the wear sensor.' },
    { action: 'Reinstall the wheel', focus: [wheel], move: move([wheel], seats),
      description: 'Seat the wheel, start the bolts by hand and tighten in a star pattern. Bentley lists 100 ± 10 N·m for the stock road wheels. Check pedal pressure while stationary before any low-speed check.',
      tools: '17 mm socket and torque wrench' },
  ],
};
