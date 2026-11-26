/** Fit the two wheel-bearing stacks to the local rear suspension references. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Box3, Group, Matrix4} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {siteContent} from '../scripts/site-content.mjs';
import {compactPart} from './geometry/local-cabin-glb.mjs';
import {compressGeometryGlb} from './geometry/compress-glb.mjs';
import {drawRearTrailingArm} from './geometry/rear-suspension-service.mjs';
import {bearingSeat, wheelBearingLayout, sealedBearing, bearingCirclip, wheelHub, inboardDriveFlange, inboardCollar, inboardLock} from './geometry/rear-wheel-bearing.mjs';
import {immutable, localReferenceTools, nameOf, readJson, replaceJson, sha} from './geometry/local-reference-review.mjs';

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
};

const series=process.argv[2];
assert(series==='e30'||series==='e34','Specify e30 or e34.');
const e30=series==='e30', content=siteContent();
assert(content.release,'Set E34_ASSET_PACK to the Workshop asset pack.');
const dimensions=(await readJson('data/digital-twin/rear-wheel-bearing-references.json'))[series];
const {revision,modelId}=dimensions;
const root=e30?'work/e30/getrag-service':'work/525i-service-candidate';
const receiptPath=root+(e30?'/review.json':'/fit-review.json');
const {archives=[],...current}=await readJson(receiptPath);
const pinOf=entry=>e30?entry:entry.release;
const earlier=[current,...archives].filter(entry=>pinOf(entry).revision<revision);
const pin=earlier.map(pinOf).find(entry=>entry.revision===revision-1);
assert(pin?.id===modelId,'Generate both local rear suspension references first.');
const prefix='/models/'+series+'-lore/r'+revision+'/';
const localPath=url=>root+(e30?url:'/'+nameOf(url));
const checked=async(file,digest)=>{
  const bytes=await fs.readFile(file);
  assert.equal(sha(bytes),digest,file);
  return bytes;
};
const model=JSON.parse(await checked(localPath(pin.manifestUrl),pin.sha256));
const {catalog}=model;
const page=catalog.assemblies[dimensions.catalogAssembly];
assert(page);
const {items}=JSON.parse(await checked(content.publicDir+page.url,page.sha256));
const condition=items.find(item=>item.number===dimensions.part)?.conditions;
const dimensionLabel=[dimensions.bore,dimensions.diameter,dimensions.width].join('X');
assert(condition?.some(item=>item.value===dimensionLabel),'Bearing dimensions differ from the pinned BMW position.');

const asset=model.assets.find(item=>item.id===(e30?'e30:325i-mechanical':'authored:525i-bay-suspension'));
assert(asset);
const source=await checked(localPath(asset.url),asset.sha256);
const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(Uint8Array.from(source).buffer,'');
const nodes=new Map(model.nodes.map(node=>[node.id,node]));
const dimension=(bounds,key)=>bounds.max[key]-bounds.min[key];
const assertClose=(a,b,label)=>assert(Math.abs(a-b)<.0001,label);

const replacedMeshes=new Set();
function add(id, name, matrix, draw, parentId, number, side, note='') {
  const original=nodes.get(id);
  if(original?.assetId===asset.id) for(const meshName of original.meshNames) {
    if(replacedMeshes.has(meshName)) continue;
    const object=scene.getObjectByName(meshName);
    assert(object,meshName);
    object.removeFromParent();
    replacedMeshes.add(meshName);
  }
  const group=new Group();
  group.name='wheel_bearing_'+id.replace(/[:-]/g,'_');
  draw(group);
  compactPart(group);
  for(const mesh of group.children) {
    const coordinates=mesh.geometry.getAttribute('position').array;
    for(let i=0;i<coordinates.length;i++) coordinates[i]=Math.round(coordinates[i]*65536)/65536;
  }
  const bounds=new Box3().setFromObject(group,true);
  scene.add(group);
  nodes.set(id,{
    ...original,id,name,kind:original?.kind??'part',parentId,meshNames:[group.name],assetId:asset.id,matrix:matrix.toArray(),
    bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
    systemIds:[...new Set([...(original?.systemIds??[]),'system:rear-suspension','system:rear-brakes'])],
    internal:false,displayDirection:[0,.03,side*(id.endsWith('bearing')?.51:.64)],
    thumbnail:original?.thumbnail??null,guideIds:original?.guideIds??[],
  });
  if (!number) return bounds;
  const item=items.find(item=>item.number===number);
  assert(item,id+' is missing its BMW catalog position.');
  const node=nodes.get(id);
  Object.assign(node,{oem:number,canonicalId:item.partId,
    sourceContext:{contextId:catalog.context.id,assemblyId:page.id,positionId:item.id}});
  const chapter=e30?'33':'330';
  const pdf=e30?634:303;
  catalog.bindings[id]={
    nodeId:id, title:name, kind:'component', assemblyIds:[page.id],
    positions:[{id:item.id,number,partId:item.partId,assemblyId:page.id}], guideIds:node.guideIds,
    manual:[{chapter,page:pdf,pdf,printed:e30?'33-14':'330-5',
      title:(e30?'BMW':'Bentley')+' · Rear wheel bearing removal and installation',
      href:(e30?'/e30':'')+'/manual/'+chapter+'?pdf='+pdf,guides:node.guideIds}],
    note,
    visualSources:[{title:'BMW '+page.title,url:page.sourceUrl}],
  };
  return bounds;
}

for(const [side,sign] of [['left',-1],['right',1]]) {
  const suffix=side==='left'?'1':'-1', label=side[0].toUpperCase()+side.slice(1);
  const bearingPrefix=series+'wheel-bearing:'+side+':';
  const armId=e30?'e30assembly:rear-'+side+':trailing-arm':'e34sys:rear-trailing-arm-'+suffix;
  const hubId=e30?'e30assembly:rear-'+side+':hub':'e34sys:hub-rear-'+suffix;
  const rotorId=e30?'e30assembly:rear-'+side+':rotor':'e34sys:brake-disc-rear-'+suffix;
  const cvId=series+'rear:'+side+(e30?'-stub':'-hub-flange');
  const hub=nodes.get(hubId), arm=nodes.get(armId), rotor=nodes.get(rotorId), cv=nodes.get(cvId);
  assert.deepEqual(hub.matrix,rotor.matrix,side+' hub and rotor axes');
  const layout=wheelBearingLayout(series,hub.matrix.slice(12,15),cv.matrix.slice(12,15),dimensions);
  const {pin:position,center,outerFace,clipCenter,wheelFace,housing}=layout;
  const axial=z=>new Matrix4().fromArray(hub.matrix).setPosition(...position(z));
  const hubBounds=add(hubId,label+' rear wheel hub'+(e30?'':' and stub axle'),axial(0),
    group=>wheelHub(group,series,layout),hub.parentId,dimensions.hub,sign);
  assertClose(wheelFace,rotor.bounds.max[2]-.006,side+' hub face and brake hat register');
  assert(hubBounds.max.z>wheelFace,side+' hub pilot projects through brake hat');
  assert(clipCenter<wheelFace-.017,side+' bearing retaining ring clearance');
  add(armId,arm.name,new Matrix4().setPosition(...housing),group=>
    drawRearTrailingArm(group,series,sign,housing,seat=>bearingSeat(seat,layout)),arm.parentId,null,sign);
  const bearing=add(bearingPrefix+'bearing',label+' rear wheel bearing',axial(center),
    group=>sealedBearing(group,layout),armId,dimensions.part,sign,
    [dimensions.bore,dimensions.diameter,dimensions.width].join(' × ')+' mm. Press the outer race into the trailing arm, then support the inner race when drawing in the hub.');
  assertClose(dimension(bearing,'x'),dimensions.diameter/1000,side+' bearing outside diameter');
  assertClose(dimension(bearing,'z'),dimensions.width/1000,side+' bearing width');
  add(bearingPrefix+'circlip',label+' rear bearing circlip',axial(clipCenter),
    bearingCirclip,armId,'33411138648',sign,'79 × 2.5 mm. Use a new ring and verify it seats around the groove.');
  assertClose(clipCenter-.00125,outerFace,side+' bearing retaining face');
  if(!e30) {
    add(cvId,label+' inboard CV flange',axial(layout.cv),inboardDriveFlange,cv.parentId,'33411134880',sign);
    assert.deepEqual(nodes.get(cvId).matrix.slice(12),cv.matrix.slice(12),side+' driveshaft mating face stays aligned');
    add(bearingPrefix+'collar',label+' rear M27 × 1.5 collar nut',axial(layout.cv+.0045),inboardCollar,cvId,dimensions.collar,sign);
    add(bearingPrefix+'lock',label+' rear collar nut lockplate',axial(layout.cv+.0045),inboardLock,cvId,dimensions.lock,sign);
  }
}
assert(![...nodes.values()].some(node=>node.assetId===asset.id&&node.meshNames.some(name=>replacedMeshes.has(name))),
  'A retained part still uses a replaced mesh.');
const bytes=await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true})));
const assetSha=sha(bytes);
Object.assign(asset,{bytes:bytes.length,sha256:assetSha,url:prefix+assetSha+'.glb'});
model.nodes=[...nodes.values()];
model.revision=catalog.modelRevision=revision;
catalog.coverage.renderable=model.nodes.filter(node=>node.assetId).length;
catalog.coverage.bound=Object.values(catalog.bindings).filter(binding=>binding.assemblyIds.length).length;
catalog.coverage.withCandidates=Object.values(catalog.bindings).filter(binding=>binding.positions.length).length;
const {parseReference,availableAssemblyServices}=await localReferenceTools();
const jobs=availableAssemblyServices(parseReference(model));
assert.equal(jobs.filter(job=>job.id.endsWith('-rear-wheel-bearing')).length,2,'Both bearing jobs must resolve against each model.');

const manifest=Buffer.from(JSON.stringify(model)), sha256=sha(manifest);
const release={...pin,revision,sha256,manifestUrl:prefix+'manifest.'+sha256+'.json',
  renderableCount:catalog.coverage.renderable,assetBytes:model.assets.reduce((total,item)=>total+item.bytes,0)};
assert(release.assetBytes<=24*1024*1024,'Reference exceeds the Workshop package limit');
await immutable(localPath(asset.url),bytes);
await immutable(localPath(release.manifestUrl),manifest);
await replaceJson(receiptPath,e30?{...release,archives:earlier}:{
  release,archives:earlier,files:[asset,{url:release.manifestUrl,sha256}].map(item=>({url:item.url,file:nameOf(item.url),sha256:item.sha256})),
});
console.log(series+' r'+revision+' · '+release.assetBytes+' geometry bytes; bearing seats, hubs, brake faces and both guided jobs verified.');
