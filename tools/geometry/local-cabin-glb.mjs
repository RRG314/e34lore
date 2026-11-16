import assert from 'node:assert/strict';
import { Mesh } from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { sha } from './local-reference-review.mjs';

export function compactPart(group) {
  group.updateMatrixWorld(true);
  const toLocal=group.matrixWorld.clone().invert(),byMaterial=new Map();
  group.traverse(child=>{
    if (!child.isMesh) return;
    const geometry=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();
    geometry.deleteAttribute('uv');
    geometry.applyMatrix4(toLocal.clone().multiply(child.matrixWorld));
    const list=byMaterial.get(child.material)||[];
    list.push(geometry);
    byMaterial.set(child.material,list);
  });
  group.clear();
  for (const [material,list] of byMaterial) group.add(new Mesh(mergeVertices(mergeGeometries(list)),material));
}

// Preserve the previous small asset and reuse repeated hardware meshes.
export function appendGeometry(base, added) {
  function readGlb(bytes) {
    const length=bytes.readUInt32LE(12);
    return {doc:JSON.parse(bytes.subarray(20,20+length)),data:bytes.subarray(28+length)};
  }
  const {doc,data} = readGlb(base);
  const {doc:extra,data:appended} = readGlb(added);
  assert.equal(doc.buffers.length,2);
  assert.equal(extra.buffers.length,2);
  assert(!extra.images?.length);
  const start=doc.nodes.length,materialStart=doc.materials.length;
  const blocks=[data];
  let offset=data.length,fallback=doc.buffers[1].byteLength;
  const cached=new Map();
  const accessors=extra.accessors.map(({bufferView,...attributes})=>{
    const view=extra.bufferViews[bufferView],compressed=view.extensions.EXT_meshopt_compression;
    assert.equal(compressed.buffer,0);
    assert.equal(view.buffer,1);
    const encoded=appended.subarray(compressed.byteOffset,compressed.byteOffset+compressed.byteLength);
    const key=JSON.stringify([attributes,view.target,compressed.mode,compressed.byteStride])+sha(encoded);
    if (cached.has(key)) return cached.get(key);
    const rebased=doc.bufferViews.push({...view,byteOffset:fallback,extensions:{EXT_meshopt_compression:{...compressed,byteOffset:offset}}})-1;
    const padding=(4-encoded.length%4)%4;
    blocks.push(encoded,Buffer.alloc(padding));
    offset+=encoded.length+padding;
    fallback+=view.byteLength+(4-view.byteLength%4)%4;
    const index=doc.accessors.push({...attributes,bufferView:rebased})-1;
    cached.set(key,index);
    return index;
  });
  doc.materials.push(...extra.materials);
  const meshIndexes=extra.meshes.map(mesh=>{
    const primitives=mesh.primitives.map(p=>({...p,
      attributes:Object.fromEntries(Object.entries(p.attributes).map(([key,value])=>[key,accessors[value]])),
      ...(p.indices===undefined?{}:{indices:accessors[p.indices]}),material:p.material+materialStart,
    }));
    const key=JSON.stringify(primitives);
    if (cached.has(key)) return cached.get(key);
    const index=doc.meshes.push({...mesh,primitives})-1;
    cached.set(key,index);
    return index;
  });
  doc.nodes.push(...extra.nodes.map(node=>({...node,...(node.mesh===undefined?{}:{mesh:meshIndexes[node.mesh]}),
    ...(node.children?{children:node.children.map(child=>child+start)}:{})})));
  doc.scenes[doc.scene||0].nodes.push(...extra.scenes[extra.scene||0].nodes.map(node=>node+start));
  doc.buffers[0].byteLength=offset;
  doc.buffers[1].byteLength=fallback;
  const json=Buffer.from(JSON.stringify(doc)),padding=Buffer.alloc((4-json.length%4)%4,32);
  const header=Buffer.from(base.subarray(0,20));
  header.writeUInt32LE(json.length+padding.length,12);
  header.writeUInt32LE(28+json.length+padding.length+doc.buffers[0].byteLength,8);
  const chunk=Buffer.alloc(8);
  chunk.writeUInt32LE(doc.buffers[0].byteLength,0);
  chunk.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,json,padding,chunk,...blocks]);
}

