/** Add fitted moving panels to the local Workshop references. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, DoubleSide, Group, Matrix4, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { compressGeometryGlb } from './geometry/compress-glb.mjs';
import { cutCabinOpenings } from './geometry/cut-cabin-openings.mjs';
import { appendGeometry, compactPart } from './geometry/local-cabin-glb.mjs';
import { immutable, localReferenceTools, nameOf, readJson, replaceJson, sha } from './geometry/local-reference-review.mjs';
import { e30LuggageFloor, e30TrunkPartition, e34GloveDoor, gloveBin, gloveOpening, spareCompartment, trunkHinge, trunkLidTrim } from './geometry/openable-compartments.mjs';
import { fuelDoorFit } from './geometry/fuel-door-fit.mjs';

globalThis.FileReader=class {
  async readAsArrayBuffer(blob) {this.result=await blob.arrayBuffer();this.onloadend?.();}
};
const material=new MeshStandardMaterial({side:DoubleSide});
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .register(()=>({name:'inspect-panel-geometry',loadMaterial:()=>Promise.resolve(material)}));
async function readScene(bytes) {
  const {scene}=await loader.parseAsync(Uint8Array.from(bytes).buffer,'');
  scene.updateMatrixWorld(true);
  return scene;
}
const identity=new Matrix4().toArray();
const {parseReference,members,planFor,separationOffset}=await localReferenceTools();
const targets=[
  {series:'e34',root:'work/525i-service-candidate',prior:1036,interim:[1037,1038,1039,1040],revision:1041},
  {series:'e30',root:'work/e30',prior:1154,interim:[1155,1156,1157],revision:1158},
];

async function prepare({series,root,prior,interim,revision}) {
  const e30=series==='e30', pinPath=root+'/release.json', archivePath=root+'/releases.json';
  const archive=await readJson(archivePath), current=await readJson(pinPath);
  assert([prior,...interim,revision].includes(current.revision));
  const receipt=row=>e30?row:row.release;
  const base=archive.find(row=>receipt(row).revision===prior);
  assert(base);
  const initial=receipt(base);
  const path=url=>e30?root+'/assets'+url:/^\/models\/e34-lore\/r1\d{3}\//.test(url)?root+'/'+nameOf(url):'public'+url;
  const prefix=`/models/${series}-lore/r${revision}/`, pending=[], appearanceAssets=[];
  async function checked(url,digest,length) {
    const bytes=await fs.readFile(path(url));
    assert.equal(sha(bytes),digest,url);
    if(length!==undefined) assert.equal(bytes.length,length,url);
    return bytes;
  }
  const model=JSON.parse(await checked(initial.manifestUrl,initial.sha256));
  const original=structuredClone(model);
  const find=id=>{
    const node=model.nodes.find(node=>node.id===id);
    assert(node,id);
    return node;
  };
  const asset=id=>{
    const item=model.assets.find(asset=>asset.id===id);
    assert(item,id);
    return item;
  };
  function replaceAsset(item,bytes) {
    const digest=sha(bytes);
    Object.assign(item,{url:prefix+digest+'.glb',sha256:digest,bytes:bytes.length});
    pending.push({url:item.url,sha256:digest,type:'model/gltf-binary',bytes});
  }

  const trim=asset(e30?'e30:battery-details':'authored:525i-service-study');
  const group=new Group();
  function install(node,mesh) {
    mesh.name=node.id.replaceAll(':','_').replaceAll('-','_')+'_opening';
    compactPart(mesh);
    group.add(mesh);
    const bounds=new Box3().setFromObject(mesh);
    Object.assign(node,{assetId:trim.id,meshNames:[mesh.name],matrix:identity,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
  }
  const dashboard=find(e30?'e30assembly:cabin:dashboard':'e34sys:dashboard');
  const gloveId=e30?'e30assembly:cockpit:glove-box':'e34trim:glove-box-door';
  const carpetId=e30?'e30trim:trunk-carpet':'e34trim:luggage-floor-carpet';
  const carpet=find(carpetId), carpetBinding=model.catalog.bindings[carpetId];
  const gloveSource=Object.values(model.catalog.assemblies).find(entry=>entry.title==='Glove Box');
  const trunkFloorSource=Object.values(model.catalog.assemblies).find(entry=>/floor panel trunk|trunk floor/i.test(entry.title))
    ??model.catalog.assemblies[carpetBinding.assemblyIds[0]];
  assert(gloveSource&&trunkFloorSource);
  const glovePage=JSON.parse(await checked(gloveSource.url,gloveSource.sha256,gloveSource.bytes));
  const glovePositions=glovePage.items.filter(item=>/glove box|hinge/i.test(item.name))
    .map(({id,number,partId})=>({id,number,partId,assemblyId:gloveSource.id}));
  const gloveManual=e30?model.catalog.bindings[gloveId].manual:[{
    chapter:'513',page:4,pdf:360,printed:'513-4',title:'Glovebox service',href:'/manual/513',guides:[],
  }];
  function addPart({id,name,parentId,systemIds,mesh,source,manual,note,positions=[],displayDirection,cabinVisible}) {
    const node={id,name,parentId,kind:'component',systemIds,assetId:trim.id,meshNames:[],matrix:identity,bounds:null,
      internal:false,canonicalId:null,oem:null,guideIds:[],thumbnail:null,displayDirection,cabinVisible,
      sourceContext:{contextId:model.catalog.context.id,assemblyId:source.id}};
    if(mesh) install(node,mesh);
    model.nodes.push(node);
    model.catalog.bindings[id]={nodeId:id,title:name,kind:'reference',note,assemblyIds:[source.id],positions,manual,guideIds:[]};
    model.catalog.systems[systemIds[0]]=[...new Set([...(model.catalog.systems[systemIds[0]]??[]),source.id])];
  }
  if(!e30) {
    const body=asset(dashboard.assetId), bytes=await checked(body.url,body.sha256,body.bytes);
    const scene=await readScene(bytes);
    const cut=cutCabinOpenings(bytes,dashboard,scene.getObjectByName(dashboard.meshNames[0]),[gloveOpening]);
    appearanceAssets.push({oldHash:body.sha256,newHash:sha(cut)});
    replaceAsset(body,cut);
    addPart({id:gloveId,name:'Glove box door and latch',parentId:dashboard.id,
      systemIds:['system:dashboard-trim','system:interior'],mesh:e34GloveDoor(),source:gloveSource,manual:gloveManual,
      note:'Check the glove box trim against the interior and passenger airbag options.',positions:glovePositions,
      displayDirection:[-.27,.13,.36],cabinVisible:true});
  } else {
    install(carpet,e30LuggageFloor());
  }
  addPart({id:series+'trim:glove-box-bin',name:'Glove box storage liner',parentId:dashboard.id,
    systemIds:['system:dashboard-trim','system:interior'],mesh:gloveBin(e30),source:gloveSource,manual:gloveManual,
    note:'Storage cavity and liner. The door opens separately.',displayDirection:[.25,.13,.44],cabinVisible:true});
  const {tray,wheel,fastener}=spareCompartment(e30);
  const wellId=e30?'e30trim:spare-wheel-well':'e34sys:luggage-floor', wheelId=series+'trim:spare-wheel';
  if(e30) {
    addPart({id:wellId,name:'Luggage floor and spare-wheel well',parentId:'system:luggage-trim',
      systemIds:['system:luggage-trim','system:body'],mesh:tray,source:trunkFloorSource,manual:carpetBinding.manual,
      note:'Pressed floor and recessed spare-wheel well.',displayDirection:[.04,-.28,0]});
    addPart({id:'e30trim:luggage-front-liner',name:'Luggage compartment front liner',parentId:'system:luggage-trim',
      systemIds:['system:luggage-trim','system:interior'],mesh:e30TrunkPartition(),source:model.catalog.assemblies[carpetBinding.assemblyIds[0]],
      manual:carpetBinding.manual,note:'Fitted panel behind the rear seat.',displayDirection:[.26,.24,0]});
  } else install(find(wellId),tray);
  const wheelSource=Object.values(model.catalog.assemblies).find(entry=>/steel rim|steel wheel/i.test(entry.title))??trunkFloorSource;
  addPart({id:wheelId,name:'Spare wheel and tire',parentId:wellId,
    systemIds:['system:luggage-trim','system:interior'],mesh:wheel,source:wheelSource,manual:carpetBinding.manual,
    note:'Example spare wheel. Use the actual wheel and tire markings to check size and fit.',displayDirection:[-.22,.43,0]});
  addPart({id:series+'trim:spare-wheel-retainer',name:'Spare-wheel retaining screw',parentId:wheelId,
    systemIds:['system:luggage-trim','system:interior'],mesh:fastener,source:trunkFloorSource,manual:carpetBinding.manual,
    note:'Center retainer for the spare wheel.',displayDirection:[-.19,.59,0]});
  carpet.name='Spare-wheel cover and luggage carpet';
  carpetBinding.title=carpet.name;

  const body=series+'body:', trunk=body+'trunk';
  const fuel=fuelDoorFit(e30), fuelDoorId=body+'fuel-door', fuelRecessId=series+'trim:fuel-filler-pocket';
  const quarter=find(body+'rear-quarter-right'), exterior=asset(quarter.assetId);
  const patch=pending.find(file=>file.sha256===exterior.sha256);
  const bodyBytes=patch?.bytes??await checked(exterior.url,exterior.sha256,exterior.bytes);
  const bodyScene=await readScene(bodyBytes), quarterMesh=bodyScene.getObjectByName(quarter.meshNames[0]);
  const [x0,y0]=fuel.opening.low, [x1,y1]=fuel.opening.high;
  const name=series+'_fuel_filler_flap';
  const cut=mesh=>cutCabinOpenings(bodyBytes,quarter,mesh,[fuel.opening],{
    extract:name,
    ...(e30?{sourceIndex:150,keepTriangle:triangle=>!triangle.every(([x,y])=>x>x0-.001&&x<x1+.001&&y>y0-.001&&y<y1+.001)}:{}),
  });
  const patched=cut(e30?quarterMesh.getObjectByName('mesh_112'):quarterMesh);
  if(e30) {
    // Remove the old raised seam overlay, retaining the separate rub strip.
    const length=patched.readUInt32LE(12), doc=JSON.parse(patched.subarray(20,20+length));
    const primitive=doc.meshes[114].primitives[0], index=doc.accessors[primitive.indices];
    assert.equal(index.count,2628);
    const source=quarterMesh.getObjectByName('mesh_114');
    const geometry=source.geometry, pos=geometry.attributes.position, filtered=[];
    for(let i=0;i<geometry.index.count;i+=3){
      const triangle=[0,1,2].map(j=>geometry.index.getX(i+j));
      if(triangle.some(index=>pos.getY(index)<.6)) filtered.push(...triangle);
    }
    assert(filtered.length&&filtered.length<2628);
    const data=patched.subarray(28+length);
    const packed=Buffer.from(Uint16Array.from(filtered).buffer);
    const offset=data.length;
    primitive.indices=doc.accessors.push({bufferView:doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:packed.length,target:34963})-1,
      componentType:5123,count:filtered.length,type:'SCALAR'})-1;
    const pad=Buffer.alloc((4-packed.length%4)%4);
    doc.buffers[0].byteLength=offset+packed.length+pad.length;
    const json=Buffer.from(JSON.stringify(doc)), jsonPad=Buffer.alloc((4-json.length%4)%4,32);
    const header=Buffer.from(patched.subarray(0,20)), chunk=Buffer.alloc(8);
    header.writeUInt32LE(28+json.length+jsonPad.length+doc.buffers[0].byteLength,8);
    header.writeUInt32LE(json.length+jsonPad.length,12);
    chunk.writeUInt32LE(doc.buffers[0].byteLength,0);
    chunk.writeUInt32LE(0x004e4942,4);
    replaceAsset(exterior,Buffer.concat([header,json,jsonPad,chunk,data,packed,pad]));
  } else {
    pending.splice(pending.indexOf(patch),1);
    appearanceAssets[0].newHash=sha(patched);
    replaceAsset(exterior,patched);
  }
  const fuelSource=Object.values(model.catalog.assemblies).find(entry=>entry.title==='Side Panel / Tail Trim');
  assert(fuelSource);
  const fuelPage=JSON.parse(await checked(fuelSource.url,fuelSource.sha256,fuelSource.bytes));
  const fuelNumbers=e30?['51171906579','51171888370']:['51171928317','51171928197','51711928172'];
  const fuelManual=e30?[{chapter:'41',page:0,pdf:0,printed:'index',title:'Bodywork service literature',href:'/manual/41',guides:[]}]
    :[{chapter:'400',page:0,pdf:0,printed:'index',title:'Body and trim service literature',href:'/manual/400',guides:[]}];
  function fuelPart(id,label,parentId,mesh,number,direction) {
    const positions=fuelPage.items.filter(row=>row.number===number).map(({id,number,partId})=>({id,number,partId,assemblyId:fuelSource.id}));
    addPart({id,name:label,parentId,systemIds:quarter.systemIds,mesh,source:fuelSource,manual:fuelManual,
      note:'Right rear fuel filler assembly.',positions,displayDirection:direction});
    if(positions.length===1) Object.assign(find(id),{oem:number,canonicalId:positions[0].partId,
      sourceContext:{contextId:model.catalog.context.id,assemblyId:fuelSource.id,positionId:positions[0].id}});
  }
  fuelPart(fuelDoorId,'Fuel filler door',quarter.id,null,fuelNumbers[0],[-.3,.4,.82]);
  const flap=find(fuelDoorId), extracted=await readScene(pending.find(file=>file.sha256===exterior.sha256).bytes);
  const flapBox=new Box3().setFromObject(extracted.getObjectByName(name));
  assert(!flapBox.isEmpty());
  Object.assign(flap,{assetId:exterior.id,meshNames:[name],matrix:quarter.matrix,paintSurface:true,
    bounds:{min:flapBox.min.toArray(),max:flapBox.max.toArray()}});
  fuelPart(series+'trim:fuel-door-hinge','Fuel door hinge',fuelDoorId,fuel.hinge,fuelNumbers[1],[-.26,.56,.81]);
  fuelPart(fuelRecessId,'Fuel filler pocket and cap',quarter.id,fuel.recess,fuelNumbers[2],[.22,.28,.78]);
  const trunkSource=Object.values(model.catalog.assemblies).find(entry=>/trunk lid.*closing|single components for trunk lid/i.test(entry.title))
    ??model.catalog.assemblies[carpetBinding.assemblyIds[0]];
  if(!e30) {
    for(const [side,sign] of [['left',-1],['right',1]]) {
      addPart({id:`e34trim:trunk-hinge-${side}`,name:`${side==='left'?'Left':'Right'} trunk hinge`,parentId:trunk,
        systemIds:['system:luggage-trim','system:body-trim'],mesh:trunkHinge(false,sign),source:trunkSource,manual:carpetBinding.manual,
        note:'The hinge arm follows the trunk lid at its body-side pin.',displayDirection:[-.34,.37,sign*.36]});
    }
  } else {
    for(const [side,sign] of [['left',-1],['right',1]]) {
      const hinge=find(trunk+':hinge-'+side);
      install(hinge,trunkHinge(true,sign));
    }
  }
  addPart({id:series+'trim:trunk-lid-inner',name:e30?'Trunk lid inner reinforcement':'Trunk lid tool tray',
    parentId:trunk,systemIds:['system:luggage-trim',e30?'system:body':'system:body-trim'],mesh:trunkLidTrim(e30),source:trunkSource,
    manual:carpetBinding.manual,note:'Underside of the trunk lid.',displayDirection:[-.32,.34,0]});
  const geometry=await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(group,{binary:true})));
  const trimBytes=appendGeometry(await checked(trim.url,trim.sha256,trim.bytes),geometry);
  const trimScene=await readScene(trimBytes);
  replaceAsset(trim,trimBytes);
  const measurementScenes=new Map([[trim.id,trimScene]]);
  async function fittedMeshes(node) {
    const item=asset(node.assetId);
    if(!measurementScenes.has(item.id)) {
      const file=pending.find(file=>file.sha256===item.sha256);
      measurementScenes.set(item.id,await readScene(file?.bytes??await checked(item.url,item.sha256,item.bytes)));
    }
    const scene=measurementScenes.get(item.id), world=new Matrix4().fromArray(node.matrix), meshes=[];
    for(const name of node.meshNames) scene.getObjectByName(name).traverse(source=>{
      if(!source.isMesh) return;
      const mesh=new Mesh(source.geometry,material);
      mesh.matrixAutoUpdate=false;
      mesh.matrix.multiplyMatrices(world,source.matrixWorld);
      mesh.updateMatrixWorld(true);
      meshes.push(mesh);
    });
    assert(meshes.length,node.id);
    return meshes;
  }
  const covers=await fittedMeshes(carpet), spare=await fittedMeshes(find(wheelId)), floor=await fittedMeshes(find(wellId));
  for(const dx of [-.22,0,.22]) for(const z of [-.13,0,.13]){
    const x=(e30?-1.658:-1.883)+dx;
    const ray=new Raycaster(new Vector3(x,.8,z),new Vector3(0,-1,0));
    const cover=ray.intersectObjects(covers)[0], tire=ray.intersectObjects(spare)[0], well=ray.intersectObjects(floor)[0];
    assert(cover&&tire&&well&&cover.distance<tire.distance&&tire.distance<well.distance,'Spare wheel must sit under the cover and inside the well');
  }
  if(!e30) {
    const ray=new Raycaster(new Vector3(-1.405,.7,0),new Vector3(0,-1,0));
    assert(ray.intersectObjects(floor).length,'Luggage floor must meet the front liner');
    const dash=await fittedMeshes(dashboard);
    for(const y of [.63,.67,.72]) for(const z of [.21,.40,.59]){
      const ray=new Raycaster(new Vector3(.3,y,z),new Vector3(1,0,0),0,.38);
      assert(!ray.intersectObjects(dash).length,'Dashboard obstructs the glove box aperture');
    }
  }

  const zero=[0,0,0], up=[0,1,0], lateral=[0,0,1];
  const door=(key,label,x,z,angle)=>({id:body+key,label,pivot:[x,.548,z],axis:up,angle,slide:zero});
  model.openingPanels=[
    ...(e30?[door('door-left','Left door',.804,-.735,-61),door('door-right','Right door',.804,.735,61)]:
      [door('front-door-left','Front left door',.674,-.759,-58),door('front-door-right','Front right door',.674,.759,58),
       door('rear-door-left','Rear left door',-.326,-.759,-58),door('rear-door-right','Rear right door',-.326,.759,58)]),
    {id:body+'hood',label:'Hood',pivot:e30?[1.923,.722,0]:[1.97,.758,0],axis:lateral,angle:-53,
      slide:e30?[.078,.018,0]:[.104,.035,0]},
    {id:trunk,label:'Trunk',pivot:e30?[-1.568,.833,0]:[-1.818,1.024,0],axis:lateral,angle:-66,slide:zero,
      camera:{position:e30?[-3.35,1.86,.16]:[-3.74,1.96,.17],target:e30?[-1.70,.84,0]:[-1.94,.88,0]}},
    {id:body+'sunroof',label:'Sunroof',pivot:zero,axis:up,angle:0,slide:e30?[-.542,-.066,0]:[-.565,-.061,0]},
    {id:gloveId,label:'Glove box',pivot:e30?[.534,.615,.388]:[.674,.611,.403],axis:lateral,angle:57,slide:zero,
      camera:{position:e30?[-.112,1.134,.172]:[-.168,1.134,.154],target:e30?[.505,.672,.395]:[.532,.676,.413]}},
    {id:carpetId,label:'Spare-wheel cover',requires:trunk,pivot:e30?[-1.312,.447,0]:[-1.318,.512,0],axis:lateral,
      angle:-67,slide:zero,camera:{position:e30?[-2.68,1.77,.13]:[-3.08,1.86,.14],target:e30?[-1.68,.51,0]:[-1.91,.57,0]}},
    {id:fuelDoorId,label:'Fuel door',pivot:fuel.pivot,axis:up,angle:92,slide:zero,camera:fuel.camera},
  ];
  if(e30) {
    for(const node of model.nodes.filter(node=>/:hinge-(left|right)$|:(?:upper|lower)-hinge$/.test(node.id)&&node.id.startsWith(body)))
      node.internal=false;
  }
  for(const panel of model.openingPanels) {
    const node=find(panel.id);
    assert(node.assetId);
    assert(members(model,'vehicle').has(node.id));
    assert.deepEqual(separationOffset(planFor(model,'vehicle',node),0),zero);
  }
  model.revision=model.catalog.modelRevision=revision;
  const rendered=model.nodes.filter(node=>node.assetId);
  model.catalog.coverage.renderable=rendered.length;
  model.catalog.coverage.bound=rendered.filter(node=>model.catalog.bindings[node.id]).length;
  model.catalog.coverage.withCandidates=rendered.filter(node=>model.catalog.bindings[node.id]?.positions.length).length;
  try {
    parseReference(model);
  } catch(error) {
    throw new Error(`${series.toUpperCase()} r${revision}: ${error.message}`);
  }
  const assetBytes=model.assets.reduce((sum,a)=>sum+a.bytes,0);
  for(const item of model.assets) {
    if(!pending.some(file=>file.sha256===item.sha256)) await checked(item.url,item.sha256,item.bytes);
  }
  const bytes=Buffer.from(JSON.stringify(model)), digest=sha(bytes);
  const release={...initial,revision,sha256:digest,manifestUrl:prefix+'manifest.'+digest+'.json',renderableCount:rendered.length,assetBytes};
  const existing=archive.find(row=>receipt(row).revision===revision);
  if(existing) assert.equal(receipt(existing).sha256,digest);
  pending.push({url:release.manifestUrl,sha256:digest,type:'application/json',bytes});
  const checks=(base.checks??[]).map(check=>{
    const node=find(check.nodeId);
    return {...check,revision,manifestSha256:digest,assetSha256:asset(node.assetId).sha256};
  });
  const record=e30?release:{schema:1,localOnly:true,sourceRevision:prior,base:initial,release,checks,
    files:pending.map(({url,sha256,type})=>({url,file:nameOf(url),sha256,type})),
    changed:model.nodes.filter(node=>JSON.stringify(node)!==JSON.stringify(original.nodes.find(old=>old.id===node.id))).map(node=>node.id)};
  console.log(series.toUpperCase(),revision,JSON.stringify({panels:model.openingPanels.length,assetBytes,change:assetBytes-initial.assetBytes}));
  return async()=>{
    if(appearanceAssets.length) {
      // The dash cut keeps the other meshes and material slots in the same GLB.
      const path='data/build-studio/appearance-targets.json', appearance=await readJson(path);
      let updated=false;
      for(const {oldHash,newHash} of appearanceAssets) for(const list of [...Object.values(appearance.targets),appearance.paintSurfaceRegions]) {
        for(const target of list.filter(entry=>entry.assetSha256===oldHash)) {
          if(list.some(entry=>entry.assetSha256===newHash&&entry.nodeIds.join()===target.nodeIds.join())) continue;
          list.push({...target,assetSha256:newHash});
          updated=true;
        }
      }
      if(updated) await replaceJson(path,appearance);
    }
    for(const file of pending) await immutable(path(file.url),file.bytes);
    if(!existing) await replaceJson(archivePath,[...archive,record]);
    if(!e30) await replaceJson(root+'/review.json',record);
    await replaceJson(pinPath,release);
  };
}

const writes=[];
for(const target of targets) writes.push(await prepare(target));
if(!process.argv.includes('--check')) for(const write of writes) await write();
