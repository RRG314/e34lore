import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, CylinderGeometry, DoubleSide, Group, LatheGeometry, Matrix4, Mesh, MeshStandardMaterial, Vector2 } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { compactPart } from '../geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from '../geometry/compress-glb.mjs';
import { immutable, localReferenceTools, readJson, replaceJson, sha } from '../geometry/local-reference-review.mjs';
import { patch, lerp } from './e30-exterior-surfaces.mjs';
import { paint } from './e30-325i-exterior.mjs';

const base = await readJson('data/digital-twin/e30-candidate.json');
assert.equal(base.revision, 1182, 'Review the variant fit against the new base revision first');
const bytes = await fs.readFile('public' + base.manifestUrl);
assert.equal(sha(bytes), base.sha256);
const stock = JSON.parse(bytes);
const { parseReference } = await localReferenceTools();
const catalog = Object.values(stock.catalog.assemblies);
const metal = new MeshStandardMaterial({name:'Cast aluminum',color:0x969c9e,metalness:.46,roughness:.55,side:DoubleSide});
const steel = new MeshStandardMaterial({name:'Steel',color:0x585c59,metalness:.70,roughness:.40});
const rubber = new MeshStandardMaterial({name:'Black trim',color:0x181a19,roughness:.72,side:DoubleSide});
const white = new MeshStandardMaterial({name:'Selector legend',color:0xece6d6,roughness:.45});
const identity = new Matrix4().toArray();

function addMesh(group, geometry, material, location) {
  const mesh = new Mesh(geometry,material);
  mesh.position.set(...location);
  group.add(mesh);
  return mesh;
}
function box(group, size, location, material, radius=.004) {
  return addMesh(group,new RoundedBoxGeometry(...size,2,radius),material,location);
}
function lathe(group, section, position, material) {
  const mesh=addMesh(group,new LatheGeometry(section.map(([x,r])=>new Vector2(r,x)),48),material,position);
  mesh.rotation.z=-Math.PI/2;
}
function bolts(group,x,r,count) {
  for(let i=0;i<count;i++){
    const angle=2*Math.PI*i/count;
    addMesh(group,new CylinderGeometry(.009,.009,.012,6),steel,[x,r*Math.cos(angle),r*Math.sin(angle)]).rotation.z=Math.PI/2;
  }
}
const autoSystem='system:automatic-gearbox';
const automaticCase= 'housing_parts_lubrication_system_zf_4hp22_24';
const automaticBox= 'automatic_gearbox_4hp22';
const assembly = 'e30assembly:automatic';
const cabin = 'e30assembly:cabin-floor';
const archive = 'https://www.billswebspace.com/BMW%20E30%20Owner%20Manual%20%28325i-325is%29.pdf';

