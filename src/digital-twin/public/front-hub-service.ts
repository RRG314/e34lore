import references from '../../../data/digital-twin/front-hub-references.json';
import type { AssemblyProcedure, ManualLink } from './assembly-service';
import type { Vec } from './model';

type Series = keyof typeof references;
type Side = 'left' | 'right';
export type FrontHubServiceId = `${Series}-${Side}-front-hub`;

const manuals = {
  e30: {
    remove: { title:'BMW 31-10 · Front hub removal', href:'/e30/manual/31?pdf=514' },
    install: { title:'BMW 31-10.1 · Front hub installation', href:'/e30/manual/31?pdf=515' },
    brakes: { title:'BMW 34-5 · Front discs', href:'/e30/manual/34?pdf=644' },
    brakeTorque: { title:'BMW 34 11 · Front brake torque', href:'https://workshop-manuals.com/bmw/3_series_e30/325i_m20_conver/4_tightening_torques/34__brakes/11__front_brakes/1_azd__front_brake/' },
  },
  e34: {
    remove: { title:'Bentley 310-7 · Front hub removal', href:'/manual/310?pdf=283' },
    install: { title:'Bentley 310-8 · Front hub installation', href:'/manual/310?pdf=284' },
    brakes: { title:'Bentley 340-6 · Front discs and caliper carrier', href:'/manual/340?pdf=322' },
  },
} satisfies Record<Series, Record<string, ManualLink>>;
const torque: ManualLink = {
  title:'BMW 31 21 1AZ · RWD collar nut, 290 N·m',
  href:'https://workshop-manuals.com/bmw/3_series_e30/325i_m20_conver/4_tightening_torques/31__front_axle/21__wheel_bearings_and_stub_axle/1_azd__wheel_bearings_and_steering_knuckle/',
};

export function frontHubHardware(series: Series, side: Side) {
  const prefix = `${series}front-hub:${side}:`;
  return { cap:prefix+'cap', nut:prefix+'nut', shield:prefix+'shield' };
}

const move = (parts: string[], offset: Vec = [0,0,0]): [string,Vec][] => parts.map(id=>[id,offset]);

