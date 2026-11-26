export type Journey = { vehicle?: string; scan?: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ownedId = (value: unknown): string => typeof value === 'string' && uuid.test(value) ? value : '';
export function requestedJourney(search: string): Journey {
  const p = new URLSearchParams(search);
  return { vehicle: ownedId(p.get('vehicle') || p.get('progress_vehicle')) || undefined, scan: ownedId(p.get('scan')) || undefined };
}
/** Private navigation context only. Public share links use their separate allowlist. */
export function journeyHref(path: string, journey: Journey): string {
  if (!path.startsWith('/') || path.startsWith('//')) throw Error('Local reference route required');
  const u = new URL(path, 'https://e34lore.com');
  u.searchParams.delete('progress_vehicle');
  for (const key of ['vehicle', 'scan'] as const) u.searchParams.delete(key);
  const car = ownedId(journey.vehicle), scan = ownedId(journey.scan);
  if (car) u.searchParams.set('vehicle', car);
  if (car && scan) u.searchParams.set('scan', scan);
  return u.pathname + u.search + u.hash;
}
export function garageIdentificationHref(journey: Journey): string {
  const focus = ownedId(journey.vehicle) && ownedId(journey.scan);
  return journeyHref('/garage?tab=scans' + (focus ? '#saved-identification' : ''), journey);
}
export function ownedSelection(ids: string[], requested: string | null, saved: string | null) {
  if (requested !== null) return ownedId(requested) && ids.includes(requested) ? requested : '';
  return saved && ids.includes(saved) ? saved : '';
}
export function scanCursor(row: { created_at: string; id: string }) {
  if (!ownedId(row.id) || !/^\d{4}-\d{2}-\d{2}T[0-9:.+Z-]+$/.test(row.created_at)) throw Error('Invalid identification cursor');
  return `created_at.lt.${row.created_at},and(created_at.eq.${row.created_at},id.lt.${row.id})`;
}
export function completedGuideSteps(operations: { id: string; step: number }[], done: string[]) {
  const selected = new Set(done);
  return [...new Set(operations.map(o => o.step))].sort((a, b) => a - b).filter(step => operations.filter(o => o.step === step).every(o => selected.has(o.id)));
}
