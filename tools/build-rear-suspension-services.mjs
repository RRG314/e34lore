/** Add the rear suspension to the local Workshop preview following its rear final drive. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Matrix4, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { siteContent } from '../scripts/site-content.mjs';
import { buildE34RearCarrier } from './geometry/525i-suspension.mjs';
import { buildE30RearCarrier } from './geometry/rear-final-drive.mjs';
import { buildRearSuspension, rearSuspensionDatums } from './geometry/rear-suspension-service.mjs';
import { compactPart } from './geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from './geometry/compress-glb.mjs';
import { immutable, localReferenceTools, nameOf, readJson, replaceJson, sha } from './geometry/local-reference-review.mjs';

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};

const series = process.argv[2];
assert(series === 'e30' || series === 'e34', 'Specify e30 or e34.');
const e30 = series === 'e30';
const content = siteContent();
assert(content.release, 'Set E34_ASSET_PACK to the Workshop asset pack.');
const directory = e30 ? 'work/e30/getrag-service' : 'work/525i-service-candidate';
const receiptFile = directory + (e30 ? '/review.json' : '/fit-review.json');
const { archives = [], ...current } = await readJson(receiptFile);
const pinOf = entry => e30 ? entry : entry.release;
const baseline = await readJson('data/digital-twin/' + (e30 ? 'e30-candidate' : '525i-service-release') + '.json');
const revision = baseline.revision + 3;
const earlier = [current, ...archives].filter(entry => pinOf(entry).revision < revision);
const prior = earlier.find(entry => pinOf(entry).revision === revision - 1);
assert(prior, 'Generate the local rear final drive reference first.');
const pin = pinOf(prior);
const prefix = '/models/' + series + '-lore/r' + revision + '/';
const localPath = url => directory + (e30 ? url : '/' + nameOf(url));

async function checked(filename, digest) {
  const bytes = await fs.readFile(filename);
  assert.equal(sha(bytes), digest, filename);
  return bytes;
}

const model = JSON.parse(await checked(localPath(pin.manifestUrl), pin.sha256));
const {catalog} = model;
const nodes = new Map(model.nodes.map(node => [node.id, node]));
const asset = model.assets.find(asset => asset.id === (e30 ? 'e30:325i-mechanical' : 'authored:525i-bay-suspension'));
assert(asset);
const source = (await fs.stat(localPath(asset.url)).catch(() => null)) ? localPath(asset.url) : content.publicDir + asset.url;
const {scene} = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(Uint8Array.from(await checked(source, asset.sha256)).buffer, '');
const carrierId = e30 ? 'e30assembly:rear-axle:rear-subframe' : 'e34sys:rear-subframe';
const hubIds = e30 ? {left:'e30assembly:rear-left:hub',right:'e30assembly:rear-right:hub'}
  : {left:'e34sys:hub-rear-1',right:'e34sys:hub-rear--1'};
const hubs = Object.fromEntries(Object.entries(hubIds).map(([side,id])=>[side,nodes.get(id).matrix.slice(12,15)]));
const stableNames = e30 ? {arm:'trailing-arm',spring:'spring',damper:'damper'}
  : {arm:'trailing-arm',spring:'coil-spring',damper:'damper','top-mount':'top-mount','lower-pad':'spring-pads',boot:'dust-tube'};
const pageIds = e30 ? {
  arm:'bf3c80229c1825de1172769d',strut:'21fecb741ea61a8917e05ac5',carrier:'bf3c80229c1825de1172769d',bar:'b928a6fd95d0bff1720a9ff3',
} : {
  arm:'62ac4f997b71df4add6c56f0',strut:'a0715708a7e7ffa21611266b',carrier:'b47268642ef28e7ced37daaf',bar:'922d7dfb0576a329d4ba05bc',
};
const catalogPages = new Map();
for (const [key,id] of Object.entries(pageIds)) {
  const page=catalog.assemblies['catalog-assembly-'+id];
  assert(page,id);
  const {items}=JSON.parse(await checked(content.publicDir+page.url,page.sha256));
  catalogPages.set(key,{page,items});
}

const removeOldMeshes = node => {
  if (node?.assetId !== asset.id) return;
  for (const name of node.meshNames) {
    const object = scene.getObjectByName(name);
    assert(object, name);
    object.removeFromParent();
  }
};
const built=new Map();
function add(key,name,point,draw,pageKey,numbers=[],axis,meta={}) {
  const [side,part] = key.split(':');
  const stable = stableNames[part];
  const id = key === 'carrier' ? carrierId : stable
    ? (e30 ? 'e30assembly:rear-'+side+':'+stable : 'e34sys:rear-'+stable+'-'+(side==='left'?'1':'-1'))
    : series+'rear-suspension:'+key;
  const existing = nodes.get(id);
  removeOldMeshes(existing);
  const group=new Group();
  group.name='rear_suspension_'+key.replace(/[:-]/g,'_');
  draw(group);
  compactPart(group);
  for (const mesh of group.children) {
    const points = mesh.geometry.getAttribute('position').array;
    for (let index=0;index<points.length;index++) points[index]=Math.round(points[index]*65536)/65536;
  }
  const bounds=new Box3().setFromObject(group,true);
  assert(!bounds.isEmpty(),id);
  scene.add(group);
  const matrix=new Matrix4();
  if(axis) matrix.makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(...axis).normalize()));
  matrix.setPosition(...point);
  built.set(key,{point,matrix,bounds,meta});
  const {page,items}=catalogPages.get(pageKey);
  const rows=items.filter(item=>numbers.includes(item.number));
  assert(numbers.every(number=>rows.some(item=>item.number===number)),id+' catalog numbers');
  const positions=rows.map(({id,number,partId})=>({id,number,partId,assemblyId:page.id}));
  const verified=positions.length===1?positions[0]:undefined;
  const x=point[0], z=point[2], sign=side==='left'?-1:1;
  const addID = part => series+'rear-suspension:'+side+':'+part;
  const parent=part?.endsWith('bracket')?carrierId:
    ['upper-nut','upper-stud'].some(s=>part?.startsWith(s))?addID('mount-gasket'):existing?.parentId??'system:rear-suspension';
  const systemIds=[...new Set([...(existing?.systemIds??[]),'system:rear-suspension','system:suspension'])];
  nodes.set(id,{
    ...existing,id,name,kind:existing?.kind??'part',parentId:parent,assetId:asset.id,meshNames:[group.name],
    matrix:matrix.toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},systemIds,
    oem:verified?.number??null,canonicalId:verified?.partId??null,thumbnail:existing?.thumbnail??null,
    sourceContext:verified?{contextId:catalog.context.id,assemblyId:page.id,positionId:verified.id}:undefined,
    guideIds:existing?.guideIds??[],
    displayDirection:key==='carrier'?[0,-.50,0]:part==='spring'?[.18,.35,sign*.57]:
      part?.includes('bolt')?[.18,-.27,sign*.76]:part?.includes('nut')?[.30,.27,sign*.76]:
      part?.endsWith('bushing')?[.30,-.27,sign*.73]:part?.startsWith('upper')?[0,.40,sign*.53]:
      [x< -1.2?-.23:.19,z===0?-.15:-.26,sign*.52],
    internal:false,
  });
  if(key==='carrier'&&catalog.bindings[id])return;
  const chapter=e30?'33':'330';
  const manuals=pageKey==='strut'?(e30
    ? [[636,'33-16','BMW · Rear shock removal and refit'],[637,'33-17','BMW · Rear spring removal and refit']]
    : [[301,'330-3','Bentley · Rear strut removal'],[302,'330-4','Bentley · Spring and shock disassembly']])
    : e30?[[628,'33-7','BMW · Rear trailing arm removal and refit'],[629,'33-8','BMW · Rear trailing arm bushings']]
    : [[306,'330-8','Bentley · Rear trailing arm removal and refit'],[308,'330-10','Bentley · Rear trailing arm bushings']];
  catalog.bindings[id]={
    nodeId:id,title:name,kind:verified?'component':'reference',assemblyIds:[page.id],positions,guideIds:existing?.guideIds??[],
    manual:manuals.map(([page,printed,title])=>({chapter,page,pdf:page,printed,title,href:(e30?'/e30':'')+'/manual/'+chapter+'?pdf='+page,guides:[]})),
    note:part?.endsWith('bushing')?(e30?'30':'44')+' mm standard concentric bushing. Match the installed suspension and wheel alignment.':'',
    visualSources:[{title:'BMW '+page.title,url:page.sourceUrl}],
  };
}

const rearDiff=nodes.get(e30?'e30assembly:rear-final-drive:case':'e34sys:differential-case').matrix.slice(12,15);
add('carrier','Rear axle carrier',[0,0,0],g=>e30?buildE30RearCarrier(g,rearDiff,false):buildE34RearCarrier(g,false),'carrier');
buildRearSuspension(series,[0,0,0],hubs,add);

for (const [side,sign] of [['left',-1],['right',1]]) {
  const datums=rearSuspensionDatums(series,sign);
  const part=key=>built.get(side+':'+key);
  for (const [i,end] of ['inner','outer'].entries()) {
    const {point,bounds,matrix}=part(end+'-bushing');
    assert.deepEqual(point,datums.pivots[i],side+' '+end+' bushing');
    assert.deepEqual(point,part(end+'-bracket').point,side+' '+end+' bracket');
    assert.deepEqual(matrix.elements,part(end+'-bolt').matrix.elements,side+' '+end+' bolt axis');
    assert(Math.abs(bounds.max.x-datums.bushingDiameter/2-.003)<.001,side+' catalog bushing bore');
  }
  assert.deepEqual(part('lower-bolt').point,part('damper').point,side+' lower shock bolt centre');
  assert.deepEqual(part('damper').point,datums.shockFoot);
  assert.deepEqual(part('top-mount').point,datums.shockTop);
  const {springStart,springEnd,lowerSeat,upperSeat}=part('spring').meta;
  assert.deepEqual(part('lower-pad').point,lowerSeat);
  assert.deepEqual(part('upper-pad').point,upperSeat);
  const distance=(a,b)=>new Vector3(...a).distanceTo(new Vector3(...b));
  assert(Math.abs(distance(lowerSeat,springStart)-.010)<1e-6 && Math.abs(distance(upperSeat,springEnd)-.010)<1e-6);
  assert(Math.abs(part('spring').bounds.max.y-distance(springStart,springEnd))<.001);
  const wheel=nodes.get(e30?'e30assembly:rear-'+side+':wheel':'wheel:rear-'+side);
  const wheelBounds=new Box3(new Vector3(...wheel.bounds.min),new Vector3(...wheel.bounds.max))
    .applyMatrix4(new Matrix4().fromArray(wheel.matrix));
  const springBounds=part('spring').bounds.clone().applyMatrix4(part('spring').matrix);
  const lateralGap=sign<0?springBounds.min.z-wheelBounds.max.z:wheelBounds.min.z-springBounds.max.z;
  assert(lateralGap>=(e30?.005:.001),side+' spring clears the stock wheel in the installed model');
  const hd=new Vector3(...part('arm').point).sub(new Vector3(...hubs[side]));
  assert.equal(hd.x,0); assert.equal(hd.y,0);
}
const exported=Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true}));
const bytes=await compressGeometryGlb(exported);
const digest=sha(bytes);
Object.assign(asset,{bytes:bytes.length,sha256:digest,url:prefix+digest+'.glb'});

model.nodes=[...nodes.values()];
model.revision=catalog.modelRevision=revision;
catalog.coverage.renderable=model.nodes.filter(node=>node.assetId).length;
catalog.coverage.bound=Object.values(catalog.bindings).filter(binding=>binding.assemblyIds.length).length;
catalog.coverage.withCandidates=Object.values(catalog.bindings).filter(binding=>binding.positions.length).length;
const {parseReference,availableAssemblyServices}=await localReferenceTools();
const parsed=parseReference(model);
const suspensionJobs=availableAssemblyServices(parsed).filter(job=>job.scope==='system:rear-suspension');
assert.equal(suspensionJobs.length,e30?6:4,'All left and right suspension jobs must resolve to this model');
const manifest=Buffer.from(JSON.stringify(model));
const sha256=sha(manifest);
const release={
  ...pin,revision,sha256,manifestUrl:prefix+'manifest.'+sha256+'.json',renderableCount:catalog.coverage.renderable,
  assetBytes:model.assets.reduce((total,asset)=>total+asset.bytes,0),
};
assert(release.assetBytes<=24*1024*1024,'Reference exceeds the Workshop package limit');
await immutable(localPath(asset.url),bytes);
await immutable(localPath(release.manifestUrl),manifest);
await replaceJson(receiptFile,e30?{...release,archives:earlier}:{
  release,archives:earlier,files:[asset,{url:release.manifestUrl,sha256}].map(asset=>({
    url:asset.url,file:nameOf(asset.url),sha256:asset.sha256,
  })),
});
console.log(series+' r'+revision+' · '+release.assetBytes+' geometry bytes. Verified both pivots, damper mount centres, spring seats and hub registration.');