function frontHubService(series: Series, side: Side): AssemblyProcedure {
  const e30 = series==='e30', left = side==='left', sign = left?-1:1;
  const fit = references[series], service = manuals[series], suffix = left?'1':'-1';
  const corner = 'e30assembly:front-'+side+':';
  const brake = 'e34brake:front-'+side+'-';
  const {cap,nut,shield} = frontHubHardware(series,side);
  const wheel = e30?corner+'wheel':'wheel:front-'+side;
  const hub = e30?corner+'hub':'e34sys:hub-front-'+suffix;
  const spindle = e30?corner+'strut-spindle':'e34axle:'+side+'-strut-spindle';
  const rotor = e30?corner+'rotor':'e34sys:brake-disc-front-'+suffix;
  const discScrew = (e30?corner:brake)+'disc-screw';
  const carrier = (e30?corner:brake)+'carrier';
  const carrierBolts = ['lower','upper'].map(end=>e30?corner+'carrier-bolt-'+end:brake+'carrier-'+end);
  const caliper = e30 ? [carrier,...['caliper','pad-inner','pad-outer','guide-bolt-upper','guide-bolt-lower',
    'guide-pin-upper','guide-pin-lower','guide-boot-upper','guide-boot-lower'].map(key=>corner+key)]
    : [carrier,'e34sys:brake-caliper-front-'+suffix,'e34sys:brake-pad-front-'+suffix,
      ...['inner-pad','spring-clip','guide-lower','guide-upper','cap-lower','cap-upper'].map(key=>brake+key)];
  const wearLead = left?[(e30?corner:brake)+'wear-sensor']:[];
  const brakeAssembly = [...caliper,...wearLead];
  const collarSocket = e30?'36 mm thin-wall socket (BMW 11 2 180)':'46 mm thin-wall socket (BMW 31 2 080)';
  const discBit = e30?'5 mm hex bit':'6 mm hex bit';
  const hubFrame = [hub,spindle];

  return {
    id:`${series}-${side}-front-hub`, modelId:fit.modelId, minimumRevision:fit.revision, side,
    topic:e30?'e30-front-wheel-bearing':'310-job-front-wheel-bearing',
    title:'Front hub and bearing replacement', scope:'system:front-suspension', relatedScopes:['system:front-brakes'],
    prefix:`${series}front-hub:${side}:`, entryView:[.35,.51,sign*1.33], clearanceAxis:'z',
    parts:[spindle,shield], catalogParts:[hub,shield,cap,nut],
    before:(e30?'1991 325i Coupe with rear-wheel drive, ABS and Girling front brakes.':'1995 525i automatic sedan with rear-wheel drive, the 83 mm symmetric ABS hub and ATE front brakes.')+
      ' Match the hub and disc hole pattern to the vehicle. The iX uses a different procedure.',
    supplies:[`Hub and integral bearing ${fit.hub} · catalog replacement ${fit.replacement}.`,
      `New collar nut ${fit.nut} and grease cap ${fit.cap}. Replace the inboard dust collar ${fit.shield} if disturbed or damaged.`],
    manuals:[service.remove,service.install,service.brakes,torque],
    completed:'Check for smooth rotation and bearing play. Pump the brake pedal until firm, verify the ABS warning goes out and listen for noise on a short road check.',
    steps:[
      { action:'Support the car', focus:[wheel,hub],
        description:'Check for wheel play and roughness before lifting. Loosen the wheel bolts on level ground, chock the rear wheels and support the car at its approved lift points.',
        tools:'17 mm wheel socket, chocks and a rated lift or jack and stands',manual:service.remove },
      { action:'Remove the front wheel', access:[wheel], focus:[wheel], move:move([wheel],[.48,-.055,sign*.34]),
        description:'Remove the wheel bolts and lift the wheel straight off the center pilot. Set it aside clear of the work area.' },
      { action:'Hang the caliper and carrier', access:[carrier], focus:[carrier,...carrierBolts],
        move:[...move(brakeAssembly,[-.25,.16,sign*.029]),...move(carrierBolts,[-.22,.07,-sign*.10])],
        description:(left?'Unplug the pad wear sensor and free its lead. ':'')+
          'Undo both carrier bolts and hang the carrier and caliper together. Keep the hose connected, untwisted and free of load.',
        tools:'19 mm six-point socket and caliper hanger',manual:service.brakes },
      { action:'Remove the disc and its retaining screw', access:[rotor], focus:[rotor,discScrew], frame:hubFrame,
        move:[...move([discScrew],[.08,.105,sign*.24]),...move([rotor],[.10,.02,sign*.27])],
        description:'Withdraw the retaining screw and draw the disc off the hub pilot. Set it down where its friction faces will stay clean.',
        tools:discBit,manual:service.brakes },
      { action:'Lift out the grease cap', access:[cap], focus:[cap,nut], frame:hubFrame,move:move([cap],[.095,.092,sign*.09]),
        description:'Work around the edge of the pressed cap and remove it. Check the cap seat for damage. Use a new cap at refit.',
        tools:'Grease-cap puller or suitable pry tool',manual:service.remove },
      { action:'Release the stake and remove the collar nut', access:[nut], focus:[nut,spindle],frame:hubFrame,
        move:move([nut],[-.087,.045,sign*.10]),
        description:'Lift the staked lip out of the spindle groove before turning the nut. Keep the tool clear of the spindle threads. Discard the old nut.',
        tools:'Cross chisel, '+collarSocket+' and breaker bar',manual:service.remove },
      { action:'Pull the hub and bearing off the spindle', focus:hubFrame,frame:[spindle],move:move([hub],[0,0,sign*.18]),
        description:'Set the puller squarely against the stub axle with its threads protected. Draw the hub straight off. The ABS tone ring comes away with the bearing unit. Discard the removed bearing unit.',
        tools:e30?'BMW 31 2 101 / 102 / 104 hub puller or equivalent':'BMW 31 2 102 / 105 / 106 hub puller or equivalent',manual:service.remove },
      { action:'Inspect the spindle and inboard shield', focus:[spindle,shield],frame:[spindle],
        description:'If the inner race stayed on the spindle, remove it with a bearing separator and puller. Replace a bent or disturbed dust collar. Inspect the cleaned journal, shoulder, threads and the ABS sensor tip before fitting the new hub.',
        tools:e30?'BMW 00 7 500 and 33 1 309 for a stuck race, or equivalent separator and puller':'Bearing separator and puller sized to the inner race',
        manual:service.remove },
      { action:'Draw the new bearing unit onto its shoulder', focus:hubFrame,frame:hubFrame,move:move([hub]),
        description:'Start the unit square. Use the installer to apply load to the inner race only, then draw the unit fully to the shoulder. Check that the tone ring clears the fixed parts.',
        tools:e30?'BMW 31 2 120 hub installer or equivalent':'BMW 31 2 110 hub installer or equivalent',manual:service.install },
      { action:'Torque the new collar nut and stake it', focus:[nut,spindle],frame:hubFrame,move:move([nut]),
        description:'Start the new nut by hand. Tighten it to 290 N·m with the car safely supported, then stake the lip into the spindle groove. Check the stake before covering it.',
        tools:collarSocket+', torque wrench rated for 290 N·m and a staking punch',manual:torque },
      { action:'Seat the new grease cap', focus:[cap,hub],frame:hubFrame,move:move([cap]),
        description:'Drive the cap in evenly at the rim until it seats. Turn the hub by hand and check for smooth rotation.',
        tools:'Cap driver that bears on the outer lip',manual:service.install },
      { action:'Refit the disc and carrier', focus:[rotor,carrier,...carrierBolts],frame:[rotor,carrier],
        move:move([rotor,discScrew,...brakeAssembly,...carrierBolts]),
        description:'Seat the disc flat on the clean hub and tighten its screw to 16 N·m. Torque the carrier bolts to '+(e30?'123 N·m with lightly oiled threads per BMW.':'110 N·m for the stock ATE carrier.')+
          (left?' Reconnect the wear lead and secure it in its clips.':'')+' Check the hose through the steering range.',
        tools:discBit+', 19 mm socket and torque wrenches',manual:e30?manuals.e30.brakeTorque:service.brakes },
      { action:'Refit the wheel and check the brakes', focus:[wheel],move:move([wheel]),
        description:'Start the original wheel bolts by hand and tighten them crosswise to '+(e30?'110 N·m':'100 ± 10 N·m')+
          '. With the car stationary, pump the pedal until firm and check the hose and lead routing before driving.',
        tools:'17 mm socket and torque wrench' },
    ],
  };
}

export const frontHubServices = {
  'e30-left-front-hub': frontHubService('e30','left'),
  'e30-right-front-hub': frontHubService('e30','right'),
  'e34-left-front-hub': frontHubService('e34','left'),
  'e34-right-front-hub': frontHubService('e34','right'),
} satisfies Record<FrontHubServiceId,AssemblyProcedure>;
