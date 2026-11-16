import { manualGuides, type ManualGuide } from '../data/manual';
import { guideRevision } from '../domain/walkthrough';
import { repairPlan, type RepairOperation } from '../repair/plan';
import { e30Guides } from '../series/e30-repairs';
import type { Vehicle } from '../data/catalog';
export type ToolCategory='essential'|'special'|'measuring'|'safety'|'consumable'|'optional'|'reference';
export type ToolRequirement={id:string;name:string;category:ToolCategory;operations:string[];stepNumbers?:number[];source:string;specification:string|null};
const aliases:Record<string,[string,string,ToolCategory,string|null]>={
 'Fan wrench':['fan-wrench','Fan wrench','special',null],
 'Pulley holder':['pulley-holder','Pulley holder','special',null],
 'Matched fan holding tools':['fan-wrench','Fan wrench and matching holding method','special',null],
 'Appropriate hose tools':['hose-tools','Hose tools','essential',null],
 'Hose tools':['hose-tools','Hose tools','essential',null],
 'Matching sockets':['sockets','Sockets for the installed hardware','essential',null],
 'Matching socket':['sockets','Sockets for the installed hardware','essential',null],
 'Two matching M6 extraction bolts':['m6-extraction','Two matching M6 extraction bolts','special','M6; verify thread engagement and bolt length against the installed pump'],
 'Low-range torque wrench':['torque-wrench','Low-range torque wrench','measuring',null],
 'Matched tensioner tool':['tensioner-tool','Tool for the installed belt tensioner','special',null],
 'Inspection light':['inspection-light','Inspection light','essential',null],
 'Matching source procedure':['matched-procedure','Matching source procedure','reference',null],
 'Matched fill/bleed procedure':['fill-procedure','Installed cooling-system fill and bleed procedure','reference',null],
 'Coolant containment':['coolant-containment','Coolant containment','safety',null],
 'Battery isolation tools':['battery-tools','Tools for the installed battery connections','essential',null],
 'Correct new pump and seal':['pump-and-seal','Matched replacement pump and new seal','consumable',null],
 'Correct coolant':['coolant','Correct coolant for the installed cooling system','consumable',null],
 'Suitable cleaning materials':['cleaning','Sealing-surface cleaning materials','consumable',null],
 'Recorded observations':['observations','Work record','reference',null],
};
function category(name:string):ToolCategory{
 if(/protection|gloves|stand|containment|recovery pan/i.test(name))return 'safety';
 if(/gauge|meter|torque|measur/i.test(name))return 'measuring';
 if(/BMW \d|holder|fixture|pin\b|fan wrench|extract/i.test(name))return 'special';
 if(/new |coolant|lubricant|clean|cloth|sealant/i.test(name))return 'consumable';
 if(/procedure|manual|record|camera|notebook/i.test(name))return 'reference';return 'essential';
}
export function toolList(guide:ManualGuide):ToolRequirement[]{
 const operations=guide.slug===repairPlan.guide?repairPlan.operations:[];
 if(guide.jobSupport){const names=[...new Set([...guide.tools,...guide.jobSupport.steps.flatMap(step=>step.tools)])];return names.map((name,index)=>{const steps=guide.jobSupport!.steps.filter(step=>step.tools.includes(name));return{id:guide.slug+'-tool-'+index,name,category:category(name),operations:[],stepNumbers:steps.map(step=>step.number),source:[...new Set(steps.map(step=>step.source.printed))].join(', ')||guide.source.section,specification:null};});}
 if(!operations.length)return guide.tools.map((name,index)=>({id:guide.slug+'-tool-'+index,name,category:category(name),operations:[],source:guide.source.section,specification:null}));
 const consolidated=new Map<string,ToolRequirement>();
 for(const operation of operations)for(const name of operation.tools){
  const row=aliases[name]||[name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name,category(name),null] as const;
  const prior=consolidated.get(row[0]);if(prior){prior.operations.push(operation.id);continue;}
  consolidated.set(row[0],{id:row[0],name:row[1],category:row[2],specification:row[3],operations:[operation.id],source:operation.source});
 }
 return [...consolidated.values()];
}
/** Dependencies retain the order and source statements of the existing DAG. */
export function prerequisites(operationId:string,operations:readonly RepairOperation[]=repairPlan.operations):RepairOperation[]{
 const index=new Map(operations.map(operation=>[operation.id,operation])),included=new Set<string>(),visiting=new Set<string>();
 function visit(id:string){const op=index.get(id);if(!op)throw Error('Unknown operation');if(visiting.has(id))throw Error('Dependency cycle');if(included.has(id))return;visiting.add(id);for(const dep of op.requires){visit(dep);included.add(dep);}visiting.delete(id);}
 visit(operationId);return operations.filter(op=>included.has(op.id));
}
export function serviceGuide(slug:string,revision?:string){
 const guide=(slug.startsWith('e30-') ? e30Guides : manualGuides).find(g=>g.slug===slug);
 const current=guideRevision(slug);
 if(!guide||!current||(revision&&revision!==current.revision))return null;
 return {guide,revision:current.revision,tools:toolList(guide),operations:slug===repairPlan.guide?repairPlan.operations:[]};
}
export function serviceApplicability(guide:ManualGuide,vehicle:Vehicle):{status:'conditional'|'incompatible'|'unknown';message:string}{
 if(vehicle.engine&&!guide.engines.includes(vehicle.engine))return{status:'incompatible',message:'This procedure does not cover the selected engine.'};
 if(vehicle.market&&vehicle.market!=='USA')return{status:'unknown',message:'Confirm that this reference covers the selected market.'};
 if(!vehicle.engine||!vehicle.year||!vehicle.model)return{status:'unknown',message:'Select the engine, model and year, then confirm the installed hardware against the procedure.'};
 if(guide.slug===repairPlan.guide&&(vehicle.model!=='525i'||!/^199[1-5]$/.test(vehicle.year)))return{status:'incompatible',message:'This pump sequence covers the U.S. 1991–95 525i M50/M50TU installation.'};
 return{status:'conditional',message:'Engine family matches; production, equipment and modified hardware still need the procedure’s checks.'};
}
export function servicingNotes(slug:string){
 if(slug!==repairPlan.guide)return null;
 return {
  prerequisiteOperation:'pump',
  inspection:repairPlan.operations.filter(o=>o.id==='inspect'||o.id==='final-check'),
  replacements:[{category:'Required for this replacement',text:'A matched pump and new seal; correct coolant and specified assembly lubricant.',source:'170-8–170-9; 170-12'}],
  opportunities:[{category:'Inspect while accessible',guide:'accessory-drive-belt-inspection',reason:'The accessory belt is removed during the existing pump access sequence; inspect it using its own engine-specific guidance.'},{category:'Related diagnostic checks',guide:'cooling-system-visual-check',reason:'A temperature complaint alone does not prove pump failure. Record cold-system leaks, hoses, belt and radiator condition before choosing a repair.'}],
  optional:'No additional preventive replacement recommendation has been verified for this workflow.',
 };
}
