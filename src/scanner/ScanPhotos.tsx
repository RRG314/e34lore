'use client';
import { useEffect, useState } from 'react';
import { db } from '../components/context';
import { PhotoImage } from '../components/CarPhotos';
import {photoViews,type ScanPhoto} from './photo-session';

const viewNames = {unspecified:'Unlabeled',front:'Front',back:'Back',side:'Side',detail:'Detail'};
export function ScanPhotoLabels({photos,disabled,onLabel}:{photos:readonly ScanPhoto[];disabled:boolean;onLabel:(id:string,view:ScanPhoto['view'])=>void}) {
  return <details className="scan-next-view"><summary>Label photo angles (optional)</summary>
    {photos.map((photo,index)=><label key={photo.id}>Photo {index+1} angle
      <select value={photo.view||'unspecified'} disabled={disabled}
        onChange={event=>onLabel(photo.id,photoViews.find(view=>view===event.target.value))}>
        {photoViews.map(view=><option key={view} value={view}>{viewNames[view]}</option>)}
      </select>
    </label>)}
  </details>;
}

export async function uploadScanPhotos(observation: string, photos: readonly ScanPhoto[], share: boolean, options:{signal?:AbortSignal;userId?:string}={}) {
  if (!/^[a-f0-9-]{36}$/i.test(observation) || photos.length > 3) throw Error('Choose a saved scan with up to three photos.');
  options.signal?.throwIfAborted();
  const session=await db.auth.getSession();const token=session.data.session?.access_token;
  if(session.error||!token||session.data.session?.user.id!==options.userId)throw Error('Sign in again before saving photos.');
  for (const photo of photos) {
    options.signal?.throwIfAborted();
    const body = new FormData();
    body.set('photo', photo.blob, 'part.jpg'); body.set('observation', observation); body.set('client_key', photo.id);
    body.set('view',photo.view||'unspecified');
    body.set('share_reference', String(share)); body.set('consent_revision', share ? 'part-reference-v1' : '');
    const { error } = await db.functions.invoke('scanner-media', { body,signal:options.signal,headers:{Authorization:'Bearer '+token} });
    if (error) throw Error('Your result is saved. Some photos could not upload; retry without taking them again.');
  }
}
type SavedPhoto = { id: string; object_path: string; review_status: string; reuse_opt_in: boolean; state: string; view_label:keyof typeof viewNames };
export function SavedScanPhotos({ observation, refresh = 0 }: { observation: string; refresh?: number }) {
  const [revision, setRevision] = useState(0), [busy, setBusy] = useState(''),[actionError,setActionError]=useState('');
  const [result, setResult] = useState<{ key: string; rows: SavedPhoto[]; error: boolean } | null>(null);
  const key = observation + ':' + refresh + ':' + revision, current = result?.key === key ? result : null;
  useEffect(() => {
    let active = true; const controller = new AbortController();
    db.from('observation_photos').select('id,object_path,review_status,reuse_opt_in,state,view_label').eq('observation_id', observation).order('created_at').limit(3).abortSignal(AbortSignal.any([controller.signal, AbortSignal.timeout(12000)])).then(r => { if (active) setResult({ key, rows: r.data || [], error: !!r.error }); });
    return () => { active = false; controller.abort(); };
  }, [observation, key]);
  if (!current) return <p role="status">Loading saved photos…</p>;
  if (current.error) return <p role="status">Saved photos couldn’t load. <button type="button" className="text-link" onClick={() => setRevision(n => n + 1)}>Retry</button></p>;
  if (!current.rows.length) return <p className="small muted">No photos saved with this result.</p>;
  return <section className="scan-saved-photos"><h4>Saved photos</h4>{actionError&&<p role="status">{actionError}</p>}<div>{current.rows.map(photo => <article key={photo.id}>
    {photo.state === 'ready' ? <PhotoImage path={photo.object_path} alt="Your saved part photo"/> : <p>Photo upload pending.</p>}
    {photo.view_label!=='unspecified'&&<p className="small">{viewNames[photo.view_label]} view</p>}
    <p className="small">{photo.review_status === 'approved' ? 'Approved reference' : photo.review_status === 'pending' ? 'Waiting for review' : photo.review_status === 'rejected' ? 'Kept private · reference not approved' : 'Private'}</p>
    {photo.reuse_opt_in && <button type="button" className="text-link" disabled={!!busy} onClick={async () => { setBusy(photo.id);setActionError('');try{const r=await db.rpc('withdraw_observation_photo',{photo:photo.id});if(r.error)throw r.error;setRevision(n=>n+1);}catch{setActionError('Sharing could not be changed. Try again.');}finally{setBusy('');} }}>Stop sharing</button>}
    <button type="button" className="text-link" disabled={!!busy} onClick={async () => { if(!confirm('Delete this saved part photo?'))return;setBusy(photo.id);setActionError('');try{const r=await db.functions.invoke('scanner-media',{body:{action:'delete',photo:photo.id}});if(r.error)throw r.error;setRevision(n=>n+1);}catch{setActionError('The photo could not be deleted. Try again.');}finally{setBusy('');} }}>Delete photo</button>
  </article>)}</div></section>;
}

export function SavedScanPhotoDetails({observation}:{observation:string}){
 const [open,setOpen]=useState(false);
 return <details onToggle={event=>setOpen(event.currentTarget.open)}><summary>Saved photos & sharing</summary>{open&&<SavedScanPhotos observation={observation}/>}</details>;
}
