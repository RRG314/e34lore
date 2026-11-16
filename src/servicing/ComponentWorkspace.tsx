/* eslint-disable @next/next/no-img-element -- OEM drawings retain their original source pixels rather than an image proxy. */
'use client';
import {PartMedia} from '../components/PartMedia';
import {PartComparison} from '../components/PartComparison';
import {BearingInspection} from '../repair/BearingInspection';
import {BearingServiceReference} from '../repair/BearingServiceReference';
import {seriesForModel} from '../series/registry';
import {isCenterSupportServicePart} from '../servicing/part-location';
import {lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {db,useApp} from '../components/context';
import {DocumentLink} from '../components/DocumentLink';
import {Diagram} from '../components/Diagram';
import {WhereToBuy} from '../components/Commercial';
import {PartCompatibility} from '../components/PartCompatibility';
import {CatalogProcedureLinks} from '../digital-twin/public/CatalogProcedures';
import {referenceRelease,referencesForSeries} from '../digital-twin/public/load-reference';
import {resolveVehicleReference,referenceCandidates} from '../vehicle/reference-context';
import {sourceDrawingAdapter,preferredCatalogContext,orderingNotes,formatCatalogCondition,type CatalogPosition,type SourceDrawing,type CatalogAssembly} from '../domain/catalog';
import {catalogOrderingRows,catalogPositionAllowed} from '../lib/catalog-integrity';
import {useVehicleCatalog} from '../lib/use-vehicle-catalog';
import {fetchAllRows} from '../lib/data-export';
import {componentHref} from '../servicing/context';
import type {Vehicle} from '../data/catalog';
import type {Journey} from '../domain/repair-journey';
import type {ComponentPartIdentity} from './context';
const Car=lazy(()=>import('../digital-twin/public/ReferenceWorkshop').then(m=>({default:m.ReferenceWorkshop})));
type SourceChoice={position:CatalogPosition;assembly:CatalogAssembly};
export function ComponentWorkspace({anchor,selected,vehicle,navigation,onSelect,context,onContextChange}:{anchor:ComponentPartIdentity;selected:ComponentPartIdentity;vehicle:Vehicle;navigation:Journey;onSelect:(part:ComponentPartIdentity)=>void;context:{referenceId:string;sourcePositionId:string;sourceContextId?:string;sourceAssemblyId?:string;modelRevision?:number|null};onContextChange:(value:Partial<{referenceId:string;sourcePositionId:string;sourceContextId:string;sourceAssemblyId:string;modelRevision:number|null}>)=>void}){
 const { series }=useApp(), vehicleReferences=referencesForSeries(series);
 const inventory=useVehicleCatalog(),vehicleKey=JSON.stringify(vehicle);
 const sourceVehicle=useMemo(()=>JSON.parse(vehicleKey) as Vehicle,[vehicleKey]);
 const [choices,setChoices]=useState<SourceChoice[]>([]),[loaded,setLoaded]=useState<{key:string;positions:CatalogPosition[];drawings:SourceDrawing[]}|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 const [drawingId,setDrawingId]=useState(''),[imageFailed,setImageFailed]=useState(false);
 const bootstrap=useRef(''),contextCallback=useRef(onContextChange);
 useEffect(()=>{contextCallback.current=onContextChange},[onContextChange]);
 const choice=context.sourcePositionId,explicitReference=context.referenceId;
 const setChoice=(sourcePositionId:string)=>{const selected=choices.find(choice=>choice.position.id===sourcePositionId);contextCallback.current({sourcePositionId,...(selected?{sourceContextId:selected.position.context_id,sourceAssemblyId:selected.position.assembly_id}:{})});};
 const setReference=(referenceId:string)=>contextCallback.current({referenceId,modelRevision:null});
 useEffect(()=>{
  if(!inventory.ready)return;let live=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  const key=anchor.id+':'+JSON.stringify(sourceVehicle);bootstrap.current=key;
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Load existing source positions for the explicitly selected catalog identity.
  setLoading(true);setError('');setChoices([]);setLoaded(null);
  (async()=>{
   const preferredContext=sourceVehicle.model?preferredCatalogContext(inventory.rows,sourceVehicle):undefined;
   const explicitPosition=context.sourcePositionId||anchor.positionId;
   const columns='*,parts(id,name,number_normalized),assemblies(id,title,source_category,source_id,boundary,catalog_context_id)';
   const rows=await fetchAllRows((from,to)=>db.from('part_assembly_positions').select(columns).eq('part_id',anchor.id).eq('active',true).order('id').range(from,to).abortSignal(controller.signal));
   if(explicitPosition&&!rows.some(row=>row.id===explicitPosition)){
    if(!catalogPositionAllowed(explicitPosition))throw Error('The selected source entry is an applicability note, not an ordering position.');
    const exact=await db.from('part_assembly_positions').select(columns).eq('id',explicitPosition).eq('part_id',anchor.id).abortSignal(controller.signal).maybeSingle();
    if(exact.error||!exact.data)throw Error('The selected source position does not belong to this part. Choose its record again from the catalog.');
    rows.unshift(exact.data);
   }
   const allowed = new Set(inventory.rows.map(row => row.id));
   const positions=catalogOrderingRows(rows as CatalogPosition[]).filter(p=>allowed.has(p.context_id)&&catalogPositionAllowed(p.id));
   if(!positions.length){if(live)setChoices([]);return;}
   const ordered=explicitPosition?[...positions.filter(p=>p.id===explicitPosition),...positions.filter(p=>p.id!==explicitPosition)]:positions;
   const unique=ordered.filter((p,i,all)=>all.findIndex(x=>x.assembly_id===p.assembly_id&&x.context_id===p.context_id)===i).flatMap(p=>{const assembly=(p as CatalogPosition&{assemblies?:CatalogAssembly}).assemblies;return assembly?[{position:p,assembly}]:[]});
   if(live&&bootstrap.current===key){setChoices(unique);const preferred=unique.find(c=>c.position.id===explicitPosition)||unique.find(c=>c.position.context_id===anchor.contextId)||unique.find(c=>c.position.context_id===preferredContext?.id)||unique[0];if(preferred)contextCallback.current({sourcePositionId:preferred.position.id,sourceContextId:preferred.position.context_id,sourceAssemblyId:preferred.position.assembly_id});}
  })().catch(e=>{if(live)setError(e instanceof Error?e.message:'Part sources could not load.')}).finally(()=>{clearTimeout(timer);if(live)setLoading(false)});
  return()=>{live=false;controller.abort();clearTimeout(timer)};
 },[anchor.id,anchor.positionId,anchor.contextId,context.sourcePositionId,sourceVehicle,inventory.ready,inventory.rows,retry]);
 const source=choices.find(c=>c.position.id===choice);
 useEffect(()=>{
  if(!source)return;let live=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);const key=source.assembly.id;
  Promise.all([fetchAllRows((from,to)=>db.from('part_assembly_positions').select('*,parts(id,name,number_normalized)').eq('assembly_id',key).eq('active',true).order('reference').order('id').range(from,to).abortSignal(controller.signal)),db.from('technical_drawings').select('*').eq('assembly_id',key).order('id').abortSignal(controller.signal)]).then(([rows,art])=>{
   if(art.error)throw Error('This source drawing could not load.');
   if(live){setLoaded({key,positions:catalogOrderingRows(rows as CatalogPosition[]),drawings:art.data||[]});setDrawingId(art.data?.[0]?.id||'');setImageFailed(false);}
  }).catch(()=>{if(live)setError('The assembly could not load. Retry to keep the selected source.')}).finally(()=>clearTimeout(timer));
  return()=>{live=false;controller.abort();clearTimeout(timer)};
 },[source,retry]);
 const records=useMemo(()=>source&&loaded?.key===source.assembly.id?loaded.positions:[],[source,loaded]);
 const position=records.find(p=>p.id===selected.positionId)||records.find(p=>p.part_id===selected.id)||source?.position;
 const drawing=source&&loaded?.key===source.assembly.id?loaded.drawings.find(d=>d.id===drawingId):undefined;
 const adapted=useMemo(()=>drawing?sourceDrawingAdapter(drawing,records):undefined,[drawing,records]);
 const automatic=resolveVehicleReference(vehicleReferences,vehicle).selected;
 const matchingReferences=vehicle.model?referenceCandidates(vehicleReferences,vehicle):vehicleReferences;
 const pinned=explicitReference?referenceRelease(context.modelRevision??undefined,explicitReference):null;
 const explicit=pinned&&"label" in pinned&&seriesForModel(pinned.id)===series?pinned:undefined;
 const allowedReferences=explicit&&!matchingReferences.some(r=>r.id===explicit.id)?[explicit,...matchingReferences]:matchingReferences;
 const reference=explicit||automatic;
 const pick=(id:string)=>{const p=records.find(p=>p.id===id);if(p)onSelect({id:p.part_id,name:p.parts.name,number_normalized:p.parts.number_normalized,positionId:p.id,assemblyId:p.assembly_id,contextId:p.context_id})};
 return <section className="scan-part-review" aria-label="Selected part reference">
  <span className="eyebrow">SELECTED COMPONENT</span><h2>{selected.name}</h2><p className="mono">BMW {selected.number_normalized}</p>
  {choices.length>1&&<label>Catalog illustration source<select value={choice} onChange={e=>setChoice(e.target.value)}>{choices.map(c=><option key={c.position.id} value={c.position.id}>{inventory.rows.find(x=>x.id===c.position.context_id)?.name} · {c.assembly.title}</option>)}</select></label>}
  <div id="scan-comparison"><PartComparison series={series} key={selected.number_normalized} number={selected.number_normalized} name={selected.name} drawing={adapted} positionId={position?.id} sourceLabel={inventory.rows.find(c=>c.id===source?.position.context_id)?.name} loading={loading || (!!source && loaded?.key!==source.assembly.id)} error={error} onRetry={()=>setRetry(n=>n+1)}/></div>
  {source&&source.position.context_id!==preferredCatalogContext(inventory.rows,vehicle)?.id&&vehicle.model&&<p className="small">This illustration comes from {inventory.rows.find(c=>c.id===source.position.context_id)?.name||'a different source vehicle'}. Check the application evidence for your car below.</p>}
  {source&&!source.position.active&&<p className="small">This is a historical source position. Confirm the current part and replacement record before ordering.</p>}
  {position&&<section className="selected-source-conditions" aria-label="Selected catalog restrictions"><dl><dt>Source position</dt><dd>{position.reference} · {position.source_name}</dd><dt>Required quantity</dt><dd>{position.required_quantity??'Not stated'}</dd><dt>Recorded restrictions</dt><dd>{orderingNotes(position).map(note=>note.name+': '+formatCatalogCondition(note.name,note.value)).join(' · ')||'No equipment or production restriction is recorded for this position. Check the installed hardware.'}</dd></dl></section>}
  <PartMedia number={selected.number_normalized} showApproved={false}/>
  <nav className="scan-review-nav" aria-label="Selected part sections"><a href="#scan-comparison">Compare images</a><a href="#scan-fitment">Fitment</a><a href="#scan-location">In your car</a><a href="#scan-service">Repair & tools</a></nav>
  <div id="scan-fitment"><PartCompatibility partId={selected.id} vehicleOverride={vehicle}/></div>
  <section id="scan-location"><h3>Location in your car</h3><label>Reference model<select value={reference?.id||''} onChange={e=>setReference(e.target.value)}><option value="">Choose a reference model</option>{allowedReferences.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
  {reference?<Suspense fallback={<p role="status">Loading the interactive car…</p>}><Car key={reference.id+':'+selected.id} embedded initialVehicle={navigation.vehicle} initialScan={navigation.scan} initialPart={selected.id} initialCatalogPosition={('contextId' in reference&&reference.contextId===position?.context_id)?position?.id:undefined} initialSystem="vehicle" initialReference={reference.id} initialModelRevision={context.modelRevision?String(context.modelRevision):undefined}/></Suspense>:<p>Choose the model and transmission to show the matching interactive car.</p>}
  </section>
  <details className="scan-source-details"><summary>Full assembly diagram & part list</summary><h3>OEM assembly diagram</h3><p>The complete assembly stays visible. Select a numbered position to inspect its part.</p>
  {(loading||inventory.loading)&&<p role="status">Loading source diagrams…</p>}
  {error&&<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Retry</button></p>}

  {source&&<><p><strong>{inventory.rows.find(c=>c.id===source.position.context_id)?.name} · {source.assembly.title}</strong></p>{loaded&&loaded.drawings.length>1&&<label>Source drawing<select value={drawingId} onChange={e=>{setDrawingId(e.target.value);setImageFailed(false)}}>{loaded.drawings.map(d=><option key={d.id} value={d.id}>{d.source_label||d.id}</option>)}</select></label>}
  {adapted&&!imageFailed&&<div className="scan-full-diagram"><Diagram key={adapted.id} assembly={source.assembly.id} selected={position?.id||''} onSelect={pick} drawingOverride={adapted} partNames={Object.fromEntries(records.map(p=>[p.id,p.source_name]))}/>{adapted.image&&<img className="sr-only" src={adapted.image} alt="" onError={()=>setImageFailed(true)}/>}</div>}
  {(!drawing||imageFailed)&&loaded?.key===source.assembly.id&&<p role="status">{imageFailed?'The source illustration could not load.':'No illustration is registered for this assembly.'} The source table is still available below.</p>}
  <div className="scan-position-list" aria-label="Assembly part positions">{records.map(p=><button key={p.id} aria-pressed={p.id===position?.id} onClick={()=>pick(p.id)}><strong>{p.reference}</strong><span>{p.source_name}<small>{p.parts.number_normalized}</small></span></button>)}</div>
  {position&&<dl><dt>Diagram position</dt><dd>{position.reference}</dd><dt>Required quantity</dt><dd>{position.required_quantity??'Not stated in this source'}</dd><dt>Application and ordering notes</dt><dd>{orderingNotes(position).map(note=>note.name+': '+formatCatalogCondition(note.name,note.value)).join(' · ')||'Check production date, gearbox and installed hardware before ordering.'}</dd></dl>}
  <DocumentLink target="_blank" rel="noopener" href={source.position.source_url}>Original assembly source ↗</DocumentLink></>}
  {!loading&&!error&&!choices.length&&<p>No source assembly is linked to this part in the selected catalog. Its canonical number remains available; no diagram is invented.</p>}
  </details>
  {position?.active!==false&&<WhereToBuy partId={selected.id} positionId={position?.id}/>}
  <DocumentLink target="_blank" rel="noopener" href={componentHref({partId:selected.id,positionId:position?.id,assemblyId:position?.assembly_id,catalogContextId:position?.context_id,referenceId:reference?.id,modelRevision:context.modelRevision||undefined},navigation)}>Open the full OEM record, interchange and purchase links ↗</DocumentLink>
<section id="scan-service" className="scan-repair-reference"><h3>Repair steps, tools and manual references</h3><CatalogProcedureLinks partId={selected.id} partNumber={selected.number_normalized} positionId={position?.id} assemblyId={position?.assembly_id} catalogContextId={position?.context_id} referenceId={reference?.id} modelRevision={context.modelRevision||undefined} navigation={navigation} vehicleOverride={vehicle}/>{series==='e34'&&isCenterSupportServicePart(selected.id)&&<><details><summary>Center bearing replacement · steps, tools & manual pages</summary><BearingServiceReference/></details><details><summary>Guided inspection and repair preparation</summary><BearingInspection showService={false} initialScan={navigation.scan||undefined} onLocate={()=>document.querySelector('.scan-part-review .reference-frame')?.scrollIntoView({block:'center',behavior:'smooth'})}/></details></>}<p className="small muted">Use the procedure for the installed hardware. Where a full walkthrough is not yet linked, consult the original manual reference; missing coverage remains on the roadmap.</p></section>
 </section>;
}
