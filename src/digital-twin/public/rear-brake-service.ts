import type { AssemblyProcedure, ManualLink } from './assembly-service';
import type { Vec } from './model';
import { e30FactoryManualArchive, e30Handbook } from '../../series/e30-manual';

const rearBrakeScope = 'system:rear-brakes';
const relatedScopes = ['system:braking', 'system:rear-suspension', 'system:parking-brakes',
    'system:parking-brake-left', 'system:parking-brake-right'];

const e30Manual = {
  pads: { title:'BMW 34-8 · Rear pads and caliper',href:'/e30/manual/34?pdf=647' },
  discs: { title:'BMW 34-9 · Rear disc and runout',href:'/e30/manual/34?pdf=649' },
  shoes: { title:'BMW 34-17 · Shoes and expander',href:'/e30/manual/34?pdf=660' },
  adjust: { title:'BMW 34-3 · Parking brake adjustment',href:'/e30/manual/34?pdf=642' },
  torque: { title:'BMW torque manual · 34-2, PDF page 137',href:e30FactoryManualArchive.download },
  wheel: { title:'BMW 325i / 325is handbook · Wheel installation',href:e30Handbook+'#page=59' },
};
const e34Manual = {
  pads: { title:'Bentley 340-4 to 340-5 · Pads and guide bolts',href:'/manual/340?pdf=320#job-brake-pad-replacement' },
  discs: { title:'Bentley 340-6 to 340-7 · Rear rotor and torques',href:'/manual/340?pdf=323#job-rotor-removal-and-runout-checks' },
  shoes: { title:'Bentley 340-11 · Parking brake shoes',href:'/manual/340?pdf=327#job-parking-brake-shoes' },
  adjust: { title:'Bentley 340-10 to 340-11 · Parking brake adjustment',href:'/manual/340?pdf=326#job-brake-pedal-and-parking-brake-adjustment' },
};

const keys = ['wheel','hub','shield','rotor','disc-screw','carrier','caliper','cap-upper','cap-lower','guide-upper','guide-lower',
  'carrier-bolt-upper','carrier-bolt-lower','pad-inner','pad-outer','pad-spring','wear-sensor','shoe-forward','shoe-rearward',
  'hold-forward','hold-rearward','return-upper','return-lower','expander','adjuster'] as const;
type Part = typeof keys[number];
type RearSetup = {
  id:'e30-rear-brakes'|'e34-rear-brakes';
  modelId:string;
  reference:string;
  parts:(part:Part)=>string;
  manual:{pads:ManualLink;discs:ManualLink;shoes:ManualLink;adjust:ManualLink;torque?:ManualLink;wheel?:ManualLink};
  firstSpring:'return-upper'|'return-lower';
  carrierSocket:string;
  guideTorque:string;
  wheelTorque:string;
  starAdjustment:string;
  cableAdjustment:string;
};

const e34Ids:Partial<Record<Part,string>> = {
  wheel:'wheel:rear-right', hub:'e34sys:hub-rear--1', shield:'e34sys:brake-shield-rear--1',
  rotor:'e34sys:brake-disc-rear--1', caliper:'e34sys:brake-caliper-rear--1', 'pad-outer':'e34sys:brake-pad-rear--1',
  'shoe-forward':'e34sys:parking-brake-shoes--1',
  'hold-forward':'e34brake:parking-right-hold-downs','return-upper':'e34brake:parking-right-return-springs',
  adjuster:'e34brake:parking-right-adjuster',expander:'e34brake:parking-right-expanding-lock',
};

const installed:Vec=[0,0,0];
const wheelOff:Vec=[-.56,-.046,.17];
const caliperOff:Vec=[-.19,.20,.07];
const frontShoeOff:Vec=[.14,.12,.23];
const rearShoeOff:Vec=[-.15,.16,.18];
const carrierOff:Vec=[.26,-.07,.10];

