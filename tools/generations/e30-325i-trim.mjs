import { MeshPhysicalMaterial, MeshStandardMaterial, DoubleSide } from 'three';
import { bead, lerp, mix, patch, smooth } from './e30-exterior-surfaces.mjs';

const material = (name, color, roughness, metalness = 0) =>
  new MeshStandardMaterial({ name, color, roughness, metalness, side: DoubleSide });
const seal = material('Mirror and lamp seals', 0x16181a, .81);
const mirrorGlass = material('Exterior mirror glass',0x9ea9ae,.135,.68);
const lensFinish = (name, color, roughness) => new MeshPhysicalMaterial({
  name, color, roughness, side:DoubleSide,
  metalness:.02, clearcoat:.66, clearcoatRoughness:.17,
});
const lampColors = [
  lensFinish('Clear reversing lens', 0x92948c, .26),
  lensFinish('Red rear lamp lens', 0x7b171b, .23),
  lensFinish('Red stop lamp lens', 0x621014, .26),
  lensFinish('Amber rear turn lens', 0x9a4a09, .25),
];
const lowerReflector = material('Red rear reflector', 0x781317, .33, .22);

const flutes = [
  lensFinish('Clear lens flutes', 0xadb0a8, .32),
  lensFinish('Red lens flutes', 0x831a1d, .34),
  lensFinish('Stop lens flutes', 0x85181a, .35),
  lensFinish('Amber lens flutes', 0xac5910, .33),
];

export function drawDoorMirror(group, side, paint, onDoorGlass) {
  const door=(u,v,lift)=>{
    const p=onDoorGlass(u,v);
    return [p[0],p[1],p[2]+side*lift];
  };
  // Black sail follows the front of the moving door frame. Its inner surface
  // actually overlaps the door seal so the mounting foot stays seated.
  const sail=(u,v,lift)=>mix(door(lerp(.818,.994,u),.032,lift),
    door(lerp(.968,.994,u),.299,lift),v);
  patch(group,seal,(u,v)=>sail(u,v,.004),23,20);
  for(const u of [0,1])patch(group,seal,(v,w)=>sail(u,v,lerp(-.009,.004,w)),20,4);
  const attach=sail(.84,.37,.001);
  const center=[.697,.897,.857];

  const outline=(u,scale=1)=>{
    const a=2*Math.PI*u, c=Math.cos(a), s=Math.sin(a);
    const h=Math.sign(c)*Math.abs(c)**.54, k=Math.sign(s)*Math.abs(s)**.56;
    return [
      center[0]+scale*(.024*h+.006*k),
      center[1]+scale*(.050*k+.007*h)*(1-.085*h),
      side*(center[2]+scale*(.090*h-.008*k)),
    ];
  };
  const shape=(u,scale,depth)=>{
    const [x,y,z]=outline(u,scale);
    return [x+depth,y+.035*depth,z-side*.22*depth];
  };
  // Continuous rounded cover, with a distinctly recessed rear-facing glass.
  patch(group,paint,(u,v)=>{
    const a=v*Math.PI/2, scale=Math.cos(a)**.72;
    return shape(u,scale,.093*Math.sin(a));
  },72,24);
  patch(group,seal,(u,v)=>shape(u,lerp(1,.846,v),-.002+.014*(1-Math.cos(v*Math.PI/2))),72,11);
  patch(group,mirrorGlass,(u,v)=>shape(u,lerp(.0001,.855,v),.012-.004*(1-v*v)),72,16);
  patch(group,seal,(u,v)=>{
    const a=2*Math.PI*u;
    const root=[attach[0]+.038*Math.cos(a),attach[1]+.024*Math.sin(a),attach[2]-side*.005];
    const end=[.729+.029*Math.cos(a),.882+.024*Math.sin(a),side*.812];
    return mix(root,end,v);
  },40,16);
}

export function rearLensPoint(side,u,v,depth=0) {
  // The red and clear sections share a shallow rear-facing surface. Only
  // the short outer amber corner turns forward into the quarter panel.
  const edge=Math.max(0,(Math.abs(2*v-1)-.86)/.14);
  const round=1-Math.sqrt(1-edge*edge);
  const z=lerp(lerp(.327,.314,v)+.008*round,.787-.010*round,u);
  const y=lerp(.554+.002*u,.730-.002*u,v);
  const turn=Math.max(0,(u-.82)/.18);
  const x=-2.137+.012*u+.012*u*u+.030*turn**3
    +.0025*(2*v-1)**4-depth;
  return [x,y,side*z];
}

export function drawRearLamp(group,side) {
  // Form the complete housing and the seat behind the black perimeter gasket.
  patch(group,seal,(u,v)=>rearLensPoint(side,u,v,-.009),68,20);
  for(const u of [0,1])patch(group,seal,(v,t)=>{
    const [x,y,z]=rearLensPoint(side,u,v,-.001);
    return [x+.025*t,y,z+(u===0?.007:-.010)*side*t];
  },35,7);
  for(const v of [0,1])patch(group,seal,(u,t)=>{
    const [x,y,z]=rearLensPoint(side,u,v,-.001);
    return [x+.026*t,y+(v===0?.007:-.007)*t,z];
  },64,7);
  const zones=[[.015,.287],[.287,.523],[.523,.829],[.829,.986]];
  for(const [i,[start,end]] of zones.entries()){
    const lens=(u,v,depth=.0015)=>rearLensPoint(side,lerp(start,end,u),v,depth);
    const color=lampColors[Math.max(i,1)];
    patch(group,color,(u,v)=>lens(u,lerp(.026,.975,v)),38,23);
    if(i===0)patch(group,lampColors[0],(u,v)=>lens(lerp(.045,.987,u),lerp(.415,.689,v),.0027),32,12);
    if(i===1||i===2)patch(group,lowerReflector,(u,v)=>lens(u,lerp(.055,.385,v),.0022),34,10);
    // The ribs are shallow lens detail; the red/amber faces stay continuous.
    for(let rib=1;rib<21;rib++){
      const at=rib/21;
      const bands=i===0?[[.07,.39,1],[.44,.66,0],[.72,.94,1]]:[[.08,.93,i]];
      for(const [lo,hi,shade] of bands)
        patch(group,flutes[shade],(a,b)=>lens(at+(a-.5)*.008,lerp(lo,hi,b),.0028+.00024*Math.sin(Math.PI*a)),3,7);
    }
  }
  for(const v of [.009,.991])bead(group,seal,u=>rearLensPoint(side,u,v,-.0005),.002,78);
  for(const u of [.005,.995])bead(group,seal,v=>rearLensPoint(side,u,v,-.0005),.0019,30);
}
