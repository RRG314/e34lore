import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Group, Matrix4, Box3, Mesh, Vector3} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildE30Mechanical,buildE30PanelHardware} from './e30-325i-geometry.mjs';
import {buildE30Getrag} from './e30-getrag-260.mjs';
import {buildE30Cabin} from './e30-cabin.mjs';
import {factoryDimensions} from './e30-325i-dimensions.mjs';
import {buildE30Exterior,paint} from './e30-325i-exterior.mjs';
import {buildE30EngineBay} from './e30-325i-engine-bay.mjs';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {compressGeometryGlb} from '../geometry/compress-glb.mjs';

const [source='work/e30/catalog.json', rev='1104'] = process.argv.slice(2);
const revision = Number(rev);
if (!Number.isInteger(revision) || revision < 1101 || revision > 1999) throw Error('Expected an E30 review revision');
const read = async file => JSON.parse(await fs.readFile(file,'utf8'));
const hash = data => createHash('sha256').update(data).digest('hex');
const root = 'work/e30/assets';
const catalog = await read(source);
const context = catalog.catalog_inventory.find(row => row.name === '1991 325i Coupe' && row.selection?.platform === 'E30');
if (!context) throw Error('Expected a verified 1991 325i Coupe source selection');
const assemblies = new Map(catalog.assemblies.filter(a => a.catalog_context_id === context.id)
  .map(a => [new URL(a.source_url).pathname.split('/').at(-1).replace(/\.html$/, ''),a]));
const positions = new Map();
for (const row of catalog.part_assembly_positions.filter(row => row.context_id === context.id)) {
  if (!positions.has(row.assembly_id)) positions.set(row.assembly_id, []);
  positions.get(row.assembly_id).push(row);
}
const identity = new Matrix4().toArray();
const nodes = [];
const exteriorMesh = new Group();
const exteriorId = 'e30:325i-exterior';
const rootMesh = new Group();
const hardwareMesh = new Group();
const cabinMesh = new Group();
const bayMesh = new Group();
const bayId = 'e30:engine-bay';
const getragMesh = new Group();
const getragId = 'e30:getrag-260';
const wheelMesh = new Group();
const wheelId = 'e30:cross-spoke-wheels';
const cabinId = 'e30:cabin';
const hardwareId = 'e30:panel-hardware';
const assetId = 'e30:325i-mechanical';
const id = 'e30-325i-coupe-manual';
const geometryPrefix = '/models/e30-lore/r'+revision+'/';
const system = {
  engine:'Engine', 'engine-bay':'Engine bay', transmission:'Clutch and gearbox', 'manual-gearbox':'Getrag 260 gearbox', driveshaft:'Driveshaft',
  differential:'Differential', cooling:'Cooling', suspension:'Suspension',
  'front-suspension':'Front suspension', 'rear-suspension':'Rear suspension',
  braking:'Brakes', underbody:'Underbody', fuel:'Fuel', exhaust:'Exhaust', interior:'Cabin',
  body:'Body and panels', exterior:'Exterior trim',
};
const makeNode = (id,name,parentId,kind,systemIds) =>
  ({id,name,parentId,kind,systemIds,assetId:null,meshNames:[],matrix:identity,bounds:null,
    internal:false,canonicalId:null,oem:null,guideIds:[],thumbnail:null});
