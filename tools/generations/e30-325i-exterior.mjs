import {
  CylinderGeometry, DoubleSide, ExtrudeGeometry, Mesh, MeshPhysicalMaterial, Shape,
  MeshStandardMaterial, TorusGeometry, Vector3,
} from 'three';
import {bead, between, bumperFace, bumperSurface, lerp as interpolate, mix, patch, smooth} from './e30-exterior-surfaces.mjs';
import {factoryDimensions, frontAxleX, rearAxleX, frontBumperX, rearBumperX} from './e30-325i-dimensions.mjs';
import {drawDoorMirror, drawRearLamp, rearLensPoint} from './e30-325i-trim.mjs';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// US 1991 325i two-door. Factory dimensions anchor the envelope and axles.
// The individual panel contours follow the late-body photos and catalog drawings.
const color = (name, value, roughness, metalness = 0, extra = {}) =>
  new MeshStandardMaterial({name,color:value,roughness,metalness,side:DoubleSide,...extra});
export const paint = new MeshPhysicalMaterial({
  // Median sRGB from the center of the supplier's BMW 308 color chip.
  name:'E30_Body_Paint',color:0xa21920,roughness:.28,metalness:0,
  clearcoat:1,clearcoatRoughness:.09,side:DoubleSide,
  userData:{
    paintCode:'308',
    paintName:'Brillantrot',
    colorReference:'https://www.automotivetouchup.com/images/color-chips/chip_1412307.jpg',
  },
});
const rubber = color('Rubber',0x171817,.82);
const grille = color('Black grille',0x202221,.63);
const steel = color('Bright metal',0x9ea6aa,.27,.67);
const backing = color('Black recess',0x101316,.95);
const glass = new MeshPhysicalMaterial({
  name:'Clear auto glass',color:0x253432,roughness:.08,metalness:0,
  clearcoat:.67,clearcoatRoughness:.08,side:DoubleSide,
  transparent:true,opacity:.29,depthWrite:false,
});
const rearDefroster = color('Rear window defroster',0x6c5040,.69);
const lens = new MeshPhysicalMaterial({
  name:'Fluted clear lens',color:0xc0c8c6,roughness:.19,metalness:0,
  clearcoat:.55,clearcoatRoughness:.16,side:DoubleSide,
  transparent:true,opacity:.18,depthWrite:false,
});
const reflector = color('Lamp reflector',0xc3c4be,.24,.94);
const lampRing = color('Satin lamp retaining ring',0x7b7f7c,.31,.71);
const grilleEdge = color('Grille louver edge',0x252826,.58);
const chrome = color('Polished kidney surround',0xaeb5b4,.19,.90);
const badgeChrome = color('Polished model lettering',0xd7dadb,.18,.79);
const amber = new MeshPhysicalMaterial({
  name:'Amber lens',color:0x97460c,roughness:.31,metalness:.02,
  clearcoat:.53,clearcoatRoughness:.19,side:DoubleSide,
});
const red = color('Red lens',0x9f2024,.31,.15);
const reverse = color('Reverse lens',0xc7c6bd,.38,.20);
const lining = color('Black underseal',0x242425,.9);

const halfBody=factoryDimensions.width/2;
const gap=.004;
const doorFront=.802;
const doorRear=-.463;
const frontFenderBack=doorFront+gap;
const frontFenderEnd=1.962;
const rearQuarterEnd=-2.051;
const hoodBack=.861, hoodNose=frontBumperX-.070, hoodHalfWidth=.716;
const rearDeckEnd=-2.119, trunkHalfWidth=.729;
const trunkHemHeight=.090, trunkRollRadius=.027, trunkFaceRake=.060;
const rearPanelBottom=.551, rearPanelHalfWidth=.783;

function hoodEdge(u) {
  return [interpolate(hoodBack,hoodNose-.045,u),
    interpolate(.858,.736,u)+.016*Math.sin(u*Math.PI),
    interpolate(.758,hoodHalfWidth,u)+.013*Math.sin(u*Math.PI)];
}

function trunkEdge(u) {
  const edgeRoll=.023*smooth((u-.80)/.20);
  return [interpolate(-1.522,rearDeckEnd+.039,u)+edgeRoll,
    interpolate(.849,.819,u)+.009*Math.sin(Math.PI*u),
    interpolate(.748,trunkHalfWidth,smooth(u))];
}

function shoulderBase(x,front) {
  if(front) {
    const u=(x-frontFenderBack)/(frontFenderEnd-frontFenderBack);
    return interpolate(belt(x),Math.min(belt(x),hoodEdge(u)[1]-.038),smooth(u/.2));
  }
  const u=(-1.478-x)/(-1.478-rearQuarterEnd);
  return interpolate(belt(x),Math.min(belt(x),trunkEdge(u)[1]-.032),smooth(u/.56));
}

function shoulderHeight(x) {
  // The 325i profile and BMW's replacement quarter show a nearly level swage
  // below the handle, with a longer sweep down into the front lamp surround.
  const flank=.734+.005*smooth((.62-x)/1.17);
  const nose=Math.max(0,(x-.73)/(frontFenderEnd-.73));
  return flank-.048*nose**1.55-.009*smooth((-x-1.82)/(-1.82-rearQuarterEnd));
}

function swageInset(x,y) {
  const below=shoulderHeight(x)-y;
  // Turn the sheet inward below the swage. Blend into the lower panel over a
  // wider span so the upper face retains its original broad curvature.
  return .0062*smooth((below+.002)/.009)*(1-smooth((below-.014)/.107));
}

function sideHeight(x,bottom,top,t) {
  const crest=shoulderHeight(x);
  const lower=Math.max(bottom,crest-.015), upper=Math.min(top,crest+.015);
  if(t<.50)return interpolate(bottom,lower,t/.50);
  if(t<.80)return interpolate(lower,upper,(t-.50)/.30);
  return interpolate(upper,top,(t-.80)/.20);
}
const frontOpening={
  axle:frontAxleX,
  points:[[-.347,.268],[-.331,.438],[-.281,.552],[-.190,.623],[-.080,.660],[.044,.662],[.158,.634],[.256,.572],[.327,.463],[.350,.273]],
  flare:.0034,
};
const rearOpening={
  axle:rearAxleX,
  points:[[-.354,.509],[-.324,.550],[-.269,.585],[-.178,.612],[-.073,.627],[.054,.627],[.165,.605],[.263,.553],[.324,.443],[.344,.268]],
  flare:.007,
};
const leftRight = [['left',-1,'Left'],['right',1,'Right']];

function addMesh(group, geometry, material, position = [0,0,0]) {
  const mesh = new Mesh(geometry,material);
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}
function rounded(group, dimensions, material, position, radius = .01) {
  return addMesh(group,new RoundedBoxGeometry(...dimensions,2,Math.min(radius,...dimensions.map(n=>n*.44))),material,position);
}
function bar(group,from,to,width,thickness,material) {
  const delta = new Vector3(...to).sub(new Vector3(...from));
  const center = mix(from,to,.5);
  const rod = rounded(group,[thickness,delta.length(),width],material,center,thickness*.29);
  rod.quaternion.setFromUnitVectors(new Vector3(0,1,0),delta.normalize());
}

function belt(x) {
  return .830+.019*smooth((.8-x)/1.64)+.005*smooth((-x-.62)/.86)
    -.087*smooth((x-.75)/1.32)-.025*smooth((-x-1.58)/.53);
}

function sideWidth(x) {
  return .804-.036*smooth((x-1.49)/.54)-.030*smooth((-x-1.64)/.49);
}

function sill(x) {
  return .268+.252*smooth((x-1.748)/.205)+.241*smooth((-x-1.32)/.214);
}

// Smoothly interpolate photo-derived opening heights between measured axle
// locations. The late rear opening has a flatter crown and a high aft return.
function openingHeight(opening,offset) {
  const points=opening.points;
  const end=points.findIndex(([x])=>x>=offset);
  if(end<=0)return points[end<0?points.length-1:0][1];
  const [x0,y0]=points[end-1], [x1,y1]=points[end];
  const [previousX,previousY]=points[Math.max(0,end-2)], [nextX,nextY]=points[Math.min(points.length-1,end+1)];
  const span=x1-x0,t=(offset-x0)/span;
  const d0=(y1-previousY)/(x1-previousX), d1=(nextY-y0)/(nextX-x0);
  return (2*t**3-3*t*t+1)*y0+(t**3-2*t*t+t)*span*d0+(-2*t**3+3*t*t)*y1+(t**3-t*t)*span*d1;
}

