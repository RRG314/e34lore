"use client";
import{DocumentLink}from"../../components/DocumentLink";
import { lazy, Suspense } from 'react';
import {seriesForModel} from '../../series/registry';
import {useApp}from'../../components/context';
import {resolveVehicleReference}from'../../vehicle/reference-context';
import {referencesForSeries,referenceRelease} from './load-reference';
import { VehicleReferenceSelector } from './VehicleReferenceSelector';
import { Box, BookOpen } from 'lucide-react';
const Build=lazy(()=>import('../../build-studio/BuildStudio').then(m=>({default:m.BuildStudio})));
const Catalog = lazy(() => import('../../components/CatalogBrowser').then(m => ({ default: m.CatalogBrowser })));
const Model = lazy(() => import('./ReferenceWorkshop').then(m => ({ default: m.ReferenceWorkshop })));
type Props = Parameters<typeof import('./ReferenceWorkshop').ReferenceWorkshop>[0] & { diagrams?: boolean;buildMode?:boolean;buildProject?:string;workshopMode?:string;quickReference?:boolean };

export function WorkshopExplorer({ diagrams,buildMode,buildProject,workshopMode,quickReference, ...modelProps }: Props) {
  const{vehicle,vehicleReady,series}=useApp();
  const resolution=resolveVehicleReference(referencesForSeries(series),vehicle,modelProps.initialReference);
  const explicit=!!modelProps.initialReference||!!modelProps.initialModelRevision;
  const pinned=explicit?referenceRelease(modelProps.initialModelRevision,modelProps.initialReference):null;
  const chosen=explicit ? (pinned && seriesForModel(pinned.id)===series ? pinned : null) : resolution.selected;
  const effectiveReference=chosen?.id;
  const reference=chosen;
  modelProps={...modelProps,initialReference:effectiveReference||modelProps.initialReference};
  if(quickReference) return <section className="qr-model" aria-label="Interactive car">
    <VehicleReferenceSelector reference={modelProps.initialReference} unselected={!chosen} destination="/quick-reference/model"/>
    {!vehicleReady ? <p role="status">Loading your vehicle selection…</p> : chosen ?
      <Suspense fallback={<p role="status">Loading the 3D view…</p>}><Model {...modelProps} embedded/></Suspense> :
      <p>Choose an available 3D reference from the car model list.</p>}
  </section>;
  const diagramQuery=new URLSearchParams({tab:'diagrams',...(modelProps.initialReference?{reference:modelProps.initialReference}:{}),...(reference&&'contextId' in reference&&reference.contextId?{context:reference.contextId,transmission:reference.transmission.toLowerCase()}:{} )});
  if (modelProps.repairMode) return <Model {...modelProps}/>;
  const controls=<nav className="reference-mode-controls" aria-label="Workshop reference view">
    {!buildProject&&<VehicleReferenceSelector reference={modelProps.initialReference} revision={modelProps.initialModelRevision} unselected={!chosen}/> }
    <DocumentLink href={'/workshop?'+new URLSearchParams({...(effectiveReference?{reference:effectiveReference}:{} )}).toString()} aria-current={!buildMode&&workshopMode!=='repair'?'page':undefined}>Explore</DocumentLink>
    <DocumentLink href={'/workshop?'+new URLSearchParams({mode:'repair',...(effectiveReference?{reference:effectiveReference}:{})}).toString()} aria-current={workshopMode==='repair'?'page':undefined}>Repair</DocumentLink>
    <DocumentLink href={'/workshop?'+new URLSearchParams({mode:'build',...(effectiveReference?{reference:effectiveReference}:{})}).toString()} aria-current={buildMode?'page':undefined}>Build</DocumentLink>
    <DocumentLink href={modelProps.initialReference?"/workshop?reference="+encodeURIComponent(modelProps.initialReference):"/workshop"} aria-current={!diagrams?'page':undefined}><Box size={15}/><span>Interactive car</span></DocumentLink>
    <DocumentLink href={"/workshop?"+diagramQuery.toString()} aria-current={diagrams?'page':undefined}><BookOpen size={15}/><span>Catalog diagrams</span></DocumentLink>
  </nav>;
  if(buildMode)return <Suspense fallback={<p className="page" role="status">Loading Build Studio…</p>}><Build project={buildProject} reference={effectiveReference} controls={controls}/></Suspense>;
  if((!vehicleReady||!chosen)&&!diagrams)return <section className="page reference-choice"><h1>Explore your {series.toUpperCase()}</h1>{controls}<p>{!vehicleReady?'Loading your vehicle selection…':resolution.status==='ambiguous'?'Choose a body and transmission reference. More than one illustrated model matches your selection.':'An assembled 3D reference for this configuration is not available yet. Browse its catalog diagrams, or explicitly choose another reference above.'}</p></section>;
  return <Suspense fallback={<p className="page" role="status">Loading workshop references…</p>}>
    {workshopMode==='repair'?<section className="page workshop-repair-mode"><h1>Repair references</h1><p>Inspect the same car reference, then use a procedure matched to your installed hardware.</p><Model {...modelProps} embedded referenceControls={controls}/><DocumentLink className="button primary" href="/repairs">Find repair walkthroughs ↗</DocumentLink><DocumentLink className="button outline" href="/manual">Open service manual ↗</DocumentLink></section>:diagrams ? <Catalog presentation="workshop" initialPart={modelProps.initialPart} workshopControls={controls}/> : <Model {...modelProps} referenceControls={controls}/>}
  </Suspense>;
}
