import { releasePublic } from './release-content';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { type ReferenceModel, parseReference, defaultView, visibleNodes, members, matches, findNode, resolveInitial, partHref, savedView, toggleOpening } from '../src/digital-twin/public/model';
import { installedBounds, offsets, viewBounds } from '../src/digital-twin/public/layout';
import { assemblyAccess, assemblyProcedures, assemblyScene, availableAssemblyServices, sumpSteps, type AssemblyServiceId } from '../src/digital-twin/public/assembly-service';
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
describe('525i main-pan service', () => {
    const part = (name: string) => 'e34auto:' + name;
    const sumpScene = (completed: number) => assemblyScene({id:'e34-sump',completed});
    const position = (steps: number, name: string) =>
        sumpScene(steps).offsets.get(part(name)) ?? [0, 0, 0];
    const completed = (action: string) => {
        const index = sumpSteps.findIndex(step => step.action === action);
        expect(index).toBeGreaterThanOrEqual(0);
        return index + 1;
    };

    it('clears the pan and screws before moving the strainer and reseats every part', () => {
        const lowerPan = completed('Lower the main pan');
        const releaseFilter = completed('Lower the strainer and seal');
        expect(position(lowerPan - 1, 'pan-bolt-16')[1]).toBeLessThan(0);
        expect(position(lowerPan - 1, 'pan-main')).toEqual([0, 0, 0]);
        expect(position(lowerPan, 'pan-main')).toEqual(position(lowerPan, 'pan-magnet'));
        expect(position(releaseFilter - 1, 'strainer')).toEqual([0, 0, 0]);
        expect(position(releaseFilter - 1, 'strainer-bolt-3')[1]).toBeLessThan(0);
        expect(position(releaseFilter, 'strainer')).toEqual(position(releaseFilter, 'strainer-seal'));
        const closePan = completed('Raise the pan into place');
        expect(position(closePan, 'strainer-bolt-3')).toEqual([0, 0, 0]);
        expect(position(closePan, 'pan-main-gasket')).toEqual([0, 0, 0]);
        expect(position(closePan, 'pan-bolt-16')[1]).toBeLessThan(0);
        expect([...sumpScene(sumpSteps.length).offsets.values()].every(v => v.every(x => x === 0))).toBe(true);
        expect(position(sumpSteps.length, 'pan-secondary')).toEqual([0, 0, 0]);
    });

    it('requires a complete service asset set and leaves earlier saved views compatible', () => {
        const { parts } = sumpScene(0);
        const mesh = m.nodes.find(node => node.assetId)!;
        const reference = { ...m, id: serviceRelease.id,
            nodes: [...parts].map(id => ({ ...mesh, id })) };
        expect(availableAssemblyServices(reference).map(p=>p.id)).toEqual(['e34-sump']);
        expect(availableAssemblyServices({ ...reference, nodes: reference.nodes.slice(1) })).toEqual([]);
        expect(availableAssemblyServices({ ...reference, id: 'e30-325i-coupe-manual' })).toEqual([]);
        const view = { ...defaultView(), assemblyService: { id: 'e34-sump', completed: 4 } };
        expect(savedView({ name: 'Existing view', view, camera: null, revision: 1046 })?.view)
            .toEqual(defaultView());
    });
});