function bodySideDepth(x,y) {
  const shoulder=.760-.055*smooth((x-.72)/1.25)+.009*smooth((-x-.55)/1.17);
  const below=Math.max(0,Math.min(1,(y-.268)/(shoulder-.268)));
  const above=Math.max(0,Math.min(1,(y-shoulder)/(belt(x)-shoulder)));
  const rearCorner=smooth((-x-1.69)/.40);
  const tuck=.037*(1-below)**2.8+.008*smooth((x+.463)/.20)*Math.sin(Math.PI*below)**2;
  const roll=.008*above+interpolate(.015,.006,rearCorner)*above**2;
  return sideWidth(x)+.005-roll-tuck;
}

function frontFenderSide(x,y,side) {
  const section=(y-.630)/.377;
  const tuck=(section<0?.040:.080)*section**2;
  const offset=x-frontOpening.axle;
  const arch=openingHeight(frontOpening,offset);
  const atArch=smooth((offset-frontOpening.points[0][0]+.015)/.065)
    *smooth((frontOpening.points.at(-1)[0]+.015-offset)/.065);
  const lip=frontOpening.flare*Math.exp(-((y-arch-.004)**2)/.00048)*atArch;
  // Carry the door section across the shut line, then ease into the
  // fender stamping as it rounds over the wheel toward the headlamp.
  const blend=smooth((x-frontFenderBack-.025)/.63);
  const depth=interpolate(bodySideDepth(x,y),sideWidth(x)+.005-tuck,blend)+lip-swageInset(x,y);
  return [x,y,side*depth];
}

function sideSkinPoint(x,y,side,opening) {
  if(opening===frontOpening)return frontFenderSide(x,y,side);
  const relative=opening?x-opening.axle:0;
  const lip=opening ? opening.flare * Math.exp(-((y-openingHeight(opening,relative)-.011)**2)/.0017)
    * smooth((relative-opening.points[0][0]+.08)/.09)
    * smooth((opening.points.at(-1)[0]+.08-relative)/.09) : 0;
  return [x,y,side*(bodySideDepth(x,y)+lip-swageInset(x,y))];
}

function sideSkin(group,x0,x1,side,opening) {
  const top=opening===frontOpening ? x=>shoulderBase(x,true)
    : opening===rearOpening ? x=>x < -1.478 ? shoulderBase(x,false) : belt(x) : belt;
  const cut=(start,end,floor,columns)=>{
    if(opening===frontOpening) {
      // The outer shoulder and the stamped side are rows of a single skin.
      // Shared vertices keep the front fender free of a visible shading strip.
      patch(group,paint,(u,v)=>{
        const x=interpolate(start,end,u);
        if(v<=.7)return sideSkinPoint(x,sideHeight(x,floor(x),top(x),v/.7),side,opening);
        return shoulderPoint(side,true,(x-frontFenderBack)/(frontFenderEnd-frontFenderBack),(v-.7)/.3);
      },columns,50);
    } else patch(group,paint,(u,v)=>{
      const x=interpolate(start,end,u);
      return sideSkinPoint(x,sideHeight(x,floor(x),top(x),v),side,opening);
    },columns,36);
  };
  if(!opening) {
    cut(x0,x1,sill,88);
    return;
  }
  const start=opening.axle+opening.points[0][0], end=opening.axle+opening.points.at(-1)[0];
  const arch=x=>openingHeight(opening,x-opening.axle);
  cut(x0,start,sill,48);
  cut(start,end,arch,104);
  cut(end,x1,sill,50);
  // The stamped edge rolls inward into the wheel opening before the liner.
  patch(group,paint,(u,v)=>{
    const x=interpolate(start,end,u),y=arch(x);
    const [,,z]=sideSkinPoint(x,y,side,opening);
    return [x,y-.0038*Math.sin(Math.PI*v/2),z-side*.009*v];
  },104,7);
  patch(group,lining,(u,v)=>{
    const x=interpolate(start,end,u),y=arch(x);
    const [,,z]=sideSkinPoint(x,y,side,opening);
    return [x,y-.0038-(opening===frontOpening?.016:-.012)*v,z-side*(.009+.146*v)];
  },88,9);
  patch(group,lining,(u,v)=>{
    const x=interpolate(start,end,u),y=arch(x), [,,z]=sideSkinPoint(x,y,side,opening);
    return [x,interpolate(.296,y,v),z-side*.155];
  },88,8);
}

function sideMoulding(group,x0,x1,side,opening) {
  const face=(u,v)=>{
    const x=interpolate(x0,x1,u),end=Math.min((x-x0)/.022,(x1-x)/.022,1);
    const height=.038*(.59+.41*smooth(end));
    const y=.504+height*(v-.5);
    const [,,z]=sideSkinPoint(x,y,side,opening);
    return [x,y,z+side*(.0015+(.009+.004*smooth(end))*Math.sin(Math.PI*v)**.38)];
  };
  patch(group,rubber,face,Math.max(18,Math.ceil((x1-x0)/.013)),16);
  for(const end of [0,1]) patch(group,rubber,(u,v)=>{
    const [x,y,z]=face(end,u);
    const [,,base]=sideSkinPoint(x,y,side,opening);
    return [x,y,interpolate(base-side*.002,z,v)];
  },18,4);
}

function hoodPoint(u,v) {
  const lateral=Math.abs(2*v-1);
  const [x,y,z]=hoodEdge(u);
  const lengthwiseCrown=Math.sin(Math.PI*u);
  const crown=(.024+.015*lengthwiseCrown)*(1-lateral*lateral);
  const ridge=interpolate(.34,.23,smooth(u));
  const crease=.014*(1-smooth((lateral-ridge)/.093))*(.58+.42*lengthwiseCrown);
  // The middle is almost straight across. The outer ends tuck into the
  // fender tips instead of terminating in a wide diamond-shaped bevel.
  const sweep=.045*(1-.46*lateral**2-.54*lateral**6)*u**2.5;
  return [x+sweep,y+crown+crease,(2*v-1)*z];
}

function hoodLip(u,v) {
  const [x,y,z]=hoodPoint(1,u);
  const a=v*Math.PI/2;
  return [x+.010*Math.sin(a),y-.017*(1-Math.cos(a)),z*(1-.002*v)];
}

function trunkPoint(u,v) {
  const lateral=2*v-1;
  const [x,y,z]=trunkEdge(u);
  return [x-.039*(1-.74*lateral*lateral-.26*lateral**6)*u**3,y+.012*(1-lateral*lateral),lateral*z];
}

function trunkHem(u,v) {
  const [x,y,z]=trunkPoint(1,u);
  const [deckX,deckY]=trunkPoint(.999,u);
  const start=Math.atan2(deckY-y,deckX-x);
  const end=Math.PI/2+Math.atan(trunkFaceRake);
  const angle=interpolate(start,end,Math.min(1,2*v));
  const rollDrop=trunkRollRadius*(Math.cos(start)-Math.cos(angle));
  const faceDrop=Math.max(0,2*v-1)*(trunkHemHeight-rollDrop);
  return [
    x-trunkRollRadius*(Math.sin(angle)-Math.sin(start))+trunkFaceRake*faceDrop,
    y-rollDrop-faceDrop,
    z*(1-.005*v),
  ];
}

// The 1991 coupe turns through a short radius above the near-flat badge face.
// https://carsandbids.com/auctions/3vVZ1qQd/1991-bmw-325i-coupe
function trunkSkin(u,v) {
  return u<=.80?trunkPoint(u/.80,v):trunkHem(v,(u-.80)/.20);
}

