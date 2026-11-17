"use client";
import{DocumentLink}from"../../components/DocumentLink";
import { lazy, Suspense } from 'react';
import {seriesForModel} from '../../series/registry';
import {useApp}from'../../components/context';
import {resolveVehicleReference}from'../../vehicle/reference-context';
import {referencesForSeries,referenceRelease} from './load-reference';
import { VehicleReferenceSelector } from './VehicleReferenceSelector';
import { BookOpen } from 'lucide-react';
import { journeyHref } from '../../domain/repair-journey';
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
  const repair = !diagrams && !buildMode && !modelProps.repairMode && !modelProps.repairTask &&
    (workshopMode === 'repair' || !workshopMode && !modelProps.initialPart && !modelProps.initialNode &&
      !modelProps.initialSystem && !modelProps.initialCatalogPosition && !modelProps.initialModelRevision);
  const mode=diagrams?'diagrams':buildMode?'build':repair||modelProps.repairMode||modelProps.repairTask?'repair':'explore';
  const navigation={vehicle:modelProps.initialVehicle,scan:modelProps.initialScan};
  const base={...(effectiveReference?{reference:effectiveReference}:{}),
    ...(modelProps.initialModelRevision?{model_revision:modelProps.initialModelRevision}:{})};
  const link=(params:Record<string,string>)=>journeyHref('/workshop?'+new URLSearchParams({...base,...params}).toString(),navigation);
  const diagramQuery={tab:'diagrams',...(reference&&'contextId' in reference&&reference.contextId
    ?{context:reference.contextId,transmission:reference.transmission.toLowerCase()}:{} )};
  const controls=<nav className="reference-mode-controls" aria-label="Workshop">
    {!buildProject&&<VehicleReferenceSelector reference={modelProps.initialReference} revision={modelProps.initialModelRevision} unselected={!chosen} mode={mode}/> }
    <DocumentLink href={link({mode:'repair'})} aria-current={mode==='repair'?'page':undefined}>Repair</DocumentLink>
    <DocumentLink href={link({mode:'explore'})} aria-current={mode==='explore'?'page':undefined}>Explore</DocumentLink>
    <DocumentLink href={link(diagramQuery)} aria-current={mode==='diagrams'?'page':undefined}><BookOpen size={15}/>Catalog diagrams</DocumentLink>
    <DocumentLink href={link({mode:'build'})} aria-current={mode==='build'?'page':undefined}>Build</DocumentLink>
  </nav>;
  if(buildMode)return <Suspense fallback={<p className="page" role="status">Loading Build Studio…</p>}><Build project={buildProject} reference={effectiveReference} controls={controls}/></Suspense>;
  if(!modelProps.repairMode&&(!vehicleReady||!chosen)&&!diagrams)return <section className="page reference-choice">
    <h1>{repair?'Repair':'Explore'} your {series.toUpperCase()}</h1>{controls}
    <p>{!vehicleReady?'Loading your vehicle selection…':resolution.status==='ambiguous'?'Choose a body and transmission reference. More than one illustrated model matches your selection.':'Choose an available 3D reference or open the repair guides for this car.'}</p>
    {vehicleReady&&repair&&<DocumentLink href="/repairs">Browse repair guides</DocumentLink>}
  </section>;
  return <Suspense fallback={<p className="page" role="status">Loading workshop references…</p>}>
    {diagrams ? <Catalog presentation="workshop" initialPart={modelProps.initialPart} workshopControls={controls}/>
      : <Model {...modelProps} guidedRepair={repair} referenceControls={controls}/>}
  </Suspense>;
}
