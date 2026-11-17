import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Matrix4 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { siteContent } from '../scripts/site-content.mjs';
import { compressGeometryGlb } from './geometry/compress-glb.mjs';
import { buildCoolantService } from './geometry/coolant-service.mjs';
import { compactPart } from './geometry/local-cabin-glb.mjs';
import { immutable, localReferenceTools, nameOf, readJson, replaceJson, sha } from './geometry/local-reference-review.mjs';

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result=await blob.arrayBuffer();
    this.onloadend?.();
  }
};

const series=process.argv[2];
assert(['e30','e34'].includes(series),'Specify e30 or e34.');
const e30=series==='e30';
const content=siteContent();
assert(content.release,'Set E34_ASSET_PACK to the Workshop asset pack.');
const dir=e30?'work/e30/getrag-service':'work/525i-service-candidate';
const receiptPath=dir+'/'+(e30?'review.json':'fit-review.json');
const current=await readJson(receiptPath);
const archives=current.archives??[];
const pinOf=entry=>entry.release??entry;
const base=[current,...archives].find(entry=>pinOf(entry).revision===(e30?1196:1051));
assert(base,'Build the fan service reference first.');
const pin=pinOf(base),revision=pin.revision+1;
const diskPath=url=>dir+(e30?url:'/'+nameOf(url));
const prefix='/models/'+series+'-lore/r'+revision+'/';

async function verified(path,digest) {
  const bytes=await fs.readFile(path);
  assert.equal(sha(bytes),digest,path);
  return bytes;
}

const model=JSON.parse(await verified(diskPath(pin.manifestUrl),pin.sha256));
const catalog=model.catalog;
const asset=model.assets.find(a=>a.id===(e30?'e30:325i-mechanical':'authored:525i-visual-detail'));
const input=await verified(diskPath(asset.url),asset.sha256);
const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(Uint8Array.from(input).buffer,'');
const nodes=new Map(model.nodes.map(node=>[node.id,node]));
const pages=new Map();
const usefulPages=/^(?:water_pump_thermostat|cooling_system_(?:water_pump|thermostat_housing|water_hoses|fan_fan_coupling)|ignition_wiring|timing_and_valve_train_tooth_belt|fan_belt|belt_drive_vibration_damper|radiator)$/;
for(const page of Object.values(catalog.assemblies)){
  const slug=nameOf(page.key).replace(/\.html$/,'');
  if(usefulPages.test(slug))pages.set(slug,{page,items:JSON.parse(await verified(content.publicDir+page.url,page.sha256)).items});
}

const engine=e30?'e30assembly:engine':'m50:cooling';
const pump=e30?'e30assembly:engine:water-pump':'m50:water-pump';
const stat=e30?'e30cooling:thermostat-body':'m50:thermostat-housing';
const radiator=e30?'e30assembly:radiator-pack:radiator':'e34sys:radiator';
const keepIds=e30?{'water-pump':pump,'upper-hose':'e30assembly:radiator-pack:hoses','alternator':'e30assembly:engine:alternator'}
  :{thermostat:'m50:thermostat','expansion-tank':'e34sys:expansion-tank'};
const e34Guide='m50-water-pump-job-planning';
const loc=(chapter,page,printed,title,href)=>({chapter,page,pdf:page,printed,title,href,guides:[]});
const manual={
  pump:e30?loc('17',327,'17 · M20 circuit','BMW M20 coolant circuit','/e30/manual/17?pdf=327')
    :loc('170',213,'170-9','Bentley M50 pump extraction and torque','/manual/170?pdf=213'),
  stat:e30?loc('17',332,'17-6','BMW M20 coolant fill and bleed','/e30/manual/17?pdf=332')
    :loc('170',214,'170-10','Bentley M50 thermostat replacement','/manual/170?pdf=214'),
};

