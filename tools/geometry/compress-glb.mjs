import {MeshoptEncoder} from 'meshoptimizer/encoder';

// Original geometry-only GLBs from Three's exporter use one tightly packed
// accessor per buffer view. Keep all values, names and transforms intact.
export async function compressGeometryGlb(glb){
  const jsonSize=glb.readUInt32LE(12);
  const doc=JSON.parse(glb.subarray(20,20+jsonSize));
  const original=glb.subarray(28+jsonSize);
  if(doc.buffers.length!==1||doc.images?.length)throw Error('Expected one geometry buffer');
  const ext='EXT_meshopt_compression';
  const blocks=[];
  let offset=0;
  await MeshoptEncoder.ready;
  for(const [index,view] of doc.bufferViews.entries()){
    const accesses=doc.accessors.filter(accessor=>accessor.bufferView===index);
    if(accesses.length!==1)throw Error('Expected one accessor per geometry buffer view');
    const [accessor]=accesses;
    const stride=view.byteLength/accessor.count;
    const mode=view.target===34963?'TRIANGLES':'ATTRIBUTES';
    if(!Number.isInteger(stride)||view.buffer!==0||accessor.byteOffset)throw Error('Unexpected geometry stride');
    const start=view.byteOffset||0;
    const block=Buffer.from(MeshoptEncoder.encodeGltfBuffer(original.subarray(start,start+view.byteLength),
      accessor.count,stride,mode,0));
    const pad=Buffer.alloc((4-block.length%4)%4);
    view.extensions={...view.extensions,[ext]:{
      buffer:0,byteOffset:offset,byteLength:block.length,byteStride:stride,count:accessor.count,mode,
    }};
    view.buffer=1;
    blocks.push(block,pad);
    offset+=block.length+pad.length;
  }
  doc.buffers=[{byteLength:offset},{...doc.buffers[0],extensions:{[ext]:{fallback:true}}}];
  doc.extensionsUsed=[...new Set([...(doc.extensionsUsed||[]),ext])];
  doc.extensionsRequired=[...new Set([...(doc.extensionsRequired||[]),ext])];
  const json=Buffer.from(JSON.stringify(doc));
  const padding=Buffer.alloc((4-json.length%4)%4,32);
  const header=Buffer.from(glb.subarray(0,20));
  const chunk=Buffer.alloc(8);
  header.writeUInt32LE(28+json.length+padding.length+offset,8);
  header.writeUInt32LE(json.length+padding.length,12);
  chunk.writeUInt32LE(offset,0);
  chunk.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,json,padding,chunk,...blocks]);
}
