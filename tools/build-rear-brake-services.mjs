import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Box3,Group,Matrix4,Raycaster,Vector3} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {siteContent} from '../scripts/site-content.mjs';
import {compactPart} from './geometry/local-cabin-glb.mjs';
import {compressGeometryGlb} from './geometry/compress-glb.mjs';
import {immutable,localReferenceTools,nameOf,readJson,replaceJson,sha} from './geometry/local-reference-review.mjs';
import {buildRearBrakes,rearBoltLocations,rearBrakeDimensions} from './geometry/rear-brakes.mjs';

globalThis.FileReader=class {
  async readAsArrayBuffer(blob){
    this.result=await blob.arrayBuffer();
    this.onloadend?.();
  }
};

const options={
  e30:{
    directory:'work/e30/getrag-service',receipt:'review.json',base:1193,revision:1194,asset:'e30:325i-mechanical',
    disc:['34216755408','34216755407'],caliper:['34211160397','34211160398'],
    shield:['34211162061','34211162062'],carrier:'34211160396',carrierBolt:'34211153937',
    pad:'34211158912',clip:'34211153199',sensor:'34351179819',hub:'33411131121',
    shoe:'34411159467',springs:['34411102308','34411121900'],holders:'34406751588',
    adjuster:'34416851438',size:'258 × 10 mm',rotorSource:'https://www.bremboparts.com/america/en/catalogue/disc/08-3947-24',
  },
  e34:{
    directory:'work/525i-service-candidate',receipt:'fit-review.json',base:1048,revision:1049,asset:'authored:525i-visual-detail',
    disc:['34216756537','34211162305'],caliper:['34211160381','34211160382'],
    shield:['34211159933','34211159934'],carrier:'34211160383',carrierBolt:'34203414763',
    pad:'34211162536',clip:'34211157046',sensor:'34351179820',hub:'33411132849',
    shoe:'34416761294',springs:['34410304724','34410304724'],holders:'34410304724',
    adjuster:'34416851437',size:'300 × 10 mm',rotorSource:'https://www.bremboparts.com/europe/ro/catalogue/disc/08-5174-34/pdf',
  },
};
const series=process.argv[2];
const config=options[series];
assert(config,'Use e30 or e34 as the target.');
const e30=series==='e30';
const content=siteContent();
assert(content.release,'Set E34_ASSET_PACK to the retained Workshop asset pack.');
const receiptPath=config.directory+'/'+config.receipt;
const current=await readJson(receiptPath);
const archives=current.archives??[];
const releaseOf=entry=>entry.release??entry;
const base=[current,...archives].find(entry=>releaseOf(entry).revision===config.base);
assert(base,'Build the front brake reference first.');
const release=releaseOf(base);
const diskPath=url=>config.directory+(e30?url:'/'+nameOf(url));
const prefix='/models/'+series+'-lore/r'+config.revision+'/';

async function verified(path,digest){
  const bytes=await fs.readFile(path);
  assert.equal(sha(bytes),digest,path);
  return bytes;
}
const model=JSON.parse(await verified(diskPath(release.manifestUrl),release.sha256));
const catalog=model.catalog;
const nodes=new Map(model.nodes.map(node=>[node.id,node]));
const byKey=new Map(Object.values(catalog.assemblies).map(a=>[a.key.split('/').at(-1).replace(/\.html$/,''),a]));
const caliperCatalog=byKey.get('rear_wheel_brake_brake_pad_sensor');
const parkCatalog=byKey.get('parking_brake_brake_shoes');
const wheelCatalog=byKey.get('side_shaft_wheel_bearings');
const pages=new Map();
for(const catalogEntry of [caliperCatalog,parkCatalog,wheelCatalog]){
  assert(catalogEntry,'Missing rear brake catalog assembly');
  pages.set(catalogEntry.id,JSON.parse(await verified(content.publicDir+catalogEntry.url,catalogEntry.sha256)).items);
}

