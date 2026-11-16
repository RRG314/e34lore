"use client";
import { previewFeatures } from "../release/features";
import { useEffect, useState } from 'react';
import { db, useApp } from '../components/context';
import { DocumentLink } from '../components/DocumentLink';
import { manualGuides } from '../data/manual';
import { guideRevision } from '../domain/walkthrough';
import { journeyHref } from '../domain/repair-journey';
import { repairPlan } from './plan';
type SavedProgress = { id: string; guide_id: string; revision: string; completed_steps: number[]; repair_plan_id: string | null; operation_ids: string[]; scan_id: string | null; service_record_id: string | null };
type CompletedRun = { id: string; guide_id: string; guide_revision: string; completed_at: string; scan_id: string | null; parts_used: { part_id: string; quantity: number }[] };
export function GarageWalkthroughs({ vehicleId }: { vehicleId: string }) {
  const { user } = useApp(), scope = `${user?.id || ''}:${vehicleId}`;
  const [response, setResponse] = useState<{ scope: string; rows: SavedProgress[]; runs: CompletedRun[]; identities: Record<string, { name: string; number_normalized: string }>; error: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const current = response?.scope === scope ? response : null;
  useEffect(() => {
    if (!user || user.is_anonymous) return;
    let live = true;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
    Promise.all([
      db.from('guide_progress').select('id,guide_id,revision,completed_steps,repair_plan_id,operation_ids,scan_id,service_record_id').eq('user_id', user.id).eq('vehicle_id', vehicleId).order('updated_at', { ascending: false }).limit(100).abortSignal(controller.signal),
      db.from('completed_repair_runs').select('id,guide_id,guide_revision,completed_at,scan_id,parts_used').eq('user_id', user.id).eq('vehicle_id', vehicleId).order('completed_at', { ascending: false }).limit(50).abortSignal(controller.signal),
    ]).then(async ([p, h]) => {
      if (p.error || h.error) throw Error('Your saved repair records could not load.');
      const runs = (h.data || []) as CompletedRun[], ids = [...new Set(runs.flatMap(r => r.parts_used.map(p => p.part_id)))].slice(0, 200);
      const identities: Record<string, { name: string; number_normalized: string }> = {};
      if (ids.length) { const r = await db.from('parts').select('id,name,number_normalized').in('id', ids).limit(200).abortSignal(controller.signal); for (const p of r.data || []) identities[p.id] = p; }
      if (live) setResponse({ scope, rows: (p.data || []) as SavedProgress[], runs, identities, error: '' });
    }).catch(() => { if (live) setResponse({ scope, rows: [], runs: [], identities: {}, error: 'Your saved repair records could not load. Retry when connected.' }); }).finally(() => clearTimeout(timer));
    return () => { live = false; controller.abort(); clearTimeout(timer); };
  }, [scope, vehicleId, user, revision]);
  const href = (path: string, scan?: string | null) => journeyHref(path, { vehicle: vehicleId, scan: scan || undefined });
  const title = (id: string) => manualGuides.find(g => g.slug === id)?.title || 'Saved walkthrough';
  return <section className="garage-progress">
    <h3>{previewFeatures.interactiveRepairs ? "Walkthroughs and interactive repairs" : "Saved walkthroughs"}</h3>
    {!current && <p role="status">Loading your saved work…</p>}
    {current?.error && <p role="alert">{current.error} <button onClick={() => setRevision(n => n + 1)}>Retry</button></p>}
    {current?.rows.map(r => {
      const interactive = r.repair_plan_id === repairPlan.id && r.revision === repairPlan.revision;
      return <article className="garage-repair-card" key={r.id}>
        <h4>{title(r.guide_id)}</h4>
        <p>{interactive ? `${r.operation_ids.length} / ${repairPlan.operations.length} operations recorded` : `${r.completed_steps.length} steps checked`}{r.service_record_id ? ' · Saved to service history' : ''}{guideRevision(r.guide_id)?.revision !== r.revision ? ' · Earlier guide revision' : ''}</p>
        {previewFeatures.interactiveRepairs && interactive && <DocumentLink className="button" href={href('/workshop/repair', r.scan_id)}>Resume interactive repair</DocumentLink>}
        <DocumentLink className="button outline" href={href('/guides/' + r.guide_id + '?revision=' + encodeURIComponent(r.revision), r.scan_id)}>Read saved walkthrough</DocumentLink>
        {r.scan_id && <DocumentLink href={href('/parts/catalog', r.scan_id)}>View linked identification and catalog</DocumentLink>}
      </article>;
    })}
    {current && !current.error && !current.rows.length && <p>Save a walkthrough to this car to resume it here.</p>}
    {current?.rows.length === 100 && <p className="small muted">Showing the100 most recently updated walkthroughs.</p>}
    {!!current?.runs.length && <><h3>Completed repairs</h3>{current.runs.map(r => <article className="garage-repair-card" key={r.id}>
      <h4>{title(r.guide_id)}</h4><p>Recorded {new Date(r.completed_at).toLocaleDateString()} · retained in private service history and journal.</p>
      {r.parts_used.length > 0 && <ul>{r.parts_used.map((p, i) => <li key={i}>{p.quantity} × <DocumentLink href={href('/parts/catalog?part=' + encodeURIComponent(p.part_id), r.scan_id)}>{current.identities[p.part_id]?.name || 'Catalog item'}{current.identities[p.part_id]?.number_normalized && <> · {current.identities[p.part_id].number_normalized}</>}</DocumentLink></li>)}</ul>}
      <DocumentLink href={href('/garage?tab=journal')}>Open this car’s journal</DocumentLink>
    </article>)}</>}
    <DocumentLink className="text-link" href={href('/repairs')}>Browse walkthroughs ↗</DocumentLink>
  </section>;
}
