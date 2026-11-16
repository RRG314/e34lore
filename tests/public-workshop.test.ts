import { releasePublic } from './release-content';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { type ReferenceModel, parseReference, defaultView, visibleNodes, members, matches, findNode, resolveInitial, partHref, savedView, toggleOpening } from '../src/digital-twin/public/model';
import { installedBounds, offsets, viewBounds } from '../src/digital-twin/public/layout';
import { reconstructionAccess } from '../src/digital-twin/public/access';
import{usageArea}from'../src/domain/usage';
import { publicShareUrl } from '../src/domain/identity';
import archives from '../data/digital-twin/workshop-panel-archives.json';
const release = archives.find(pin => pin.revision === 14)!;
import serviceRelease from '../data/digital-twin/525i-service-release.json';
import { quickReferenceHighlights } from '../src/data/quick-reference-model';
const manifest = fs.readFileSync(path.join(releasePublic, release.manifestUrl), 'utf8'), m = parseReference(JSON.parse(manifest)), hash = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');
it('groups only the modeled parts for oil service and keeps unmodeled fuse slots on the chart', () => {
    const automatic = parseReference(JSON.parse(fs.readFileSync(releasePublic +serviceRelease.manifestUrl, 'utf8')));
    const highlights=quickReferenceHighlights(automatic,'oil-change')?.parts.map(part=>part.id);
    expect(highlights).toEqual(expect.arrayContaining([
        'm50:oil-filler-cap','m50:oil-filter-housing','m50:oil-filter-element','m50:oil-drain-plug',
    ]));
    const view={...defaultView(),internals:true,highlights};
    const focused=visibleNodes(automatic,{...view,shell:'ghost'}).map(part=>part.id);
    expect(focused).toEqual(expect.arrayContaining(highlights!));
    expect(focused).not.toContain('e34bay:washer-tank');
    expect(visibleNodes(automatic,view).map(part=>part.id)).toContain('e34bay:washer-tank');
    const fuse = quickReferenceHighlights(automatic,'front-fuse-5');
    expect(fuse?.parts.map(part=>part.id)).toEqual(['e34sys:front-fuse-relay-box']);
    expect(fuse?.note).toContain('Use the fuse diagram to find F5');
    expect(quickReferenceHighlights(automatic,'battery-front')?.parts).toEqual([]);
});
describe('published E34 reference integration', () => {
    it('publishes exactly the verified immutable model bytes, with no owner workspace transport or paths', () => { expect(m.revision).toBe(14); expect(m.nodes.filter(n => n.assetId)).toHaveLength(454); expect(m.assets).toHaveLength(4);expect(m.nodes.filter(n=>n.kind==='system')).toHaveLength(19); expect(hash(manifest)).toBe(release.sha256); for (const a of m.assets) {
        const b = fs.readFileSync(releasePublic + a.url);
        expect(b.length).toBe(a.bytes);
        expect(hash(b)).toBe(a.sha256);
        expect(b.toString('utf8', 0, 4)).toBe('glTF');
    } expect(manifest).not.toMatch(/localhost|127\.0\.0\.1|\/Users\/|\/api\/|workspace\/|service_role|private\/|author=|importModel/); expect(m.credit.license).toBe('CC BY 4.0'); });
    it('resolves known OEM/canonical/deep-link identities to the same selected part and real thumbnail', () => { for (const q of ['coolant-pump', '11517527799', 'bmw-11517527799', 'm50:water-pump']) {
        const n = findNode(m, q)!;
        expect(n.id).toBe('m50:water-pump');
        expect(n.oem).toBe('11517527799');
        expect(partHref(n)).toBe('/parts/catalog?part=coolant-pump');
        expect(resolveInitial(m, q).selected).toBe(n.id);
    } expect(findNode(m, 'not-a-part')).toBeNull();const pump=findNode(m,'coolant-pump')!;expect(matches(pump,'water pump')).toBe(true);expect(matches(pump,'waterpump')).toBe(true);expect(matches(pump,'11 51 7 527 799')).toBe(true); });
    it('keeps actual image references for every installed component including shared wheels', () => { for (const n of m.nodes.filter(n => n.assetId)) {
        expect(n.thumbnail, n.id).toBeTruthy();
        const b = fs.readFileSync(releasePublic + n.thumbnail);
        expect(b.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
        expect(b.readUInt32BE(16)).toBe(256);
        expect(b.readUInt32BE(20)).toBe(256);
    } });
    it('preserves full installed geometry for system exploration and bounds, rather than showing the exterior for engine selections', () => { const v = { ...defaultView(), scope: 'system:engine' }; expect(visibleNodes(m, v).some(n => n.id === 'm50:block')).toBe(true); expect(visibleNodes(m, v).some(n => n.id.startsWith('e34body:'))).toBe(false); expect(members(m, 'system:cooling').has('m50:water-pump')).toBe(true); for (const n of m.nodes.filter(n => n.kind === 'system'))
        expect(visibleNodes(m, { ...defaultView(), scope: n.id }).length, n.id).toBeGreaterThan(0); const p = m.nodes.find(n => n.id === 'm50:water-pump')!; expect(installedBounds(p).isEmpty()).toBe(false); });
    it('holds separation without mutating source matrices and fits actual separated geometry', () => { const v = { ...defaultView(), scope: 'system:engine', explosion: .81 }, before = JSON.stringify(m), spread = offsets(m, v); expect(offsets(m, v)).toEqual(spread); expect(JSON.stringify(m)).toBe(before); const assembled = viewBounds(m, { ...v, explosion: 0 }), exploded = viewBounds(m, v); expect(exploded.max.x - exploded.min.x).toBeGreaterThan(assembled.max.x - assembled.min.x); expect(spread.get('m50:block')).toEqual([0, 0, 0]); expect(spread.get('m50:cylinder-head')).not.toEqual([0, 0, 0]); expect(offsets(m, { ...v, explosion: 0 }).get('m50:block')).toEqual([0, 0, 0]); });
    it('retains cabin geometry when the body is hidden and uses the authentic surfaces in seated views', () => { const noBody = visibleNodes(m, { ...defaultView(), shell: 'hidden' }); expect(noBody.some(n => n.id === 'e34sys:dashboard')).toBe(true); expect(noBody.some(n => n.id === 'e34body:hood')).toBe(false); const inside = visibleNodes(m, { ...defaultView(), cabin: 'driver' }); expect(inside.some(n => n.id === 'e34sys:steering-wheel')).toBe(true); expect(inside.some(n => n.id === 'm50:block')).toBe(false); });
    it('rejects unknown model relationships, cycles, external asset URLs and private image paths', () => { for (const mutate of [(x:ReferenceModel) => x.nodes[1].parentId = 'missing', (x:ReferenceModel) => x.nodes[1].parentId = x.nodes[1].id, (x:ReferenceModel) => x.assets[0].url = 'https://example.com/model.glb', (x:ReferenceModel) => x.nodes.find((n) => n.thumbnail)!.thumbnail = '/private/model.png']) {
        const altered = JSON.parse(manifest);
        mutate(altered);
        expect(() => parseReference(altered)).toThrow();
    } });
});
describe('series-specific seated views', () => {
    it('shows the authored cabin and glazing while keeping the drivetrain outside the seated view', () => {
        const original = m.nodes.find(n => n.assetId)!;
        const seat = {...original,id:'e30assembly:cabin:seat-left',parentId:'vehicle',systemIds:['system:interior'],cabinVisible:true as const};
        const window = {...original,id:'e30body:windshield',parentId:'vehicle',systemIds:['system:body'],cabinVisible:true as const,cabinGlazing:true as const};
        const engine = {...original,id:'e30assembly:engine:block',parentId:'vehicle',systemIds:['system:engine']};
        const model: ReferenceModel = {
            ...m,id:'e30-325i-coupe-manual',nodes:[m.nodes.find(n=>n.id==='vehicle')!,seat,window,engine],
            cabin:{
                driver:{position:[-.235,1.114,-.348],target:[.533,.867,-.239]},
                rear:{position:[-1.035,1.10,0],target:[.51,.814,0]},
                movement:{min:[-1.18,.69,-.535],max:[.42,1.196,.535]},
            },
        };
        expect(visibleNodes(model,{...defaultView(),cabin:'driver'}).map(n=>n.id)).toEqual([seat.id,window.id]);
        expect(visibleNodes(model,{...defaultView(),cabin:'rear',shell:'hidden'}).map(n=>n.id)).toEqual([seat.id]);
    });
});
describe('public and private workshop boundaries', () => {
 it('excludes private inspection and source pages from aggregate counts',()=>{expect(usageArea('/workshop')).toBe('workshop');expect(usageArea('/workshop/assets')).toBeNull();expect(usageArea('/workshop/inspections')).toBeNull();expect(usageArea('/manage/models')).toBeNull();});
    it('permits only authorized MFA staff in reconstruction tools', () => { expect(reconstructionAccess(['admin'], 'aal2')).toBe(true); expect(reconstructionAccess(['reviewer'], 'aal2')).toBe(true); for (const [roles, aal] of [[['admin'], 'aal1'], [['moderator'], 'aal2'], [[], 'aal2'], [null, 'aal2'], [['member'], 'aal2']] as const)
        expect(reconstructionAccess(roles, aal)).toBe(false); });
    it('shares public part selections while stripping author/credential parameters and rejecting private tools', () => { expect(publicShareUrl('/workshop?node=m50%3Awater-pump&author=1&access_token=secret')).toBe('https://e34lore.com/workshop?node=m50%3Awater-pump'); for (const p of ['/workshop/assets', '/workshop/inspections', '/manage/models'])
        expect(publicShareUrl(p)).toBeNull(); });
    it('pins saved views to a valid model revision and refuses malformed browser data', () => { const valid = { name: 'Cooling inspection', revision: m.revision, view: { ...defaultView(), selected: 'm50:water-pump' }, camera: { position: [4, 2, 3], target: [1, .5, 0], fov: 42 } }; expect(savedView(valid, m)).toEqual(valid); for (const s of [{ ...valid, revision: 1 }, { ...valid, view: { ...valid.view, scope: 'unknown' } }, { ...valid, view: { ...valid.view, explosion: Infinity } }, { ...valid, camera: { ...valid.camera, fov: 999 } }, { ...valid, camera: { ...valid.camera, position: [1e9, 0, 0] } }])
        expect(savedView(s, m)).toBeNull(); });
});

describe('retained native reference views',()=>{
 it('keeps earlier model views when the current model saves or deletes a view',async()=>{const{mergeReferenceViews}=await import('../src/digital-twin/public/model');const old={name:'Earlier view',revision:13,view:defaultView(),camera:null},fresh={name:'Current view',revision:14,view:defaultView(),camera:null};expect(mergeReferenceViews([old,{invalid:true}],[fresh],14)).toEqual([old,fresh]);expect(mergeReferenceViews([old,fresh],[],14)).toEqual([old]);});
 it('retains exact old manifest bytes and shares their explicit model revision safely',async()=>{const{referenceRelease}=await import('../src/digital-twin/public/load-reference'),old=referenceRelease(13)!;expect(hash(fs.readFileSync(releasePublic +old.manifestUrl))).toBe(old.sha256);for(const invalid of ['https://unrelated.test/model','__proto__','toString','0','-1','014']) expect(referenceRelease(invalid)).toBeNull();expect(publicShareUrl('/workshop?node=e34body%3Ahood&model_revision=13&access_token=secret')).toBe('https://e34lore.com/workshop?node=e34body%3Ahood&model_revision=13');});
});

it('opens the trunk for spare-wheel access and closes the cover with the trunk',()=>{
    const trunk='e34body:trunk', cover='e34trim:luggage-floor-carpet';
    const motion={pivot:[0,0,0],axis:[0,0,1],angle:-65,slide:[0,0,0]} as const;
    const node={...m.nodes.find(node=>node.id===trunk)!,id:cover,parentId:'vehicle'};
    const model=parseReference({...m,nodes:[...m.nodes,node],openingPanels:[
        {...motion,id:trunk,label:'Trunk'},
        {...motion,id:cover,label:'Spare-wheel cover',requires:trunk},
    ]});
    const open=toggleOpening(model,defaultView(),cover);
    expect(open.openPanels).toEqual([trunk,cover]);
    expect(toggleOpening(model,open,trunk).openPanels).toEqual([]);
    expect(toggleOpening(model,open,cover).openPanels).toEqual([trunk]);
    const exploded={...defaultView(),explosion:4};
    expect(toggleOpening(model,exploded,trunk)).toBe(exploded);
    const view={name:'Spare-wheel access',revision:model.revision,view:open,camera:null};
    expect(savedView(view,model)).toEqual(view);
    expect(savedView({...view,view:{...open,openPanels:['unknown']}},model)).toBeNull();
});
