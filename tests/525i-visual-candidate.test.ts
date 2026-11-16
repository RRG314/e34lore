import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Box3,Mesh,Vector3,type Group} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {parseReference,enclosingParts,visibleNodes,defaultView,type ReferenceModel} from '../src/digital-twin/public/model';
import {findCatalogNode,catalogProcedures} from '../src/digital-twin/public/catalog';
import {referenceRelease} from '../src/digital-twin/public/load-reference';
import accepted from '../data/digital-twin/525i-automatic-reference.json';
import {registerReviewReferences} from '../scripts/build-studio/review-references.mjs';

const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
mkdirSync('work/geometry-quality-tests',{recursive:true});
const root=mkdtempSync('work/geometry-quality-tests/candidate-');
let model:ReferenceModel,base:ReferenceModel,scene:Group,review:ReturnType<typeof read>,archiveBefore:ReturnType<typeof read>,service:ReturnType<typeof read>;
const serviceRoot=root+'/service-base';
beforeAll(async()=>{
 execFileSync(process.execPath,['tools/build-525i-service-candidate.mjs',serviceRoot],{stdio:'pipe'});
 archiveBefore=read(serviceRoot+'/releases.json');service=archiveBefore.find((r:{release:{revision:number}})=>r.release.revision===1001);
 base=parseReference(read(serviceRoot+'/'+service.release.manifestUrl.split('/').pop()));
 execFileSync(process.execPath,['tools/build-525i-visual-candidate.mjs',root,'1998',serviceRoot],{stdio:'pipe'});
 review=read(root+'/review.json');model=parseReference(read(root+'/'+review.release.manifestUrl.split('/').pop()));
 const asset=review.files.find((f:{type:string})=>f.type==='model/gltf-binary');const bytes=readFileSync(root+'/'+asset.file);
 scene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
},30000);
afterAll(()=>{scene?.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});rmSync(root,{recursive:true,force:true});});
const group=(id:string)=>scene.getObjectByName(model.nodes.find(n=>n.id===id)!.meshNames[0])!;
const size=(id:string)=>new Box3().setFromObject(group(id)).getSize(new Vector3());

