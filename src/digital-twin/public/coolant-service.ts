import type { AssemblyProcedure, AssemblyStep, ManualLink } from './assembly-service';
import { coolingFanAccess } from './fan-service';
import type { Vec } from './model';

const bentley = 'https://www.e34chassis.com/wp-content/uploads/2023/08/Bentley_BMW_5-Series_Service_Manual_edited_eF1x.pdf';
const blockTorque = {title:'BMW 11 11 · M14 block drain plug torque',
  href:'https://www.adkusters.dsmynas.com/Website%20mynas/TIS%20documents%20PDF%20aanvulling/11_11_AZD.pdf'};
const e30Bleed = {title:'BMW E30 · M20 coolant refill and bleed',href:'/e30/manual/17?pdf=332'};
const e30Torque = {title:'BMW 11 53 · M20 thermostat and bleeder torque',
  href:'https://www.e30centre.co.uk/manuals/Bmw-Torque-Specs-all-sizes.pdf#page=30'};
const m20Pump = {title:'Bentley 170-6–7 · M20 water pump',href:bentley+'#page=207'};
const m20Timing = {title:'BMW E30 · M20 timing-belt procedure',href:'/e30/manual/11?pdf=110'};
const m20Ignition = {title:'Bentley 120-4–5 · M20 distributor and rotor',href:bentley+'#page=154'};
const m20Belt = {title:'Bentley 020-12–13 · V-belt routing and adjustment',href:bentley+'#page=32'};
const m50Belt = {title:'Bentley 170-8 · M50 belt and pulley access',href:'/manual/170?pdf=212'};
const m50Pump = {title:'Bentley 170-9 · M50 pump extraction and torque',href:'/manual/170?pdf=213'};
const m50Bleed = {title:'Bentley 170-5–6 · E34 coolant drain and bleed',href:'/manual/170?pdf=209'};
const statManual = {title:'Bentley 170-10 · Thermostat replacement',href:'/manual/170?pdf=214'};
const m20StatManual = {title:'Bentley 170-10 · M20 thermostat replacement',href:bentley+'#page=211'};
const statTorque = {title:'Bentley 170-11 · M50 housing and bracket torques',href:'/manual/170?pdf=215'};

const installed: Vec = [0,0,0];
const move = (parts: readonly string[], offset: Vec = installed): [string,Vec][] => parts.map(part=>[part,offset]);
const numbered = (name:string, count:number) => Array.from({length:count},(_,i)=>name+(i+1));
const pumpBolts = numbered('pump-bolt-',3);
const pulleyBolts = numbered('pulley-bolt-',4);
const statBolts = numbered('thermostat-bolt-',3);
const m20Engine = 'e30assembly:engine:';
const m20PumpId = m20Engine+'water-pump';
const m20Hoses = ['pump-return-hose','pump-feed-hose'];
const m50Hoses = ['e34sys:upper-radiator-hose','e34sys:lower-radiator-hose'];
const m50Clamps = ['upper-hose-clamp','lower-hose-clamp'];
const m20Pulley = ['pump-pulley',...pulleyBolts];
const m50Pulley = ['m50:pulley:water-pump',...pulleyBolts];
const m50PumpId = 'm50:water-pump';
const m50Nuts = ['m50:pump-nut:-1:-1','m50:pump-nut:-1:1','m50:pump-nut:1:-1','m50:pump-nut:1:1'];
const m50PumpBody = [m50PumpId,'m50:water-pump-impeller'];
const seals = ['thermostat-seal','thermostat-profile-seal'];
const coolant = 'BMW-approved coolant, mixed 50:50 with distilled water unless supplied premixed.';
const before = 'Work on a fully cold engine. Have a drain pan ready and keep coolant away from children and animals.';
const relocateHoses = (hoses:string[], clamps:string[], offset:Vec) => [
  ...move([hoses[0],clamps[0]],offset), ...move([hoses[1],clamps[1]],[offset[0],offset[1],-offset[2]]),
];

