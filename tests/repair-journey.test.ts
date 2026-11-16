import { describe, it, expect } from 'vitest';
import { ownedSelection, requestedJourney, journeyHref, scanCursor, completedGuideSteps } from '../src/domain/repair-journey';
import { publicShareUrl } from '../src/domain/identity';
import { catalogProcedures } from '../src/digital-twin/public/catalog';
import { repairPlan, localRepairProgress } from '../src/repair/plan';
import { repairApplicability } from '../src/vehicle/configuration';
import { emptyVehicle } from '../src/data/catalog';
const car = 'c3400000-0000-4000-9000-000000000001', second = 'c3400000-0000-4000-9000-000000000002', scan = 'c3400000-0000-4000-8000-000000000021';
describe('private car and repair navigation', () => {
  it('carries the same car, scan, canonical part, source position and step through navigation', () => {
    const href = journeyHref('/parts/catalog?part=bmw-11517527799&position=source-position#guide-step-2', { vehicle: car, scan });
    const u = new URL(href, 'https://e34lore.com');
    expect(requestedJourney(u.search)).toEqual({ vehicle: car, scan });
    expect(u.searchParams.get('part')).toBe('bmw-11517527799');
    expect(u.searchParams.get('position')).toBe('source-position'); expect(u.hash).toBe('#guide-step-2');
  });
  it('accepts old walkthrough car links without duplicating vehicle parameters', () => {
    expect(requestedJourney('?progress_vehicle=' + car)).toEqual({ vehicle: car, scan: undefined });
    const p = new URL(journeyHref('/guides/example?progress_vehicle=' + second, { vehicle: car, scan }), 'https://e34lore.com').searchParams;
    expect(p.has('progress_vehicle')).toBe(false); expect(p.getAll('vehicle')).toEqual([car]);
  });
  it('does not silently substitute another garage car for an invalid or foreign requested car', () => {
    expect(ownedSelection([car], second, car)).toBe('');
    expect(ownedSelection([car], 'not-a-uuid', car)).toBe('');
    expect(ownedSelection([car], null, car)).toBe(car);
    expect(ownedSelection([car], null, second)).toBe('');
  });
  it('drops scan associations without a valid owned-car reference and rejects external destinations', () => {
    expect(journeyHref('/scanner?scan=' + scan, { scan })).toBe('/scanner');
    expect(journeyHref('/garage?vehicle=' + car, { vehicle: 'invalid' })).toBe('/garage');
    expect(() => journeyHref('//example.org/', { vehicle: car })).toThrow();
    expect(() => journeyHref('https://example.org/', {})).toThrow();
  });
  it('never includes private vehicle or scan identifiers in public share links', () => {
    const share = publicShareUrl(journeyHref('/parts/catalog?part=bmw-11517527799', { vehicle: car, scan }));
    expect(share).toBe('https://e34lore.com/parts/catalog?part=bmw-11517527799');
  });
  it('uses both timestamp and id to avoid losing older identifications with tied timestamps', () => {
    expect(scanCursor({ created_at: '2026-11-08T08:00:00+00:00', id: scan })).toContain(`and(created_at.eq.2026-11-08T08:00:00+00:00,id.lt.${scan})`);
    expect(() => scanCursor({ created_at: '2026-11-08),id.gt.bad', id: scan })).toThrow();
  });
});
describe('canonical part and repair continuity', () => {
  it('resumes anonymous device operations in the written guide without accepting skipped or corrupt operations', () => {
    expect(localRepairProgress(['identify'])).toEqual({ done: ['identify'], checks: [0] });
    expect(localRepairProgress([]).checks).toEqual([]);
    expect(() => localRepairProgress(['pump'])).toThrow('preceding');
    expect(() => localRepairProgress({ identify: true })).toThrow('Invalid');
  });
  it('finds the same source-backed procedure for a canonical number and its curated part alias', () => {
    expect(catalogProcedures('bmw-11517527799').guides).toContain('m50-water-pump-job-planning');
    expect(catalogProcedures('coolant-pump').guides).toContain('m50-water-pump-job-planning');
    expect(catalogProcedures('bmw-11511315559').guides).not.toContain('m50-water-pump-job-planning');
  });
  it('checks a written step only when every related interactive operation is recorded', () => {
    expect(completedGuideSteps(repairPlan.operations, ['identify'])).toEqual([0]);
    const firstAccess = repairPlan.operations.filter(o => o.step <= 1).map(o => o.id);
    expect(completedGuideSteps(repairPlan.operations, firstAccess.slice(0, -1))).not.toContain(1);
    expect(completedGuideSteps(repairPlan.operations, firstAccess)).toEqual([0, 1]);
    expect(completedGuideSteps(repairPlan.operations, repairPlan.operations.map(o => o.id))).toEqual([0, 1, 2, 3, 4]);
  });
  it('does not offer the M50 525i operation checklist as applicable to a 530i or 540i with an unknown engine', () => {
    for (const model of ['530i', '540i']) expect(repairApplicability({ ...emptyVehicle, model, year: '1994', transmission: 'Automatic' }).status).toBe('incompatible');
  });
});
