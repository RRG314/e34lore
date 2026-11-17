import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Matrix4, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { siteContent } from '../scripts/site-content.mjs';
import { compressGeometryGlb } from './geometry/compress-glb.mjs';
import { buildE30Rack, buildE34CenterLink, buildFrontCorner, placement } from './geometry/front-axle-service.mjs';
import { compactPart } from './geometry/local-cabin-glb.mjs';
import { immutable, localReferenceTools, nameOf, readJson, replaceJson, sha } from './geometry/local-reference-review.mjs';

globalThis.FileReader=class {
  async readAsArrayBuffer(blob){
    this.result=await blob.arrayBuffer();
    this.onloadend?.();
  }
};
const series=process.argv[2];
assert(['e30','e34'].includes(series),'Specify e30 or e34.');
const e30=series==='e30';
const content=siteContent();
assert(content.release,'Set E34_ASSET_PACK to the Workshop asset pack.');
const directory=e30?'work/e30/getrag-service':'work/525i-service-candidate';
const receiptPath=directory+'/'+(e30?'review.json':'fit-review.json');
const current=await readJson(receiptPath);
const archives=current.archives??[];
const releaseOf=entry=>entry.release??entry;
const base=[current,...archives].find(entry=>releaseOf(entry).revision===(e30?1194:1049));
assert(base,'Build the rear brake service reference first.');
const release=releaseOf(base), revision=release.revision+1;
const diskPath=url=>directory+(e30?url:'/'+nameOf(url));
const prefix='/models/'+series+'-lore/r'+revision+'/';

async function verified(path,digest){
  const bytes=await fs.readFile(path);
  assert.equal(sha(bytes),digest,path);
  return bytes;
}
const model=JSON.parse(await verified(diskPath(release.manifestUrl),release.sha256));
const catalog=model.catalog;
const nodes=new Map(model.nodes.map(node=>[node.id,node]));
const select=name=>{
  const entry=Object.values(catalog.assemblies).find(a=>a.key.split('/').at(-1).replace(/\.html$/,'')===name);
  assert(entry,name);
  return entry;
};
const assemblies={
  strut:select('front_spring_strut_shock_absorber'),
  top:select('guide_support_spring_pad_attaching_parts'),
  springs:select('coil_spring'),
  arms:select(e30?'front_axle_support_wishbone':'cross_member_wishbone_rod'),
  rods:select('steering_linkage_tie_rods'),
  bar:select('stabilizer_front'),
};
const pages=new Map();
for(const a of Object.values(assemblies)){
  pages.set(a.id,JSON.parse(await verified(content.publicDir+a.url,a.sha256)).items);
}
const serviceScope='system:front-suspension', steeringScope='system:steering';
const commonScopes=['system:suspension',serviceScope];
if(!nodes.has(steeringScope))nodes.set(steeringScope,{
  id:steeringScope,name:'Steering',parentId:serviceScope,kind:'system',systemIds:[],assetId:null,
  meshNames:[],matrix:new Matrix4().toArray(),bounds:null,internal:false,canonicalId:null,oem:null,guideIds:[],thumbnail:null,
});
for(const a of [assemblies.arms,assemblies.top,assemblies.springs,assemblies.strut,assemblies.rods,assemblies.bar]){
  a.systemIds=[...new Set([...a.systemIds,serviceScope,...(a===assemblies.rods?[steeringScope]:[])])];
  for(const scope of a.systemIds)catalog.systems[scope]=[...new Set([...(catalog.systems[scope]??[]),a.id])];
}

const loc=(chapter,page,printed,title,anchor)=>({
  chapter,page,pdf:page,printed,title,guides:[],
  href:(e30?'/e30':'')+'/manual/'+chapter+'?pdf='+page+(anchor?'#job-'+anchor:''),
});
const strut=e30?loc('31',516,'31-11','BMW 31 31 000 · Front spring strut')
  :loc('310',278,'310-2','Bentley · Remove and install the strut','front-strut-assembly');
const bench=e30?loc('31',519,'31-12','BMW · Front spring strut parts order')
  :loc('310',280,'310-4','Bentley · Spring strut parts order','front-spring-and-damper-disassembly');
const insert=e30?loc('31',521,'31-14','BMW 31 32 001 · Cartridge and retaining collar')
  :loc('310',281,'310-5','Bentley · Cartridge and shaft torques','front-spring-and-damper-disassembly');
const arms=e30?loc('31',507,'31-6','BMW 31 12 000 · Front wishbone')
  :loc('310',282,'310-6','Bentley · Front control arm installation','front-ride-height-and-control-arms');