const sharedHardware=new Map();
buildCoolantService(series,(key,label,point,draw,slug,numbers=[])=>{
  const id=keepIds[key]??series+'cooling:'+key;
  const previous=nodes.get(id);
  if(previous?.assetId===asset.id)for(const name of previous.meshNames){
    const old=scene.getObjectByName(name);
    assert(old?.parent,name);
    old.removeFromParent();
  }
  const {page,items}=pages.get(slug);
  const positions=numbers.flatMap(number=>{
    const rows=items.filter(item=>item.number===number);
    assert(rows.length,id+' · '+number);
    const selected=key==='pump-return-hose'?rows.filter(row=>row.reference==='01'):rows;
    return selected.map(row=>({assemblyId:page.id,id:row.id,number:row.number,partId:row.partId}));
  });
  const selected=positions.length===1&&!/(?:impeller|hose-clamp)/.test(key)?positions[0]:undefined;
  const isStat=/^(?:thermostat|upper-hose|lower-hose|bleed-screw|expansion-tank)/.test(key);
  const sharedKey=/^(pump-bolt|pulley-bolt|thermostat-bolt|cover-bolt|cross-pipe-bolt)-\d+$/.exec(key)?.[1];
  let group=sharedHardware.get(sharedKey);
  if(!group){
    group=new Group();
    group.name='coolant_'+id.replace(/[^a-z0-9]/gi,'_');
    draw(group);
    compactPart(group);
    // Round position coordinates to 0.03 mm so the geometry stays within the viewer budget.
    for(const mesh of group.children){
      const positions=mesh.geometry.getAttribute('position').array;
      for(let index=0;index<positions.length;index++)positions[index]=Math.round(positions[index]*32768)/32768;
    }
    if(sharedKey)sharedHardware.set(sharedKey,group);
    scene.add(group);
  }
  const bounds=new Box3().setFromObject(group,true);
  assert(!bounds.isEmpty()&&bounds.getSize(bounds.min.clone()).length()>.001,id);
  const guideIds=e30||isStat?previous?.guideIds??[]:[e34Guide];
  const parentId=previous?.parentId??(key==='bleed-screw'?(e30?stat:'e34sys:expansion-tank')
    :key==='thermostat-body'?engine:isStat?stat
    :/^(pump-|pulley-bolt)/.test(key)?pump:engine);
  const internal=/^(?:pump-gasket|pump-o-ring|pump-impeller|thermostat(?:$|-(?:profile-)?seal)|tensioner-)/.test(key);
  nodes.set(id,{...previous,id,name:label,kind:'part',parentId,assetId:asset.id,meshNames:[group.name],
    matrix:new Matrix4().setPosition(...point).toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
    systemIds:['system:cooling','system:engine-bay'],
    displayDirection:[.28,.10,point[2]<0?-.23:.23],internal,guideIds,
    oem:selected?.number??null,canonicalId:selected?.partId??null,thumbnail:null,
    sourceContext:selected?{contextId:catalog.context.id,assemblyId:page.id,positionId:selected.id}:undefined});
  catalog.bindings[id]={nodeId:id,title:label,kind:selected?'component':'reference',assemblyIds:[page.id],positions,guideIds,
    manual:[isStat?manual.stat:manual.pump],note:'',visualSources:[{title:'BMW '+page.title,url:page.sourceUrl}]};
});

if(e30){
  // The shaft and V-groove now share the pump and crank pulley plane.
  const alternator=nodes.get('e30assembly:engine:alternator');
  const installedPulley=nodes.get('e30cooling:alternator-pulley');
  assert(Math.abs(alternator.matrix[12]+alternator.bounds.max[0]-installedPulley.matrix[12])<.032,'Alternator pulley must meet the alternator shaft');
  const timed=nodes.get('e30assembly:engine:timing');
  timed.internal=true;
}

if(!e30){
  const id='m50:pulley:water-pump';
  const node=nodes.get(id);
  const {page,items}=pages.get('cooling_system_fan_fan_coupling');
  const row=items.find(item=>item.number==='11511730554');
  assert(row,'M50 water pump pulley catalog position');
  const position={assemblyId:page.id,id:row.id,number:row.number,partId:row.partId};
  Object.assign(node,{oem:row.number,canonicalId:row.partId,
    sourceContext:{contextId:catalog.context.id,assemblyId:page.id,positionId:row.id}});
  Object.assign(catalog.bindings[id],{kind:'component',assemblyIds:[page.id],positions:[position],
    manual:[manual.pump],note:'',visualSources:[{title:'BMW '+page.title,url:page.sourceUrl}]});
  for(const [nodeId,source] of [[pump,manual.pump],[stat,manual.stat]]){
    const binding=catalog.bindings[nodeId];
    binding.manual=[source,...binding.manual];
  }
}

const glb=Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true}));
const bytes=await compressGeometryGlb(glb),digest=sha(bytes);
Object.assign(asset,{url:prefix+digest+'.glb',bytes:bytes.length,sha256:digest});
model.nodes=[...nodes.values()];
model.revision=catalog.modelRevision=revision;
catalog.coverage.renderable=model.nodes.filter(node=>node.assetId).length;
catalog.coverage.bound=Object.values(catalog.bindings).filter(binding=>binding.assemblyIds.length).length;
catalog.coverage.withCandidates=Object.values(catalog.bindings).filter(binding=>binding.positions.length).length;
const assetBytes=model.assets.reduce((sum,a)=>sum+a.bytes,0);
const {parseReference}=await localReferenceTools();
try{parseReference(model);}catch(error){console.error(error.message,'Asset bytes:',assetBytes);process.exit(1);}
const manifest=Buffer.from(JSON.stringify(model)),sha256=sha(manifest);
const next={...pin,revision,sha256,manifestUrl:prefix+'manifest.'+sha256+'.json',renderableCount:catalog.coverage.renderable,assetBytes};
await immutable(diskPath(asset.url),bytes);
await immutable(diskPath(next.manifestUrl),manifest);
const {archives:older,...earlier}=base;
const prior=[earlier,...archives.filter(entry=>pinOf(entry).revision!==pin.revision)];
await replaceJson(receiptPath,e30?{...next,archives:prior}:{release:next,archives:prior,files:[
  {url:asset.url,file:nameOf(asset.url),sha256:digest},
  {url:next.manifestUrl,file:nameOf(next.manifestUrl),sha256},
]});
console.log(series+' r'+revision+' · '+assetBytes+' bytes');
