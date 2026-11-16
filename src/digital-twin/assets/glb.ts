import {z} from 'zod';
const embeddedResource=z.object({uri:z.unknown().optional()});
const integer=z.number().int().nonnegative();
const gltfSchema=z.object({
 asset:z.object({version:z.literal('2.0')}),
 buffers:z.array(embeddedResource).max(10000).default([]),images:z.array(embeddedResource).max(10000).default([]),
 nodes:z.array(z.object({mesh:integer.optional()})).max(10000).default([]),
 meshes:z.array(z.object({primitives:z.array(z.object({mode:integer.optional(),indices:integer.optional(),attributes:z.record(z.string(),integer).optional()})).max(10000)})).max(10000).default([]),
 accessors:z.array(z.object({count:integer})).max(100000).default([]),
});
/** Embedded GLB only. Never follow a user-uploaded external buffer/texture URL. */
export function inspectGLB(buffer: ArrayBuffer) {
  if (buffer.byteLength < 20 || buffer.byteLength > 104857600)
    throw Error("GLB must be between 20 bytes and 100 MB.");
  const v = new DataView(buffer);
  if (
    v.getUint32(0, true) !== 0x46546c67 ||
    v.getUint32(4, true) !== 2 ||
    v.getUint32(8, true) !== buffer.byteLength
  )
    throw Error("Invalid GLB 2.0 header.");
  const length = v.getUint32(12, true);
  if (
    v.getUint32(16, true) !== 0x4e4f534a ||
    length % 4 ||
    length + 20 > buffer.byteLength
  )
    throw Error("Invalid GLB JSON chunk.");
  let raw:unknown;
  try{raw=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)).trim());}catch{throw Error('Invalid GLB JSON structure.');}
  const parsed=gltfSchema.safeParse(raw);
  if(!parsed.success)throw Error('Invalid GLB structure or node budget. An embedded glTF 2.0 model is required.');
  const json=parsed.data;
  if([...json.buffers,...json.images].some(resource=>resource.uri!==undefined))
    throw Error('Upload an embedded GLB. External buffers and images are not allowed.');
  let triangles=0,vertices=0;
  const meshBudgets=json.meshes.map(mesh=>{
    let meshTriangles=0,meshVertices=0;
    for(const primitive of mesh.primitives){
      const accessorIndex=primitive.indices??primitive.attributes?.POSITION;
      if(accessorIndex===undefined||!json.accessors[accessorIndex])throw Error('A GLB primitive references a missing accessor.');
      const count=json.accessors[accessorIndex].count;
      meshVertices+=count;
      if(primitive.mode===undefined||primitive.mode===4)meshTriangles+=count/3;
    }
    triangles+=meshTriangles;vertices+=meshVertices;return {triangles:meshTriangles,vertices:meshVertices};
  });
  let instancedTriangles=0,instancedVertices=0;
  for(const node of json.nodes)if(node.mesh!==undefined){
    const budget=meshBudgets[node.mesh];if(!budget)throw Error('A GLB node references a missing mesh.');
    instancedTriangles+=budget.triangles;instancedVertices+=budget.vertices;
  }
  if(Math.max(triangles,instancedTriangles)>1000000)throw Error('The runtime model exceeds one million triangles. Submit an optimized review model.');
  if(Math.max(vertices,instancedVertices)>3000000)throw Error('The runtime model exceeds three million drawn vertices. Submit an optimized review model.');
  return {
    nodes: (json.nodes || []).length,
    meshes: (json.meshes || []).length,
    triangles: Math.ceil(triangles),
    bytes: buffer.byteLength,
  };
}