nodes.push(makeNode('vehicle','1991 BMW 325i Coupe · mechanical reference',null,'vehicle',[]));
for (const [key,name] of Object.entries(system)) nodes.push(makeNode('system:'+key,name,'vehicle','system',[]));
const bodySystems = ['system:body','system:exterior'];
const systemsByScope = new Map([['e30body:assembly',bodySystems]]);
nodes.push(makeNode('e30body:assembly','Body shell and panels','vehicle','assembly',bodySystems));
const pageAliases = {
  oil_pan:'oil_pan_oil_level_indicator',
  intake_manifold:'intake_manifold_system',
  timing_gear_timing_belt:'timing_and_valve_train_tooth_belt',
  radiator:'radiator_frame',
  fan_fan_coupling:'cooling_system_fan_fan_coupling',
  rear_axle_drive:'rear_axle_drive',
};
function scope(key,label,systems,parent='vehicle') {
  const id='e30assembly:'+key, ids=systems.map(key=>'system:'+key);
  systemsByScope.set(id,ids);
  nodes.push(makeNode(id,label,parent,'assembly',ids));
  return id;
}
function add(parent,key,label,location,displayDirection,draw,options={}) {
  const bodyRoot = parent === 'e30body:assembly';
  const doorSide = /^e30body:door-(left|right)$/.exec(parent)?.[1];
  const oldDoorKey = doorSide && ['mirror','door-glass'].includes(key);
  const nodeId = bodyRoot ? 'e30body:'+key : oldDoorKey ? 'e30body:'+key+'-'+doorSide : parent+':'+key;
  const group=new Group();
  group.name=nodeId.replaceAll(':','_');
  draw(group);
  // Place the authored assemblies inside the artist shell while keeping the
  // crank/flywheel axis fixed. These are visual packaging adjustments.
  const engineHeightScale = parent === 'e30assembly:engine' ? .70 : 1;
  const coolingHeightScale = parent === 'e30assembly:radiator-pack' ? .82 : 1;
  const heightScale = engineHeightScale * coolingHeightScale;
  const pivot = engineHeightScale < 1 ? .45 : .49;
  if (heightScale < 1) {
    group.scale.y = heightScale;
    location = [location[0], pivot + (location[1] - pivot) * heightScale, location[2]];
  }
  if (!group.children.length) throw Error('Empty model '+nodeId);
  const bounds=new Box3().setFromObject(group);
  const assembly=assemblies.get(options.page)||assemblies.get(pageAliases[options.page]);
  const candidates=assembly && options.row ? (positions.get(assembly.id)||[])
    .filter(p=>p.parts.number_normalized === options.row || p.source_name.toLowerCase() === options.row) : [];
  const identities=new Set(candidates.map(p=>p.part_id));
  const exact=identities.size===1?candidates[0]:null;
  const body = parent.startsWith('e30body:');
  const exterior = options.exterior;
  const systems = systemsByScope.get(parent);
  const modelSystems = [...systems, ...(options.cabin && body ? ['system:interior'] : []), ...(options.systems ?? [])];
  const [asset, root] = exterior ? [exteriorId,exteriorMesh] : options.cabin ? [cabinId,cabinMesh]
    : options.wheel ? [wheelId,wheelMesh] : options.engineBay ? [bayId,bayMesh] : options.getrag ? [getragId,getragMesh] : body ? [hardwareId,hardwareMesh] : [assetId,rootMesh];
  root.add(group);
  if (body) systemsByScope.set(nodeId,systems);
  nodes.push({
    ...makeNode(nodeId,label,parent,'part',modelSystems),
    assetId:asset, meshNames:[group.name], matrix:new Matrix4().makeTranslation(...location).toArray(),
    bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}, displayDirection, internal:!!options.internal,
    ...(options.cabin || options.cabinVisible ? {cabinVisible:true} : {}),
    ...(options.cabinGlazing ? {cabinGlazing:true} : {}),
    ...(options.paintSurface ? {paintSurface:true} : {}),
    ...(options.gearbox ? {gearbox:options.gearbox} : {}),
    canonicalId:exact?.part_id ?? null, oem:exact?.parts.number_normalized ?? null,
    ...(assembly ? {sourceContext:{contextId:context.id, assemblyId:assembly.id, positionId:candidates.length===1?exact?.id:undefined}} : {}),
  });
}
buildE30Exterior((parent,key,label,location,direction,draw,options)=>
  add(parent,key,label,location,direction,draw,{...options,exterior:true}));
