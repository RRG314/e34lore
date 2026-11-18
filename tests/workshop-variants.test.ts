import {assemblyProcedures,availableAssemblyServices} from '../src/digital-twin/public/assembly-service';
import { releasePublic } from './release-content';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppProvider} from '../src/components/context';
import {VehicleReferenceSelector} from '../src/digital-twin/public/VehicleReferenceSelector';
import {describe,it,expect,vi,afterEach} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {Box3,Matrix4,Vector3} from 'three';
import variants from '../data/digital-twin/vehicle-references.json';
import automatic525i from '../data/digital-twin/525i-automatic-reference.json';
import e30 from '../data/digital-twin/e30-candidate.json';
import e30Variants from '../data/digital-twin/e30-vehicle-references.json';
import {referenceVehicle, resolveVehicleReference} from '../src/vehicle/reference-context';
import service525i from '../data/digital-twin/525i-service-release.json';
import panelArchives from '../data/digital-twin/workshop-panel-archives.json';
import current from '../data/digital-twin/public-reference.json';
import {parseReference,defaultView,members,visibleNodes,mergeReferenceViews,savedView} from '../src/digital-twin/public/model';
import {referenceRelease,loadReference,vehicleReferences} from '../src/digital-twin/public/load-reference';
import {referenceVariantOffsets,clearDisplayRay} from '../src/digital-twin/public/variant-layout';
import type {CatalogPage} from '../src/digital-twin/public/catalog';
import {componentPlan} from '../src/digital-twin/public/component-separation';
import {wiringAsset,wiringScope,wiringReferences,wiringFor,wiringWorkshopHref} from '../src/data/wiring-routes';
import {withWiring,wiringGeometry} from '../src/digital-twin/public/wiring-model';
import {offsets} from '../src/digital-twin/public/layout';
const releases=[...variants,automatic525i];
const models=releases.map(r=>parseReference(JSON.parse(fs.readFileSync(releasePublic +r.manifestUrl,'utf8'))));
const digest=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const readModel=(pin:{manifestUrl:string})=>parseReference(JSON.parse(fs.readFileSync(releasePublic +pin.manifestUrl,'utf8')));
afterEach(()=>vi.unstubAllGlobals());
describe('native workshop model switching',()=>{
 it.each([e30,service525i])('limits wiring to the matching $id and separates sleeves before the branches',pin=>{
   const manifest=parseReference(JSON.parse(fs.readFileSync(releasePublic +pin.manifestUrl,'utf8')));
   const model=withWiring(manifest);
   expect(withWiring({...manifest,id:'unsupported-reference'}).nodes).toBe(manifest.nodes);
   expect(visibleNodes(model,defaultView()).some(node=>node.assetId===wiringAsset)).toBe(false);
   expect(visibleNodes(model,{...defaultView(),explosion:4}).some(node=>node.assetId===wiringAsset)).toBe(false);
   const isolated={...defaultView(),scope:wiringScope,shell:'hidden' as const};
   const wires=visibleNodes(model,isolated);
   expect(wires).not.toHaveLength(0);
   expect(wires.every(node=>node.assetId===wiringAsset)).toBe(true);
   expect(visibleNodes(model,{...isolated,shell:'ghost'}).some(node=>node.assetId!==wiringAsset)).toBe(true);
   const assembled=offsets(model,isolated), exploded=offsets(model,{...isolated,explosion:4});
   const partlyExploded=offsets(model,{...isolated,explosion:2});
   for(const node of wires){
     const geometry=wiringGeometry(model,node.id)!;
     expect(geometry.points.length).toBeGreaterThan(1);
     expect(assembled.get(node.id)).toEqual([0,0,0]);
     expect(exploded.get(node.id)).not.toEqual([0,0,0]);
     if(geometry.sleeve) expect(partlyExploded.get(node.id)).not.toEqual([0,0,0]);
     else expect(partlyExploded.get(node.id)).toEqual([0,0,0]);
   }
   const branch=wires.find(node=>node.kind==='assembly')!;
   const single={...isolated,scope:branch.id,explosion:4};
   expect(visibleNodes(model,single).map(node=>node.id)).toEqual([branch.id,branch.id+':sleeve']);
   expect(offsets(model,single).get(branch.id)).toEqual([0,0,0]);
   expect(offsets(model,single).get(branch.id+':sleeve')).not.toEqual([0,0,0]);
   expect(visibleNodes(model,{...single,shell:'ghost'}).filter(node=>node.assetId===wiringAsset)).toHaveLength(2);
   expect(savedView({name:'Harness view',revision:pin.revision,view:isolated,camera:null},model)).not.toBeNull();
 });
 it('selects the factory transmission and leaves the lip as an explicit equipment choice',()=>{
   const [automatic,spoiler]=e30Variants;
   const choices=[e30,...e30Variants];
   expect(resolveVehicleReference(choices,referenceVehicle(e30)).selected?.id).toBe(e30.id);
   expect(resolveVehicleReference(choices,referenceVehicle(automatic)).selected?.id).toBe(automatic.id);
   expect(resolveVehicleReference(choices,referenceVehicle(e30),spoiler.id).selected?.id).toBe(spoiler.id);

   const model=readModel(automatic);
   expect(model.nodes.some(node=>node.id==='system:manual-gearbox')).toBe(false);
   expect(model.nodes.some(node=>node.id==='e30assembly:cabin-floor:auto-selector')).toBe(true);
   expect(visibleNodes(model,{...defaultView(),scope:'system:automatic-gearbox',internals:true})
     .some(node=>node.id==='e30assembly:automatic:filter')).toBe(true);
   expect(readModel(spoiler).nodes.find(node=>node.id==='e30body:trunk:rear-lip')?.parentId).toBe('e30body:trunk');
 });
 it('links the current E30 wiring view and retains the previous revision',()=>{
   const params=new URL(wiringWorkshopHref('e30'),'https://e34lore.com').searchParams;
   expect(params.get('model_revision')).toBe(String(e30.revision));
   expect(wiringFor({id:e30.id,revision:1197})).toBe(wiringReferences.e30);
   expect(wiringFor({id:service525i.id,revision:1052})).toBe(wiringReferences.e34);
   expect(wiringFor({id:e30.id,revision:1179})).toBe(wiringReferences.e30);
   expect(wiringFor({id:e30.id,revision:1178})).toBeUndefined();
 });
 it('keeps adjacent E30 loom sections joined in their installed positions',()=>{
   const routes=wiringReferences.e30.routes;
   const get = (id:string) => routes.find(route=>route.id===id)!.points;
   expect(get('front-left').at(-1)).toEqual(get('front-panel')[0]);
   expect(get('front-left')[0]).toEqual(get('sill')[0]);
   expect(get('sill').at(-1)).toEqual(get('left-rear')[0]);
   expect(get('left-rear').at(-1)).toEqual(get('rear-panel')[0]);
   expect(get('sill')).toContainEqual(get('dash')[0]);
   expect(get('dash').at(-1)).toEqual(get('door-right')[0]);
 });
 it('shares the E34 battery and rear distribution endpoints across the three connected routes',()=>{
   const get=(id:string)=>wiringReferences.e34.routes.find(route=>route.id===id)!.points;
   expect(get('battery')[0]).toEqual(get('rear-seat')[0]);
   expect(get('sill').at(-1)).toEqual(get('rear-seat').at(-1));
   expect(get('trunk')[0]).toEqual(get('rear-seat').at(-1));
 });
 it('exposes all model choices in the same native workshop control',()=>{const html=renderToStaticMarkup(createElement(AppProvider,null,createElement(VehicleReferenceSelector,{reference:'e34-540i-sedan-automatic'})));expect(html).toContain('aria-label="Car model"');expect((html.match(/<option /g)||[]).length).toBe(10);expect(html).toContain('value="e34-540i-sedan-automatic" selected=""');});
 it('retains the original 525i release and eight distinct configurations',()=>{
  expect(vehicleReferences).toHaveLength(10);expect(new Set(vehicleReferences.map(r=>r.revision)).size).toBe(10);
  expect(referenceRelease()).toEqual(current);
  for(const r of releases){expect(referenceRelease(undefined,r.id)).toEqual(r.id===automatic525i.id?service525i:r);expect(referenceRelease(r.revision,r.id)).toEqual(r);expect(referenceRelease(r.revision)).toEqual(r);expect(referenceRelease(999,r.id)).toBeNull();}
  expect(referenceRelease(undefined,'unknown-car')).toBeNull();
 });
 it('can open the published automatic model while a local candidate is active',async()=>{
  vi.resetModules();
  vi.doMock('../src/digital-twin/public/local-reference-candidate',()=>({
   default:{...service525i,revision:1016},localReferenceArchives:[],localGeometryChecks:[],
  }));
  try {
   const {referenceRelease:resolve}=await import('../src/digital-twin/public/load-reference');
   expect(resolve(undefined,service525i.id)?.revision).toBe(1016);
   const accepted=panelArchives.find(reference=>reference.id===service525i.id)!;
   expect(resolve(accepted.revision,accepted.id)).toEqual(accepted);
   expect(resolve(accepted.revision)).toEqual(accepted);
  }finally{
   vi.doUnmock('../src/digital-twin/public/local-reference-candidate');
   vi.resetModules();
  }
 });
 it('keeps previous published panel references available by their original hashes',()=>{
  for(const reference of panelArchives){
   expect(referenceRelease(reference.revision,reference.id)).toEqual(reference);
   expect(digest(fs.readFileSync(releasePublic +reference.manifestUrl))).toBe(reference.sha256);
  }
 });
 it.each(releases)('loads the actual $id rather than filtering the 525i',async r=>{
  vi.stubGlobal('fetch',vi.fn(async(input:string)=>new Response(fs.readFileSync(releasePublic +input))));
  const m=await loadReference(new AbortController().signal,r.revision,r.id);
  expect(m.id).toBe(r.id);expect(m.nodes.some(n=>n.id==='vehicle')).toBe(true);
  expect(m.nodes.filter(n=>n.assetId)).toHaveLength(r.renderableCount);
  expect(m.catalog?.coverage.bound).toBe(r.renderableCount);
  expect(m.vehicleReference?.model).toBe(r.model);
  expect(m.nodes.some(n=>n.systemIds.includes('system:engine')&&!!n.assetId)).toBe(true);
  if(r.id==='e34-525i-sedan-automatic'){
   expect(m.nodes.some(n=>n.id==='e34sys:manual-gearbox'||n.id==='e34sys:clutch-assembly')).toBe(false);
   expect(m.nodes.some(n=>n.id==='e34sys:gear-lever')).toBe(true);
   expect(m.limits).toContain('Automatic gearbox and torque-converter geometry is not modeled');
  }else expect(m.nodes.some(n=>n.systemIds.includes('system:transmission')&&!!n.assetId)).toBe(true);
 });
 it('keeps all referenced GLBs and actual thumbnails pinned to their content',()=>{
  const checked=new Set<string>();
  for(const [index,m]of models.entries()){
   const r=releases[index];expect(digest(fs.readFileSync(releasePublic +r.manifestUrl))).toBe(r.sha256);
   for(const a of m.assets){if(checked.has(a.url))continue;checked.add(a.url);const b=fs.readFileSync(releasePublic +a.url);expect(b.length).toBe(a.bytes);expect(digest(b)).toBe(a.sha256);expect(b.subarray(0,4).toString()).toBe('glTF');}
   const prior=panelArchives.find(pin=>pin.id===r.id);
   const previous=prior?parseReference(JSON.parse(fs.readFileSync(releasePublic +prior.manifestUrl,'utf8'))):null;
   for(const n of m.nodes.filter(n=>n.assetId)){const original=previous?.nodes.find(node=>node.id===n.id);if(!original?.thumbnail&&!n.thumbnail)continue;expect(n.thumbnail).toBeTruthy();const image=fs.readFileSync(releasePublic +n.thumbnail);expect(image.subarray(1,4).toString()).toBe('PNG');expect(digest(image)).toBe(n.thumbnail!.split('/').at(-1)!.slice(0,-4));}
  }
 });
 it('keeps every catalog position attached to the selected source context',()=>{
  const pages=new Map<string,CatalogPage>();
  for(const m of models){const c=m.catalog!;
   for(const a of Object.values(c.assemblies)){if(!pages.has(a.url)){const bytes=fs.readFileSync(releasePublic +a.url);expect(digest(bytes)).toBe(a.sha256);pages.set(a.url,JSON.parse(bytes.toString()));}const page=pages.get(a.url)!;expect(page.contextId).toBe(c.context.id);expect(page.assemblyId).toBe(a.id);expect(page.items).toHaveLength(a.itemCount);}
   for(const binding of Object.values(c.bindings))for(const position of binding.positions){const assembly=c.assemblies[position.assemblyId];expect(assembly).toBeTruthy();const found=pages.get(assembly.url)!.items.find(p=>p.id===position.id);expect(found?.partId).toBe(position.partId);expect(found?.number).toBe(position.number);}
  }
 });
 it('checks the original manifest hash after decoding the production payload', async () => {
  const bytes = fs.readFileSync(releasePublic +service525i.manifestUrl);
  vi.stubGlobal('fetch',vi.fn(async() => new Response(new Uint8Array(gzipSync(bytes)))));
  expect((await loadReference(new AbortController().signal, service525i.revision, service525i.id)).id).toBe(service525i.id);
  vi.stubGlobal('fetch',vi.fn(async() => new Response(new Uint8Array(gzipSync(Buffer.from('{}'))))));
  await expect(loadReference(new AbortController().signal, service525i.revision, service525i.id)).rejects.toThrow('version did not match');
 });
 it('uses the updated automatic geometry while keeping the original receipt',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(input:string)=>new Response(fs.readFileSync(releasePublic +input))));
  const latest=await loadReference(new AbortController().signal,undefined,automatic525i.id);
  expect(latest.revision).toBe(service525i.revision);
  expect(latest.nodes.filter(n=>n.assetId)).toHaveLength(service525i.renderableCount);
  expect(latest.nodes.find(n=>n.id==='e34sys:center-bearing-insert')?.oem).toBe('26121225071');
  for(const asset of latest.assets)expect(digest(fs.readFileSync(releasePublic +asset.url))).toBe(asset.sha256);
  expect(referenceRelease(automatic525i.revision,automatic525i.id)).toEqual(automatic525i);
 });
 it('retains views for every model when another model is saved or deleted',()=>{
  let all:unknown[]=[];
  for(const release of vehicleReferences)all=mergeReferenceViews(all,[{name:release.id,revision:release.revision,view:defaultView(),camera:null}],release.revision);
  expect(all).toHaveLength(10);all=mergeReferenceViews(all,[],releases[0].revision);expect(all).toHaveLength(9);
  expect(all.some(x=>savedView(x)?.revision===current.revision)).toBe(true);
 });
});
describe('consistent held separation',()=>{
 it('finds clear display space beyond the former travel cap',()=>{
  const box=new Box3(new Vector3(0,0,0),new Vector3(1,1,1)),occupied=[new Box3(new Vector3(-10,-10,-10),new Vector3(10,10,10))];
  expect(clearDisplayRay(box,new Vector3(1,0,0),occupied)).toBeGreaterThan(10);
 });
 it.each(models.map((m,i)=>({m,id:releases[i].id})))('$id separates independently movable units and keeps geometry proportions',({m})=>{
  const plan=referenceVariantOffsets(m,'vehicle');expect(referenceVariantOffsets(m,'vehicle')).toBe(plan);
  const groups=new Map<string,Box3>(),installed=new Box3(),display=new Box3();
  for(const n of m.nodes.filter(n=>n.assetId&&n.bounds)){
   const delta=plan.get(n.id)!;expect(delta).toBeTruthy();expect(delta.every(Number.isFinite)).toBe(true);
   const original=new Box3(new Vector3(...n.bounds!.min),new Vector3(...n.bounds!.max)).applyMatrix4(new Matrix4().fromArray(n.matrix));
   const moved=original.clone().translate(new Vector3(...delta));expect(moved.getSize(new Vector3()).distanceTo(original.getSize(new Vector3()))).toBeLessThan(1e-10);
   installed.union(original);display.union(moved);
   const key=delta.map(v=>v.toFixed(12)).join(',');if(!groups.has(key))groups.set(key,new Box3());groups.get(key)!.union(moved);
   expect(componentPlan(m,'vehicle',n).path[0]).toEqual(delta);
  }
  const boxes=[...groups.values()];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i].clone().expandByScalar(-1e-7),b=boxes[j].clone().expandByScalar(-1e-7);expect(a.intersectsBox(b),`independent units ${i}/${j}`).toBe(false);}
  const size=(b:Box3)=>Math.max(...b.getSize(new Vector3()).toArray());expect(size(display)).toBeGreaterThanOrEqual(size(installed)*3-1e-5);
  const engine=members(m,'system:engine');expect([...engine].some(id=>plan.has(id))).toBe(true);
  const visible=visibleNodes(m,{...defaultView(),explosion:4});expect(visible.length).toBe(m.nodes.filter(n=>n.assetId).length);
 });
 it('leaves the existing 525i geometry and component separation policy intact',()=>{
  const base=parseReference(JSON.parse(fs.readFileSync(releasePublic +current.manifestUrl,'utf8')));
  expect(digest(fs.readFileSync(releasePublic +current.manifestUrl))).toBe(current.sha256);expect(base.vehicleReference).toBeUndefined();
  const n=base.nodes.find(n=>n.id==='m50:water-pump')!;expect(componentPlan(base,'vehicle',n)).toEqual({group:n.id,path:[[1.4,.35,0].map((x,i)=>x+componentPlan(base,'m50:assembly',n).path[0][i]*.65)],start:0,end:1});
 });
});

