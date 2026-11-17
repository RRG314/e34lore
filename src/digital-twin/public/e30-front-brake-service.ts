import type { AssemblyProcedure, ManualLink } from './assembly-service';
import type { Vec } from './model';
import { e30Handbook } from '../../series/e30-manual';

const pads: ManualLink = { title: 'BMW 34-4 · Girling pads and caliper', href: '/e30/manual/34?pdf=643' };
const discs: ManualLink = { title: 'BMW 34-5 · Front discs and inspection', href: '/e30/manual/34?pdf=644' };
const torque: ManualLink = {
  title: 'BMW 34 11 · Front brake torque table',
  href: 'https://workshop-manuals.com/bmw/3_series_e30/325i_m20_conver/4_tightening_torques/34__brakes/11__front_brakes/1_azd__front_brake/',
};
const wheelManual: ManualLink = { title: 'BMW 325i / 325is handbook · Wheel installation', href: e30Handbook + '#page=59' };

const guideHardware = ['guide-pin-upper', 'guide-pin-lower', 'guide-boot-upper', 'guide-boot-lower'];
const carrierAssembly = ['carrier', 'caliper', 'guide-bolt-upper', ...guideHardware];
const carrierBolts = ['carrier-bolt-upper', 'carrier-bolt-lower'];
const brakePads = ['pad-inner', 'pad-outer'];
const sensor = 'wear-sensor';
const installed: Vec = [0,0,0];
const move = (parts: string[], position: Vec): [string, Vec][] => parts.map(part => [part, position]);
const opened = -107;
const counterhold = '13 mm socket and a thin open-end wrench matched to the guide pin flats';