buildE30Mechanical(add,scope);
buildE30Getrag(add,scope);
buildE30EngineBay(add,scope,paint);
buildE30PanelHardware(add);
buildE30Cabin(add,scope);
const bodyEnvelope = new Box3();
for (const node of nodes.filter(node => node.bounds && !node.internal && !node.id.includes('mirror'))) {
  const bounds = new Box3(new Vector3(...node.bounds.min), new Vector3(...node.bounds.max));
  bodyEnvelope.union(bounds.applyMatrix4(new Matrix4().fromArray(node.matrix)));
}
const wheelCenter = corner => new Vector3().setFromMatrixPosition(
  new Matrix4().fromArray(nodes.find(node => node.id === 'e30assembly:'+corner+':wheel').matrix),
);
const frontLeft = wheelCenter('front-left'), frontRight = wheelCenter('front-right');
const rearLeft = wheelCenter('rear-left'), rearRight = wheelCenter('rear-right');
const envelopeSize = bodyEnvelope.getSize(new Vector3());
const measuredDimensions = {
  length: envelopeSize.x,
  width: envelopeSize.z,
  unloadedHeight: envelopeSize.y,
  wheelbase: frontLeft.x - rearLeft.x,
  frontOverhang: bodyEnvelope.max.x - frontLeft.x,
  rearOverhang: rearLeft.x - bodyEnvelope.min.x,
  frontTrack: frontRight.z - frontLeft.z,
  rearTrack: rearRight.z - rearLeft.z,
};
for (const [dimension, measured] of Object.entries(measuredDimensions)) {
  if (Math.abs(measured - factoryDimensions[dimension]) > .002) {
    throw Error('Installed 325i '+dimension+' is outside the 2 mm modeling tolerance: '+measured);
  }
}
globalThis.FileReader=class {
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}
  async readAsDataURL(blob){this.result='data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onloadend?.();}
};
async function geometryAsset(rootMesh, id) {
  const raw=Buffer.from(await new GLTFExporter().parseAsync(rootMesh,{binary:true}));
  const bytes=await compressGeometryGlb(raw);
  if(bytes.length>8*1024*1024)throw Error('Geometry exceeds the viewer asset limit');
  const sha256=hash(bytes);
  const url=geometryPrefix+sha256+'.glb';
  await fs.mkdir(root+geometryPrefix,{recursive:true});
  await fs.writeFile(root+url,bytes);
  return {id,url,bytes:bytes.length,sha256};
}
function mergeByMaterial(root) {
  for(const part of root.children){
    const surfaces=new Map();
    part.updateMatrixWorld(true);
    for(const mesh of part.children){
      const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrix);
      if(!surfaces.has(mesh.material))surfaces.set(mesh.material,[]);
      surfaces.get(mesh.material).push(geometry);
    }
    part.clear();
    for(const [material,geometries] of surfaces){
      const merged=mergeGeometries(geometries);
      if(!merged)throw Error('Geometry cannot be batched: '+part.name);
      part.add(new Mesh(mergeVertices(merged),material));
    }
  }
}
mergeByMaterial(cabinMesh);
mergeByMaterial(exteriorMesh);
mergeByMaterial(wheelMesh);
mergeByMaterial(bayMesh);
mergeByMaterial(getragMesh);
const exteriorAsset=await geometryAsset(exteriorMesh,exteriorId);
const mechanicalAsset=await geometryAsset(rootMesh,assetId);
const hardwareAsset=await geometryAsset(hardwareMesh,hardwareId);
const cabinAsset=await geometryAsset(cabinMesh,cabinId);
const wheelAsset=await geometryAsset(wheelMesh,wheelId);
const bayAsset=await geometryAsset(bayMesh,bayId);
const getragAsset=await geometryAsset(getragMesh,getragId);
const reference='1991 BMW 325i Coupe · M20B25 · Getrag 260';
const catalogPrefix = '/catalog/workshop/e30-325i-coupe-1991/r'+revision+'/';
await fs.mkdir(root+catalogPrefix,{recursive:true});
async function catalogAsset(value) {
  const bytes=Buffer.from(JSON.stringify(value)), sha256=hash(bytes);
  const url=catalogPrefix+sha256+'.json';
  await fs.writeFile(root+url,bytes);
  return {url,sha256,bytes:bytes.length};
}

const catalogAssemblies={}, catalogSystems={}, bindings={}, searchItems=[];
const selectedSystems = new Map();
for (const node of nodes) {
  if (!node.sourceContext) continue;
  const {assemblyId}=node.sourceContext;
  selectedSystems.set(assemblyId,[...new Set([...(selectedSystems.get(assemblyId)||[]),...node.systemIds])]);
}
const wiring = (url,pdf,printed,title) =>
  [{chapter:'EWD',page:pdf,pdf,printed,title,href:url+'#page='+pdf,guides:[],kind:'wiring'}];