// Use the same start curve as the side skin and the same end curve as the
// moving panel. A wide rolled shoulder transitions into a level panel gap.
function shoulderPoint(side,front,u,v) {
  const [deckX,deckY,deckZ]=(front?hoodEdge:trunkEdge)(u);
  const x=interpolate(front?frontFenderBack:-1.478,front?frontFenderEnd:rearQuarterEnd,u);
  const base=shoulderBase(x,front);
  const [,,outerZ]=sideSkinPoint(x,base,side,front?frontOpening:rearOpening);
  if(front){
    // The fender turns once into the shut line. Its two handle points
    // match the slope of the outer skin and the near-flat hood flange.
    const outer=Math.abs(outerZ),inner=deckZ+gap;
    const target=deckY-.0015,rise=target-base;
    const derivative=(outer-Math.abs(frontFenderSide(x,base-.001,side)[2]))/.001;
    const controlOuter=outer+Math.max(-.018,Math.min(0,derivative*rise*.61));
    const controlInner=inner+(outer-inner)*.67;
    const t=1-v;
    const y=t**3*base+3*t*t*v*(base+rise*.60)+3*t*v*v*target+v**3*target;
    const z=t**3*outer+3*t*t*v*controlOuter+3*t*v*v*controlInner+v**3*inner;
    return [interpolate(x,deckX,smooth(v)),y,side*z];
  }
  const angle=v*Math.PI/2;
  const inner=deckZ+gap, outer=Math.abs(outerZ), rise=deckY-.0015-base;
  const insideSlope=(outer-Math.abs(sideSkinPoint(x,base-.001,side,front?frontOpening:rearOpening)[2]))/.001;
  const tangent=Math.max(-.10,Math.min(.015,insideSlope*rise*Math.PI/2));
  const z=interpolate(outer,inner,1-Math.cos(angle))+tangent*v*(1-v)**2;
  return [interpolate(x,deckX,smooth(v)),base+rise*Math.sin(angle),side*z];
}

function fenderShoulder(group,side,front) {
  patch(group,paint,(u,v)=>shoulderPoint(side,front,u,v),64,18);
}

// Four boundaries define each corner so the widening return matches the
// quarter, the edge of the lamp aperture and the lid without double surfaces.
function betweenEdges(left,right,bottom,top,u,v) {
  const sides=mix(left(v),right(v),u), ends=mix(bottom(u),top(u),v);
  const linear=mix(mix(bottom(0),bottom(1),u),mix(top(0),top(1),u),v);
  return sides.map((coordinate,i)=>coordinate+ends[i]-linear[i]);
}

function trunkCornerInner(side,v) {
  const [x,y,z]=trunkHem(side<0?0:1,1-v);
  return [x+.0005,y-.0015,z+side*gap];
}

function rearCornerLower(side,u) {
  const [,y]=trunkCornerInner(side,0);
  const [,,sideZ]=sideSkinPoint(rearQuarterEnd,y,side,rearOpening);
  // At the lamp top the panel wraps forward to the side of its lens gasket.
  const x=trunkCornerInner(side,0)[0];
  return [interpolate(x,rearQuarterEnd,u)-.005*Math.sin(Math.PI*u),y,
    interpolate(trunkCornerInner(side,0)[2],sideZ,u)];
}

function rearQuarterReturn(group,side) {
  const inner=v=>trunkCornerInner(side,v), lower=u=>rearCornerLower(side,u);
  const upper=u=>shoulderPoint(side,false,1,1-u);
  const outer=v=>{
    const y=interpolate(lower(1)[1],upper(1)[1],v);
    return sideSkinPoint(rearQuarterEnd,y,side,rearOpening);
  };
  patch(group,paint,(u,v)=>betweenEdges(inner,outer,lower,upper,u,v),24,22);
  // Bring the quarter up to the outer gasket along the lamp's curved edge.
  const [,bottom]=rearLensPoint(side,1,0), [,top]=rearLensPoint(side,1,1);
  const endY=lower(0)[1];
  patch(group,paint,(u,v)=>{
    const y=interpolate(.548,endY,v);
    const [x,,z]=rearLensPoint(side,1,Math.max(.003,Math.min(.997,(y-bottom)/(top-bottom))));
    return mix([x+.0035,y,z+side*.003],sideSkinPoint(rearQuarterEnd,y,side,rearOpening),u);
  },18,29);
  // Close the narrow underside of the corner above the lens; seat it
  // behind the top gasket rather than continuing any metal into the lens.
  patch(group,paint,(u,v)=>{
    const p=lower(u);
    return [p[0]+.012*v,p[1]+.002*v,p[2]];
  },28,5);
}

function rearPanelPoint(u,v) {
  const t=2*u-1, a=Math.abs(t);
  const hem=trunkHem(u,1);
  const z=t*interpolate(rearPanelHalfWidth,trunkHalfWidth*.995,smooth((v-.66)/.34));
  const y=interpolate(rearPanelBottom,hem[1]-.004,v);
  const plate=interpolate(-2.125+.047*a**4,hem[0]+.004,smooth(v));
  const lampV=Math.max(0,Math.min(1,(y-.566)/.162));
  const [,,inboard]=rearLensPoint(1,0,lampV), [,,outboard]=rearLensPoint(1,1,lampV);
  const lensU=Math.max(0,Math.min(1,(Math.abs(z)-inboard)/(outboard-inboard)));
  const [lensX]=rearLensPoint(1,lensU,lampV);
  // The painted rail is close to the lens base; inside the aperture the
  // stamping steps forward so the lens and its gasket can seat over it.
  const seat=lensX+.003+.007*smooth((y-.563)/.022);
  return [interpolate(plate,seat,smooth((Math.abs(z)-.295)/.036)),y,z];
}

// On the late bumper the three black mouldings follow one swept cover.
// Stations progress from the center of the tail to the rear wheel opening.
const rearCoverStations=[
  [0,rearBumperX+.010,0], [.49,rearBumperX+.021,.685], [.57,-2.142,.753],
  [.65,-2.094,.794], [.74,-2.013,.805], [.86,-1.819,.812], [1,-1.543,.809],
];
function coverFootprint(u) {
  const stations=rearCoverStations, k=stations.findIndex(row=>row[0]>=u);
  if(k<=0)return stations[k===0?0:stations.length-1].slice(1);
  const p=stations[k-1], q=stations[k], a=stations[Math.max(0,k-2)], b=stations[Math.min(k+1,stations.length-1)];
  const step=q[0]-p[0], t=(u-p[0])/step;
  return [1,2].map(i=>{
    const dp=k===1&&i===1?0:(q[i]-a[i])/(q[0]-a[0]);
    const dq=(b[i]-p[i])/(b[0]-p[0]);
    return (2*t**3-3*t*t+1)*p[i]+(t**3-2*t*t+t)*step*dp+
      (-2*t**3+3*t*t)*q[i]+(t**3-t*t)*step*dq;
  });
}
function coverSurface(t,v,layer=0) {
  const a=Math.abs(t),side=t<0?-1:1;
  const [x,z]=coverFootprint(a);
  const upper=.548-.002*smooth((a-.73)/.27);
  const lower=.420+.001*smooth((a-.73)/.27);
  const height=interpolate(lower,upper,v);
  const crown=.007*Math.sin(Math.PI*v)-.005*Math.abs(2*v-1)**6;
  const before=coverFootprint(Math.max(0,a-.0005)), after=coverFootprint(Math.min(1,a+.0005));
  const [dx,dz]=after.map((n,i)=>n-before[i]),length=Math.hypot(dx,dz);
  const tip=smooth((a-.965)/.035);
  return [x-(crown+layer)*dz/length+.004*tip*Math.abs(2*v-1)**3,
    height,side*(z+(crown+layer)*dx/length-.004*tip)];
}

function rearBumperSeat({side, a, top}) {
  const corner=.65;
  const [cornerX,cornerZ]=coverFootprint(corner);
  const [frontX]=coverFootprint(1);
  const y=top[1]-.002;
  const tailU=(1+side*Math.min(1,top[2]*side/cornerZ))/2;
  const [panelX,,panelZ]=rearPanelPoint(tailU,0);
  const tail=[panelX+.010,y,panelZ];
  if(a<=corner)return tail;
  const x=interpolate(rearQuarterEnd+.005,frontX,(top[0]-cornerX)/(frontX-cornerX));
  const [,,quarterZ]=sideSkinPoint(x,rearPanelBottom,side,rearOpening);
  return mix(tail,[x,y,quarterZ-side*.008],smooth((a-corner)/.095));
}

function coverEdges(t) {
  const a=Math.abs(t),side=t<0?-1:1;
  const top=coverSurface(t,1);
  const seat=rearBumperSeat({a,side,top});
  const dx=seat[0]-top[0], dz=seat[2]-top[2];
  const distance=Math.hypot(dx,dz);
  const ledge=interpolate(.041,.023,smooth((a-.32)/.30));
  const inset=Math.max(0,1-ledge/Math.max(distance,.001));
  return { seat, shiftX: dx*inset, shiftZ: dz*inset };
}

