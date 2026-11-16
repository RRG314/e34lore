import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Box3, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {buildE30Exterior, glassPoint, rearOpeningPoint, pillarPoint} from './e30-325i-exterior.mjs';
import {roofGrabHandles} from './e30-cabin.mjs';
import {rearLensPoint} from './e30-325i-trim.mjs';
import {compactPart} from '../geometry/local-cabin-glb.mjs';
import {compressGeometryGlb} from '../geometry/compress-glb.mjs';
import {immutable, localReferenceTools, readJson, replaceJson, sha} from '../geometry/local-reference-review.mjs';

const revision=1169, baseRevision=1168;
const prefix='/models/e30-lore/r'+revision+'/';
const pinPath='data/digital-twin/e30-candidate.json';
const archivePath='data/digital-twin/workshop-panel-archives.json';
const current=await readJson(pinPath);
const archive=await readJson(archivePath);
const prior=[current,...archive].find(pin=>pin.id===current.id&&pin.revision===baseRevision);
assert(prior,'Missing E30 exterior review baseline');
const baseBytes=await fs.readFile('public'+prior.manifestUrl);
assert.equal(sha(baseBytes),prior.sha256);
const baseline=JSON.parse(baseBytes), model=JSON.parse(baseBytes);
const nodes=new Map(model.nodes.map(node=>[node.id,node]));
const overhead='e30assembly:headlining:';
const scenes=new Map(), changed=new Set(), replacements=new Map();
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const rayMaterial=new MeshBasicMaterial({side:DoubleSide});

buildE30Exterior((parent,key,label,position,direction,draw)=>{
  const repaired=[
    'frame','roof','rear-window','quarter-window-left','quarter-window-right',
    'rear-quarter-left','rear-quarter-right','tail-panel','tail-light-left','tail-light-right','trunk',
  ];
  if(repaired.includes(key))replacements.set('e30body:'+key,{position,draw});
});
assert.equal(replacements.size,11);

async function sceneFor(assetId){
  if(scenes.has(assetId))return scenes.get(assetId);
  const asset=model.assets.find(entry=>entry.id===assetId);
  assert(asset,assetId);
  const bytes=await fs.readFile('public'+asset.url);
  assert.equal(sha(bytes),asset.sha256,asset.url);
  const {scene}=await loader.parseAsync(Uint8Array.from(bytes).buffer,'');
  scene.updateMatrixWorld(true);
  scenes.set(assetId,scene);
  return scene;
}
for(const [id,{position,draw}] of replacements){
  const node=nodes.get(id);
  assert(node,id);
  assert.deepEqual(node.matrix.slice(12,15),position);
  const scene=await sceneFor(node.assetId);
  const previous=scene.getObjectByName(node.meshNames[0]);
  assert(previous?.parent,node.id);
  const group=new Group();
  group.name=previous.name;
  draw(group);
  compactPart(group);
  const bounds=new Box3().setFromObject(group,true);
  assert(!bounds.isEmpty(),node.id);
  node.bounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
  previous.parent.add(group);
  previous.removeFromParent();
  scene.updateMatrixWorld(true);
  changed.add(node.assetId);
}

const fittedMeshes=new Map();
async function installedMeshes(id){
  if(fittedMeshes.has(id))return fittedMeshes.get(id);
  const node=nodes.get(id);
  const scene=await sceneFor(node.assetId);
  const transform=new Matrix4().fromArray(node.matrix);
  const meshes=[];
  for(const name of node.meshNames){
    const source=scene.getObjectByName(name);
    assert(source,id);
    source.traverse(child=>{
      if(!child.isMesh)return;
      const mesh=new Mesh(child.geometry,rayMaterial);
      mesh.matrixWorld.multiplyMatrices(transform,child.matrixWorld);
      meshes.push(mesh);
    });
  }
  fittedMeshes.set(id,meshes);
  return meshes;
}
const ray=new Raycaster(new Vector3(),new Vector3(),0,.42);
function hit(meshes,origin,direction,length=.42){
  ray.far=length;
  ray.ray.origin.set(...origin);
  ray.ray.direction.set(...direction);
  return ray.intersectObjects(meshes);
}

