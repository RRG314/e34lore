"use client";
import { useEffect, useRef, useState } from 'react';
import {SavedScanPhotoDetails} from './ScanPhotos';
import {savedComponentContext,type StoredScanContext} from "./saved-context";
import {componentHref,componentWorkshopHref} from "../servicing/context";
import {familyFromEvidence} from "./observation-evidence";
import { componentFamilies } from "./families";
import { previewFeatures } from "../release/features";
import { Trash2 } from 'lucide-react';
import { db, useApp } from '../components/context';
import { DocumentLink } from '../components/DocumentLink';
import { garageIdentificationHref, journeyHref, scanCursor } from '../domain/repair-journey';
import { useOwnedCars } from '../vehicle/use-owned-cars';
import { CatalogProcedureLinks } from '../digital-twin/public/CatalogProcedures';
import { seriesForModel } from '../series/registry';
type SavedIdentification = StoredScanContext & {
  series?: 'e30' | 'e34';
  id: string; vehicle_id: string | null; part_id: string | null; node_id: string | null; status: string; notes: string; created_at: string; evidence?:unknown;
  parts: { id: string; name: string; number_normalized: string } | null;
  scanner_components: { title: string } | null;
};
export function ScanHistory({ vehicleId, focusId, refreshKey = 0, onDeleted }: { vehicleId?: string; focusId?: string; refreshKey?: number; onDeleted?: (id: string) => void }) {
  const { user, toast, seriesEnabled } = useApp(), owned = useOwnedCars();
  const userId = user && !user.is_anonymous ? user.id : '';
  const focused = vehicleId ? focusId : undefined;
  const scope = `${userId}:${vehicleId || 'all'}:${focused || ''}`;
  const section=useRef<HTMLElement>(null);
  const [cursor, setCursor] = useState<{ scope: string; value: SavedIdentification } | null>(null);
  const [response, setResponse] = useState<{ scope: string; rows: SavedIdentification[]; more: boolean } | null>(null);
  const [revision, setRevision] = useState(0), [pending, setPending] = useState(''), [error, setError] = useState('');
  const [loading, setLoading] = useState(true), [drafts, setDrafts] = useState<Record<string, string>>({});
  const page = cursor?.scope === scope ? cursor.value : null;
  const rows = response?.scope === scope ? response.rows : [];
  useEffect(() => {
    if (!userId) return;
    let live = true;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start a scoped external history request; prior-account rows are independently hidden by the response scope.
    setLoading(true); setError('');
    let q = db.from('component_observations').select('id,vehicle_id,part_id,node_id,status,notes,evidence,created_at,catalog_position_id,reference_id,model_revision,model_manifest_sha256,parts(id,name,number_normalized),scanner_components(title)' + (seriesEnabled ? ',series' : '')).eq('user_id', userId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(31);
    if (vehicleId) q = q.eq('vehicle_id', vehicleId);
    if (focused) q = q.eq('id', focused);
    if (page) q = q.or(scanCursor(page));
    Promise.resolve(q.abortSignal(controller.signal)).then(r => {
      if (!live) return;
      if (r.error) { setError('Your saved identifications could not load. Please retry.'); return; }
      const data = (r.data || []) as unknown as SavedIdentification[];
      setResponse(old => ({ scope, rows: [...(page && old?.scope === scope ? old.rows : []), ...data.slice(0, 30)].filter((r, i, all) => all.findIndex(x => x.id === r.id) === i), more: data.length > 30 }));
    }).catch(() => { if (live) setError('Your saved identifications could not load. Please retry.'); }).finally(() => { clearTimeout(timer); if (live) setLoading(false); });
    return () => { live = false; controller.abort(); clearTimeout(timer); };
  }, [scope, userId, vehicleId, focused, page, revision, refreshKey, seriesEnabled]);
  useEffect(()=>{
    if (focused && !loading) section.current?.focus({preventScroll:false});
  },[focused,loading]);
  if (!userId) return null;
  return <section className="scan-history" ref={section} id={focused?'saved-identification':undefined} tabIndex={focused?-1:undefined}>
    <h2>{focused ? 'Saved identification' : vehicleId ? 'This car’s saved identifications' : 'Your private identifications'}</h2>
    {focused && <DocumentLink className="back-link" href={garageIdentificationHref({vehicle:vehicleId})}>All identifications for this car</DocumentLink>}
    <p>Markings and your notes are private. Saved photos are private unless you chose to share them. Open Saved photos & sharing to view, stop sharing or delete them. An identification does not record an installation or completed repair.</p>
    {rows.map(h => {
      const linkedCar = owned.cars.find(c => c.id === h.vehicle_id);
      const series = h.series ?? seriesForModel(linkedCar?.model_id || '');
      const href = (path: string) => journeyHref(path, { vehicle: h.vehicle_id || undefined, scan: h.id });
      return <article key={h.id}>
        <div><h3>{h.parts?.name || h.scanner_components?.title || componentFamilies.find(f=>f.id===familyFromEvidence(h.evidence))?.name || 'Unidentified component'}</h3>
          {h.parts?.number_normalized && <strong className="mono">{h.parts.number_normalized}</strong>}
          <p>{h.vehicle_id ? owned.cars.find(c => c.id === h.vehicle_id)?.nickname || 'Your garage car' : 'Not assigned to a car'} · {new Date(h.created_at).toLocaleDateString()} · {h.status === 'owner_confirmed' ? 'Confirmed by you; not independently verified' : 'Candidate to check'}</p>
          {h.notes && <p>{h.notes}</p>}
          {h.part_id && <><DocumentLink series={series} className="button outline" href={componentHref(savedComponentContext(h.part_id,h),{vehicle:h.vehicle_id||undefined,scan:h.id})}>Catalog and diagram</DocumentLink><CatalogProcedureLinks seriesOverride={series} partId={h.part_id} partNumber={h.parts?.number_normalized} positionId={h.catalog_position_id||undefined} referenceId={h.reference_id||undefined} modelRevision={h.model_revision||undefined} navigation={{ vehicle: h.vehicle_id || undefined, scan: h.id }}/></>}
          {h.node_id && <DocumentLink series={series} href={componentWorkshopHref({...savedComponentContext(h.part_id||'',h),nodeId:h.node_id},{vehicle:h.vehicle_id||undefined,scan:h.id})}>View component reference</DocumentLink>}
          {previewFeatures.scanner&&h.vehicle_id&&<DocumentLink series={series} className="button outline" href={href('/scanner')}>Review this saved scan</DocumentLink>}
          {h.vehicle_id && !vehicleId && <DocumentLink series={series} href={garageIdentificationHref({vehicle:h.vehicle_id,scan:h.id})}>View in My Garage</DocumentLink>}
        </div>
        {h.part_id&&<SavedScanPhotoDetails observation={h.id}/>}
        <details><summary>Correct this identification</summary><label>Explain what was wrong<textarea minLength={10} maxLength={2000} value={drafts[h.id] || ''} onChange={e => setDrafts(old => ({ ...old, [h.id]: e.target.value }))}/></label><button className="button outline" disabled={!!pending || (drafts[h.id] || '').trim().length < 10} onClick={async () => {
          setPending(h.id); setError('');
          try { const r = await db.from('scanner_corrections').insert({ observation_id: h.id, reason: drafts[h.id].trim() }).abortSignal(AbortSignal.timeout(15000)); if (r.error) throw r.error; setDrafts(old => ({ ...old, [h.id]: '' })); toast('Correction sent for review. The catalog has not been changed.'); } catch { setError('Your correction could not be confirmed. Retry when connected.'); } finally { setPending(''); }
        }}>Submit correction for review</button></details>
        <button aria-label={'Delete identification for ' + (h.parts?.name || h.scanner_components?.title || 'component')} className="button outline" disabled={!!pending} onClick={async () => {
          if (!confirm('Delete this identification, its saved photos and corrections?')) return;
          setPending(h.id); setError('');
          try { const r = await db.from('component_observations').delete().eq('id', h.id).eq('user_id', userId).abortSignal(AbortSignal.timeout(15000)); if (r.error) throw r.error; void db.functions.invoke('scanner-media',{body:{action:'cleanup'}}).catch(()=>{}); setCursor(null); setRevision(n => n + 1); onDeleted?.(h.id); } catch { setError('Deletion could not be confirmed. Reload before trying again.'); } finally { setPending(''); }
        }}><Trash2 size={16}/> Delete</button>
      </article>;
    })}
    {loading && <p role="status">Loading saved identifications…</p>}
    {!loading && !error && !rows.length && focused && <p>This identification is unavailable for this car.</p>}
    {!loading && !error && !rows.length && !focused && <p>No identifications saved{vehicleId ? ' for this car' : ''} yet. <DocumentLink href={journeyHref('/scanner', { vehicle: vehicleId })}>Identify a component</DocumentLink></p>}
    {error && <p role="alert">{error} <button onClick={() => setRevision(n => n + 1)}>Retry</button></p>}
    {response?.scope === scope && response.more && <button className="button outline" disabled={loading || !!pending} onClick={() => setCursor({ scope, value: rows[rows.length - 1] })}>Load older identifications</button>}
  </section>;
}
