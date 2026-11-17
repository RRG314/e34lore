import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Matrix4, Raycaster, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { siteContent } from '../../scripts/site-content.mjs';
import { compactPart } from '../geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from '../geometry/compress-glb.mjs';
import { immutable, localReferenceTools, readJson, replaceJson, sha } from '../geometry/local-reference-review.mjs';
import { buildE30FrontBrakes, upperGuide } from './e30-325i-front-brakes.mjs';

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};

const content = siteContent();
assert(content.release,'Set E34_ASSET_PACK to the retained Workshop asset pack.');
const directory = 'work/e30/getrag-service';
const receiptPath = directory+'/review.json';
const { archives = [], ...active } = await readJson(receiptPath);
const base = active.revision===1192 ? active : archives.find(entry=>entry.revision===1192);
assert(base && base.id==='e30-325i-coupe-manual','Build the E30 Getrag and body reference first.');
const revision = 1193;
const prefix = '/models/e30-lore/r'+revision+'/';

async function checked(file,digest) {
  const bytes=await fs.readFile(file);
  assert.equal(sha(bytes),digest,file);
  return bytes;
}

const model = JSON.parse(await checked(directory+base.manifestUrl,base.sha256));
const catalog = model.catalog;
const nodes = new Map(model.nodes.map(node=>[node.id,node]));
const byKey = new Map(Object.values(catalog.assemblies).map(assembly=>[assembly.key.replace(/\.html$/,''),assembly]));
const discAssembly = byKey.get('front_brake_brake_disc');
const caliperAssembly = byKey.get('front_wheel_brake_brake_pad_sensor');
const hubAssembly = byKey.get('wheel_bearings');
const pages = new Map();
for(const assembly of [discAssembly,caliperAssembly,hubAssembly]) {
  pages.set(assembly.id,JSON.parse(await checked(content.publicDir+assembly.url,assembly.sha256)));
}
const asset = model.assets.find(entry=>entry.id==='e30:325i-mechanical');
const original = await checked(content.publicDir+asset.url,asset.sha256);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const { scene } = await loader.parseAsync(Uint8Array.from(original).buffer,'');
const scope = 'system:front-brakes';
const systemIds = ['system:braking','system:front-suspension','system:suspension',scope];
const guideId = 'e30-front-brake-pads-discs';
const groupId = 'e30assembly:front-';
const manual = (page,title)=>({chapter:'34',page,pdf:page,printed:'34-'+(page-639),
  title,href:'/e30/manual/34?pdf='+page,guides:[guideId]});
const padManual = manual(643,'BMW 34 11 000 · Front pads and Girling caliper');
const discManual = manual(644,'BMW 34 11 220 · Front discs');
nodes.set(scope,{id:scope,name:'Front brakes',parentId:'system:braking',kind:'system',systemIds:[],
  assetId:null,meshNames:[],matrix:new Matrix4().toArray(),bounds:null,internal:false,
  canonicalId:null,oem:null,guideIds:[],thumbnail:null});

const parts = new Map([
  ['rotor',[discAssembly,'34111160915','02']],
  ['disc-screw',[discAssembly,'34111123072']],
  ['hub',[hubAssembly,'31211131297','01']],
  ['carrier',[caliperAssembly,'34111158451','02']],
  ['pad-inner',[caliperAssembly,'34111162481','11']],
  ['pad-outer',[caliperAssembly,'34111162481','11']],
  ['wear-sensor',[caliperAssembly,'34359058889','07']],
  ...['lower','upper'].flatMap(end=>[
    ['guide-bolt-'+end,[caliperAssembly,'34111154445','06']],
    ['guide-pin-'+end,[caliperAssembly,'34111161936','10']],
    ['guide-boot-'+end,[caliperAssembly,'34111161936','10']],
    ['carrier-bolt-'+end,[caliperAssembly,'34111118948','03']],
  ]),
]);
const referenceNumbers = {
  left:{caliper:'34111154379',shield:'34111154241'},
  right:{caliper:'34111154380',shield:'34111154242'},
};