const asset=model.assets.find(a=>a.id===config.asset);
const original=await verified(diskPath(asset.url),asset.sha256);
const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(Uint8Array.from(original).buffer,'');
const scope='system:rear-brakes';
const systemIds=['system:braking','system:suspension','system:rear-suspension',scope];
const parking='system:parking-brakes';
function system(id,name,parentId){
  if(!nodes.has(id))nodes.set(id,{id,name,parentId,kind:'system',systemIds:[],assetId:null,
    meshNames:[],matrix:new Matrix4().toArray(),bounds:null,internal:false,canonicalId:null,oem:null,guideIds:[],thumbnail:null});
}
system(scope,'Rear brakes','system:braking');
system(parking,'Parking brakes','system:braking');
for(const side of ['left','right'])system('system:parking-brake-'+side,
  (side==='left'?'Left':'Right')+' parking brake',parking);

const padGuide=e30?'e30-rear-brake-pads-discs':'factory-sliding-caliper-brake-pads';
const shoeGuide=e30?['e30-parking-brake-shoes']:[];
const manual=(page,printed,title,anchor,guides=[])=>({
  chapter:e30?'34':'340',page,pdf:page,printed,title,guides,
  href:e30?'/e30/manual/34?pdf='+page:'/manual/340?pdf='+page+'#'+anchor,
});
const pads=e30?manual(647,'34-8','BMW 34 21 200 · Rear brake pads',null,[padGuide])
  : manual(320,'340-4','Bentley · Rear pad service and guide bolts','job-brake-pad-replacement',[padGuide]);
const rotor=e30?manual(649,'34-9','BMW 34 21 320 · Rear brake discs',null,[padGuide])
  : manual(323,'340-7','Bentley · Rear rotor and parking brake','job-rotor-removal-and-runout-checks',[padGuide]);
const shoes=e30?manual(660,'34-17','BMW 34 41 200 · Parking brake shoes',null,shoeGuide)
  : manual(327,'340-11','Bentley · Parking brake shoes','job-parking-brake-shoes');
const adjustment=e30?manual(642,'34-3','BMW 34 10 014 · Parking brake adjustment',null,['e30-handbrake-adjustment'])
  : manual(326,'340-10','Bentley · Parking brake adjustment','job-brake-pedal-and-parking-brake-adjustment');

const idsFor=(side,key)=>{
  if(e30)return 'e30assembly:rear-'+side+':'+key;
  const suffix=side==='left'?'1':'-1';
  const stable={rotor:'brake-disc-rear',caliper:'brake-caliper-rear','pad-outer':'brake-pad-rear',
    hub:'hub-rear',shield:'brake-shield-rear','shoe-forward':'parking-brake-shoes'};
  if(stable[key])return 'e34sys:'+stable[key]+'-'+suffix;
  const parkingKeys={'hold-forward':'hold-downs','return-upper':'return-springs',expander:'expanding-lock',adjuster:'adjuster'};
  if(parkingKeys[key])return 'e34brake:parking-'+side+'-'+parkingKeys[key];
  return 'e34brake:rear-'+side+'-'+key;
};

const parkingPart=key=>/^(shoe-|hold-|return-|adjuster$|expander$)/.test(key);
function partRows(key,side){
  if(key==='rotor')return [caliperCatalog,config.disc];
  if(key==='hub')return [wheelCatalog,[config.hub]];
  const directional=side==='left'?0:1;
  if(key==='caliper'||key==='shield')return [caliperCatalog,[config[key][directional]]];
  if(parkingPart(key)){
    const number=key.startsWith('shoe-')?config.shoe:key.startsWith('hold-')?config.holders
      : key.startsWith('return-')?config.springs[key.endsWith('upper')?0:1]
      : key==='adjuster'?config.adjuster:'34416868624';
    const old=key==='adjuster'?(e30?'34411100550':'34411163400'):key==='expander'?'34411163709':null;
    return [parkCatalog,old?[number,old]:[number]];
  }
  const number=key.startsWith('pad-') && key!=='pad-spring'?config.pad
    : key.startsWith('carrier-bolt-')?config.carrierBolt
    : key.startsWith('guide-')?'34111157041':key.startsWith('cap-')?'34111154979'
    : {'disc-screw':'34111123072',carrier:config.carrier,'pad-spring':config.clip,'wear-sensor':config.sensor}[key];
  return [caliperCatalog,[number]];
}

