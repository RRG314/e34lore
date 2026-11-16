import { releasePublic } from './release-content';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Box3,Matrix4,Mesh,Vector3,type Group} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {variantExplosion} from '../src/digital-twin/public/variant-layout';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {automaticGearboxScope,bodyTrimScope,defaultView,engineBayScope,engineCutaway,frontSuspensionScope,gearboxCutaway,parseReference,rearSuspensionScope,visibleNodes,type ReferenceModel} from '../src/digital-twin/public/model';
import {findCatalogNode} from '../src/digital-twin/public/catalog';
import {componentPlan} from '../src/digital-twin/public/component-separation';

const parent='work/geometry-quality-tests';
mkdirSync(parent,{recursive:true});
const root=mkdtempSync(parent+'/mechanical-');
const read=(name:string)=>JSON.parse(readFileSync(root+'/'+name,'utf8'));
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
let model:ReferenceModel;
let base:ReferenceModel;
let scene:Group;

beforeAll(async()=>{
  const run=(script:string,args:string[])=>execFileSync(process.execPath,[script,...args],{stdio:'pipe'});
  run('tools/build-525i-service-candidate.mjs',[root]);
  run('tools/build-525i-visual-candidate.mjs',[root,'1006',root]);
  base=parseReference(read(read('release.json').manifestUrl.split('/').pop()));
  run('tools/build-525i-mechanical-candidate.mjs',[root,'1007',root]);
  model=parseReference(read(read('release.json').manifestUrl.split('/').pop()));
  const asset=read('review.json').files.find((file:{type:string})=>file.type==='model/gltf-binary');
  const bytes=readFileSync(root+'/'+asset.file);
  scene=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'')).scene;
},30000);

afterAll(()=>{
  scene?.traverse(object=>{
    if(!(object instanceof Mesh))return;
    object.geometry.dispose();
    for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();
  });
  rmSync(root,{recursive:true,force:true});
});

describe('525i mechanical candidate',()=>{
  it('shows separate internal gear groups only in the applicable view',()=>{
    const assembled={...defaultView(),scope:automaticGearboxScope};
    const cutaway={...assembled,internals:true};
    const exploded={...cutaway,explosion:2};
    const ids=(view:typeof cutaway)=>visibleNodes(model,view).map(node=>node.id);
    expect(ids(assembled)).toContain('e34auto:case');
    for(const part of ['converter-impeller','converter-turbine','overdrive-carrier','main-carrier','band-servo','main-valve-body','adapter-valve-body']){
      expect(ids(assembled)).not.toContain('e34auto:'+part);
      expect(ids(cutaway)).toContain('e34auto:'+part);
      expect(ids(exploded)).toContain('e34auto:'+part);
    }
    expect(ids(cutaway)).not.toContain('e34auto:cooler-inlet');
    expect(gearboxCutaway(cutaway)).toBe(true);
    expect(gearboxCutaway(exploded)).toBe(false);
    const carrier=model.nodes.find(n=>n.id==='e34auto:main-carrier')!;
    expect(componentPlan(model,automaticGearboxScope,carrier).path[0][0]).toBeLessThan(0);
  });

  it('resolves retained source occurrences and leaves factory-only parts unnumbered',()=>{
    for(const [number,id] of [['24131218847','e34auto:output-seal'],['24337537062','e34auto:shift-23'],
      ['17221728763','e34auto:cooler-inlet'],['26121225071','e34sys:center-bearing-insert'],
      ['26121226723','e34sys:center-bearing'],['11531722852','e34sys:lower-radiator-hose']]){
      const node=findCatalogNode(model,'bmw-'+number);
      expect(node?.id).toBe(id);
      const position=model.catalog!.bindings[id].positions.find(row=>row.number===number)!;
      expect(findCatalogNode(model,position.partId,position.id)?.id).toBe(id);
    }
    const carrier=model.catalog!.bindings['e34auto:main-carrier'];
    expect(carrier.positions).toEqual([]);
    expect(carrier.visualSources?.some(source=>source.title.includes('7A-102'))).toBe(true);
    expect(model.catalog!.bindings['e34sys:air-filter-element']).toEqual(base.catalog!.bindings['e34sys:air-filter-element']);
  });

  it('exports a checked seal and bearing and keeps the previous model bytes',()=>{
    for(const [id,outer,bore,width] of [['e34auto:output-seal',58,38,10],['e34sys:center-bearing-insert',55,30,13]] as const){
      const node=model.nodes.find(n=>n.id===id)!;
      const part=scene.getObjectByName(node.meshNames[0])!;
      const bounds=new Box3().setFromObject(part);
      expect((bounds.max.x-bounds.min.x)*1000).toBeCloseTo(width,2);
      let min=Infinity,max=0;
      part.traverse(object=>{
        if(!(object instanceof Mesh))return;
        const p=object.geometry.getAttribute('position');
        for(let i=0;i<p.count;i++){
          const radius=Math.hypot(p.getY(i),p.getZ(i));
          min=Math.min(min,radius);
          max=Math.max(max,radius);
        }
      });
      expect(max*2000).toBeCloseTo(outer,2);
      expect(min*2000).toBeCloseTo(bore,2);
    }
    const archives=read('releases.json');
    expect(archives.map((archive:{release:{revision:number}})=>archive.release.revision)).toEqual([1001,1006,1007]);
    for(const archive of archives)for(const file of archive.files) {
      expect(sha(readFileSync(root+'/'+file.file))).toBe(file.sha256);
    }
  });
});

