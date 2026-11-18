import references from '../../../data/digital-twin/air-cleaner-references.json';
import type { AssemblyProcedure, AssemblyStep, ManualLink } from './assembly-service';
import type { Vec } from './model';

type Series = keyof typeof references;
export type AirCleanerServiceId = `${Series}-air-cleaner`;
const shift = (parts:string[], offset:Vec = [0,0,0]):[string,Vec][]=>parts.map(part=>[part,offset]);

function airCleanerService(series:Series):AssemblyProcedure {
  const e30 = series==='e30', fit = references[series];
  const prefix = e30?'e30assembly:engine-bay:':'e34sys:';
  const lid = prefix+'airbox-lid', housing = prefix+'airbox';
  const filter = prefix+(e30?'air-filter':'air-filter-element');
  const meter = prefix+(e30?'airflow-meter':'intake-boot-maf');
  const duct = e30?prefix+'intake-boot':'m50:intake-boot';
  const snorkel = prefix+(e30?'airbox-snorkel':'fresh-air-snorkel');
  const hood = series+'body:hood';
  const clips = Array.from({length:fit.clips},(_,i)=>prefix+'airbox-clip-'+(i+1));
  const manual:ManualLink = e30
    ? {title:'BMW 13-39 · Air cleaner access',href:'/e30/manual/13?pdf=272'}
    : {title:'Bentley 020-10 · Air cleaner clips',href:'/manual/020?pdf=32#job-air-filter-replacement'};
  const refit:ManualLink = e30
    ? {title:'BMW 13-40 · Filter element and refit',href:'/e30/manual/13?pdf=273'}
    : {title:'Bentley 020-11 · Filter installation',href:'/manual/020?pdf=33'};
  const frame = [housing,lid,filter,meter];
  const lift:Vec = [-.025,.097,.014];
  const filterAside:Vec = e30?[.10,.067,-.185]:[-.015,.067,-.245];
  const steps:AssemblyStep[] = [
    {action:'Open the hood',access:[hood],focus:[housing],frame,panels:[[hood,true]],
      description:'Switch the engine off and open the hood. Find the air cleaner at the left front of the engine bay. Wipe loose dirt off the lid before opening it.',
      tools:'Flashlight and lint-free cloth',manual},
    ...(e30?[{action:'Move the intake funnel forward',access:[snorkel],focus:[snorkel],frame,
      move:shift([snorkel],[.063,0,0]),rotateX:[[snorkel,90]],
      description:'On the stock funnel shown, turn it a quarter turn and slide it forward to give the lid clearance. Support the funnel so it does not catch on the front panel.',
      manual} satisfies AssemblyStep]:[]),
    {action:'Release the spring clips',access:clips,focus:clips,frame,
      rotateX:clips.map((id,i)=>[id,i<(e30?2:3)?53:-53]),
      description:'Release each spring clip by hand and swing it clear. Check the hinges and hooks for damage. The clips remain attached to the lower case.',manual},
    {action:'Lift the lid and meter',access:[lid],focus:[lid,meter,duct],frame,move:shift([lid,meter],lift),
      description:'Support the lid and lift only far enough to clear the filter. Leave the meter connected if its lead and intake boot have slack. If the boot binds, release it at the meter instead of stretching it.',manual},
    {action:'Lift out the old filter',focus:[filter,housing],frame,move:shift([filter],filterAside),
      description:'Note how the sealing rim sits in the case. Lift the old filter clear and wipe loose dirt from the dirty side. Keep debris away from the outlet.',
      tools:'Lint-free cloth',manual:refit},
    {action:'Seat the new filter',focus:[filter,housing],frame,move:shift([filter]),
      description:'Seat the new filter in the same orientation. Feel around the rim and check that the seal lies flat with each corner in the channel.',manual:refit},
    {action:'Lower the lid and secure the clips',focus:[lid,...clips],frame,move:shift([lid,meter]),
      rotateX:clips.map(id=>[id,0]),
      description:'Lower the lid squarely against the seal and snap each clip shut by hand. Reseat the outlet boot and reconnect the meter if either was released.',manual:refit},
    {action:e30?'Refit the funnel and close the hood':'Check the housing and close the hood',focus:[housing,lid],frame,
      ...(e30?{move:shift([snorkel]),rotateX:[[snorkel,0] as [string,number]]}:{}),panels:[[hood,false]],
      description:(e30?'Slide the funnel back and turn it to its locked position. ':'')+
        'Check that the lid sits flush, the boots and connector are secure, and the engine bay is clear of tools. Close the hood.',manual:refit},
  ];
  return {
    id:series+'-air-cleaner' as AirCleanerServiceId, modelId:fit.model, minimumRevision:fit.revision,
    topic:e30?'e30-air-filter':'020-job-air-filter-replacement',
    title:'Engine air filter replacement', scope:'system:engine-bay', relatedScopes:['system:intake'],
    prefix, entryView:[.35,1.18,-1.1], clearanceAxis:'y', verticalRemoval:'up', steps,
    parts:[housing,snorkel,duct],catalogParts:[housing,lid,filter,...clips,...(e30?[snorkel]:[])],
    manuals:[manual,refit],
    before:e30?'1991 325i Coupe, M20 with the factory four-clip air cleaner.':'1995 525i automatic sedan, M50TU with the factory five-clip air cleaner.',
    supplies:[`Air filter ${fit.filter} · ${fit.length} × ${fit.width} × ${fit.height} mm.`,
      `Spring clip ${fit.clip} if the old clip is damaged. The filter and clips are fitted by hand.`],
    completed:'Filter seated, clips latched and intake connections checked.',
  };
}

export const airCleanerServices = {
  'e30-air-cleaner':airCleanerService('e30'),
  'e34-air-cleaner':airCleanerService('e34'),
} satisfies Record<AirCleanerServiceId,AssemblyProcedure>;
