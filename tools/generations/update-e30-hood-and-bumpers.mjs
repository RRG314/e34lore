import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Box3, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {buildE30Exterior} from './e30-325i-exterior.mjs';
import {compactPart} from '../geometry/local-cabin-glb.mjs';
import {compressGeometryGlb} from '../geometry/compress-glb.mjs';
import {immutable, localReferenceTools, readJson, replaceJson, sha} from '../geometry/local-reference-review.mjs';

const revision=1170, pinPath='data/digital-twin/e30-candidate.json', archivePath='data/digital-twin/workshop-panel-archives.json';
const current=await readJson(pinPath), archive=await readJson(archivePath);
const prior=[current,...archive].find(pin=>pin.id===current.id&&pin.revision===1169);
assert(prior,'Missing reviewed 325i baseline');
const bytes=await fs.readFile('public'+prior.manifestUrl);
assert.equal(sha(bytes),prior.sha256);
const baseline=JSON.parse(bytes), model=JSON.parse(bytes), nodes=new Map(model.nodes.map(n=>[n.id,n]));
const exterior=model.assets.find(a=>a.id==='e30:325i-exterior');
const receive=async (asset,reader)=>{
  const bytes=await fs.readFile('public'+asset.url);
  assert.equal(sha(bytes),asset.sha256);
  const {scene}=await reader.parseAsync(Uint8Array.from(bytes).buffer,'');
  scene.updateMatrixWorld(true);
  return scene;
};
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const scene=await receive(exterior,loader);
const expected=new Set(['hood','front-fender-left','front-fender-right','front-panel','kidney-grilles','headlamps-left','headlamps-right','rear-bumper']);
const scenes=new Map([[exterior.id,scene]]);
buildE30Exterior((parent,key,label,position,direction,draw)=>{
  if(!expected.delete(key))return;
  const node=nodes.get((parent==='e30body:assembly'?'e30body':parent)+':'+key)??nodes.get('e30body:'+key);
  const previous=scene.getObjectByName(node.meshNames[0]);
  assert(previous?.parent,node.id);
  const group=new Group();
  group.name=previous.name;
  draw(group);
  compactPart(group);
  const bounds=new Box3().setFromObject(group,true);
  node.bounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
  previous.parent.add(group);
  previous.removeFromParent();
});
assert.equal(expected.size,0);
scene.updateMatrixWorld(true);

