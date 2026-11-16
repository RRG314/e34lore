import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { cabinLiner, buildE30Cabin, roofAperture, roofGrabHandles } from './e30-cabin.mjs';
import { bead, lerp, patch } from './e30-exterior-surfaces.mjs';
import { glassPoint } from './e30-325i-exterior.mjs';
import { compactPart } from '../geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from '../geometry/compress-glb.mjs';
import { immutable, localReferenceTools, readJson, replaceJson, sha } from '../geometry/local-reference-review.mjs';

const revision=1163, baseRevision=1162;
const pinPath='data/digital-twin/e30-candidate.json', archivePath='data/digital-twin/workshop-panel-archives.json';
const current=await readJson(pinPath), archive=await readJson(archivePath);
const prior=[current,...archive].find(pin=>pin.id===current.id && pin.revision===baseRevision);
assert(prior,'Missing E30 cabin-fit baseline');
const raw=await fs.readFile('public'+prior.manifestUrl);
assert.equal(sha(raw),prior.sha256);
const model=JSON.parse(raw), baseline=JSON.parse(raw), prefix='/models/e30-lore/r'+revision+'/';
const nodes=new Map(model.nodes.map(node=>[node.id,node])), scenes=new Map();
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const exporter=new GLTFExporter();
const rayMaterial=new MeshBasicMaterial({side:DoubleSide});
const seal=new MeshStandardMaterial({color:0x3b3834,roughness:.96,side:DoubleSide});
const padding=new MeshStandardMaterial({color:0x4b4843,roughness:.95,side:DoubleSide});

globalThis.FileReader=class {
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}
};

const overhead='e30assembly:headlining:';
const grab=overhead+'assist-handle';
const replacements=new Map(), additions=new Map();
const author=(id,position,draw)=>replacements.set(id,{position,draw});
buildE30Cabin((parent,key,label,position,direction,draw)=>{
  if(parent==='e30assembly:headlining' && /^(?:headliner|sunroof-liner|check-panel|mirror|visor-|assist-handle|dome-light-)/.test(key)) {
    const id=parent+':'+key;
    if(!nodes.has(id)){
      const based=nodes.get(grab);
      const node={...based,id,name:label,displayDirection:direction,matrix:[...based.matrix],meshNames:[id.replaceAll(':','_')]};
      model.nodes.push(node);
      nodes.set(id,node);
      model.catalog.bindings[id]={...model.catalog.bindings[grab],nodeId:id,title:label};
      for(const key of ['renderable','bound','withCandidates'])model.catalog.coverage[key]++;
    }
    author(id,position,draw);
  }
  if (key==='armrest' && /^e30body:door-(left|right):door-card$/.test(parent)) author(parent+':'+key,position,draw);
  if (key==='parcel-shelf'||key==='third-stoplamp') author(parent+':'+key,position,draw);
},id=>'e30assembly:'+id);

const [a,b,l,r]=roofAperture;
author('e30trim:sunroof-aperture-finisher',[0,0,0],g=>{
  const sides=[(t,d)=>[lerp(a-.01,b+.01,t),l+lerp(-.010,.029,d)],(t,d)=>[lerp(a-.01,b+.01,t),r-lerp(-.010,.029,d)],
    (t,d)=>[a+lerp(-.012,.014,d),lerp(l,r,t)],(t,d)=>[b-lerp(-.012,.014,d),lerp(l,r,t)]];
  for(const edge of sides) {
    const band=(t,d)=>{const [u,v]=edge(t,d), [x,y,z]=cabinLiner(u,v); return [x,y-.004*Math.sin(Math.PI*d),z];};
    patch(g,seal,band,36,7);
    bead(g,seal,t=>band(t,1),.0025,38);
  }
});
author('e30trim:front-roof-header',[0,0,0],g=>{
  const face=(t,d)=>{
    const v=lerp(.036,.964,t), u=lerp(.846,.986,d);
    const [x,y,z]=cabinLiner(u,v);
    return [x,y-.011-.004*Math.sin(Math.PI*d)*Math.sin(Math.PI*t),z];
  };
  patch(g,padding,face,54,14);
  patch(g,padding,(t,d)=>{const [x,y,z]=face(t,1); return [x+.006*d,y+.012*d,z];},54,5);
  bead(g,seal,t=>face(t,0),.003,50);
  for(const v of [0,1]) patch(g,padding,(t,d)=>{const [x,y,z]=face(v,t);return [x,y+.013*d,z];},26,6);
});

