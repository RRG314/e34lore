import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Box3, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {visualMaterials as M, box, cylinder, ring, tube} from './geometry/525i-visual-details.mjs';
import {appendGeometry, compactPart} from './geometry/local-cabin-glb.mjs';
import {compressGeometryGlb} from './geometry/compress-glb.mjs';
import {immutable, localReferenceTools, nameOf, readJson, replaceJson, sha} from './geometry/local-reference-review.mjs';

const base=await readJson('data/digital-twin/525i-service-release.json');
const revision=1044, root='work/525i-service-candidate', prefix='/models/e34-lore/r'+revision+'/';
assert.equal(base.revision,1043);
const bytes=await fs.readFile('public'+base.manifestUrl);
assert.equal(sha(bytes),base.sha256);
const model=JSON.parse(bytes), nodes=new Map(model.nodes.map(n=>[n.id,n]));
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const bare=new MeshBasicMaterial({side:DoubleSide});
const scenes=new Map(), originals=new Map(), patches=new Map();
const S='e34sys:', B='e34bay:', T='e34trim:', D='e34body:';
globalThis.FileReader=class {
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}
};
async function sceneFor(id){
  if(!scenes.has(id)){
    const a=model.assets.find(asset=>asset.id===id), data=await fs.readFile('public'+a.url);
    assert.equal(sha(data),a.sha256);
    originals.set(id,data);
    const doc=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)));
    const reader=doc.buffers.length===1 ? loader : new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
      .register(()=>({name:'fit-probe',loadMaterial:()=>Promise.resolve(bare)}));
    const {scene}=await reader.parseAsync(Uint8Array.from(data).buffer,'');
    scene.updateMatrixWorld(true);
    scenes.set(id,scene);
  }
  return scenes.get(id);
}

// The additions are authored in installed coordinates, then returned to each
// original part's local transform so panel and separation paths still apply.
async function add(id, draw){
  const n=nodes.get(id);
  assert(n?.assetId,id);
  const scene=await sceneFor(n.assetId), existing=scene.getObjectByName(n.meshNames[0]);
  assert(existing,id);
  const group=new Group();
  group.name=n.meshNames[0]+'_fit_1044';
  draw(group);
  group.applyMatrix4(new Matrix4().fromArray(n.matrix).invert());
  compactPart(group);
  const frame=group.matrix.clone();
  group.traverse(child=>{if(child.isMesh)child.geometry.applyMatrix4(frame);});
  group.position.set(0,0,0);group.quaternion.identity();group.scale.set(1,1,1);
  const newBox=new Box3().setFromObject(group,true);
  const oldBox=new Box3(new Vector3(...n.bounds.min),new Vector3(...n.bounds.max));
  oldBox.union(newBox);
  n.bounds={min:oldBox.min.toArray(),max:oldBox.max.toArray()};
  n.meshNames.push(group.name);
  const assembly=patches.get(n.assetId)??new Group();
  assembly.add(group.clone());
  patches.set(n.assetId,assembly);
  scene.add(group);
  scene.updateMatrixWorld(true);
}
await add(S+'airbox',g=>{
  for(const [x,c] of [[1.435,.484],[1.654,.470]]){
    const h=.593-c;
    box(g,[.043,h,.034],[x,.593-h/2,-.516],M.dark,.006);
    box(g,[.053,.009,.041],[x,c,-.516],M.steel,.003);
    cylinder(g,.009,.010,[x,c+.004,-.525],M.rubber,'y',20);
  }
});
await add(S+'expansion-tank',g=>{
  box(g,[.083,.021,.129],[1.469,.487,.476],M.dark,.006);
  box(g,[.075,.028,.034],[1.469,.491,.527],M.steel,.005);
  box(g,[.055,.022,.046],[1.47,.476,.442],M.rubber,.005);
});
await add(B+'steering-reservoir',g=>{
  box(g,[.041,.015,.091],[1.096,.684,-.513],M.dark,.004);
  box(g,[.047,.026,.030],[1.096,.684,-.550],M.steel,.005);
});
await add(S+'center-bearing',g=>{
  for(const z of [-.075,.075]){
    box(g,[.043,.037,.028],[-.56,.408,z],M.dark,.004);
    cylinder(g,.008,.007,[-.56,.385,z],M.steel,'y',6);
  }
});
await add(S+'transmission-tunnel',g=>{
  for(const z of [-.076,.076])box(g,[.063,.023,.038],[-.56,.433,z],M.dark,.005);
});
await add(S+'exhaust-downpipes',g=>{
  for(const [a,b] of [[.220,.193],[.302,.324]]){
    const points=[[.010,.182,a],[-.022,.184,(a+b)/2],[-.085,.190,b]];
    tube(g,points,.022,M.steel,16);
    ring(g,.028,.019,.012,[-.057,.188,b],M.machined,'x',28);
  }
});
await add(S+'rear-exhaust-pipes',g=>{
  for(const [a,b] of [[-.536,-.557],[-.451,-.440]]){
    tube(g,[[-1.685,.202,a],[-1.716,.206,(a+b)/2],[-1.757,.207,b]],.021,M.steel,12);
    ring(g,.027,.020,.013,[-1.732,.207,b],M.machined,'x',28);
  }
});
await add(T+'spare-wheel-retainer',g=>{
  ring(g,.038,.007,.006,[-1.883,.404,0],M.dark,'y',32);
  cylinder(g,.006,.110,[-1.883,.352,0],M.steel,'y',20);
});
for(const [side,sign] of [['left',-1],['right',1]]){
  await add(T+'trunk-hinge-'+side,g=>{
    box(g,[.078,.032,.071],[-1.977,1.001,sign*.507],M.dark,.007);
    box(g,[.077,.009,.070],[-1.977,1.019,sign*.507],M.steel,.004);
    for(const x of [-2.001,-1.955]) cylinder(g,.006,.006,[x,1.014,sign*.533],M.steel,'y',6);
  });
}
await add(S+'luggage-floor',g=>{
  // The retainer stud has a boss at the centre of the pressed well. It
  // remains below the mat, even when the spare cover is opened.
  cylinder(g,.020,.009,[-1.883,.301,0],M.dark,'y',26);
});