buildRearBrakes(series,(key,label,draw,anchor=[0,0,0])=>{
  if(key==='rotor')label=config.size+' solid rotor and parking brake drum';
  const name='rear_'+key.replaceAll('-','_');
  const mesh=new Group();
  mesh.name=name;
  const lateralDirection=draw(mesh)??1;
  const pivot=new Vector3(...anchor);
  for(const child of mesh.children)child.position.sub(pivot);
  compactPart(mesh);
  scene.add(mesh);
  const bounds=new Box3().setFromObject(mesh,true);
  assert(!bounds.isEmpty(),key);
  for(const [side,sign] of [['left',-1],['right',1]]){
    if(key==='wear-sensor'&&side==='left')continue;
    const id=idsFor(side,key);
    const previous=nodes.get(id);
    if(previous?.assetId===asset.id){
      const old=scene.getObjectByName(previous.meshNames[0]);
      assert(old?.parent,id);
      old.removeFromParent();
    }
    const wheel=nodes.get(e30?'e30assembly:rear-'+side+':wheel':'wheel:rear-'+side);
    wheel.systemIds=[...new Set([...wheel.systemIds,scope])];
    const [x,y,z]=wheel.matrix.slice(12,15);
    const [assembly,numbers]=partRows(key,side);
    const positions=numbers.map(number=>{
      const item=pages.get(assembly.id).find(row=>row.number===number);
      assert(item,id+' has no catalog occurrence for '+number);
      return {assemblyId:assembly.id,id:item.id,number:item.number,partId:item.partId};
    });
    const component=label.replace(/^(Right )?Rear /i,'');
    const partName=component.startsWith('ATE')?component:component[0].toLowerCase()+component.slice(1);
    const fullName=(side==='left'?'Left':'Right')+' rear '+partName;
    const contextual=parkingPart(key)||key==='hub'||key==='shield';
    const guideIds=parkingPart(key)?shoeGuide:[padGuide];
    const parentId=key==='hub'?(e30?'e30assembly:rear-'+side:'e34sys:braking')
      : /^(guide-|cap-)/.test(key)?idsFor(side,'caliper'):idsFor(side,'hub');
    const isKit=key.startsWith('shoe-')||key.startsWith('return-')||key.startsWith('hold-')||
      (key.startsWith('pad-')&&key!=='pad-spring');
    const marketCondition=!e30&&key.startsWith('shoe-');
    const primary=positions[0];
    nodes.set(id,{...previous,id,parentId,name:fullName,kind:'part',assetId:asset.id,meshNames:[name],
      systemIds:contextual?[...systemIds,parking,'system:parking-brake-'+side]:systemIds,
      matrix:new Matrix4().makeScale(lateralDirection,1,sign).setPosition(x+anchor[0],y+anchor[1],z+sign*anchor[2]).toArray(),
      bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},displayDirection:[0,.15,sign*.43],
      guideIds,internal:false,canonicalId:marketCondition?null:primary.partId,
      oem:marketCondition?null:primary.number,thumbnail:null,
      sourceContext:{contextId:catalog.context.id,assemblyId:assembly.id,positionId:primary.id}});
    catalog.bindings[id]={
      nodeId:id,title:fullName,kind:isKit?'supplied-with':'component',assemblyIds:[assembly.id],positions,guideIds,
      manual:parkingPart(key)?[shoes,adjustment]:key.startsWith('disc')||key==='rotor'?[rotor]:[pads,rotor],
      note:marketCondition?'This shoe-kit listing carries a Great Britain equipment condition. Check the installed shoes and the vehicle catalog before ordering.'
        : key.startsWith('shoe-')?'The shoes are supplied in an axle set.'
        : key.startsWith('hold-')||key.startsWith('return-')?'Match the retainer or spring to its location in the diagram.':'',
      visualSources:[{title:'BMW '+assembly.title,url:assembly.sourceUrl},
        ...(key==='rotor'?[{title:'Brembo · Rear rotor dimensions',url:config.rotorSource}]:[])],
    };
  }
});

