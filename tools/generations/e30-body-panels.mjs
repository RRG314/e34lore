import { Box3, Matrix4, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Panel boundaries traced against the immutable artist mesh. The renderer
// receives separate indexed meshes sharing the original vertices and texture.
const artistHash = 'be795612646e82f88d28c9084c7d89a38a02fc73fc00fce0fa72424eebff3eea';
const leftDoorFaces = new Set([29,30,42,102,104,105,106,110,111,112,113,114,149,150]);
const rightDoorFaces = new Set([569,570,586,587,629,630,631,633,634,635,636,637,638,642]);

const bodyPanels = {
  frame: ['Body frame and pillars', [0,.84,0], 'single_components_for_body_side_frame'],
  hood: ['Hood', [.44,1.36,0], 'hood', true],
  trunk: ['Trunk lid', [-.51,1.26,0], 'trunk_lid_closing_system', true],
  roof: ['Roof skin', [-.04,1.44,0], 'single_components_for_body_side_frame', true],
  'front-bumper': ['Front bumper and valance', [1.01,.04,0], 'bumper_front'],
  'rear-bumper': ['Rear bumper and valance', [-.96,.04,0], 'bumper_rear'],
  'front-panel': ['Front grille and headlamp panel', [.92,.53,0], 'front_panel'],
  'tail-panel': ['Rear body panel', [-.91,.60,0], 'side_panel_tail_trim', true],
  spoiler: ['Rear spoiler', [-.88,1.05,0], 'rear_spoiler', true],
  windshield: ['Windshield', [.62,1.05,0], 'glazing'],
  'rear-window': ['Rear window', [-.72,.98,0], 'glazing'],
  sunroof: ['Sunroof panel', [0,1.87,0], 'sliding_roof_mechanism'],
  'cabin-trim': ['Cabin shell and trim', [-.14,.30,0], 'trim_panel_leg_room'],
};
for (const side of ['left','right']) {
  const z = side === 'left' ? -1 : 1;
  const title = side[0].toUpperCase() + side.slice(1);
  Object.assign(bodyPanels,{
    ['door-'+side]: [title+' door', [0,.45,z*.96], 'front_door_hinge_door_brake', true],
    ['door-glass-'+side]: [title+' door glass', [.07,.91,z*1.02], 'glazing', false, 'door-'+side],
    ['quarter-window-'+side]: [title+' rear quarter glass', [-.42,1.09,z*.61], 'glazing'],
    ['front-fender-'+side]: [title+' front fender', [.52,.24,z*.56], 'side_panel_front', true],
    ['rear-quarter-'+side]: [title+' rear quarter panel', [-.46,.25,z*.57], 'side_panel_tail_trim', true],
    ['rocker-'+side]: [title+' rocker trim', [-.07,-.09,z*.72], 'single_components_for_body_side_frame'],
    ['mirror-'+side]: [title+' door mirror', [.20,.76,z*1.22], 'outside_mirror', false, 'door-'+side],
    ['headlamps-'+side]: [title+' headlamp assembly', [1.06,.58,z*.36], 'headlight'],
    ['tail-light-'+side]: [title+' tail light', [-1.08,.65,z*.38], 'rear_light'],
    ['front-marker-'+side]: [title+' front marker and fog lamps', [1.04,.12,z*.40], 'front_front_lateral_turn_indicator'],
  });
}

function connectedIslands(index) {
  const faceCount = index.length / 3;
  const seen = new Set();
  const vertexFaces = new Map();
  for (let face = 0; face < faceCount; face++) {
    for (const vertex of index.slice(face*3,face*3+3)) {
      if (!vertexFaces.has(vertex)) vertexFaces.set(vertex, []);
      vertexFaces.get(vertex).push(face);
    }
  }
  const islands = new Array(faceCount);
  for (let seed = 0; seed < faceCount; seed++) {
    if (seen.has(seed)) continue;
    const frontier = [seed];
    while (frontier.length) {
      const face = frontier.pop();
      if (seen.has(face)) continue;
      seen.add(face);
      islands[face] = seed;
      for (const vertex of index.slice(face*3,face*3+3)) frontier.push(...vertexFaces.get(vertex));
    }
  }
  return islands;
}

function bodyPanel(face, island, centroid) {
  const [x,y,z] = centroid;
  const side = z < 0 ? 'left' : 'right';
  if (leftDoorFaces.has(face)) return 'door-left';
  if (rightDoorFaces.has(face)) return 'door-right';
  if ([808,861,1889,1892,2318,2321,2462,2468].includes(island)) return 'mirror-'+side;
  if ([157,287,698,728].includes(island)) return 'headlamps-'+side;
  if ([320,761,1478,1484,1490,1496,1516,1522,1528,1534].includes(island)) return 'tail-light-'+side;
  if ([1458,1502,2286,2300].includes(island)) return 'front-marker-'+side;
  if ([1412,2314,2316].includes(island)) return 'spoiler';
  if ([1232,2476].includes(island)) return 'front-bumper';
  if (island === 2474) return 'tail-panel';
  if (island === 1005) return y < .46 ? 'rear-bumper' : 'tail-panel';
  if (island === 911) return 'front-panel';
  if (island === 187) {
    if ((face <= 209 || face >= 240 && face <= 286) && x > .83) return 'hood';
    if (x < -1.67 && y > .84) return 'trunk';
    if (y > 1.25 && Math.abs(z) < .53) return 'roof';
    return 'frame';
  }
  if ([0,540].includes(island)) {
    if (y < .285 && x > -.84 && x < 1.08) return 'rocker-'+side;
    if (x > .82) return 'front-fender-'+side;
    if (x < -.43 && y < .89) return 'rear-quarter-'+side;
    return 'frame';
  }
  if (island === 367) return y < .295 && x > -.84 && x < 1.08 ? 'rocker-'+side : 'frame';
  return 'cabin-trim';
}

const glassPanels = {
  0:'headlamps-left',45:'headlamps-right',92:'tail-light-left',107:'tail-light-right',
  124:'quarter-window-right',135:'headlamps-left',165:'front-marker-left',168:'headlamps-right',
  198:'front-marker-right',201:'door-glass-left',212:'rear-window',246:'quarter-window-left',
  257:'windshield',299:'door-glass-right',310:'sunroof',326:'front-marker-left',329:'front-marker-right',
};

function readGlb(bytes) {
  const jsonLength = bytes.readUInt32LE(12), start = 20 + jsonLength;
  const json = JSON.parse(bytes.subarray(20,start));
  return { json, bin:bytes.subarray(start+8) };
}

function writeGlb(json, bin) {
  const encoded=Buffer.from(JSON.stringify(json));
  const pad=Buffer.alloc((4-encoded.length%4)%4,32);
  const dataPad=Buffer.alloc((4-bin.length%4)%4);
  const header=Buffer.alloc(20), chunk=Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67,0);
  header.writeUInt32LE(2,4);
  header.writeUInt32LE(28+encoded.length+pad.length+bin.length+dataPad.length,8);
  header.writeUInt32LE(encoded.length+pad.length,12);
  header.writeUInt32LE(0x4e4f534a,16);
  chunk.writeUInt32LE(bin.length+dataPad.length,0);
  chunk.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,encoded,pad,chunk,bin,dataPad]);
}