const thrust=loc('310',286,'310-10','Bentley · Thrust arm installation','thrust-arm-replacement');
const rods=e30?loc('32',583,'32-8','BMW 32 21 251 · Tie rod and securing plate')
  :loc('320',295,'320-7','Bentley · Outer tie rods','outer-tie-rods-and-ends');
const center=loc('320',296,'320-8','Bentley · Center tie rod','center-link-camber-and-caster');
const link=e30?loc('31',530,'31-17','BMW · Front stabilizer bar')
  :loc('310',285,'310-9','Bentley · Stabilizer link torques','front-anti-roll-bar');

const fileKeys=e30?{main:'e30:325i-mechanical'}:{
  main:'authored:525i-bay-suspension',rods:'authored:525i-mechanical-detail',
};
const assets=new Map();
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
for(const [key,id] of Object.entries(fileKeys)){
  const asset=model.assets.find(a=>a.id===id);
  assert(asset,id);
  const path=await fs.stat(diskPath(asset.url)).then(()=>diskPath(asset.url),error=>{
    if(error.code!=='ENOENT')throw error;
    return content.publicDir+asset.url;
  });
  const bytes=await verified(path,asset.sha256);
  const {scene}=await loader.parseAsync(Uint8Array.from(bytes).buffer,'');
  assets.set(key,{asset,scene});
}