const disc=scene.getObjectByName('rear_rotor');
const dims=rearBrakeDimensions[series];
const bounds=new Box3().setFromObject(disc,true);
assert(Math.abs(bounds.max.x-bounds.min.x-dims.diameter)<.0002,'Rotor diameter');
assert(Math.abs(bounds.max.z-bounds.min.z-dims.height)<.0002,'Rotor and drum depth');
const holes=rearBoltLocations(dims);
function rays(x,y,depth){
  return new Raycaster(new Vector3(x,y,dims.mount+.005),new Vector3(0,0,-1),0,depth)
    .intersectObject(disc,true);
}
for(const [x,y] of [[0,0],...holes.lug,holes.screw]) assert.equal(rays(x,y,.017).length,0,'Rotor hole is obstructed');
assert(rays(dims.bore/2+.004,0,.014).length>0,'Rotor mating face is missing');
const shoeRadius=dims.drum/2-.00065;
for(const end of ['forward','rearward']){
  const mesh=scene.getObjectByName('rear_shoe_'+end);
  mesh.updateMatrixWorld(true);
  mesh.traverse(o=>{
    if(!o.isMesh) return;
    const vertices=o.geometry.getAttribute('position');
    for(let i=0;i<vertices.count;i++)
      assert(Math.hypot(vertices.getX(i),vertices.getY(i))<=shoeRadius+.001,'Shoe geometry does not fit inside the drum');
  });
}

const bytes=await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true})));
const digest=sha(bytes);
Object.assign(asset,{url:prefix+digest+'.glb',bytes:bytes.length,sha256:digest});
model.nodes=[...nodes.values()];
model.revision=catalog.modelRevision=config.revision;
catalog.coverage.renderable=model.nodes.filter(node=>node.assetId).length;
catalog.coverage.bound=Object.values(catalog.bindings).filter(binding=>binding.assemblyIds.length).length;
catalog.coverage.withCandidates=Object.values(catalog.bindings).filter(binding=>binding.positions.length).length;
const assetBytes=model.assets.reduce((sum,entry)=>sum+entry.bytes,0);
const {parseReference}=await localReferenceTools();
try{parseReference(model);}catch(error){console.error(error.message,'Asset bytes:',assetBytes);process.exit(1);}
const buffer=Buffer.from(JSON.stringify(model));
const sha256=sha(buffer);
const next={...release,revision:config.revision,sha256,manifestUrl:prefix+'manifest.'+sha256+'.json',
  renderableCount:catalog.coverage.renderable,assetBytes};
if(e30){
  const {archives:earlier,...earlierRelease}=base;
  await immutable(diskPath(asset.url),bytes);
  await immutable(diskPath(next.manifestUrl),buffer);
  const pins=[earlierRelease,...archives.filter(entry=>entry.revision!==earlierRelease.revision)];
  await replaceJson(receiptPath,{...next,archives:pins});
}else{
  const {archives:earlier,...earlierReceipt}=base;
  const files=[{url:asset.url,file:nameOf(asset.url),sha256:digest},{url:next.manifestUrl,file:nameOf(next.manifestUrl),sha256}];
  await immutable(diskPath(asset.url),bytes);
  await immutable(diskPath(next.manifestUrl),buffer);
  const receipts=[earlierReceipt,...archives.filter(entry=>entry.release.revision!==earlierReceipt.release.revision)];
  await replaceJson(receiptPath,{release:next,files,archives:receipts});
}
console.log('Built '+series.toUpperCase()+' r'+config.revision+' · '+assetBytes+' bytes · verified rotor holes, depth and shoe clearance');
