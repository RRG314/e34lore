import { hasReleasePack, catalogSnapshot } from './release-content';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { assemblyTransmission, assemblyInTransmission, transmissionView, catalogForModel, catalogBrowseHref } from '../src/domain/catalog-variants';
import { publicShareUrl } from '../src/domain/identity';
import inventory from '../data/catalog-snapshots/inventory.json';
import type { CatalogContext } from '../src/domain/catalog';
const contexts = inventory.contexts as CatalogContext[];

describe('model-specific workshop source selections', () => {
  it('keeps an indexed year/body where available, without changing the catalog identity', () => {
    const sedan = contexts.find(c => c.model_id === '540i' && c.model_year === 1994)!;
    expect(catalogForModel(contexts, '530i', sedan)?.id).toBe('e34-context-6d5a38bb69a703fc6ba90c73');
    expect(catalogForModel(contexts, '535i', sedan)?.model_year).toBe(1993);
    expect(catalogForModel(contexts, '518i', sedan)).toBeUndefined();
    expect(catalogForModel(contexts, '530i', { ...sedan, model_year: 1995 })?.body).toBe('Sedan');
    const touring = contexts.find(c => c.model_id === '530i' && c.model_year === 1994 && c.body === 'Touring')!;
    expect(catalogForModel(contexts, '530i', touring)?.id).toBe(touring.id);
  });
  it('retains shareable exact source assembly and manual selection while stripping private context', () => {
    const href = catalogBrowseHref('/workshop', { context: 'source', assembly: 'gearbox', position: 'callout', transmission: 'manual', category: 'Manual Transmission' });
    const shared = new URL(publicShareUrl(href + '&vehicle=private-car&scan=private-scan')!);
    expect(shared.searchParams.get('tab')).toBe('diagrams');
    expect(shared.searchParams.get('transmission')).toBe('manual');
    expect(shared.searchParams.get('assembly')).toBe('gearbox');
    expect(shared.searchParams.get('position')).toBe('callout');
    expect(shared.searchParams.has('vehicle')).toBe(false);
    expect(shared.searchParams.has('scan')).toBe(false);
    expect(publicShareUrl('/parts/catalog?transmission=secret')).not.toContain('secret');
  });
});

describe('transmission diagram browsing is separate from fitment', () => {
  it('does not mistake speed counts on an automatic for a manual gearbox', () => {
    expect(transmissionView('5-speed automatic')).toBe('automatic');
    expect(transmissionView('6 speed manual')).toBe('manual');
    expect(transmissionView('unknown')).toBe('all');
    expect(transmissionView('Automatic')).toBe('automatic');
  });
  it('hides explicit opposite assemblies while retaining shared and uncertain source records', () => {
    expect(assemblyInTransmission({ source_category: 'Automatic Transmission', title: 'Oil pan' }, 'manual')).toBe(false);
    expect(assemblyInTransmission({ source_category: 'Manual Transmission', title: 'Gearbox mounting' }, 'automatic')).toBe(false);
    expect(assemblyTransmission({ source_category: 'Gearshift / Clutch', title: 'Gear Shift Parts, Automatic Gearbox' })).toBe('automatic');
    expect(assemblyTransmission({ source_category: 'Gearshift / Clutch', title: 'Gearshift, Mechanical Transmission' })).toBe('manual');
    expect(assemblyInTransmission({ source_category: 'Gearshift / Clutch', title: 'Gearshift Knobs / Coverings / Plaques' }, 'automatic')).toBe(true);
    expect(assemblyInTransmission({ source_category: 'Engine', title: 'Water Pump' }, 'manual')).toBe(true);
  });
});

describe.skipIf(!hasReleasePack)('actual retained manual transmission source diagrams', () => {
  type Page = { category: string; title: string; source_url: string; parts: { number: string }[]; drawings: unknown[] };
  for (const [model, id, title] of [
    ['530i', 'e34-context-6d5a38bb69a703fc6ba90c73', 'Manual Gearbox S5D'],
    ['535i', 'e34-context-1ba53095854942cf2890f723', 'Manual Gearbox'],
    ['540i', 'e34-context-27e34e4ee0bc455bc6555af7', 'Manual Gearbox S6S 420G'],
  ]) {
    it(`${model} has its own source gearbox and internal diagrams with canonical numbers`, () => {
      const pages = gunzipSync(readFileSync(catalogSnapshot(`${id}.jsonl.gz`))).toString().trim().split('\n').map(s => JSON.parse(s) as Page);
      const manual = pages.filter(p => p.category === 'Manual Transmission');
      expect(manual.length).toBeGreaterThanOrEqual(6);
      expect(manual.some(p => p.title === title && p.drawings.length > 0)).toBe(true);
      for (const p of manual) {
        expect(p.source_url).toContain(`-bmw-${model.toLowerCase()}`);
        expect(p.drawings.length).toBeGreaterThan(0);
        expect(p.parts.some(r => /^\d{11}$/.test(r.number))).toBe(true);
        expect(assemblyInTransmission({ source_category: p.category, title: p.title }, 'manual')).toBe(true);
      }
    });
  }
});
