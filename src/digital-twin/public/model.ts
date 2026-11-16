import {companionIds} from './explosion';
import { z } from 'zod';
import {catalogIndexSchema} from './catalog';
import {isWiringScope, wiringAsset} from '../../data/wiring-routes';
const vec = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
export const automaticGearboxScope = 'system:automatic-gearbox';
export const manualGearboxScope = 'system:manual-gearbox';
export const isGearboxInspection = (scope: string) => scope === automaticGearboxScope || scope === manualGearboxScope;
export const engineBayScope = 'system:engine-bay';
export const brakeHydraulicsScope = 'system:brake-hydraulics';
export const frontSuspensionScope = 'system:front-suspension';
export const rearSuspensionScope = 'system:rear-suspension';
export const bodyTrimScope = 'system:body-trim';
const hvacServiceScopes = ['system:hvac-box','system:hvac-blower','system:hvac-vents'] as const;
export const isHvacServiceScope = (scope: string) => hvacServiceScopes.some(id=>id===scope);
export const isHvacInspection = (scope: string) => scope==='system:hvac' || isHvacServiceScope(scope);
export const isCabinTrimInspection = (scope: string) => isHvacInspection(scope) || /^system:(?:luggage-trim|rear-seat-trim|front-seat-(?:left|right)|dashboard-trim|door-trim-(?:front|rear)-(?:left|right)|headliner-trim|pillar-trim|sunroof-trim|carpet-trim|center-console|(?:front|rear)-seat-belts)$/.test(scope);
export const engineInspectionScopes = ['system:m50-engine','system:m50-short-block','system:m50-head','system:m50-timing','system:m50-oil'];
export const isEngineInspection = (scope:string) => engineInspectionScopes.includes(scope);
const nodeSchema = z.object({ id: z.string().min(1).max(240), previousIds: z.array(z.string().min(1).max(240)).max(10).optional(), name: z.string().max(300), parentId: z.string().nullable(), kind: z.string(), systemIds: z.array(z.string()), assetId: z.string().nullable(), meshNames: z.array(z.string()), matrix: z.array(z.number().finite()).length(16), bounds: z.object({ min: vec, max: vec }).nullable(), internal: z.boolean(), canonicalId: z.string().nullable(), oem: z.string().nullable(), guideIds: z.array(z.string()), thumbnail: z.string().nullable(), displayDirection:vec.optional(),paintSurface:z.literal(true).optional(), sourceContext:z.object({contextId:z.string(),assemblyId:z.string(),positionId:z.string().optional()}).optional(),gearbox:z.object({section:z.boolean(),spread:vec,hideInCutaway:z.literal(true).optional()}).optional(), engine:z.enum(['section','cover']).optional(),trimCover:z.literal(true).optional(), behindTrim:z.literal(true).optional(), cabinVisible:z.literal(true).optional(), cabinGlazing:z.literal(true).optional() });
const cabinPose = z.object({position:vec,target:vec});
const cabinSchema = z.object({
    driver:cabinPose, rear:cabinPose, movement:z.object({min:vec,max:vec}),
});
const panelSchema = z.object({
    id:z.string().max(240), label:z.string().max(60), requires:z.string().max(240).optional(),
    pivot:vec, axis:vec, dropBeforeSlide:z.literal(true).optional(), angle:z.number().finite().min(-180).max(180), slide:vec,
    camera:cabinPose.optional(),
});
export const referenceSchema = z.object({ schemaVersion: z.literal(1), id: z.string(), revision: z.number().int().positive(), reference: z.string(), mechanicalExplosion:z.boolean().optional(), exteriorOnly:z.literal(true).optional(), studioLighting:z.literal(true).optional(), cabin:cabinSchema.optional(), openingPanels: z.array(panelSchema).max(14).optional(), assets: z.array(z.object({ id: z.string(), url: z.string().regex(/^\/models\/(?:e34-lore\/r\d+|e30-lore\/(?:r\d+|exterior-r1))\/[a-f0-9]{64}\.glb$/), bytes: z.number().int().positive().max(8 * 1024 * 1024), sha256: z.string().regex(/^[a-f0-9]{64}$/) })).max(10), catalog:catalogIndexSchema.optional(), vehicleReference:z.object({id:z.string(),year:z.number(),model:z.string(),body:z.string(),engine:z.string(),transmission:z.string()}).optional(), credits:z.array(z.object({author:z.string(),url:z.string().url(),license:z.string(),licenseUrl:z.string().url()})).max(3).optional(), nodes: z.array(nodeSchema).max(1500), credit: z.object({ author: z.string(), url: z.string().url(), license: z.string(), licenseUrl: z.string().url() }), limits: z.string() });
export type ReferenceModel = z.infer<typeof referenceSchema>;
export type OpeningPanel = z.infer<typeof panelSchema>;
export type ReferenceNode = ReferenceModel['nodes'][number];
export type Vec = [
    number,
    number,
    number
];
export type Viewpoint = 'overview' | 'front' | 'rear' | 'left' | 'right' | 'top' | 'underbody' | 'driver' | 'rear-seat';
export type ReaderView = {
    scope: string;
    selected: string | null;
    hidden: string[];
    explosion: number;
    shell: 'solid' | 'ghost' | 'hidden';
    internals: boolean;
    cabin: 'driver' | 'rear' | null;
    openPanels?: string[];
    highlights?: readonly string[];
    highlightViewpoint?: Viewpoint;
};
export const defaultView = (): ReaderView => ({ scope: 'vehicle', selected: null, hidden: [], explosion: 0, shell: 'solid', internals: false, cabin: null });
export function canOpenPanels(view:ReaderView) {
    return view.scope==='vehicle'&&view.explosion===0&&view.shell==='solid'&&!view.internals;
}
export function toggleOpening(model:ReferenceModel,view:ReaderView,id:string):ReaderView {
    const panel=model.openingPanels?.find(entry=>entry.id===id);
    if(!panel||!canOpenPanels(view)) return view;
    const open=view.openPanels??[];
    return {...view,openPanels:open.includes(id)
        ? open.filter(part=>part!==id&&model.openingPanels?.find(entry=>entry.id===part)?.requires!==id)
        : [...new Set([...open,...(panel.requires?[panel.requires]:[]),id])]};
}
export function gearboxCutaway(view: ReaderView) {
    return isGearboxInspection(view.scope) && view.internals && view.explosion === 0;
}
export function engineCutaway(view:ReaderView) {
    return isEngineInspection(view.scope) && view.internals && view.explosion === 0;
}
export function members(m: ReferenceModel, id: string) { const found = new Set([id,...companionIds(id)]); if (id.startsWith('system:'))
    for (const n of m.nodes)
        if (n.systemIds.includes(id))
            found.add(n.id); let changed = true; while (changed) {
    changed = false;
    for (const n of m.nodes)
        if (n.parentId && found.has(n.parentId) && !found.has(n.id)) {
            found.add(n.id);
            changed = true;
        }
} return found; }
export function isExteriorNode(n:ReferenceNode){return n.id.startsWith('e34body:')||(n.id.startsWith('e30body:')&&!n.systemIds.includes('system:interior'))||(!!n.assetId?.startsWith('assembled:body-')&&!n.systemIds.includes('system:interior'));}
/** Reveal the containing assembly when inspecting a selected internal part. */
export function enclosingParts(model:ReferenceModel,selected:string|null){
 const node=model.nodes.find(n=>n.id===selected),ids=new Set<string>();
 if(!node?.internal)return ids;
 let parent=node.parentId;const seen=new Set([node.id]);
 while(parent&&!seen.has(parent)){seen.add(parent);const container=model.nodes.find(n=>n.id===parent);if(!container)break;if(container.assetId)ids.add(container.id);parent=container.parentId;}
 return ids;
}
function visibleInCabin(model:ReferenceModel,node:ReferenceNode) {
    if(node.behindTrim) return false;
    if(model.cabin) return !!node.cabinVisible;
    if(model.id.startsWith('e30-')) return node.systemIds.includes('system:interior');
    return node.assetId?.startsWith('assembled:body-') || node.id.startsWith('wheel:')
        || (node.assetId?.startsWith('authored:') && node.systemIds.includes('system:interior'));
}
export function visibleNodes(m: ReferenceModel, v: ReaderView) { const scope = members(m, v.scope), hidden = new Set(v.hidden.flatMap(id => [...members(m, id)])), focusedComponent=!!m.nodes.find(s=>s.id===v.scope)?.assetId,
    section=engineCutaway(v), sectionGearbox=gearboxCutaway(v), exposedTrim=v.scope===bodyTrimScope&&v.internals&&!v.explosion;
    if(isWiringScope(v.scope)) {
        return m.nodes.filter(n=>n.assetId && !hidden.has(n.id) &&
            (n.assetId===wiringAsset ? scope.has(n.id) : v.shell==='ghost' && isExteriorNode(n)));
    }
    const task = v.scope==='vehicle'&&v.shell==='ghost'&&v.highlights?.length ? new Set(v.highlights) : null;
    if(task){
        if(v.selected)task.add(v.selected);
        for(const id of task){
            const parent=m.nodes.find(node=>node.id===id)?.parentId;
            if(parent)task.add(parent);
        }
    }
    const trimExposed = isCabinTrimInspection(v.scope) || focusedComponent || v.internals || v.explosion>0;
    return m.nodes.filter(n => n.assetId && n.assetId!==wiringAsset && scope.has(n.id) && !hidden.has(n.id) && (!task||task.has(n.id)||isExteriorNode(n)) && !(section&&n.engine==='cover') && !(sectionGearbox&&n.gearbox?.hideInCutaway) && !(exposedTrim&&n.trimCover) && (!n.internal || v.internals || focusedComponent || (m.revision >= 14 && v.explosion > 0)) && (!n.behindTrim || trimExposed || v.selected===n.id || v.highlights?.includes(n.id)) && !(v.shell === 'hidden' && isExteriorNode(n)) && (!v.cabin || visibleInCabin(m,n))); }
