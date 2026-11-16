"use client";
import {DocumentLink} from '../../components/DocumentLink';
import {useApp} from '../../components/context';
import {seriesHref, type Series} from '../../series/registry';
import {e30Guides} from '../../series/e30-repairs';
import {useEffect,useState} from "react";
import {loadReference} from "./load-reference";
import {componentGuideHref, componentWorkshopHref, requestedComponent, type ComponentContext} from "../../servicing/context";
import { ServiceOverview } from "../../servicing/ServiceOverview";
import { previewFeatures } from "../../release/features";
import { partGuideIds } from '../../data/guide-parts';
import { ArrowUpRight } from 'lucide-react';
import { componentCatalog, catalogProcedures, type ManualLink, type CatalogIndex } from './catalog';
import { useOwnedCars } from '../../vehicle/use-owned-cars';
import { journeyHref, requestedJourney, type Journey } from '../../domain/repair-journey';
import {RepairSpecCard} from '../../servicing/RepairSpecCard';
import {specsForPart,supplementalServiceLinks} from '../../servicing/repair-specs';
import type {Vehicle} from '../../data/catalog';
function useNavigation(override?: Journey) { const owned = useOwnedCars(); return override || { vehicle: owned.activeId, scan: typeof location === 'undefined' ? undefined : requestedJourney(location.search).scan }; }
const e30GuidesByNumber: Partial<Record<string, string>> = {
  '63211385381': 'e30-rear-lamp-bulb',
  '63211385382': 'e30-rear-lamp-bulb',
};
export function ServiceLinks({ guideIds, manual, navigation,vehicleOverride,seriesOverride,component }: {
    guideIds: string[];
    manual: ManualLink[];
    navigation?: Journey;
    vehicleOverride?:Vehicle;
    seriesOverride?:Series;
    component?:Partial<ComponentContext>;
}) {
    const app = useApp(), series = seriesOverride || app.series;
    const guideById = series === 'e30' ? Object.fromEntries(e30Guides.map(guide => [guide.slug,guide])) : componentCatalog.guides;
    const guides = [...new Set(guideIds)].filter(id => guideById[id]), context = useNavigation(navigation), href = (path: string) => seriesHref(journeyHref(path, context), series);
    return <section className="component-service"><h3>Service information</h3>{guides.map(id => <div key={id}><DocumentLink className="reference-related-guide" series={series} href={componentGuideHref(id,component,context)}><span>{guideById[id].title}<small>{guideById[id].kind} walkthrough · source-based guide</small></span><ArrowUpRight size={14}/></DocumentLink><ServiceOverview series={series} guideId={id} navigation={context} vehicleOverride={vehicleOverride} component={component} compact/>{previewFeatures.interactiveRepairs && id === 'm50-water-pump-job-planning' && <a className="button outline" href={href('/workshop/repair')}>Open interactive M50 repair <ArrowUpRight size={14}/></a>}</div>)}{manual.map(m => {
      const external = m.href.startsWith('https://');
      return <a className="reference-related-guide" key={m.href} href={external?m.href:href(m.href)} target={external?'_blank':undefined} rel={external?'noopener noreferrer':undefined}><span>{m.title}<small>{m.kind==='wiring'?'Wiring diagram':'Manual procedure reference'} · {m.printed} · PDF page {m.pdf}</small></span><ArrowUpRight size={14}/></a>;
    })}</section>;
}
export function CatalogProcedureLinks({ partId, positionId, assemblyId, catalogContextId, partNumber, navigation, referenceId,modelRevision,vehicleOverride,seriesOverride }: {
    partId: string; positionId?: string; assemblyId?: string; catalogContextId?: string; partNumber?: string; navigation?: Journey; referenceId?:string;modelRevision?:number;vehicleOverride?:Vehicle;seriesOverride?:Series;
}) {
 const app=useApp(), series=seriesOverride||app.series;
 const context=useNavigation(navigation);
 const [reference,setReference]=useState<{key:string;id?:string;revision?:string;nodeId?:string;initialized:boolean}>({key:'',initialized:false});
 const [loaded,setLoaded]=useState<{key:string;catalog:CatalogIndex|null;nodes:ReadonlySet<string>;error:boolean}|null>(null),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const requested = requestedComponent(Object.fromEntries(new URLSearchParams(location.search)));
  const id = referenceId || requested.referenceId;
  const selectedRevision = modelRevision ?? requested.modelRevision;
  const revision = selectedRevision ? String(selectedRevision) : undefined;
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Read explicit URL context after hydration; server output remains the established default reference.
  setReference({key:[id||'',revision||''].join(':'),id,revision,nodeId:requested.nodeId,initialized:true});
 },[referenceId,modelRevision]);
 useEffect(()=>{if(!reference.id&&!reference.revision)return;let active=true;const controller=new AbortController();
  loadReference(controller.signal,reference.revision,reference.id).then(model=>{if(active)setLoaded({key:reference.key,catalog:model.catalog||null,nodes:new Set(model.nodes.map(node=>node.id)),error:false});}).catch(()=>{if(active&&!controller.signal.aborted)setLoaded({key:reference.key,catalog:null,nodes:new Set(),error:true});});
  return()=>{active=false;controller.abort();};
 },[reference, retry]);
 const hasReference=!!(reference.id||reference.revision),current=loaded?.key===reference.key?loaded:null;
 if(!reference.initialized)return null;
 if(hasReference&&!current)return <p className="small muted" role="status">Loading this component’s service links…</p>;

 const index=hasReference ? current?.catalog : series==='e34' ? componentCatalog : null;
 const links = index ? catalogProcedures(partId,positionId,assemblyId,partNumber,index) : { nodes:[], manual:[], guides:[] };
 const number = partNumber || partId;
 const specs = specsForPart(series,number);
 const sharedGuide = e30GuidesByNumber[number.replace(/^bmw-/, '')];
 const related = series === 'e34' ? partGuideIds[partId] || [] : sharedGuide ? [sharedGuide] : [];
 const {guideIds,manual}=supplementalServiceLinks(specs,[...links.guides,...related],links.manual);
 if (!index && !guideIds.length && !specs.length && !current?.error) return <DocumentLink className="reference-related-guide" series={series} href="/repairs">{series.toUpperCase()} repair walkthroughs <ArrowUpRight size={14}/></DocumentLink>;
 // Superseded catalog numbers may share a modeled component without
 // having their own position in this revision's mesh bindings.
 const explicitNode=reference.nodeId;
 const serviceNode=explicitNode && current?.nodes.has(explicitNode) && specs.some(job=>job.nodes?.test(explicitNode)) ? explicitNode : undefined;
 const nodeId = links.nodes.find(id => id === explicitNode) || serviceNode || links.nodes[0];
 const component = {
  partId, positionId, assemblyId, catalogContextId, nodeId,
  referenceId: reference.id,
  modelRevision: reference.revision ? Number(reference.revision) : undefined,
 };
 return <>
  {current?.error && <p role="status">The selected model’s links could not load. <button type="button" className="text-link" onClick={()=>setRetry(n=>n+1)}>Retry model links</button></p>}
  {specs.map(job=><RepairSpecCard key={job.id} job={job} compact entry="catalog" component={component} navigation={context}/>)}
  {(guideIds.length>0||manual.length>0)&&<ServiceLinks guideIds={guideIds} manual={manual.slice(0,4)} navigation={context} vehicleOverride={vehicleOverride} seriesOverride={series} component={component}/>} {nodeId&&!specs.length&&<DocumentLink className="button outline full" series={series} href={componentWorkshopHref(component,context)}>View related model reference <ArrowUpRight size={15}/></DocumentLink>}</>;
}