describe('opening panel coverage', () => {
 it.each(['left', 'right'])('shows the E30 %s door shell and card together with the body on', side => {
  const model = parseReference(JSON.parse(fs.readFileSync(releasePublic + e30.manifestUrl, 'utf8')));
  const door = 'e30body:door-' + side;
  const visible = visibleNodes(model, { ...defaultView(), openPanels: [door] });
  expect(visible.map(node => node.id)).toEqual(expect.arrayContaining([door, door + ':inner-shell', door + ':door-card']));
  for (const suffix of [':inner-shell', ':door-card']) {
   expect(model.nodes.find(node => node.id === door + suffix)?.parentId).toBe(door);
  }
 });
 it.each([...vehicleReferences, e30])('retains independently inspectable panels and archived records for $id', pin => {
  const model = parseReference(JSON.parse(fs.readFileSync(releasePublic +pin.manifestUrl,'utf8')));
  const labels = model.openingPanels!.map(panel => panel.label);
  expect(labels).toEqual(expect.arrayContaining(['Hood','Fuel door','Glove box','Spare-wheel cover']));
  const doors = model.openingPanels!.filter(panel => /^(?:Left|Right|Front|Rear).*door$/i.test(panel.label));
  expect(doors).toHaveLength(pin.id.startsWith('e30') ? 2 : 4);
  expect(labels).toContain(pin.body==='Touring' ? 'Tailgate' : 'Trunk');
  if (pin.body==='Touring') expect(labels).toEqual(expect.arrayContaining(['Rear glass','Front sunroof','Rear sunroof']));
  else expect(labels).toContain('Sunroof');
  const previousPin = panelArchives.filter(archive => archive.id===pin.id).sort((a,b) => b.revision-a.revision)[0];
  expect(previousPin).toBeDefined();
  const previousBytes = fs.readFileSync(releasePublic + previousPin!.manifestUrl);
  expect(digest(previousBytes)).toBe(previousPin!.sha256);
  const previous = parseReference(JSON.parse(previousBytes.toString()));
  expect(referenceRelease(previous.revision, previous.id)).toMatchObject({sha256:previousPin!.sha256});
  for (const {id} of previous.openingPanels ?? []) {
   expect(model.openingPanels?.some(panel => panel.id===id)).toBe(true);
   const binding = previous.catalog?.bindings[id];
   if (binding) expect(model.catalog?.bindings[id]).toEqual(binding);
  }
 });
});

