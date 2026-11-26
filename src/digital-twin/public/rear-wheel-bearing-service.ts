import type { AssemblyProcedure, AssemblyStep, ManualLink } from './assembly-service';
import { axleSwing, cvHardware } from './rear-final-drive-service';
import type { Vec } from './model';
import references from '../../../data/digital-twin/rear-wheel-bearing-references.json';

type Series = keyof typeof references;
type Side = 'left' | 'right';
export type RearWheelBearingServiceId = `${Series}-${Side}-rear-wheel-bearing`;

const move = (ids: string[], translation: Vec = [0,0,0]): [string,Vec][] => ids.map(id=>[id,translation]);
const page = (chapter:string, pdf:number, title:string):ManualLink => ({title,href:'/manual/'+chapter+'?pdf='+pdf});
const factory30 = {
  remove: page('33',634,'BMW 33-14 · Hub, circlip and bearing removal'),
  install: page('33',635,'BMW 33-15 · Bearing and hub installation'),
  axle: page('33',625,'BMW 33-4 · Rear halfshaft'),
  brakes: page('34',649,'BMW 34-9 · Rear brake disc'),
  collar: {title:'BMW 33 21 2AZ · E30 collar nut, 200 N·m',href:'https://sdfbbedf4bd486017.jimcontent.com/download/version/1557524722/module/7487515011/name/Anzugsdrehmomente%20BMW.pdf'},
  illustration: {title:'BMW factory illustration · Bearing press setup',href:'https://e30mpower.com/33%20-%20Rear%20Axle/33-15.jpg'},
};
const bentley34 = {
  remove: page('330',303,'Bentley 330-5 · Rear hub and bearing removal'),
  install: page('330',304,'Bentley 330-6 · Bearing, hub and brake installation'),
  axle: page('330',305,'Bentley 330-7 · Rear CV joint and collar torque'),
  brakes: page('340',322,'Bentley 340-6 · Rear brake disc'),
  collar: {title:'BMW 33 41 1AZ · E34 collar nut, 250 N·m',href:'https://workshop-manuals.com/bmw/5_series_e34/525i_m20_sal/4_tightening_torques/33__rear_axle/41__wheel_bearings/1_azd__wheel_bearings/'},
};
const cvTorque = {title:'BMW 33 21 1AZ · CV screws by type',href:'https://workshop-manuals.com/bmw/3_series_e30/320i_m20_conver/4_tightening_torques/33__rear_axle/21__output_shafts/1_azd__output_shaft/'};