describe('325i Getrag 260 service', () => {
    const part = (id: string) => 'e30assembly:gearbox:' + id;
    const stage = (id: AssemblyServiceId, action: string, before = false) => {
        const index = assemblyProcedures[id].steps.findIndex(step => step.action === action);
        expect(index).toBeGreaterThanOrEqual(0);
        return assemblyScene({ id, completed: before ? index : index + 1 }).offsets;
    };
    const installed = [0, 0, 0];

    it('withdraws the gearbox and all six screws before releasing the clutch', () => {
        const id = 'e30-clutch';
        const unbolt = stage(id, 'Remove the pressure plate screws');
        expect(unbolt.get(part('input-shaft'))).toEqual(unbolt.get(part('main-case')));
        expect(unbolt.get(part('main-case'))?.[0]).toBeLessThan(0);
        expect(unbolt.has(part('flywheel'))).toBe(false);
        expect(unbolt.has(part('pressure-plate'))).toBe(false);
        for (let i = 1; i <= 6; i++) expect(unbolt.get(part('clutch-bolt-' + i))?.[0]).toBeLessThan(0);
        const center = stage(id, 'Center the new clutch disc');
        expect(center.get(part('clutch-disc'))).toEqual(installed);
        expect(center.get(part('pressure-plate'))).not.toEqual(installed);
        const reseated = stage(id, 'Slide the gearbox home');
        expect(reseated.get(part('clutch-bolt-6'))).toEqual(installed);
        expect(reseated.get(part('release-bearing'))).toEqual(installed);
    });

    it('clears the case hardware before splitting the case and holds the shafts together', () => {
        const id = 'e30-getrag';
        const seam = stage(id, 'Pull the front case section', true);
        expect(seam.has(part('main-case'))).toBe(false);
        for (const name of ['guide-bolt-6', 'guide-sleeve', 'input-snap-ring', 'case-dowel-2', 'case-bolt-9'])
            expect(seam.get(part(name)), name).toBeDefined();
        const press = stage(id, 'Press out the shaft pack');
        expect(press.get(part('main-case'))?.[0]).toBeGreaterThan(0);
        const input = press.get(part('input-shaft'));
        expect(input).toBeDefined();
        for (const name of ['mainshaft', 'countershaft', 'selector-fork-2', 'synchronizer-1'])
            expect(press.get(part(name)), name).toEqual(input);
        expect(press.has(part('tail-case'))).toBe(false);
    });

    it('gates each procedure on its actual meshes and fully reseats both assemblies', () => {
        const ids = ['e30-clutch', 'e30-getrag'] as const;
        const parts = new Set(ids.flatMap(id => [...assemblyScene({ id, completed: 0 }).parts]));
        const mesh = m.nodes.find(node => node.assetId)!;
        const model = { ...m, id: assemblyProcedures['e30-clutch'].modelId,
            nodes: [...parts].map(id => ({ ...mesh, id })) };
        expect(availableAssemblyServices(model).map(service => service.id)).toEqual(ids);
        expect(availableAssemblyServices({ ...model, nodes: model.nodes.filter(node => node.id !== part('clutch-bolt-6')) })
            .map(service => service.id)).toEqual(['e30-getrag']);
        for (const id of ids) {
            const scene = assemblyScene({ id, completed: assemblyProcedures[id].steps.length });
            expect(scene.focus).toEqual([]);
            expect([...scene.offsets.values()].every(point => point.every(value => value === 0))).toBe(true);
        }
    });
});

it('separates front brake hardware in service order and reinstalls every part', () => {
    const id = 'e34-front-brakes';
    const procedure = assemblyProcedures[id];
    const stage = (action: string) => {
        const index = procedure.steps.findIndex(step => step.action === action);
        expect(index).toBeGreaterThanOrEqual(0);
        return assemblyScene({ id, completed: index + 1 }).offsets;
    };
    const rotor = 'e34sys:brake-disc-front-1', caliper = 'e34sys:brake-caliper-front-1';
    const screw = 'e34brake:front-left-disc-screw', carrier = 'e34brake:front-left-carrier';
    const clearance = stage('Remove the disc screw');
    expect(clearance.has(rotor)).toBe(false);
    for (const part of [screw, carrier, caliper, 'wheel:front-left'])
        expect(clearance.get(part), part).toBeDefined();
    expect(stage('Pull the disc off the hub').get(rotor)?.[2]).toBeLessThan(0);
    const installed = stage('Seat the replacement disc');
    expect(installed.get(rotor)).toEqual([0,0,0]);
    expect(installed.get(screw)).not.toEqual([0,0,0]);
    const finish = assemblyScene({ id, completed: procedure.steps.length });
    expect([...finish.offsets.values()].every(point => point.every(value => value === 0))).toBe(true);
});

it('opens the Girling housing on its upper guide and returns it after fitting the pads', () => {
    const id = 'e30-front-brakes';
    const procedure = assemblyProcedures[id];
    const setup = assemblyScene({ id, completed: 0 });
    const stage = (action: string) => {
        const index = procedure.steps.findIndex(step => step.action === action);
        expect(index).toBeGreaterThanOrEqual(0);
        return assemblyScene({ id, completed: index + 1 });
    };
    const part = (key: string) => 'e30assembly:front-left:' + key;
    const caliper = part('caliper');
    const lower = part('guide-bolt-lower');
    const disc = part('rotor');
    const opened = stage('Swing the caliper up');
    expect(opened.offsets.has(caliper)).toBe(false);
    expect(opened.rotations.get(caliper)).toBe(-107);
    expect(opened.offsets.has(lower)).toBe(true);
    expect(opened.offsets.has(part('guide-bolt-upper'))).toBe(false);
    expect(stage('Lift out the pads and sensor').offsets.has(part('pad-inner'))).toBe(true);
    const hanging = stage('Hang the carrier and caliper together');
    expect(hanging.rotations.get(caliper)).toBe(0);
    expect(hanging.offsets.get(caliper)).toEqual(hanging.offsets.get(part('carrier')));
    expect(hanging.offsets.has(disc)).toBe(false);
    expect(stage('Pull the disc off the hub').offsets.get(disc)?.[2]).toBeLessThan(0);
    expect(stage('Seat the pads and wear sensor').rotations.get(caliper)).toBe(-107);
    const finish = assemblyScene({ id, completed: procedure.steps.length });
    expect(finish.rotations.get(caliper)).toBe(0);
    expect([...finish.offsets.values()].every(point => point.every(value => value === 0))).toBe(true);
    const mesh = m.nodes.find(node=>node.assetId)!;
    const model = { ...m, id: procedure.modelId, nodes: [...setup.parts].map(id=>({ ...mesh,id })) };
    expect(availableAssemblyServices(model).map(service=>service.id)).toEqual([id]);
    expect(availableAssemblyServices({ ...model,nodes:model.nodes.filter(node=>node.id!==lower) })).toEqual([]);
});

