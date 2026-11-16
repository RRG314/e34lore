'use client';
import {useEffect,useState} from 'react';
import {bearingInspection,parseBearingInspection,inspectionCheckIds,type BearingInspectionDraft} from './bearing-inspection';
import {useApp} from '../components/context';
import {useRepairJourney} from './use-journey';
import {JourneyBar} from './JourneyBar';
import {DocumentLink} from '../components/DocumentLink';
import {journeyHref} from '../domain/repair-journey';
import {BearingServiceReference} from './BearingServiceReference';
const empty:BearingInspectionDraft={checks:[],notes:''};
export function BearingInspection({initialScan,onLocate,showService=true}:{initialScan?:string;onLocate:()=>void;showService?:boolean}){
 const {user}=useApp(),journey=useRepairJourney(initialScan);
 const [step,setStep]=useState(0),[saved,setSaved]=useState<{key:string;draft:BearingInspectionDraft}|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('');
 const key=['e34.bearing-inspection.v1',user?.id||'device',journey.activeId||'reference',journey.scanId||'no-scan'].join('.');
 const ready=saved?.key===key && journey.ready;
 const draft=saved?.key===key?saved.draft:empty;
 useEffect(()=>{
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Load the account/car-scoped device draft at its external storage boundary.
  try{const raw=localStorage.getItem(key);setSaved({key,draft:raw?parseBearingInspection(JSON.parse(raw)):empty});setError('');setMessage('');}
  catch{setSaved({key,draft:empty});setError('Saved inspection could not load. Your garage records have not been changed.');}
 },[key]);
 function update(next:BearingInspectionDraft){
  if(!ready)return;
  setSaved({key,draft:next});
  try{localStorage.setItem(key,JSON.stringify(next));setMessage('Inspection notes saved on this device.');setError('');}catch{setError('This browser could not save the inspection. Keep a copy before leaving.');}
 }
 const current=bearingInspection[step],href=(path:string)=>journeyHref(path,{vehicle:journey.activeId,scan:journey.scanId});
 return <section className="interactive-repair bearing-inspection" aria-label="Center support bearing inspection">
  <div className="repair-heading"><div><span className="eyebrow">DRIVELINE / IDENTIFICATION & SERVICE PREPARATION</span><h2>Center support bearing</h2></div><DocumentLink href={href('/scanner')}>Return to photo comparison ↗</DocumentLink></div>
  <JourneyBar journey={journey}/>
  <p>Check the part, compare its ordering identity and prepare the matching service procedure. These checks record observations; they do not mark a repair complete or confirm fitment.</p>
  <div className="repair-context"><label>Inspection for<select value={journey.activeId} disabled={journey.loading} onChange={e=>journey.selectCar(e.target.value)}><option value="">Reference only · no garage car</option>{journey.cars.map(car=><option key={car.id} value={car.id}>{car.nickname}</option>)}</select></label><span>{draft.checks.length} / {inspectionCheckIds().length} checks recorded on this device</span></div>
  <div className="repair-operation-layout"><nav aria-label="Bearing inspection stages">{bearingInspection.map((item,index)=><button key={item.id} aria-current={index===step?'step':undefined} className={index===step?'active':''} onClick={()=>setStep(index)}><span>{index+1}</span>{item.title}</button>)}</nav><article>
   <h3>{current.title}</h3>
   {current.checks.map((text,index)=>{const id=current.id+':'+index;return <label className="bearing-inspection-check" key={id}><input type="checkbox" disabled={!ready} checked={draft.checks.includes(id)} onChange={e=>update({...draft,checks:e.target.checked?[...draft.checks,id]:draft.checks.filter(c=>c!==id)})}/><span>{text}</span></label>})}
   <p className="small muted">Source: Bentley {current.source}</p>
   <div className="scan-actions"><button className="button outline" onClick={onLocate}>Locate the driveshaft in 3D</button><DocumentLink className="button outline" href={href('/manual/260?pdf='+current.pdf)}>Read the matching manual page ↗</DocumentLink></div>
   <div className="repair-step-navigation"><button disabled={step===0} onClick={()=>setStep(i=>i-1)}>← Previous</button><button disabled={step===bearingInspection.length-1} onClick={()=>setStep(i=>i+1)}>Next →</button></div>
  </article></div>
  <label>Observed condition and measurements<textarea disabled={!ready} value={draft.notes} maxLength={3000} onChange={e=>update({...draft,notes:e.target.value})} placeholder="Record only what you observed or measured. Leave unknown details open."/></label>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
  <div className="scan-next"><DocumentLink href={href('/parts/catalog?q=centre%20mount')}>Compare OEM mount records ↗</DocumentLink><DocumentLink href={href('/garage?tab=journal')}>Open this car’s garage and journal ↗</DocumentLink><DocumentLink href={href('/community/new?title=Driveshaft%20center%20support%20bearing%20identification')}>Discuss the inspection ↗</DocumentLink></div>
  <p className="small muted">Inspection notes stay in this browser and are separate for each account and selected car. This inspection does not upload photos, create a service record or publish a journal.</p>
  {showService&&<BearingServiceReference/>}
 </section>;
}