function service(series:Series,side:Side):AssemblyProcedure {
  const e30=series==='e30', s=side==='left'?-1:1, suffix=side==='left'?'1':'-1';
  const ref=references[series], manual=e30?factory30:bentley34;
  const corner='e30assembly:rear-'+side+':';
  const rear=series+'rear:'+side+'-';
  const hub=e30?corner+'hub':'e34sys:hub-rear-'+suffix;
  const arm=e30?corner+'trailing-arm':'e34sys:rear-trailing-arm-'+suffix;
  const wheel=e30?corner+'wheel':'wheel:rear-'+side;
  const axle=e30?corner+'halfshaft':'e34sys:halfshaft-'+suffix;
  const collar=e30?rear+'collar':'collar', lock=e30?rear+'lock':'lock';
  const coupling=e30?rear+'stub':rear+'hub-flange';
  const cv=cvHardware(side,e30?'inner':'outer').map(part=>series+'rear:'+part);
  const brakes=e30?[corner+'caliper',corner+'carrier']:['e34sys:brake-caliper-rear-'+suffix,'e34brake:rear-'+side+'-carrier'];
  const rotor=e30?[corner+'rotor',corner+'disc-screw']:['e34sys:brake-disc-rear-'+suffix,'e34brake:rear-'+side+'-disc-screw'];
  const abs=series+'rear-suspension:'+side+':abs';
  const exhaust='e30assembly:underbody:exhaust-pipes';
  const nutTool=e30?'30 mm thin-wall deep socket':'Thin-wall deep socket that fits the original M27 collar nut';
  const cvTool=e30?'E12 external Torx socket for the illustrated late screws':'8 mm hex bit for the illustrated socket-head screws';
  const bearingTool=e30?'BMW 33 4 040 puller kit with the late 325i/ABS adapters in 33-14':'BMW 33 4 031, 33 4 033 and 33 4 038, or equivalent 74 mm bearing puller';
  const installTool=e30?'BMW 33 4 040 puller kit and 33 4 049 adapter for the late 325i/ABS, or a 75 mm outer-race driver':
    'BMW 33 4 030, 33 4 036 and 33 4 037, or equivalent 74 mm outer-race driver';
  const axleLow=axleSwing(series,side,-21);
  const axleOut:Vec=[.12,-.26,s*.20];
  const axleDraw:Vec=[axleLow[0],axleLow[1],axleLow[2]-.102*s];
  const hubOff:Vec=[0,0,s*.19];
  const collarOff:Vec=[.06,.026,e30?s*.13:-s*.15];
  const lockOff:Vec=[.09,.076,e30?s*.11:-s*.15];
  const brakeAside:Vec=[-.05,.13,s*.13];
  const refitBrakeTorque='Torque the original rotor screw to 16 N·m and the caliper carrier fasteners to 67 N·m.';
  const nutTorque=e30?200:250;
  const steps:AssemblyStep[]=[
    {action:'Support the car and inspect the wheel end',focus:[hub,arm,'bearing'],
      description:'Chock the car and use a lift or rated stands at the approved support points. Check wheel play and roughness before disassembly. Read through the press and final collar-nut steps before lifting the car.',
      tools:'Wheel chocks, rated lift or stands, and bearing press kit',manual:manual.remove},
    ...(!e30?[{action:'Disconnect and support the outer CV joint',focus:[axle,coupling,...cv],access:cv,frame:[axle,coupling],
      move:[...move(cv,[.045,-.065,-s*.12]),...move([axle],[0,-.033,-s*.073])],
      description:'Remove the six wheel-side CV screws and keep the reinforcement plates in order. Hang the detached halfshaft from the body with the joint supported.',
      tools:cvTool+', extension and axle support strap',manual:manual.axle} satisfies AssemblyStep]:[]),
    ...(!e30?[{action:'Lift out the inboard lockplate and break the nut loose',focus:[lock,collar,coupling],frame:[collar,coupling],
      access:[lock],move:move([lock],lockOff),
      description:'Pry out the old lockplate inside the inboard CV flange. With the car lowered and secured against rolling, apply the parking brake to hold the hub while you loosen the nut. Leave it threaded on.',
      tools:'Small flat tool, '+nutTool+' and breaker bar',manual:manual.remove} satisfies AssemblyStep]:[]),
    {action:'Remove the road wheel',focus:[wheel,hub],access:[wheel],move:move([wheel],[0,.02,s*.36]),
      description:'Loosen the wheel bolts with the tire on the ground. Raise and securely support the car, then remove the wheel.',
      tools:'17 mm wheel-bolt socket',manual:manual.remove},
    ...(e30?[{action:'Release the collar nut',focus:[lock,collar,hub],access:[lock,collar],
      move:[...move([lock],lockOff),...move([collar],collarOff)],
      description:'Lift the old lockplate from the hub center. Counterhold the hub with the service brake or a suitable holding tool while undoing the collar nut.',
      tools:'Small flat tool, '+nutTool+' and breaker bar',manual:manual.axle},
    {action:'Unbolt the inner CV joint and support the shaft',focus:[axle,...cv],access:cv,
      move:[...move(cv,[.04,-.08,s*.08]),...move([axle],axleLow)],rotateX:[[axle,-21*s]],
      description:'Remove the six screws at the differential and support the inner CV just below its flange. Keep the joints and boots supported while the outer splines are still engaged.',
      tools:cvTool+' and a padded axle support',manual:manual.axle},
    {action:'Press the outer splines out of the hub',focus:[axle,coupling,hub],
      move:[...move([axle],axleDraw),...move([coupling],[0,0,-.102*s])],
      description:'Attach the push/pull bridge using wheel bolts. Press the splines inboard, working squarely and protecting the threads. Support the loose shaft as it clears the hub.',
      tools:'BMW 33 2 110 with 33 2 116 bridge, 33 2 117 adapters and axle support',manual:manual.axle},
    {action:'Set the halfshaft clear',focus:[axle,coupling],access:[axle],move:move([axle,coupling],axleOut),
      rotateX:[[axle,0]],description:'Withdraw the axle from below and leave it on a clean padded support.',
      tools:'Padded shaft support',manual:manual.axle}] satisfies AssemblyStep[]:[]),
    {action:'Hang up the caliper and remove the brake disc',focus:[...brakes,...rotor],frame:[...rotor,hub],access:[...brakes,...rotor],
      move:[...move(brakes,brakeAside),...move(rotor,[.034,-.053,s*.28])],
      description:'Unbolt the carrier and suspend the caliper and carrier from the body with the hydraulic hose connected. Remove the disc retaining screw. If the disc catches on the parking brake shoes, release the brake and back off the adjuster before pulling the disc clear.',
      tools:(e30?'17 mm':'16 mm')+' carrier socket, 5 mm hex bit, caliper hook and adjuster tool',manual:manual.brakes},
    {action:'Remove the ABS sensor from the arm',focus:[arm,abs],access:[abs],move:move([abs],[.064,.079,-s*.075]),
      description:'Unclip the lead where needed. Work the ABS sensor out of its bore by the body of the sensor. Protect its tip and wiring from the puller.',
      tools:'5 mm hex bit for the original M6 screw and connector clip tool',manual:manual.remove},
    ...(e30?[{action:'Clear the exhaust for the bearing tools',focus:[exhaust],access:[exhaust],frame:[arm,hub],
      move:move([exhaust],[0,-.12,-s*.12]),description:'With the exhaust cool, release the required supports and lower it onto a separate padded support to clear the bearing tool. Keep the exhaust from hanging by its other joints.',
      tools:'Exhaust support, hanger pliers and the socket for the fitted clamp',manual:manual.remove} satisfies AssemblyStep]:[]),
    ...(!e30?[{action:'Remove the collar nut and pull the inboard CV flange',focus:[collar,coupling,hub],frame:[collar,coupling],
      access:[collar,coupling],move:[...move([collar],collarOff),...move([coupling],[0,0,-s*.104])],
      description:'Remove the loosened collar nut and pull the inboard flange squarely off the splines. Use a flange puller if it is tight. Keep the threaded end of the stub axle protected.',
      tools:nutTool+' and a flange puller',manual:manual.remove} satisfies AssemblyStep]:[]),
    ...(!e30?[{action:'Remove the bearing retaining ring',focus:['circlip','bearing',arm],access:['circlip'],frame:['bearing',hub],
      move:move(['circlip'],[.02,.037,s*.12]),
      description:'Clean the groove and compress the retaining ring with internal circlip pliers. Take it fully out of the trailing arm before pulling the bearing.',
      tools:'Heavy-duty internal circlip pliers',manual:manual.remove} satisfies AssemblyStep]:[]),
    {action:'Draw the wheel hub out of the bearing',focus:[hub,'bearing',arm],frame:[hub,'bearing'],access:[hub],move:move([hub],hubOff),
      description:'Pull the hub outward from the wheel side, keeping the puller aligned. If an old inner race stays on the hub, remove it with a bearing separator. Inspect the journal and replace the hub if it is scored or loose in the new bearing.',
      tools:e30?'BMW 33 4 010 hub extraction tool and bearing separator for a retained race':'Hub/stub-axle puller and bearing separator for a retained race',manual:manual.remove},
    ...(e30?[{action:'Remove the bearing retaining ring',focus:['circlip','bearing',arm],access:['circlip'],frame:['bearing',arm],
      move:move(['circlip'],[.02,.04,s*.12]),description:'Clean the groove and compress the retaining ring with internal circlip pliers. Lift it clear of the bearing bore.',
      tools:'Heavy-duty internal circlip pliers',manual:manual.remove} satisfies AssemblyStep]:[]),
    {action:'Pull the old bearing out of the arm',focus:['bearing',arm],frame:['bearing',arm],
      move:move(['bearing'],[0,0,s*.112]),
      description:'Set the receiver squarely against the arm and draw the entire bearing into it. Clean and inspect the bore, its inner shoulder, and the retaining groove.',
      tools:bearingTool,manual:manual.remove},
    {action:'Press the new bearing into the shoulder',focus:['bearing',arm],frame:['bearing',arm],move:move(['bearing']),
      description:'Start the new sealed bearing square to the bore. Apply force only to its outer race and pull it in until it seats against the shoulder. Keep the new seals clean and intact.',
      tools:installTool,manual:manual.install},
    {action:'Seat the new circlip',focus:['bearing','circlip',arm],frame:['bearing',arm],move:move(['circlip']),
      description:'Install a new retaining ring. Check that both ends are in the same groove and the full circumference is seated.',
      tools:'Heavy-duty internal circlip pliers and inspection light',manual:manual.install},
    {action:'Draw in the hub with the inner race supported',focus:[hub,'bearing'],frame:[hub,'bearing'],move:move([hub]),
      description:'Hold the inboard inner race with the pull-in tool. Draw the hub in until its shoulder meets the race. Supporting the inner race keeps press force off the new bearing balls.',
      tools:e30?'BMW 33 4 040 with 33 4 048 hub installer, or an equivalent inner-race support':'BMW 33 4 080 and 33 4 020, or an equivalent inner-race support',
      manual:manual.install},
    {action:e30?'Refit the halfshaft and start the new collar nut':'Refit the inboard flange and start the new collar nut',
      focus:[hub,coupling,collar],frame:[hub,coupling],
      move:[...move([coupling,collar]),...(e30?move([axle],axleLow):[])],rotateX:e30?[[axle,-21*s]]:undefined,
      description:(e30?'Draw the stub fully into the clean hub splines.':'Fit the inboard flange to the clean stub splines.')+
        ' Lightly oil the collar nut’s bearing face as directed. Seat the nut firmly before putting weight on the bearing. Save final torque for the specified loaded position.',
      tools:e30?'BMW 33 2 110 with the 33 2 114 pull-in spindle and '+nutTool:'Flange installation tool and '+nutTool,
      manual:manual.install},
    ...(e30?[{action:'Seat and torque the inner CV joint',focus:[axle,...cv],move:move([axle,...cv]),rotateX:[[axle,0]],
      description:'Raise the supported shaft to its pilot and refit the reinforcement plates. The later BMW table specifies 60 N·m for the new plain black M10 × 50 class 10.9 E12 screws shown. Check the table for any different hardware.',
      tools:cvTool+' and torque wrench',manual:cvTorque} satisfies AssemblyStep]:[]),
    {action:'Refit the ABS sensor, brake disc and caliper',focus:[...rotor,...brakes,abs],frame:[rotor[0],hub],move:move([...rotor,...brakes,abs]),
      description:'Reinstall the sensor and clip its lead clear of the axle. Clean the rotor pilot and restore the brake assembly. '+refitBrakeTorque+' Pump the brake pedal to seat the pads and check the hose routing.',
      tools:'5 mm hex bit, '+(e30?'17 mm':'16 mm')+' carrier socket and torque wrench',manual:manual.brakes},
    {action:'Refit the wheel',focus:[wheel,hub],move:move([wheel]),
      description:'Clean the mating faces and start the wheel bolts by hand. Tighten the stock wheel bolts in a cross pattern to '+(e30?'110 N·m.':'100 ± 10 N·m.'),
      tools:'17 mm socket and torque wrench',manual:manual.install},
    {action:'Torque the collar nut and fit its new lockplate',focus:[collar,lock,hub],frame:[collar,hub],move:move([lock]),
      description:'Lower and secure the car. Apply the brake to hold the axle and torque the '+(e30?'M22':'M27')+' collar nut to '+nutTorque+
        ' N·m. Seat a new lockplate all the way around. Raise the car safely again if access is needed.',
      tools:nutTool+', torque wrench rated for '+nutTorque+' N·m, and '+(e30?'BMW 33 4 050 lockplate driver and 00 5 000 handle':'a driver that bears evenly on the lockplate'),
      manual:manual.collar},
    ...(e30?[{action:'Refit the exhaust supports',focus:[exhaust,arm],frame:[arm,hub],move:move([exhaust]),
      description:'Secure the exhaust in its original supports, with clearance to the rear axle and the body.',
      tools:'Padded exhaust support and tools for the fitted fasteners',manual:manual.install}] satisfies AssemblyStep[]:
      [{action:'Reconnect and torque the outer CV joint',focus:[axle,coupling,...cv],frame:[axle,coupling],move:move([axle,...cv]),
        description:'Seat the outer CV joint on the inboard flange without twisting the boot. Refit the reinforcement plates. The later BMW table specifies 60 N·m for the new plain black M10 × 50 class 10.9 socket-head screws shown. Match other hardware to its listed value.',
        tools:cvTool+' and torque wrench',manual:cvTorque}] satisfies AssemblyStep[]),
  ];
  return {
    modelId:ref.modelId, id:`${series}-${side}-rear-wheel-bearing`,minimumRevision:ref.revision,side,
    topic:e30?'e30-rear-wheel-bearing':'330-job-rear-wheel-bearing-replacement',
    relatedTopics:e30?['e30-rear-axle-layout']:[],
    title:'Rear wheel bearing replacement',scope:'system:rear-suspension',relatedScopes:['system:rear-brakes','system:differential'],
    prefix:series+'wheel-bearing:'+side+':',entryView:[-.61,.54,s*1.34],clearanceAxis:'z',
    parts:[hub,arm,'bearing','circlip'],catalogParts:[hub,'bearing','circlip',collar,lock],steps,
    before: (e30?'1991 E30 325i Coupe with rear ABS and the splined halfshaft in the hub.':'1995 E34 525i Sedan with the separate inboard CV flange and M27 collar nut.')+
      ' Confirm the bearing and final-drive hardware before opening the assembly.',
    supplies:[`Bearing ${ref.part} · ${ref.bore} × ${ref.diameter} × ${ref.width} mm.`,
      'New circlip 33411138648, collar nut '+ref.collar+' and lockplate '+ref.lock+'.','New CV screws of the correct style and grade.'],
    manuals:[manual.remove,manual.install,manual.axle,manual.brakes,manual.collar,cvTorque,...(e30?[factory30.illustration]:[])],
    completed:'Check the wheel for free rotation and play, confirm a firm pedal, and verify that the ABS warning goes out. Listen for noise on a short road check.',
  };
}

export const rearWheelBearingServices = {
  'e30-left-rear-wheel-bearing':service('e30','left'),
  'e30-right-rear-wheel-bearing':service('e30','right'),
  'e34-left-rear-wheel-bearing':service('e34','left'),
  'e34-right-rear-wheel-bearing':service('e34','right'),
} satisfies Record<RearWheelBearingServiceId,AssemblyProcedure>;
