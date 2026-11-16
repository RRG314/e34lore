import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { componentCatalog as c, bindingFor, catalogPageSchema, catalogHref, initialCatalogChoice, catalogProcedures, findCatalogNode, loadCatalogPage, loadCatalogSearch } from '../src/digital-twin/public/catalog';
import { parseReference } from '../src/digital-twin/public/model';
import { publicShareUrl } from '../src/domain/identity';
import release from '../data/digital-twin/public-reference.json';
import rules from '../data/digital-twin/component-catalog-rules.json';
import exclusions from '../data/catalog-position-exclusions.json';
import snapshot from '../data/catalog-snapshots/e34-context-b69b1a9062bd8352b127fef1.manifest.json';
const m = parseReference(JSON.parse(fs.readFileSync('public' + release.manifestUrl, 'utf8'))), sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');
type SourcePage={source_url:string;source_sha256:string;parts:{number:string;record_hash:string;conditions:{name:string;value:string}[];quantity:number|null;package_quantity:number|null;replaced_by:string[]}[]};
const facts: SourcePage[] = gunzipSync(fs.readFileSync('data/catalog-snapshots/' + snapshot.file)).toString().trim().split('\n').map(s => JSON.parse(s));
const pages = new Map(Object.entries(c.assemblies).map(([id, a]) => [id, catalogPageSchema.parse(JSON.parse(fs.readFileSync('public' + a.url, 'utf8')))]));
const choices = (id: string) => bindingFor(id).positions.map(p => ({ ...pages.get(p.assemblyId)!.items.find(i => i.id === p.id)!, assemblyId: p.assemblyId, contextId: c.context.id }));
afterEach(() => vi.unstubAllGlobals());
describe('source-bound whole-car catalog', () => {
    it('maps every renderable exactly once with source positions and actual service locators', () => { expect(c.coverage).toMatchObject({ renderable: release.renderableCount, bound: release.renderableCount, withCandidates: release.renderableCount, sourcePages: 397, expectedPages: 397, sourcePositions: 10183, distinctNumbers: 8233 }); expect(c.modelRevision).toBe(m.revision); for (const n of m.nodes.filter(n => n.assetId)) {
        expect(rules.rules.filter(r => new RegExp(r.pattern).test(n.id)), n.id).toHaveLength(1);
        const b = bindingFor(n.id);
        expect(b.positions.length, n.id).toBeGreaterThan(0);
        expect(b.manual.length, n.id).toBeGreaterThan(0);
        for (const p of b.positions) {
            const row = pages.get(p.assemblyId)!.items.find(i => i.id === p.id);
            expect(row?.number, n.id).toBe(p.number);
            expect(row?.partId).toBe(p.partId);
        }
        for (const ref of b.manual) {
            expect(ref.href).toMatch(/^\/manual\/\d{3}#/);
            expect(ref.pdf).toBeGreaterThan(0);
        }
        for (const id of b.guideIds)
            expect(c.guides[id]).toBeTruthy();
    } });
    it('ships exactly the pinned public facts, including restrictions, quantities and replacements', () => { expect(c.context.id + '.jsonl.gz').toBe(snapshot.file); expect(facts).toHaveLength(397); const source = new Map(facts.map(p => [p.source_url, p])); let count = 0; for (const [id, a] of Object.entries(c.assemblies)) {
        const bytes = fs.readFileSync('public' + a.url), p = pages.get(id)!, f = source.get(p.sourceUrl)!;
        expect(bytes.length).toBe(a.bytes);
        expect(sha(bytes)).toBe(a.sha256);
        expect(p.contextId).toBe(c.context.id);
        expect(p.sourceSha256).toBe(f.source_sha256);
        const sourceItems = f.parts.filter((r) => !exclusions.excludedPositions.includes(id + '-' + r.record_hash.slice(0,24)));
        expect(p.items).toHaveLength(sourceItems.length);
        expect(p.items.every(i => !exclusions.excludedPositions.includes(i.id))).toBe(true);
        for (const item of p.items) {
            const r = f.parts.find((r) => r.record_hash === item.recordHash)!;
            expect(item.id).toBe(id + '-' + r.record_hash.slice(0, 24));
            expect(item.conditions).toEqual(r.conditions);
            expect(item.quantity).toBe(r.quantity);
            expect(item.packageQuantity).toBe(r.package_quantity);
            expect(item.replacedBy).toEqual(r.replaced_by);
        }
        count += p.items.length;
    } expect(count).toBe(10183); expect(fs.readdirSync('public/catalog/workshop/525i-sedan-1995/r2')).toHaveLength(398); });
    it('includes radiators and exhausts in their actual functional systems, with all source pages accessible',()=>{const radiator=Object.values(c.assemblies).find(a=>a.key.endsWith('/radiator'))!;expect(c.systems['system:cooling']).toContain(radiator.id);const exhaust=Object.values(c.assemblies).find(a=>a.key.endsWith('/exhaust_system'))!;expect(c.systems['system:exhaust']).toContain(exhaust.id);expect(Object.keys(c.assemblies)).toHaveLength(397);});
    it('preserves curated identities and keeps left/right alternatives on their source side', () => { expect(choices('m50:water-pump').some(r => r.partId === 'coolant-pump')).toBe(true); expect(choices('m50:thermostat-housing').some(r => r.partId === 'thermostat-housing')).toBe(true); for (const side of ['left', 'right']) {
        const b = bindingFor('e34body:front-fender-' + side);
        expect(choices(b.nodeId).filter(r => /side panel/.test(r.name.toLowerCase())).every(r => r.name.toLowerCase().includes(side))).toBe(true);
    } expect(bindingFor('m50:water-pump-impeller').kind).toBe('supplied-with'); expect(bindingFor('m50:intake-runner:1').kind).toBe('supplied-with'); });
    it('separates complete mirrors and inner rear lamps from adjacent body panels', () => {
        for (const side of ['left', 'right']) {
            const mirror = choices('e34body:mirror-' + side);
            expect(mirror.length).toBeGreaterThan(0);
            expect(mirror.every(p => p.name === 'Electr.exterior heatable mirror ' + side)).toBe(true);
            const inner = choices('e34body:trunk-lamp-' + side);
            const outer = choices('e34body:tail-light-' + side);
            expect(inner.length).toBeGreaterThan(0);
            expect(inner.every(p => p.name === 'Rear light in trunk lid, ' + side)).toBe(true);
            expect(outer.every(p => p.name === 'Rear light in the side panel, ' + side)).toBe(true);
            expect(bindingFor('e34body:trunk-lamp-' + side).manual.length).toBeGreaterThan(0);
            expect(bindingFor('e34body:trunk-lamp-' + side).guideIds).toEqual([]);
        }
    });
    it('requires a choice when different part numbers are listed, and refuses unrelated supplied positions', () => { const b = bindingFor('m50:thermostat'), rows = choices(b.nodeId); expect(new Set(rows.map(r => r.number)).size).toBeGreaterThan(1); expect(initialCatalogChoice(b, rows)).toBe(''); expect(initialCatalogChoice(b, rows, 'unrelated-position')).toBe(''); expect(initialCatalogChoice(b, rows, rows[1].id)).toBe(rows[1].id); expect(initialCatalogChoice(b, rows, undefined, rows[0].number)).toBe(rows[0].id); });
    it('round-trips exact catalog positions, model links, manual references and safe public sharing', () => { const b = bindingFor('m50:water-pump'), p = b.positions[0], u = new URL(catalogHref(p.assemblyId, p.id), 'https://e34lore.com'); expect(u.searchParams.get('context')).toBe(c.context.id); expect(u.searchParams.get('position')).toBe(p.id); expect(findCatalogNode(m, p.partId, p.id)?.id).toBe(b.nodeId); const related = catalogProcedures(p.partId, p.id, p.assemblyId); expect(related.nodes).toContain(b.nodeId); expect(related.manual.length).toBeGreaterThan(0); expect(related.guides).toContain('m50-water-pump-job-planning'); const shared = publicShareUrl('/workshop?node=m50%3Awater-pump&catalog_position=' + p.id + '&access_token=private'); expect(shared).toContain('catalog_position=' + p.id); expect(shared).not.toContain('access_token'); });
    it('verifies fetched bytes and refuses altered, incomplete or cross-context catalog data', async () => { const a = Object.values(c.assemblies)[0], valid = fs.readFileSync('public' + a.url); vi.stubGlobal('fetch', vi.fn(async () => new Response(valid))); expect((await loadCatalogPage(a.id)).assemblyId).toBe(a.id); const other = Object.values(c.assemblies)[1]; vi.stubGlobal('fetch', vi.fn(async () => new Response('{}'))); await expect(loadCatalogPage(other.id)).rejects.toThrow('Incomplete'); vi.stubGlobal('fetch', vi.fn(async () => new Response(fs.readFileSync('public' + c.search.url)))); expect((await loadCatalogSearch()).length).toBeGreaterThan(8233); });
});