const stable34={
  'strut':'front-strut','top-mount':'front-top-mount',spring:'front-spring',damper:'front-damper',
  'upper-seat':'front-spring-seat','dust-boot':'front-dust-boot','control-arm':'front-control-arm',
  'thrust-arm':'front-thrust-arm','tie-rod':'tie-rod',
};
const idFor=(side,key)=>{
  if(e30)return 'e30assembly:front-'+side+':'+key;
  if(side==='axle')return 'e34steer:'+key;
  return stable34[key]?'e34sys:'+stable34[key]+'-'+(side==='left'?'1':'-1'):'e34axle:'+side+'-'+key;
};
const groups={
  strut:['strut','strut-spindle','damper','gland-nut','spring','lower-pad','upper-pad','upper-seat','top-mount',
    'shaft-washer','shaft-nut','top-cap','dust-boot','bump-stop','mount-insulator','mount-washer'],
  strutFastener:['tower-nut-1','tower-nut-2','tower-nut-3'],
  arms:['control-arm','control-nut','control-inner-nut','control-bolt','control-bush','control-bolt-1','control-bolt-2',
    'thrust-arm','thrust-bolt','thrust-inner-nut','thrust-nut','subframe'],
  rods:['tie-rod','tie-outer','tie-outer-nut','tie-inner','tie-inner-nut','tie-clamp-1','tie-clamp-2',
    'rack-boot','rack-boot-clip','rack-outer-clip','rack-lock','steering-rack','steering-arm','lever-bolt-1','lever-bolt-2','lever-bolt-3'],
};
const topNumbers={
  'top-mount':'31331139452','shaft-nut':e30?'32216769539':'31321139422','shaft-washer':e30?'07119931021':'07119905829',
  'lower-pad':'31331124322','upper-pad':'31331128523','upper-seat':'31331128524','top-cap':'31311139453',
  'dust-boot':'31331134314','bump-stop':'31331124449','mount-insulator':'31331110196','mount-washer':'31336776760',
};
const armNumbers=e30?{
  'control-nut':'32216769539','control-inner-nut':'31106774714','control-bush':'31129058931',
  'control-bolt-1':'31111137888','control-bolt-2':'31111137888','subframe':'31111130707',
}:{
  'control-nut':'31106769443','control-inner-nut':'07129900047','control-bolt':'07119914684',
  'thrust-bolt':'07119914854','thrust-inner-nut':'07129922745','thrust-nut':'31106769443',
};
const rodNumbers={
  'tie-rod':e30?'32111126360':'32211135668','tie-outer':e30?'32111126757':'32211135820',
  'tie-outer-nut':'07129922436','tie-inner':'32211135822','tie-inner-nut':'07129922436',
  'tie-clamp-1':'07119911611','tie-clamp-2':'07119911611','rack-boot':'32111127104',
  'rack-boot-clip':'32131094100','rack-outer-clip':'32131094100','rack-lock':'32111124540',
  'lever-bolt-1':'07119911694','lever-bolt-2':'07119911694','lever-bolt-3':'07119911694',
  'center-left-nut':'32211138864','center-right-nut':'07129922436',
};
function references(key,side){
  const right=side==='right';
  if(groups.strut.includes(key)||groups.strutFastener.includes(key)){
    const ref=key==='spring'?assemblies.springs:key in topNumbers||groups.strutFastener.includes(key)?assemblies.top:assemblies.strut;
    const number=topNumbers[key]??(
      key==='strut'||key==='strut-spindle'?(e30?(right?'31311127316':'31311127315'):(right?'31311138488':'31311138487'))
      :key==='damper'?(e30?'31321135892':'31321092283'):key==='gland-nut'?(e30?'31321117376':'31321129196')
      :groups.strutFastener.includes(key)?'07119904295':null);
    return {ref,numbers:number?[number]:[],manual:[strut,bench,insert],guides:[e30?'e30-front-strut':'front-strut-component-identification'],
      note:key==='spring'?'Select the spring by the vehicle’s spring table and factory options. Check the paint markings before ordering.'
        :key==='damper'?'Check the installed damper type and the catalog conditions before ordering.'
        :key==='gland-nut'?'Match the collar to the installed insert and housing.'
        :key==='strut-spindle'?'The spindle is part of the strut housing.':undefined,
      supplied:key==='strut-spindle',confirmed:!['damper'].includes(key)};
  }
  if(groups.arms.includes(key)){
    const number=key==='control-arm'?(e30?(right?'31121127726':'31121127725'):(right?'31121139988':'31121139987'))
      :key==='thrust-arm'?(right?'31121141098':'31121141097'):armNumbers[key];
    return {ref:assemblies.arms,numbers:number?[number]:[],manual:key.startsWith('thrust')?[thrust]:[arms],guides:e30?['e30-front-control-arm']:[],
      note:key==='control-bush'?'The catalog limits this bushing set to vehicles with A/C. Match the installed bushing and bracket before ordering.'
        :key==='control-arm'&&!e30?'Aluminum arm shown. The catalog also lists a steel arm.'
        :key==='thrust-arm'?'The thrust arm rubber bushing is ordered separately.':undefined,confirmed:key!=='control-bush'};
  }
  if(groups.rods.includes(key)||key.startsWith('center-')){
    const number=key==='steering-arm'?(right?'31131133558':'31131133557'):rodNumbers[key];
    return {ref:assemblies.rods,numbers:number?[number]:[],manual:key.startsWith('center-')?[center]:[rods],guides:e30?['e30-tie-rod']:[],
      note:key==='center-left-nut'?'Check the hardware packaged with the steering center link.'
        :key==='tie-rod'&&!e30?'The sleeve is supplied with the complete outer tie rod.'
        :key==='tie-outer'&&!e30?'Match thread direction and the existing joint before ordering.':undefined,
      supplied:key==='center-left-nut'||(key==='tie-rod'&&!e30)||key.startsWith('tie-clamp'),confirmed:!(
        key==='center-left-nut'||key==='steering-rack'||(!e30&&['tie-rod','tie-outer','tie-inner'].includes(key)))};
  }
  const number=key==='drop-link-fastener'?'07129964672':key==='drop-link'?'31351091764':'31351130850';
  return {ref:assemblies.bar,numbers:[number],manual:[link],guides:e30?['e30-front-stabilizer']:[],confirmed:true};
}
function writePart(side,key,label,point,draw,rotation){
  const id=idFor(side,key);
  const steering=/^(tie-|rack-|steering-|center-|lever-)/.test(key);
  const data=assets.get(!e30&&steering?'rods':'main');
  const previous=nodes.get(id);
  if(previous?.assetId) {
    assert.equal(previous.assetId,data.asset.id,id);
    for(const name of previous.meshNames){
      const old=data.scene.getObjectByName(name);
      assert(old?.parent,name);
      old.removeFromParent();
    }
  }
  const group=new Group();
  group.name='frontService_'+id.replace(/[^a-z0-9]/gi,'_');
  draw(group);
  compactPart(group);
  const bounds=new Box3().setFromObject(group,true);
  assert(!bounds.isEmpty(),id);
  data.scene.add(group);

  const spec=references(key,side);
  const positions=spec.numbers.map(number=>{
    const row=pages.get(spec.ref.id).find(i=>i.number===number);
    assert(row,id+' missing catalog row '+number);
    return {assemblyId:spec.ref.id,id:row.id,number:row.number,partId:row.partId};
  });
  const candidate=positions[0];
  const fullTitle=(side==='axle'?'':side==='left'?'Left ':'Right ')+(side==='axle'?label:label[0].toLowerCase()+label.slice(1));
  const corner=e30?'e30assembly:front-'+side:'e34sys:suspension';
  const parentId=previous?.parentId??(key.startsWith('center-')?'e34sys:center-drag-link':side==='axle'?(e30?'e30assembly:front-axle':'e34sys:steering'):corner);
  assert(nodes.has(parentId),id+' missing parent '+parentId);
  const systemIds=[...new Set([...commonScopes,...(previous?.systemIds??[]),...(steering?[steeringScope]:[])])];
  nodes.set(id,{...previous,id,parentId,name:fullTitle,kind:'part',assetId:data.asset.id,meshNames:[group.name],
    systemIds,matrix:placement(point,rotation).toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
    displayDirection:[side==='axle'?.18:0,.12,side==='left'?-.35:side==='right'?.35:0],
    guideIds:spec.guides,internal:false,canonicalId:spec.confirmed&&!spec.supplied?candidate?.partId??null:null,
    oem:spec.confirmed&&!spec.supplied?candidate?.number??null:null,thumbnail:null,
    sourceContext:candidate?{contextId:catalog.context.id,assemblyId:spec.ref.id,positionId:candidate.id}:undefined});
  catalog.bindings[id]={nodeId:id,title:fullTitle,kind:spec.supplied?'supplied-with':candidate&&spec.confirmed?'component':'reference',
    assemblyIds:[spec.ref.id],positions,guideIds:spec.guides,manual:spec.manual,note:spec.note??'',
    visualSources:[{title:'BMW '+spec.ref.title,url:spec.ref.sourceUrl}]};
}

