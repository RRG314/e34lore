/** Refit the assembled 525i and 325i interiors for local owner review. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, DoubleSide, Matrix4, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { compressGeometryGlb } from './geometry/compress-glb.mjs';
import { refitCabinStructures } from './geometry/e34-cabin-clearance.mjs';
import { luggageFit } from './geometry/e34-luggage-fit.mjs';
import { appendGeometry, compactPart } from './geometry/local-cabin-glb.mjs';
import { immutable, localReferenceTools, nameOf, readJson, replaceJson, sha } from './geometry/local-reference-review.mjs';

const targets=[
  {series:'e34',root:'work/525i-service-candidate',prior:1033,interim:[1034,1035],revision:1036},
  {series:'e30',root:'work/e30',prior:1153,revision:1154},
];
const {parseReference,members,visibleNodes,defaultView,resolveInitial,planFor,separationOffset}=await localReferenceTools();
const identity=new Matrix4().toArray();
const vec=point=>new Vector3(...point);
const worldBounds=node=>new Box3(vec(node.bounds.min),vec(node.bounds.max)).applyMatrix4(new Matrix4().fromArray(node.matrix));
const belts=[
  ['e34sys:rear-belt-1','e34trim:rear-belt-left'],
  ['e34sys:rear-belt--1','e34trim:rear-belt-right'],
  ['e34sys:rear-center-lap-belt','e34trim:rear-center-lap-belt'],
];
const hiddenE30Trim=/^e30trim:(?:.*(?:-rivet-|-clip(?:-|$)|-clamp(?:-|$)|-screw(?:-|$)|-washer(?:-|$)|-bolt(?:-|$)|-fastener(?:-|$)|-grommet-|seat-mount-|-c-nut-|-catch-support$)|(?:dash-tab-|headliner-bow-|battery-cover-insert-|sunroof-(?:frame$|guide-)|wind-deflector$|deflector-buffer-|roof-drive$|front-belt-retractor-|rear-retractor-|console-support$|rear-console-(?:nut|spacer)$))/;

globalThis.FileReader=class {
  async readAsArrayBuffer(blob) {this.result=await blob.arrayBuffer();this.onloadend?.();}
};
const material=new MeshStandardMaterial({side:DoubleSide});
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const measurementLoader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .register(()=>({name:'measure-assembled-fit',loadMaterial:()=>Promise.resolve(material)}));
async function load(bytes,reader=measurementLoader) {
  const {scene}=await reader.parseAsync(Uint8Array.from(bytes).buffer,'');
  scene.updateMatrixWorld(true);
  return scene;
}

function meshes(node,scene) {
  const objects=[], world=new Matrix4().fromArray(node.matrix);
  for(const name of node.meshNames) {
    const object=scene.getObjectByName(name);
    assert(object,name);
    object.traverse(source=>{
      if(!source.isMesh) return;
      const mesh=new Mesh(source.geometry,material);
      mesh.matrixAutoUpdate=false;
      mesh.matrix.multiplyMatrices(world,source.matrixWorld);
      mesh.updateMatrixWorld(true);
      mesh.userData.id=node.id;
      objects.push(mesh);
    });
  }
  assert(objects.length,node.id);
  return objects;
}

function verifyLining(lining,covered,origins,points) {
  let hits=0;
  for(const origin of origins.map(vec)) for(const point of points) {
    const ray=new Raycaster(origin,vec(point).sub(origin).normalize(),0,1.9);
    const finish=ray.intersectObjects(lining)[0], structure=ray.intersectObjects(covered)[0];
    assert(finish,`No cabin finish through ${point}`);
    if(structure) {
      assert(finish.distance<structure.distance+.0001,
        `${structure.object.userData.id} shows through ${finish.object.userData.id} at ${structure.point.toArray()}`);
      hits++;
    }
  }
  assert(hits>0,'Clearance checks missed all concealed geometry');
  return origins.length*points.length;
}

async function prepare({series,root,prior,interim=[],revision}) {
  const e30=series==='e30', pinPath=root+'/release.json', archivePath=root+'/releases.json';
  const archive=await readJson(archivePath), current=await readJson(pinPath);
  assert([prior,...interim,revision].includes(current.revision));
  const receipt=row=>e30?row:row.release;
  const base=archive.find(row=>receipt(row).revision===prior);
  assert(base);
  const initial=receipt(base);
  const filePath=url=>e30?root+'/assets'+url:/^\/models\/e34-lore\/r1\d{3}\//.test(url)?root+'/'+nameOf(url):'public'+url;
  const prefix=`/models/${series}-lore/r${revision}/`, pending=[];
  async function checked(url,digest,bytes) {
    const data=await fs.readFile(filePath(url));
    assert.equal(sha(data),digest,url);
    if(bytes!==undefined) assert.equal(data.length,bytes,url);
    return data;
  }
  const model=JSON.parse(await checked(initial.manifestUrl,initial.sha256));
  const find=id=>{
    const node=model.nodes.find(n=>n.id===id);
    assert(node,id);
    return node;
  };
  const asset=id=>{
    const found=model.assets.find(a=>a.id===id);
    assert(found,id);
    return found;
  };
  const scenes=new Map();
  async function geometry(id) {
    if(!scenes.has(id)) {
      const {url,sha256,bytes}=asset(id);
      scenes.set(id,await load(await checked(url,sha256,bytes)));
    }
    return scenes.get(id);
  }
  async function samples(ids) {
    const result=[];
    for(const id of ids) {
      const node=find(id);
      result.push(...meshes(node,await geometry(node.assetId)));
    }
    return result;
  }
  const changed=[];
  let verifiedCabinRays, verifiedLuggageRays=0;

  if(e30) {
    const tank=find('e30assembly:underbody:fuel-tank');
    assert.deepEqual(tank.matrix.slice(0,12),identity.slice(0,12));
    const before=worldBounds(tank);
    // Maintain the underside and strap depth while lowering the top of the tank.
    tank.matrix[5]=.84;
    tank.matrix[13]=before.min.y-tank.matrix[5]*tank.bounds.min[1];
    const after=worldBounds(tank);
    assert(Math.abs(after.min.y-before.min.y)<1e-8&&after.max.y<.325);
    changed.push(tank.id);
    for(const node of model.nodes.filter(n=>n.assetId&&hiddenE30Trim.test(n.id)&&!n.behindTrim)) {
      node.behindTrim=true;
      changed.push(node.id);
    }
    const lining=await samples(['e30assembly:cabin-floor:carpet']);
    const covered=await samples([tank.id]);
    const points=[-.80,-.71,-.62,-.54,-.46].flatMap(x=>[-.43,-.38,-.29,.29,.38,.43].map(z=>[x,.315,z]));
    verifiedCabinRays=verifyLining(lining,covered,[[-.95,1.08,0],[-.80,.96,-.27],[-.80,.96,.27]],points);
  } else {
    const source=archive.find(row=>row.release.revision===1031)?.release;
    assert(source);
    const original=JSON.parse(await checked(source.manifestUrl,source.sha256));
    const trim=asset('authored:525i-service-study');
    const oldTrim=original.assets.find(a=>a.id===trim.id);
    assert(oldTrim);
    const originalSystems=asset('assembled:systems-v8');
    const originalScene=await load(await checked(originalSystems.url,originalSystems.sha256,originalSystems.bytes),loader);
    const {group,replacements}=refitCabinStructures(original,originalScene,{assembledFit:true});
    for(const {node,name} of replacements) compactPart(group.getObjectByName(name));
    const luggage=luggageFit();
    const linerIds=['e34trim:trunk-liner-left','e34trim:trunk-liner-right'];
    const added=[];
    const tail=find('e34trim:trunk-tail-panel'), tailBinding=model.catalog.bindings[tail.id];
    function addLuggageNode(id,name,mesh,direction,note) {
      const node={...tail,id,name,parentId:'system:luggage-trim',behindTrim:undefined,
        displayDirection:direction,canonicalId:null,oem:null,
        sourceContext:{contextId:model.catalog.context.id,assemblyId:tail.sourceContext.assemblyId}};
      model.nodes.push(node);
      model.catalog.bindings[id]={...tailBinding,nodeId:id,title:name,kind:'reference',positions:[],note};
      added.push(id);
      mountLuggageMesh(node,mesh);
    }
    function mountLuggageMesh(node,mesh) {
      mesh.name=node.id.replaceAll(':','_').replaceAll('-','_')+'_fitted';
      compactPart(mesh);
      group.add(mesh);
      replacements.push({node,name:mesh.name});
    }
    for(const [index,id] of linerIds.entries()) {
      const node=find(id);
      const {liner,mounts}=luggage.liners[index];
      delete node.behindTrim;
      mountLuggageMesh(node,liner);
      const side=index===0?'left':'right';
      for(const [station,position] of mounts.entries()) {
        const rivet=find(`e34trim:${side}-liner-rivet-${station+1}`);
        rivet.matrix=new Matrix4().makeTranslation(...position).toArray();
      }
    }
    addLuggageNode('e34trim:luggage-floor-carpet','Luggage floor carpet and spare-wheel cover',
      luggage.floor,[-.11,.23,0],'Modeled luggage floor finish. Check the catalog for the floor mat and spare-wheel arrangement.');
    addLuggageNode('e34trim:luggage-front-liner','Luggage compartment front liner',
      luggage.partition,[.24,.24,0],'Modeled trim behind the rear seat. Check for the through-loading option.');
    delete tail.behindTrim;
    const shelf=find('e34chassis:rear-package-tray');
    delete shelf.behindTrim;
    shelf.cabinVisible=true;
    shelf.systemIds.push('system:rear-seat-trim');
    const extra=await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(group,{binary:true})));
    const bytes=appendGeometry(await checked(oldTrim.url,oldTrim.sha256,oldTrim.bytes),extra);
    const digest=sha(bytes), scene=await load(bytes);
    Object.assign(trim,{url:prefix+digest+'.glb',sha256:digest,bytes:bytes.length});
    pending.push({url:trim.url,sha256:digest,type:'model/gltf-binary',bytes});
    scenes.set(trim.id,scene);
    for(const {node:sourceNode,name} of replacements) {
      const node=find(sourceNode.id);
      const box=new Box3().setFromObject(scene.getObjectByName(name));
      Object.assign(node,{assetId:trim.id,meshNames:[name],matrix:identity,bounds:{min:box.min.toArray(),max:box.max.toArray()}});
      changed.push(node.id);
      assert(members(model,node.systemIds[0]).has(node.id));
      assert.deepEqual(separationOffset(planFor(model,'vehicle',node),0),[0,0,0]);
    }
    assert(worldBounds(find('e34sys:body-wiring-harness')).min.y>.20,'Harness drops below its sill route');
    for(const [legacy,replacement] of belts) {
      assert(!model.nodes.some(node=>node.parentId===legacy));
      find(replacement).previousIds=[legacy];
      model.nodes=model.nodes.filter(node=>node.id!==legacy);
      delete model.catalog.bindings[legacy];
    }
    const lining=await samples(['e34sys:cabin-carpet','e34trim:rear-carpet','e34hvac:bulkhead-liner']);
    const covered=await samples(changed.filter(id=>id.startsWith('e34sys:')));
    const points=[-.64,-.39,-.23,.08,.31,.43,.51,.56,.59,.65,.71].flatMap(x=>
      [.20,.22,.25,.32,.38,.423,.475,.51,.58,.65,.685,.695].flatMap(z=>[[x,.26,z],[x,.26,-z]]));
    verifiedCabinRays=verifyLining(lining,covered,[[-.61,1.16,-.285],[-.39,1.16,0],[-.39,1.16,.285]],points);
    const luggageTrim=await samples([...linerIds,...added,tail.id,shelf.id]);
    const underTrim=await samples(['e34sys:luggage-floor','e34sys:fuel-filler-neck','e34sys:fuel-pump-sender',
      ...[-1,1].flatMap(side=>[`e34chassis:rear-tower-${side}`,`e34sys:rear-damper-${side}`,`e34sys:rear-spring-pads-${side}`])]);
    const luggagePoints=[[-2.19,.51,0],[-2.08,.51,.4],[-2.08,.51,-.4],[-1.82,.514,.355],[-1.82,.514,.403],
      ...[-1,1].flatMap(sign=>[[-1.93,.67,sign*.59],[-1.72,.79,sign*.46],[-1.59,.92,sign*.55],[-1.49,.68,sign*.40]])];
    verifiedLuggageRays=verifyLining(luggageTrim,underTrim,[[-2.73,1.25,0],[-2.51,1.17,.17],[-2.51,1.17,-.17]],luggagePoints);
    for(const [index,id] of linerIds.entries()) {
      const liner=await samples([id]);
      const side=index===0?'left':'right';
      for(const station of [1,2]) {
        const rivet=find(`e34trim:${side}-liner-rivet-${station}`);
        const origin=vec(rivet.matrix.slice(12,15)).add(new Vector3(0,.01,0));
        const ray=new Raycaster(origin,new Vector3(0,-1,0),0,.025);
        assert(ray.intersectObjects(liner).some(hit=>Math.abs(hit.distance-.01)<.001),rivet.id);
        assert(separationOffset(planFor(model,'system:luggage-trim',rivet),4).some(delta=>delta!==0),rivet.id);
      }
    }
  }

  model.catalog.modelRevision=model.revision=revision;
  const renderable=model.nodes.filter(n=>n.assetId);
  model.catalog.coverage.renderable=renderable.length;
  model.catalog.coverage.bound=renderable.filter(n=>model.catalog.bindings[n.id]).length;
  model.catalog.coverage.withCandidates=renderable.filter(n=>model.catalog.bindings[n.id]?.positions.length).length;
  const parsed=parseReference(model), view=defaultView(), assembled=visibleNodes(parsed,view);
  const wheels=assembled.filter(node=>/^wheel:|^e30assembly:(?:front|rear)-(?:left|right):wheel$/.test(node.id));
  assert.equal(wheels.length,4);
  assert(wheels.every(node=>Math.abs(worldBounds(node).min.y)<.001));
  const lowest=assembled.filter(node=>!wheels.includes(node))
    .map(node=>({id:node.id,height:worldBounds(node).min.y})).sort((a,b)=>a.height-b.height)[0];
  assert(lowest.height>.09,`${lowest.id} hangs ${lowest.height}m above the tire contact plane`);
  if(e30) {
    const exploded=new Set(visibleNodes(parsed,{...view,explosion:4}).map(node=>node.id));
    for(const id of changed.slice(1)) {
      const node=find(id);
      assert(!assembled.some(n=>n.id===id)&&exploded.has(id),id);
      const scope=node.systemIds.find(system=>system!=='system:interior');
      assert(visibleNodes(parsed,{...view,scope}).some(n=>n.id===id),id);
      assert(separationOffset(planFor(parsed,scope,node),4).some(delta=>delta!==0),id);
    }
  } else {
    for(const [legacy,replacement] of belts) {
      assert.equal(resolveInitial(parsed,undefined,legacy).selected,replacement);
      assert(assembled.some(node=>node.id===replacement));
    }
  }

  for(const item of model.assets) {
    if(!pending.some(file=>file.sha256===item.sha256)) await checked(item.url,item.sha256,item.bytes);
  }
  const assetBytes=model.assets.reduce((sum,a)=>sum+a.bytes,0);
  const manifest=Buffer.from(JSON.stringify(model)), digest=sha(manifest);
  const release={...initial,revision,sha256:digest,manifestUrl:prefix+'manifest.'+digest+'.json',renderableCount:renderable.length,assetBytes};
  const existing=archive.find(row=>receipt(row).revision===revision);
  if(existing) assert.equal(receipt(existing).sha256,digest);
  pending.push({url:release.manifestUrl,sha256:digest,type:'application/json',bytes:manifest});
  const checks=(base.checks??[]).map(check=>{
    const node=find(check.nodeId);
    return {...check,revision,manifestSha256:digest,assetSha256:asset(node.assetId).sha256};
  });
  const record=e30?release:{schema:1,localOnly:true,sourceRevision:prior,base:initial,release,checks,
    files:pending.map(({url,sha256,type})=>({url,file:nameOf(url),sha256,type})),
    changed,verifiedCabinRays,verifiedLuggageRays,addedAssetBytes:assetBytes-initial.assetBytes};
  console.log(series.toUpperCase(),revision,JSON.stringify({verifiedCabinRays,verifiedLuggageRays,changed:changed.length,
    assembled:assembled.length,lowest,assetBytes,change:assetBytes-initial.assetBytes}));
  return async()=>{
    for(const file of pending) await immutable(filePath(file.url),file.bytes);
    if(!existing) await replaceJson(archivePath,[...archive,record]);
    if(!e30) await replaceJson(root+'/review.json',record);
    await replaceJson(pinPath,release);
  };
}

const writes=[];
for(const target of targets) writes.push(await prepare(target));
if(!process.argv.includes('--check')) for(const write of writes) await write();