function base(e30:boolean, kind:'water-pump'|'thermostat', manuals:ManualLink[],
  steps:readonly AssemblyStep[], supplies:readonly string[], parts:string[] = []): AssemblyProcedure {
  const series = e30?'e30':'e34';
  return {
    id:`${series}-${kind}`, modelId:e30?'e30-325i-coupe-manual':'e34-525i-sedan-automatic',
    prefix:series+'cooling:', scope:'system:cooling', relatedScopes:['system:engine-bay'],
    title:kind==='water-pump'?'Water pump replacement':'Thermostat replacement',
    entryView:[1.1,1.24,e30?-1.0:1.12], clearanceAxis:'x', parts, manuals,
    steps:steps.map(step=>({...step,frame:step.frame??step.focus})), before,
    supplies:[...supplies,coolant+' Both references take about 10.5 L when fully drained.'],
    catalogParts:kind==='water-pump'
      ? e30?[m20PumpId,'e30cooling:pump-gasket']:[m50PumpId,'e34cooling:pump-o-ring']
      : e30?['e30cooling:thermostat','e30cooling:thermostat-cover','e30cooling:thermostat-seal']
        : ['m50:thermostat','m50:thermostat-housing','e34cooling:thermostat-seal','e34cooling:thermostat-profile-seal'],
    completed:'Cooling system reassembled. After the engine cools completely, verify the cold coolant level and check every joint you opened for leaks.',
  };
}

function drain(e30:boolean, full:boolean, focus:string[]): AssemblyStep {
  return {
    action:full?'Drain the cooling system':'Drain below the thermostat housing', focus,
    description:'On level ground, remove the pressure cap only when the engine is fully cold. Catch the coolant at the radiator drain. If you need to reach underneath, chock the wheels and support the car on a lift or rated stands. '
      +(full
        ? 'Drain the block below the exhaust manifold near cylinder 6. The BMW table specifies 25 N·m for the M14 × 1.5 block plug with a new washer. Tighten the original plastic radiator drain plug to 2.5 N·m.'
        :'Stop once the level is below the thermostat opening. Refit the original plastic radiator drain plug at 2.5 N·m and catch the remaining coolant when you disconnect the hose.'),
    tools:'Drain pan, gloves, and a screwdriver for the original slotted radiator drain'+(full?', 19 mm socket for the original block drain, new sealing washer and torque wrench':''),
    manual:e30?e30Bleed:m50Bleed,
  };
}

function finish(e30:boolean, filler:string): AssemblyStep[] {
  return [
    {action:'Fill and bleed the cold system',focus:[filler,'bleed-screw'],move:move(['bleed-screw'],[0,.018,0]),
      description:'Reconnect the battery once the engine bay is clear. Switch the ignition on with the engine off and set the heater to full warm. Open the '
        +(e30?'brass screw on the thermostat housing':'bleed screw at the expansion tank above the radiator')
        +' and fill slowly with the correct coolant until it flows without bubbles.',
      tools:e30?'Funnel, wide flat screwdriver for the slotted head or socket matching the fitted hex head'
        :'Funnel and a wide flat screwdriver for the original plastic bleed screw',manual:e30?e30Bleed:m50Bleed},
    {action:'Close the bleeder and set the cold level',focus:[filler,'bleed-screw'],move:move(['bleed-screw']),
      description:(e30?'BMW lists 8 N·m for its M8 bleed screw. ':'Seat the plastic bleeder gently. ')
        +'Set the level at the cold mark and fit the pressure cap.',
      tools:e30?'Drive matching the bleed screw and low-range torque wrench':'Wide flat screwdriver',
      manual:e30?e30Torque:m50Bleed},
    {action:'Warm up and check for leaks',focus:[filler,'bleed-screw'],
      description:'With the hood secure, run the engine in a ventilated space with the heater on full warm. Keep clear of the fan and belts. Check cabin heat and monitor the temperature gauge. Stop for leaks, loss of cabin heat or an abnormal temperature rise. '
        +(e30?'Allow the engine to cool fully before opening the cap or correcting the level.'
        :'Bentley calls for a second bleed at normal idle temperature. With the pressure cap fitted, carefully crack the bleed screw as directed and close it once flow is free of bubbles. Keep clear of the escaping hot coolant. Allow the engine to cool fully before opening the cap or correcting the level.'),
      tools:'Inspection light'+(e30?'':' and a wide flat screwdriver'),manual:e30?e30Bleed:m50Bleed},
  ];
}

