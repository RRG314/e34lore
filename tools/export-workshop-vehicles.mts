/* eslint-disable @typescript-eslint/no-explicit-any -- Offline adapter for the private studio and SQLite row shapes. The source manifest and complete runtime/catalog result are schema-validated before export; this module is never shipped to browsers. */
/** Export existing, licensed runtime references into the native E34 Lore reader.
 * Does not alter the studio's accepted graph, original sources or source models. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { parseReference } from '../src/digital-twin/public/model.ts';
import { componentCatalog, bindingFor, type CatalogBinding } from '../src/digital-twin/public/catalog.ts';
const studio=path.resolve(process.argv[2]||'../e34-digital-twin-studio'),root=process.cwd();
const read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const index=await read(path.join(studio,'workspace/vehicle-variants-current.json'));
if(index.publicRelease!==false||index.references.length!==8)throw Error('Expected the eight reviewed private source builds');
const {worldMatrix,validateManifest}=await import(pathToFileURL(path.join(studio,'src/domain/engine.ts')).href);
const {matchesM60CatalogCandidate}=await import(pathToFileURL(path.join(studio,'vendor/m60-catalog-candidates.ts')).href);
const {matchesVehicleCatalogCandidate}=await import(pathToFileURL(path.join(studio,'vendor/vehicle-catalog-candidates.ts')).href);
const db=new DatabaseSync(path.join(studio,'workspace/catalog.sqlite'),{readOnly:true});
const thumbnails=await read(path.join(studio,'workspace/thumbnails/index.json'));
const baseRelease=await read('data/digital-twin/public-reference.json'),base=await read('public'+baseRelease.manifestUrl);
const sourceCredit=base.credit,touringCredit={author:'Nieve5677 / niev',url:'https://sketchfab.com/3d-models/bmw-5-series-e34-sedan-and-touring-e3d8d4f5cdd24a549b54d10f0f0ec8f8',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'};
const digest=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const shared=new Map<string,string>(),contextIndexes=new Map<string,any>(),releases=[],receipts=[];
async function output(directory:string,name:string,bytes:Uint8Array){await fs.mkdir(path.join(root,'public',directory),{recursive:true});const filename=path.join(root,'public',directory,name);try{const previous=await fs.readFile(filename);if(!previous.equals(Buffer.from(bytes)))throw Error('Immutable output changed: '+filename);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;await fs.writeFile(filename,bytes,{flag:'wx'});}return'/'+directory+'/'+name;}
async function modelFile(filename:string,revision:number,extension:string){const bytes=await fs.readFile(filename),sha256=digest(bytes);let url=shared.get(sha256);if(!url){url=await output('models/e34-lore/r'+revision,sha256+'.'+extension,bytes);shared.set(sha256,url);}return{url,bytes:bytes.length,sha256};}
function conditions(value:string){try{const rows=JSON.parse(value||'[]');return Array.isArray(rows)?rows:[];}catch{return[];}}
function quantity(value:unknown){return /^\d+$/.test(String(value??''))?Number(value):null;}
const factsFor=db.prepare('select x.*,p.number,p.name part_name,a.title assembly_title,a.category,a.source_url from positions x join parts p on p.id=x.part_id join assemblies a on a.id=x.assembly_id where x.context_id=? order by x.id');
async function catalogFor(v:any){
 const cached=contextIndexes.get(v.contextId);if(cached)return cached;
 const context=db.prepare('select * from contexts where id=?').get(v.contextId) as any;
 if(!context)throw Error('Missing source catalog context');
 const facts=factsFor.all(v.contextId) as any[],assemblies:Record<string,any>={},pages:Record<string,any>={},systems:Record<string,string[]>={},searchItems:any[]=[];
 const replacements=db.prepare('select s.position_id,p.number from supersessions s join parts p on p.id=s.replacement_id join positions x on x.id=s.position_id where x.context_id=?').all(v.contextId) as any[];
 const replaced=new Map<string,string[]>();for(const r of replacements)replaced.set(r.position_id,[...(replaced.get(r.position_id)||[]),r.number]);
 for(const assembly of db.prepare('select * from assemblies where context_id=? order by id').all(v.contextId) as any[]){
  const rows=facts.filter(r=>r.assembly_id===assembly.id);if(!rows.length)continue;
  const original=Object.values(componentCatalog.assemblies).find(a=>a.title===assembly.title&&a.category===assembly.category);
  const systemIds=original?.systemIds||['system:'+assembly.system];
  const page={schemaVersion:1,contextId:context.id,assemblyId:assembly.id,title:assembly.title,sourceUrl:assembly.source_url,sourceSha256:rows[0].source_sha256,sourceSelection:context.name,sourceConditions:context.scope||'Check production, equipment and transmission conditions.',unselectedOptions:'Catalog alternatives are not interchangeable by default.',items:rows.map(r=>({id:r.id,partId:r.part_id,number:r.number,name:r.name||r.part_name,reference:r.reference||'',quantity:quantity(r.quantity),packageQuantity:null,conditions:conditions(r.conditions),replacedBy:[...new Set(replaced.get(r.id)||[])],recordHash:r.record_sha256}))};
  const bytes=Buffer.from(JSON.stringify(page)),sha256=digest(bytes),url=await output('catalog/workshop/'+v.id+'/r1',sha256+'.json',bytes);
  const a={id:assembly.id,title:assembly.title,category:assembly.category,key:assembly.id,contextId:context.id,sourceUrl:assembly.source_url,sourceSha256:rows[0].source_sha256,itemCount:rows.length,systemIds,manual:original?.manual||[],url,sha256,bytes:bytes.length};
  assemblies[a.id]=a;pages[a.id]=page;for(const system of systemIds)systems[system]=[...(systems[system]||[]),a.id];
  for(const r of rows)searchItems.push({number:r.number,name:r.name||r.part_name,partId:r.part_id,assemblyId:r.assembly_id,positionId:r.id});
 }
 const searchBytes=Buffer.from(JSON.stringify({schemaVersion:1,contextId:context.id,items:searchItems})),searchSha=digest(searchBytes),searchUrl=await output('catalog/workshop/'+v.id+'/r1',searchSha+'.json',searchBytes);
 const result={context:{id:context.id,name:context.name,scope:context.scope||''},facts,assemblies,pages,systems,search:{url:searchUrl,sha256:searchSha,bytes:searchBytes.length}};contextIndexes.set(v.contextId,result);return result;
}
for(let at=0;at<index.references.length;at++){
 const v=index.references[at],revision=15+at,m=validateManifest(await read(index.manifests[v.id]));
 if(m.id!==v.id)throw Error('Source manifest identity mismatch');
 const included=new Set(m.instances.filter((n:any)=>n.view==='vehicle').map((n:any)=>n.id));
 let expanded=true;while(expanded){expanded=false;for(const n of m.instances)if(included.has(n.id)){for(const id of [n.parentId,...n.systemIds].filter(Boolean))if(!included.has(id)){included.add(id);expanded=true;}}}
 const active=m.instances.filter((n:any)=>included.has(n.id)),assets=[];
 for(const id of new Set(active.filter((n:any)=>n.assetId).map((n:any)=>n.assetId))){const a=m.assets.find((a:any)=>a.id===id),source=index.modelPaths[id as string];const bytes=await fs.readFile(source);if(digest(bytes)!==a.sha256||bytes.length!==a.bytes)throw Error('Source asset receipt mismatch');assets.push({id,...await modelFile(source,revision,'glb')});}
 const catalog=await catalogFor(v),bindings:Record<string,CatalogBinding>={};
 const nodes=[];
 for(const n of active){
  const baseNode=base.nodes.find((p:any)=>p.id===n.id);let thumbnail=baseNode?.thumbnail||null;
  const thumb=thumbnails[n.id]||(n.assetId==='assembled:wheel-v4'?thumbnails['wheel-reference-geometry']:null);
  if(n.assetId&&thumb)thumbnail=(await modelFile(path.join(studio,'workspace/thumbnails',thumb),revision,'png')).url;
  const node={id:n.id,name:n.name,parentId:n.parentId,kind:n.kind,systemIds:n.systemIds,assetId:n.assetId,meshNames:n.meshNames,matrix:worldMatrix(m,n.id).toArray(),bounds:n.bounds,internal:n.internal,canonicalId:n.canonicalId,oem:n.oem,guideIds:n.guideIds,thumbnail,displayDirection:n.removalDirection||[0,0,0]};nodes.push(node);
  if(!n.assetId)continue;
  const old=bindingFor(n.id),key=n.id.slice(n.id.indexOf(':')+1);
  const originalPosition=catalog.facts.find((f:any)=>f.id===n.sourcePositionId);
  let matched:any[]=n.canonicalId?catalog.facts.filter((f:any)=>f.part_id===n.canonicalId&&(!originalPosition||f.assembly_id===originalPosition.assembly_id)):[];
  if(!matched.length)matched=catalog.facts.filter((f:any)=>n.id.startsWith('m60')?matchesM60CatalogCandidate(key,{category:f.category,title:f.assembly_title},{name:f.name||f.part_name}):matchesVehicleCatalogCandidate(n.id,v.engine,v.transmission,{category:f.category,title:f.assembly_title},{name:f.name||f.part_name}));
  if(!matched.length&&old){const numbers=new Set(old.positions.map(p=>p.number)),titles=new Set(old.assemblyIds.map(id=>componentCatalog.assemblies[id]?.title));matched=catalog.facts.filter((f:any)=>numbers.has(f.number)&&titles.has(f.assembly_title));}
  let kind:CatalogBinding['kind']=matched.length?'component':'reference';
  if(!matched.length&&old){const titles=new Set(old.assemblyIds.map(id=>componentCatalog.assemblies[id]?.title));matched=catalog.facts.filter((f:any)=>titles.has(f.assembly_title));if(matched.length)kind='assembly';}
  const assemblyIds=[...new Set(matched.map((f:any)=>f.assembly_id))] as string[];
  bindings[n.id]={nodeId:n.id,title:n.name,kind,note:matched.length?'Check source production, equipment and size conditions for the installed car.':'No exact catalog association is established for this surface. Search the selected catalog or ask a linked community question.',assemblyIds,positions:matched.map((f:any)=>({assemblyId:f.assembly_id,id:f.id,number:f.number,partId:f.part_id})),manual:old&&!n.id.startsWith('m60')&&!n.id.startsWith('m30')?old.manual:[],guideIds:[...new Set([...n.guideIds,...(old&&!n.id.startsWith('m60')&&!n.id.startsWith('m30')?old.guideIds:[])])]};
 }
 const fullCatalog={schemaVersion:1,modelId:m.id,modelRevision:revision,context:catalog.context,bindings,assemblies:catalog.assemblies,systems:catalog.systems,guides:componentCatalog.guides,search:catalog.search,coverage:{renderable:nodes.filter(n=>n.assetId).length,bound:Object.keys(bindings).length,withCandidates:Object.values(bindings).filter(b=>b.positions.length).length,sourcePages:Object.keys(catalog.assemblies).length,expectedPages:Object.keys(catalog.assemblies).length,sourcePositions:catalog.facts.length,distinctNumbers:new Set(catalog.facts.map((f:any)=>f.number)).size}};
 const manifest={schemaVersion:1,id:m.id,revision,reference:m.instances.find((n:any)=>n.id==='vehicle').name,vehicleReference:{id:m.id,year:v.year,model:v.model,body:v.body,engine:v.engine,transmission:v.transmission},assets,nodes,credit:sourceCredit,credits:v.body==='Touring'?[sourceCredit,touringCredit]:[sourceCredit],catalog:fullCatalog,limits:'Interactive visual reference, not manufacturer CAD or a verified installed bill of materials. Shared chassis/cabin and source-informed powertrain geometry retain their stated limits. Check exact production and equipment conditions before ordering parts.'};
 parseReference(manifest);
 const bytes=Buffer.from(JSON.stringify(manifest)),sha256=digest(bytes),manifestUrl=await output('models/e34-lore/r'+revision,'manifest.'+sha256+'.json',bytes);
 releases.push({id:m.id,revision,manifestUrl,sha256,renderableCount:nodes.filter(n=>n.assetId).length,assetBytes:assets.reduce((sum,a)=>sum+a.bytes,0),label:`${v.model} ${v.body} · ${/hp/.test(v.transmission)?'Automatic':'Manual'}`,contextId:catalog.context.id,year:v.year,engine:v.engine,body:v.body,model:v.model,transmission:/hp/.test(v.transmission)?'Automatic':'Manual'});
 receipts.push({id:m.id,sourceManifestSha256:digest(await fs.readFile(index.manifests[v.id])),revision,geometryAssets:assets.map(a=>({id:a.id,sha256:a.sha256})),catalog:fullCatalog.coverage});
}
await fs.writeFile('data/digital-twin/vehicle-references.json',JSON.stringify(releases,null,2)+'\n');
await fs.writeFile('data/digital-twin/vehicle-reference-export.json',JSON.stringify({schemaVersion:1,sourceGeometryCommit:'a0ff5d9',sourceIndexSha256:digest(await fs.readFile(path.join(studio,'workspace/vehicle-variants-current.json'))),baseManifestUnchanged:index.baseManifestSha256,receipts},null,2)+'\n');
console.log(JSON.stringify({references:releases.length,uniqueFiles:shared.size,catalogs:contextIndexes.size,assetBytes:releases.map(r=>({id:r.id,bytes:r.assetBytes}))}));db.close();
