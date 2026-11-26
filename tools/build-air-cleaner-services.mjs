/** Fit the serviceable air cleaner to the current local Workshop references. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Matrix4, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { siteContent } from '../scripts/site-content.mjs';
import { compactPart } from './geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from './geometry/compress-glb.mjs';
import { airCleanerDatums, drawAirbox, drawAirboxClip, drawAirFilter, drawE30AirboxLid, drawE30IntakeFunnel } from './geometry/air-cleaner-service.mjs';
import { immutable, localReferenceTools, nameOf, readJson, replaceJson, sha } from './geometry/local-reference-review.mjs';

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
};

const series = process.argv[2];
assert(series==='e30'||series==='e34','Specify e30 or e34.');
const e30 = series==='e30', content = siteContent();
assert(content.release,'Set E34_ASSET_PACK to the Workshop asset pack.');
const fit = (await readJson('data/digital-twin/air-cleaner-references.json'))[series];
const root = e30?'work/e30/getrag-service':'work/525i-service-candidate';
const receiptPath = root+(e30?'/review.json':'/fit-review.json');
const { archives=[], ...current } = await readJson(receiptPath);
const pinOf = entry=>e30?entry:entry.release;
const earlier = [current,...archives].filter(entry=>pinOf(entry).revision<fit.revision);
const pin = earlier.map(pinOf).find(entry=>entry.revision===fit.revision-1);
assert.equal(pin?.id,fit.model,'Generate the front hub references first.');
const prefix = '/models/'+series+'-lore/r'+fit.revision+'/';
const localPath = url=>root+(e30?url:'/'+nameOf(url));
const assetPath = async url=>await fs.stat(localPath(url)).then(()=>localPath(url),()=>content.publicDir+url);

async function checked(file,digest) {
  const bytes = await fs.readFile(file);
  assert.equal(sha(bytes),digest,file);
  return bytes;
}
const model = JSON.parse(await checked(localPath(pin.manifestUrl),pin.sha256));
const { catalog } = model;
const page = catalog.assemblies[fit.assembly];
assert(page);
const { items } = JSON.parse(await checked(content.publicDir+page.url,page.sha256));
const byNumber = new Map(items.map(item=>[item.number,item]));
assert(byNumber.get(fit.clip)?.conditions.some(row=>row.value===String(fit.clips)));
assert(byNumber.has(fit.filter));
const diameterSource = e30?'https://www.mann-filter.com/en/catalog/search-results/product.html/c26110/1_mann-filter.html':
  'https://www.mann-filter.com/de-de/katalog/suchergebnisse/produkt.html/c33130_mann-filter.html';

const asset = model.assets.find(entry=>entry.id===(e30?'e30:engine-bay':'authored:525i-bay-suspension'));
assert(asset);
const { scene } = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(Uint8Array.from(await checked(await assetPath(asset.url),asset.sha256)).buffer,'');
const nodes = new Map(model.nodes.map(node=>[node.id,node]));
const base = e30?'e30assembly:engine-bay:':'e34sys:';
const boxId = base+'airbox', lidId = base+'airbox-lid';
const housing = nodes.get(boxId);
const filterId = base+(e30?'air-filter':'air-filter-element');
const chapter = e30?'13':'020', pdf = e30?272:32;
const manual = [e30?'13-39':'020-10',e30?'13-40':'020-11'].map((printed,i)=>({
  chapter,printed,pdf:pdf+i,page:pdf+i,title:i?'Filter fitting and closure':'Air cleaner access',
  href:(e30?'/e30':'')+'/manual/'+chapter+'?pdf='+(pdf+i),guides:[],
}));
const shape = airCleanerDatums(series);

function bind(node,numbers,note,kind) {
  const positions = numbers.map(number=>{
    const row = byNumber.get(number);
    assert(row,number);
    return {id:row.id,partId:row.partId,number,assemblyId:page.id};
  });
  node.sourceContext = {contextId:catalog.context.id,assemblyId:page.id,positionId:positions[0].id};
  node.oem = kind==='component'?positions[0].number:null;
  node.canonicalId = kind==='component'?positions[0].partId:null;
  catalog.bindings[node.id] = {nodeId:node.id,title:node.name,kind,assemblyIds:[page.id],positions,
    guideIds:node.guideIds,manual,note,visualSources:[
      {title:'BMW '+page.title,url:page.sourceUrl},
      ...(node.id===filterId?[{title:'MANN-FILTER · Element dimensions',url:diameterSource}]:[]),
    ]};
}
function writePart(id,name,parentId,position,draw,numbers,note,{internal=false,kind='component',direction=[0,.6,-.4]}={}) {
  const previous = nodes.get(id);
  if(previous?.assetId===asset.id) for(const name of previous.meshNames) {
    const mesh = scene.getObjectByName(name);
    assert(mesh?.parent,name);
    mesh.removeFromParent();
  }
  const group = new Group();
  group.name = 'air_cleaner_'+id.replace(/[^a-z0-9]/gi,'_');
  draw(group);
  compactPart(group);
  const bounds = new Box3().setFromObject(group,true);
  scene.add(group);
  const node = {...previous,id,name,parentId,kind:'part',assetId:asset.id,meshNames:[group.name],internal,
    matrix:new Matrix4().setPosition(...position).toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
    systemIds:[...new Set([...(previous?.systemIds??[]),'system:intake','system:engine-bay'])].filter(id=>nodes.has(id)),
    displayDirection:direction,guideIds:previous?.guideIds??nodes.get(filterId).guideIds,thumbnail:previous?.thumbnail??null};
  bind(node,numbers,note,kind);
  nodes.set(id,node);
  return bounds;
}

writePart(boxId,'Air cleaner lower case',housing.parentId,shape.center,g=>drawAirbox(g,series,shape,fit),
  [fit.case],'The lower case and lid seat against the perimeter seal.',{direction:[.27,.18,-.32]});
const filter = writePart(filterId,'Pleated engine air filter',boxId,shape.center,g=>drawAirFilter(g,fit),
  [fit.filter,e30?'13721715881':'13721726916'],`${fit.length} × ${fit.width} × ${fit.height} mm in the listed MANN-FILTER reference.`,{internal:true});
const [length,height,width] = filter.getSize(new Vector3()).toArray().map(value=>Math.round(value*1000));
assert.deepEqual([length,width,height],[fit.length,fit.width,fit.height]);
assert.equal(shape.clips.length,fit.clips);
if(e30) {
  writePart(lidId,'Ribbed air cleaner lid',boxId,shape.center,g=>drawE30AirboxLid(g,shape),
    [fit.case],'The lid is part of the illustrated air cleaner.',{kind:'supplied-with'});
  writePart(base+'airbox-snorkel','Quarter-turn intake funnel',boxId,[1.853,.628,-.518],drawE30IntakeFunnel,
    ['13711284612'],'Rotate and slide forward for lid clearance.',{direction:[.44,.25,-.1]});
} else {
  const lid = nodes.get(lidId);
  bind(lid,[fit.case],'The lid is part of the illustrated air cleaner.','supplied-with');
}
shape.clips.forEach(([x,side],i)=>{
  const position = [shape.center[0]+x,shape.center[1]-(e30?.032:.035),shape.center[2]+side*(shape.caseSize[1]/2+.003)];
  writePart(base+'airbox-clip-'+(i+1),'Air cleaner spring clip '+(i+1),boxId,position,
    g=>drawAirboxClip(g,side,e30?.034:.042),[fit.clip],
    'Release by hand. Replace the clip if its spring or hook is damaged.',{direction:[.03,.13,side*.33]});
});

const bytes = await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true})));
const assetSha = sha(bytes);
Object.assign(asset,{bytes:bytes.length,sha256:assetSha,url:prefix+assetSha+'.glb'});
model.nodes = [...nodes.values()];
model.revision = catalog.modelRevision = fit.revision;
catalog.coverage.renderable = model.nodes.filter(node=>node.assetId).length;
catalog.coverage.bound = Object.values(catalog.bindings).filter(binding=>binding.assemblyIds.length).length;
catalog.coverage.withCandidates = Object.values(catalog.bindings).filter(binding=>binding.positions.length).length;
const { parseReference,availableAssemblyServices } = await localReferenceTools();
let parsed;
try { parsed = parseReference(model); }
catch (error) { throw new Error(error.message); }
const jobs = availableAssemblyServices(parsed);
for(const id of [series+'-air-cleaner',series+'-left-front-hub',series+'-left-rear-wheel-bearing']) {
  assert(jobs.some(job=>job.id===id),id+' no longer resolves against the model');
}
const manifest=Buffer.from(JSON.stringify(model)), sha256=sha(manifest);
const release={...pin,revision:fit.revision,sha256,manifestUrl:prefix+'manifest.'+sha256+'.json',
  renderableCount:catalog.coverage.renderable,assetBytes:model.assets.reduce((total,asset)=>total+asset.bytes,0)};
assert(release.assetBytes<=24*1024*1024,'Reference exceeds the Workshop package limit: '+release.assetBytes);
await immutable(localPath(asset.url),bytes);
await immutable(localPath(release.manifestUrl),manifest);
await replaceJson(receiptPath,e30?{...release,archives:earlier}:{
  release,archives:earlier,files:[asset,{url:release.manifestUrl,sha256}].map(item=>({url:item.url,file:nameOf(item.url),sha256:item.sha256})),
});
console.log(series+' r'+fit.revision+' · '+release.assetBytes+' geometry bytes; filter size and positions verified.');