export async function splitE30Exterior(bytes, asset, bodyNodes) {
  if (asset.sha256 !== artistHash) throw Error('The E30 panel map belongs to a different exterior mesh');
  const {json,bin}=readGlb(bytes);
  const geometryOnly=structuredClone(json);
  delete geometryOnly.images;
  delete geometryOnly.textures;
  geometryOnly.materials=json.materials.map(()=>({}));
  const geometryBytes=writeGlb(geometryOnly,bin);
  const buffer=geometryBytes.buffer.slice(geometryBytes.byteOffset,geometryBytes.byteOffset+geometryBytes.length);
  const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer,'');
  scene.updateMatrixWorld(true);
  const slices=new Map(), chunks=[bin];
  let offset=bin.length;
  let faceCount=0;
  for (const [sourceNumber,node] of bodyNodes.entries()) {
    const mesh=scene.getObjectByName(node.meshNames[0]);
    if (!mesh?.geometry?.index) throw Error('Missing artist body primitive');
    const sourceNodeIndex=json.nodes.findIndex(entry=>entry.name===mesh.name);
    const sourceNode=json.nodes[sourceNodeIndex];
    const parent=json.nodes.find(entry=>entry.children?.includes(sourceNodeIndex));
    const original=json.meshes[sourceNode.mesh].primitives[0];
    const indices=Array.from(mesh.geometry.index.array);
    const world=new Matrix4().fromArray(node.matrix).multiply(mesh.matrixWorld);
    const positions=mesh.geometry.attributes.position;
    const vertices=Array.from({length:positions.count},(_,i)=>
      new Vector3(positions.getX(i),positions.getY(i),positions.getZ(i)));
    const islands=connectedIslands(indices);
    const groups=new Map();
    for (let face=0;face<islands.length;face++) {
      const triangle=indices.slice(face*3,face*3+3);
      const centroid=new Vector3();
      for(const vertex of triangle) centroid.add(vertices[vertex]);
      centroid.multiplyScalar(1/3).applyMatrix4(world);
      const panel=sourceNumber===0 ? bodyPanel(face,islands[face],centroid.toArray()) : glassPanels[islands[face]];
      if(!bodyPanels[panel])throw Error('Missing body region for face '+face);
      if(!groups.has(panel))groups.set(panel,[]);
      groups.get(panel).push(...triangle);
      faceCount++;
    }
    const newNodeIndices=[];
    for(const [id,triangles] of groups){
      const name='E30_'+id.replaceAll('-','_')+'_'+sourceNumber;
      const data=Buffer.alloc(triangles.length*2);
      const bounds=new Box3();
      for(const [i,vertex] of triangles.entries()){
        data.writeUInt16LE(vertex,i*2);
        bounds.expandByPoint(vertices[vertex].clone().applyMatrix4(mesh.matrixWorld));
      }
      const view=json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,target:34963})-1;
      const accessor=json.accessors.push({bufferView:view,componentType:5123,count:triangles.length,type:'SCALAR'})-1;
      const primitive={...original,indices:accessor};
      const meshIndex=json.meshes.push({name,primitives:[primitive]})-1;
      newNodeIndices.push(json.nodes.push({...sourceNode,mesh:meshIndex,name})-1);
      const pad=Buffer.alloc((4-data.length%4)%4);
      chunks.push(data,pad);
      offset+=data.length+pad.length;
      const slice=slices.get(id)||{names:[],bounds:new Box3(),matrix:node.matrix};
      slice.names.push(name);
      slice.bounds.union(bounds);
      slices.set(id,slice);
    }
    parent.children=parent.children.flatMap(index=>index===sourceNodeIndex?newNodeIndices:[index]);
  }
  if(faceCount!==2810||slices.size!==Object.keys(bodyPanels).length)throw Error('Incomplete panel split');
  json.buffers[0].byteLength=offset;
  return {
    bytes:writeGlb(json,Buffer.concat(chunks)),
    panels:[...slices.entries()].map(([id,slice])=>{
      const [name,direction,page,paintSurface,parent]=bodyPanels[id];
      return {
        id,name,direction,page,paintSurface,parent,
        meshNames:slice.names,matrix:slice.matrix,
        bounds:{min:slice.bounds.min.toArray(),max:slice.bounds.max.toArray()},
      };
    }),
  };
}
