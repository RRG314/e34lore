"use client";
import { RepairBudget } from "./RepairBudget";
import { useApp } from '../components/context';
import { useOwnedCars } from '../vehicle/use-owned-cars';
import type { Vehicle } from '../data/catalog';
import { DocumentLink } from '../components/DocumentLink';
import { journeyHref, type Journey } from '../domain/repair-journey';
import { componentGuideHref, type ComponentContext } from './context';
import { stepDiscussionHref } from '../domain/walkthrough';
import type { Series } from '../series/registry';
import { previewFeatures } from '../release/features';
import { serviceGuide,serviceApplicability,servicingNotes,prerequisites, type ToolCategory } from './service';
const categoryLabels:Record<ToolCategory,string>={essential:'Essential tools',special:'Special tools',measuring:'Measuring equipment',safety:'Safety equipment',consumable:'Parts & consumables',optional:'Optional tools',reference:'References & records'};
export function ServiceOverview({guideId,revision,navigation,compact=false,vehicleOverride,component,series}:{guideId:string;revision?:string;navigation?:Journey;compact?:boolean;vehicleOverride?:Vehicle;component?:Partial<ComponentContext>;series?:Series}){
 const {vehicle:referenceVehicle}=useApp(),owned=useOwnedCars(),vehicle=vehicleOverride||owned.selected?.configuration||referenceVehicle,service=serviceGuide(guideId,revision);
 if(!service)return <p className="small muted">Structured servicing is not indexed for this guide revision. Read its original instructions and source references.</p>;
 const {guide,tools,operations}=service,applicability=serviceApplicability(guide,vehicle),notes=servicingNotes(guideId),href=(path:string)=>journeyHref(path,navigation||{});
 const guideHref = (step?: number) => componentGuideHref(guideId, component, navigation, {revision: service.revision, step});
 return <details className={'service-overview'+(compact?' compact':'')}><summary>Tools, access & inspection</summary><div className="service-overview-body">
  <p className={'service-applicability '+applicability.status}>{applicability.message}</p>
  <p className="small muted">{guide.applicability}</p><p className="small muted">{guide.sourceChecked?'Source-based service reference · technical review pending':'Source checking incomplete'} · {guide.source.section}. The model illustrates the procedure; its movement does not prove physical clearance.</p>
  <details><summary>Full job tool list ({tools.length})</summary><p className="small muted">Check sizes against the fitted hardware before starting.</p>
  {(Object.keys(categoryLabels)as ToolCategory[]).filter(category=>tools.some(t=>t.category===category)).map(category=><section key={category}><h4>{categoryLabels[category]}</h4><ul>{tools.filter(t=>t.category===category).map(tool=><li key={tool.id}><strong>{tool.name}</strong>{tool.specification&&<p>{tool.specification}</p>}<small>Source: {tool.source}</small>{tool.stepNumbers?.length ? <p>Used in {tool.stepNumbers.map((number,index)=><span key={number}>{index>0?' · ':''}<DocumentLink series={series} href={guideHref(number)}>Step {number}</DocumentLink></span>)}</p>:null}{tool.operations.length>0&&<details><summary>Used in {tool.operations.length} operation{tool.operations.length===1?'':'s'}</summary><ul>{tool.operations.map(id=><li key={id}><DocumentLink series={series} href={guideHref(operations.find(o=>o.id===id)!.step+1)}>{operations.find(o=>o.id===id)!.title}</DocumentLink></li>)}</ul></details>}</li>)}</ul></section>)}
  </details>
  {notes&&<><details><summary>Access before removing the pump</summary><p className="small muted">Procedural dependencies from the existing source-backed sequence, rather than a collision-verified removal path.</p><ol>{prerequisites(notes.prerequisiteOperation).map(operation=><li key={operation.id}><strong>{operation.title}</strong><p>{operation.instruction}</p><small>Source: {operation.source}</small>{previewFeatures.interactiveRepairs&&<DocumentLink series={series} href={href('/workshop/repair?operation='+operation.id)}>Show in the interactive repair ↗</DocumentLink>}</li>)}</ol></details>
  <details><summary>Inspection & return-to-service checks</summary>{notes.inspection.map(operation=><article key={operation.id}><h4>{operation.title}</h4><p>{operation.instruction}</p><small>Source: {operation.source}</small><DocumentLink href={stepDiscussionHref(guideId,operation.step+1,guide.system)}>Ask about this exact step ↗</DocumentLink></article>)}<p className="small muted">Numerical pump wear limits are not indexed here; visual appearance alone does not establish mechanical condition.</p></details>
  <details><summary>Required parts & related inspections</summary>{notes.replacements.map(item=><article key={item.category}><h4>{item.category}</h4><p>{item.text}</p><small>Source: {item.source}</small></article>)}{notes.opportunities.map(item=><article key={item.guide}><h4>{item.category}</h4><p>{item.reason}</p><DocumentLink series={series} href={href('/guides/'+item.guide)}>Read the linked inspection ↗</DocumentLink></article>)}<p className="small muted">{notes.optional}</p></details></>}
  <RepairBudget key={guideId+service.revision} guideId={guideId} revision={service.revision} title={guide.title} tools={tools}/>
  <p><DocumentLink series={series} href={guideHref()}>Read the full walkthrough ↗</DocumentLink></p>
  <p><DocumentLink series={series} href={href('/garage?tab=journal&journal_guide='+encodeURIComponent(guideId))}>Record inspection observations in my journal ↗</DocumentLink></p>
  <p className="small muted">{guide.duration} · {guide.durationBasis}. This is not an established labor time for completing the repair.</p>
 </div></details>;
}
