"use client";
import { previewFeatures } from "../release/features";
import { useEffect, useState } from "react";
import { db, useApp } from "./context";
import { guideRevision, normalizedChecks } from "../domain/walkthrough";
import { Notice } from "./common";
import { useRepairJourney } from "../repair/use-journey";
import { repairPlan, localRepairProgress } from "../repair/plan";
import { completedGuideSteps } from "../domain/repair-journey";
export { GarageWalkthroughs } from "../repair/GarageRepairs";
type ProgressRow = { id: string; content_version: number; repair_plan_id: string | null; operation_ids: string[]; scan_id: string | null; configuration_revision: string | null };
export function useWalkthroughProgress(slug: string, revisionOverride?: string, stepCountOverride?: number) {
  const { user, toast } = useApp(), g = guideRevision(slug), journey = useRepairJourney();
  const revision = revisionOverride || g?.revision || "", stepCount = stepCountOverride ?? g?.steps.length ?? 0;
  const car = journey.activeId, userId = user && !user.is_anonymous ? user.id : '';
  const [checks, setChecks] = useState<number[]>([]), [row, setRow] = useState<ProgressRow | null>(null), [config, setConfig] = useState<string | null>(null);
  const [localInteractive, setLocalInteractive] = useState(false);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [refresh, setRefresh] = useState(0), [dirty, setDirty] = useState(false);
  const key = ['e34.progress', userId || 'device', car || 'general', slug, revision].join('.');
  useEffect(() => {
    let live = true;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear the previous private snapshot at the external account/car/revision boundary before reloading storage.
    setLoading(true); setError(''); setRow(null); setConfig(null); setDirty(false); setChecks([]); setLocalInteractive(false);
    if (!journey.ready) { clearTimeout(timer); return; }
    try { setChecks(normalizedChecks(JSON.parse(localStorage.getItem(key) || '[]'), stepCount)); } catch {}
    if (!userId || !g) {
      if (!userId && slug === repairPlan.guide && revision === repairPlan.revision) {
        try { const raw = localStorage.getItem(`e34.repair.${user?.id || 'device'}.${car || 'reference'}.${repairPlan.id}`); if (raw !== null) { setChecks(localRepairProgress(JSON.parse(raw)).checks); setLocalInteractive(true); } } catch { setError('The local interactive checklist could not be read. Reopen the interactive repair before recording more work.'); }
      }
      setLoading(false); clearTimeout(timer); return;
    }
    let q = db.from('guide_progress').select('id,content_version,completed_steps,repair_plan_id,operation_ids,scan_id,configuration_revision').eq('user_id', userId).eq('guide_id', slug).eq('revision', revision);
    q = car ? q.eq('vehicle_id', car) : q.is('vehicle_id', null);
    Promise.all([q.abortSignal(controller.signal).maybeSingle(), car ? db.from('vehicle_configuration_revisions').select('id').eq('user_id', userId).eq('vehicle_id', car).order('revision', { ascending: false }).limit(1).abortSignal(controller.signal).maybeSingle() : Promise.resolve({ data: null, error: null })]).then(([r, c]) => {
      if (!live) return;
      if (r.error || c.error) { setError('Saved walkthrough progress could not load. Retry before saving.'); return; }
      setConfig(r.data?.configuration_revision || c.data?.id || null);
      if (r.data) {
        setRow(r.data);
        const saved = r.data.repair_plan_id === repairPlan.id ? completedGuideSteps(repairPlan.operations, r.data.operation_ids || []) : normalizedChecks(r.data.completed_steps, stepCount);
        setChecks(saved);
        try { localStorage.setItem(key, JSON.stringify(saved)); } catch {}
      }
    }).catch(() => { if (live) setError('Saved walkthrough progress could not load.'); }).finally(() => { clearTimeout(timer); if (live) setLoading(false); });
    return () => { live = false; controller.abort(); clearTimeout(timer); };
  }, [userId, user?.id, car, slug, revision, stepCount, refresh, key, journey.ready, g]);
  const interactive = !!row?.repair_plan_id || localInteractive;
  function toggle(i: number) {
    if (loading || busy || interactive) return;
    const next = checks.includes(i) ? checks.filter(n => n !== i) : [...checks, i];
    setChecks(next); setDirty(true);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }
  async function save() {
    if (!userId || !g || busy || loading || interactive || journey.scanLoading || journey.error) return;
    setBusy(true); setError('');
    try {
      const values = { vehicle_id: car || null, guide_id: slug, revision, completed_steps: checks, scan_id: row?.scan_id || journey.scanId || null, configuration_revision: config };
      const columns = 'id,content_version,repair_plan_id,operation_ids,scan_id,configuration_revision';
      const result = row ? await db.from('guide_progress').update(values).eq('id', row.id).eq('user_id', userId).eq('content_version', row.content_version).select(columns).abortSignal(AbortSignal.timeout(15000)).maybeSingle() : await db.from('guide_progress').insert(values).select(columns).abortSignal(AbortSignal.timeout(15000)).single();
      if (result.error || !result.data) throw Error('Saved progress changed or could not be confirmed. Your checks remain on this device; reload saved checks before retrying.');
      setRow(result.data); setDirty(false); toast('Walkthrough progress saved to your account.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Progress could not save.'); } finally { setBusy(false); }
  }
  return { checks, toggle, loading, busy, car, setCar: journey.selectCar, cars: journey.cars, error, save, dirty, row, reload: () => setRefresh(n => n + 1), revision, interactive, journey };
}
export function WalkthroughProgressControls({ progress, slug }: { progress: ReturnType<typeof useWalkthroughProgress>; slug: string }) {
  const { user } = useApp(), member = user && !user.is_anonymous;
  return <section className="progress-sync">
    {!member && progress.interactive && <p>Your saved operation checks are shown here. {previewFeatures.interactiveRepairs && <a className="button outline" href={progress.journey.href('/workshop/repair')}>Resume interactive repair</a>}</p>}
    {member ? <>
      <label>Progress for<select value={progress.car} disabled={progress.loading || progress.busy} onChange={e => { if (!progress.dirty || confirm('Switch cars? Unsaved checks stay on this device for the previous car.')) progress.setCar(e.target.value); }}><option value="">General reference</option>{progress.cars.map(c => <option value={c.id} key={c.id}>{c.nickname}</option>)}</select></label>
      {progress.interactive ? <p>This checklist follows your interactive repair. {previewFeatures.interactiveRepairs && <a className="button outline" href={progress.journey.href('/workshop/repair')}>Resume interactive repair</a>} {previewFeatures.interactiveRepairs ? 'Record or undo operations there; the written walkthrough shows the same progress.' : 'Your saved operation checks are read-only while the interactive repair is unavailable.'}</p> : <><button className="button outline" disabled={progress.loading || progress.busy || progress.journey.scanLoading || !!progress.journey.error} onClick={progress.save}>{progress.busy ? 'Saving…' : 'Save checks to account'}</button><p className="small muted">{progress.dirty ? 'Changes are saved on this device; save to your account to use them elsewhere.' : progress.row ? 'Account progress loaded. Checkmarks do not certify a completed repair.' : 'Checkmarks stay on this device until you save.'}</p></>}
      <button className="text-link" disabled={progress.busy || progress.loading} onClick={() => { if (!progress.dirty || confirm('Replace your current checks with the saved account version?')) progress.reload(); }}>Reload saved checks</button>
    </> : <p className="small">Checks stay on this device. <a href={'/account?next=' + encodeURIComponent('/guides/' + slug)}>Sign in to save progress across devices.</a></p>}
    {progress.error && <Notice tone="warning">{progress.error}</Notice>}
    <a className="text-link" href={progress.journey.href('/garage?tab=journal&journal_guide=' + encodeURIComponent(slug))}>Record work in your journal ↗</a>
  </section>;
}
