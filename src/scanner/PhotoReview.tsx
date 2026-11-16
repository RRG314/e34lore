'use client';
import { useEffect, useState } from 'react';
import { db } from '../components/context';
import { PhotoImage } from '../components/CarPhotos';
type Submission = { id: string; part_id: string; object_path: string; sha256: string; view_label: string; photo_kind:string; consent_revision: string };
export function ScannerPhotoReview() {
  const [revision,setRevision]=useState(0),[rows,setRows]=useState<Submission[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState('');
  const [notes,setNotes]=useState<Record<string,string>>({}),[checked,setChecked]=useState<Record<string,boolean>>({});
  useEffect(()=>{let active=true;db.rpc('scanner_photo_review_queue').abortSignal(AbortSignal.timeout(12000)).then(r=>{if(active){if(r.error)setError('A current moderator session and authenticator are required.');else{setRows(r.data||[]);setError('');}}});return()=>{active=false;};},[revision]);
  return <section className="scanner-photo-review"><h2>Contributed part photos</h2><p>Check the exact number, visible features, photo quality and personal details before approving a reference.</p>{error&&<p role="status">{error}</p>}{!error&&!rows.length&&<p>No contributed photos waiting for review.</p>}{rows.map(photo=><article className="review-card" key={photo.id}>
    <h3>{photo.part_id}</h3><PhotoImage path={photo.object_path} alt="Part photo submitted for reference review"/>
    <p className="small">Context: {photo.photo_kind} · View: {photo.view_label} · Permission: {photo.consent_revision}</p>
    <a href={'/parts/catalog?part='+encodeURIComponent(photo.part_id)} target="_blank" rel="noopener noreferrer">Compare original catalog record ↗</a>
    <label><input type="checkbox" checked={!!checked[photo.id]} onChange={e=>setChecked(v=>({...v,[photo.id]:e.target.checked}))}/>I checked the part number, visible features and personal details.</label>
    <label>Review evidence<textarea value={notes[photo.id]||''} minLength={10} maxLength={2000} onChange={e=>setNotes(v=>({...v,[photo.id]:e.target.value}))}/></label>
    {(['approved','rejected'] as const).map(decision=><button type="button" className="button outline" key={decision} disabled={!!busy||(notes[photo.id]||'').trim().length<10||(decision==='approved'&&!checked[photo.id])} onClick={async()=>{setBusy(photo.id);try{const r=await db.rpc('review_observation_photo',{photo:photo.id,decision,reason:notes[photo.id]});if(r.error)throw r.error;setRevision(n=>n+1);}catch(e){setError(e instanceof Error?e.message:'The review could not save. Try again.');}finally{setBusy('');}}}>{decision==='approved'?'Approve reference':'Reject reference'}</button>)}
  </article>)}</section>;
}
