/** Local component study. Accepted manifests/GLBs remain immutable. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

const root=resolve(process.argv[2]||'work/525i-service-candidate'),revision=1001;
if(!root.startsWith(resolve('work')+'/'))throw Error('Candidate output must stay in the local work directory');
await fs.mkdir(root,{recursive:true});
let priorReview=null,archives=[];
try{priorReview=JSON.parse(await fs.readFile(root+'/review.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
try{archives=JSON.parse(await fs.readFile(root+'/releases.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const accepted=await read('data/digital-twin/525i-automatic-reference.json');
const original=await fs.readFile('public'+accepted.manifestUrl);
if(sha(original)!==accepted.sha256)throw Error('Accepted manifest changed');
const model=JSON.parse(original),originalAssets=[];
for(const asset of model.assets){const bytes=await fs.readFile('public'+asset.url);if(sha(bytes)!==asset.sha256)throw Error('Accepted asset changed');originalAssets.push({url:asset.url,sha256:asset.sha256});}
await build({stdin:{contents:"export {parseReference} from './src/digital-twin/public/model.ts'",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:root+'/validation.mjs',logLevel:'silent'});
const {parseReference}=await import(pathToFileURL(root+'/validation.mjs'));
parseReference(model);

// Manufacturer outer envelope: C 33 130, L325 x W150 x H57 mm.
// Pleat count, edge construction, housing clearances and installed location are illustrative.
const L=.325,W=.150,H=.057,rim=.007;
const group=new T.Group();group.name='filter_element_c33130';
const seal=new T.MeshStandardMaterial({color:'#ba773c',roughness:.88});
const paper=new T.MeshStandardMaterial({color:'#d5bb89',roughness:.98,side:T.DoubleSide});
const part=(geometry,material,position)=>{const mesh=new T.Mesh(geometry,material);mesh.position.set(...position);group.add(mesh);return mesh;};
for(const z of [-1,1])part(new T.BoxGeometry(L,rim,rim),seal,[0,(H-rim)/2,z*(W-rim)/2]);
for(const x of [-1,1])part(new T.BoxGeometry(rim,rim,W-2*rim),seal,[x*(L-rim)/2,(H-rim)/2,0]);
const vertices=[],normals=[],uvs=[],folds=64,paperL=L-2*rim,paperW=W-2*rim;
for(let i=0;i<folds*2;i++){
 const x0=-paperL/2+paperL*i/(folds*2),x1=-paperL/2+paperL*(i+1)/(folds*2),y0=i%2?-H/2:H/2-rim,y1=i%2?H/2-rim:-H/2;
 const a=new T.Vector3(x0,y0,-paperW/2),b=new T.Vector3(x1,y1,-paperW/2),c=new T.Vector3(x1,y1,paperW/2),d=new T.Vector3(x0,y0,paperW/2),normal=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a)).normalize();
 for(const [v,u,w]of [[a,0,0],[b,1,0],[c,1,1],[a,0,0],[c,1,1],[d,0,1]]){vertices.push(...v.toArray());normals.push(...normal.toArray());uvs.push(u,w);}
}
const pleats=new T.BufferGeometry();pleats.setAttribute('position',new T.Float32BufferAttribute(vertices,3));pleats.setAttribute('normal',new T.Float32BufferAttribute(normals,3));pleats.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));part(pleats,paper,[0,0,0]);
group.updateMatrixWorld(true);
const measured=new T.Box3().setFromObject(group),size=measured.getSize(new T.Vector3()).multiplyScalar(1000).toArray();
if(size.some((n,i)=>Math.abs(n-[325,57,150][i])>.01))throw Error('Filter envelope mismatch');
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const glb=Buffer.from(await new GLTFExporter().parseAsync(group,{binary:true})),assetHash=sha(glb),assetId='authored:525i-service-study';
const assetUrl=`/models/e34-lore/r${revision}/${assetHash}.glb`;
const immutable=async(name,bytes)=>{try{const old=await fs.readFile(root+'/'+name);if(!old.equals(bytes))throw Error('Immutable candidate bytes changed');}catch(error){if(error.code!=='ENOENT')throw error;await fs.writeFile(root+'/'+name,bytes,{flag:'wx'});}};
await immutable(assetHash+'.glb',glb);
const housing=model.nodes.find(n=>n.id==='e34sys:airbox');
// Preserve the reference location; modestly widen the illustrative housing to
// contain the checked element. This is not a measured housing reconstruction.
const matrix=new T.Matrix4().fromArray(housing.matrix).multiply(new T.Matrix4().makeScale(1.16,1,1));housing.matrix=matrix.toArray();
const filterMatrix=new T.Matrix4().fromArray(housing.matrix);
// The source envelope must not inherit the housing's display-only scale.
filterMatrix.scale(new T.Vector3(1/1.16,1,1));filterMatrix.multiply(new T.Matrix4().makeTranslation(0,.02,0));
const node={id:'e34sys:air-filter-element',name:'Air-filter element · M50 525i',parentId:housing.id,kind:'component',systemIds:[...housing.systemIds],assetId,meshNames:[group.name],matrix:filterMatrix.toArray(),bounds:{min:measured.min.toArray(),max:measured.max.toArray()},internal:true,canonicalId:'bmw-13721730918',oem:'13721730918',guideIds:['engine-air-filter-replacement'],thumbnail:null};
model.assets.push({id:assetId,url:assetUrl,bytes:glb.length,sha256:assetHash});model.nodes.push(node);model.revision=revision;
model.reference='1995 BMW 525i automatic · local service-detail candidate';
model.limits+=' Local candidate: air-filter element outer size follows MANN-FILTER C 33 130. Pleat construction, housing shape/scale and installed placement remain illustrative. Accepted revision 23 is unchanged.';
model.credits=[...(model.credits||[]),{author:'E34 Lore · original procedural component study',url:'https://e34lore.com/copyright',license:'Original study; local review only',licenseUrl:'https://e34lore.com/copyright'}];
const catalog=model.catalog;catalog.modelRevision=revision;
const parentBinding=catalog.bindings[housing.id];
const positions=parentBinding.positions.filter(p=>['13721726916','13721730918'].includes(p.number));
if(positions.length!==2)throw Error('Expected the two retained source element positions');
const guide='engine-air-filter-replacement';if(!catalog.guides[guide])throw Error('Missing existing authored air-filter guide');
catalog.bindings[node.id]={nodeId:node.id,title:'Air-filter element',kind:'component',note:'Outer size follows MANN-FILTER C 33 130. Match the installed housing and source conditions; this is an illustrated element, not fitment confirmation.',assemblyIds:[...parentBinding.assemblyIds],positions,manual:[{chapter:'020',page:10,pdf:32,printed:'020-10',href:'/manual/020?pdf=32',title:'Engine air-filter replacement',guides:[guide]}],guideIds:[guide]};
catalog.coverage.renderable=model.nodes.filter(n=>n.assetId).length;catalog.coverage.bound=Object.keys(catalog.bindings).length;catalog.coverage.withCandidates=Object.values(catalog.bindings).filter(b=>b.positions.length).length;
parseReference(model);
const bytes=Buffer.from(JSON.stringify(model)),manifestHash=sha(bytes),manifestName=`manifest.${manifestHash}.json`;
await immutable(manifestName,bytes);
const release={...accepted,revision,manifestUrl:`/models/e34-lore/r${revision}/${manifestName}`,sha256:manifestHash,renderableCount:catalog.coverage.renderable,assetBytes:model.assets.reduce((n,a)=>n+a.bytes,0)};
const existingChecks=await read('data/digital-twin/geometry-checks.json');
const checks=existingChecks.checks.filter(c=>c.referenceId===accepted.id&&c.revision===accepted.revision).map(c=>({...c,revision,manifestSha256:manifestHash}));
checks.push({referenceId:accepted.id,revision,manifestSha256:manifestHash,nodeId:node.id,assetSha256:assetHash,canonicalId:node.canonicalId,oem:node.oem,kind:'outer-envelope-only',measuredMm:size,listedMm:[325,57,150],displaySize:'325 × 150 × 57 mm',source:'https://www.mann-filter.com/uk-en/catalogue/search-results/product.html/c33130_mann-filter.html',sourceTitle:'MANN-FILTER C 33 130',checkedOn:'2026-11-10',limitations:'Outer dimensions only. Pleat count, sealing geometry, housing clearances, installed placement and vehicle fitment are not verified.'});
const review={schema:1,localOnly:true,base:{...accepted,assets:originalAssets},release,files:[{url:assetUrl,file:assetHash+'.glb',sha256:assetHash,type:'model/gltf-binary'},{url:release.manifestUrl,file:manifestName,sha256:manifestHash,type:'application/json'}],checks,checkedEnvelope:{nodeId:node.id,measuredMm:size},illustrative:['Installed placement','Housing display scale','Pleat count and sealing detail','Mounting interfaces'],dimensionsVerifiedComponents:0};
for(const entry of [priorReview,review].filter(Boolean)){
 const existing=archives.find(old=>old.release.id===entry.release.id&&old.release.revision===entry.release.revision);
 if(existing&&existing.release.sha256!==entry.release.sha256)throw Error('Candidate revision changed. Increment its revision and retain the prior receipt.');
 if(!existing)archives.push(entry);
 else if(entry===review&&existing.release.sha256===release.sha256)archives=archives.map(old=>old===existing?review:old);
}
const atomicJSON=async(name,value)=>{await fs.writeFile(root+'/'+name+'.tmp',JSON.stringify(value,null,2)+'\n');await fs.rename(root+'/'+name+'.tmp',root+'/'+name);};
await atomicJSON('geometry-checks.json',checks);await atomicJSON('releases.json',archives);await atomicJSON('review.json',review);
await fs.writeFile(root+'/release.json.tmp',JSON.stringify(release,null,2)+'\n');await fs.rename(root+'/release.json.tmp',root+'/release.json');
if(sha(await fs.readFile('public'+accepted.manifestUrl))!==accepted.sha256)throw Error('Accepted reference mutated');
for(const a of originalAssets)if(sha(await fs.readFile('public'+a.url))!==a.sha256)throw Error('Accepted asset mutated');
console.log(JSON.stringify({revision,renderables:release.renderableCount,checkedElementMm:size,acceptedBytesUnchanged:true,assetBytes:glb.length}));