export function findNode(m: ReferenceModel, value?: string) { if (!value)
    return null; const normalized = value.replaceAll(/[^a-z0-9]/gi, '').toLowerCase(); return m.nodes.find(n => n.id === value) || m.nodes.find(n => n.previousIds?.includes(value)) || m.nodes.find(n => n.canonicalId === value) || m.nodes.find(n => n.oem && n.oem.replaceAll(/\D/g, '') === (normalized.startsWith('bmw') ? normalized.slice(3) : normalized)) || m.nodes.find(n => n.canonicalId && n.canonicalId.replaceAll(/[^a-z0-9]/gi, '').toLowerCase() === normalized) || null; }
export function matches(n: ReferenceNode, q: string) { const clean = (s: string) => s.toLowerCase().replaceAll(/[^a-z0-9]+/g, ' ').trim(); const text=clean([n.name,n.id,n.oem,n.canonicalId].filter(Boolean).join(' ')),query=clean(q);return text.includes(query)||text.replaceAll(' ','').includes(query.replaceAll(' ','')); }
export function resolveInitial(m: ReferenceModel, part?: string, node?: string, system?: string): ReaderView { const aliases: Record<string, string> = { engine: 'system:engine', cooling: 'system:cooling', interior: 'system:interior', exterior: 'system:exterior', 'body-shell': 'e34body:assembly', wheels: 'system:suspension', 'pump-reference': 'm50:water-pump' }; const found = findNode(m, node) || findNode(m, part), requestedScope = system && (m.nodes.some(n => n.id === system) ? system : aliases[system]) || node && aliases[node], scope = requestedScope && m.nodes.some(n=>n.id===requestedScope) ? requestedScope : 'vehicle'; return { ...defaultView(), scope, internals: isGearboxInspection(scope) || isEngineInspection(scope), selected: found?.assetId ? found.id : null }; }
export function partHref(n: ReferenceNode) {
    if (n.sourceContext) return '/parts/catalog?' + new URLSearchParams({
      context:n.sourceContext.contextId, assembly:n.sourceContext.assemblyId,
      ...(n.sourceContext.positionId ? {position:n.sourceContext.positionId} : {}),
      ...(n.canonicalId ? {part:n.canonicalId} : {}),
    });
    return n.canonicalId ? '/parts/catalog?part=' + encodeURIComponent(n.canonicalId) : n.oem ? '/parts/catalog?part=' + encodeURIComponent('bmw-' + n.oem) : '/parts/catalog?q='+encodeURIComponent(n.name.replace(/\breference\b|\benvelope only\b|[—]/gi,'').trim()); }