const roof=[...await installedMeshes('e30body:roof'),...await installedMeshes('e30body:sunroof')];
const windshield=await installedMeshes('e30body:windshield');
const headliner=await installedMeshes(overhead+'headliner');
const roofParts=[
  ...roofGrabHandles.map(handle=>overhead+handle.key), overhead+'visor-left', overhead+'visor-right',
  overhead+'mirror', overhead+'check-panel', overhead+'dome-light-left', overhead+'dome-light-right',
  'e30trim:front-roof-header','e30trim:manual-roof-crank',
];
const checks={};
for(const id of roofParts){
  const point=new Vector3();
  let minimum=Infinity, underRoof=0;
  for(const mesh of await installedMeshes(id)){
    const vertices=mesh.geometry.getAttribute('position');
    for(let i=0;i<vertices.count;i++){
      point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
      const top=hit(roof,[point.x,1.46,point.z],[0,-1,0])[0];
      if(top){minimum=Math.min(minimum,top.point.y-point.y);underRoof++;}
      if(point.x>.29) {
        const glass=hit(windshield,[1.0,point.y,point.z],[-1,0,0],.85)[0];
        if(glass)assert(glass.point.x>=point.x+.001,id+' protrudes through the windshield');
      }
    }
  }
  assert(underRoof>12&&minimum>=.003,id+' comes through the roof by '+Math.round(-minimum*1000)+' mm');
  checks[id.slice(id.lastIndexOf(':')+1)]=Math.round(minimum*1000);
}
for(const {x,side,key} of roofGrabHandles){
  const meshes=await installedMeshes(overhead+key);
  for(const dx of [-.1,.1]){
    const point=[x+dx,1.12,side*.537];
    const liner=hit(headliner,point,[0,1,0])[0];
    const foot=hit(meshes,point,[0,1,0]);
    assert(liner&&foot.length>=2&&foot[0].distance<liner.distance&&foot.at(-1).distance>=liner.distance-.003,
      key+' does not seat on the headliner at '+dx);
  }
}

const rearWindow=await installedMeshes('e30body:rear-window');
const pillars=await installedMeshes('e30body:frame');
let perimeterSamples=0;
for(const [u,v] of [[0,.1],[0,.5],[0,.9],[1,.1],[1,.5],[1,.9],[.23,0],[.5,0],[.77,0],[.23,1],[.5,1],[.77,1]]){
  const inner=rearOpeningPoint(u,v,.53);
  assert(hit(rearWindow,[inner[0]-.16,inner[1],inner[2]],[1,0,0])[0],'Missing rear gasket at '+[u,v]);
  const opening=rearOpeningPoint(u,v), body=glassPoint(false,u,v);
  const outer=opening.map((coordinate,i)=>.65*coordinate+.35*body[i]);
  const painted=hit(pillars,[outer[0]-.12,outer[1],outer[2]],[1,0,0])[0];
  if(painted&&Math.abs(painted.point.x-outer[0])<.014)perimeterSamples++;
}
assert.equal(perimeterSamples,12,'Rear gasket seating failed at '+(12-perimeterSamples)+' points');
for(const [side,suffix] of [[-1,'left'],[1,'right']]){
  const quarter=await installedMeshes('e30body:quarter-window-'+suffix);
  for(const u of [.16,.35,.55,.76,.9]){
    const [x,y,z]=pillarPoint(side,false,u,0);
    const skin=hit(pillars,[x-.006,y,z+side*.12],[0,0,-side])[0];
    const pane=hit(quarter,[x+.010,y,z+side*.12],[0,0,-side])[0];
    assert(skin&&pane&&Math.abs(skin.point.z-pane.point.z)<.016,
      suffix+' quarter window does not meet the pillar at '+u);
  }
}