describe('525i engine bay and suspension candidate',()=>{
  it('preserves archived scans and seats the modeled assemblies on their installed interfaces',()=>{
    const build=(revision:string,...flags:string[])=>execFileSync(process.execPath,[
      'tools/build-525i-mechanical-candidate.mjs',root,revision,root,...flags,
    ],{stdio:'pipe'});
    build('1008');
    const original=read('release.json');
    const previous=parseReference(read(original.manifestUrl.split('/').pop()));
    build('1009','--bay-and-suspension');
    const current=parseReference(read(read('release.json').manifestUrl.split('/').pop()));
    expect(current.assets.slice(0,-1)).toEqual(previous.assets);
    expect(sha(readFileSync(root+'/'+original.manifestUrl.split('/').pop()))).toBe(original.sha256);
    expect(current.nodes.find(n=>n.id==='e34auto:case')).toEqual(previous.nodes.find(n=>n.id==='e34auto:case'));
    expect(current.catalog!.bindings['e34sys:air-filter-element']).toEqual(previous.catalog!.bindings['e34sys:air-filter-element']);
    expect(findCatalogNode(current,'bmw-13721730918')?.id).toBe('e34sys:air-filter-element');
    expect(findCatalogNode(current,'bmw-11811136537')?.id).toBe('e34bay:engine-bracket-1');
    expect(findCatalogNode(current,'bmw-11811135948')?.id).toBe('e34bay:engine-bracket--1');

    const bay=visibleNodes(current,{...defaultView(),scope:engineBayScope}).map(n=>n.id);
    expect(bay).toEqual(expect.arrayContaining(['m50:intake-plenum','e34sys:radiator','e34bay:front-tower-1']));
    expect(bay).not.toContain('e34body:hood');
    for(const [scope,axle] of [[frontSuspensionScope,'front'],[rearSuspensionScope,'rear']]){
      const wheel='wheel:'+axle+'-left',view={...defaultView(),scope};
      expect(visibleNodes(current,view).map(n=>n.id)).toContain(wheel);
      expect(visibleNodes(current,{...view,hidden:[wheel]}).map(n=>n.id)).not.toContain(wheel);
    }
    function bounds(id:string) {
      const node=current.nodes.find(n=>n.id===id)!;
      return new Box3(new Vector3(...node.bounds!.min),new Vector3(...node.bounds!.max))
        .applyMatrix4(new Matrix4().fromArray(node.matrix));
    }
    for(const side of ['1','-1']){
      for(const [a,b] of [
        ['e34sys:front-subframe','e34bay:engine-mount-'+side],
        ['e34bay:engine-mount-'+side,'e34bay:engine-bracket-'+side],
        ['e34bay:engine-bracket-'+side,'m50:block'],
        ['e34bay:front-tower-'+side,'e34sys:front-top-mount-'+side],
        ['e34sys:front-control-arm-'+side,'e34sys:front-strut-'+side],
        ['e34sys:front-thrust-arm-'+side,'e34sys:front-strut-'+side],
        ['e34sys:front-thrust-arm-'+side,'e34sys:front-thrust-bracket-'+side],
        ['e34sys:rear-trailing-arm-'+side,'e34sys:rear-subframe'],
        ['e34sys:rear-trailing-arm-'+side,'e34sys:rear-damper-'+side],
        ['e34chassis:rear-tower-'+side,'e34sys:rear-top-mount-'+side],
      ])expect(bounds(a).intersectsBox(bounds(b)),a+' → '+b).toBe(true);
    }
  },15000);
});