const etm89 = 'https://www.e30club.ru/stuff/electric/e30_89.pdf';
const etm91 = 'https://www.5021.tips/ujanja/wp-content/uploads/2023/10/BMW-325i-e30m3-1991-elektrical-troubleshooting-manual-1.pdf';
const wiringByAssembly = {
  instruments:wiring(etm89,65,'6210-0','1989 325i instrument cluster wiring'),
  various_switches:wiring(etm89,58,'5133-2','1989 325i two-door window switch wiring'),
  roof_box:wiring(etm89,69,'6216-0','1989 325i active check control wiring'),
  electrical_sliding_lifting_roof_operation:wiring(etm89,59,'5413-0','1989 325i power sunroof wiring'),
  fuse_box:wiring(etm89,12,'0670-0','1989 325i / 325is power distribution box'),
  rear_light:wiring(etm91,12,'6314-0','1991 325i parking, tail and marker lamps'),
};
const centerGuide='e30-driveshaft-center-support';
const lampGuide='e30-rear-lamp-bulb', oilGuide='e30-oil-service', coolingGuide='e30-cold-cooling-inspection';
const repairLinks = new Map([
  ['e30assembly:propeller:center-mount',centerGuide],
  ['e30body:tail-light-left',lampGuide], ['e30body:tail-light-right',lampGuide],
  ['e30assembly:engine:rocker-cover',oilGuide], ['e30assembly:engine:sump',oilGuide],
  ['e30assembly:engine-bay:expansion-tank',coolingGuide], ['e30assembly:radiator-pack:hoses',coolingGuide],
]);
const guideMetadata = {
  [centerGuide]:{title:'Driveshaft center support',kind:'Service reference',status:'reference',sourceChecked:true},
  [lampGuide]:{title:'Replace a rear lamp bulb',kind:'Replacement steps',status:'draft',sourceChecked:true},
  [oilGuide]:{title:'Plan an M20 oil and filter service',kind:'Service reference',status:'draft',sourceChecked:true},
  [coolingGuide]:{title:'E30 cold cooling-system visual inspection',kind:'Inspection',status:'draft',sourceChecked:true},
};
for (const assembly of assemblies.values()) {
  const items=(positions.get(assembly.id)||[]).filter(row=>row.active).map(row=>({
    id:row.id,partId:row.part_id,number:row.parts.number_normalized,name:row.source_name,reference:row.reference,
    quantity:row.required_quantity,packageQuantity:row.package_quantity,
    conditions:row.conditions,replacedBy:[],recordHash:row.record_sha256,
  }));
  if (!items.length) continue;
  const systemIds=selectedSystems.get(assembly.id)||[];
  const sourceSha256=positions.get(assembly.id)[0].source_sha256;
  const key = new URL(assembly.source_url).pathname.split('/').at(-1);
  const manual = wiringByAssembly[key.replace(/\.html$/,'')] || [];
  const asset=await catalogAsset({
    schemaVersion:1,contextId:context.id,assemblyId:assembly.id,title:assembly.title,sourceUrl:assembly.source_url,
    sourceSha256,sourceSelection:context.name,sourceConditions:assembly.boundary,unselectedOptions:'See original source conditions.',items,
  });
  catalogAssemblies[assembly.id]={
    id:assembly.id,title:assembly.title,category:assembly.source_category,key,
    contextId:context.id,sourceUrl:assembly.source_url,sourceSha256,itemCount:items.length,systemIds,manual,...asset,
  };
  for(const sys of systemIds) (catalogSystems[sys]??=[]).push(assembly.id);
  for(const item of items) searchItems.push({partId:item.partId,number:item.number,name:item.name,assemblyId:assembly.id,positionId:item.id});
}
for(const node of nodes){
  if(!node.sourceContext||!catalogAssemblies[node.sourceContext.assemblyId])continue;
  const {assemblyId}=node.sourceContext;
  const guide=repairLinks.get(node.id);
  const gearboxDrawing = node.gearbox && (node.internal || node.gearbox.section);
  bindings[node.id]={
    nodeId:node.id,title:node.name,kind:node.oem?'component':'reference',note:node.oem?'Compare the source callout and its application conditions.':'Source assembly for this modeled location.',
    assemblyIds:[assemblyId],positions:(positions.get(assemblyId)||[]).filter(row=>row.active&&row.part_id===node.canonicalId)
      .map(row=>({assemblyId,id:row.id,number:row.parts.number_normalized,partId:row.part_id})),
    manual:catalogAssemblies[assemblyId].manual,
    ...(gearboxDrawing ? {visualSources:[{title:'BMW factory Getrag 260 section drawing',url:'https://e30mpower.com/23%20-%20Manual%20Transmission/23-165.jpg'}]} : {}),
    guideIds:guide?[guide]:[],
  };
}
const catalogIndex={
  schemaVersion:1,modelId:id,modelRevision:revision,context:{id:context.id,name:context.name,scope:context.scope},
  assemblies:catalogAssemblies,systems:catalogSystems,bindings,
  guides:guideMetadata,
  search:await catalogAsset({schemaVersion:1,contextId:context.id,items:searchItems}),
  coverage:{renderable:nodes.filter(node=>node.assetId).length,bound:Object.keys(bindings).length,
    withCandidates:Object.values(bindings).filter(binding=>binding.positions.length).length,
    sourcePages:context.imported_pages,expectedPages:context.expected_pages,sourcePositions:searchItems.length,
    distinctNumbers:new Set(searchItems.map(item=>item.number)).size},
};
const manifest={
  schemaVersion:1,id,revision,reference,nodes,mechanicalExplosion:true,studioLighting:true,catalog:catalogIndex,
  assets:[exteriorAsset,mechanicalAsset,hardwareAsset,cabinAsset,wheelAsset,bayAsset,getragAsset],
  cabin:{
    driver:{position:[-.235,1.114,-.348],target:[.533,.867,-.239]},
    rear:{position:[-1.035,1.10,0],target:[.510,.814,0]},
    movement:{min:[-1.18,.69,-.535],max:[.42,1.196,.535]},
  },
  vehicleReference:{id,year:1991,model:'325i',body:'Coupe',engine:'M20',transmission:'Manual'},
  credit:{author:'E34 Lore',url:'https://e34lore.com/e30',license:'E34 Lore viewer geometry',licenseUrl:'https://e34lore.com/terms'},
  limits:'Stock 1991 US-market 325i two-door body with separate late-style bumpers, doors, glass, and narrow quarter panels. The left-hand-drive cabin shows comfort seats, airbag wheel, five-speed shifter and power sunroof. Overall body dimensions and axle positions follow BMW’s 325i owner’s handbook. Individual surfaces and mechanical details are modeled from photos and catalog diagrams. The Getrag 260 has sectional and exploded views based on BMW drawings. Gear teeth and individual mechanical dimensions are illustrative. Use your catalog and manual to identify parts and service the car.',
};
if(manifest.assets.reduce((sum,asset)=>sum+asset.bytes,0)>24*1024*1024)
  throw Error('E30 reference exceeds the viewer geometry budget');