it.each([
    ['e30-rear-brakes', 'lower', 'upper', 'e30assembly:rear-right:'],
    ['e34-rear-brakes', 'upper', 'lower', 'e34brake:rear-right-'],
] as const)('releases and seats the correct rear parking brake hardware for %s', (id, firstEnd, lastEnd, prefix) => {
    const service = assemblyProcedures[id];
    const after = (action: string) => {
        const index = service.steps.findIndex(step => step.action === action);
        expect(index).toBeGreaterThanOrEqual(0);
        return assemblyScene({ id, completed: index + 1 });
    };
    const spring = (end: 'upper' | 'lower') =>
        id === 'e34-rear-brakes' && end === 'upper' ? 'e34brake:parking-right-return-springs' : prefix + 'return-' + end;
    const forward = id === 'e34-rear-brakes' ? 'e34sys:parking-brake-shoes--1' : prefix + 'shoe-forward';
    const rearward = prefix + 'shoe-rearward';
    const hold = prefix + 'hold-rearward';
    const rotor = id === 'e34-rear-brakes' ? 'e34sys:brake-disc-rear--1' : prefix + 'rotor';
    const locked = after('Unhook the ' + firstEnd + ' return spring');
    expect(locked.offsets.get(rotor)?.[2]).toBeGreaterThan(0);
    expect(locked.offsets.has(spring(firstEnd))).toBe(true);
    expect(locked.offsets.has(spring(lastEnd))).toBe(false);
    expect(after('Unlock both shoe retainers').rotations.get(hold)).toBe(90);
    const packed = after('Lift out the connected shoes');
    expect(packed.offsets.get(forward)).toEqual(packed.offsets.get(rearward));
    expect(packed.offsets.get(forward)).toEqual(packed.offsets.get(spring(lastEnd)));
    expect(after('Separate the ' + lastEnd + ' spring and adjuster').offsets.get(rearward))
        .not.toEqual(packed.offsets.get(rearward));
    const closed = after('Lock both shoe retainers');
    expect(closed.rotations.get(hold)).toBe(0);
    expect(closed.offsets.get(forward)).toEqual([0,0,0]);
    expect(closed.offsets.get(rotor)?.[2]).toBeGreaterThan(0);
    const completed = assemblyScene({ id, completed: service.steps.length });
    expect([...completed.offsets.values()].every(point => point.every(value => value === 0))).toBe(true);
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

it.each([
    ['e30-front-strut', 'e30assembly:front-right:spring'],
    ['e34-front-strut', 'e34sys:front-spring--1'],
] as const)('unloads the spring before the center nut moves and restores the assembly for %s', (id, spring) => {
    const { steps } = assemblyProcedures[id];
    const after = (action: string) => {
        const index = steps.findIndex(step => step.action === action);
        expect(index).toBeGreaterThanOrEqual(0);
        return assemblyScene({ id, completed: index+1 });
    };
    const compressed = after('Compress the spring');
    const springRemoved = after('Remove spring and lower pad');
    expect(compressed.scaleY.get(spring)).toBeLessThan(1);
    expect(compressed.frame).toContain(spring);
    expect(springRemoved.scaleY.get(spring)).toBeGreaterThan(1);
    expect(springRemoved.offsets.get(spring)).not.toEqual(compressed.offsets.get(spring));
    expect(after('Fit mount and tighten shaft nut').scaleY.get(spring)).toBeLessThan(1);
    expect(after('Release compressor and refit cap').scaleY.get(spring)).toBe(1);
    const finish = assemblyScene({ id, completed: steps.length });
    expect([...finish.offsets.values()].every(offset => offset.every(value => value === 0))).toBe(true);
});

it.each(['e30-front-arms','e34-front-arms','e30-front-tie-rods','e34-front-tie-rods','e34-center-link'] as const)(
    'returns all removed parts to their fitted positions for %s', id => {
        const { steps } = assemblyProcedures[id];
        expect(steps.some((_, index) => [...assemblyScene({ id, completed: index+1 }).offsets.values()]
            .some(offset => offset.some(value => value !== 0)))).toBe(true);
        const finish = assemblyScene({ id, completed: steps.length });
        expect([...finish.offsets.values()].every(offset => offset.every(value => value === 0))).toBe(true);
    },
);

it.each([
    ['e30-cooling-fan','e30body:hood','e30assembly:radiator-pack:fan','e30assembly:radiator-pack:shroud'],
    ['e34-cooling-fan','e34body:hood','e34sys:engine-cooling-fan','e34sys:fan-shroud'],
] as const)('keeps access steps ordered and restores fitted geometry for %s', (id,hood,fan,shroud) => {
    const procedure = assemblyProcedures[id];
    const access = assemblyAccess(procedure);
    expect(access.map(step=>step.action)).toEqual([
        'Open the hood','Release both shroud rivets','Lift out the fan and shroud together',
    ]);
    expect(access[0].parts).toEqual([hood]);
    expect(access[2].parts).toEqual(expect.arrayContaining([fan,shroud]));
    expect(assemblyScene({id,completed:0}).openPanels).toEqual([]);
    expect(assemblyScene({id,completed:1}).openPanels).toEqual([hood]);
    const lifted = assemblyScene({id,completed:access[2].index+1});
    expect(lifted.offsets.get(fan)?.[1]).toBeGreaterThan(0);
    expect(lifted.offsets.get(fan)?.[1]).toBe(lifted.offsets.get(shroud)?.[1]);
    const restored = assemblyScene({id,completed:procedure.steps.length});
    expect(restored.openPanels).toEqual([]);
    expect([...restored.offsets.values()].every(offset=>offset.every(axis=>axis===0))).toBe(true);
});

it.each([
    ['e30-water-pump','e30assembly:engine:water-pump','e30cooling:pump-gasket','Remove the lower bolt, pump and gasket'],
    ['e34-water-pump','m50:water-pump','e34cooling:pump-o-ring','Draw out the pump and remove the O-ring'],
    ['e30-thermostat','e30cooling:thermostat','e30cooling:thermostat-seal','Lift out the thermostat and old seals'],
    ['e34-thermostat','m50:thermostat','e34cooling:thermostat-profile-seal','Lift out the thermostat and old seals'],
] as const)('clears access, removes both the component and seal, and refits them for %s', (id,part,seal,remove) => {
    const procedure=assemblyProcedures[id];
    const removal=procedure.steps.findIndex(step=>step.action===remove);
    const access=assemblyAccess(procedure);
    expect(access[0].parts).toEqual([id.startsWith('e30')?'e30body:hood':'e34body:hood']);
    expect(access.some(step=>step.action==='Lift out the fan and shroud together')).toBe(id!=='e30-thermostat');
    expect(access.at(-1)!.index).toBeLessThan(removal);
    expect(procedure.steps[removal].manual?.href).toBeTruthy();
    const removed=assemblyScene({id,completed:removal+1});
    expect(removed.offsets.get(part)).not.toEqual(removed.offsets.get(seal));
    expect(removed.offsets.get(part)![0]).toBeGreaterThan(0);
    expect(removed.offsets.get(seal)![0]).toBeGreaterThan(0);
    if(id==='e30-water-pump'){
        expect(removed.parts.has('e30assembly:engine:timing')).toBe(true);
        expect(removed.offsets.has('e30assembly:engine:timing')).toBe(false);
        expect(removed.offsets.get('e30cooling:tensioner-pin')).toEqual(removed.offsets.get('e30cooling:tensioner-spring'));
    }
    const fitted=assemblyScene({id,completed:procedure.steps.length});
    expect(fitted.openPanels).toEqual([]);
    expect([...fitted.offsets.values()].every(offset=>offset.every(axis=>axis===0))).toBe(true);
    expect([...fitted.rotations.values()].every(rotation=>rotation===0)).toBe(true);
});

it.each(['e30-rear-brakes','e34-rear-brakes'] as const)('resolves the prerequisite access parts for %s',id=>{
    const procedure=assemblyProcedures[id];
    const wheel=id==='e30-rear-brakes'?'e30assembly:rear-right:wheel':'wheel:rear-right';
    const access=assemblyAccess(procedure);
    expect(access[0].parts).toEqual([wheel]);
    expect(access.every(step=>step.parts.every(part=>procedure.parts.includes(part)))).toBe(true);
});
