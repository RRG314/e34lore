import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {basename,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {Box3,Group,Mesh,Matrix4} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {compressGeometryGlb} from './geometry/compress-glb.mjs';
import {baked} from './geometry/525i-visual-details.mjs';
import {addAutomaticGearbox,factorySources,gearboxSystem} from './geometry/525i-automatic-gearbox.mjs';
import {addMechanicalConnections} from './geometry/525i-mechanical-connections.mjs';
import {addEngineBay,airboxShift,engineBaySources} from './geometry/525i-engine-bay.mjs';
import {addSuspension,bayScope,frontScope,rearScope,suspensionSources} from './geometry/525i-suspension.mjs';

import {addM50Internals,engineScopes,engineSources} from './geometry/525i-m50-internals.mjs';
import {addCenterSupport} from './geometry/525i-center-support.mjs';
import {addTrim,trimScope,trimSources} from './geometry/525i-trim-and-fasteners.mjs';
import {addBrakeHydraulics,brakeHydraulics,brakeSources} from './geometry/525i-brake-hydraulics.mjs';
import {addParkingBrakes,parkingBrakeScope,parkingBrakeSource} from './geometry/525i-parking-brake.mjs';

import {addFrontWipers,e34WiperSource} from './geometry/525i-front-wipers.mjs';

const defaultRoot='work/525i-service-candidate';
const root=resolve(process.argv[2]||defaultRoot);
const bayAndSuspension=process.argv[5]==='--bay-and-suspension';
const engineAndTrim=process.argv[5]==='--engine-and-trim';
const brakeDetail=process.argv[5]==='--brake-detail';
const parkingDetail=process.argv[5]==='--parking-brake-detail';
const serviceParts=process.argv[5]==='--service-parts';
const brakeSystems=brakeDetail||parkingDetail||serviceParts;
const revision=Number(process.argv[3]||(serviceParts?1021:parkingDetail?1019:brakeDetail?1017:engineAndTrim?1012:bayAndSuspension?1009:1008));
const sourceRoot=resolve(process.argv[4]||defaultRoot);
const work=resolve('work')+'/';
if(!root.startsWith(work)||!sourceRoot.startsWith(work)||!Number.isInteger(revision)||revision<(serviceParts?1020:parkingDetail?1018:brakeDetail?1016:engineAndTrim?1012:bayAndSuspension?1009:1007)||revision>1999) {
  throw Error('Use a local work directory and a new mechanical review revision');
}

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=async path=>JSON.parse(await fs.readFile(path,'utf8'));
async function checked(path,sha256) {
  const bytes=await fs.readFile(path);
  if(hash(bytes)!==sha256)throw Error('Source hash mismatch: '+path);
  return bytes;
}
async function readArchives(path) {
  try{return await read(path+'/releases.json');}
  catch(error){if(error.code==='ENOENT')return [];throw error;}
}
const sourceArchives=await readArchives(sourceRoot);
const sourceRevision=serviceParts?1019:parkingDetail?1017:brakeDetail?1015:engineAndTrim?1011:bayAndSuspension?1008:1006;
const base=sourceArchives.find(a=>a.release.revision===sourceRevision);
if(!base)throw Error('Retain source revision '+sourceRevision+' first');
const model=JSON.parse(await checked(sourceRoot+'/'+basename(base.release.manifestUrl),base.release.sha256));
const catalog=model.catalog;
const originalFiles=[{url:base.base.manifestUrl,sha256:base.base.sha256},...base.base.assets];
if(brakeSystems){
  const published=await read('data/digital-twin/525i-service-release.json');
  const accepted=JSON.parse(await checked('public'+published.manifestUrl,published.sha256));
  originalFiles.push({url:published.manifestUrl,sha256:published.sha256},...accepted.assets);
  for(const asset of model.assets) {
    const publishedAsset=accepted.assets.find(entry=>entry.id===asset.id);
    if(brakeDetail&&publishedAsset?.sha256!==asset.sha256)throw Error('Review baseline differs from release 24: '+asset.id);
    if(!asset.url.startsWith('/models/e34-lore/r10'))continue;
    await checked(sourceRoot+'/'+basename(asset.url),asset.sha256);
  }
}
for(const asset of originalFiles)await checked('public'+asset.url,asset.sha256);
const exclusions=new Set((await read('data/catalog-position-exclusions.json')).excludedPositions);

await fs.mkdir(root,{recursive:true});
const validationPath=root+'/mechanical-validation.mjs';
await build({
  stdin:{contents:"export {parseReference} from './src/digital-twin/public/model.ts'",resolveDir:process.cwd()},
  bundle:true,platform:'node',format:'esm',packages:'external',outfile:validationPath,logLevel:'silent',
});
const {parseReference}=await import(pathToFileURL(validationPath));
parseReference(model);

const gearboxDatum=model.nodes.find(node=>node.id==='e34auto:bellhousing').matrix;
const assemblyRoot=new Group();
const changed=[];
const definitions=[];
const catalogPages=new Map();
const assetId=bayAndSuspension||engineAndTrim||brakeSystems?'authored:525i-bay-suspension':'authored:525i-mechanical-detail';
const note='Factory layout reference. Part shapes, tooth counts, routing and installed clearances are approximate.';
const sizeChecks=[];

const addedSystems=serviceParts ? [] : parkingDetail ? [[parkingBrakeScope,'Parking brakes','system:braking'],
  ['system:parking-brake-left','Left parking brake',parkingBrakeScope],
  ['system:parking-brake-right','Right parking brake',parkingBrakeScope],
] : brakeDetail ? [[brakeHydraulics,'Brake hydraulics','system:braking']] : engineAndTrim ? [...engineScopes,trimScope] : bayAndSuspension
  ? [[bayScope,'Engine bay','vehicle'],[frontScope,'Front suspension','system:suspension'],[rearScope,'Rear suspension','system:suspension']]
  : [[gearboxSystem,'Automatic gearbox','system:transmission']];
for(const [id,name,parentId] of addedSystems)model.nodes.push({
  id,name,parentId,kind:'system',systemIds:[],
  assetId:null,meshNames:[],matrix:new Matrix4().toArray(),bounds:null,internal:false,
  canonicalId:null,oem:null,guideIds:[],thumbnail:null,
});
const manual=(chapter,page,pdf,title,anchor)=>({
  chapter,page,pdf,title,printed:chapter+'-'+page,href:'/manual/'+chapter+'?pdf='+pdf+'#job-'+anchor,guides:[],
});
const outputSealManual=manual('240',17,253,'Torque converter and output seals','torque-converter-and-output-seals');
const parkingBrakeManual=manual('340',11,327,'Parking brake shoes','parking-brake-shoes');

function collect(id,name,draw,options={}) {
  const previous=model.nodes.find(node=>node.id===id);
  if(!previous&&!options.matrix&&!options.transmission)throw Error('Missing installed datum for '+id);
  const group=new Group();
  group.name='mechanical_'+id.replace(/[^a-z0-9]/gi,'_');
  draw(group);
  const meshGroup=baked(group);
  assemblyRoot.add(meshGroup);
  const box=new Box3().setFromObject(meshGroup);
  if(box.isEmpty())throw Error('Empty geometry for '+id);
  const bounds={min:box.min.toArray(),max:box.max.toArray()};
  const previousBinding=catalog.bindings[id];
  const node={
    ...previous,id,name,
    parentId:options.parentId??previous?.parentId,
    kind:options.kind==='set'?'component':previous?.kind||'component',
    systemIds:options.systems??previous?.systemIds,
    assetId,meshNames:[meshGroup.name],
    matrix:options.matrix??(options.transmission?gearboxDatum:previous.matrix),
    bounds,internal:options.internal??previous?.internal??false,
    canonicalId:null,oem:null,guideIds:[],thumbnail:null,
  };
  if(options.spread)node.gearbox={section:!!options.section,spread:options.spread};
  if(options.engine)node.engine=options.engine;
  if(options.trimCover)node.trimCover=true;
  if(previous)model.nodes[model.nodes.indexOf(previous)]=node;
  else model.nodes.push(node);
  let triangles=0;
  meshGroup.traverse(mesh=>{
    if(mesh instanceof Mesh)triangles+=(mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count)/3;
  });
  changed.push({id,name,replacement:!!previous,triangles});
  definitions.push({node,previous,previousBinding,options});
  if(id==='e34auto:output-seal')sizeChecks.push(checkRing(node,meshGroup,[38,58,10],'catalog-assembly-b851489b8de8676c447f9c42','24131218847'));
  if(id==='e34sys:center-bearing-insert')sizeChecks.push(checkRing(node,meshGroup,[30,55],'catalog-assembly-2c65f0c62b59f989ca691ff5','26121225071'));
}

function checkRing(node, group, listed, assemblyId, number) {
  let minRadius=Infinity;
  let maxRadius=0;
  group.traverse(mesh=>{
    if(!(mesh instanceof Mesh))return;
    const position=mesh.geometry.getAttribute('position');
    for(let i=0;i<position.count;i++) {
      const radius=Math.hypot(position.getY(i),position.getZ(i));
      minRadius=Math.min(minRadius,radius);
      maxRadius=Math.max(maxRadius,radius);
    }
  });
  const measured=[minRadius*2000,maxRadius*2000];
  if(listed.length===3)measured.push((node.bounds.max[0]-node.bounds.min[0])*1000);
  if(measured.some((value,i)=>Math.abs(value-listed[i])>.01))throw Error('Listed size mismatch for '+number);
  return {
    nodeId:node.id,canonicalId:'bmw-'+number,oem:number,kind:'catalog-size-only',
    displaySize:listed.join(' × ')+' mm',measuredMm:measured,listedMm:listed,
    source:catalog.assemblies[assemblyId].sourceUrl,sourceTitle:'BMW '+number,checkedOn:'2026-11-10',
    limitations:'The listed bore and outside diameter were checked'+(listed.length===3?', along with width.':'. Bearing width and ball count are approximate.')
      +' Mating tolerances and installed fit remain unmeasured.',
  };
}

if(brakeSystems){
  const previousAsset=model.assets.find(asset=>asset.id===assetId);
  const priorBytes=await checked(sourceRoot+'/'+basename(previousAsset.url),previousAsset.sha256);
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(priorBytes.buffer.slice(priorBytes.byteOffset,priorBytes.byteOffset+priorBytes.length),'');
  const oldGroups=new Map();
  gltf.scene.traverse(group=>{if(group.name)oldGroups.set(group.name,group);});
  const carryOver=[...gltf.scene.children];
  for(const child of carryOver)assemblyRoot.add(child);
  if(serviceParts)addFrontWipers(collect);
  else if(parkingDetail)addParkingBrakes(collect,model);
  else addBrakeHydraulics(collect,model);
  const replaced=new Set(definitions.flatMap(({previous})=>previous?.assetId===assetId?previous.meshNames:[]));
  for(const name of replaced){
    const group=oldGroups.get(name);
    if(!group?.parent)throw Error('Missing replaced geometry '+name);
    group.removeFromParent();
  }
  for(const check of base.checks) {
    const node=model.nodes.find(entry=>entry.id===check.nodeId);
    if(node.assetId===assetId){
      if(node.id!=='e34sys:center-bearing-insert')throw Error('Recheck the dimensioned part '+node.id);
      sizeChecks.push(checkRing(node,assemblyRoot.getObjectByName(node.meshNames[0]),[30,55],
        'catalog-assembly-2c65f0c62b59f989ca691ff5','26121225071'));
    }
  }
  model.assets=model.assets.filter(asset=>asset.id!==assetId);
}else if(engineAndTrim){
  const previousAsset=model.assets.find(asset=>asset.id===assetId);
  const priorBytes=await checked(sourceRoot+'/'+basename(previousAsset.url),previousAsset.sha256);
  const gltf=await new GLTFLoader().parseAsync(priorBytes.buffer.slice(priorBytes.byteOffset,priorBytes.byteOffset+priorBytes.length),'');
  for(const child of [...gltf.scene.children])assemblyRoot.add(child);
  addM50Internals(collect,model);
  addCenterSupport(collect);
  addTrim(collect,model);
  const covered=new Set(definitions.flatMap(({previous})=>previous?.assetId===assetId?previous.meshNames:[]));
  for(const child of [...assemblyRoot.children].slice(0,-changed.length))if(covered.has(child.name))assemblyRoot.remove(child);
  model.assets=model.assets.filter(asset=>asset.id!==assetId);
}else if(bayAndSuspension){
  for(const [id,,parent] of addedSystems){
    const node=model.nodes.find(n=>n.id===id);
    model.nodes.splice(model.nodes.indexOf(node),1);
    const after=id===bayScope?'system:engine':id===rearScope?frontScope:parent;
    model.nodes.splice(model.nodes.findIndex(n=>n.id===after)+1,0,node);
  }
  addSuspension(collect);
  addEngineBay(collect);
  const filter=model.nodes.find(n=>n.id==='e34sys:air-filter-element');
  airboxShift.forEach((delta,axis)=>{filter.matrix[12+axis]+=delta;});
  const bayContext=/^e34sys:(firewall$|chassis-rail-|front-fuse-relay-box$|electronics-box$|abs-hydraulic-unit$|radiator$|fan-shroud$|fan-coupling$|engine-cooling-fan$|expansion-tank$|upper-radiator-hose$|lower-radiator-hose$|heater-hoses$|front-top-mount-)/;
  const frontContext=/^(wheel:front-|e34sys:(hub-front-|brake-(disc|caliper|pad|shield|hose)-front-|tie-rod-|steering-gearbox$|steering-(center|idler|pitman|drag)))/;
  const rearContext=/^(wheel:rear-|e34sys:(hub-rear-|brake-(disc|caliper|pad|shield|hose)-rear-|parking-brake-shoes-|halfshaft-|differential-case$))/;
  for(const node of model.nodes.filter(n=>n.assetId)){
    if(node.id.startsWith('m50:')||bayContext.test(node.id))node.systemIds=[...new Set([...node.systemIds,bayScope])];
    if(frontContext.test(node.id))node.systemIds=[...new Set([...node.systemIds,frontScope])];
    if(rearContext.test(node.id))node.systemIds=[...new Set([...node.systemIds,rearScope])];
  }
}else{
  addAutomaticGearbox(collect);
  addMechanicalConnections(collect);
}

for(const {node,previous,previousBinding,options} of definitions) {
  const binding=options.keepBinding?{...previousBinding}:{
    nodeId:node.id,title:node.name,kind:options.kind||(options.catalog?'component':'reference'),
    assemblyIds:[],positions:[],manual:[],guideIds:[],
  };
  if(options.keepBinding) {
    node.canonicalId=previous?.canonicalId??null;
    node.oem=previous?.oem??null;
  }
  if(options.catalog) {
    const [assemblyId,...numbers]=options.catalog;
    const assembly=catalog.assemblies[assemblyId];
    if(!assembly)throw Error('Missing source assembly '+assemblyId);
    if(!catalogPages.has(assemblyId))catalogPages.set(assemblyId,JSON.parse(await checked('public'+assembly.url,assembly.sha256)));
    const rows=catalogPages.get(assemblyId).items.filter(row=>numbers.includes(row.number)&&!exclusions.has(row.id));
    for(const number of numbers)if(!rows.some(row=>row.number===number))throw Error('No ordering position for '+number);
    binding.assemblyIds=[assemblyId];
    binding.positions=rows.map(row=>({id:row.id,assemblyId,partId:row.partId,number:row.number}));
    binding.manual=assembly.manual;
    binding.guideIds=[...new Set(assembly.manual.flatMap(link=>link.guides))].filter(id=>catalog.guides[id]);
    if(numbers.length===1&&binding.kind==='component'){
      node.canonicalId=rows[0].partId;
      node.oem=rows[0].number;
    }
  }
  if(node.id==='e34auto:output-seal')binding.manual=[outputSealManual,...binding.manual.filter(link=>link.printed!==outputSealManual.printed)];
  if(parkingDetail)binding.manual=[parkingBrakeManual,...binding.manual];
  if(node.id==='e34sys:flexible-drive-coupling') {
    binding.positions=binding.positions.filter(position=>!['26111226881','26111229075'].includes(position.number));
    node.canonicalId=null;
    node.oem=null;
  }
  binding.title=node.name;
  binding.kind=options.kind??binding.kind;
  binding.note=options.note??note;
  if(options.visualSources)binding.visualSources=options.visualSources;
  catalog.bindings[node.id]=binding;
  node.guideIds=binding.guideIds;
}

for(const [id] of addedSystems)catalog.systems[id]=[...new Set(model.nodes.filter(n=>n.systemIds.includes(id))
  .flatMap(n=>catalog.bindings[n.id]?.assemblyIds||[]))];
if(serviceParts){
  const wheelhouse='catalog-assembly-fb0f3eb57dcb01276857a4ea';
  const shelf='catalog-assembly-e91dea00384504d6f1e68184';
  for(const [id,assemblyId,description] of [
    ['e34chassis:rear-tower-1',wheelhouse,'Left damper tower area in the rear wheelhouse drawing.'],
    ['e34chassis:rear-tower--1',wheelhouse,'Right damper tower area in the rear wheelhouse drawing.'],
    ['e34chassis:rear-package-tray',shelf,'Shelf trim and mounting area above the rear damper towers.'],
  ]){
    const node=model.nodes.find(entry=>entry.id===id);
    const assembly=catalog.assemblies[assemblyId];
    if(!node||!assembly)throw Error('Missing a rear body diagram: '+id);
    catalog.bindings[id]={nodeId:id,title:node.name,kind:'reference',note:description,
      assemblyIds:[assemblyId],positions:[],manual:assembly.manual,guideIds:[]};
  }
  model.limits+=' Front wiper arms and blades follow the late 525i windshield and catalog. Check your fitted blade adapter.';
}else if(parkingDetail){
  model.limits+=' Parking brake details show the drum-in-disc arrangement. Shoe dimensions and installed clearances are approximate.';
}else if(brakeDetail){
  model.limits+=' The brake hydraulics view shows the Girling booster and reservoir and a late ABS example. Mounting dimensions, line routing and clearance are approximate.';
}else if(engineAndTrim){
  model.reference='1995 BMW 525i automatic · Mechanical and trim reference';
  model.limits='Includes the M50TU engine and A4S 310R gearbox cutaways, engine bay, suspension and body trim. Original geometry follows catalog drawings and installed references. Shapes, timing profiles, mounting locations and clearances are approximate. Check the installed part and catalog conditions before ordering.';
}else if(bayAndSuspension){
  model.reference='1995 BMW 525i automatic · Mechanical reference';
  model.limits='M50TU engine bay, conventional front and rear suspension, and A4S 310R gearbox cutaway. Original meshes follow 1995 catalog illustrations and installed references. Component shapes, suspension pickup points, line routing and installed clearances are approximate. Check the original part and vehicle options before ordering.';
}else{
  model.reference='1995 BMW 525i automatic · A4S 310R mechanical reference';
  model.limits='The 525i reference includes the A4S 310R cutaway, gearbox mounts, cooler lines, driveshaft, cooling hoses and steering linkage. Original meshes follow factory illustrations and retained 1995 catalog entries. Gear profiles, friction plate counts, hydraulic passages, wiring and vehicle clearances are approximations. The converter and valve bodies show major components. Measured vehicle placement, overhaul tolerances and fitment require the installed hardware and its specifications.';
}

globalThis.FileReader=class{
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}
};
const exported=Buffer.from(await new GLTFExporter().parseAsync(assemblyRoot,{binary:true}));
if(brakeSystems){
  const json=JSON.parse(exported.subarray(20,20+exported.readUInt32LE(12)));
  for(const {node} of definitions){
    const [name]=node.meshNames;
    if(json.nodes.filter(entry=>entry.name===name).length!==1)throw Error('Duplicate or missing brake geometry '+name);
  }
}
const glb=engineAndTrim||brakeSystems?await compressGeometryGlb(exported):exported;
const assetLimit=(brakeSystems||engineAndTrim?8:6)*1024*1024;
if(glb.length>assetLimit)throw Error('Mechanical GLB exceeds its budget: '+glb.length+' bytes');
const assetHash=hash(glb);
const assetUrl='/models/e34-lore/r'+revision+'/'+assetHash+'.glb';
model.assets.push({id:assetId,url:assetUrl,bytes:glb.length,sha256:assetHash});
model.revision=revision;
catalog.modelRevision=revision;
catalog.coverage.renderable=model.nodes.filter(n=>n.assetId).length;
catalog.coverage.bound=Object.keys(catalog.bindings).length;
catalog.coverage.withCandidates=Object.values(catalog.bindings).filter(b=>b.positions.some(p=>!exclusions.has(p.id))).length;
parseReference(model);
const manifest=Buffer.from(JSON.stringify(model));
const manifestHash=hash(manifest);
const manifestName='manifest.'+manifestHash+'.json';
const release={...base.release,revision,sha256:manifestHash,manifestUrl:'/models/e34-lore/r'+revision+'/'+manifestName,
  renderableCount:catalog.coverage.renderable,assetBytes:model.assets.reduce((sum,a)=>sum+a.bytes,0)};