const cache=new Map();
async function mesh(id){
  if(cache.has(id))return cache.get(id);
  const n=nodes.get(id), scene=await sceneFor(n.assetId), matrix=new Matrix4().fromArray(n.matrix), list=[];
  for(const name of n.meshNames){
    const o=scene.getObjectByName(name);assert(o,id);
    o.traverse(child=>{if(child.isMesh){
      const m=new Mesh(child.geometry,bare);
      m.matrixWorld.multiplyMatrices(matrix,child.matrixWorld);
      list.push(m);
    }});
  }
  cache.set(id,list);return list;
}
async function ray(id,p,dir=[0,-1,0]){
  return new Raycaster(new Vector3(...p),new Vector3(...dir),0,3.6).intersectObjects(await mesh(id));
}
const checks={};
async function contact(label,part,host,at,axis=1,dir=[0,-1,0],tol=.005) {
  const [p,h]=await Promise.all([ray(part,at,dir),ray(host,at,dir)]);
  assert(p.length&&h.length,label+' did not reach both meshes');
  const lo=Math.min(...p.map(x=>x.point.getComponent(axis))), hi=Math.max(...p.map(x=>x.point.getComponent(axis)));
  const delta=Math.min(...h.map(x=>Math.max(0,lo-x.point.getComponent(axis),x.point.getComponent(axis)-hi)));
  assert(delta<=tol,label+' gap: '+Math.round(delta*1000)+' mm');
  checks[label]=Math.round(delta*1000);
}
for(const x of [1.435,1.654])await contact('Airbox foot '+x,S+'airbox',B+'front-apron-1',[x,1,-.52]);
await contact('Expansion tank bracket',S+'expansion-tank',B+'front-apron--1',[1.469,1,.525]);
await contact('Steering reservoir bracket',B+'steering-reservoir',B+'front-apron-1',[1.096,1,-.552]);
for(const sign of [-1,1]) {
  await contact('Center bearing to tunnel '+sign,S+'center-bearing',S+'transmission-tunnel',[-.56,1,sign*.071]);
  await contact('Trunk hinge to lid '+sign,T+'trunk-hinge-'+(sign<0?'left':'right'),D+'trunk',[-1.977,1.25,sign*.507]);
}
await contact('Retainer to wheel',T+'spare-wheel-retainer',T+'spare-wheel',[-1.883,1,.030]);
await contact('Retainer to well',T+'spare-wheel-retainer',S+'luggage-floor',[-1.883,1,0]);
await contact('Spare seated in well',T+'spare-wheel',S+'luggage-floor',[-1.88,1,.28],1,[0,-1,0],.005);
// Compare the pipe with the mating section along both pipe tracks. Merely
// hitting both meshes on the same ray would miss a vertical gap between them.
for(const [label,pipes,section,x,tracks] of [
  ['Downpipe to catalyst','exhaust-downpipes','catalyst-center-resonator',-.075,[.195,.322]],
  ['Rear pipe to muffler','rear-exhaust-pipes','rear-muffler',-1.752,[-.550,-.448]],
]){
  for(const z of tracks){
    const [pipe,host]=await Promise.all([pipes,section].map(async id=>
      (await ray(S+id,[x,.35,z])).map(hit=>hit.point.y).sort((a,b)=>a-b)));
    assert(pipe.length>=2&&host.length>=2,label+' did not reach both meshes at '+z);
    const overlap=Math.min(pipe.at(-1),host[1])-Math.max(pipe[0],host[0]);
    assert(overlap>.004,label+' has insufficient joint overlap at '+z);
    checks[label+' '+z+' overlap']=Math.round(overlap*1000);
  }
}
for(const id of [S+'airbox',S+'airbox-lid',S+'radiator',S+'expansion-tank',B+'washer-tank',B+'radiator-support']) {
  let gap=Infinity;
  for(const object of await mesh(id)){
    const attribute=object.geometry.attributes.position, p=new Vector3();
    for(let i=0;i<attribute.count;i+=3){
      p.fromBufferAttribute(attribute,i).applyMatrix4(object.matrixWorld);
      if(p.y<.70||Math.abs(p.z)>.68)continue;
      const roof=(await ray(D+'hood',[p.x,1.25,p.z]))[0];
      if(roof)gap=Math.min(gap,roof.point.y-p.y);
    }
  }
  assert(gap>.004,id+' intersects the hood');
  if(Number.isFinite(gap))checks[id+' under hood']=Math.round(gap*1000);
}
const hood=model.openingPanels.find(p=>p.id===D+'hood');
hood.camera={position:[.87,1.89,1.35],target:[1.42,.68,0]};
model.revision=revision;
model.catalog.modelRevision=revision;
const {parseReference,planFor,separationOffset}=await localReferenceTools();
const files=[];
for(const a of model.assets.filter(a=>patches.has(a.id))){
  const original=originals.get(a.id);
  const doc=JSON.parse(original.subarray(20,20+original.readUInt32LE(12)));
  const exportGlb=async group=>compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(group,{binary:true})));
  const data=doc.buffers.length===2
    ? appendGeometry(original,await exportGlb(patches.get(a.id)))
    : await exportGlb(scenes.get(a.id));
  const digest=sha(data);
  Object.assign(a,{url:prefix+digest+'.glb',bytes:data.length,sha256:digest});
  files.push({url:a.url,file:nameOf(a.url),sha256:digest,data});
}
const parsed=parseReference(model), original=JSON.parse(bytes);
assert.deepEqual(parsed.nodes.map(n=>n.id),original.nodes.map(n=>n.id));
assert.deepEqual(parsed.nodes.map(n=>n.parentId),original.nodes.map(n=>n.parentId));
assert.deepEqual(model.catalog.bindings,original.catalog.bindings);
for(const [id,scope] of [[S+'airbox','system:engine-bay'],[S+'center-bearing','system:driveshaft'],[T+'spare-wheel','system:luggage-trim']]){
  const plan=planFor(parsed,scope,parsed.nodes.find(n=>n.id===id));
  assert.deepEqual(separationOffset(plan,0),[0,0,0]);
  assert(separationOffset(plan,1).some(x=>Math.abs(x)>.012),id+' does not separate');
}
const manifest=Buffer.from(JSON.stringify(model)),sha256=sha(manifest);
const release={...base,revision,sha256,manifestUrl:prefix+'manifest.'+sha256+'.json',
  assetBytes:model.assets.reduce((sum,a)=>sum+a.bytes,0)};
assert(release.assetBytes<=24*1024*1024,'525i model budget exceeded');
files.push({url:release.manifestUrl,file:nameOf(release.manifestUrl),sha256,data:manifest});
for(const file of files)await immutable(root+'/'+file.file,file.data);
await replaceJson(root+'/fit-review.json',{release,files:files.map(({data,...file})=>file),checks});
console.log(JSON.stringify({revision,assetBytes:release.assetBytes,clearanceMm:checks}));
