import type { AssemblyProcedure, AssemblyStep, ManualLink } from './assembly-service';
import type { Vec } from './model';

const e30Cowl: ManualLink = { title:'BMW 17-7 · Six-cylinder fan cowl', href:'/e30/manual/17?pdf=333' };
const e30Torque: ManualLink = { title:'BMW tightening tables · 11 52 Fan',
  href:'https://www.e30centre.co.uk/manuals/Bmw-Torque-Specs-all-sizes.pdf' };
const bentley: ManualLink = { title:'Bentley 170-12 · Fan and shroud', href:'/manual/170?pdf=216#job-mechanical-cooling-fan-replacement' };
const m20Fan: ManualLink = { title:'Bentley 170-12 · M20 fan tools and method',
  href:'https://www.e34chassis.com/wp-content/uploads/2023/08/Bentley_BMW_5-Series_Service_Manual_edited_eF1x.pdf#page=214' };
const installed: Vec = [0,0,0];
const raise: Vec = [0,.364,0];
const fanOff: Vec = [.013,.364,0];
const move = (parts: readonly string[], offset:Vec): [string,Vec][] => parts.map(part=>[part,offset]);

function fanService(e30:boolean) {
  const cooling = e30?'e30assembly:radiator-pack:':'e34sys:';
  const hood = e30?'e30body:hood':'e34body:hood';
  const wheel = cooling+(e30?'fan':'engine-cooling-fan');
  const shroud = cooling+(e30?'shroud':'fan-shroud');
  const clutch = cooling+'fan-coupling';
  const pump = e30?'e30assembly:engine:water-pump':'m50:water-pump';
  const bolts = Array.from({length:4},(_,i)=>'fan-screw-'+(i+1));
  const fasteners = ['shroud-rivet-left','shroud-rivet-right'];
  const fan = [wheel,clutch,...bolts];
  const fitted = [cooling+'radiator',pump,shroud,...fan];
  const fanTool = 'Thin 32 mm fan-clutch wrench and BMW '+(e30?'11 5 030':'11 5 050')+' pulley counterhold or equivalent';
  const boltTool = 'T30 for the BMW M6 ISA screws shown. Match the bit or socket to the fitted hardware.';
  const primary = e30?e30Cowl:bentley;
  const method = e30?m20Fan:bentley;
  const open: AssemblyStep = { action:'Open the hood',access:[hood],focus:[hood],panels:[[hood,true]],frame:[hood,...fitted],
  description:'Let the engine cool fully. Switch off the ignition, remove the key and disconnect the negative battery cable before working near the fan. Secure the hood open.',
  tools:'10 mm wrench for the original battery clamp',manual:method };
  const remove: AssemblyStep[] = [
    { action:'Loosen the left-hand fan nut',focus:[clutch],frame:fitted,move:move(fan,[.013,0,0]),
      description:'Hold the coolant-pump pulley and turn the 32 mm nut clockwise when viewed from the front. Support the fan as the left-hand thread disengages. Keep it inside the shroud until its retainers are free.',
      tools:fanTool,manual:method },
    { action:'Release both shroud rivets',access:[...fasteners],focus:fasteners,frame:fitted,move:move(fasteners,[0,.12,.15]),
      description:'Lift the center pins, then remove the expanding rivets. Free any hose or lead clipped to the shroud and leave its connections intact.',
      tools:'Plastic trim lever or small flat screwdriver',manual:primary },
    { action:'Lift out the fan and shroud together',access:[wheel,clutch,shroud],focus:[wheel,shroud],frame:fitted,
      move:[...move(fan,fanOff),...move([shroud],raise)],
      description:'Lift the fan and shroud together, clearing the lower locating tabs. Guide the assembly past the radiator fins. Keep the viscous clutch upright. The radiator and hoses stay connected.',
      manual:method },
  ];
  const bench: AssemblyStep[] = [
    { action:'Remove the four fan screws',focus:bolts,frame:[...fan,shroud],move:move(bolts,[.150,.420,.06]),
      description:'Place the assembly in a stable upright position. Record which side of the blade faces the radiator. Remove the four screws and retain the washers where fitted.',
      tools:boltTool,manual:method },
    { action:'Separate the fan from the clutch',focus:[wheel,clutch],frame:[...fan,shroud],
      move:[[wheel,[.13,.364,.17]],[clutch,[-.10,.344,-.21]]],
      description:'Lift the fan off its pilot. Inspect the hub and blades for cracks and compare the bolt pattern, centering pilot and nut on the replacement clutch. Replace a cracked fan.',
      manual:method },
    { action:'Seat the fan and tighten its screws',focus:[wheel,...bolts],frame:[...fan,shroud],move:move(fan,fanOff),
      description:'Face the blade the same way as the original, center it on the pilot and start the screws by hand. Tighten the original M6 fan-to-clutch screws evenly to 10 N·m.',
      tools:boltTool+' Use a low-range torque wrench.',manual:e30?e30Torque:bentley },
  ];
  const reinstall: AssemblyStep[] = [
    { action:'Lower the fan and shroud into place',focus:[wheel,shroud],frame:fitted,
      move:[...move(fan,[.013,0,0]),...move([shroud],installed)],
      description:'Lower both parts past the radiator. Seat the lower shroud tabs before fastening the top. Keep the fan supported at the water-pump spindle.',
      manual:method },
    { action:'Torque the fan nut on the pump',focus:[clutch],frame:fitted,move:move(fan,installed),
      description:'Start the left-hand nut by hand, turning it counterclockwise as viewed from the front. Counterhold the pulley and apply 40 N·m at the nut. The Bentley setup with BMW 11 5 040 specifies a 30 N·m wrench setting.',
      tools:fanTool+' and a torque wrench rated for counterclockwise tightening.',manual:method },
    { action:'Secure the shroud and check clearance',focus:fasteners,frame:fitted,move:move(fasteners,installed),
      description:'Refit both rivets and any hose or lead clips. With the engine off and battery still disconnected, turn the fan by hand and check clearance all the way around.',
      tools:'Inspection light',manual:primary },
  ];
  const close: AssemblyStep = { action:'Close the hood',focus:[hood],frame:fitted,panels:[[hood,false]],
  description:'Reconnect the battery after the clearance check. With tools clear of the engine bay, close the hood. Check from a safe position for rubbing or vibration at startup.',
  manual:method };
  const procedure: AssemblyProcedure = {
    id:e30?'e30-cooling-fan':'e34-cooling-fan',modelId:e30?'e30-325i-coupe-manual':'e34-525i-sedan-automatic',
    scope:'system:cooling',relatedScopes:['system:engine-bay'],
    prefix:e30?'e30cooling:':'e34cooling:',title:'Cooling fan & clutch service',
    entryView:[1.25,1.05,1.1],clearanceAxis:'y',parts:[hood,...fitted],
    manuals:e30?[e30Cowl,m20Fan,e30Torque]:[bentley],
    completed:'Fan, clutch and shroud reinstalled. Confirm the fan turns clear of the shroud and radiator before reconnecting the battery and starting the engine.',
    steps:[open,...remove,...bench,...reinstall,close],
  };
  return {procedure,access:{open,remove,reinstall,close},fan,wheel,shroud};
}

const m20FanService = fanService(true);
const m50FanService = fanService(false);
export const e30CoolingFanService = m20FanService.procedure;
export const e34CoolingFanService = m50FanService.procedure;
export function coolingFanAccess(e30:boolean) {
  const {access,fan,wheel,shroud} = e30 ? m20FanService : m50FanService;
  const z = e30?.49:-.49;
  const park:AssemblyStep = {
    action:'Set the fan and shroud aside',focus:[wheel,shroud],
    move:[...move(fan,[fanOff[0],fanOff[1],z]),...move([shroud],[raise[0],raise[1],z])],
    description:'Once the assembly clears the radiator, move it aside. Rest it upright on a stable surface.',
  };
  const retrieve:AssemblyStep = {
    action:'Bring back the fan and shroud',focus:[wheel,shroud],
    move:[...move(fan,fanOff),...move([shroud],raise)],
    description:'Hold the fan inside the shroud and position both above their mounts. Keep the assembly clear of the radiator fins.',
  };
  return {...access,remove:[...access.remove,park],reinstall:[retrieve,...access.reinstall]};
}