const closeAfterCheck = (step:AssemblyStep):AssemblyStep => ({
  ...step, description:'After the engine cools completely, check the cold level again and inspect the pump or thermostat joint, drain plugs and hoses. Clear the engine bay and close the hood.',
});

function waterPump30() {
  const fan = coolingFanAccess(true);
  const filler = 'e30assembly:engine-bay:expansion-tank';
  const timing = m20Engine+'timing';
  const ignition = ['distributor-cap','ignition-rotor','distributor-shield'];
  const crossPipe = ['coolant-cross-pipe', 'cross-pipe-bolt-1', 'cross-pipe-bolt-2'];
  const cover = ['timing-cover',...numbered('cover-bolt-',3)];
  const pump = [m20PumpId,'pump-impeller'];
  const spring = ['tensioner-spring','tensioner-pin'];
  const movedHoses:Vec = [.025,-.025,.14];
  return base(true,'water-pump',[m20Pump,e30Bleed,blockTorque,m20Timing],[
    fan.open, drain(true,true,['e30assembly:radiator-pack:radiator']), ...fan.remove,
    {action:'Remove the coolant cross-pipe', focus:crossPipe, access:crossPipe, move:[...move(crossPipe,[.05,.22,-.09]),...move(['cross-pipe-thermostat-hose'],[-.025,.021,-.03]),...move(['cross-pipe-radiator-hose'],[.031,-.016,.03])],
      description:'Loosen the clamps and remove the two pipe fasteners. Slide the hose ends off the metal pipe and lift it clear of the distributor area. Check the seating ends for corrosion.',
      tools:'10 mm socket for the M6 pipe bolts, 6–7 mm nut driver or flat screwdriver for the fitted clamps',manual:m20Pump},
    {action:'Move the distributor cap and leads aside', focus:[ignition[0]], access:[ignition[0]], move:move([ignition[0]],[.06,.20,.08]),
      description:'Unclip the cap lead carrier and undo the three cap screws. Move the cap with its leads attached and supported so their order stays intact.',
      tools:'8 mm socket for original hex-head screws or driver matching the fitted cap',manual:m20Ignition},
    {action:'Remove the ignition rotor and dust shield', focus:ignition.slice(1), access:ignition.slice(1),
      move:[[ignition[1],[.07,.15,.10]],[ignition[2],[.06,.12,-.11]]],
      description:'Remove the rotor screws, slide off the rotor and lift away the dust shield. Note the shield’s locating tab and inspect its O-ring.',
      tools:'3 mm hex bit for the rotor',manual:m20Ignition},
    {action:'Release the alternator drive belt', focus:['drive-belt',...pulleyBolts],access:['drive-belt'],move:move(['drive-belt'],[.095,.045,.18]),
      description:'Crack the four pump pulley screws loose while the belt holds the pulley. Record belt routing. Loosen the alternator pivot and rack lock nut, then back off the toothed adjuster. If an outer accessory belt blocks removal, slacken and remove it first using its adjustment procedure.',
      tools:'10 mm socket for the pulley bolts, 13 mm wrench for the rack lock nut and 19 mm wrench for the original toothed adjuster',manual:m20Belt},
    {action:'Remove the pump pulley',focus:m20Pulley,access:m20Pulley,move:move(m20Pulley,[.075,.038,-.12]),
      description:'Remove the four M6 screws and lift the pulley off the pump pilot. Inspect its grooves and keep the screws with it.',
      tools:'10 mm socket',manual:m20Pump},
    {action:'Disconnect both water-pump hoses',focus:m20Hoses,access:m20Hoses,move:relocateHoses(m20Hoses,['pump-return-clamp','pump-feed-clamp'],movedHoses),
      description:'Loosen both clamps and break the hose seals carefully. Slide the hoses off the pump and catch the coolant left in them. Replace split, hardened or swollen hoses.',
      tools:'6–7 mm nut driver or flat screwdriver, hose pick with a rounded tip',manual:m20Pump},
    {action:'Remove the upper timing cover',focus:cover,access:cover,move:move(cover,[.045,.235,-.15]),
      description:'Loosen the upper alternator bracket nut and unclip the wiring duct. Remove the upper cover fasteners and lift out the cover with its side rubber strip. Keep the belt and timing area dry.',
      tools:'10 and 13 mm sockets, small trim lever',manual:m20Pump},
    {action:'Remove the upper bolts and capture the spring',focus:[...pumpBolts,...spring,...pump],frame:[...pumpBolts,...spring,...pump,timing],
      move:[...move(pumpBolts.slice(0,2),[.075,.035,0]),...move(spring,[.038,.105,-.03]),...move(pump,[.009,-.002,0])],
      rotateZ:pump.map(id=>[id,-10]),
      description:'Loosen all three pump bolts. Remove the two upper bolts and leave the lowest one threaded loosely as a pivot. Lower the pump under control as in Fig. 10, catching the spring and guide pin. Keep both timing-belt tensioner fasteners tight. If the timing belt moves or gets wet, stop and follow the linked timing service before starting.',
      tools:'13 mm socket and a pick or long-nose pliers to catch the pin',manual:m20Pump},
    {action:'Remove the lower bolt, pump and gasket',focus:[pumpBolts[2],...pump,'pump-gasket'],frame:[...pump,'pump-gasket',timing],
      move:[...move(pump,[.042,.248,.12]),...move([pumpBolts[2]],[.057,.195,.045]),...move(['pump-gasket'],[.065,.20,.02])],
      rotateZ:pump.map(id=>[id,0]),
      description:'Support the pump while backing out the last bolt. Lift the pump away and strip the old gasket. Clean the mating faces without gouging the aluminum or dropping residue into the pump opening.',
      tools:'13 mm socket, plastic scraper and lint-free rag',manual:m20Pump},
    {action:'Seat the new gasket and locate the spring and pin',focus:[...pump,'pump-gasket',...spring,pumpBolts[2]],
      move:[...move(['pump-gasket',pumpBolts[2]]),...move(pump),...move(spring)],
      description:'Place a new gasket on clean, dry mating faces. Start the lower bolt by hand while supporting the pump. Sit the guide pin and spring in the tensioner and pump detent, pivot the pump into place and confirm they stay seated.',
      tools:'13 mm socket and inspection light',manual:m20Pump},
    {action:'Tighten the three pump bolts',focus:pumpBolts,move:move(pumpBolts),
      description:'Start both upper M8 bolts by hand and seat the pump evenly. Tighten all three to 22 N·m.',
      tools:'13 mm socket and torque wrench',manual:m20Pump},
    {action:'Refit the timing cover and wiring duct',focus:cover,move:move(cover),
      description:'Check the belt is dry, on its sprockets and untouched by the spring work. Fit the side rubber strip and upper cover, reconnect the wiring duct, and secure the bracket. If timing was disturbed, use BMW’s timing procedure before proceeding.',
      tools:'10 and 13 mm sockets',manual:m20Timing},
    {action:'Reconnect both pump hoses and seat the pulley',focus:[...m20Pulley,...m20Hoses],move:move([...m20Pulley,...m20Hoses,'pump-return-clamp','pump-feed-clamp']),
      description:'Push the hoses fully onto their original necks and seat the clamps behind each bead. Start the four pulley bolts by hand with the pulley centered on its pilot.',
      tools:'10 mm socket and the driver matching the hose clamps',manual:m20Pump},
    {action:'Refit and tension the alternator belt',focus:['drive-belt',...pulleyBolts],move:move(['drive-belt']),
      description:'Seat the belt in all three grooves. For the toothed-rack method, load the alternator adjusting gear to 7 N·m while holding it, then tighten its lock nut to 24 N·m. Secure the pivot. Counterhold the pump pulley to tighten its four screws to 10 N·m. Refit any outer belts using their own adjustment specs.',
      tools:'13 and 19 mm tools for the rack and a 10 mm socket for the pulley. Use a low-range torque wrench.',manual:m20Belt},
    {action:'Refit the distributor shield, rotor and cap',focus:ignition,move:move(ignition),
      description:'Seat the shield and its O-ring, then fit the rotor on the locating features. Tighten the rotor screws to 2.8 ± 0.2 N·m. Fit the cap squarely and clip the lead carrier back into place, clear of the belt.',
      tools:'3 mm hex bit, low-range torque driver and the drive matching the cap screws',manual:m20Ignition},
    {action:'Reconnect the coolant cross-pipe',focus:crossPipe,move:move([...crossPipe,'cross-pipe-thermostat-hose','cross-pipe-radiator-hose']),
      description:'Seat the pipe in its brackets, reconnect both hose ends and position the clamps behind the beads. Keep the pipe and hoses clear of rotating parts.',
      tools:'10 mm socket and the driver matching the hose clamps',manual:m20Pump},
    ...fan.reinstall, ...finish(true,filler), closeAfterCheck(fan.close),
  ],['Late M20 pump 11 51 9 070 758. Match both hose ports to the removed pump.',
    'New flat pump gasket 11 51 1 722 677.', 'Three M8 × 20 mm pump bolts 07 11 9 903 039. Replace damaged hardware.',
    'Check the guide pin 11 31 1 280 960 and spring 11 31 1 267 746 while accessible.'],
    ['alternator-pulley','crank-pulley',m20Engine+'alternator','cross-pipe-thermostat-hose','cross-pipe-radiator-hose']);
}