describe('center console references', () => {
 it.each([
  {pin:service525i, console:'e34trim:storing-partition', grip:'e34trim:selector-grip', number:'25161216464'},
  ...[e30,...e30Variants].map(pin=>({
   pin, console:'e30trim:front-console',
   grip:pin.transmission==='Automatic'?'e30trim:automatic-lever':'e30trim:manual-shift-knob',
   number:pin.transmission==='Automatic'?'25161216464':'25117500299',
  })),
 ])('shows the correct selector in the cabin and separates it from the trim for $pin.label', ({pin,console:consoleId,grip,number})=>{
  const model=readModel(pin);
  const e34 = pin.id.startsWith('e34-');
  const boundsFor = (id: string) => {
    const node = model.nodes.find(part => part.id === id);
    expect(node?.bounds, id).toBeDefined();
    const { min, max } = node!.bounds!;
    return new Box3(new Vector3(...min), new Vector3(...max)).applyMatrix4(new Matrix4().fromArray(node!.matrix));
  };
  const rearSeat = boundsFor(e34 ? 'e34sys:rear-seat-cushion' : 'e30assembly:cabin:rear-bench');
  const rearParts = e34
    ? ['e34trim:center-console', 'e34trim:rear-console-tray', 'e34hvac:rear-console-vent']
    : ['e30assembly:cabin-floor:console', 'e30trim:rear-ashtray', 'e30trim:rear-console-nut'];
  for (const id of rearParts) expect(boundsFor(id).min.x - rearSeat.max.x, id).toBeGreaterThanOrEqual(.075);

  const view={...defaultView(),scope:'system:center-console'};
  const cabin=visibleNodes(model,{...defaultView(),cabin:'driver'}).map(node=>node.id);
  expect(cabin).toEqual(expect.arrayContaining([consoleId,grip]));
  expect(model.catalog?.bindings[grip]?.positions.map(position=>position.number)).toContain(number);
  const assembled=offsets(model,view), exploded=offsets(model,{...view,explosion:4});
  expect(assembled.get(grip)).toEqual([0,0,0]);
  expect(exploded.get(grip)).toBeDefined();
  expect(exploded.get(grip)).not.toEqual(exploded.get(consoleId));
  const oppositeGrip=pin.transmission==='Automatic'?'e30trim:manual-shift-knob':'e30trim:automatic-lever';
  expect(cabin).not.toContain(oppositeGrip);
 });
});

it.each([service525i,e30])('publishes guided repairs with all their modeled parts for $id', pin => {
 const model=parseReference(JSON.parse(fs.readFileSync(releasePublic+pin.manifestUrl,'utf8')));
 const ids=availableAssemblyServices(model).map(service=>service.id);
 const published=Object.values(assemblyProcedures)
  .filter(job=>job.modelId===pin.id && pin.revision>=(job.minimumRevision??0))
  .map(job=>job.id);
 expect(ids.sort()).toEqual(published.sort());
 const series=pin.id.startsWith('e30')?'e30':'e34';
 expect(ids).toEqual(expect.arrayContaining([
  series+'-water-pump',series+'-thermostat',series+'-rear-brakes',series+'-cooling-fan',
 ]));
});
