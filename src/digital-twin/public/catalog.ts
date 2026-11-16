import {sha256Hex} from "../../graphics/sha256";
import {catalogPositionAllowed} from "../../lib/catalog-integrity";
import { z } from 'zod';
import data from '../../../data/digital-twin/component-catalog.json';
import type { ReferenceModel, ReferenceNode } from './model';
export type ManualLink = {
    chapter: string;
    page: number;
    title: string;
    href: string;
    printed: string;
    pdf: number;
    guides: string[];
    kind?: "wiring";
};
export type CatalogBinding = {
    nodeId: string;
    title: string;
    kind: 'component' | 'assembly' | 'supplied-with' | 'set' | 'reference';
    note: string;
    assemblyIds: string[];
    positions: {
        assemblyId: string;
        id: string;
        number: string;
        partId: string;
    }[];
    manual: ManualLink[];
    guideIds: string[];
    visualSources?: {title:string;url:string}[];
};
export type CatalogAssembly = {
    id: string;
    title: string;
    category: string;
    key: string;
    contextId: string;
    sourceUrl: string;
    sourceSha256: string;
    itemCount: number;
    systemIds: string[];
    manual: ManualLink[];
    url: string;
    sha256: string;
    bytes: number;
};
export type CatalogIndex = {
    schemaVersion: 1;
    modelId: string;
    modelRevision: number;
    context: {
        id: string;
        name: string;
        scope: string;
    };
    bindings: Record<string, CatalogBinding>;
    assemblies: Record<string, CatalogAssembly>;
    systems: Record<string, string[]>;
    guides: Record<string, {
        title: string;
        kind: string;
        status: string;
        sourceChecked: boolean;
    }>;
    search: {
        url: string;
        sha256: string;
        bytes: number;
    };
    coverage: {
        renderable: number;
        bound: number;
        withCandidates: number;
        sourcePages: number;
        expectedPages: number;
        sourcePositions: number;
        distinctNumbers: number;
    };
};
/** Keep immutable source receipts intact; applicability-child parser rows are
 * source notes, never ordering choices in the runtime workspace. */
export function visibleCatalogIndex(index: CatalogIndex): CatalogIndex {
 return {...index,bindings:Object.fromEntries(Object.entries(index.bindings).map(([id,binding])=>[id,{...binding,positions:binding.positions.filter(position=>catalogPositionAllowed(position.id))}]))};
}
const manualSchema=z.object({chapter:z.string(),page:z.number(),title:z.string(),href:z.string().refine(href=>(href.startsWith("/")&&!href.startsWith("//"))||href.startsWith("https://")),printed:z.string(),pdf:z.number(),guides:z.array(z.string()),kind:z.literal("wiring").optional()});
const bindingSchema=z.object({nodeId:z.string(),title:z.string(),kind:z.enum(['component','assembly','supplied-with','set','reference']),note:z.string(),assemblyIds:z.array(z.string()).max(100),positions:z.array(z.object({assemblyId:z.string(),id:z.string(),number:z.string().regex(/^\d{11}$/),partId:z.string()})).max(5000),manual:z.array(manualSchema),guideIds:z.array(z.string()),visualSources:z.array(z.object({title:z.string().max(160),url:z.string().url().startsWith('https://')})).max(6).optional()});
const assemblySchema=z.object({id:z.string(),title:z.string(),category:z.string(),key:z.string(),contextId:z.string(),sourceUrl:z.string().url(),sourceSha256:z.string().regex(/^[a-f0-9]{64}$/),itemCount:z.number(),systemIds:z.array(z.string()),manual:z.array(manualSchema),url:z.string(),sha256:z.string(),bytes:z.number()});
export const catalogIndexSchema=z.object({schemaVersion:z.literal(1),modelId:z.string(),modelRevision:z.number(),context:z.object({id:z.string(),name:z.string(),scope:z.string()}),bindings:z.record(z.string(),bindingSchema),assemblies:z.record(z.string(),assemblySchema),systems:z.record(z.string(),z.array(z.string())),guides:z.record(z.string(),z.object({title:z.string(),kind:z.string(),status:z.string(),sourceChecked:z.boolean()})),search:z.object({url:z.string(),sha256:z.string(),bytes:z.number()}),coverage:z.object({renderable:z.number(),bound:z.number(),withCandidates:z.number(),sourcePages:z.number(),expectedPages:z.number(),sourcePositions:z.number(),distinctNumbers:z.number()})}).transform(visibleCatalogIndex);
export const componentCatalog = visibleCatalogIndex(data as unknown as CatalogIndex);
const condition = z.object({ name: z.string().max(100), value: z.string().max(2000) });
export const catalogItemSchema = z.object({ id: z.string().max(150), partId: z.string().max(150), number: z.string().regex(/^\d{11}$/), name: z.string().max(240), reference: z.string().max(40), quantity: z.number().int().nonnegative().nullable(), packageQuantity: z.number().int().nonnegative().nullable(), conditions: z.array(condition).max(40), replacedBy: z.array(z.string().regex(/^\d{11}$/)).max(100), recordHash: z.string().regex(/^[a-f0-9]{64}$/) });
export const catalogPageSchema = z.object({ schemaVersion: z.literal(1), contextId: z.string(), assemblyId: z.string(), title: z.string().max(240), sourceUrl: z.string().url(), sourceSha256: z.string().regex(/^[a-f0-9]{64}$/), sourceSelection: z.string().max(300), sourceConditions: z.string().max(1000), unselectedOptions: z.string().max(500), items: z.array(catalogItemSchema).max(1000) });
export type CatalogPage = z.infer<typeof catalogPageSchema>;
export type CatalogItem = z.infer<typeof catalogItemSchema>;
export type CatalogChoice = CatalogItem & {
    assemblyId: string;
    contextId: string;
};
const cache = new Map<string, CatalogPage>();
async function checkedJSON(asset: {
    url: string;
    sha256: string;
    bytes: number;
}, signal?: AbortSignal) { if (!/^\/catalog\/workshop\/[a-z0-9-]{1,80}\/r[1-9]\d*\/[a-f0-9]{64}\.json$/.test(asset.url) || asset.bytes > 4 * 1024 * 1024)
    throw Error('Invalid catalog reference'); const response = await fetch(asset.url, { signal }); if (!response.ok)
    throw Error('Catalog reference could not load.'); const bytes = await response.arrayBuffer(); if (bytes.byteLength !== asset.bytes)
    throw Error('Incomplete catalog reference'); const digest = await sha256Hex(bytes); if (digest !== asset.sha256)
    throw Error('Catalog reference version mismatch'); return JSON.parse(new TextDecoder().decode(bytes)); }
