/** Compile authored component links against immutable factual source snapshots.
 * Images, source HTML, prices and account data are never published here. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { parts } from '../src/data/catalog.ts';
import { manualJobs } from '../src/data/manual-jobs.ts';
import { manualChapters, manualGuides } from '../src/data/manual.ts';
import { partGuideIds } from '../src/data/guide-parts.ts';
import type {CatalogAssembly,CatalogBinding,CatalogItem,CatalogSearchItem,ManualLink} from '../src/digital-twin/public/catalog';
import type {ReferenceModel} from '../src/digital-twin/public/model';
type SourcePart={number:string;name:string;reference:string;quantity:number|null;package_quantity:number|null;conditions:{name:string;value:string}[];replaced_by:string[];record_hash:string};
type SourcePage={category:string;title:string;source_url:string;source_sha256:string;source_vehicle_label:string;source_conditions:string;unselected_options:string;parts:SourcePart[]};
type SourceSnapshot={file:string;compressed_sha256:string;manifest:{facts_sha256:string;expected_pages:number;scope:string}};
type ComponentRule={pattern:string;title:string;kind:CatalogBinding['kind'];note:string;selectors:{page:string;match:string}[];manual:Pick<ManualLink,'chapter'|'page'>[];manualOnly?:boolean};
type MappedPage=SourcePage&{id:string;items:CatalogItem[];key:string};
type MissingSelection={nodeId:string;page:string;missingPage:true}|{nodeId:string;page:string;match:string;available:string[]};
type PartRelation={nodeIds:string[];guides:string[];manual:ManualLink[]};
const snapshotPath = 'data/catalog-snapshots/e34-context-b69b1a9062bd8352b127fef1.manifest.json';
const snapshot:SourceSnapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
const compressed = await fs.readFile(path.join(path.dirname(snapshotPath), snapshot.file));
const factsBytes = gunzipSync(compressed), sourceManifest = snapshot.manifest;
if (crypto.createHash('sha256').update(compressed).digest('hex') !== snapshot.compressed_sha256 || crypto.createHash('sha256').update(factsBytes).digest('hex') !== sourceManifest.facts_sha256)
    throw Error('Source snapshot checksum mismatch');
const facts:SourcePage[] = factsBytes.toString('utf8').trim().split('\n').map(s => JSON.parse(s));
const correctionBytes = await fs.readFile('data/catalog-position-exclusions.json');
const corrections:{excludedPositions:string[]} = JSON.parse(correctionBytes.toString());
const excludedPositions = new Set(corrections.excludedPositions);
const aliases = Object.fromEntries(parts.filter(p => p.number).map(p => [p.number!.replace(/\D/g, ''), p.id]));
const canonical = Object.fromEntries(facts.flatMap(p => p.parts.map((item) => [item.number, aliases[item.number] || 'bmw-' + item.number])));
const release:{manifestUrl:string} = JSON.parse(await fs.readFile('data/digital-twin/public-reference.json', 'utf8'));
const model:Pick<ReferenceModel,'id'|'revision'|'nodes'> = JSON.parse(await fs.readFile('public' + release.manifestUrl, 'utf8'));
const rules:ComponentRule[] = JSON.parse(await fs.readFile('data/digital-twin/component-catalog-rules.json', 'utf8')).rules;
const hash = (s: string | Uint8Array) => crypto.createHash('sha256').update(s).digest('hex');
const stable = (prefix: string, s: string) => prefix + '-' + hash(s).slice(0, 24);
const contextId = snapshot.file.replace('.jsonl.gz', '');
const base = '/catalog/workshop/525i-sedan-1995/r2';
await fs.mkdir('public' + base, { recursive: true });
async function publish(data: unknown) { const bytes = JSON.stringify(data), sha256 = hash(bytes), url = base + '/' + sha256 + '.json'; try {
    if (await fs.readFile('public' + url, 'utf8') !== bytes)
        throw Error('Immutable content conflict');
}
catch (e: unknown) {
    if (!(e instanceof Error && 'code' in e && e.code === 'ENOENT'))
        throw e;
    await fs.writeFile('public' + url, bytes, { flag: 'wx' });
} return { url, sha256, bytes: Buffer.byteLength(bytes) }; }
function manual(chapter: string, page: number) { const c = manualChapters.find(c => c.id === chapter), jobs = manualJobs(chapter), job = jobs.find(j => j.page === page); if (!c || !job)
    throw Error('Unknown manual locator ' + chapter + '-' + page); return { chapter, page, title: job.title, href: '/manual/' + chapter + '#' + job.anchor, printed: chapter + '-' + page, pdf: c.pdfStart + page - 1, guides: job.guide ? [job.guide] : [] }; }
const defaultManual: Record<string, [
    string,
    number
]> = { engine: ['100', 1], lubrication: ['119', 1], cooling: ['170', 1], intake: ['130', 18], fuel: ['160', 1], exhaust: ['180', 1], transmission: ['200', 2], driveshaft: ['260', 4], differential: ['331', 1], suspension: ['300', 1], steering: ['320', 5], braking: ['340', 3], electrical: ['600', 3], hvac: ['640', 1], interior: ['400', 2], body: ['400', 1], exterior: ['510', 1], lighting: ['630', 1], safety: ['720', 1] };
function systemsFor(page: SourcePage) { const category = page.category.toLowerCase(), slug = page.source_url.split('/').at(-1)!.replace('.html', ''); if (category === 'engine') {
    if (/oil_|lubrication/.test(slug))
        return ['lubrication'];
    if (/cooling|water_pump/.test(slug))
        return ['cooling'];
    if (/intake/.test(slug))
        return ['intake'];
    if (/exhaust/.test(slug))
        return ['exhaust'];
    return ['engine'];
} if(category==='cooling / exhaust system')return /exhaust|catalytic|silencer/.test(slug)?['exhaust']:/transmission/.test(slug)?['cooling','transmission']:['cooling'];
if(category.includes('cruise control'))return ['electrical'];
if (/engine electrical|vehicle electrical|audio/.test(category))
    return ['electrical']; if (category.includes('fuel'))
    return [/intake|mass_air|throttle/.test(slug) ? 'intake' : 'fuel']; if (category.includes('brake'))
    return ['braking']; if (category.includes('steering'))
    return [/drive_shaft/.test(slug) ? 'driveshaft' : 'steering']; if (category.includes('front / rear axle'))
    return [/differential|final_drive|drive_flange/.test(slug) ? 'differential' : 'suspension']; if (category.includes('transmission') || category.includes('gearshift'))
    return ['transmission']; if (category.includes('heater'))
    return ['hvac']; if (category.includes('lighting'))
    return ['lighting']; if (category.includes('restraint'))
    return ['safety']; if (category.includes('seats') || category.includes('instruments'))
    return ['interior']; if (category === 'bodywork')
    return ['body', 'exterior']; if (category === 'vehicle trim')
    return [/floor|dashboard|interior|console|glove|sun_visor|roof_trim|rear_window_shelf|door_trim/.test(slug) ? 'interior' : 'exterior']; if (category === 'wheels')
    return ['suspension']; if (category.includes('sliding roof'))
    return ['body']; return []; }
const pageMap = new Map<string, MappedPage>(), byLeaf = new Map<string, MappedPage[]>(), assemblies: Record<string, CatalogAssembly> = {}, systems: Record<string, string[]> = {};
const missingNumbers = new Set<string>(), searchRows: CatalogSearchItem[] = [], partRelations: Record<string, PartRelation> = {};
for (const page of facts) {
    const segments = new URL(page.source_url).pathname.split('/'), key = segments.slice(-2).join('/').replace('.html', ''), leaf = segments.at(-1)!.replace('.html', '');
    const id = stable('catalog-assembly', page.source_url), systemIds = systemsFor(page).map(s => 'system:' + s), locators = systemIds.map(id => manual(...defaultManual[id.slice(7)]));
    const items = page.parts.filter((p) => !excludedPositions.has(id + '-' + p.record_hash.slice(0, 24))).map((p) => { const partId = canonical[p.number]; if (!partId)
        missingNumbers.add(p.number); const positionId = id + '-' + p.record_hash.slice(0, 24); return { id: positionId, partId: partId || 'bmw-' + p.number, number: p.number, name: p.name, reference: p.reference, quantity: p.quantity, packageQuantity: p.package_quantity, conditions: p.conditions, replacedBy: p.replaced_by, recordHash: p.record_hash }; });
    const data = { schemaVersion: 1, contextId, assemblyId: id, title: page.title, sourceUrl: page.source_url, sourceSha256: page.source_sha256, sourceSelection: page.source_vehicle_label, sourceConditions: page.source_conditions, unselectedOptions: page.unselected_options, items };
    const asset = await publish(data);
    assemblies[id] = { id, title: page.title, category: page.category, key, contextId, sourceUrl: page.source_url, sourceSha256: page.source_sha256, itemCount: items.length, systemIds, manual: locators, ...asset };
    const mapped = { ...page, id, items, key };
    pageMap.set(key, mapped);
    byLeaf.set(leaf, [...byLeaf.get(leaf) || [], mapped]);
    for (const sys of systemIds)
        systems[sys] = [...systems[sys] || [], id];
    for (const item of items)
        searchRows.push({ number: item.number, name: item.name, partId: item.partId, assemblyId: id, positionId: item.id });
}
const bindings: Record<string, CatalogBinding> = {}, unmapped: string[] = [], empty: MissingSelection[] = [], usedRules = new Set<number>();
for (const node of model.nodes.filter((n) => n.assetId)) {
    const found = rules.map((rule, i: number) => ({ rule, i })).filter(({ rule }) => new RegExp(rule.pattern).test(node.id));
    if (found.length !== 1) {
        unmapped.push(node.id + ': ' + found.length + ' rules');
        continue;
    }
    const { rule, i } = found[0];
    usedRules.add(i);
    const positions: CatalogBinding['positions'] = [], assemblyIds: string[] = [];
    for (const selector of rule.selectors) {
        const pages = selector.page.includes('/') ? [pageMap.get(selector.page)].filter((page):page is MappedPage=>Boolean(page)) : byLeaf.get(selector.page) || [];
        if (pages.length > 1)
            throw Error('Ambiguous source page ' + selector.page);
        if (!pages.length) {
            empty.push({ nodeId: node.id, page: selector.page, missingPage: true });
            continue;
        }
        const p = pages[0];
        assemblyIds.push(p.id);
        const matches = p.items.filter((item) => new RegExp(selector.match, 'i').test(item.name));
        positions.push(...matches.map((item) => ({ assemblyId: p.id, id: item.id, number: item.number, partId: item.partId })));
        if (!matches.length)
            empty.push({ nodeId: node.id, page: selector.page, match: selector.match, available: [...new Set(p.items.map((x) => x.name))] });
    }
    const locators = rule.manual.map((r) => {const link=manual(r.chapter,r.page);return rule.manualOnly?{...link,guides:[]}:link;});
    const guideIds = [...new Set([...locators.flatMap((r) => r.guides), ...node.guideIds, ...(node.canonicalId?partGuideIds[node.canonicalId]||[]:[])])];
    for (const id of guideIds)
        if (!manualGuides.some(g => g.slug === id))
            throw Error('Unknown guide ' + id);
    const title = rule.title, items = [...new Map(positions.map(p => [p.id, p])).values()];
    bindings[node.id] = { nodeId: node.id, title, kind: rule.kind, note: rule.note, assemblyIds: [...new Set(assemblyIds)], positions: items, manual: locators, guideIds };
    for (const item of items) {
        const old = partRelations[item.partId] || { nodeIds: [], guides: [], manual: [] };
        old.nodeIds = [...new Set([...old.nodeIds, node.id])];
        old.guides = [...new Set([...old.guides, ...guideIds])];
        old.manual = [...new Map([...old.manual, ...locators].map((m) => [m.href, m])).values()];
        partRelations[item.partId] = old;
    }
}
const dedupSearch = [...new Map(searchRows.map(p => [p.number + '|' + p.assemblyId, p])).values()];
const search = await publish({ schemaVersion: 1, contextId, items: dedupSearch });
const guides = Object.fromEntries(manualGuides.map(g => [g.slug, { title: g.title, kind: g.kind, status: g.reviewStatus, sourceChecked: g.sourceChecked }]));
const coverage = { renderable: model.nodes.filter((n) => n.assetId).length, bound: Object.keys(bindings).length, withCandidates: Object.values(bindings).filter((b) => b.positions.length).length, suppliedWith: Object.values(bindings).filter((b) => b.kind === 'supplied-with').length, sourcePages: facts.length, expectedPages: sourceManifest.expected_pages, sourcePositions: searchRows.length, distinctNumbers: new Set(searchRows.map(x => x.number)).size, unmapped, empty, missingNumbers: [...missingNumbers], unusedRules: rules.map((_, i: number) => i).filter((i: number) => !usedRules.has(i)) };
const result = { schemaVersion: 1, id: 'e34-525i-sedan-1995-component-catalog', modelId: model.id, modelRevision: model.revision, context: { id: contextId, name: '1995 525i Sedan', model: '525i', body: 'Sedan', year: 1995, productionMonth: null, scope: sourceManifest.scope }, sourceFactsSha256: sourceManifest.facts_sha256, applicabilityReviewSha256: hash(correctionBytes), bindings, assemblies, systems, guides, search, coverage };
if (unmapped.length || empty.length || missingNumbers.size || facts.length !== sourceManifest.expected_pages || coverage.bound !== coverage.renderable)
    throw Error('Incomplete component catalog: ' + JSON.stringify(coverage));
await fs.writeFile('data/digital-twin/component-catalog.json', JSON.stringify(result, null, 2) + '\n');
await fs.writeFile('data/digital-twin/component-part-relations.json', JSON.stringify(partRelations) + '\n');
console.log({ modelRevision: model.revision, contextId, bindings: coverage.bound, candidates: coverage.withCandidates, sourcePages: coverage.sourcePages, numbers: coverage.distinctNumbers, unmapped: unmapped.length, empty: empty.length, missingNumbers: missingNumbers.size });