function coverContour(t,v,layer=0) {
  const [x,y,z]=coverSurface(t,v,layer);
  if(v<=.76)return [x,y,z];
  const {shiftX,shiftZ}=coverEdges(t);
  const blend=smooth((v-.76)/.24);
  return [x+shiftX*blend,y,z+shiftZ*blend];
}

function rearBumperSkin(u,v) {
  const t=2*u-1;
  if(v<=.80)return coverContour(t,v/.80);
  return mix(coverContour(t,1),coverEdges(t).seat,(v-.80)/.20);
}

function bumperMouldingPoint(t,v,extra=0) {
  // Align the upper and lower edges on the same cover all the way into the
  // side return. The moulding face has rounded lips and a shallow inset seam.
  return coverContour(t,interpolate(.345,.817,v),
    .0018+.0052*Math.sin(Math.PI*v)**.62+extra);
}
function rearApronPoint(t,v) {
  const high=coverContour(t,0);
  const a=Math.abs(t),side=Math.sign(t);
  return [high[0]+(1-v)*interpolate(.055,.025,smooth((a-.56)/.36))+.004*v,
    interpolate(.306+.004*smooth((a-.78)/.22),high[1]+.006,v),
    high[2]-side*(interpolate(.036,.018,v)+.003*Math.sin(Math.PI*v))];
}

// These painted returns turn into the shadowed aperture. They move with the
// corresponding panels and cover the inside edges when a component is hidden.
function panelReturn(group, material, edge, down, inset, rows=5) {
  patch(group,material,(u,v)=>{
    const [x,y,z]=edge(u);
    return [x+inset*v,y-down*v,z*(1-.012*v)];
  },56,rows);
}

export function roofPoint(u,v) {
  const z=2*v-1, edge=Math.abs(z);
  const back=-1.105+.053*edge**4, front=.361-.057*edge**4;
  return [
    interpolate(back,front,u),
    factoryDimensions.unloadedHeight-.074+.008*Math.sin(Math.PI*u)+.055*(1-z*z)+.011*Math.sin(Math.PI*u)*(1-edge**4),
    z*(.598+.019*Math.sin(Math.PI*u)),
  ];
}

export function glassPoint(front,u,v) {
  const t=2*v-1;
  const lower=front?[.858+.024*(1-t*t),.852+.012*(1-t*t),.748*t]
    :[-1.515-.034*(1-t*t),.846+.010*(1-t*t),.744*t];
  const roof=roofPoint(front?1:0,v);
  const upper=[roof[0]+(front?.002:-.004),roof[1]-(front?.007:.011),roof[2]*.998];
  const [x,y,z]=mix(lower,upper,u);
  const crown=.014*(1-t*t)*Math.sin(u*Math.PI);
  if(front)return [x+crown,y+crown*.38,z];
  // The bowed glass leans forward as it rises. The lower corners spread
  // wider than the roof and turn into the painted sail panels.
  return [x-1.06*crown,y+crown*.21,z];
}

// Project each radial line onto a rounded rectangle in glass coordinates.
// The ellipse at each corner is tangent to both straight perimeter edges.
function rearOpeningUV(u,v,inset) {
  const t=2*u-1, w=2*v-1, radial=Math.max(Math.abs(t),Math.abs(w));
  if(radial===0)return [.5,.5];
  const halfHeight=.481-.031*inset, halfWidth=.490-.012*inset;
  const ry=.076-.023*inset, rz=.038-.009*inset;
  const Y=Math.abs(t)/radial*halfHeight, Z=Math.abs(w)/radial*halfWidth;
  const cy=halfHeight-ry, cz=halfWidth-rz;
  let scale=1;
  if(Y>cy&&Z>cz){
    const sy=Y/ry,sz=Z/rz,ey=cy/ry,ez=cz/rz;
    const a=sy*sy+sz*sz,b=sy*ey+sz*ez,c=ey*ey+ez*ez-1;
    scale=(b+Math.sqrt(Math.max(0,b*b-a*c)))/a;
  }
  return [.5+Math.sign(t)*Y*scale*radial,.5+Math.sign(w)*Z*scale*radial];
}

export function rearOpeningPoint(u,v,inset=0) {
  const [x,y,z]=glassPoint(false,...rearOpeningUV(u,v,inset));
  return [x+.0028*inset,y-.001*inset,z];
}

function openingPerimeter(t) {
  // Start at the middle of the lower edge so the only mesh seam stays
  // away from the rounded corners.
  const distance=(t*4+.5)%4, offset=distance%1;
  switch(Math.floor(distance)){
    case 0:return [0,offset];
    case 1:return [offset,1];
    case 2:return [1,1-offset];
    default:return [1-offset,0];
  }
}

function rearSurround(group) {
  const outline=t=>glassPoint(false,...openingPerimeter(t));
  const aperture=t=>rearOpeningPoint(...openingPerimeter(t));
  between(group,paint,outline,aperture,224,8);
}

function rearScreen(group) {
  const glassEdge=t=>rearOpeningUV(...openingPerimeter(t),1);
  patch(group,glass,(u,v)=>{
    const [gy,gz]=mix([.5,.5],glassEdge(u),.0002+.9998*v);
    const [x,y,z]=glassPoint(false,gy,gz);
    return [x+.0028,y-.001,z];
  },224,10);
  patch(group,rubber,(u,v)=>{
    const [x,y,z]=rearOpeningPoint(...openingPerimeter(u),v);
    const crown=Math.sin(Math.PI*v)*.0022;
    return [x-crown,y+crown*.32,z];
  },224,10);
  bead(group,grille,u=>{
    const [x,y,z]=rearOpeningPoint(...openingPerimeter(u),.42);
    return [x-.0013,y+.00035,z];
  },.00125,224);
  for(let line=1;line<=11;line++){
    const row=.092+line*.068;
    patch(group,rearDefroster,(u,v)=>{
      const [x,y,z]=rearOpeningPoint(row+(u-.5)*.0018,.023+.954*v,1);
      return [x+.00065,y-.0003,z];
    },1,52);
  }
}

function screen(group,front) {
  patch(group,glass,(u,v)=>glassPoint(front,.018+u*.964,.012+v*.976),28,44);
  for(const end of [0,1]){
    patch(group,rubber,(u,v)=>glassPoint(front,end?.973+u*.027:u*.026,v),5,48);
    patch(group,rubber,(u,v)=>glassPoint(front,u,end?.978+v*.022:v*.022),32,5);
    bead(group,grille,u=>glassPoint(front,u,end?.992:.008),.0032,44);
  }
}

const sideTop = { front:[.299,1.287,.596], pillar:[-.478,1.296,.617], rear:[-.984,1.287,.605] };
const sideBottom = { front:[.787,.832,.763], pillar:[-.470,.845,.786], rear:[-1.337,.847,.754] };
function quarterCurve(v) {
  const x=.009*Math.sin(Math.PI*v)-.010*(1-smooth(v/.19))-.006*smooth((v-.83)/.17);
  return [x,0,.004*Math.sin(Math.PI*v)];
}
function windowLine(lower,upper,side,u,v,rear=false) {
  const p=mix(lower(u),upper(u),v);
  const bow=Math.sin(u*Math.PI)*Math.sin(v*Math.PI);
  const kick=rear?quarterCurve(v).map(component=>component*(1-smooth(u/.47))):[0,0,0];
  return [p[0]+kick[0],p[1]+kick[1],side*(p[2]+.009*bow+kick[2])];
}
function windowEdges(group,lower,upper,side,rear=false) {
  const at=(u,v)=>windowLine(lower,upper,side,u,v,rear);
  patch(group,glass,(u,v)=>at(.012+.976*u,.015+.97*v),38,18);
  for(const end of [0,1]){
    patch(group,rubber,(u,v)=>at(u,end? .967+.033*v : .028*v),36,5);
    patch(group,rubber,(u,v)=>at(end? .976+.024*u : .022*u,v),5,24);
  }
  bead(group,grille,u=>at(u,.022),.005,46);
}

export function pillarPoint(side,front,u,v) {
  const key=front?'front':'rear';
  const sideLine=mix(sideBottom[key],sideTop[key],u);
  if(!front)quarterCurve(u).forEach((offset,i)=>sideLine[i]+=offset);
  const screenLine=glassPoint(front,u,side===1?1:0);
  sideLine[2]*=side;
  const point=mix(sideLine,screenLine,v);
  point[2]+=side*(front?.012:.006)*Math.sin(v*Math.PI)*Math.sin(u*Math.PI);
  if(!front){
    // A soft crown turns the painted C-pillar into the rubber channel.
    point[0]-=.003*Math.sin(Math.PI*v)*Math.sin(Math.PI*u);
  }
  return point;
}

