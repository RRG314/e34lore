import assert from 'node:assert/strict';
import { Matrix4, Vector3 } from 'three';

/** Clip only the specified part of the textured dash, keeping its atlas,
 * source normals, node transforms and the rest of the body intact. */
export function cutCabinOpenings(bytes,node,sourceObject,openings,{extract,sourceIndex,keepTriangle,extractTriangle}={}) {
  const jsonSize=bytes.readUInt32LE(12);
  const doc=JSON.parse(bytes.subarray(20,20+jsonSize));
  const data=bytes.subarray(28+jsonSize);
  const source=sourceIndex===undefined?doc.nodes.find(n=>n.name===sourceObject.name):doc.nodes[sourceIndex];
  const mesh=doc.meshes[source.mesh];
  assert.equal(mesh.primitives.length,1);
  const [primitive]=mesh.primitives;
  const world=new Matrix4().fromArray(node.matrix).multiply(sourceObject.matrixWorld);
  const inverse=world.clone().invert();
  const {attributes,index}=sourceObject.geometry;
  const vertices=Array.from({length:attributes.position.count},(_,i)=>{
    const p=new Vector3().fromBufferAttribute(attributes.position,i).applyMatrix4(world).toArray();
    const n=attributes.normal ? new Vector3().fromBufferAttribute(attributes.normal,i).toArray() : [0,1,0];
    return [...p,...n,attributes.uv?.getX(i)??0,attributes.uv?.getY(i)??0];
  });
  let polygons=[], inside=[];
  for(let i=0;i<index.count;i+=3) {
    const triangle=[0,1,2].map(j=>vertices[index.getX(i+j)]);
    if(extractTriangle?.(i)) inside.push(triangle);
    else if(!keepTriangle||keepTriangle(triangle)) polygons.push(triangle);
  }

  function clip(polygon,axis,limit,side) {
    const result=[];
    for(let i=0;i<polygon.length;i++) {
      const a=polygon[i], b=polygon[(i+1)%polygon.length];
      const da=side*(a[axis]-limit), db=side*(b[axis]-limit);
      if(da>=0) result.push(a);
      if(da*db<0) result.push(a.map((v,j)=>v+(b[j]-v)*da/(da-db)));
    }
    return result;
  }
  for(const {low,high} of openings) {
    const outside=[];
    let removed=0;
    for(const polygon of polygons) {
      let inner=polygon;
      for(const axis of [0,1,2]) for(const [limit,side] of [[low[axis],1],[high[axis],-1]]) {
        if(inner.length<3) break;
        const cut=clip(inner,axis,limit,-side);
        if(cut.length>=3) outside.push(cut);
        inner=clip(inner,axis,limit,side);
      }
      if(inner.length>=3) {
        removed++;
        if(extract) inside.push(inner);
      }
    }
    assert(removed,`Opening at ${low.join(', ')} misses ${sourceObject.name}`);
    polygons=outside;
  }

  const blocks=[data];
  let offset=data.length;
  function writePrimitive(polygons) {
  const position=[],normal=[],uv=[],indices=[],known=new Map();
  function vertex(v) {
    const key=v.map(x=>Math.round(x*1e7)).join(',');
    if(known.has(key)) return known.get(key);
    const next=known.size;
    known.set(key,next);
    position.push(...new Vector3(...v.slice(0,3)).applyMatrix4(inverse).toArray());
    normal.push(...new Vector3(...v.slice(3,6)).normalize().toArray());
    uv.push(...v.slice(6));
    return next;
  }
  for(const p of polygons) for(let j=1;j+1<p.length;j++){
    const triangle=[p[0],p[j],p[j+1]].map(vertex);
    if(new Set(triangle).size===3) indices.push(...triangle);
  }
  function accessor(array,type,count,target,componentType,limits={}) {
    const bytes=Buffer.from(array.buffer),pad=Buffer.alloc((4-bytes.length%4)%4);
    const bufferView=doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,target})-1;
    blocks.push(bytes,pad);
    offset+=bytes.length+pad.length;
    return doc.accessors.push({type,componentType,count,bufferView,...limits})-1;
  }
  const limits={min:[0,1,2].map(i=>Math.min(...position.filter((_,j)=>j%3===i))),
    max:[0,1,2].map(i=>Math.max(...position.filter((_,j)=>j%3===i)))};
  const attributes={
    POSITION:accessor(Float32Array.from(position),'VEC3',known.size,34962,5126,limits),
    NORMAL:accessor(Float32Array.from(normal),'VEC3',known.size,34962,5126),
    TEXCOORD_0:accessor(Float32Array.from(uv),'VEC2',known.size,34962,5126),
  };
  return {...primitive,attributes,indices:accessor(Uint16Array.from(indices),'SCALAR',indices.length,34963,5123)};
  }
  assert(extract ? inside.length : polygons.length, 'Empty split geometry');
  if (polygons.length) mesh.primitives[0]=writePrimitive(polygons);
  if (extract) {
    const {translation, rotation, scale, matrix, children, ...properties}=source;
    const mesh=polygons.length?doc.meshes.push({primitives:[writePrimitive(inside)]})-1:source.mesh;
    const added=doc.nodes.push({...properties,name:extract,mesh,matrix:sourceObject.matrixWorld.toArray()})-1;
    if (!polygons.length) {
      const sourceNode=doc.nodes.indexOf(source);
      for (const node of doc.nodes) if (node.children) node.children=node.children.filter(child=>child!==sourceNode);
      for (const scene of doc.scenes) scene.nodes=scene.nodes.filter(child=>child!==sourceNode);
    }
    doc.scenes[doc.scene??0].nodes.push(added);
  }
  doc.buffers[0].byteLength=offset;
  const json=Buffer.from(JSON.stringify(doc)),pad=Buffer.alloc((4-json.length%4)%4,32);
  const header=Buffer.from(bytes.subarray(0,20)), chunk=Buffer.alloc(8);
  header.writeUInt32LE(28+json.length+pad.length+offset,8);
  header.writeUInt32LE(json.length+pad.length,12);
  chunk.writeUInt32LE(offset,0);
  chunk.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,json,pad,chunk,...blocks]);
}
