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

const revision=1165, pinPath='data/digital-twin/e30-candidate.json', archivePath='data/digital-twin/workshop-panel-archives.json';
const current=await readJson(pinPath), archive=await readJson(archivePath);
const prior=[current,...archive].find(pin=>pin.id===current.id&&pin.revision===1164);
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
const expected=new Set(['hood','front-fender-left','front-fender-right']);
buildE30Exterior((parent,key,label,position,dir,draw)=>{
  if(parent!=='e30body:assembly'||!expected.delete(key))return;
  const node=nodes.get('e30body:'+key), old=scene.getObjectByName(node.meshNames[0]);
  assert(old?.parent,key);
  const g=new Group();g.name=old.name;draw(g);compactPart(g);
  const box=new Box3().setFromObject(g,true);node.bounds={min:box.min.toArray(),max:box.max.toArray()};
  old.parent.add(g);old.removeFromParent();
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
assert(exteriorBounds(model).every((v,i)=>Math.abs(v-before[i])<.002),'E30 body envelope exceeds 2 mm tolerance');
const material=new MeshBasicMaterial({side:DoubleSide}), scenes=new Map([[exterior.id,scene]]);
async function meshes(id){
  const n=nodes.get(id);
  if(!scenes.has(n.assetId)){
    const reader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'fit-probe',loadMaterial:()=>Promise.resolve(material)}));
    scenes.set(n.assetId,await receive(model.assets.find(a=>a.id===n.assetId),reader));
  }
  const object=scenes.get(n.assetId).getObjectByName(n.meshNames[0]), world=new Matrix4().fromArray(n.matrix), result=[];
  assert(object,id);
  object.traverse(c=>{if(c.isMesh){const m=new Mesh(c.geometry,material);m.matrixWorld.multiplyMatrices(world,c.matrixWorld);result.push(m);}});
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
for(const side of [-1,1]){
  const fender=await meshes('e30body:front-fender-'+(side<0?'left':'right'));
  // Sample the thin seam near the inner fender. Retain the outer headlamp
  // and grille support in their existing positions when rounding the hood.
  for(const x of [1.02,1.28,1.57,1.81]){
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
assert.deepEqual(model.openingPanels,baseline.openingPanels);
assert.deepEqual(model.catalog.bindings,baseline.catalog.bindings);

globalThis.FileReader=class {async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const data=await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true})));
const prefix='/models/e30-lore/r'+revision+'/', digest=sha(data);
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
if(!archive.some(pin=>pin.id===prior.id&&pin.revision===prior.revision))await replaceJson(archivePath,[...archive,prior]);
await replaceJson(pinPath,pin);
console.log(JSON.stringify({revision,assetBytes:pin.assetBytes,clearanceMm}));