function waterPump34() {
  const fan = coolingFanAccess(false);
  const pulley = 'm50:pulley:water-pump';
  const belt = 'm50:accessory-belt';
  const tensioner = 'm50:belt-tensioner';
  const allHoses = [...m50Hoses,...m50Clamps];
  return base(false,'water-pump',[m50Belt,m50Pump,m50Bleed,blockTorque],[
    fan.open, drain(false,true,['e34sys:radiator']), ...fan.remove,
    {action:'Disconnect both thermostat housing hoses',focus:m50Hoses,access:m50Hoses,
      move:relocateHoses(m50Hoses,m50Clamps,[.04,.09,-.11]),
      description:'Mark which hose goes to each neck. Loosen the clamps and move the hoses out of the pulley area. Catch the residual coolant.',
      tools:'6 mm or 7 mm nut driver, or flat screwdriver for fitted clamps',manual:m50Belt},
    {action:'Release the drive belt and remove the pump pulley',focus:[pulley,belt,tensioner,...pulleyBolts],access:[belt,...m50Pulley],
      move:[...move([belt],[.12,.065,.19]),...move(m50Pulley,[.12,.015,-.16])],
      description:'Loosen the four pulley screws while the belt holds the pulley. Record belt routing. Remove the tensioner cap and lever the hydraulic tensioner clockwise as viewed from the front. Slip off the main belt, slowly release the tensioner, and remove the pulley and screws.',
      tools:'10 mm socket and 8 mm hex bit with a breaker bar for the hydraulic tensioner shown. Match the drive if your tensioner has been replaced.',manual:m50Belt},
    {action:'Remove the four pump nuts',focus:m50Nuts,move:move(m50Nuts,[.065,.015,0]),
      description:'Remove all four M6 flange nuts. Leave the studs in the timing cover.',
      tools:'10 mm socket and short extension',manual:m50Pump},
    {action:'Draw out the pump and remove the O-ring',focus:[...m50PumpBody,'pump-o-ring'],
      move:[...move(m50PumpBody,[.076,.234,.14]),...move(['pump-o-ring'],[.099,.193,.040])],
      description:'Thread two M6 × 1 screws into the pump’s extraction ears. Turn them alternately a little at a time so the pump comes out straight. Remove the old O-ring and clean the bore without scratching it.',
      tools:'Two matching M6 × 1 extraction screws long enough to bear against the cover, socket, plastic pick and lint-free rag',manual:m50Pump},
    {action:'Install the pump with a new O-ring',focus:[...m50PumpBody,'pump-o-ring',...m50Nuts],move:move([...m50PumpBody,'pump-o-ring',...m50Nuts]),
      description:'Fit the new seal to the pump. Bentley calls for a thin film of petroleum jelly on the original seal. Follow the replacement pump’s instructions if it calls for a different seal lubricant. Remove the extraction screws, guide the pump onto the studs and draw it in evenly. Tighten the four nuts alternately to 10 N·m.',
      tools:'10 mm socket and low-range torque wrench',manual:m50Pump},
    {action:'Refit the pulley and route the belt',focus:[pulley,belt,tensioner,...pulleyBolts],move:move([...m50Pulley,belt]),
      description:'Start the pulley screws by hand. Route the main belt per your reference, with every rib in its groove and the smooth belt face on smooth idlers. Slowly release the tensioner, refit its cap and counterhold the pulley to torque the screws to 10 N·m.',
      tools:'8 mm hex bit for the tensioner shown, 10 mm socket, pulley counterhold and low-range torque wrench',manual:m50Belt},
    {action:'Reconnect both radiator hoses',focus:m50Hoses,move:move(allHoses),
      description:'Seat both hoses against their stops and put each clamp behind its neck bead. Check the hose routing clears the pulley and belt.',
      tools:'Nut driver or flat screwdriver matching the clamps',manual:m50Belt},
    ...fan.reinstall, ...finish(false,'e34sys:expansion-tank'), closeAfterCheck(fan.close),
  ],['M50 coolant pump 11 51 7 527 799, with metal impeller as specified by Bentley.',
    'New pump O-ring 11 51 1 711 484, 68 × 5 mm.',
    'New block drain sealing washer if the block was drained.']);
}