export const e30FrontBrakeService: AssemblyProcedure = {
  id:'e30-front-brakes', modelId:'e30-325i-coupe-manual', scope:'system:front-brakes',
  relatedScopes:['system:braking', 'system:front-suspension'],
  prefix:'e30assembly:front-left:', title:'Front brake service', clearanceAxis:'z', entryView:[-.72,.59,-1.35],
  parts:['wheel','hub','shield','rotor','disc-screw',...carrierAssembly,...carrierBolts,
    'guide-bolt-lower',...brakePads,sensor],
  manuals:[pads,discs,torque],
  completed:'Left front assembly reinstalled. Repeat the work at the other front wheel. Pump the pedal until firm with the car stationary, then confirm the fluid level and check for leaks before moving.',
  steps:[
    { action:'Prepare for front brake service', focus:['wheel','caliper'],
      description:'This is the rear-wheel-drive 1991 325i with Girling front calipers and 260 × 22 mm ventilated discs. Check for the Girling marking and external hex guide-pin bolts. Replace pads and discs as axle sets. Support the car securely and avoid raising brake dust.',
      tools:'Wheel chocks and a rated lift or floor jack and stands' },
    { action:'Remove the front wheel', access:['wheel'], focus:['wheel'], move:move(['wheel'],[.56,-.052,-.22]),
      description:'Remove the cross-spoke center cover with its adapter, if fitted. Loosen the four stock wheel bolts with the car on the ground, then remove them once the car is supported.',
      tools:'17 mm socket for the stock bolts and the cross-spoke cover adapter', manual:wheelManual },
    { action:'Unplug the pad wear sensor', focus:[sensor],
      description:'Unplug the left front connector and free its wire from the holder. Leave the probe in the pad until the caliper is open.' },
    { action:'Remove the lower guide bolt', focus:['guide-bolt-lower','guide-pin-lower'],
      move:move(['guide-bolt-lower'],[-.087,-.057,.113]),
      description:'Hold the lower guide pin at its flats and undo the M8 self-locking bolt. Keep the upper guide bolt in place as the hinge. Use a new lower bolt during reassembly.',
      tools:counterhold },
    { action:'Swing the caliper up', access:['caliper'], focus:['caliper','guide-pin-upper'], rotateZ:[['caliper',opened]],
      description:'Pivot the housing on the upper guide pin and secure it with the hose relaxed. The pads stay in the carrier.' },
    { action:'Lift out the pads and sensor', focus:[...brakePads,sensor],
      move:[[sensor,[-.065,.26,-.085]],['pad-inner',[-.136,.145,-.114]],['pad-outer',[-.060,.153,-.161]]],
      description:'Release the wear probe and inspect its retaining clip. Replace a worn or damaged sensor. Lift both pads out, check wear and spring position, and inspect the piston dust boot and guides.' },
    { action:'Lower the empty housing', focus:['caliper'], rotateZ:[['caliper',0]],
      description:'Bring the empty housing down for disc removal. Support the loose lower end while handling the assembly.' },
    { action:'Remove the two carrier bolts', focus:carrierBolts,
      move:move(carrierBolts,[.073,-.071,.112]),
      description:'Support the carrier and housing while withdrawing the two M12 × 1.5 × 32 mounting bolts from the knuckle.',
      tools:'19 mm six-point socket', manual:discs },
    { action:'Hang the carrier and caliper together', access:['carrier','caliper'], focus:['carrier','caliper'],
      move:move(carrierAssembly,[-.235,.095,0]),
      description:'Pull the carrier and caliper rearward off the disc together. Hang them from the chassis with the hydraulic hose connected and unstressed.',
      tools:'Caliper hook', manual:discs },
    { action:'Remove the disc retaining screw', focus:['disc-screw'], move:move(['disc-screw'],[.04,.102,-.18]),
      description:'Seat the bit fully in the original M8 × 12 screw and remove it while supporting the disc.',
      tools:'5 mm hex bit for BMW 34 11 1 123 072', manual:discs },
    { action:'Pull the disc off the hub', focus:['rotor','hub'], move:move(['rotor'],[.104,.125,-.23]),
      description:'Draw the disc off the center pilot. If checking it for reuse, measure at about eight points with a disc micrometer. Check the minimum marked on the fitted disc. The reference 260 × 22 mm disc has a 20.4 mm minimum.',
      tools:'Disc micrometer and dial indicator for inspection', manual:discs },
    { action:'Seat the replacement disc', focus:['rotor','hub'], move:move(['rotor'],installed),
      description:'Clean the hub and disc mating faces and remove residue from the new braking surfaces. Align the screw hole and ensure the disc sits flat on the pilot.', manual:discs },
    { action:'Tighten the disc screw', focus:['disc-screw'], move:move(['disc-screw'],installed),
      description:'Tighten the original-style M8 × 12 disc screw to 16 N·m. The BMW E30 torque book lists this under 34-1, 1AZ.',
      tools:'5 mm hex bit and a low-range torque wrench', manual:discs },
    { action:'Seat the carrier and caliper', focus:['carrier','caliper'], move:move(carrierAssembly,installed),
      description:'Return the carrier to the knuckle with its mating faces clean and grease-free. Keep the brake hose clear.' },
    { action:'Tighten the carrier bolts', focus:carrierBolts, move:move(carrierBolts,installed),
      description:'Start both carrier bolts by hand. Lightly oil the bolt threads as specified by BMW and tighten to 123 N·m for this rear-wheel-drive E30.',
      tools:'19 mm socket and torque wrench', manual:torque },
    { action:'Swing the caliper up for the pads', focus:['caliper','guide-pin-upper'], rotateZ:[['caliper',opened]],
      description:'Raise the housing and press the piston back slowly while monitoring the reservoir. Inspect the boot, and stop if the piston binds or leaks.',
      tools:'Piston press' },
    { action:'Seat the pads and wear sensor', focus:[...brakePads,sensor], move:move([...brakePads,sensor],installed),
      description:'Seat the pads and their springs in the carrier. Clip the sensor into the inner pad and route the lead through the original holder with clearance from the wheel. Keep paste off the disc and linings.' },
    { action:'Swing the caliper down', focus:['caliper'], rotateZ:[['caliper',0]],
      description:'Lower the housing over the pads. Align the lower ear with its guide pin and check the boot and sensor lead are clear.' },
    { action:'Install the new lower guide bolt', focus:['guide-bolt-lower','guide-pin-lower',sensor],
      move:move(['guide-bolt-lower'],installed),
      description:'Counterhold the pin and tighten the new self-locking bolt to 35 N·m. Reconnect the wear-sensor plug and check the guides move freely.',
      tools:counterhold+' plus a torque wrench', manual:torque },
    { action:'Reinstall the front wheel', focus:['wheel'], move:move(['wheel'],installed),
      description:'Start the four bolts by hand and tighten them crosswise. BMW’s 325i / 325is handbook gives 110 N·m for the stock wheel and bolts. Fit the cover and check pedal pressure before driving.',
      tools:'17 mm socket and torque wrench', manual:wheelManual },
  ],
};