const bytes=Buffer.from(JSON.stringify(manifest)), digest=hash(bytes);
const manifestUrl=geometryPrefix+'manifest.'+digest+'.json';
await fs.mkdir(root+geometryPrefix,{recursive:true});
await fs.writeFile(root+manifestUrl,bytes);
const release={id,revision,manifestUrl,sha256:digest,renderableCount:nodes.filter(n=>n.assetId).length,
  assetBytes:manifest.assets.reduce((total,a)=>total+a.bytes,0),label:'325i Coupe · Manual',year:1991,model:'325i',body:'Coupe',engine:'M20',transmission:'Manual',contextId:context.id};
const archivesPath='work/e30/releases.json';
let archives=[];
try { archives=await read(archivesPath); }
catch(error){ if(error.code!=='ENOENT')throw error; }
const existing=archives.find(entry=>entry.revision===revision);
if(existing&&existing.sha256!==release.sha256)throw Error('Use a new revision for changed E30 model data');
if(!existing){
  archives.push(release);
  await fs.writeFile(archivesPath,JSON.stringify(archives,null,2)+'\n');
}
await fs.writeFile('work/e30/release.json',JSON.stringify(release,null,2)+'\n');
console.log(JSON.stringify({release,measuredDimensions,sourceBound:nodes.filter(n=>n.sourceContext).length,exactCandidates:nodes.filter(n=>n.oem).length}));