const replacedChecks = new Set(sizeChecks.map(check => check.nodeId));
const checks=[...base.checks.filter(check => !replacedChecks.has(check.nodeId)),...sizeChecks.map(check=>({...check,referenceId:model.id,assetSha256:assetHash}))]
  .map(check=>({...check,revision,manifestSha256:manifestHash}));
const files=[
  {url:assetUrl,file:assetHash+'.glb',sha256:assetHash,type:'model/gltf-binary'},
  {url:release.manifestUrl,file:manifestName,sha256:manifestHash,type:'application/json'},
];
const report={
  schema:1,localOnly:true,base:base.base,sourceRevision:base.release.revision,release,files,checks,changed,
  visualSourceReferences:serviceParts?[e34WiperSource]:parkingDetail?[parkingBrakeSource]:brakeDetail?Object.values(brakeSources):engineAndTrim?[...engineSources,...trimSources]:Object.values(bayAndSuspension?{...engineBaySources,...suspensionSources}:factorySources),
  additionalAssetBytes:glb.length,
};
const archives=new Map(sourceArchives.map(a=>[a.release.revision,a]));
for(const old of await readArchives(root)){
  if(archives.has(old.release.revision)&&archives.get(old.release.revision).release.sha256!==old.release.sha256) {
    throw Error('Archived revision conflict');
  }
  archives.set(old.release.revision,old);
}
if(archives.has(revision)&&archives.get(revision).release.sha256!==manifestHash)throw Error('Choose a new revision for changed bytes');

async function immutable(name,bytes){
  const path=root+'/'+name;
  try{await fs.writeFile(path,bytes,{flag:'wx'});}
  catch(error){
    if(error.code!=='EEXIST')throw error;
    if(!(await fs.readFile(path)).equals(bytes))throw Error('Archived file changed: '+name);
  }
}
for(const archive of sourceArchives)for(const file of archive.files){
  await immutable(file.file,await checked(sourceRoot+'/'+file.file,file.sha256));
}
await immutable(files[0].file,glb);
await immutable(manifestName,manifest);
archives.set(revision,report);
for(const [name,value] of [['releases.json',[...archives.values()]],['geometry-checks.json',checks],['review.json',report],['release.json',release]]){
  const path=root+'/'+name;
  await fs.writeFile(path+'.tmp',JSON.stringify(value,null,2)+'\n');
  await fs.rename(path+'.tmp',path);
}
console.log(JSON.stringify({
  revision,renderables:release.renderableCount,replaced:changed.filter(node=>node.replacement).length,
  added:changed.filter(node=>!node.replacement).length,bytes:glb.length,triangles:changed.reduce((sum,node)=>sum+node.triangles,0),
  checkedSizes:sizeChecks.map(check=>check.displaySize),
}));