export function parseReference(value: unknown) { const m = referenceSchema.parse(value); if(m.assets.reduce((sum,a)=>sum+a.bytes,0)>24*1024*1024)throw Error('Vehicle reference exceeds viewer budget'); if(m.catalog&&(m.catalog.modelId!==m.id||m.catalog.modelRevision!==m.revision))throw Error('Catalog does not match reference'); const ids = new Set(m.nodes.map(n => n.id)), assets = new Set(m.assets.map(a => a.id)); if (ids.size !== m.nodes.length || !ids.has('vehicle'))
    throw Error('Invalid model identities'); const previousIds = new Set<string>(); for (const n of m.nodes) {
    for (const previous of n.previousIds ?? []) {
        if (ids.has(previous) || previousIds.has(previous)) throw Error('Conflicting earlier model identity');
        previousIds.add(previous);
    }
    if (n.parentId && !ids.has(n.parentId) || n.assetId && !assets.has(n.assetId) || n.systemIds.some(id => !ids.has(id)))
        throw Error('Invalid model relationship');
    const seen = new Set([n.id]);
    let parent = n.parentId;
    while (parent) {
        if (seen.has(parent))
            throw Error('Model relationship cycle');
        seen.add(parent);
        parent = m.nodes.find(n => n.id === parent)?.parentId || null;
    }
    if (n.thumbnail && !/^\/models\/e34-lore\/r\d+\/[a-f0-9]{64}\.png$/.test(n.thumbnail))
        throw Error('Invalid component image');
}
    const panelIds = new Set(m.openingPanels?.map(panel=>panel.id));
    if(panelIds.size!==(m.openingPanels?.length??0)) throw Error('Duplicate opening panel');
    for(const panel of m.openingPanels??[]){
        if(!m.nodes.some(node=>node.id===panel.id&&node.assetId)
            || (panel.angle!==0&&!panel.axis.some(value=>value!==0))
            || (panel.requires&&(!panelIds.has(panel.requires)||m.openingPanels?.find(entry=>entry.id===panel.requires)?.requires)))
            throw Error('Invalid opening panel');
    }
    return m;
}
const cameraSchema = z.object({ position: vec.refine(v => v.every(n => Math.abs(n) <= 200)), target: vec.refine(v => v.every(n => Math.abs(n) <= 200)), fov: z.number().min(20).max(100) });
const viewSchema = z.object({ scope: z.string(), selected: z.string().nullable(), hidden: z.array(z.string()).max(500), explosion: z.number().finite().min(0).max(4), shell: z.enum(['solid', 'ghost', 'hidden']), internals: z.boolean(), cabin: z.enum(['driver', 'rear']).nullable(), openPanels:z.array(z.string().max(240)).max(14).optional() });
export const savedViewSchema = z.object({ name: z.string().trim().min(1).max(80), view: viewSchema, camera: cameraSchema.nullable(), revision: z.number().int().positive() });
export function savedView(value: unknown, m?: ReferenceModel) { const result = savedViewSchema.safeParse(value); if (!result.success)
    return null; const s = result.data; if (m) {
    const ids = new Set(m.nodes.map(n => n.id));
    if (s.revision !== m.revision || !ids.has(s.view.scope) || s.view.selected && !ids.has(s.view.selected) || s.view.hidden.some(id => !ids.has(id))
        || s.view.openPanels?.some(id=>!m.openingPanels?.some(panel=>panel.id===id)))
        return null;
} return s; }
/** Keep earlier device views when saving or deleting views in the current model. */
export function mergeReferenceViews(raw:unknown,next:unknown[],revision:number){
 const counts=new Map<number,number>();
 const previous=(Array.isArray(raw)?raw:[]).map(v=>savedView(v)).filter((v):v is NonNullable<ReturnType<typeof savedView>>=>{
  if(!v||v.revision===revision)return false;const count=counts.get(v.revision)||0;
  if(count>=20||(!counts.has(v.revision)&&counts.size>=31))return false;counts.set(v.revision,count+1);return true;
 });
 const current=next.map(v=>savedView(v)).filter((v):v is NonNullable<ReturnType<typeof savedView>>=>!!v&&v.revision===revision).slice(0,20);
 return [...previous,...current];
}