function pillar(group,side,front) {
  patch(group,paint,(u,v)=>pillarPoint(side,front,u,v),44,13);
  if(front)return;
  // The rear pillar blends into the quarter and fixed deck at its base.
  patch(group,paint,(u,v)=>{
    const top=pillarPoint(side,false,0,u);
    const lowerX=interpolate(-1.348,-1.515,u),lowerY=interpolate(belt(lowerX)-.001,.844,smooth(u));
    const quarter=sideSkinPoint(lowerX,lowerY,side,rearOpening);
    const lower=[lowerX, lowerY, side*interpolate(Math.abs(quarter[2])-.002,.745,u)];
    const point=mix(lower,top,v);
    point[2]+=side*.003*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
    return point;
  },32,12);
}

const grilleOuter = v => .749-.033*Math.abs(2*v-1)**4;
const grilleLower = z => .550+.012*smooth((Math.abs(z)-.59)/.16);
const frontUpper = z => {
  const s=Math.min(1,Math.abs(z)/hoodHalfWidth);
  return hoodLip((s+1)/2,1)[1]-.004;
};
// The late 325i profile and three-quarter photos show a shallow forward
// rake below the hood lip. The grille, lamp pockets and valance join here.
// https://bringatrailer.com/listing/1991-bmw-325i-86/
const frontPanelRake = .105;
const frontFaceX = (z,y) => {
  const s=Math.abs(z)/hoodHalfWidth;
  const lip=hoodLip((Math.min(s,1)+1)/2,1)[0];
  return lip-.017-(frontUpper(z)-y)*frontPanelRake-.019*smooth((s-.88)/.19);
};
const headlampCenters=[.445,.625];
const headlampRadii=[.083,.086];

function noseCorner(group,side) {
  const top=u=>shoulderPoint(side,true,1,1-u);
  const inside=v=>{
    const z=grilleOuter(v),y=interpolate(grilleLower(z)-.004,frontUpper(z),v);
    return mix([frontFaceX(z,y)+.007,y,side*(z+.003)],top(0),smooth((v-.84)/.16));
  };
  const outside=v=>{
    const y=interpolate(sill(frontFenderEnd),top(1)[1],v);
    return sideSkinPoint(frontFenderEnd,y,side,frontOpening);
  };
  const bottom=u=>mix(inside(0),outside(0),u);
  patch(group,paint,(u,v)=>betweenEdges(inside,outside,bottom,top,u,v),28,42);
}

// Subtle corner radii, cut into the fascia surface rather than stacked
// rectangular blocks. Each lamp lens follows the bumper bow.
function fasciaInsert(group,material,profile,y,z,height,width,offset) {
  patch(group,material,(u,v)=>{
    const edge=Math.abs(2*u-1),widthEdge=Math.sqrt(Math.max(0,1-((edge-.85)/.15)**2));
    const corner=edge>.85?widthEdge:1;
    const yy=y+(v-.5)*height*(.72+.28*corner),zz=z+(u-.5)*width;
    return bumperFace(profile,yy,zz,offset);
  },42,12);
}

function faceBand(group,material,y0,y1,z0,z1,depth=0) {
  patch(group,material,(u,v)=>{
    const z=interpolate(z0,z1,u),y=interpolate(y0(z),y1(z),v);
    return [frontFaceX(z,y)+depth,y,z];
  },52,9);
}
const fixed=y=>()=>y;

function sideGrille(group,sign) {
  const inboard=.155;
  const surface=(lateral,v,depth)=>{
    const z=sign*lateral;
    const y=interpolate(grilleLower(z),frontUpper(z),v);
    return [frontFaceX(z,y)+depth,y,z];
  };
  const point=(u,v,depth)=>surface(interpolate(inboard,grilleOuter(v),u),v,depth);
  patch(group,backing,(u,v)=>point(u,v,-.062),44,16);
  for(let i=1;i<=8;i++){
    const row=i/9;
    const limits=(v)=>{
      const [inner,outer]=headlampCenters.map((center,index)=>{
        const y=surface(center,v,0)[1];
        const reach=Math.sqrt(Math.max(0,(headlampRadii[index]+.006)**2-(y-.644)**2));
        return [center-reach,center+reach];
      });
      return [[inboard,inner[0]],[inner[1],outer[0]],[outer[1],grilleOuter(v)]];
    };
    for(let section=0;section<3;section++)patch(group,grille,(u,v)=>{
      const height=row+(v-.5)*.046;
      const [left,right]=limits(height)[section];
      return surface(interpolate(left,right,u),height,.002+.007*Math.sin(Math.PI*v));
    },32,6);
  }
  for (const v of [0,1]) bead(group,grille,u=>point(u,v,.006),.004,44);
  bead(group,grille,v=>point(1,v,.007),.006,40);
}

function kidney(group,sign) {
  const center=.081,midY=.645;
  const halfWidth=.077,halfHeight=.103;
  const contour=(angle,width,height)=>{
    const sine=Math.sin(angle),cosine=Math.cos(angle);
    const vertical=Math.sign(sine)*Math.abs(sine)**.40;
    const lateral=Math.sign(cosine)*Math.abs(cosine)**.43;
    return [midY+height*vertical,sign*(center+width*lateral*(1+.035*vertical))];
  };
  // Keep the chrome face close to the side grilles and roll it into the insert.
  patch(group,chrome,(u,v)=>{
    const [y,z]=contour(2*Math.PI*u,halfWidth-.009*v,halfHeight-.009*v);
    return [frontFaceX(z,y)+.010+.004*Math.sin(Math.PI*v),y,z];
  },88,12);
  patch(group,grille,(u,v)=>{
    const [y,z]=contour(2*Math.PI*u,halfWidth-.009-.002*v,halfHeight-.009-.002*v);
    return [frontFaceX(z,y)+interpolate(.010,-.028,v),y,z];
  },88,7);
  patch(group,backing,(u,v)=>{
    const [edgeY,edgeZ]=contour(2*Math.PI*u,.070,.097);
    const y=interpolate(midY,edgeY,.003+.997*v),z=interpolate(sign*center,edgeZ,.003+.997*v);
    return [frontFaceX(z,y)-.034,y,z];
  },72,14);
  for(const offset of [-.051,-.034,-.017,0,.017,.034,.051]){
    const height=.093*(1-(Math.abs(offset)/.067)**4.6)**.24;
    patch(group,grilleEdge,(u,v)=>{
      const y=midY+height*(2*v-1);
      const z=sign*(center+offset+.006*(u-.5)+.003*(v-.5));
      return [frontFaceX(z,y)+.002+.005*Math.sin(Math.PI*u),y,z];
    },8,22);
  }
}

function frontLamp(group,z,radius) {
  const y=.644;
  const face=frontFaceX(z,y);
  const profile=(u,v,depth)=>{
    const angle=2*Math.PI*u,r=radius*v;
    return [face+depth,y+r*Math.sin(angle),z+r*Math.cos(angle)];
  };
  const housing=addMesh(group,new CylinderGeometry(radius+.007,radius-.002,.064,56,1,true),backing,[face-.021,y,z]);
  housing.rotation.z=Math.PI/2;
  for(const [r,thickness,material,x] of [[radius+.003,.005,grille,face+.008],[radius-.003,.0026,lampRing,face+.015]]){
    const ring=addMesh(group,new TorusGeometry(r,thickness,10,64),material,[x,y,z]);
    ring.rotation.y=Math.PI/2;
  }
  // Keep the small reflector facets in the bowl, clear of the molded cover.
  const sectors=40;
  for(let sector=0;sector<sectors;sector++){
    patch(group,reflector,(u,v)=>{
      const r=.008+.946*v;
      const depth=-.048+.054*r*r+.0018*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
      return profile((sector+u)/sectors,r,depth);
    },3,13);
  }
  patch(group,lampRing,(u,v)=>profile(u,interpolate(.84,.94,v),.005+.006*v),62,6);
  const bulb=addMesh(group,new CylinderGeometry(.0075,.006,.021,24),lampRing,[face-.028,y,z]);
  bulb.rotation.z=Math.PI/2;
  const crown=(dy,dz)=>face+.024-.011*(dy*dy+dz*dz)/radius**2;
  patch(group,lens,(u,v)=>profile(u,(.008+.992*v)*.971,.013+.011*(1-v*v)),68,17);
  for(let i=-14;i<=14;i++){
    const dz=i*radius*.061;
    const height=Math.sqrt((radius*.93)**2-dz**2);
    patch(group,lens,(u,v)=>{
      const dy=(2*u-1)*height,w=dz+(v-.5)*.0021;
      return [crown(dy,w)+.00135*Math.sin(Math.PI*v),y+dy,z+w];
    },22,4);
  }
  for(const dy of [-.041,-.018,.019,.040]){
    const width=Math.sqrt((radius*.94)**2-dy**2);
    patch(group,lens,(u,v)=>{
      const dz=(2*u-1)*width,w=dy+(v-.5)*.0028;
      return [crown(w,dz)+.00125*Math.sin(Math.PI*v),y+w,z+dz];
    },25,5);
  }
}