function thermostat(e30:boolean) {
  const fan = coolingFanAccess(e30);
  const radiator = e30?'e30assembly:radiator-pack:radiator':'e34sys:radiator';
  const filler = e30?'e30assembly:engine-bay:expansion-tank':'e34sys:expansion-tank';
  const cover = e30?'thermostat-cover':'m50:thermostat-housing';
  const core = e30?'thermostat':'m50:thermostat';
  const hoses = e30?['e30assembly:radiator-pack:hoses']:m50Hoses;
  const clamps = e30?['upper-hose-clamp']:m50Clamps;
  const bracket = ['thermostat-bracket-bolt','thermostat-ground','thermostat-lifting-bracket'];
  const seat = e30?['thermostat-seal']:seals;
  const bolts = e30?statBolts:[...statBolts,...bracket];
  const hoseMoves = e30?move([...hoses,...clamps],[.025,.06,-.14]):relocateHoses(hoses,clamps,[.04,.09,-.11]);
  const manual = e30?m20StatManual:statManual;
  const coverOff:Vec = e30?[.12,.09,-.09]:[.13,.095,0];
  return base(e30,'thermostat',e30?[manual,e30Torque,e30Bleed]:[statManual,statTorque,m50Bleed],[
    fan.open, drain(e30,false,[radiator]), ...(e30?[]:fan.remove),
    {action:e30?'Disconnect the upper radiator hose':'Disconnect both thermostat housing hoses',focus:hoses,access:hoses,move:hoseMoves,
      description:e30?'Release the clamp and disconnect the upper radiator hose at the thermostat cover. Leave the other housing connections in place and catch any coolant that spills.'
        :'This walkthrough removes the fan and shroud for access. Mark the hose locations, release both clamps and disconnect the hoses at the thermostat housing. Catch the residual coolant.',
      tools:'6 mm or 7 mm nut driver, or flat screwdriver matching the clamps',manual},
    {action:e30?'Remove the thermostat cover':'Remove the housing and lifting bracket',focus:[cover,...bolts],
      move:[...move([cover],coverOff),...move(statBolts,[.14,.03,-.045]),
        ...(e30?[]:[...move([bracket[0]],[.16,0,.07]),...move(bracket.slice(1),[.08,.14,.11])])],
      description:e30?'Remove the three M6 cover bolts. Lift the cover away from the housing and leave the body attached to the cylinder head.'
        :'Support the housing while removing the three M6 bolts and the long M8 lifting-bracket bolt. Move the bracket and ground eyelet aside, keeping track of their order. Lift the housing off the head.',
      tools:e30?'10 mm socket and extension':'10 mm socket for the three M6 bolts and 13 mm socket for the M8 bracket bolt',manual},
    {action:'Lift out the thermostat and old seals',focus:[core,...seat],frame:[cover,core,...seat],
      move:[...move([core],[.095,.045,-.055]),...move(['thermostat-seal'],[.16,.042,.04]),
        ...(e30?[]:move(['thermostat-profile-seal'],[.12,.11,.09]))],
      description:'Note which face and vent point up before removing the thermostat. Clean the seat with a nonmetal scraper. Check the housing for cracks and its face for corrosion or distortion.',
      tools:'Plastic pick, nonmetal scraper and lint-free rag',manual},
    {action:'Fit the new thermostat and seals',focus:[core,...seat],move:move([core,...seat]),
      description:'Match the opening temperature marked on the old unit to your application. Fit the thermostat with the spring toward the engine and the vent hole or arrow at 12 o’clock when marked. '
        +(e30?'Seat the new O-ring evenly.':'Seat the new O-ring and the correct housing gasket. This later housing uses a profile seal. Earlier flat-gasket housings use their own gasket.'),
      manual},
    {action:e30?'Torque the thermostat cover':'Torque the housing and reconnect the ground',focus:[cover,...bolts],move:move([cover,...bolts]),
      description:e30?'Start the three cover bolts by hand. Draw the cover down evenly and tighten the M6 bolts to 10 N·m.'
        :'Refit the lifting bracket and ground eyelet in the original order on the long bolt. Start all bolts by hand. Tighten the three M6 bolts evenly to 10 N·m and the M8 lifting-bracket bolt to 22 N·m.',
      tools:e30?'10 mm socket and low-range torque wrench':'10 and 13 mm sockets and low-range torque wrench',manual:e30?e30Torque:statTorque},
    {action:e30?'Reconnect the upper radiator hose':'Reconnect both radiator hoses',focus:hoses,move:move([...hoses,...clamps]),
      description:'Seat each hose fully and position its clamp behind the bead. Check that the hoses and any wire clips are clear of the fan.',
      tools:'Nut driver or flat screwdriver matching the clamps',manual},
    ...(e30?[]:fan.reinstall), ...finish(e30,filler), closeAfterCheck(fan.close),
  ],e30?['80 °C M20 thermostat 11 53 1 710 953 for this reference. Verify against the catalog for your car.',
    'New thermostat O-ring 11 53 1 265 084.']
    :['M50 thermostat. Catalog lists 11 53 7 511 580 and 11 53 7 511 083. Confirm the opening temperature and production-date entry.',
      'New thermostat O-ring 11 53 1 265 084 and late housing profile gasket 11 53 1 740 437.'], e30?['thermostat-body']:[]);
}

export const coolantServices = {
  'e30-water-pump':waterPump30(), 'e30-thermostat':thermostat(true),
  'e34-water-pump':waterPump34(), 'e34-thermostat':thermostat(false),
};