const automatic = {
  id:'e30-325i-coupe-automatic', revision:1183, transmission:'Automatic', label:'325i Coupe · Automatic',
  description:'1991 BMW 325i Coupe · M20B25 · ZF 4HP22',
  limits:'The 4HP22 illustrates the assembled case, pan, filter, hydraulic control and converter. The internal gear train and cooler line route are outside this reference.',
  removed:n=>n.assetId==='e30:getrag-260'||n.id==='system:manual-gearbox'||n.id==='e30assembly:gearbox'||n.id==='e30trim:manual-shift-knob'
    ||[cabin+':shifter',cabin+':clutch',cabin+':brake'].includes(n.id),
  async draw({add, model}){
    const system = id=>({id,name:'ZF 4HP22 automatic',parentId:id===autoSystem?'vehicle':autoSystem,kind:id===autoSystem?'system':'assembly',
      systemIds:['system:transmission',autoSystem],assetId:null,meshNames:[],matrix:identity,bounds:null,internal:false,canonicalId:null,oem:null,guideIds:[],thumbnail:null});
    model.nodes.push(system(autoSystem),system(assembly));
    model.catalog.systems[autoSystem]=[];
    const motor=[.68,.408,0], center=[.475,.377,0];
    await add(assembly,'bellhousing','4HP22 converter housing',motor,[-.05,-.14,-.46],g=>{
      lathe(g,[[0,.103],[.055,.13],[.117,.174],[.152,.182],[.165,.179],[.165,.16],[.148,.16],[.09,.143],[0,.09]], [0,0,0],metal);
      bolts(g,.169,.168,8);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;const rib=box(g,[.120,.016,.024],[.086,.145*Math.cos(a),.145*Math.sin(a)],metal);rib.rotation.x=a;}
    },automaticCase,'24411216157');
    await add(assembly,'case','4HP22 transmission case',center,[.05,.33,0],g=>{
      lathe(g,[[-.209,.073],[-.172,.09],[-.08,.116],[.12,.126],[.20,.119],[.224,.102],[.22,.093],[-.197,.066]], [0,0,0],metal);
      for(const side of [-1,1])for(let i=0;i<6;i++)
        box(g,[.022,.111,.024],[-.14+i*.055,-.016,side*(.083+i*.006)],metal);
      bolts(g,.211,.107,8);
    },automaticCase,'24111217343');
    await add(assembly,'tail','4HP22 rear extension and output flange',[.18,.349,0],[-.28,.23,.27],g=>{
      lathe(g,[[-.078,.031],[-.071,.061],[-.045,.065],[-.037,.043],[.011,.049],[.033,.063],[.087,.078],[.094,.079],[.094,.057]], [0,0,0],metal);
      lathe(g,[[-.075,.025],[-.075,.06],[-.057,.06],[-.057,.025]],[-.018,0,0],steel);
      bolts(g,-.087,.045,3);
    },'output_zf_4hp22_24_h');
    await add(assembly,'converter','Torque converter',[.769,.421,0],[.19,.21,.40],g=>{
      lathe(g,[[-.067,.029],[-.046,.031],[-.04,.11],[-.029,.14],[-.008,.149],[.031,.145],[.043,.118],[.046,.047],[.054,.025]], [0,0,0],steel);
      bolts(g,.041,.114,3);
    },automaticBox,'24411215762',true);
    await add(assembly,'pan','Automatic transmission oil pan',[.463,.238,0],[0,-.35,0],g=>{
      box(g,[.414,.055,.244],[0,-.011,0],steel,.014);
      box(g,[.433,.012,.269],[0,.023,0],metal);
      for(const z of [-.124,.124])for(let i=0;i<7;i++)
        addMesh(g,new CylinderGeometry(.006,.006,.012,6),steel,[-.191+i*.064,.025,z]);
      for(const z of [-.054,0,.054])box(g,[.324,.009,.019],[-.008,-.039,z],steel);
    },automaticCase,'24111215935');
    await add(assembly,'drain-plug','Automatic transmission sump plug',[.350,.198,0],[.08,-.47,.14],g=>{
      addMesh(g,new CylinderGeometry(.011,.011,.009,6),steel,[0,-.005,0]);
      addMesh(g,new CylinderGeometry(.014,.014,.003,24),metal,[0,0,0]);
    },automaticCase,'24111421387');
    await add(assembly,'valve-body','4HP22 hydraulic valve body',[.475,.292,0],[.08,-.25,-.35],g=>{
      box(g,[.332,.028,.200],[0,0,0],metal,.008);
      for(const z of [-.065,-.026,.013,.052])box(g,[.29,.012,.025],[0,-.018,z],metal);
      for(let i=0;i<7;i++)for(const z of [-.083,.083])
        addMesh(g,new CylinderGeometry(.008,.008,.014,6),steel,[-.136+i*.045,-.016,z]);
      for(const x of [-.11,.10])box(g,[.045,.020,.14],[x,-.021,0],metal);
    },'control_unit_attaching_parts_zf_4hp22_24_h',undefined,true);
    await add(assembly,'filter','4HP22 transmission oil strainer',[.486,.265,0],[-.12,-.28,.37],g=>{
      box(g,[.178,.022,.138],[0,0,0],steel,.012);
      box(g,[.156,.005,.115],[.004,-.012,0],metal,.009);
      addMesh(g,new CylinderGeometry(.024,.023,.014,32),rubber,[-.036,.013,.017]);
    },'control_unit_attaching_parts_zf_4hp22_24_h',undefined,true);
    await add(cabin,'auto-selector','Automatic selector and position gate',[.161,.548,0],[.19,.97,.27],g=>{
      box(g,[.172,.013,.133],[0,0,0],rubber,.010);
      box(g,[.151,.004,.024],[0,.008,-.020],steel);
      const shaft=addMesh(g,new CylinderGeometry(.008,.009,.096,16),steel,[.041,.057,-.020]);shaft.rotation.z=.12;
      box(g,[.046,.026,.089],[.036,.104,-.014],rubber,.012);
      box(g,[.015,.012,.012],[.036,.104,-.057],steel);
      for(let i=0;i<7;i++)box(g,[.002,.001,i===3?.014:.009],[.062-i*.021,.008,.037],white);
    },undefined,undefined,false,{cabinVisible:true,visualSources:[{title:'BMW owner handbook · automatic selector',url:archive}]});
    await add(cabin,'auto-brake','Wide automatic brake pedal',[.518,.449,-.411],[.16,.39,-.22],g=>{
      box(g,[.018,.055,.111],[0,0,0],rubber);
      box(g,[.017,.177,.020],[.036,.083,0],steel).rotation.z=-.36;
      for(let i=-2;i<=2;i++)box(g,[.003,.0025,.096],[-.009,i*.009,0],rubber);
    },'pedals_stop_light_switch','35211154729',false,{cabinVisible:true});
  },
};