const adjusted=new Map();
const moved=(id,delta)=>{const n=nodes.get(id);assert(n?.assetId,id);adjusted.set(id,delta);};
moved('e30trim:front-header-screw-1',[0,.009,0]);
moved('e30trim:front-header-screw-2',[0,.009,0]);
moved('e30trim:manual-roof-crank',[.023,.029,0]);
for(const [side,sign] of [['left',-1],['right',1]]) {
  moved('e30trim:b-pillar-'+side+'-hook',[0,0,sign*.004]);
  moved('e30trim:b-pillar-'+side+'-hook-screw',[0,0,sign*.004]);
  // The bolt, washer and cap travel together with the guide.
  for (const fixture of ['guide','fastener','washer','cap'])
    moved('e30trim:shoulder-'+fixture+'-'+side,[0,0,sign*.007]);
  const sill='e30assembly:cabin-floor:sill-cover-'+side;
  // Preserve the fitted tread face. Add the folded carpet-side return that
  // closes the air gap visible from a low angle with the door open.
  additions.set(sill,g=>{
    patch(g,seal,(u,v)=>{
      const x=lerp(-.453,.591,u), ends=Math.sin(Math.PI*u)**.65;
      return [x,lerp(.365,.365-.028*ends,v),sign*lerp(.682,.666,v)];
    },38,8);
  });
  moved('e30trim:front-'+side+'-pocket',[0,0,sign*.039]);
  for (const fixture of ['screw','washer']) for (const i of [0,1])
    moved('e30trim:front-'+side+'-pocket-'+fixture+'-'+i,[0,0,sign*.039]);
}

for(const asset of model.assets.filter(asset=>asset.id==='e30:cabin'||asset.id==='e30:battery-details')) {
  const bytes=await fs.readFile('public'+asset.url);
  assert.equal(sha(bytes),asset.sha256);
  scenes.set(asset.id,(await loader.parseAsync(Uint8Array.from(bytes).buffer,'')).scene);
}
for(const [id,replacement] of replacements) {
  const node=nodes.get(id), scene=scenes.get(node.assetId);
  assert(scene,'Missing source GLB for '+id);
  const old=scene.getObjectByName(node.meshNames[0]);
  const group=new Group();
  group.name=node.meshNames[0];
  replacement.draw(group);
  compactPart(group);
  const box=new Box3().setFromObject(group,true);
  assert(!box.isEmpty(),id+' has no geometry');
  node.bounds={min:box.min.toArray(),max:box.max.toArray()};
  node.matrix.splice(12,3,...replacement.position);
  const parent=old?.parent??scene.getObjectByName(nodes.get(grab).meshNames[0]).parent;
  parent.add(group);
  old?.removeFromParent();
}
for(const [id,draw] of additions) {
  const node=nodes.get(id), scene=scenes.get(node.assetId), existing=scene.getObjectByName(node.meshNames[0]);
  assert(existing,id);
  const g=new Group();
  draw(g);
  compactPart(g);
  const oldBounds=new Box3(new Vector3(...node.bounds.min),new Vector3(...node.bounds.max));
  oldBounds.union(new Box3().setFromObject(g,true));
  node.bounds={min:oldBounds.min.toArray(),max:oldBounds.max.toArray()};
  existing.add(g);
}
for(const [id,delta] of adjusted) for(let i=0;i<3;i++) nodes.get(id).matrix[12+i]+=delta[i];
for(const scene of scenes.values())scene.updateMatrixWorld(true);

function worldMeshes(id) {
  const n=nodes.get(id), scene=scenes.get(n.assetId), world=new Matrix4().fromArray(n.matrix), meshes=[];
  for(const name of n.meshNames) {
    const group=scene.getObjectByName(name);
    assert(group,id);
    group.traverse(source=>{
      if(!source.isMesh) return;
      const mesh=new Mesh(source.geometry,rayMaterial);
      mesh.matrixWorld.multiplyMatrices(world,source.matrixWorld);
      meshes.push(mesh);
    });
  }
  return meshes;
}
const up=[0,1,0];
const hits=(id,at,dir=up)=>new Raycaster(new Vector3(...at),new Vector3(...dir),0,.30).intersectObjects(worldMeshes(id));
function seated(name,outer,part,ray,dir=up,tolerance=.003) {
  const edge=hits(outer,ray,dir).at(0), partHits=hits(part,ray,dir);
  assert(edge && partHits.length,name+' is missing at '+ray);
  const first=partHits[0].distance,last=partHits.at(-1).distance;
  assert(first < edge.distance && last+tolerance >= edge.distance,
    name+' gap '+Math.round((edge.distance-last)*1000)+' mm at '+ray);
}
for(const handle of roofGrabHandles) for(const foot of [-.100,.100])
  seated(handle.label,overhead+'headliner',overhead+handle.key,[handle.x+foot,1.13,handle.side*.537]);
