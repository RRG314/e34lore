import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Matrix4, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { siteContent } from '../scripts/site-content.mjs';
import { compressGeometryGlb } from './geometry/compress-glb.mjs';
import { buildFanService, fanFit } from './geometry/fan-service.mjs';
import { paint } from './generations/e30-325i-exterior.mjs';
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
const dir=e30?'work/e30/getrag-service':'work/525i-service-candidate';
const receiptPath=dir+'/'+(e30?'review.json':'fit-review.json');
const current=await readJson(receiptPath), archives=current.archives??[];
const pinOf=entry=>entry.release??entry;
const base=[current,...archives].find(entry=>pinOf(entry).revision===(e30?1195:1050));
assert(base,'Build the front axle service reference first.');
const pin=pinOf(base), revision=pin.revision+1;
const diskPath=url=>dir+(e30?url:'/'+nameOf(url));
const prefix='/models/'+series+'-lore/r'+revision+'/';

async function verified(path,digest){
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
const ids={
  radiator:e30?'e30assembly:radiator-pack:radiator':'e34sys:radiator',
  fan:e30?'e30assembly:radiator-pack:fan':'e34sys:engine-cooling-fan',
  coupling:e30?'e30assembly:radiator-pack:fan-coupling':'e34sys:fan-coupling',
  shroud:e30?'e30assembly:radiator-pack:shroud':'e34sys:fan-shroud',
  'radiator-support':'e30assembly:engine-bay:radiator-support',
};
const suffix=a=>a.key.split('/').at(-1).replace(/\.html$/,'');
const select=key=>{
  const item=Object.values(catalog.assemblies).find(a=>suffix(a)===key);
  assert(item,key);
  return item;
};
const fanPage=select('cooling_system_fan_fan_coupling');
const cowlPage=select(e30?'radiator_frame':'fan_shroud');
const pages=new Map();
for(const a of [fanPage,cowlPage])pages.set(a.id,JSON.parse(await verified(content.publicDir+a.url,a.sha256)).items);
const loc=e30?{chapter:'17',page:333,pdf:333,printed:'17-7',title:'BMW 17 11 000 · Six-cylinder fan cowl',guides:[],href:'/e30/manual/17?pdf=333'}
  :{chapter:'170',page:216,pdf:216,printed:'170-12',title:'Bentley · Cooling fan and shroud',guides:[],href:'/manual/170?pdf=216#job-mechanical-cooling-fan-replacement'};
const numbers={
  fan:[e30?'11521723363':'11521712058'],
  coupling:e30?['11521740962','11521466000','11521723918']:['11521719269','11521740963','11527505302'],
  shroud:[e30?'17111709312':'17111712686'],
};
buildFanService(series,(key,label,point,draw)=>{
  const id=ids[key]??series+'cooling:'+key;
  const previous=nodes.get(id);
  if(previous?.assetId===asset.id)for(const name of previous.meshNames){
    const old=scene.getObjectByName(name);assert(old?.parent,name);old.removeFromParent();
  }
  const group=new Group();
  group.name='service_'+id.replace(/[^a-z0-9]/gi,'_');
  draw(group);
  compactPart(group);
  scene.add(group);
  const bounds=new Box3().setFromObject(group,true);
  const hardware=key.startsWith('fan-screw-'),clip=key.startsWith('shroud-rivet-'),support=key==='radiator-support';
  const page=key==='shroud'||clip||support?cowlPage:fanPage;
  const candidates=numbers[key]??(hardware?['07129905536','07119901438']:clip?['17111712963']:[]);
  const positions=candidates.map(number=>{
    const row=pages.get(page.id).find(i=>i.number===number);
    assert(row,number);
    return {assemblyId:page.id,id:row.id,number:row.number,partId:row.partId};
  });
  const selected=positions.length===1?positions[0]:undefined;
  const parentId=hardware?ids.fan:clip?ids.shroud:previous?.parentId??ids.radiator;
  nodes.set(id,{...previous,id,name:label,kind:'part',parentId,assetId:asset.id,meshNames:[group.name],
    matrix:new Matrix4().setPosition(...point).toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
    systemIds:support?['system:engine-bay']:['system:cooling','system:engine-bay'],
    displayDirection:[.23,.24,clip?.08:-.14],internal:false,guideIds:[],
    oem:selected?.number??null,canonicalId:selected?.partId??null,thumbnail:null,
    sourceContext:selected?{contextId:catalog.context.id,assemblyId:page.id,positionId:selected.id}:undefined});
  catalog.bindings[id]={nodeId:id,title:label,kind:selected?'component':'reference',
    assemblyIds:[page.id],positions,guideIds:[],manual:[loc],
    note:key==='coupling'?'Compare the installed clutch and supplier entry. The threaded coupling has a left-hand nut.'
      :hardware?'Four M6 × 16 mm fasteners shown. Verify the drive shape and washers on the installed clutch.':'',
    visualSources:[{title:'BMW '+page.title,url:page.sourceUrl}]};
},paint);

const fan=nodes.get(ids.fan), shroud=nodes.get(ids.shroud);
const fit=fanFit[series];
assert.equal(fan.matrix[13],shroud.matrix[13],'Fan and shroud vertical alignment');
assert.equal(fan.matrix[14],shroud.matrix[14],'Fan and shroud lateral alignment');
const fanBounds=new Box3(new Vector3(...fan.bounds.min),new Vector3(...fan.bounds.max));
assert(Math.abs(fanBounds.getSize(new Vector3()).y-2*fit.radius)<.010,'Fan diameter');

const glb=Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true}));
const bytes=await compressGeometryGlb(glb), digest=sha(bytes);
Object.assign(asset,{url:prefix+digest+'.glb',bytes:bytes.length,sha256:digest});
model.nodes=[...nodes.values()];
model.revision=catalog.modelRevision=revision;
catalog.coverage.renderable=model.nodes.filter(n=>n.assetId).length;
catalog.coverage.bound=Object.values(catalog.bindings).filter(b=>b.assemblyIds.length).length;
catalog.coverage.withCandidates=Object.values(catalog.bindings).filter(b=>b.positions.length).length;
const assetBytes=model.assets.reduce((sum,a)=>sum+a.bytes,0);
const {parseReference}=await localReferenceTools();
try{parseReference(model);}catch(error){console.error(error.message,'Asset bytes:',assetBytes);process.exit(1);}
const manifest=Buffer.from(JSON.stringify(model)), sha256=sha(manifest);
const next={...pin,revision,sha256,manifestUrl:prefix+'manifest.'+sha256+'.json',
  renderableCount:catalog.coverage.renderable,assetBytes};
await immutable(diskPath(asset.url),bytes);
await immutable(diskPath(next.manifestUrl),manifest);
const {archives:older,...earlier}=base;
const prior=[earlier,...archives.filter(entry=>pinOf(entry).revision!==pin.revision)];
await replaceJson(receiptPath,e30?{...next,archives:prior}:{release:next,archives:prior,files:[
  {url:asset.url,file:nameOf(asset.url),sha256:digest},
  {url:next.manifestUrl,file:nameOf(next.manifestUrl),sha256},
]});
console.log(series+' r'+revision+' · '+assetBytes+' bytes');