for(const side of ['left','right']){
  const fit=buildFrontCorner(series,side,(...args)=>writePart(side,...args));
  const strutNode=nodes.get(idFor(side,'strut'));
  const springNode=nodes.get(idFor(side,'spring'));
  const shaft=nodes.get(idFor(side,'damper'));
  const holeAxis=new Vector3(...fit.axis);
  for(const node of [springNode,shaft]){
    const offAxis=new Vector3().fromArray(node.matrix,12).sub(new Vector3(...fit.spindle)).cross(holeAxis);
    assert(offAxis.length()<.0001,node.id+' centered on damper shaft');
  }
  assert(fit.lowerSeat<fit.upperSeat&&fit.upperSeat<fit.length,strutNode.id+' spring seats');
  const wheel=nodes.get(e30?idFor(side,'wheel'):'wheel:front-'+side);
  wheel.systemIds=[...new Set([...wheel.systemIds,serviceScope])];
}
if(e30)buildE30Rack((...args)=>writePart('axle',...args));
else buildE34CenterLink((...args)=>writePart('axle',...args));

model.nodes=[...nodes.values()];
model.revision=catalog.modelRevision=revision;
catalog.coverage.renderable=model.nodes.filter(n=>n.assetId).length;
catalog.coverage.bound=Object.values(catalog.bindings).filter(b=>b.assemblyIds.length).length;
catalog.coverage.withCandidates=Object.values(catalog.bindings).filter(b=>b.positions.length).length;

const written=[];
for(const {asset,scene} of assets.values()){
  const glb=Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true}));
  const bytes=await compressGeometryGlb(glb);
  const digest=sha(bytes);
  Object.assign(asset,{url:prefix+digest+'.glb',bytes:bytes.length,sha256:digest});
  written.push({url:asset.url,file:nameOf(asset.url),sha256:digest,bytes});
}
const assetBytes=model.assets.reduce((sum,a)=>sum+a.bytes,0);
const {parseReference}=await localReferenceTools();
try{parseReference(model);}catch(error){console.error(error.message,'Asset bytes:',assetBytes,model.assets.map(a=>[a.id,a.bytes]));process.exit(1);}
const bytes=Buffer.from(JSON.stringify(model));
const digest=sha(bytes);
const next={...release,revision,sha256:digest,manifestUrl:prefix+'manifest.'+digest+'.json',renderableCount:catalog.coverage.renderable,assetBytes};
written.push({url:next.manifestUrl,file:nameOf(next.manifestUrl),sha256:digest,bytes});
for(const entry of written)await immutable(diskPath(entry.url),entry.bytes);
const {archives:baseArchives,...earlier}=base;
const prior=[earlier,...archives.filter(a=>releaseOf(a).revision!==release.revision)];
await replaceJson(receiptPath,e30?{...next,archives:prior}:{
  release:next,files:written.map(({bytes,...entry})=>entry),archives:prior,
});
console.log(series.toUpperCase()+' r'+revision+' · '+assetBytes+' bytes · spring seats and damper alignment verified');