function exteriorBounds(model){
  const box=new Box3();
  for(const n of model.nodes.filter(node=>node.id.startsWith('e30body:')&&node.assetId===exterior.id&&!node.id.includes('mirror'))) {
    box.union(new Box3(new Vector3(...n.bounds.min),new Vector3(...n.bounds.max)).applyMatrix4(new Matrix4().fromArray(n.matrix)));
  }
  return [...box.min,...box.max];
}
const before=exteriorBounds(baseline);
assert(exteriorBounds(model).every((v,i)=>Math.abs(v-before[i])<.012),'E30 body envelope changed by more than 12 mm');
const material=new MeshBasicMaterial({side:DoubleSide});
async function meshes(id, materialName){
  const n=nodes.get(id);
  if(!scenes.has(n.assetId)){
    const reader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'fit-probe',loadMaterial:()=>Promise.resolve(material)}));
    scenes.set(n.assetId,await receive(model.assets.find(a=>a.id===n.assetId),reader));
  }
  const object=scenes.get(n.assetId).getObjectByName(n.meshNames[0]), world=new Matrix4().fromArray(n.matrix), result=[];
  assert(object,id);
  object.traverse(c=>{if(c.isMesh&&(!materialName||c.material.name===materialName)){const m=new Mesh(c.geometry,material);m.matrixWorld.multiplyMatrices(world,c.matrixWorld);result.push(m);}});
  return result;
}
const hood=await meshes('e30body:hood');
const ray=new Raycaster(new Vector3(),new Vector3(0,-1,0),0,.55);
const clearanceMm={};
for(const name of ['radiator-support','airbox','washer-reservoir','expansion-tank','abs-pump','fuse-box-cover']){
  let gap=Infinity;
  for(const m of await meshes('e30assembly:engine-bay:'+name)){
    const a=m.geometry.attributes.position,p=new Vector3();
    for(let i=0;i<a.count;i+=3){
      p.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);
      if(p.y<.712||Math.abs(p.z)>.74||p.x<.87)continue;
      ray.ray.origin.set(p.x,1.15,p.z);
      const top=ray.intersectObjects(hood)[0];
      if(top)gap=Math.min(gap,top.point.y-p.y);
    }
  }
  if(Number.isFinite(gap))clearanceMm[name]=Math.round(gap*1000);
  assert(gap>.002,name+' protrudes through the new bonnet: '+clearanceMm[name]+' mm');
}
const wheelhouseClearanceMm={};
for(const side of [-1,1]){
  const fender=await meshes('e30body:front-fender-'+(side<0?'left':'right'));
  const sideName=side<0?'left':'right';
  const tower=await meshes('e30assembly:engine-bay:tower-'+sideName);
  let clearance=Infinity,samples=0;
  for(const x of [1.28,1.5,1.68,1.75,1.8,1.89]){
    for(const z of [.736,.747,.758,.769,.779]){
      ray.ray.origin.set(x,1.15,side*z);
      const painted=ray.intersectObjects(fender).find(hit=>hit.point.y>.70);
      const inner=ray.intersectObjects(tower)[0];
      if(!painted||!inner)continue;
      clearance=Math.min(clearance,painted.point.y-inner.point.y);
      samples++;
    }
  }
  assert(samples>9&&clearance>.004,sideName+' wheelhouse reaches painted fender: '+Math.round(clearance*1000)+' mm');
  wheelhouseClearanceMm[sideName]=Math.round(clearance*1000);
  // Sample the thin seam near the inner fender. Retain the outer headlamp
  // and grille support in their existing positions when rounding the hood.
  for(const x of [.91,1.02,1.28,1.57,1.81,1.95,2.00]){
    const seams=[];
    for(const set of [hood,fender]){
      const hits=[];
      for(let j=0;j<=250;j++){
        const z=.65+j*.00064;
        ray.ray.origin.set(x,1.15,side*z);
        if(ray.intersectObjects(set).some(hit=>hit.point.y>.71))hits.push(z);
      }
      assert(hits.length,'Missing hood or fender section at '+x);
      seams.push(hits);
    }
    const gap=seams[1][0]-seams[0].at(-1);
    assert(gap>=-.001&&gap<=.011,'Hood/fender edge discontinuity at '+x+': '+Math.round(gap*1000)+' mm');
  }
}
const trim=await meshes('e30body:rear-bumper','Rubber');
assert(trim.length,'Rear moulding geometry is missing');
const stripeHeights={};
for(const [side,label] of [[-1,'left'],[1,'right']]){
  const quarter=await meshes('e30body:rear-quarter-'+label);
  const caster=new Raycaster(new Vector3(),new Vector3(0,0,-side),0,.18);
  const rows=[];
  for(const x of [-1.98,-1.90,-1.78,-1.66,-1.58]){
    const heights=[];
    for(let y=.455;y<=.544;y+=.001){
      caster.ray.origin.set(x,y,side*.905);
      const trimHit=caster.intersectObjects(trim)[0], quarterHit=caster.intersectObjects(quarter)[0];
      if(trimHit){
        assert(!quarterHit||trimHit.distance<quarterHit.distance-.001,'Rear moulding is hidden by the quarter at '+x);
        heights.push(y);
      }
    }
    assert(heights.length>=53,'Rear moulding tapers before the wheel opening at '+x);
    rows.push([heights[0],heights.at(-1)]);
  }
  for(const edge of [0,1]){
    const heights=rows.map(pair=>pair[edge]);
    assert(Math.max(...heights)-Math.min(...heights)<=.004,'Rear moulding edge changes height on the '+label);
  }
  stripeHeights[label]=rows.map(([low,high])=>Math.round((high-low)*1000));
}
// Trunk and hood keep the same identity, pivots and exploded motion.
assert.deepEqual(model.nodes.map(({id,parentId,matrix,explode})=>[id,parentId,matrix,explode]),
  baseline.nodes.map(({id,parentId,matrix,explode})=>[id,parentId,matrix,explode]));
assert.deepEqual(model.openingPanels,baseline.openingPanels);
assert.deepEqual(model.catalog.bindings,baseline.catalog.bindings);

globalThis.FileReader=class {async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const prefix='/models/e30-lore/r'+revision+'/';
const data=await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true})));
const digest=sha(data);
Object.assign(exterior,{url:prefix+digest+'.glb',bytes:data.length,sha256:digest});
model.revision=revision;
model.catalog.modelRevision=revision;
const {parseReference}=await localReferenceTools();
assert.equal(parseReference(model).nodes.length,baseline.nodes.length);
const manifest=Buffer.from(JSON.stringify(model)), hash=sha(manifest);
const pin={...prior,revision,manifestUrl:prefix+'manifest.'+hash+'.json',sha256:hash,
  assetBytes:model.assets.reduce((sum,a)=>sum+a.bytes,0)};
assert(pin.assetBytes<=24*1024*1024);
await immutable('public'+exterior.url,data);
await immutable('public'+pin.manifestUrl,manifest);
if(!archive.some(saved=>saved.id===prior.id&&saved.revision===prior.revision))await replaceJson(archivePath,[...archive,prior]);
if(current.sha256!==pin.sha256) await replaceJson(pinPath,pin);
console.log(JSON.stringify({revision,assetBytes:pin.assetBytes,clearanceMm,wheelhouseClearanceMm,stripeHeights}));
