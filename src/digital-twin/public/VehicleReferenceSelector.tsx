"use client";
import { referencesForSeries, referenceRelease } from './load-reference';
import {switchReferenceHref}from'../../vehicle/reference-context';
import { seriesHref } from '../../series/registry';
import { useApp } from '../../components/context';
/** Reference display selection is independent of a member's real garage cars. */
export function VehicleReferenceSelector({reference,revision,unselected=false,destination,mode}:{reference?:string;revision?:string;unselected?:boolean;mode?:string;destination?:Parameters<typeof switchReferenceHref>[2]}) {
  const { series } = useApp();
  const references = referencesForSeries(series);
  const selected = referenceRelease(revision, reference || (!revision ? references[0]?.id : undefined));
  return <label className="reference-model-choice"><span>Car model</span><select aria-label="Car model" value={unselected?'':selected?.id || ''} onChange={event=>{
    const next=references.find(r=>r.id===event.target.value);if(!next)return;
    const href=new URL(switchReferenceHref(window.location.href,next,destination),window.location.origin);
    if(mode&&mode!=='diagrams')href.searchParams.set('mode',mode);
    window.location.assign(seriesHref(href.pathname+href.search,series));
  }}>{unselected&&<option value="">Choose a reference model</option>}{references.map(model=><option key={model.id} value={model.id}>{model.label}</option>)}</select></label>;
}