describe('525i engine and trim detail',()=>{
  it('shows catalog-linked clips and a sectioned engine with the prior revision intact',async()=>{
    const build=(revision:string,...flags:string[])=>execFileSync(process.execPath,[
      'tools/build-525i-mechanical-candidate.mjs',root,revision,root,...flags,
    ],{stdio:'pipe'});
    build('1008');
    build('1011','--bay-and-suspension');
    const archived=read('release.json');
    build('1012','--engine-and-trim');
    const receipt=read('review.json'),current=parseReference(read(receipt.release.manifestUrl.split('/').pop()));
    expect(current.assets).toHaveLength(8);
    expect(sha(readFileSync(root+'/'+archived.manifestUrl.split('/').pop()))).toBe(archived.sha256);
    const view={...defaultView(),scope:'system:m50-engine',internals:true};
    const ids=(v:typeof view)=>visibleNodes(current,v).map(n=>n.id);
    expect(engineCutaway(view)).toBe(true);
    expect(ids(view)).toEqual(expect.arrayContaining(['m50:crankshaft','m50:main-shell:0:lower',
      'm50:camshaft:intake','m50:vanos-piston','m50:oil-pump-inner-rotor']));
    expect(ids(view)).not.toContain('m50:valve-cover');
    expect(ids({...view,internals:false})).not.toContain('m50:crankshaft');
    const trim={...defaultView(),scope:bodyTrimScope},clip='e34trim:front-door-left-3-clamp';
    expect(ids(trim)).not.toContain(clip);
    expect(ids({...trim,internals:true})).toContain(clip);
    expect(ids({...trim,internals:true})).not.toContain('e34body:side-moulding-e34-body-16-left');
    expect(current.catalog!.bindings[clip].positions[0].number).toBe('51131946258');

    const detailed = [clip, 'm50:piston:1', 'e34auto:pump', 'e34bay:washer-tank',
      'e34sys:front-strut--1', 'e34sys:center-bearing', 'e34sys:center-bearing-insert'];
    const complete = visibleNodes(current,{...defaultView(),explosion:4});
    expect(complete.map(n=>n.id)).toEqual(expect.arrayContaining(detailed));
    expect(complete.length).toBe(current.nodes.filter(n=>n.assetId).length);
    const layout = (explosion:number)=>variantExplosion(current,{view:'vehicle',explodeScope:'vehicle',explosion,overrides:{}},complete);
    const installed=layout(0), partial=layout(2), full=layout(4);
    for (const id of detailed) {
      expect(installed.get(id)).toEqual([0,0,0]);
      expect(full.get(id)).toBeDefined();
      expect(full.get(id)!.some(n=>Math.abs(n)>.05)).toBe(true);
      expect(partial.get(id)).toEqual(full.get(id)!.map(n=>n/2));
    }
    expect(full.get('e34body:shell')).toEqual(full.get('e34body:rear-quarter-left'));
    expect(full.get('e34body:shell')).not.toEqual(full.get('e34body:front-door-left'));
    expect(full.get(clip)).not.toEqual(full.get('e34body:front-door-left'));
    expect(full.get('e34sys:center-bearing')).not.toEqual(full.get('e34sys:center-bearing-insert'));
    expect(current.catalog!.bindings['e34sys:center-bearing'].positions.map(p=>p.number)).toContain('26121226723');
    expect(current.catalog!.bindings['e34sys:center-bearing-insert'].positions.map(p=>p.number)).toContain('26121225071');

    const source=receipt.files.find((file:{type:string})=>file.type==='model/gltf-binary');
    const bytes=readFileSync(root+'/'+source.file);
    const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
      .parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');
    try{
      const piston=current.nodes.find(n=>n.id==='m50:piston:1')!;
      const mesh=scene.getObjectByName(piston.meshNames[0])!;
      const size=new Box3().setFromObject(mesh).getSize(new Vector3());
      expect(size.x*1000).toBeCloseTo(83.98,2);
      expect(scene.getObjectByName(current.nodes.find(n=>n.id===clip)!.meshNames[0])).toBeDefined();
    }finally{
      scene.traverse(object=>{if(object instanceof Mesh)object.geometry.dispose();});
    }
  },25000);
});