function roundel(group,position,vertical,tilt=0) {
  const radius=vertical?.039:.041;
  const badge = addMesh(group,new CylinderGeometry(radius,radius,.004,48),steel,position);
  const inner = addMesh(group,new CylinderGeometry(radius*.91,radius*.91,.005,48),grille,position);
  if(vertical) badge.rotation.z=inner.rotation.z=Math.PI/2+tilt;
  const bmwBlue = color('Badge blue',0x2a75ad,.45);
  for(const i of [0,1,2,3]){
    const disc = addMesh(group,new CylinderGeometry(radius*.66,radius*.66,.006,16,1,false,i*Math.PI/2,Math.PI/2),i%2?reverse:bmwBlue,position);
    if(vertical) disc.rotation.z=Math.PI/2+tilt;
  }
}

// The period BMW badge has broad, low digits with rounded shoulders and a
// separate lower-case i. These outlines make solid raised characters.
const badgeGlyphs=[
  {offset:0,width:.032,outline:[[0,.78],[.09,1],[.88,1],[1,.84],[1,.61],[.86,.50],[1,.39],[1,.15],[.88,0],[.09,0],[0,.18],[0,.25],[.22,.25],[.24,.17],[.71,.17],[.79,.23],[.79,.36],[.73,.41],[.27,.41],[.27,.59],[.73,.59],[.79,.65],[.79,.76],[.73,.82],[.24,.82],[.21,.76],[0,.76]]},
  {offset:.039,width:.034,outline:[[0,.76],[.08,1],[.88,1],[1,.83],[1,.62],[.88,.49],[.29,.31],[.22,.24],[.22,.18],[1,.18],[1,0],[0,0],[0,.25],[.12,.42],[.74,.62],[.79,.68],[.79,.76],[.73,.82],[.24,.82],[.21,.76]]},
  {offset:.080,width:.034,outline:[[.04,1],[1,1],[1,.82],[.24,.82],[.21,.61],[.87,.61],[1,.46],[1,.16],[.88,0],[.10,0],[0,.16],[0,.25],[.22,.25],[.24,.18],[.73,.18],[.79,.24],[.79,.37],[.73,.43],[.04,.43]]},
  {offset:.123,width:.009,outline:[[0,0],[1,0],[1,.70],[0,.70]]},
  {offset:.123,width:.009,outline:[[0,.82],[1,.82],[1,1],[0,1]]},
];

function modelLettering(group,mount){
  for(const {offset,width,outline} of badgeGlyphs){
    const shape=new Shape();
    for(const [i,[u,v]] of outline.entries()){
      const x=u*width,y=v*.028;
      if(i===0)shape.moveTo(x,y);
      else shape.lineTo(x,y);
    }
    shape.closePath();
    const geometry=new ExtrudeGeometry(shape,{
      depth:.0024,bevelEnabled:true,bevelThickness:.00065,bevelSize:.00055,bevelSegments:2,steps:1,
    });
    const vertices=geometry.getAttribute('position');
    for(let i=0;i<vertices.count;i++){
      const z=.519+offset+vertices.getX(i), y=.747+vertices.getY(i);
      const [x]=mount(z,y);
      vertices.setXYZ(i,x+.0011-vertices.getZ(i),y,z);
    }
    geometry.computeVertexNormals();
    addMesh(group,geometry,badgeChrome);
  }
}

