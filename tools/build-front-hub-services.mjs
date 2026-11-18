/** Add separate hub service parts to the accepted rear axle reference. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Matrix4, Mesh, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { siteContent } from '../scripts/site-content.mjs';
import { compactPart } from './geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from './geometry/compress-glb.mjs';
import { buildFrontCorner } from './geometry/front-axle-service.mjs';
import { drawFrontBearingSpindle, drawFrontHub, drawFrontHubHardware, frontHubLayout } from './geometry/front-hub.mjs';
import { immutable, localReferenceTools, nameOf, readJson, replaceJson, sha } from './geometry/local-reference-review.mjs';

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
};

const series = process.argv[2];
assert(series==='e30'||series==='e34','Specify e30 or e34.');
const e30 = series==='e30', content = siteContent();
assert(content.release,'Set E34_ASSET_PACK to the Workshop asset pack.');
const fit = (await readJson('data/digital-twin/front-hub-references.json'))[series];
const { revision,modelId } = fit;
const root = e30?'work/e30/getrag-service':'work/525i-service-candidate';
const receiptPath = root+(e30?'/review.json':'/fit-review.json');
const { archives=[], ...current } = await readJson(receiptPath);
const pinOf = entry=>e30?entry:entry.release;
const earlier = [current,...archives].filter(entry=>pinOf(entry).revision<revision);
const pin = earlier.map(pinOf).find(entry=>entry.revision===revision-1);
assert.equal(pin?.id,modelId,'Generate the local rear axle reference first.');
const prefix = '/models/'+series+'-lore/r'+revision+'/';
const localPath = url=>root+(e30?url:'/'+nameOf(url));

async function checked(file,digest) {
  const bytes = await fs.readFile(file);
  assert.equal(sha(bytes),digest,file);
  return bytes;
}

const model = JSON.parse(await checked(localPath(pin.manifestUrl),pin.sha256));
const { catalog } = model;
const page = catalog.assemblies[fit.catalogAssembly];
assert(page);
const { items } = JSON.parse(await checked(content.publicDir+page.url,page.sha256));
const parts = new Map(items.map(item=>[item.number,item]));
for (const number of [fit.hub,fit.replacement,fit.nut,fit.cap,fit.shield]) {
  assert(parts.has(number),'Missing BMW catalog position '+number);
}
assert(parts.get(fit.hub).conditions.some(row=>row.value===(e30?'Anti block system (ABS)()':'D=83MM')));
assert(parts.get(fit.hub).conditions.some(row=>row.value===fit.replacement),'Replacement differs from catalog.');

const asset = model.assets.find(item=>item.id===(e30?'e30:325i-mechanical':'authored:525i-bay-suspension'));
assert(asset);
const { scene } = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(Uint8Array.from(await checked(localPath(asset.url),asset.sha256)).buffer,'');
const nodes = new Map(model.nodes.map(node=>[node.id,node]));
const pdf = e30?514:283, chapter = e30?'31':'310';
const ref = (pageNumber,printed,title)=>({chapter,page:pageNumber,pdf:pageNumber,printed,title,
  href:(e30?'/e30':'')+'/manual/'+chapter+'?pdf='+pageNumber,guides:[]});
const references = [
  ref(pdf,e30?'31-10':'310-7','Front hub removal'),
  ref(pdf+1,e30?'31-10.1':'310-8','Front hub installation'),
];
const replacedMeshes = new Set();

function writePart(id,name,parentId,matrix,draw,numbers=[],note='') {
  const previous = nodes.get(id);
  if(previous?.assetId===asset.id) for(const meshName of previous.meshNames) {
    if(replacedMeshes.has(meshName)) continue;
    const old = scene.getObjectByName(meshName);
    assert(old?.parent,meshName);
    old.removeFromParent();
    replacedMeshes.add(meshName);
  }
  const group = new Group();
  group.name = 'front_bearing_'+id.replace(/[^a-z0-9]/gi,'_');
  draw(group);
  compactPart(group);
  const bounds = new Box3().setFromObject(group,true);
  assert(!bounds.isEmpty(),id);
  const guideIds = previous?.guideIds??[];
  const sign = Math.sign(matrix.elements[14]);
  scene.add(group);
  nodes.set(id,{
    ...previous,id,name,parentId,kind:'part',assetId:asset.id,meshNames:[group.name],matrix:matrix.toArray(),
    bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},guideIds,thumbnail:previous?.thumbnail??null,
    systemIds:[...new Set([...(previous?.systemIds??[]),'system:suspension','system:front-suspension','system:front-brakes'])],
    internal:false,displayDirection:previous?.displayDirection??[0,.025,sign*.55],
  });
  if (numbers.length) {
    const positions = numbers.map(number=>{
      const row = parts.get(number);
      return { id:row.id, partId:row.partId, number, assemblyId:page.id };
    });
    Object.assign(nodes.get(id),{oem:numbers[0],canonicalId:positions[0].partId,
      sourceContext:{contextId:catalog.context.id,assemblyId:page.id,positionId:positions[0].id}});
    catalog.bindings[id] = {
      nodeId:id,title:name,kind:'component',assemblyIds:[page.id],positions,guideIds,manual:references,note,
      visualSources:[{title:'BMW '+page.title,url:page.sourceUrl}],
    };
  }
  return {group,bounds};
}

for (const side of ['left','right']) {
  const suffix = side==='left'?'1':'-1';
  const label = side[0].toUpperCase()+side.slice(1);
  const corner = 'e30assembly:front-'+side+':';
  const id = e30?corner+'hub':'e34sys:hub-front-'+suffix;
  const hub = nodes.get(id);
  const spindle = nodes.get(e30?corner+'strut-spindle':'e34axle:'+side+'-strut-spindle');
  const disc = nodes.get(e30?corner+'rotor':'e34sys:brake-disc-front-'+suffix);
  assert.deepEqual(hub.matrix.slice(12,15),disc.matrix.slice(12,15),side+' hub and disc center');
  assert.deepEqual(spindle.matrix.slice(12,14),disc.matrix.slice(12,14),side+' spindle and rotor axes');
  const layout = frontHubLayout(series,fit,disc,spindle,side);
  const matrix = new Matrix4().makeScale(1,1,layout.sign).setPosition(...disc.matrix.slice(12,15));
  const {group,bounds} = writePart(id,label+' front hub and integral bearing',hub.parentId,matrix,
    group=>drawFrontHub(group,layout),[fit.hub,fit.replacement],
    e30?'4 × 100 mm, 31 mm bore and integral ABS ring.':'5 × 120 mm, 37 mm bore and 83 mm symmetric ABS ring. Compare the installed rotor screw pattern.');
  const hardware = [
    ['cap','front hub grease cap',fit.cap,'Fit a new press-in cap after torquing and staking the new collar nut.'],
    ['nut','front hub collar nut',fit.nut,'Use a new nut. Tighten to 290 N·m and stake into the spindle groove.'],
    ['shield','inboard bearing dust collar',fit.shield,'Replace the dust collar if it was disturbed during race removal or is damaged.'],
  ];
  for (const [key,title,number,note] of hardware) {
    writePart(series+'front-hub:'+side+':'+key,label+' '+title,key==='shield'?spindle.id:id,matrix,
      group=>drawFrontHubHardware(group,key,layout),[number],note);
  }
  buildFrontCorner(series,side,(key,_name,point,draw)=>{
    if(key!=='strut-spindle') return;
    assert.deepEqual(point,spindle.matrix.slice(12,15));
    writePart(spindle.id,spindle.name,spindle.parentId,new Matrix4().fromArray(spindle.matrix),draw);
  },group=>drawFrontBearingSpindle(group,layout));

  assert(Math.abs((bounds.max.x-bounds.min.x)*1000-fit.flange)<.2,side+' flange diameter');
  assert(layout.capSeat>layout.flats/Math.sqrt(3),side+' collar socket access');
  assert(layout.back+layout.spindleOffset>0,side+' seat in front of strut casting');
  assert(layout.raceFace+layout.nutHeight<layout.face+.0072,side+' nut clearance inside cap');
  group.updateMatrixWorld(true);
  const hits = (x,y)=>new Raycaster(new Vector3(x,y,layout.face+.0003),new Vector3(0,0,-1),0,.0082)
    .intersectObject(group,true).length;
  for (const [x,y] of [...layout.lugCenters,layout.rotorFixing]) assert.equal(hits(x,y),0,side+' open mounting hole');
  assert(hits(.049*Math.cos(.63),.049*Math.sin(.63))>0,side+' solid and flat flange between bolt holes');
}

assert(![...nodes.values()].some(node=>node.assetId===asset.id&&node.meshNames.some(name=>replacedMeshes.has(name))),
  'A retained part still refers to old wheel-end geometry.');
assert([...scene.children].some(group=>group.name.startsWith('front_bearing_')&&group.children.some(mesh=>mesh instanceof Mesh)));
const bytes = await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true})));
const assetSha = sha(bytes);
Object.assign(asset,{bytes:bytes.length,sha256:assetSha,url:prefix+assetSha+'.glb'});
model.nodes = [...nodes.values()];
model.revision = catalog.modelRevision = revision;
catalog.coverage.renderable = model.nodes.filter(node=>node.assetId).length;
catalog.coverage.bound = Object.values(catalog.bindings).filter(binding=>binding.assemblyIds.length).length;
catalog.coverage.withCandidates = Object.values(catalog.bindings).filter(binding=>binding.positions.length).length;
const { parseReference,availableAssemblyServices } = await localReferenceTools();
const jobs = availableAssemblyServices(parseReference(model));
for (const side of ['left','right']) assert(jobs.some(job=>job.id===series+'-'+side+'-front-hub'),'Missing new job '+side);
assert(jobs.some(job=>job.id===series+'-front-strut'),'Existing strut job must stay available.');
assert(jobs.some(job=>job.id===series+'-front-brakes'),'Existing brake job must stay available.');
assert(jobs.some(job=>job.id===series+'-left-rear-wheel-bearing'),'Accepted rear hub job must stay available.');
const manifest=Buffer.from(JSON.stringify(model)), sha256=sha(manifest);
const release = {...pin,revision,sha256,manifestUrl:prefix+'manifest.'+sha256+'.json',
  renderableCount:catalog.coverage.renderable,assetBytes:model.assets.reduce((total,asset)=>total+asset.bytes,0)};
assert(release.assetBytes<=24*1024*1024,'Reference exceeds the Workshop package limit.');
await immutable(localPath(asset.url),bytes);
await immutable(localPath(release.manifestUrl),manifest);
await replaceJson(receiptPath,e30?{...release,archives:earlier}:{
  release,archives:earlier,files:[asset,{url:release.manifestUrl,sha256}].map(item=>({url:item.url,file:nameOf(item.url),sha256:item.sha256})),
});
console.log(series+' r'+revision+' · '+release.assetBytes+' geometry bytes; mirrored hubs and service steps verified.');
