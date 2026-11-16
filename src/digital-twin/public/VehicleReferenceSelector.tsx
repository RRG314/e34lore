"use client";
import { referencesForSeries, referenceRelease } from './load-reference';
import {switchReferenceHref}from'../../vehicle/reference-context';
import { seriesHref } from '../../series/registry';
import { useApp } from '../../components/context';
/** Reference display selection is independent of a member's real garage cars. */
export function VehicleReferenceSelector({reference,revision,unselected=false,destination}:{reference?:string;revision?:string;unselected?:boolean;destination?:Parameters<typeof switchReferenceHref>[2]}) {
  const { series } = useApp();
  const references = referencesForSeries(series);
  const selected = referenceRelease(revision, reference || (!revision ? references[0]?.id : undefined));
  return <label className="reference-model-choice"><span>Car model</span><select aria-label="Car model" value={unselected?'':selected?.id || ''} onChange={event=>{
    const next=references.find(r=>r.id===event.target.value);if(!next)return;
    window.location.assign(seriesHref(switchReferenceHref(window.location.href,next,destination), series));
  }}>{unselected&&<option value="">Choose a reference model</option>}{references.map(model=><option key={model.id} value={model.id}>{model.label}</option>)}</select></label>;
}
