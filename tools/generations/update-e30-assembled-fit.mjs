import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Box3, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Raycaster, Vector3} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {paint} from './e30-325i-exterior.mjs';
import {buildE30EngineBay} from './e30-325i-engine-bay.mjs';
import {buildE30Mechanical, block, cylinder, ring, rod, curvedTube, aluminum, black, rubber, steel, xAxis, yAxis} from './e30-325i-geometry.mjs';
import {bead, lerp, patch, smooth} from './e30-exterior-surfaces.mjs';
import {compactPart} from '../geometry/local-cabin-glb.mjs';
import {compressGeometryGlb} from '../geometry/compress-glb.mjs';
import {immutable, localReferenceTools, readJson, replaceJson, sha} from '../geometry/local-reference-review.mjs';

const revision=1164, baseRevision=1163;
const pinPath='data/digital-twin/e30-candidate.json', archivePath='data/digital-twin/workshop-panel-archives.json';
const current=await readJson(pinPath), archive=await readJson(archivePath);
const prior=[current,...archive].find(pin=>pin.id===current.id && pin.revision===baseRevision);
assert(prior,'Missing assembled coupe baseline');
const raw=await fs.readFile('public'+prior.manifestUrl);
assert.equal(sha(raw),prior.sha256);
const baseline=JSON.parse(raw), model=JSON.parse(raw), prefix='/models/e30-lore/r'+revision+'/';
const nodes=new Map(model.nodes.map(node=>[node.id,node]));
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const scenes=new Map(), patchedAssets=new Set(), additions=new Map(), replacements=new Map(), meshCache=new Map();
const scope=key=>'e30assembly:'+key;
const body='e30body:', bay='e30assembly:engine-bay:', drive='e30assembly:propeller:', tr='e30trim:', under='e30assembly:underbody:';
const fabric=new MeshStandardMaterial({color:0x343637,roughness:.96,side:DoubleSide});
const stamp=new MeshStandardMaterial({color:0x61696b,roughness:.73,metalness:.36,side:DoubleSide});
const rayMaterial=new MeshBasicMaterial({side:DoubleSide});
globalThis.FileReader=class {
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}
};

const seat=(id,draw)=>additions.set(id,draw);
buildE30EngineBay((parent,key,label,position,spread,draw)=>{
  if(['airbox','expansion-tank','washer-reservoir','power-steering','abs-pump','fuse-box',
    'positive-junction','ignition-coil','ac-lines','radiator-support'].includes(key))
    replacements.set(parent+':'+key,{position,draw});
},scope,paint);
buildE30Mechanical((parent,key,label,position,spread,draw)=>{
  if(parent===scope('underbody')) replacements.set(parent+':'+key,{position,draw});
},scope);

// End the hose run on the throttle sleeve; support the nearby plumbing.
seat(bay+'intake-boot',g=>rod(g,[-.078,.04,.092],[-.079,.045,.113],.036,rubber));
const coolingFan='e30assembly:radiator-pack:fan';
const mountPump='e30assembly:engine:water-pump';
const subframe='e30assembly:front-axle:subframe';
seat(subframe,g=>{
  for(const sign of [-1,1]){
    // The rubber mount and its offset arm should meet the engine from
    // the crossmember rather than floating above the black carrier.
    cylinder(g,.038,.063,yAxis,rubber,[.018,.086,sign*.311],.036);
    for(const y of [.054,.117]) cylinder(g,.039,.008,yAxis,steel,[.018,y,sign*.311]);
    block(g,[.106,.026,.074],steel,[.018,.055,sign*.311],.008);
    rod(g,[.018,.116,sign*.311],[-.015,.254,sign*.146],.022,aluminum);
  }
});
seat(coolingFan,g=>{
  // The clutch pilot lands on the pump spindle. The fan blades retain
  // their original space in the shroud.
  rod(g,[-.025,-.008,.020],[-.080,-.008,.054],.015,steel);
});

for(const [side,sign] of [['left',-1],['right',1]]) {
  seat(body+'trunk:hinge-'+side,g=>{
    block(g,[.085,.053,.049],steel,[-1.717,.806,sign*.485],.008);
    block(g,[.074,.023,.054],stamp,[-1.717,.834,sign*.485],.005);
  });
  seat(bay+'tower-'+side,g=>{
    // Pressed feet terminate against the modeled inner wing rather than
    // leaving the reservoir and airbox flanges perched in open space.
    const supports=sign<0
      ? [[1.576,.574,.704],[1.746,.574,.706],[1.69,.596,.694],[.959,.697,.711],[1.631,.604,.731]]
      : [[1.687,.594,.668],[1.734,.608,.712],[1.702,.616,.708],[.979,.622,.704]];
    for(const [x,y,z] of supports) {
      const local=[x-1.387,y-.747,sign*(z-.542)];
      block(g,[.056,.020,.062],paint,local,.005);
      rod(g,[local[0],local[1]-.005,local[2]+sign*.013],
        [local[0],local[1]+.044,local[2]+sign*.036],.014,paint);
    }
  });
}