function makeService(setup:RearSetup):AssemblyProcedure {
  const { parts:part,manual,firstSpring }=setup;
  const upper=firstSpring==='return-upper';
  const remaining=upper?'return-lower':'return-upper';
  const firstName=upper?'upper':'lower';
  const remainingName=upper?'lower':'upper';
  const shoeSet:Part[]=['shoe-forward','shoe-rearward'];
  const holds:Part[]=['hold-forward','hold-rearward'];
  const guides:Part[]=['guide-upper','guide-lower'];
  const caps:Part[]=['cap-upper','cap-lower'];
  const bolts:Part[]=['carrier-bolt-upper','carrier-bolt-lower'];
  const pads:Part[]=['pad-inner','pad-outer','wear-sensor'];
  const hardware:Part[]=[...shoeSet,remaining,'adjuster'];
  const wornShoePack:Vec=[.12,upper?-.17:.20,.176];
  const firstSpringOff:Vec=[-.15,upper?.11:-.13,.11];
  const remainingSpringOff:Vec=[.18,upper?-.15:.25,.154];
  const move=(ids:Part[],at:Vec):[string,Vec][]=>ids.map(key=>[part(key),at]);
  const procedure: (Omit<AssemblyProcedure['steps'][number],'focus'|'access'> & {focus:Part[];access?:Part[]})[] = [
    {action:'Prepare for rear brake service',focus:['wheel','caliper'],
      description:setup.reference+' Chock the front wheels and securely support the rear. Release the parking brake and slacken both cables at the lever. Replace worn pads, discs, or shoes in axle sets. Use wet cleaning and keep brake dust out of the air.',
      tools:'Wheel chocks and rated lift or jack and stands',manual:manual.adjust},
    {action:'Remove the rear wheel',access:['wheel'],focus:['wheel'],move:move(['wheel'],wheelOff),
      description:'Loosen the bolts with the wheel on the ground. Once the car is securely supported, remove the bolts and lift the wheel off the pilot.',
      tools:'17 mm socket for the stock wheel bolts',manual:manual.wheel},
    {action:'Unplug the right rear wear sensor',focus:['wear-sensor'],
      description:'Unplug the rear pad wear sensor at the right wheel and free the lead from its clips. Leave the probe in the pad for now.',manual:manual.pads},
    {action:'Pull off the guide bolt caps',focus:caps,move:move(caps,[.11,.105,-.086]),
      description:'Remove both plastic covers from the inboard caliper guides. Inspect covers and sleeves.',manual:manual.pads},
    {action:'Withdraw both guide bolts',focus:guides,move:move(guides,[.16,.025,-.135]),
      description:'Withdraw the two capped guides from the inboard side. Inspect the guides for corrosion or damaged threads.',tools:'7 mm hex bit',manual:manual.pads},
    {action:'Unhook the caliper spring',focus:['pad-spring'],move:move(['pad-spring'],[-.17,-.10,.10]),
      description:'Hold the anti-rattle clip while easing its ends out of the caliper. The spring is loaded.',
      tools:'Flat screwdriver and eye protection',manual:manual.pads},
    {action:'Lift and support the caliper',access:['caliper'],focus:['caliper','pad-inner'],
      move:move(['caliper',...pads],caliperOff),
      description:'Lift the caliper away. Hang it securely from the chassis with the brake hose attached and unstressed. Keep the brake pedal untouched while the caliper is off.',
      tools:'Caliper hanger',manual:manual.pads},
    {action:'Remove and inspect the pads',focus:pads,
      move:[...move(['pad-inner'],[-.29,.14,.135]),...move(['pad-outer'],[-.23,.07,.22]),...move(['wear-sensor'],[-.20,.28,.13])],
      description:'Release the sensor from the inner pad. Pull the inner pad’s spring out of the piston and remove the outer pad. Check both pads, the piston boot, and the hose. Replace a triggered or damaged sensor.',manual:manual.pads},
    {action:'Remove the carrier bolts',focus:bolts,move:move(bolts,[.22,-.15,-.10]),
      description:'Support the carrier and withdraw the two mounting bolts from the trailing arm.',
      tools:setup.carrierSocket,manual:manual.discs},
    {action:'Lift off the carrier',access:['carrier'],focus:['carrier'],move:move(['carrier'],carrierOff),
      description:'Clear the rotor lip and inspect the carrier and its pad contact surfaces.',manual:manual.discs},
    {action:'Remove the disc retaining screw',focus:['disc-screw'],move:move(['disc-screw'],[.10,.12,.19]),
      description:'Seat the bit fully in the original M8 × 12 disc screw. If the rotor catches on the shoes, back off the star-wheel adjuster through a wheel bolt hole.',
      tools:'5 mm hex bit for BMW 34 11 1 123 072 and a flat screwdriver',manual:manual.discs},
    {action:'Pull the rotor off the hub',access:['rotor'],focus:['rotor','hub'],move:move(['rotor'],[.13,.12,.30]),
      description:'Draw the disc straight off the pilot to expose the parking brake. Inspect the inner drum for scoring, cracks, or a ridge. The reference disc has an 8.4 mm minimum thickness. Check the marking on the disc fitted to your car.',
      tools:'Brake-disc micrometer and dial indicator for inspection',manual:manual.discs},
    {action:'Unhook the '+firstName+' return spring',focus:[firstSpring],move:move([firstSpring],firstSpringOff),
      description:'Unhook the '+firstName+' spring first and control the hook as it releases.',
      tools:'Brake spring pliers and eye protection',manual:manual.shoes},
    {action:'Unlock both shoe retainers',focus:holds,move:move(holds,[0,0,-.003]),
      rotateZ:holds.map(key=>[part(key),90]),
      description:'Press each retainer inward and turn it 90° to disengage the bayonet end.',
      tools:upper?'Parking brake shoe retainer tool':'BMW 34 4 000 or equivalent shoe retainer tool',manual:manual.shoes},
    {action:'Remove the pins and hold-down springs',focus:holds,move:move(holds,[.18,.045,.13]),
      description:'Release the spring pressure gradually and lift both pins and their springs out of the shoes.',manual:manual.shoes},
    {action:'Lift out the connected shoes',focus:shoeSet,move:move(hardware,wornShoePack),
      description:upper?'Spread the shoes apart at the top and lift them out from below. Keep the lower spring and adjuster with the shoe set. Catch the expander pivot pin if it comes loose.'
        :'Spread the shoes apart at the bottom and lift them out from above with the upper spring and adjuster. Keep track of the orientation of the adjuster and spring.',manual:manual.shoes},
    {action:'Separate the '+remainingName+' spring and adjuster',focus:[...shoeSet,remaining,'adjuster'],
      move:[...move(['shoe-forward'],frontShoeOff),...move(['shoe-rearward'],rearShoeOff),
        ...move([remaining],remainingSpringOff),...move(['adjuster'],[.25,.21,.20])],
      description:'Unload the remaining spring at the bench. Remove the adjuster and check that it turns freely. Inspect the expander and cable at the backing plate, and confirm the expander’s pin is seated.',
      tools:'Brake spring pliers and eye protection',manual:manual.shoes},
    {action:'Assemble the shoes, spring and adjuster',focus:[...shoeSet,remaining,'adjuster'],
      move:move(hardware,wornShoePack),
      description:'Fit the '+remainingName+' spring and adjuster to the new shoes in their original orientation. Retract the adjuster enough for the rotor to fit. Keep approved lubricant on the specified contact points and off the lining and drum.',
      tools:'Brake spring pliers',manual:manual.shoes},
    {action:'Seat the shoe set on the backing plate',focus:[...shoeSet,'expander'],
      move:move(hardware,installed),
      description:upper?'Place the connected lower ends from below, then seat the upper ends against the expander. Ensure both shoe webs rest on their contact pads.'
        :'Set the connected upper ends in place from above, then put the lower ends against the expander. Ensure both shoe webs rest on their contact pads.',manual:manual.shoes},
    {action:'Insert the shoe retainers',focus:holds,move:move(holds,[0,0,-.003]),
      description:'Start each pin through its spring, the shoe web and the backing plate. Hold the spring compressed.',manual:manual.shoes},
    {action:'Lock both shoe retainers',focus:holds,move:move(holds,installed),rotateZ:holds.map(key=>[part(key),0]),
      description:'Turn the pins 90° into their locked positions. Release spring pressure and tug lightly at each shoe to check that both retainers are caught.',
      tools:upper?'Parking brake shoe retainer tool':'BMW 34 4 000 or equivalent shoe retainer tool',manual:manual.shoes},
    {action:'Refit the '+firstName+' return spring',focus:[firstSpring],move:move([firstSpring],installed),
      description:'Seat both hooks. Confirm that the shoes stay on their pads and return freely after the expander is operated.',
      tools:'Brake spring pliers',manual:manual.shoes},
    {action:'Seat the rear rotor',focus:['rotor','hub'],move:move(['rotor'],installed),
      description:'Clean the hub and rotor mating faces, then slide the rotor on squarely. Align the screw hole.',manual:manual.discs},
    {action:'Tighten the rotor screw',focus:['disc-screw'],move:move(['disc-screw'],installed),
      description:'Tighten the original retaining screw to 16 N·m.',
      tools:'5 mm hex bit and low-range torque wrench',manual:manual.discs},
    {action:'Seat the carrier',focus:['carrier'],move:move(['carrier'],installed),
      description:'Seat the carrier on the clean trailing-arm mount.',manual:manual.discs},
    {action:'Tighten the carrier bolts',focus:bolts,move:move(bolts,installed),
      description:'Start both bolts by hand and tighten to 67 N·m for this reference.',
      tools:setup.carrierSocket+' and torque wrench',manual:manual.torque??manual.discs},
    {action:'Fit the pads and wear sensor',focus:pads,move:move(pads,caliperOff),
      description:'Press the piston back slowly while monitoring reservoir level. Clip the inner pad into the piston and seat the outer pad. Fit the right rear probe to the pad.',
      tools:'Piston press',manual:manual.pads},
    {action:'Seat the caliper on the carrier',focus:['caliper',...pads],move:move(['caliper',...pads],installed),
      description:'Guide the housing over the pads. Make sure the hose is untwisted and the wear-sensor wire will clear the wheel.',manual:manual.pads},
    {action:'Tighten the guide bolts',focus:guides,move:move(guides,installed),
      description:setup.guideTorque,tools:'7 mm hex bit and torque wrench',manual:manual.torque??manual.pads},
    {action:'Refit the guide bolt caps',focus:caps,move:move(caps,installed),
      description:'Press both dust caps fully into place.',manual:manual.pads},
    {action:'Refit the caliper spring and connect the sensor',focus:['pad-spring','wear-sensor'],
      move:move(['pad-spring'],installed),
      description:'Lock both ends of the anti-rattle spring into the housing. Route the lead through the original holders and reconnect it.',
      tools:'Flat screwdriver and eye protection',manual:manual.pads},
    {action:'Set both star-wheel adjusters',focus:['adjuster','rotor'],
      description:setup.starAdjustment,tools:'Flat screwdriver',manual:manual.adjust},
    {action:'Balance the cables and refit the wheel',focus:['wheel'],move:move(['wheel'],installed),
      description:setup.cableAdjustment+' Refit all wheel bolts and torque them in a cross pattern to '+setup.wheelTorque+'.',
      tools:'Wrenches for the cable nuts, 17 mm socket and torque wrench',manual:manual.adjust},
  ];
  return {
    id:setup.id,modelId:setup.modelId,scope:rearBrakeScope,relatedScopes,prefix:'',
    title:'Rear brake & parking brake service',entryView:[-.58,.48,1.40],clearanceAxis:'z',
    parts:keys.map(part),steps:procedure.map(step=>({...step,focus:step.focus.map(part),access:step.access?.map(part)})),
    manuals:[manual.pads,manual.discs,manual.shoes,manual.adjust],
    completed:'Right rear assembly reinstalled. Repeat the job on the other rear corner. Check both wheels turn freely with the parking brake released, hold evenly with it applied, and confirm a firm foot pedal and correct fluid level before moving.',
  };
}

