import { releasePublic } from './release-content';
import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {splitPaintSurfaces} from '../src/build-studio/paint-surfaces';
import {appearanceRole} from '../src/build-studio/appearance';
import targets from '../data/build-studio/appearance-targets.json';

// Decode the accepted GLB itself. These tests protect real mirror glass and
// bumper trim, not just a selector whose shape mirrors the implementation.
const asset=targets.assetPins.find(p=>p.id==='assembled:body-v7')!;
const bytes=readFileSync((releasePublic + asset.url));
const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString()) as {
  meshes:{name:string;primitives:{indices:number;attributes:Record<string,number>}[]}[];
  accessors:{bufferView:number;byteOffset?:number;componentType:number;type:string;count:number;normalized?:boolean}[];
  bufferViews:{byteOffset?:number;byteLength:number;byteStride?:number;extensions?:{EXT_meshopt_compression:{byteOffset:number;byteLength:number;count:number;byteStride:number;mode:'ATTRIBUTES'|'TRIANGLES'|'INDICES';filter:'NONE'}}}[];
};
const raw=bytes.subarray(28+bytes.readUInt32LE(12));
async function values(id:number) {
  await MeshoptDecoder.ready;
  const a=json.accessors[id],v=json.bufferViews[a.bufferView],e=v.extensions?.EXT_meshopt_compression;
  let data:Uint8Array;
  if(e){data=new Uint8Array(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(data,e.count,e.byteStride,raw.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);}
  else data=raw.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);
  const size=a.componentType===5126||a.componentType===5125?4:2,width=a.type==='VEC2'?2:a.type==='VEC3'?3:1,view=new DataView(data.buffer,data.byteOffset,data.byteLength),stride=v.byteStride||width*size;
  return Array.from({length:a.count*width},(_,i)=>{const offset=(a.byteOffset??0)+Math.floor(i/width)*stride+i%width*size;return(a.componentType===5126?view.getFloat32(offset,true):a.componentType===5125?view.getUint32(offset,true):view.getUint16(offset,true))/(a.normalized?65535:1);});
}
for(const [nodeId,meshName]of [['e34body:mirror-left','e34body_mirror-left_50970bb5'],['e34body:mirror-right','e34body_mirror-right_6005c5a7'],['e34body:front-bumper','e34body_front-bumper_5e657711'],['e34body:rear-bumper','e34body_rear-bumper_6c04aad1']]) {
  it(`separates the painted surface from the original trim on ${nodeId}`,async()=>{
    const primitive=json.meshes.find(m=>m.name===meshName)!.primitives[0];
    const positions=await values(primitive.attributes.POSITION),uv=await values(primitive.attributes.TEXCOORD_0),index=await values(primitive.indices);
    const source=new T.BufferGeometry();source.setAttribute('position',new T.Float32BufferAttribute(positions,3));source.setAttribute('uv',new T.Float32BufferAttribute(uv,2));source.setIndex(index);
    const original=new T.MeshStandardMaterial(),clone=original.clone();clone.userData={source:original,buildRole:'paint'};
    const split=splitPaintSurfaces(source,[clone],[{assetId:asset.id,sha256:asset.sha256,nodeId,materialIndex:1,name:'body-white'}]);
    expect(split.owned).toBe(true);expect(split.geometry).not.toBe(source);
    expect([...source.index!.array]).toEqual(index);expect(source.groups).toEqual([]);
    expect(split.geometry.index!.count).toBe(index.length);
    expect(split.geometry.groups).toHaveLength(2);
    expect(split.geometry.groups.every(g=>g.count>0)).toBe(true);
    expect(split.materials[0].userData.buildRole).toBeNull();expect(split.materials[1].userData.buildRole).toBe('paint');
    expect(split.materials.every(m=>m.userData.source===original)).toBe(true);
    const groups=split.geometry.groups;
    const faces=(g:typeof groups[number])=>{const indices=[...split.geometry.index!.array].slice(g.start,g.start+g.count);return Array.from({length:indices.length/3},(_,i)=>indices.slice(i*3,i*3+3).sort((a,b)=>a-b).join(','));};
    const before=Array.from({length:index.length/3},(_,i)=>index.slice(i*3,i*3+3).sort((a,b)=>a-b).join(',')).sort();
    expect(groups.flatMap(faces).sort()).toEqual(before);
    if(nodeId.includes('mirror')){
      const untouched=groups.find(g=>g.materialIndex===0)!;
      // Reflective glass island is below y=.75; it must never receive paint.
      const glassVertices=[...split.geometry.index!.array].slice(untouched.start,untouched.start+untouched.count);
      expect(glassVertices.some(i=>uv[i*2+1]>.77)).toBe(true);
      const painted=groups.find(g=>g.materialIndex===1)!;
      expect([...split.geometry.index!.array].slice(painted.start,painted.start+painted.count).every(i=>uv[i*2+1]<.747)).toBe(true);
    }
  });
}
describe('Unsupported appearance assets',()=>{it('keeps unknown source revisions untouched',()=>{
 const geometry=new T.BoxGeometry(),mat=new T.MeshStandardMaterial();
 const split=splitPaintSurfaces(geometry,[mat],[{assetId:asset.id,sha256:'0'.repeat(64),nodeId:'e34body:mirror-left',materialIndex:1,name:'body-white'}]);
 expect(split.geometry).toBe(geometry);expect(split.owned).toBe(false);
});});

it('targets every Touring paint primitive, keeping each adjacent black, chrome and glass primitive unchanged',()=>{
 const source=targets.assetPins.find(p=>p.id.startsWith('assembled:body-touring'))!,pin=targets.manifestPins.find(p=>p.id==='e34-530i-touring-manual')!;
 const glb=readFileSync(releasePublic +source.url),document=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString()) as {nodes:{name?:string;mesh?:number;children?:number[]}[];meshes:{primitives:{material:number}[]}[];materials:{name:string}[]};
 const manifest=JSON.parse(readFileSync(releasePublic +pin.manifestUrl,'utf8')) as {nodes:{id:string;assetId:string|null;meshNames:string[]}[]};
 function materials(id:number):number[]{const n=document.nodes[id];return n.mesh!==undefined?document.meshes[n.mesh].primitives.map(p=>p.material):(n.children||[]).flatMap(materials);}
 let paints=0;
 for(const node of manifest.nodes.filter(n=>n.assetId===source.id))for(const name of node.meshNames){
  const id=document.nodes.findIndex(n=>n.name===name);if(id<0)continue;
  for(const materialIndex of new Set(materials(id))){
   const role=appearanceRole({assetId:source.id,sha256:source.sha256,nodeId:node.id,materialIndex,name:document.materials[materialIndex].name});
   if(materialIndex===0){expect(role,node.id).toBe('paint');paints++;}else expect(role,node.id+':'+materialIndex).not.toBe('paint');
  }
 }
 expect(paints).toBeGreaterThan(13);
});