const tail=await installedMeshes('e30body:tail-panel');
const trunk=await installedMeshes('e30body:trunk');
const rearBumper=await installedMeshes('e30body:rear-bumper');
for(const [side,suffix] of [[-1,'left'],[1,'right']]){
  const lamp=await installedMeshes('e30body:tail-light-'+suffix);
  const quarter=await installedMeshes('e30body:rear-quarter-'+suffix);
  // Inspect each lens against all surrounding panels from behind, including
  // the amber corner where a previous revision clipped through the quarter.
  for(const u of [.06,.24,.48,.68,.83,.91,.97]){
    for(const v of [.12,.25,.45,.60,.75,.88]){
      const [x,y,z]=rearLensPoint(side,u,v);
      const origin=[-2.24,y,z], direction=[1,0,0];
      const face=hit(lamp,origin,direction)[0];
      const obstruction=hit([...tail,...trunk,...quarter,...rearBumper],origin,direction)[0];
      assert(face&&Math.abs(x-face.point.x)<.006,suffix+' lens missing at '+[u,v]);
      assert(!obstruction||obstruction.distance>=face.distance+.001,
        suffix+' lens is hidden by bodywork at '+[u,v]);
      const bottom=rearLensPoint(side,u,0)[1], top=rearLensPoint(side,u,1)[1];
      assert(top>.727&&bottom<.557,suffix+' lamp edge height changes at '+u);
    }
  }
  // The end turns toward the quarter with a continuous positive tangent.
  const depths=Array.from({length:21},(_,i)=>rearLensPoint(side,.80+i*.01,.5)[0]);
  assert(depths.every((x,i)=>i===0||x>depths[i-1]),suffix+' end curves back into the lens');
  assert(depths[20]-depths[0]<.039,suffix+' amber segment wraps too far forward');
}
const badgeNode=nodes.get('e30body:trunk');
const trunkScene=await sceneFor(badgeNode.assetId);
let hasThickness=false;
trunkScene.getObjectByName(badgeNode.meshNames[0]).traverse(mesh=>{
  if(mesh.isMesh&&mesh.material.name==='Polished model lettering'){
    const bounds=new Box3().setFromObject(mesh,true);
    hasThickness=(bounds.max.y-bounds.min.y)>.027&&(bounds.max.z-bounds.min.z)>.129;
  }
});
assert(hasThickness,'The solid chrome model lettering did not reach the trunk mesh');

assert.deepEqual(model.openingPanels,baseline.openingPanels);
assert.deepEqual(model.catalog.bindings,baseline.catalog.bindings);
assert.deepEqual(model.nodes.map(({id,parentId,matrix})=>[id,parentId,matrix]),
  baseline.nodes.map(({id,parentId,matrix})=>[id,parentId,matrix]));
globalThis.FileReader=class {
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}
};
for(const asset of model.assets.filter(entry=>changed.has(entry.id))){
  const glb=Buffer.from(await new GLTFExporter().parseAsync(scenes.get(asset.id),{binary:true}));
  const bytes=await compressGeometryGlb(glb);
  const digest=sha(bytes);
  Object.assign(asset,{url:prefix+digest+'.glb',bytes:bytes.length,sha256:digest});
  await immutable('public'+asset.url,bytes);
}
model.revision=revision;
model.catalog.modelRevision=revision;
const {parseReference}=await localReferenceTools();
assert.equal(parseReference(model).nodes.length,baseline.nodes.length);
const manifest=Buffer.from(JSON.stringify(model));
const sha256=sha(manifest);
const pin={...prior,revision,sha256,manifestUrl:prefix+'manifest.'+sha256+'.json',
  assetBytes:model.assets.reduce((total,asset)=>total+asset.bytes,0)};
assert(pin.assetBytes<=24*1024*1024);
await immutable('public'+pin.manifestUrl,manifest);
if(!archive.some(saved=>saved.id===prior.id&&saved.revision===prior.revision))
  await replaceJson(archivePath,[...archive,prior]);
if(current.sha256!==pin.sha256)await replaceJson(pinPath,pin);
console.log(JSON.stringify({revision,roofClearanceMm:checks,rearGasketSamples:perimeterSamples}));
