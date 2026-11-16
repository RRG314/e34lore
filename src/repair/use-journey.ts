"use client";
import { useEffect, useState } from 'react';
import { useApp, db } from '../components/context';
import { useOwnedCars } from '../vehicle/use-owned-cars';
import { journeyHref, ownedId, requestedJourney } from '../domain/repair-journey';
import { seriesHref } from '../series/registry';
import type {StoredScanContext} from '../scanner/saved-context';
export type LinkedScan = StoredScanContext & { id: string; part_id: string | null; node_id: string | null; notes: string; status: string; evidence?:unknown; vehicle_id: string; parts: { id: string; name: string; number_normalized: string } | null };
export function useRepairJourney(initialScan?: string) {
  const { user, series } = useApp(), owned = useOwnedCars();
  const requested = typeof location === 'undefined' ? ownedId(initialScan) : requestedJourney(location.search).scan || '';
  const key = `${user?.id || ''}:${owned.activeId}:${requested}`;
  const [response, setResponse] = useState<{ key: string; scan: LinkedScan | null; error: string } | null>(null);
  const current = response?.key === key ? response : null;
  useEffect(() => {
    if (!requested || !owned.ready || !user || user.is_anonymous || !owned.selected) return;
    let live = true;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
    Promise.resolve(db.from('component_observations').select('id,part_id,node_id,notes,status,evidence,vehicle_id,catalog_position_id,reference_id,model_revision,model_manifest_sha256,parts(id,name,number_normalized)').eq('id', requested).eq('user_id', user.id).eq('vehicle_id', owned.activeId).abortSignal(controller.signal).maybeSingle()).then(r => {
      if (live) setResponse({ key, scan: !r.error && r.data ? r.data as unknown as LinkedScan : null, error: r.error ? 'The saved identification could not load. Retry this page before linking it.' : !r.data ? 'This identification is not available for the selected car. It will not be linked to your work.' : '' });
    }).catch(() => { if (live) setResponse({ key, scan: null, error: 'The saved identification could not load. Retry this page before linking it.' }); }).finally(() => clearTimeout(timer));
    return () => { live = false; controller.abort(); clearTimeout(timer); };
  }, [key, requested, owned.ready, owned.selected, owned.activeId, user]);
  const scan = current?.scan || null;
  const error = current?.error || (requested && owned.ready && !owned.selected ? 'Choose the garage car this identification belongs to before continuing.' : '');
  return { ...owned, scan, scanId: scan?.id || '', requestedScan: requested, error: owned.error || error, scanLoading: !!requested && !!owned.selected && !current, href: (path: string) => seriesHref(journeyHref(path, { vehicle: owned.activeId, scan: scan?.id }), series) };
}