// The carrier's outboard ears sit against bosses below the transmission
// tunnel; the bosses stop short of the passenger-side carpet.
seat(drive+'center-mount',g=>{
  for(const sign of [-1,1]){
    block(g,[.037,.078,.034],stamp,[.006,.104,sign*.098],.006);
    cylinder(g,.008,.014,yAxis,steel,[.006,.053,sign*.098],.008,6);
  }
});
seat('e30assembly:cabin-floor:carpet',g=>{
  for(const sign of [-1,1]){
    // Geometry is underneath the carpet surface in the assembled model.
    block(g,[.077,.013,.056],stamp,[-.350,.466,sign*.098],.005);
  }
});

seat(tr+'spare-wheel-well',g=>{
  // Fix the bare gaps beside the spare bowl. The upper deck supports the
  // carpet, while the stepped battery pocket sits below its tray.
  for(const sign of [-1,1]) {
    const inner=sign>0?.406:.506;
    patch(g,stamp,(u,v)=>{
      const x=lerp(-2.016,-1.317,u);
      const outer=sign>0?lerp(.710,.653,smooth((u-.44)/.56)):.675;
      const step=sign>0?.014*smooth((.57-u)/.12)*smooth((v-.21)/.53):0;
      return [x,.441-step,sign*lerp(inner,outer,v)];
    },32,10);
    patch(g,stamp,(u,v)=>{
      const x=lerp(-2.015,-1.317,u), z=sign*(sign>0?lerp(.710,.653,smooth((u-.44)/.56)):.675);
      return [x,lerp(sign>0?.428:.441,.502,v),z-sign*.016*v];
    },32,7);
  }
  patch(g,stamp,(u,v)=>[lerp(-2.022,-1.973,v),.442,lerp(-.664,.710,u)],24,6);
  patch(g,stamp,(u,v)=>[lerp(-1.355,-1.294,v),.442,lerp(-.663,.661,u)],24,6);
});
seat(tr+'spare-wheel-retainer',g=>{
  // Load-bearing washer touches the wheel center; the stem sits in the well.
  ring(g,.028,.007,.007,yAxis,steel,[-1.658,.354,0]);
  cylinder(g,.006,.111,yAxis,steel,[-1.658,.301,0]);
});
seat('e30assembly:luggage:battery:tray',g=>{
  // Turned bracket feet under the tray bridge the drop in the stamped floor.
  for(const x of [-.10,.104]) {
    block(g,[.043,.022,.143],black,[x,-.010,0],.006);
  }
});
seat(tr+'trunk-tail-panel',g=>{
  // Interior return closes the unlined gap behind the trunk sill.
  patch(g,fabric,(u,v)=>[-.007-.047*v,lerp(.009,.042,v),lerp(-.640,.640,u)],35,8);
});

async function sceneFor(id) {
  if(!scenes.has(id)){
    const asset=model.assets.find(a=>a.id===id);
    const bytes=await fs.readFile('public'+asset.url);
    assert.equal(sha(bytes),asset.sha256,asset.url);
    const {scene}=await loader.parseAsync(Uint8Array.from(bytes).buffer,'');
    scenes.set(id,scene);
    scene.updateMatrixWorld(true);
  }
  return scenes.get(id);
}
for(const [id,draw] of [...replacements,...additions]) {
  const node=nodes.get(id);assert(node,id);
  const scene=await sceneFor(node.assetId), old=scene.getObjectByName(node.meshNames[0]);assert(old,id);
  const g=new Group(), replacement=replacements.get(id);
  g.name=old.name;
  if(replacement){
    replacement.draw(g);
    old.parent.add(g);old.removeFromParent();
    node.matrix.splice(12,3,...replacement.position);
  } else {
    draw(g);
    old.add(g);
  }
  compactPart(g);
  const bounds=new Box3().setFromObject(g,true);
  assert(!bounds.isEmpty(),id);
  if(!replacement) bounds.union(new Box3(new Vector3(...node.bounds.min),new Vector3(...node.bounds.max)));
  node.bounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
  patchedAssets.add(node.assetId);
  scene.updateMatrixWorld(true);
}