const spoiler = {
  id:'e30-325i-coupe-rear-spoiler', revision:1184, equipment:'Rear lip spoiler', transmission:'Manual',
  label:'325i Coupe · Rear lip spoiler', description:'1991 BMW 325i Coupe · Manual · BMW rear lip spoiler',
  limits:'This configuration adds the BMW accessory rear lip to the late coupe.',
  removed:()=>false,
  async draw({add}){
    await add('e30body:trunk','rear-lip','BMW trunk lip spoiler',[0,0,0],[-.26,.86,0],g=>{
      const point=(u,v)=>{
        const a=2*u-1, z=a*.681, sweep=.060*a*a, taper=1-.12*Math.abs(a)**6;
        const x=lerp(-2.105,-1.962,v)+sweep;
        const y=.831+.009*(1-a*a)+.037*taper*Math.sin(Math.PI*v)**.71+.003*(1-v);
        return [x,y,z];
      };
      patch(g,paint,point,64,24);
      patch(g,rubber,(u,v)=>{const [x,y,z]=point(u,v);return [x,y-.020*Math.sin(Math.PI*v)**.60-.004,z];},64,18);
      for(const u of [0,1])patch(g,paint,(v,t)=>{const [x,y,z]=point(u,v);return [x,y-(.020*Math.sin(Math.PI*v)**.60+.004)*t,z];},24,6);
    },'rear_spoiler','51711967950',false,{paintSurface:true,cabinVisible:true});
  },
};

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) { this.result=await blob.arrayBuffer(); this.onloadend?.(); }
};
const pins=[];
for(const variant of [automatic,spoiler]){
  const {id,revision,transmission,label,equipment}=variant;
  const model=structuredClone(stock);
  model.id=model.vehicleReference.id=model.catalog.modelId=id;
  model.revision=model.catalog.modelRevision=revision;
  model.vehicleReference.transmission=transmission;
  model.reference=variant.description;
  model.nodes[0].name=variant.description;
  model.limits=model.limits+' '+variant.limits;
  const removed=new Set(model.nodes.filter(variant.removed).map(node=>node.id));
  model.nodes=model.nodes.filter(node=>!removed.has(node.id));
  for(const key of removed){
    delete model.catalog.bindings[key];
    delete model.catalog.systems[key];
  }
  model.assets=model.assets.filter(asset=>model.nodes.some(node=>node.assetId===asset.id));
  const root=new Group(), assetId=id+':equipment', prefix='/models/e30-lore/r'+revision+'/';
  await variant.draw({model,add:async(parent,key,title,location,displayDirection,draw,page,number,internal=false,flags={})=>{
    assert(model.nodes.some(node=>node.id===parent),parent);
    const nodeId=parent+':'+key, group=new Group();
    group.name=nodeId.replaceAll(':','_');
    draw(group);
    compactPart(group);
    root.add(group);
    const box=new Box3().setFromObject(group,true);
    const source=catalog.find(a=>a.key===page+'.html');
    const items=source&&number?(await readJson('public'+source.url)).items.filter(item=>item.number===number):[];
    if(number)assert.equal(items.length,1,number);
    const position=items[0];
    const {visualSources,...nodeFlags}=flags;
    const systemIds=parent===assembly?[autoSystem,'system:transmission']:
      parent===cabin?['system:interior']:['system:body','system:exterior'];
    model.nodes.push({id:nodeId,name:title,parentId:parent,kind:'part',systemIds,
      assetId,meshNames:[group.name],matrix:new Matrix4().makeTranslation(...location).toArray(),
      bounds:{min:box.min.toArray(),max:box.max.toArray()},displayDirection,internal,
      oem:position?.number??null,canonicalId:position?.partId??null,guideIds:[],thumbnail:null,
      ...(parent===assembly?{gearbox:{section:['case','bellhousing','tail','pan'].includes(key),spread:displayDirection}}:{}),...nodeFlags});
    if(source)for(const system of systemIds){
      const pages=model.catalog.systems[system]??=[];
      if(!pages.includes(source.id))pages.push(source.id);
    }
    model.catalog.bindings[nodeId]={nodeId,title,kind:position?'component':'reference',
      note:'See the original assembly and applicable equipment conditions.',assemblyIds:source?[source.id]:[],
      positions:position?[{assemblyId:source.id,id:position.id,number:position.number,partId:position.partId}]:[],
      manual:[],guideIds:[],...(visualSources?{visualSources}:{})};
  }});
  const asset=await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true})));
  const hash=sha(asset), url=prefix+hash+'.glb';
  model.assets.push({id:assetId,url,sha256:hash,bytes:asset.length});
  const count=model.nodes.filter(n=>n.assetId).length;
  Object.assign(model.catalog.coverage,{renderable:count,bound:Object.keys(model.catalog.bindings).length,
    withCandidates:Object.values(model.catalog.bindings).filter(binding=>binding.positions.length).length});
  assert.equal(new Set(model.nodes.map(node=>node.id)).size,model.nodes.length);
  parseReference(model);
  const manifest=Buffer.from(JSON.stringify(model)), digest=sha(manifest);
  const pin={...base,id,revision,label,transmission,...(equipment?{equipment}:{}),renderableCount:count,
    sha256:digest,manifestUrl:prefix+'manifest.'+digest+'.json',assetBytes:model.assets.reduce((total,a)=>total+a.bytes,0)};
  assert(pin.assetBytes<=24*1024*1024,'E30 variant exceeds the 24 MiB transfer budget');
  await immutable('public'+url,asset);
  await immutable('public'+pin.manifestUrl,manifest);
  pins.push(pin);
  console.log(id+' · '+count+' components · '+asset.length+' additional mesh bytes');
}
await replaceJson('data/digital-twin/e30-vehicle-references.json',pins);