for(const [side,sign] of [['left',-1],['right',1]]) {
  seated(side+' dome light',overhead+'headliner',overhead+'dome-light-'+side,[-.672,1.16,sign*.531]);
  seated(side+' visor hinge',overhead+'headliner',overhead+'visor-'+side,[.177,1.23,sign*.552]);
  seated(side+' visor clip','e30trim:front-roof-header',overhead+'visor-'+side,[.181,1.24,sign*.140]);
  for (const [x,y] of [[.032,.537],[.425,.636]])
    seated(side+' door pull','e30body:door-'+side+':door-card','e30body:door-'+side+':door-card:armrest',[x,y,sign*.48],[0,0,sign]);
  seated(side+' door pocket','e30body:door-'+side+':door-card','e30trim:front-'+side+'-pocket',[.24,.414,sign*.48],[0,0,sign]);
  seated(side+' coat hook','e30trim:b-pillar-'+side,'e30trim:b-pillar-'+side+'-hook',[-.472,1.198,sign*.53],[0,0,sign]);
  seated(side+' seat belt guide','e30trim:b-pillar-'+side,'e30trim:shoulder-guide-'+side,[-.466,1.088,sign*.53],[0,0,sign]);
}
seated('Mirror base','e30trim:front-roof-header',overhead+'mirror',[.324,1.18,0]);
seated('Check panel','e30trim:front-roof-header',overhead+'check-panel',[.241,1.24,-.045]);
seated('Roof crank','e30trim:front-roof-header','e30trim:manual-roof-crank',[.194,1.24,0]);
seated('Third brake light','e30assembly:rear-seats:parcel-shelf','e30assembly:rear-seats:third-stoplamp',[-1.45,1,0],[0,-1,0]);
for(const sign of [-1,1]) {
  const sill='e30assembly:cabin-floor:sill-cover-'+(sign<0?'left':'right');
  for(const x of [-.27,.06,.39]) {
    const carpet=hits('e30assembly:cabin-floor:carpet',[x,.45,sign*.667],[0,-1,0])[0];
    const hem=hits(sill,[x,.28,sign*.667])[0];
    assert(carpet&&hem&&hem.point.y<=carpet.point.y+.003,'Sill does not overlap the carpet at '+x);
  }
}
assert(!hits(overhead+'headliner',[-.19,1.20,0]).length,'Fixed headliner covers the open sunroof');
assert(hits(overhead+'sunroof-liner',[-.19,1.20,0]).length,'Sliding panel does not fill its opening');
assert.equal(nodes.get(overhead+'sunroof-liner').parentId,'e30body:sunroof');

function glassAt(y,z) {
  const pointAt=(u)=>{
    let low=0,high=1;
    for(let i=0;i<19;i++){
      const v=(low+high)/2;
      if(glassPoint(true,u,v)[2]<z)low=v;else high=v;
    }
    return glassPoint(true,u,(low+high)/2);
  };
  let low=0,high=1;
  for(let i=0;i<22;i++){
    const u=(low+high)/2;
    if(pointAt(u)[1]<y)low=u;else high=u;
  }
  return pointAt((low+high)/2)[0];
}
const clearanceMm={};
for(const id of [overhead+'visor-left',overhead+'visor-right',overhead+'mirror',overhead+'check-panel']) {
  let min=Infinity;
  for(const mesh of worldMeshes(id)) {
    const position=mesh.geometry.attributes.position, point=new Vector3();
    for(let i=0;i<position.count;i++){
      point.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
      min=Math.min(min,glassAt(point.y,point.z)-point.x);
    }
  }
  assert(min>.009,id+' intersects the windshield');
  clearanceMm[id]=Math.round(min*1000);
}

for(const asset of model.assets.filter(asset=>scenes.has(asset.id))) {
  const bytes=await compressGeometryGlb(Buffer.from(await exporter.parseAsync(scenes.get(asset.id),{binary:true})));
  const digest=sha(bytes);
  Object.assign(asset,{url:prefix+digest+'.glb',bytes:bytes.length,sha256:digest});
  await immutable('public'+asset.url,bytes);
}
model.revision=revision;
model.catalog.modelRevision=revision;
const {parseReference}=await localReferenceTools();
assert.equal(parseReference(model).nodes.length,baseline.nodes.length+2);
for(const node of baseline.nodes) assert.equal(nodes.get(node.id).parentId,node.parentId,node.id);
const manifest=Buffer.from(JSON.stringify(model)),digest=sha(manifest);
const pin={...prior,revision,manifestUrl:prefix+'manifest.'+digest+'.json',sha256:digest,
  assetBytes:model.assets.reduce((sum,asset)=>sum+asset.bytes,0),renderableCount:model.catalog.coverage.renderable};
assert(pin.assetBytes<=24*1024*1024,'Geometry budget exceeded');
await immutable('public'+pin.manifestUrl,manifest);
if(!archive.some(pin=>pin.id===prior.id&&pin.revision===prior.revision)) await replaceJson(archivePath,[...archive,prior]);
await replaceJson(pinPath,pin);
console.log(JSON.stringify({revision,assetBytes:pin.assetBytes,renderableCount:pin.renderableCount,clearanceMm}));