export const e30RearBrakeService=makeService({
  id:'e30-rear-brakes',modelId:'e30-325i-coupe-manual',
  reference:'This shows the 1991 rear-wheel-drive 325i with 258 × 10 mm rear discs and 160 mm drum-in-hat parking brakes.',
  parts:part=>'e30assembly:rear-right:'+part,manual:e30Manual,
  firstSpring:'return-lower',carrierSocket:'17 mm six-point socket for the original M10 × 30 carrier bolts',
  guideTorque:'BMW’s E30 table specifies 30 N·m with a −5 N·m tolerance for the original 7 mm capped rear guide bolts.',
  wheelTorque:'110 N·m for the stock 325i wheels',
  starAdjustment:'With both cables slack, align a wheel bolt opening about 30° rearward of vertical. Expand the shoes until the rotor locks, then back off 3–4 teeth on each side. Confirm both rotors turn easily.',
  cableAdjustment:'Pull the lever five clicks and adjust both cables until the wheels can just be turned with equal resistance. Release it and check both wheels turn freely.',
});

export const e34RearBrakeService=makeService({
  id:'e34-rear-brakes',modelId:'e34-525i-sedan-automatic',
  reference:'This shows the 1995 525i Sedan with 300 × 10 mm rear discs and 180 mm drum-in-hat parking brakes.',
  parts:part=>e34Ids[part]??'e34brake:rear-right-'+part,manual:e34Manual,
  firstSpring:'return-upper',carrierSocket:'16 mm six-point socket for the cataloged M10 × 26.5 collar bolts',
  guideTorque:'Bentley specifies 35 N·m for the shown clean, dry rear guide bolts.',
  wheelTorque:'100 ± 10 N·m for the stock wheels',
  starAdjustment:'With the cables slack, align a wheel bolt opening with the adjuster. Expand the shoes until the rotor locks, then back off about eight notches per side. Confirm both rotors turn freely.',
  cableAdjustment:'Set the lever several times to seat the cables, then pull it four notches and adjust for slight, even resistance at both wheels. Release it and check for free rotation.',
});
