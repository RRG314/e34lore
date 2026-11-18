import { ExtrudeGeometry, Path, Shape } from 'three';
import { lathe, mesh, ring, visualMaterials as M } from './525i-visual-details.mjs';
import { rearBoltLocations, rearBrakeDimensions } from './rear-brakes.mjs';

const circle = (shape, x, y, radius, clockwise = false) => shape.absarc(x, y, radius, 0, Math.PI * 2, clockwise);

function plate(group, radius, center, width, holes, material) {
  const face = circle(new Shape(), 0, 0, radius);
  face.holes.push(circle(new Path(), 0, 0, center, true));
  for (const [x, y, bore] of holes) face.holes.push(circle(new Path(), x, y, bore, true));
  return mesh(group, new ExtrudeGeometry(face, { depth:width, bevelEnabled:false, curveSegments:10 }), material);
}

// All shaft and press tooling geometry shares the wheel axis. Distances here are in metres.
export function wheelBearingLayout(series, hub, cvFace, dimensions) {
  const sign = Math.sign(hub[2]);
  const radius = dimensions.diameter / 2000;
  const bore = dimensions.bore / 2000;
  const width = dimensions.width / 1000;
  const brakes = rearBrakeDimensions[series];
  const cv = (cvFace[2] - hub[2]) * sign;
  const innerFace = cv + (series === 'e30' ? .005 : .014);
  const outerFace = innerFace + width;
  const center = (innerFace + outerFace) / 2;
  const wheelFace = brakes.mount - .006;
  const clipCenter = outerFace + .0013;
  const pin = z => [hub[0], hub[1], hub[2] + sign * z];
  return {radius,bore,width,cv,innerFace,outerFace,center,wheelFace,clipCenter,pin,sign,housing:pin(center)};
}

export function bearingSeat(group, layout) {
  const { radius, width, sign } = layout;
  const outer = radius + .014;
  ring(group,outer,radius-.0035,.005,[0,0,-sign*(width/2+.0025)],M.dark,'z',36);
  ring(group,outer,radius,width,[0,0,0],M.dark,'z',44);
  ring(group,outer-.002,.03955,.0042,[0,0,sign*(width/2+.0021)],M.steel,'z',44);
  ring(group,outer-.004,radius+.0005,.008,[0,0,sign*(width/2+.0082)],M.dark,'z',44);
}

export function sealedBearing(group, {radius, bore, width}) {
  const a = -width / 2, b = width / 2;
  lathe(group,[[radius-.004,a],[radius-.0007,a],[radius,a+.0007],[radius,b-.0007],
    [radius-.0007,b],[radius-.004,b],[radius-.004,a]],M.steel,'z',56);
  lathe(group,[[bore,a],[bore+.004,a],[bore+.004,b],[bore,b],[bore,a]],M.machined,'z',52);
  for (const sign of [-1,1]) {
    ring(group,radius-.0038,bore+.0039,.0016,[0,0,sign*(b-.001)],M.rubber,'z',48);
    ring(group,bore+.0052,bore+.0038,.0009,[0,0,sign*(b-.0007)],M.steel,'z',44);
  }
}

export function bearingCirclip(group) {
  const thickness=.0025, r=.0395;
  lathe(group,[[r-.0032,-thickness/2],[r,-thickness/2],[r,thickness/2],[r-.0032,thickness/2],
    [r-.0032,-thickness/2]],M.machined,'z',52,.14,Math.PI*2-.28);
  for(const direction of [-1,1]) {
    const x=direction*.0053;
    ring(group,.0032,.00145,thickness,[x,.036,0],M.machined,'z',22);
  }
}

export function wheelHub(group, series, layout) {
  const e30=series==='e30',d=rearBrakeDimensions[series];
  const {lug,screw}=rearBoltLocations(d);
  const {wheelFace, innerFace, outerFace, cv, bore}=layout;
  const rim=d.pcd/2+.0098, flangeDepth=.0088;
  const housingRadius=d.bore/2-.0003;
  const recess=e30?.0204:.012;
  const flange = plate(group,rim,recess,flangeDepth,
    [...lug.map(([x,y])=>[x,y,.0058]),[...screw,.0042]],M.machined);
  flange.position.z=wheelFace-flangeDepth;
  const journal=e30?bore:.0185;
  const inside=e30?.0156:.002;
  const stemStart=e30?innerFace:cv+.006;
  const profile=[
    [inside,stemStart],[e30?bore-.001:.0132,stemStart],[e30?journal-.0001:.0132,innerFace-.001],
    [journal,innerFace],[journal,outerFace],[journal+.005,outerFace+.003],[journal+.005,wheelFace-.0118],
    [housingRadius,wheelFace-.0118],[housingRadius,wheelFace+.0064],[recess,wheelFace+.0064],
    [recess,wheelFace-.015],[inside,wheelFace-.016],[inside,stemStart],
  ];
  lathe(group,profile,M.steel,'z',50);
  if(!e30) for(let i=0;i<5;i++) ring(group,.01355,.0128,.00055,[0,0,stemStart+i*.0015],M.machined,'z',24);
}

export function inboardDriveFlange(group) {
  const holes = Array.from({length:6},(_,index)=>{
    const a=index*Math.PI/3;
    return [.043*Math.cos(a),.043*Math.sin(a),.0053];
  });
  plate(group,.050,.026,.010,holes,M.steel);
  lathe(group,[[.026,0],[.029,0],[.029,.007],[.024,.012],[.023,.014],
    [.014,.014],[.014,.011],[.026,.011],[.026,0]],M.machined,'z',42);
}

export function inboardCollar(group) {
  ring(group,.0208,.0135,.009,[0,0,0],M.machined,'z',6);
  ring(group,.023,.0135,.0027,[0,0,.00585],M.steel,'z',36);
}

export function inboardLock(group) {
  lathe(group,[[.0209,-.0033],[.0251,-.0033],[.0251,.002],[.0223,.002],[.0223,.0002],
    [.0209,.0002],[.0209,-.0033]],M.steel,'z',36);
}