export function buildE30Exterior(add) {
  add('e30body:assembly','frame','Body frame and pillars',[0,0,0],[0,.56,0],g=>{
    rounded(g,[2.29,.044,1.437],lining,[-.171,.313,0],.019);
    rounded(g,[.055,.45,1.39],paint,[.681,.523,0],.022);
    rounded(g,[.052,.41,1.39],paint,[-1.289,.609,0],.02);
    rearSurround(g);
    // A single dark gasket bed connects the backlight to the parcel shelf.
    patch(g,lining,(u,v)=>{
      const p=glassPoint(false,0,u);
      return [p[0]+.058*v,p[1]-.002-.017*v,p[2]*(1-.20*v)];
    },56,9);
    for(const [,side] of leftRight){
      const signed=([x,y,z])=>[x,y,side*z];
      pillar(g,side,true);
      pillar(g,side,false);
      bar(g,signed([-.472,.831,.783]),signed([-.478,1.298,.612]),.052,.041,grille);
      between(g,paint,u=>roofPoint(u,side===1?1:0),u=>{
        const [x,y,z]=roofPoint(u,side===1?1:0);
        return [x,y-.022,z+side*.004];
      },56,9);
      bead(g,rubber,u=>{
        const [x,y,z]=roofPoint(u,side===1?1:0);
        return [x,y-.019,z+side*.004];
      },.0036,50);
      patch(g,paint,(u,v)=>{
        const front=glassPoint(false,0,.5+.5*side*u);
        const rear=trunkPoint(0,.5+.5*side*u);
        return mix([front[0],front[1]-.003,front[2]],
          [rear[0]+.005,rear[1]-.002,rear[2]],v);
      },36,12);
      // Trim the shelf ends over the exposed body rail, below the glass.
      // The upholstery covers the rail and lands against the inner pillar.
      patch(g,lining,(u,v)=>{
        const z=interpolate(.580,.720,v);
        const back=glassPoint(false,0,(1+side*z/.744)/2);
        const x=interpolate(back[0]+.008,-1.208,u);
        return [x,interpolate(.860,.844,v)+.003*Math.sin(Math.PI*u),side*z];
      },36,12);
      for(const x of [-.468,.805])patch(g,lining,(u,v)=>{
        const px=x+(u-.5)*.039,y=interpolate(.273,belt(px),v);
        const [,,z]=sideSkinPoint(px,y,side);
        return [px,y,z-side*.016];
      },8,37);
    }
  },{page:'single_components_for_body_side_frame',paintSurface:true,cabinVisible:true});
  add('e30body:assembly','hood','Hood',[0,0,0],[.45,1.35,0],g=>{
    patch(g,paint,hoodPoint,60,60);
    patch(g,paint,hoodLip,74,12);
    panelReturn(g,lining,u=>hoodPoint(0,u),.022,.012);
    for(const edge of [0,1])
      panelReturn(g,lining,u=>hoodPoint(u,edge),.013,0,4);
    const [x,y]=hoodPoint(.924,.5);
    roundel(g,[x,y+.002,0],false);
  },{page:'hood',paintSurface:true,cabinVisible:true});
  add('e30body:assembly','trunk','Trunk lid',[0,0,0],[-.59,1.18,0],g=>{
    patch(g,paint,trunkSkin,120,56);
    // The underside of the hem stays behind the gap and moves with the lid.
    patch(g,lining,(u,v)=>{
      const [x,y,z]=trunkHem(u,1);
      return [x+.003+.009*v,y-.001-.004*v,z*(1-.004*v)];
    },62,5);
    function trunkBadge(z,y) {
      const face=v=>trunkHem((1+z/(trunkHalfWidth*(1-.005*v)))/2,v);
      let lo=0,hi=1;
      for(let i=0;i<16;i++){
        const mid=(lo+hi)/2;
        if(face(mid)[1]>y)lo=mid;else hi=mid;
      }
      return [face((lo+hi)/2)[0]-.002,y,z];
    }
    roundel(g,trunkBadge(0,.781),true,Math.atan(trunkFaceRake));
    modelLettering(g,trunkBadge);
  },{page:'trunk_lid_closing_system',paintSurface:true,cabinVisible:true});
  add('e30body:assembly','roof','Roof skin',[0,0,0],[-.08,1.53,0],g=>{
    // These four strips and the inset sliding panel share one crowned surface.
    const strips=[[0,.43,0,1],[.82,1,0,1],[.43,.82,0,.172],[.43,.82,.828,1]];
    for(const [u0,u1,v0,v1] of strips)
      patch(g,paint,(u,v)=>roofPoint(interpolate(u0,u1,u),interpolate(v0,v1,v)),34,35);
    // The sheet turns down to the upper glass gasket. Keep a smooth separate
    // seam between the painted roof and the rubber seal at each screen.
    for (const front of [true,false]) {
      const roofEdge=front?1:0;
      patch(g,paint,(u,v)=>{
        const start=roofPoint(roofEdge,u), end=glassPoint(front,1,u);
        return [interpolate(start[0],end[0],v),interpolate(start[1],end[1]+.002,v),interpolate(start[2],end[2],v)];
      },48,4);
      if(front)bead(g,rubber,u=>{
        const [x,y,z]=glassPoint(front,1,u);
        return [x,y+.0008,z];
      },.0032,48);
    }
  },{page:'single_components_for_body_side_frame',paintSurface:true,cabinVisible:true});
  add('e30body:assembly','sunroof','Sliding sunroof panel',[0,0,0],[.1,1.85,0],g=>{
    patch(g,paint,(u,v)=>roofPoint(.432+u*.386,.176+v*.648),26,30);
    for(const end of [0,1]){
      const seal=(u,v)=>{const [x,y,z]=roofPoint(u,v);return [x,y-.0016,z];};
      bead(g,rubber,u=>seal(.430+u*.390,end?.828:.172),.0017,27);
      bead(g,rubber,u=>seal(end?.820:.430,.172+u*.656),.0017,27);
    }
  },{page:'single_parts_for_sliding_lifting_roof',paintSurface:true,cabinVisible:true});
  add('e30body:assembly','windshield','Windshield',[0,0,0],[.58,1.04,0],g=>screen(g,true),
    {page:'glazing',cabinVisible:true,cabinGlazing:true});
  add('e30body:assembly','rear-window','Rear window',[0,0,0],[-.67,1.01,0],rearScreen,
    {page:'glazing',cabinVisible:true,cabinGlazing:true});
  const onScreen=(u,v,offset)=>{
    const [x,y,z]=glassPoint(true,u,v);
    return [x+offset*.65,y+offset,z];
  };
  for(const [side,sign,start,end,pivot,armNumber,bladeNumber] of [
    ['left',-1,.045,.462,.150,'61611372557','61611380759'],
    ['right',1,.502,.925,.591,'61611372558','61611387678'],
  ]) {
    const title=side==='left'?'Driver':'Passenger';
    const blade=(t,offset)=>onScreen(.112+.069*t,interpolate(start,end,t),offset);
    const clip=blade(.5,.019);
    add('e30body:assembly','wiper-arm-'+side,title+' front wiper arm',[0,0,0],[.58,.72,sign*.22],g=>{
      const base=onScreen(.018,pivot,.009);
      bar(g,base,clip,.014,.009,grille);
      rounded(g,[.025,.009,.021],grille,base,.003);
    },{page:'wiper_arm_wiper_blade',row:armNumber,cabinVisible:true});
    add('e30body:assembly','wiper-blade-'+side,title+' front wiper blade',[0,0,0],[.69,.96,sign*.33],g=>{
      bead(g,rubber,t=>blade(t,.007),.0047,40);
      bead(g,grille,t=>blade(t,.013+.006*Math.sin(Math.PI*t)),.0038,40);
      rounded(g,[.022,.015,.034],grille,clip,.003);
    },{page:'wiper_arm_wiper_blade',row:bladeNumber,cabinVisible:true});
  }
  add('e30body:assembly','front-panel','Radiator support and side grilles',[0,0,0],[.99,.49,0],g=>{
    faceBand(g,backing,fixed(.516),frontUpper,-.756,.756,-.062);
    for(const [,sign] of leftRight)sideGrille(g,sign);
    faceBand(g,paint,fixed(.523),fixed(.554),-.766,.766,.009);
    faceBand(g,grille,fixed(.549),fixed(.558),-.743,.743,.013);
  },{page:'front_panel',paintSurface:true});
  add('e30body:front-panel','kidney-grilles','Twin kidney grille insert',[0,0,0],[.99,.69,0],g=>{
    kidney(g,-1);
    kidney(g,1);
  },{page:'grille'});
  add('e30body:assembly','front-bumper','Front bumper and rub strip',[0,0,0],[1.14,.06,0],g=>{
    const profile={front:1,x:frontBumperX-.018,width:halfBody-.021,radius:.148,sideEnd:1.747,bow:.039};
    bumperSurface(g,paint,{...profile,yMin:.435,yMax:.547,crown:.010,bottomTuck:.012});
    const bumperStrip={...profile,x:frontBumperX-.009,width:halfBody-.009,yMin:.458,yMax:.525,crown:.009};
    bumperSurface(g,rubber,bumperStrip);
    fasciaInsert(g,grille,bumperStrip,.489,0,.046,.305,.0007);
    for(const z of [-.130,.130]){
      const [x,y]=bumperFace(bumperStrip,.495,z,.0008);
      const plug=addMesh(g,new CylinderGeometry(.0037,.0037,.001,12),backing,[x,y,z]);
      plug.rotation.z=Math.PI/2;
    }
    patch(g,paint,(u,v)=>{
      const z=(2*u-1)*.758,outer=frontBumperX-.025-.060*(Math.abs(z)/.758)**2-.038*(Math.abs(z)/.758)**6;
      const y=interpolate(.540,.551,v);
      return [interpolate(outer,frontFaceX(z,y)+.006,v),y,z];
    },86,10);
    for(const side of [-1,1]){
      const marker=(u,v)=>{
        const z=side*interpolate(.488,.632,u),y=interpolate(.475,.508,v);
        return bumperFace(bumperStrip,y,z,.0012);
      };
      patch(g,amber,marker,38,12);
      for(let i=1;i<12;i++)bead(g,amber,v=>marker(i/12,v),.0007,8);
      patch(g,amber,(u,v)=>{
        const x=interpolate(1.812,1.947,u);
        return [x,interpolate(.477,.500,v),side*(.806+.007*Math.sin(Math.PI*u))];
      },30,8);
    }
  },{page:'bumper_front',paintSurface:true});
  add('e30body:assembly','front-valance','Front lower valance and fog lights',[0,0,0],[.94,-.23,0],g=>{
    const profile={front:1,x:frontBumperX-.041,width:.782,radius:.140,sideEnd:1.768,bow:.041,
      yMin:.271,yMax:.445,crown:.009,bottomTuck:.043};
    bumperSurface(g,paint,profile);
    bumperSurface(g,grille,{...profile,x:frontBumperX-.072,width:.764,yMin:.260,yMax:.278,crown:.008,bottomTuck:.010});
    for(const [y,width] of [[.373,.586],[.307,.564]])
      fasciaInsert(g,backing,profile,y,0,.035,width,.0016);
    for(const side of [-1,1]){
      const duct=side*.485, lamp=side*.625;
      fasciaInsert(g,grille,profile,.353,duct,.089,.143,.002);
      fasciaInsert(g,paint,profile,.353,duct,.081,.135,.003);
      fasciaInsert(g,backing,profile,.352,duct+side*.013,.067,.099,.004);
      fasciaInsert(g,grille,profile,.353,lamp,.091,.148,.002);
      fasciaInsert(g,reflector,profile,.353,lamp+side*.004,.077,.125,.004);
      fasciaInsert(g,lens,profile,.353,lamp+side*.004,.078,.126,.005);
      for(let i=-6;i<=6;i++)fasciaInsert(g,lampRing,profile,.353,lamp+side*.004+i*.0085,.072,.0018,.006);
    }
  },{page:'front_panel',paintSurface:true});
  add('e30body:assembly','rear-bumper','Rear bumper and rub strip',[0,0,0],[-1.03,-.01,0],g=>{
    patch(g,paint,rearBumperSkin,164,50);
    // OEM center moulding and two side strips are cut from the same profile.
    for(const [start,end] of [[-.994,-.682],[-.679,.679],[.682,.994]]){
      patch(g,rubber,(u,v)=>bumperMouldingPoint(interpolate(start,end,u),v),
        start<0&&end>0?112:40,15);
    }
    patch(g,paint,(u,v)=>rearApronPoint(2*u-1,v),136,18);
    patch(g,lining,(u,v)=>{
      const t=2*u-1, [x,y,z]=rearApronPoint(t,0), side=Math.sign(t);
      return [x+.007+.021*(1-v),y-.027*(1-v),z-side*.012*(1-v)];
    },124,9);
    for(const side of [-1,1]){
      // The painted bumper cap and black insert end in the wheel-arch
      // return. Neither extends into the tire opening or the quarter skin.
      patch(g,paint,(u,v)=>{
        const [x,y,z]=coverContour(side,v);
        return [x+.003*u,y,z-side*.042*u];
      },7,20);
      patch(g,lining,(u,v)=>{
        const [x,y,z]=rearApronPoint(side,v);
        return [x+.005*u,y,z-side*.077*u];
      },12,16);
      patch(g,lining,(u,v)=>{
        const [x,y,z]=bumperMouldingPoint(.994*side,v);
        return [x+.003*u,y,z-side*.012*u];
      },6,15);
      patch(g,red,(u,v)=>{
        const t=side*interpolate(.765,.839,u);
        return bumperMouldingPoint(t,.50+(v-.5)*.35*(1-.18*Math.abs(2*u-1)**7),.0014);
      },28,9);
    }
  },{page:'bumper_rear',paintSurface:true});
  add('e30body:assembly','tail-panel','Rear panel and license plate recess',[0,0,0],[-.93,.39,0],g=>{
    patch(g,paint,rearPanelPoint,84,30);
    panelReturn(g,paint,u=>rearPanelPoint(u,0),.008,.017);
    rounded(g,[.010,.139,.330],grille,[-2.109,.644,0],.007);
    rounded(g,[.008,.121,.306],steel,[-2.117,.644,0],.006);
    rounded(g,[.015,.009,.142],grille,[-2.133,.728,0],.004);
  },{page:'side_panel_tail_trim',paintSurface:true});

  for(const [side,sign,name] of leftRight){
    const door='e30body:door-'+side;
    const doorBottom=(u)=>mix(sideBottom.pillar,sideBottom.front,u);
    const doorTop=(u)=>mix(sideTop.pillar,sideTop.front,u);
    const quarterBottom=(u)=>mix(sideBottom.rear,sideBottom.pillar,u);
    const quarterTop=(u)=>mix(sideTop.rear,sideTop.pillar,u);
    add('e30body:assembly','door-'+side,name+' door skin',[0,0,0],[0,.39,sign*.94],g=>{
      sideSkin(g,doorRear,doorFront,sign);
    },{page:'front_door_hinge_door_brake',paintSurface:true,cabinVisible:true});
    add(door,'door-moulding',name+' door rub strip',[0,0,0],[.06,.34,sign*.99],
      g=>sideMoulding(g,-.459,.800,sign),{page:'ornamental_strips'});
    add(door,'outer-handle',name+' exterior door handle',[0,0,0],[-.17,.52,sign*.98],g=>{
      // The handle is forward of the rear shut line with its lower edge at the swage.
      const x=doorRear+.123, y=shoulderHeight(x)+.019;
      const [,,z]=sideSkinPoint(x,y,sign);
      rounded(g,[.154,.042,.020],rubber,[x,y,z+sign*.001],.008);
      rounded(g,[.117,.026,.010],grille,[x+.007,y+.001,z+sign*.008],.004);
      const lockX=x-.060, lockY=y-.056;
      const [,,lockZ]=sideSkinPoint(lockX,lockY,sign);
      const bezel=addMesh(g,new CylinderGeometry(.014,.014,.010,24),rubber,[lockX,lockY,lockZ+sign*.002]);
      const lock=addMesh(g,new CylinderGeometry(.009,.009,.006,20),steel,[lockX,lockY,lockZ+sign*.007]);
      bezel.rotation.x=lock.rotation.x=Math.PI/2;
      rounded(g,[.002,.010,.0015],backing,[lockX,lockY,lockZ+sign*.010],.0005);
    },{page:'door_handle_front_lock_key'});
    add(door,'door-glass',name+' door window',[0,0,0],[.061,.98,sign*.98],
      g=>windowEdges(g,doorBottom,doorTop,sign),{page:'glazing',cabinVisible:true,cabinGlazing:true});
    add(door,'mirror',name+' door mirror',[0,0,0],[.28,.75,sign*1.17],
      g=>drawDoorMirror(g,sign,paint,(u,v)=>windowLine(doorBottom,doorTop,sign,u,v)),{page:'outside_mirror',paintSurface:true});
    if(sign===-1)add('e30body:assembly','radio-antenna','Retracted radio aerial and grommet',[0,0,0],[-.42,.48,-.64],g=>{
      const position=[-1.759,.822,-.757];
      const seal=addMesh(g,new CylinderGeometry(.014,.017,.012,24),rubber,position);
      const mast=addMesh(g,new CylinderGeometry(.006,.007,.026,24),steel,[-1.760,.834,-.757]);
      seal.rotation.z=.21;
      mast.rotation.z=.21;
    },{page:'antenna'});
    add('e30body:assembly','quarter-window-'+side,name+' rear quarter window',[0,0,0],[-.47,.87,sign*.71],
      g=>windowEdges(g,quarterBottom,quarterTop,sign,true),{page:'glazing',cabinVisible:true,cabinGlazing:true});
    add('e30body:assembly','front-fender-'+side,name+' front fender',[0,0,0],[.56,.30,sign*.63],g=>{
      sideSkin(g,frontFenderBack,frontFenderEnd,sign,frontOpening);
      noseCorner(g,sign);
      sideMoulding(g,frontFenderBack+.004,1.084,sign,frontOpening);
    },{page:'side_panel_front',paintSurface:true,cabinVisible:true});
    add('e30body:assembly','rear-quarter-'+side,name+' rear quarter panel',[0,0,0],[-.44,.33,sign*.59],g=>{
      sideSkin(g,rearQuarterEnd,-.471,sign,rearOpening);
      fenderShoulder(g,sign,false);
      patch(g,paint,(u,v)=>{
        const x=interpolate(-1.478,-.471,u);
        const outside=sideSkinPoint(x,belt(x),sign,rearOpening);
        const t=Math.max(0,(x+1.335)/(.865));
        const z=interpolate(.751,.785,t);
        return mix(outside,[x,belt(x)+.003,sign*z],v);
      },56,10);
      rearQuarterReturn(g,sign);
      sideMoulding(g,-.872,-.475,sign,rearOpening);
      if(sign===1){
        const [,,z]=sideSkinPoint(-1.64,.658,sign,rearOpening);
        rounded(g,[.137,.109,.008],rubber,[-1.64,.658,z+sign*.002],.017);
        rounded(g,[.129,.102,.010],paint,[-1.64,.658,z+sign*.003],.015);
      }
    },{page:'side_panel_tail_trim',paintSurface:true,cabinVisible:true});
    add('e30body:assembly','rocker-'+side,name+' rocker and sill',[0,0,0],[-.06,-.12,sign*.66],g=>{
      patch(g,paint,(u,v)=>{
        const x=interpolate(-.842,1.058,u),y=interpolate(.230+.028*Math.abs(2*u-1)**7,.283,v);
        return [x,y,sign*(sideWidth(x)-.039+.013*Math.sin(v*Math.PI/2))];
      },64,12);
      patch(g,lining,(u,v)=>{
        const x=interpolate(-.827,1.047,u),y=interpolate(.211,.235,v)+.027*Math.abs(2*u-1)**8;
        return [x,y,sign*(sideWidth(x)-.068+.012*v)];
      },58,7);
      patch(g,lining,(u,v)=>{
        const x=interpolate(-.844,1.063,u),y=interpolate(.252,.296,v);
        const [,,z]=sideSkinPoint(x,y,sign);
        return [x,y,z-sign*.021];
      },64,7);
    },{page:'single_components_for_body_side_frame',paintSurface:true,cabinVisible:true});
    add('e30body:assembly','headlamps-'+side,name+' headlamp pair',[0,0,0],[1.02,.58,sign*.36],g=>{
      headlampCenters.forEach((center,index)=>frontLamp(g,sign*center,headlampRadii[index]));
    },{page:'headlight'});
    add('e30body:assembly','tail-light-'+side,name+' rear lamp assembly',[0,0,0],[-1.03,.58,sign*.38],
      g=>drawRearLamp(g,sign),{page:'rear_light',row:sign===-1?'63211385381':'63211385382'});
  }
}