async function meshes(id) {
  if(meshCache.has(id))return meshCache.get(id);
  const node=nodes.get(id), scene=await sceneFor(node.assetId);
  const world=new Matrix4().fromArray(node.matrix), result=[];
  for(const name of node.meshNames){
    const source=scene.getObjectByName(name);assert(source,id);
    source.traverse(o=>{
      if(!o.isMesh)return;
      const m=new Mesh(o.geometry,rayMaterial);
      m.matrixWorld.multiplyMatrices(world,o.matrixWorld);result.push(m);
    });
  }
  meshCache.set(id,result);
  return result;
}
const down=[0,-1,0];
async function hits(id,at,direction=down) {
  return new Raycaster(new Vector3(...at),new Vector3(...direction),0,3).intersectObjects(await meshes(id));
}
const metrics={};
async function gap(label,top,bottom,at,tolerance=.008) {
  const [a,b]=await Promise.all([hits(top,at),hits(bottom,at)]);
  assert(a.length && b.length,label+' missing surface at '+at);
  const miss=a.at(-1).point.y-b[0].point.y;
  assert(miss<=tolerance,label+': gap '+Math.round(miss*1000)+' mm');
  metrics[label]=Math.round(miss*1000);
}

// Test the entire height of the straddling tunnel, including the carrier.
for(const x of [-.835,-.76,-.64,-.49,-.42]) {
  for(const y of [.278,.30,.328,.352,.38]) {
    for(const hit of await hits(under+'fuel-tank',[x,y,-.62],[0,0,1]))
      assert(Math.abs(hit.point.z)>=.087,'Fuel tank closes the shaft tunnel at '+hit.point.toArray());
  }
}
for(const at of [[-.65,.18,.297],[-.45,.185,.30],[-.835,.184,.30]]) {
  assert((await hits(under+'exhaust-pipes',at,[0,0,1])).length,'Exhaust does not follow the model routing');
  assert(!(await hits(under+'fuel-tank',at,[0,0,1])).length,'Pipe overlaps the tank');
}
for(const x of [1.355,1.015]){
  const collector=await hits('e30assembly:engine:exhaust',[x,1,.330]);
  const pipe=await hits(under+'exhaust-pipes',[x,1,.330]);
  assert(collector.length&&pipe.length,'Manifold/pipe flange is missing');
  assert(collector.at(-1).point.y-pipe[0].point.y<.006,'Downpipe misses its manifold outlet');
}
await gap('Center support to tunnel','e30assembly:cabin-floor:carpet',drive+'center-mount',[-.350,1,.098]);
await gap('Spare wheel retainer',tr+'spare-wheel-retainer',tr+'spare-wheel',[-1.658,1,.020],.003);
await gap('Battery tray to well','e30assembly:luggage:battery:tray',tr+'spare-wheel-well',[-1.923,1,.588],.008);
await gap('Luggage mat to deck',tr+'trunk-carpet',tr+'spare-wheel-well',[-1.826,1,-.591],.008);

// Check the mount against the closest actual surface, rather than another
// portion of the same fender that happens to be higher in the same ray.
async function seated(label, host, part, at, tolerance=.006) {
  const [h,m]=await Promise.all([hits(host,at),hits(part,at)]);
  assert(h.length&&m.length,label+' has no contact sample at '+at);
  const top=m[0].point.y, bottom=m.at(-1).point.y;
  const miss=Math.min(...h.map(p=>Math.max(bottom-p.point.y,p.point.y-top,0)));
  assert(miss<=tolerance,label+' is floating '+(miss*1000).toFixed(1)+' mm');
  metrics[label]=Math.round(miss*1000);
}
for(const [part,side,x,z] of [
  ['airbox','left',1.746,-.706],['washer-reservoir','right',1.692,.664],
  ['expansion-tank','left',1.69,-.696],['power-steering','left',1.205,-.725],
  ['fuse-box','left',.959,-.711],['positive-junction','right',.979,.710],
  ['abs-pump','left',1.628,-.73],['ignition-coil','right',1.702,.708],['ac-lines','right',1.733,.714],
]) await seated(part+' mounting',bay+'tower-'+side,bay+part,[x,1,z]);
for(const [side,z] of [['left',-.485],['right',.485]]){
  await seated(side+' trunk hinge to lid liner',tr+'trunk-lid-inner',body+'trunk:hinge-'+side,[-1.717,1,z]);
}
const pumpShaft=await hits(mountPump,[1.65,.548,.057],[1,0,0]);
const clutchPilot=await hits(coolingFan,[1.65,.548,.057],[1,0,0]);
assert(pumpShaft.length&&clutchPilot.length&&clutchPilot[0].point.x-pumpShaft.at(-1).point.x<=.003,'Fan pilot misses the pump spindle');
await seated('Right engine mount to block','e30assembly:engine:block',subframe,[1.295,1,.157]);
await seated('Left engine mount to block','e30assembly:engine:block',subframe,[1.295,1,-.157]);