export async function loadCatalogPage(id: string, signal?: AbortSignal, index: CatalogIndex = componentCatalog) { const asset = index.assemblies[id]; if (!asset)
    throw Error('Unknown catalog assembly'); const key=asset.sha256; if (cache.has(key))
    return cache.get(key)!; const p = catalogPageSchema.parse(await checkedJSON(asset, signal)); if (p.contextId !== index.context.id || p.assemblyId !== id || p.sourceSha256 !== asset.sourceSha256 || p.items.some(i => !i.id.startsWith(id + '-')))
    throw Error('Mismatched source reference'); if (cache.size >= 24)
    cache.delete(cache.keys().next().value!); const visible={...p,items:p.items.filter(item=>catalogPositionAllowed(item.id))}; cache.set(key, visible); return visible; }
const searchItem = z.object({ number: z.string().regex(/^\d{11}$/), name: z.string().max(240), partId: z.string().max(150), assemblyId: z.string(), positionId: z.string() });
export type CatalogSearchItem = z.infer<typeof searchItem>;
const searchCache=new Map<string,CatalogSearchItem[]>();
export async function loadCatalogSearch(signal?:AbortSignal,index:CatalogIndex=componentCatalog){
 const key=index.search.sha256;if(searchCache.has(key))return searchCache.get(key)!;
 const parsed=z.object({schemaVersion:z.literal(1),contextId:z.string(),items:z.array(searchItem).max(20000)}).parse(await checkedJSON(index.search,signal));
 if(parsed.contextId!==index.context.id||parsed.items.some(i=>!index.assemblies[i.assemblyId]||!i.positionId.startsWith(i.assemblyId+'-')))throw Error('Invalid catalog search identities');
 if(searchCache.size>=6)searchCache.delete(searchCache.keys().next().value!);const visible=parsed.items.filter(item=>catalogPositionAllowed(item.positionId));searchCache.set(key,visible);return visible;
}
export function catalogHref(assemblyId: string, positionId?: string, index: CatalogIndex = componentCatalog) { return '/parts/catalog?' + new URLSearchParams({ context: index.context.id, assembly: assemblyId, ...(positionId ? { position: positionId } : {}) }).toString(); }
export const bindingFor = (id: string,index:CatalogIndex=componentCatalog) => index.bindings[id];
export function catalogModelMatches(n: ReferenceNode, q: string,index:CatalogIndex=componentCatalog) { const b = bindingFor(n.id,index); if (!b)
    return false; const clean = (s: string) => s.toLowerCase().replaceAll(/[^a-z0-9]/g, ''); const text = clean(q); return clean(b.title).includes(text) || b.positions.some(p => clean(p.number).includes(text) || clean(p.partId) === text); }
export function findCatalogNode(m: ReferenceModel, value?: string, position?: string) {
 if(!value&&!position)return null;
 const clean=(value||'').replaceAll(/[^a-z0-9]/gi,'').toLowerCase(),number=clean.startsWith('bmw')?clean.slice(3):clean,index=m.catalog||componentCatalog;
 const matching=m.nodes.filter(n=>bindingFor(n.id,index)?.positions.some(p=>position?p.id===position:p.partId===value||p.number===number));
 return matching.find(n=>n.canonicalId===value||!!n.oem&&n.oem===number)
  ||matching.find(n=>bindingFor(n.id,index)?.kind==='component')
  ||matching[0]||null;
}
export function catalogProcedures(partId: string, positionId?: string, assemblyId?: string, partNumber?: string,index:CatalogIndex=componentCatalog) { const matches = Object.values(index.bindings).filter(b => b.positions.some(p => positionId ? p.id === positionId : p.partId === partId || p.number === (partNumber || /^bmw-(\d{11})$/.exec(partId)?.[1]))).sort((a,b)=>Number(b.kind==='component')-Number(a.kind==='component')), manual = matches.length ? matches.flatMap(b => b.manual) : assemblyId ? index.assemblies[assemblyId]?.manual || [] : []; return { nodes: matches.map(b => b.nodeId), guides: [...new Set([...matches.flatMap(b => b.guideIds), ...manual.flatMap(m => m.guides)])], manual: [...new Map(manual.map(m => [m.href, m])).values()] }; }
export function initialCatalogChoice(binding: CatalogBinding, rows: CatalogChoice[], position?: string, oem?: string) { if (position && binding.positions.some(p => p.id === position)) {
    const r = rows.find(r => r.id === position);
    if (r)
        return r.id;
} if (oem) {
    const r = rows.find(r => r.number === oem);
    if (r)
        return r.id;
} const numbers = new Set(rows.map(r => r.number)); return numbers.size === 1 ? rows[0]?.id || '' : ''; }