describe('525i visual geometry candidate',()=>{
 it('preserves accepted bytes, saved service geometry and legitimate thin parts',()=>{
  expect(sha(readFileSync('public'+accepted.manifestUrl))).toBe(accepted.sha256);
  for(const a of service.base.assets)expect(sha(readFileSync('public'+a.url))).toBe(a.sha256);
  expect(sha(readFileSync(serviceRoot+'/'+service.release.manifestUrl.split('/').pop()))).toBe(service.release.sha256);
  for(const id of ['m50:head-gasket','m50:piston-ring:1:1','e34sys:air-filter-element'])expect(model.nodes.find(n=>n.id===id)).toEqual(base.nodes.find(n=>n.id===id));
  expect(review.changed.filter((r:{replacement:boolean})=>r.replacement)).toHaveLength(22);
  expect(review.changed.filter((r:{replacement:boolean})=>!r.replacement)).toHaveLength(10);
 });
 it('exports eleven curved closed blade sections at the checked 420mm diameter',()=>{
  const angles:number[]=[];let maximum=0,minimum=Infinity;
  group('e34sys:engine-cooling-fan').traverse(o=>{if(!(o instanceof Mesh))return;const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const y=p.getY(i),z=p.getZ(i),r=Math.hypot(y,z);maximum=Math.max(maximum,r);minimum=Math.min(minimum,r);if(r>.20999)angles.push((Math.atan2(z,y)+Math.PI*2)%(Math.PI*2));}});
  expect(maximum*2000).toBeCloseTo(420,2);expect(minimum*2000).toBeCloseTo(134.8,2);
  angles.sort((a,b)=>a-b);const gaps=angles.filter((a,i)=>((angles[(i+1)%angles.length]+(i===angles.length-1?Math.PI*2:0))-a)>.08);
  expect(gaps).toHaveLength(11);expect(size('e34sys:engine-cooling-fan').x).toBeGreaterThan(.035);
  expect(review.checks.find((c:{nodeId:string})=>c.nodeId==='e34sys:engine-cooling-fan').kind).toBe('diameter-and-blade-count-only');
 });
 it('gives shields a pressed dish, keeps disc slots open and retains meaningful component depth',()=>{
  for(const end of ['front','rear'])for(const side of [-1,1]){
   const shield=size('e34sys:brake-shield-'+end+'-'+side);expect(shield.z).toBeGreaterThan(.012);expect(shield.z).toBeLessThan(.025);
   expect(size('e34sys:brake-caliper-'+end+'-'+side).z).toBeGreaterThan(.10);
  }
  expect(size('e34sys:fan-shroud').x).toBeGreaterThan(.06);
  expect(size('e34sys:fresh-air-snorkel').x).toBeGreaterThan(.34);
  expect(model.nodes.find(n=>n.id==='e34sys:airbox-lid')?.parentId).toBe('e34sys:airbox');
 });
 it('binds exact source positions to the fan, strainer and separate automatic pans',()=>{
  for(const [number,id]of [['11521712058','e34sys:engine-cooling-fan'],['24111218899','e34auto:strainer'],['24111218896','e34auto:pan-secondary'],['24117519543','e34auto:pan-main']]){
   expect(findCatalogNode(model,'bmw-'+number)?.id).toBe(id);
   const binding=model.catalog!.bindings[id];expect(binding.positions.length).toBeGreaterThan(0);
   for(const p of binding.positions){expect(p.partId).toBe('bmw-'+p.number);expect(findCatalogNode(model,p.partId,p.id)?.id).toBe(id);}
   expect(catalogProcedures('bmw-'+number,undefined,undefined,number,model.catalog).manual.length).toBeGreaterThan(0);
  }
  const selector=model.catalog!.bindings['e34sys:gear-lever'];expect(selector.positions).toHaveLength(5);expect(selector.positions.every(p=>p.assemblyId==='catalog-assembly-f94415eaf766f8decaa4d389')).toBe(true);expect(model.nodes.find(n=>n.id==='e34sys:gear-lever')?.oem).toBeNull();
  expect(findCatalogNode(model,'bmw-35211160421')?.id).toBe('e34auto:brake-pedal-pad');
  expect(enclosingParts(model,'e34auto:converter').has('e34auto:bellhousing')).toBe(true);
  expect(enclosingParts(model,'e34auto:strainer').has('e34auto:case')).toBe(true);
  const view={...defaultView(),scope:'system:transmission',internals:true};
  expect(visibleNodes(model,view).some(n=>n.id==='e34auto:strainer')).toBe(true);
  const cabin=visibleNodes(model,{...defaultView(),cabin:'driver'});for(const id of ['e34sys:gear-lever','e34sys:pedal-box','e34auto:brake-pedal-pad'])expect(cabin.some(n=>n.id===id)).toBe(true);expect(cabin.some(n=>n.id==='e34auto:case')).toBe(false);
  for(const change of review.changed)expect(model.nodes.find(n=>n.id===change.nodeId)?.thumbnail).toBeNull();
 });
 it('keeps geometry finite, export bounds honest and the additional asset under 4MB',()=>{
  expect(review.additionalAssetBytes).toBeLessThan(4*1024*1024);
  for(const change of review.changed){const object=group(change.nodeId),node=model.nodes.find(n=>n.id===change.nodeId)!;const bounds=new Box3().setFromObject(object);bounds.min.toArray().forEach((n,i)=>expect(n).toBeCloseTo(node.bounds!.min[i],5));bounds.max.toArray().forEach((n,i)=>expect(n).toBeCloseTo(node.bounds!.max[i],5));object.traverse(o=>{if(o instanceof Mesh){const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++)expect(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i))).toBe(true);}});}
  expect(review.fullyDimensionallyVerifiedComponents).toBe(0);
 });
 it('retains every archived pin and leaves the candidate out of production assets and registry',()=>{
  const archives=read(root+'/releases.json');for(const old of archiveBefore){expect(archives.find((r:{release:{revision:number}})=>r.release.revision===old.release.revision)?.release.sha256).toBe(old.release.sha256);for(const f of old.files)expect(sha(readFileSync(root+'/'+f.file))).toBe(f.sha256);}
  expect(referenceRelease(review.release.revision,accepted.id)).toBeNull();expect(referenceRelease(accepted.revision,accepted.id)).toEqual(accepted);expect(existsSync('public'+review.release.manifestUrl)).toBe(false);
 });
 it('admits only intact local archives to the disposable build registry',async()=>{
  const archives=read(root+'/releases.json');const queries:string[]=[];
  const sql=(query:string)=>{queries.push(query);if(query.startsWith('select sha256')){const revision=Number(query.match(/revision=(\d+)/)![1]);return archives.find((a:{release:{revision:number}})=>a.release.revision===revision).release.sha256;}return '';};
  expect(await registerReviewReferences(sql,root)).toBe(archives.length);
  expect(queries[0]).toContain('on conflict(id,revision) do nothing');
  const file=root+'/'+review.files.find((f:{type:string})=>f.type==='model/gltf-binary').file,bytes=readFileSync(file);queries.length=0;
  try{writeFileSync(file,Buffer.from('damaged model'));await expect(registerReviewReferences(sql,root)).rejects.toThrow('hash mismatch');expect(queries).toHaveLength(0);}finally{writeFileSync(file,bytes);}
 });
});
