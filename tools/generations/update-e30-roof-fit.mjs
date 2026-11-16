import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { compactPart } from '../geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from '../geometry/compress-glb.mjs';
import { immutable, localReferenceTools, readJson, replaceJson, sha } from '../geometry/local-reference-review.mjs';
import { buildE30Exterior, glassPoint } from './e30-325i-exterior.mjs';
import { buildE30Cabin } from './e30-cabin.mjs';

const pinPath='data/digital-twin/e30-candidate.json';
const archivePath='data/digital-twin/workshop-panel-archives.json';
const revision=1162, baseRevision=1161;
const current=await readJson(pinPath), archive=await readJson(archivePath);
const prior=[current,...archive].find(pin=>pin.id===current.id && pin.revision===baseRevision);
assert(prior,'Missing the 325i roof-fit baseline');
const raw=await fs.readFile('public'+prior.manifestUrl);
assert.equal(sha(raw),prior.sha256);
const model=JSON.parse(raw), prefix='/models/e30-lore/r'+revision+'/';
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const nodes=new Map(model.nodes.map(node=>[node.id,node]));

globalThis.FileReader=class {
  async readAsArrayBuffer(blob) { this.result=await blob.arrayBuffer(); this.onloadend?.(); }
};

function checkClearance(group,translation,id) {
  const forwardGlassAt=(y,z)=>{
    let low=0,high=1;
    for(let i=0;i<24;i++){
      const u=(low+high)/2;
      let vl=0,vh=1;
      for(let j=0;j<20;j++){
        const v=(vl+vh)/2;
        if(glassPoint(true,u,v)[2]<z) vl=v; else vh=v;
      }
      const point=glassPoint(true,u,(vl+vh)/2);
      if(point[1]<y) low=u; else high=u;
    }
    const u=(low+high)/2;
    let lo=0,hi=1;
    for(let j=0;j<20;j++){
      const v=(lo+hi)/2;
      if(glassPoint(true,u,v)[2]<z) lo=v; else hi=v;
    }
    return glassPoint(true,u,(lo+hi)/2)[0];
  };
  let minimum=Infinity;
  group.traverse(child=>{
    if(!child.isMesh) return;
    const points=child.geometry.attributes.position, point=new Vector3();
    for(let i=0;i<points.count;i++){
      point.fromBufferAttribute(points,i).add(translation);
      minimum=Math.min(minimum,forwardGlassAt(point.y,point.z)-point.x);
    }
  });
  assert(minimum>.012,id+' windshield clearance '+Math.round(minimum*1000)+' mm');
  return Math.round(minimum*1000);
}

const replacements = new Map();
buildE30Exterior((parent,key,label,position,direction,draw)=>{
  if(key==='roof') replacements.set('e30body:roof',{position,draw});
});
buildE30Cabin((parent,key,label,position,direction,draw)=>{
  if(parent==='e30assembly:headlining' && ['headliner','visor-left','visor-right','check-panel','mirror'].includes(key))
    replacements.set(parent+':'+key,{position,draw});
}, (id)=>'e30assembly:'+id);
assert.equal(replacements.size,6);
const metrics={};
for (const asset of model.assets.filter(asset=>['e30:325i-exterior','e30:cabin'].includes(asset.id))) {
  const original=await fs.readFile('public'+asset.url);
  assert.equal(sha(original),asset.sha256);
  const {scene}=await loader.parseAsync(Uint8Array.from(original).buffer,'');
  for(const [id,replacement] of replacements) {
    const node=nodes.get(id);
    if(node?.assetId!==asset.id) continue;
    const existing=scene.getObjectByName(node.meshNames[0]);
    assert(existing?.parent,'Missing '+id);
    const group=new Group();
    group.name=existing.name;
    replacement.draw(group);
    compactPart(group);
    const box=new Box3().setFromObject(group,true), position=new Vector3(...replacement.position);
    assert(!box.isEmpty(),id+' has no geometry');
    node.bounds={min:box.min.toArray(),max:box.max.toArray()};
    node.matrix.splice(12,3,...replacement.position);
    if(asset.id==='e30:cabin' && !id.endsWith(':headliner')) metrics[id]=checkClearance(group,position,id);
    existing.parent.add(group);
    existing.removeFromParent();
  }
  const data=await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true})));
  const digest=sha(data);
  Object.assign(asset,{url:prefix+digest+'.glb',bytes:data.length,sha256:digest});
  await immutable('public'+asset.url,data);
}
model.revision=revision;
model.catalog.modelRevision=revision;
const {parseReference}=await localReferenceTools();
assert.equal(parseReference(model).nodes.length,JSON.parse(raw).nodes.length);
const manifest=Buffer.from(JSON.stringify(model)),digest=sha(manifest);
const pin={...prior,revision,manifestUrl:prefix+'manifest.'+digest+'.json',sha256:digest,
  assetBytes:model.assets.reduce((sum,asset)=>sum+asset.bytes,0)};
assert(pin.assetBytes<=24*1024*1024,'Geometry budget exceeded');
await immutable('public'+pin.manifestUrl,manifest);
if(!archive.some(pin=>pin.id===prior.id&&pin.revision===prior.revision)) await replaceJson(archivePath,[...archive,prior]);
await replaceJson(pinPath,pin);
console.log(JSON.stringify({revision,assetBytes:pin.assetBytes,minimumWindscreenClearanceMm:metrics}));