async function clearance(id,cap) {
  let min=Infinity;
  for(const m of await meshes(id)) {
    const points=m.geometry.attributes.position, p=new Vector3();
    for(let i=0;i<points.count;i+=2){
      p.fromBufferAttribute(points,i).applyMatrix4(m.matrixWorld);
      if(p.y<.712||Math.abs(p.z)>.74||p.x<.87)continue;
      const surface=(await hits(cap,[p.x,1.15,p.z]))[0];
      if(surface)min=Math.min(min,surface.point.y-p.y);
    }
  }
  assert(min>=.003,id+' pokes through the hood: '+(min*1000).toFixed(1)+' mm');
  return Number.isFinite(min)?Math.round(min*1000):null;
}
for(const id of ['radiator-support','airbox','washer-reservoir','expansion-tank','abs-pump','fuse-box-cover'])
  metrics[id+' to hood']=await clearance(bay+id,body+'hood');

const hood=model.openingPanels.find(panel=>panel.id===body+'hood');
hood.camera={position:[.89,1.82,1.31],target:[1.42,.66,0]};
model.revision=revision;
model.catalog.modelRevision=revision;
const {parseReference, planFor, separationOffset}=await localReferenceTools();
assert.equal(model.nodes.length,baseline.nodes.length);
for(const old of baseline.nodes){
  const current=nodes.get(old.id);
  assert.equal(current.parentId,old.parentId,old.id);
  assert.deepEqual(current.sourceContext,old.sourceContext,old.id);
  assert.deepEqual(current.displayDirection,old.displayDirection,old.id);
}
for(const panel of baseline.openingPanels){
  const current=model.openingPanels.find(p=>p.id===panel.id);
  if(current===hood) {const {camera,...motion}=current;assert.deepEqual(motion,panel);}
  else assert.deepEqual(current,panel,'Opening geometry changed for '+panel.id);
}
for(const [id,system] of [
  [bay+'airbox','system:engine-bay'],[tr+'spare-wheel','system:luggage-trim'],
  [under+'fuel-tank','system:underbody'],[under+'exhaust-pipes','system:underbody'],
  [drive+'center-mount','system:driveshaft'],
]){
  const plan=planFor(model,system,nodes.get(id));
  assert.deepEqual(separationOffset(plan,0),[0,0,0],id+' does not reassemble');
  assert(separationOffset(plan,1).some(x=>Math.abs(x)>.012),id+' does not separate');
}
const luggageGap=separationOffset(planFor(model,'system:luggage-trim',nodes.get(tr+'spare-wheel')) ,1)[1]
  -separationOffset(planFor(model,'system:luggage-trim',nodes.get(tr+'spare-wheel-well')),1)[1];
assert(luggageGap>.05,'Spare wheel does not clear its well in exploded view');
const pending=[];
for(const asset of model.assets.filter(a=>patchedAssets.has(a.id))){
  const data=await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scenes.get(asset.id),{binary:true})));
  const digest=sha(data);
  Object.assign(asset,{url:prefix+digest+'.glb',bytes:data.length,sha256:digest});
  pending.push([asset.url,data]);
}
assert.equal(parseReference(model).nodes.length,baseline.nodes.length);
const manifest=Buffer.from(JSON.stringify(model)),digest=sha(manifest);
const pin={...prior,revision,manifestUrl:prefix+'manifest.'+digest+'.json',sha256:digest,
  assetBytes:model.assets.reduce((sum,a)=>sum+a.bytes,0)};
assert(pin.assetBytes<=24*1024*1024,'Geometry budget exceeded: '+pin.assetBytes);
for(const [path,data] of pending) await immutable('public'+path,data);
await immutable('public'+pin.manifestUrl,manifest);
if(!archive.some(pin=>pin.id===prior.id&&pin.revision===prior.revision)) await replaceJson(archivePath,[...archive,prior]);
await replaceJson(pinPath,pin);
console.log(JSON.stringify({revision,assetBytes:pin.assetBytes,checkedClearancesMm:metrics}));