buildE30FrontBrakes((key,label,draw,anchor=[0,0,0])=>{
  const meshName='e30_325i_front_brake_'+key.replaceAll('-','_');
  const geometry=new Group();
  geometry.name=meshName;
  draw(geometry);
  for(const child of geometry.children) child.position.sub(new Vector3(...anchor));
  compactPart(geometry);
  scene.add(geometry);
  const bounds=new Box3().setFromObject(geometry,true);
  assert(!bounds.isEmpty(),key);
  for(const [side,sign] of [['left',-1],['right',1]]) {
    if (side==='right' && key==='wear-sensor') continue;
    const prefix = groupId+side+':';
    const id = prefix+key;
    const previous=nodes.get(id);
    if(previous) {
      const old=scene.getObjectByName(previous.meshNames[0]);
      assert(old?.parent,id);
      old.removeFromParent();
    }
    const wheel=nodes.get(prefix+'wheel');
    if(!wheel.systemIds.includes(scope))wheel.systemIds=[...wheel.systemIds,scope];
    const [x,y,z]=wheel.matrix.slice(12,15);
    const matrix=new Matrix4().makeScale(1,1,sign).setPosition(x+anchor[0],y+anchor[1],z+sign*anchor[2]);
    const choice=parts.get(key) ?? [key==='shield'?discAssembly:caliperAssembly,referenceNumbers[side][key]];
    const [assembly,number,position]=choice;
    const item=pages.get(assembly.id).items.find(entry=>entry.number===number&&(!position||entry.reference===position));
    assert(item,id+' has no matching catalog position for '+number);
    const name=(side==='left'?'Left':'Right')+' front '+label;
    const guideIds=[...new Set([...(previous?.guideIds ?? []),guideId])];
    const parentId=key.startsWith('guide-')||key.startsWith('carrier-bolt-')?prefix+'carrier'
      : key==='disc-screw'?prefix+'rotor':groupId+side;
    nodes.set(id,{...previous,id,parentId,name,kind:'part',systemIds,assetId:asset.id,meshNames:[meshName],
      matrix:matrix.toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
      displayDirection:previous?.displayDirection??[0,.15,sign*.46],internal:false,
      canonicalId:item.partId,oem:number,guideIds,thumbnail:null,
      sourceContext:{contextId:catalog.context.id,assemblyId:assembly.id,positionId:item.id}});
    const suppliedWith=key.startsWith('pad-')||key.startsWith('guide-pin')||key.startsWith('guide-boot');
    const positions=[{assemblyId:assembly.id,id:item.id,number,partId:item.partId}];
    if (key==='rotor') {
      const alternative=pages.get(assembly.id).items.find(row=>row.number==='34116752352');
      if(alternative)positions.push({assemblyId:assembly.id,id:alternative.id,number:alternative.number,partId:alternative.partId});
    }
    catalog.bindings[id]={
      nodeId:id,title:name,kind:suppliedWith?'supplied-with':'component',
      note:key.startsWith('pad-')?'Supplied as an axle set. This is the Girling catalog callout.'
        : key.startsWith('guide-pin')||key.startsWith('guide-boot')?'Included in the Girling guide bush repair kit.'
        : key==='caliper'?'Girling housing with a 48 mm piston. Confirm the maker on the installed caliper.':'',
      assemblyIds:[assembly.id],positions,guideIds,
      manual:assembly===discAssembly?[discManual]:[padManual,discManual],
      visualSources:[{title:'BMW '+assembly.title,url:assembly.sourceUrl},
        ...(key==='rotor'?[{title:'Brembo 09.4883.10 · Disc drawing and dimensions',
          url:'https://www.bremboparts.com/america/en/view-document/catalogue/disc/09-4883-10'}]:[]),
        ...(key==='caliper'?[{title:'BMW Girling front brake diagram',
          url:'https://www.realoem.com/bmw/enUS/showparts?diagId=34_0046&id=1413-USA---E30-BMW-325i'}]:[])],
    };
  }
});

const rotor=scene.getObjectByName('e30_325i_front_brake_rotor');
const box=new Box3().setFromObject(rotor,true);
assert(Math.abs(box.max.x-box.min.x-.260)<.00012,'Rotor overall diameter');
assert(Math.abs(box.max.z-box.min.z-.0351)<.00012,'Rotor overall height');
const through=(x,y)=>new Raycaster(new Vector3(x,y,.060),new Vector3(0,0,-1),0,.014)
  .intersectObject(rotor,true).length;
for(const [x,y] of [[0,0],[.050,0],[-.050,0],[0,.050],[0,-.050],[.049/Math.sqrt(2),.049/Math.sqrt(2)]]) {
  assert.equal(through(x,y),0,'Pilot, lug and disc screw must clear their holes');
}
assert(through(.040,0)>0,'Rotor mating face must be present');
for(const [side,sign] of [['left',-1],['right',1]]) {
  const prefix=groupId+side+':';
  const wheel=nodes.get(prefix+'wheel').matrix.slice(12,15);
  const caliper=nodes.get(prefix+'caliper').matrix.slice(12,15);
  assert.deepEqual(caliper,[wheel[0]+upperGuide[0],wheel[1]+upperGuide[1],wheel[2]+sign*upperGuide[2]],
    'Caliper pivot must sit on the upper guide axis');
}

const bytes=await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true})));
const digest=sha(bytes);
Object.assign(asset,{url:prefix+digest+'.glb',bytes:bytes.length,sha256:digest});
model.nodes=[...nodes.values()];
model.revision=catalog.modelRevision=revision;
catalog.coverage.renderable=model.nodes.filter(node=>node.assetId).length;
catalog.coverage.bound=Object.values(catalog.bindings).filter(binding=>binding.assemblyIds.length).length;
catalog.coverage.withCandidates=Object.values(catalog.bindings).filter(binding=>binding.positions.length).length;
const {parseReference}=await localReferenceTools();
try { parseReference(model); }
catch(error) {
  console.error(error.message,'Total model bytes:',model.assets.reduce((total,entry)=>total+entry.bytes,0));
  process.exit(1);
}

const manifest=Buffer.from(JSON.stringify(model));
const sha256=sha(manifest);
const release={...base,revision,sha256,manifestUrl:prefix+'manifest.'+sha256+'.json',
  renderableCount:catalog.coverage.renderable,assetBytes:model.assets.reduce((total,entry)=>total+entry.bytes,0)};
await immutable(directory+asset.url,bytes);
await immutable(directory+release.manifestUrl,manifest);
await replaceJson(receiptPath,{...release,archives:[base]});
console.log('Built E30 revision '+revision+' · '+release.assetBytes+' bytes · front brake geometry and guide pivot verified');
