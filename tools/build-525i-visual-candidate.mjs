import { siteContent } from "../scripts/site-content.mjs";
const { publicDir } = siteContent();
/** Continue the archived service candidate without changing accepted or saved bytes. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {Mesh} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {build525iVisualDetails} from './geometry/525i-visual-details.mjs';

const root=resolve(process.argv[2]||'work/525i-service-candidate'),revision=Number(process.argv[3]||1006);
if(!root.startsWith(resolve('work')+'/')||!Number.isInteger(revision)||revision<1002||revision>1999)throw Error('Use a local work directory and a new review revision');
await fs.mkdir(root,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const sourceRoot=resolve(process.argv[4]||'work/525i-service-candidate');
if(!sourceRoot.startsWith(resolve('work')+'/'))throw Error('Source candidate must stay in local work');
const sourceArchives=await read(sourceRoot+'/releases.json');
const base=sourceArchives.find(r=>r.release.revision===1001);
if(!base)throw Error('Build and retain the service candidate revision1001 first');
const baseBytes=await fs.readFile(sourceRoot+'/'+base.release.manifestUrl.split('/').pop());
if(sha(baseBytes)!==base.release.sha256)throw Error('Service candidate changed');
const model=JSON.parse(baseBytes),accepted=await read('data/digital-twin/525i-automatic-reference.json');
const originals=[{url:accepted.manifestUrl,sha256:accepted.sha256},...base.base.assets];
for(const a of originals)if(sha(await fs.readFile(publicDir +a.url))!==a.sha256)throw Error('Accepted source changed');
await build({stdin:{contents:"export {parseReference} from './src/digital-twin/public/model.ts'",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:root+'/visual-validation.mjs',logLevel:'silent'});
const {parseReference}=await import(pathToFileURL(root+'/visual-validation.mjs'));
parseReference(model);
const detail=build525iVisualDetails(model);
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const glb=Buffer.from(await new GLTFExporter().parseAsync(detail.root,{binary:true}));
if(glb.length>4*1024*1024)throw Error('Visual candidate exceeds its additional asset budget: '+glb.length);
const assetId='authored:525i-visual-detail',assetHash=sha(glb),assetUrl=`/models/e34-lore/r${revision}/${assetHash}.glb`;
model.assets.push({id:assetId,url:assetUrl,bytes:glb.length,sha256:assetHash});
const changed=[];
for(const entry of detail.entries){
 const old=model.nodes.find(n=>n.id===entry.id);
 const node={...old,id:entry.id,name:entry.name,parentId:entry.parentId,kind:entry.kind,systemIds:entry.systemIds,assetId,meshNames:entry.meshNames,matrix:entry.matrix,bounds:entry.bounds,internal:entry.internal,canonicalId:entry.canonicalId||null,oem:entry.oem||null,guideIds:old?.guideIds||[],thumbnail:null};
 if(old)model.nodes[model.nodes.indexOf(old)]=node;else model.nodes.push(node);
 if(entry.sourceAssembly){
  const a=model.catalog.assemblies[entry.sourceAssembly];if(!a)throw Error('Unknown source assembly');
  const data=await fs.readFile(publicDir +a.url);if(sha(data)!==a.sha256)throw Error('Catalog receipt changed');
  const records=JSON.parse(data).items;
  const positions=records.filter(p=>(entry.sourceNumbers||[]).includes(p.number)).map(p=>({id:p.id,assemblyId:entry.sourceAssembly,partId:p.partId,number:p.number}));
  if((entry.sourceNumbers||[]).some(number=>!positions.some(p=>p.number===number))){
   // A supersession can be named in source history without its own occurrence.
   for(const number of entry.sourceNumbers||[])if(!positions.some(p=>p.number===number)&&!records.some(p=>p.conditions?.some(c=>c.name==='Replaced By'&&c.value===number)))throw Error('Missing exact source occurrence: '+number);
  }
  const guideIds=[...new Set(a.manual.flatMap(m=>m.guides))].filter(id=>model.catalog.guides[id]);
  const manual=[...a.manual];
  if(['e34auto:pan-main','e34auto:pan-secondary','e34auto:strainer'].includes(entry.id))manual.unshift({chapter:'240',page:14,pdf:250,printed:'240-14',href:'/manual/240?pdf=250#job-a4s-310r-atf-service',title:'A4S 310R ATF service',guides:[]});
  if(['e34auto:converter','e34auto:bellhousing','e34auto:case'].includes(entry.id))manual.unshift({chapter:'240',page:8,pdf:244,printed:'240-8',href:'/manual/240?pdf=244#job-a4s-310r-transmission-removal',title:'A4S 310R transmission removal',guides:[]});
  model.catalog.bindings[node.id]={nodeId:node.id,title:entry.name,kind:entry.kind==='assembly'?'assembly':'component',note:entry.id.startsWith('e34auto:')?'Illustrative A4S270/310R-family location. Check the gearbox tag, source production restrictions and installed hardware; casting dimensions and internal construction are not verified.':'Original visual study. Shape, interfaces and installed clearances are illustrative; check the exact source record.',assemblyIds:[entry.sourceAssembly],positions,manual,guideIds};
  node.guideIds=guideIds;
 }
 changed.push({nodeId:node.id,name:node.name,replacement:!!old,sourcePositions:model.catalog.bindings[node.id]?.positions.length||0,triangles:0});
 const part=detail.root.getObjectByName(entry.meshNames[0]);part?.traverse(o=>{if(o instanceof Mesh)changed.at(-1).triangles+=(o.geometry.index?.count||o.geometry.getAttribute('position').count)/3;});
}
model.revision=revision;model.catalog.modelRevision=revision;
model.reference='1995 BMW 525i automatic · local visual-detail candidate';
model.limits='Local visual reference retaining the accepted exterior and seated cabin, with illustrated automatic selector and two-pedal controls replacing unverified manual controls. Shaped cooling, intake, brake and floor components replace simple block illustrations. The A4S270/310R source family now has an illustrative bellhousing, external casing, converter exterior, drive plate, two oil pans and oil strainer; the internal gear train, hydraulics and torque-converter internals are not reconstructed. Source production restrictions and gearbox identification still apply. Original component locations, casting shapes, material finishes, mounting interfaces, underbody clearances and repair-removal space are not dimensionally verified. Air-filter and oil-filter outer envelopes and the fan diameter have separate narrow checks. This is not manufacturer CAD or a fitment guarantee. Accepted revision23 and archived local revision1001 remain unchanged.';
model.catalog.coverage.renderable=model.nodes.filter(n=>n.assetId).length;
model.catalog.coverage.bound=Object.keys(model.catalog.bindings).length;
model.catalog.coverage.withCandidates=Object.values(model.catalog.bindings).filter(b=>b.positions.length).length;
parseReference(model);
const bytes=Buffer.from(JSON.stringify(model)),manifestHash=sha(bytes),manifestName=`manifest.${manifestHash}.json`;
const release={...base.release,revision,manifestUrl:`/models/e34-lore/r${revision}/${manifestName}`,sha256:manifestHash,renderableCount:model.catalog.coverage.renderable,assetBytes:model.assets.reduce((s,a)=>s+a.bytes,0)};
const checks=base.checks.map(c=>({...c,revision,manifestSha256:manifestHash}));
const fan=model.nodes.find(n=>n.id==='e34sys:engine-cooling-fan'),fanSize=fan.bounds.min.map((v,i)=>(fan.bounds.max[i]-v)*1000);
// Circle diameter is independent of sampling extrema: no blade-thickness claim.
const fanGroup=detail.root.getObjectByName(fan.meshNames[0]);let maxRadius=0;
fanGroup.traverse(o=>{if(!(o instanceof Mesh))return;const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++)maxRadius=Math.max(maxRadius,Math.hypot(p.getY(i),p.getZ(i)));});
if(Math.abs(maxRadius*2000-420)>.01)throw Error('Fan diameter mismatch');
checks.push({referenceId:model.id,revision,manifestSha256:manifestHash,nodeId:fan.id,assetSha256:assetHash,canonicalId:fan.canonicalId,oem:fan.oem,kind:'diameter-and-blade-count-only',displaySize:'Ø420 mm · 11 blades',measuredMm:fanSize,listedMm:[420],source:'https://www.cojaliparts.com/en/reference/11521712058/fan-blades/8111602/',sourceTitle:'Cojali 8111602 · BMW11521712058',checkedOn:'2026-11-10',limitations:'Diameter and blade count only. Blade pitch, section, thickness, fastener spacing, viscous coupling, shroud clearance and installed fitment are illustrative.'});
let priorArchives=[];try{priorArchives=await read(root+'/releases.json');}catch(e){if(e.code!=='ENOENT')throw e;}
const archives=[...sourceArchives];for(const a of priorArchives)if(!archives.some(b=>b.release.revision===a.release.revision))archives.push(a);
const existing=archives.find(r=>r.release.revision===revision);
if(existing&&existing.release.sha256!==manifestHash)throw Error('Do not overwrite an archived candidate. Increment the review revision.');
const immutable=async(name,data)=>{try{const old=await fs.readFile(root+'/'+name);if(!old.equals(data))throw Error('Immutable candidate changed');}catch(e){if(e.code!=='ENOENT')throw e;await fs.writeFile(root+'/'+name,data,{flag:'wx'});}};
await immutable(assetHash+'.glb',glb);await immutable(manifestName,bytes);
for(const archive of sourceArchives)for(const file of archive.files)await immutable(file.file,await fs.readFile(sourceRoot+'/'+file.file));
// Saved revision1001 needs its own authored filter asset when using another work output.
for(const a of model.assets.filter(a=>a.id==='authored:525i-service-study')){const name=a.url.split('/').pop();await immutable(name,await fs.readFile(sourceRoot+'/'+name));}
const files=[{url:assetUrl,file:assetHash+'.glb',sha256:assetHash,type:'model/gltf-binary'},{url:release.manifestUrl,file:manifestName,sha256:manifestHash,type:'application/json'}];
const review={schema:1,localOnly:true,base:base.base,release,files,checks,changed,visualSourceReferences:[{source:'https://www.cojaliparts.com/en/reference/11521712058/fan-blades/8111602/',scope:'420mm fan diameter, 11 blades and OEM cross-reference'},{source:'https://www.mahle.com/en/products-and-services/passenger-cars/cooling/',scope:'Radiator core, plastic end tanks, connections and fastenings; general architecture only'},{source:'https://www.chinlang.com/en-US/p818-coolant-reservoir-tank',scope:'Reservoir17111712835 tubular body, neck, lower seal and side bracket appearance; unmeasured'}],fullyDimensionallyVerifiedComponents:0,additionalAssetBytes:glb.length,illustrative:['Detailed shape and materials','Installed placement and interfaces','Automatic transmission external envelopes','Underbody and removal clearances']};
const archived=archives.filter(r=>r.release.revision!==revision);archived.push(review);
const atomic=async(name,value)=>{await fs.writeFile(root+'/'+name+'.tmp',JSON.stringify(value,null,2)+'\n');await fs.rename(root+'/'+name+'.tmp',root+'/'+name);};
await atomic('releases.json',archived);await atomic('geometry-checks.json',checks);await atomic('review.json',review);await atomic('release.json',release);
for(const a of originals)if(sha(await fs.readFile(publicDir +a.url))!==a.sha256)throw Error('Accepted source mutated');
console.log(JSON.stringify({revision,replacements:changed.filter(c=>c.replacement).length,newComponents:changed.filter(c=>!c.replacement).length,renderables:release.renderableCount,additionalAssetBytes:glb.length,triangles:changed.reduce((n,c)=>n+c.triangles,0),acceptedBytesUnchanged:true}));
