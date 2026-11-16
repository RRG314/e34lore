import {
  BufferGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, Float32BufferAttribute,
  Group, LatheGeometry, Mesh, MeshStandardMaterial, Path, Shape, Vector2, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const vinyl=new MeshStandardMaterial({color:'#28292a',roughness:.86,side:DoubleSide});
const felt=new MeshStandardMaterial({color:'#202124',roughness:.99,side:DoubleSide});
const floorFinish=new MeshStandardMaterial({color:'#3e4143',roughness:.95,side:DoubleSide});
const metal=new MeshStandardMaterial({color:'#667072',roughness:.65,metalness:.36,side:DoubleSide});
const rubber=new MeshStandardMaterial({color:'#191a1a',roughness:.93,side:DoubleSide});
const steel=new MeshStandardMaterial({color:'#33383a',roughness:.59,metalness:.41,side:DoubleSide});

function add(group,geometry,material,at) {
  const mesh=new Mesh(geometry,material);
  mesh.position.fromArray(at);
  group.add(mesh);
  return mesh;
}
function box(group,dimensions,material,at,radius=.003) {
  return add(group,new RoundedBoxGeometry(...dimensions,1,radius),material,at);
}
function surface(group,vertices,indices,material) {
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(vertices.flat(),3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  add(group,geometry,material,[0,0,0]);
}

export const gloveOpening={low:[.37,.604,.179],high:[.724,.761,.627]};

export function gloveBin(e30) {
  const bin=new Group();
  const [mouth,bottom,top,left,right,depth]=e30
    ? [.487,.621,.750,.178,.599,.126]
    : [.493,.610,.754,.181,.625,.174];
  const lowX=e30?.509:.674;
  const front=[[lowX,bottom,left],[lowX,bottom,right],[mouth,top,right],[mouth,top,left]];
  const back=[[mouth+depth,bottom+.012,left+.015],[mouth+depth,bottom+.012,right-.015],
    [mouth+depth,top-.018,right-.015],[mouth+depth,top-.018,left+.015]];
  surface(bin,[...front,...back],[0,4,1,1,4,5,1,5,2,2,5,6,2,6,3,3,6,7,3,7,0,0,7,4,4,7,5,5,7,6],felt);
  return bin;
}

export function e34GloveDoor() {
  const lid=new Group(), left=.181,right=.625;
  const profile=[
    [.609,.671],[.624,.646],[.652,.592],[.690,.531],[.728,.495],[.755,.486],
  ];
  for(const [index,[y,x]] of profile.entries()) {
    if(index===profile.length-1) break;
    const [y1,x1]=profile[index+1];
    surface(lid,[[x,y,left],[x,y,right],[x1,y1,left],[x1,y1,right],
      [x+.012,y,left],[x+.012,y,right],[x1+.012,y1,left],[x1+.012,y1,right]],
    [0,2,1,1,2,3,4,5,6,5,7,6,0,4,2,2,4,6,1,3,5,3,7,5],vinyl);
  }
  box(lid,[.015,.024,.089],felt,[.496,.726,.403],.005);
  box(lid,[.009,.008,.051],vinyl,[.486,.728,.403],.003);
  return lid;
}

export function spareCompartment(e30) {
  const x=e30?-1.658:-1.883, y=e30?.447:.509, outer=e30?.305:.339, base=e30?.246:.297;
  const tray=new Group(), wheel=new Group(), fastener=new Group();
  const outline=e30
    ? [[-2.013,-.640],[-1.79,-.651],[-1.479,-.573],[-1.303,-.527],[-1.303,.529],[-1.524,.558],[-1.704,.465],[-2.013,.453]]
    : [[-2.283,-.647],[-2.125,-.668],[-1.966,-.606],[-1.794,-.499],
       [-1.34,-.530],[-1.34,.530],[-1.794,.499],[-1.966,.606],[-2.125,.668],[-2.283,.647]];
  const shape=new Shape(outline.map(([a,z])=>new Vector2(a,-z)));
  const hole=new Path();
  hole.absarc(x,0,outer,0,Math.PI*2,true);
  shape.holes.push(hole);
  const pan=new ExtrudeGeometry(shape,{depth:.011,bevelEnabled:false,curveSegments:24});
  pan.rotateX(-Math.PI/2);
  add(tray,pan,metal,[0,y-.013,0]);
  const well=new LatheGeometry([
    [0,base],[outer-.059,base],[outer-.026,base+.013],[outer-.012,base+.035],
    [outer-.005,y-.058],[outer,y-.014],[outer+.007,y-.011],
  ].map(p=>new Vector2(...p)),48);
  add(tray,well,metal,[x,0,0]);
  for(const side of [-1,1])
    box(tray,[.026,.017,.097],metal,[x-.145,base+.008,side*.226]);

  const radius=e30?.289:.316;
  const tire=new LatheGeometry([
    [.176,-.074],[radius-.025,-.075],[radius-.007,-.066],[radius,-.052],
    [radius,.051],[radius-.008,.064],[radius-.026,.074],[.176,.074],[.176,-.074],
  ].map(p=>new Vector2(...p)),48);
  const wheelY=base+.076;
  add(wheel,tire,rubber,[x,wheelY,0]);
  const rim=new LatheGeometry([
    [.173,-.068],[.184,-.069],[.188,-.058],[.173,-.047],[.165,.035],
    [.183,.049],[.187,.064],[.171,.067],[.157,.049],[.147,-.041],[.173,-.068],
  ].map(p=>new Vector2(...p)),48);
  add(wheel,rim,steel,[x,wheelY,0]);
  add(wheel,new CylinderGeometry(.152,.152,.011,48),steel,[x,wheelY+.025,0]);
  for(let i=0;i<12;i++){
    const angle=i*Math.PI/6;
    const recess=box(wheel,[.039,.003,.015],rubber,[x+.119*Math.cos(angle),wheelY+.032,.119*Math.sin(angle)],.006);
    recess.rotation.y=-angle+Math.PI/2;
  }
  add(fastener,new CylinderGeometry(.027,.029,.007,18),metal,[x,wheelY+.039,0]);
  add(fastener,new CylinderGeometry(.010,.010,.021,12),steel,[x,wheelY+.051,0]);
  box(fastener,[.050,.013,.016],vinyl,[x,wheelY+.061,0],.004);
  return {tray,wheel,fastener};
}

export function e30LuggageFloor() {
  const cover=new Group();
  const outline=[[-1.988,-.620],[-1.77,-.644],[-1.48,-.578],[-1.304,-.528],
    [-1.304,.528],[-1.507,.568],[-1.672,.442],[-1.988,.442]];
  const board=new ExtrudeGeometry(new Shape(outline.map(([x,z])=>new Vector2(x,-z))),
    {depth:.010,bevelEnabled:false});
  board.rotateX(-Math.PI/2);
  add(cover,board,floorFinish,[0,.447,0]);
  box(cover,[.047,.007,.049],felt,[-1.92,.458,0]);
  return cover;
}

export function e30TrunkPartition() {
  const partition=new Group();
  surface(partition,[
    [-1.294,.441,-.534],[-1.294,.441,.534],[-1.318,.674,-.574],[-1.318,.674,.574],
    [-1.365,.824,-.621],[-1.365,.824,.621],
  ],[0,2,1,1,2,3,2,4,3,3,4,5],floorFinish);
  return partition;
}

export function trunkHinge(e30,side) {
  const hinge=new Group(), z=side*(e30?.485:.51);
  const [x,y]=e30?[-1.568,.833]:[-1.818,1.024];
  const points=[[x,y,z],[x-.042,y-.028,z],[x-.114,y-.073,z],[x-.197,y-.045,z]];
  for(let i=0;i<points.length-1;i++){
    const a=new Vector3(...points[i]), b=new Vector3(...points[i+1]), edge=b.clone().sub(a);
    const bar=box(hinge,[.020,edge.length()+.014,.026],steel,a.clone().lerp(b,.5).toArray(),.005);
    bar.quaternion.setFromUnitVectors(new Vector3(0,1,0),edge.normalize());
  }
  const pin=add(hinge,new CylinderGeometry(.013,.013,.033,16),metal,points[0]);
  pin.rotation.x=Math.PI/2;
  return hinge;
}

export function trunkLidTrim(e30) {
  const trim=new Group();
  if(e30) {
    surface(trim,[
      [-1.591,.811,-.554],[-1.591,.811,.554],[-1.704,.815,-.655],[-1.704,.815,.655],
      [-1.998,.778,-.680],[-1.998,.778,.680],[-2.086,.739,-.627],[-2.086,.739,.627],
    ],[0,1,2,1,3,2,2,3,4,3,5,4,4,5,6,5,7,6],metal);
    for(const z of [-.52,.52]) box(trim,[.32,.015,.033],metal,[-1.858,.788,z]);
  } else {
    // The shallow tool tray stays attached to the underside of the lid.
    box(trim,[.222,.048,.662],vinyl,[-2.096,.988,0],.024);
    box(trim,[.169,.012,.568],felt,[-2.089,.962,0],.009);
    const catchPart=add(trim,new CylinderGeometry(.018,.018,.010,20),vinyl,[-2.186,.958,0]);
    catchPart.rotation.z=.11;
  }
  return trim;
}
