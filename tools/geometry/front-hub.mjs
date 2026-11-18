import { BoxGeometry, ExtrudeGeometry, Path, Shape, Vector2 } from 'three';
import { lathe, mesh, ring, visualMaterials as M } from './525i-visual-details.mjs';

const circle = (path,x,y,r,clockwise=false) => path.absarc(x,y,r,0,Math.PI*2,clockwise);
const at = (radius,angle) => [radius*Math.cos(angle),radius*Math.sin(angle)];

export function frontHubLayout(series,fit,rotor,spindle,side) {
  const e30 = series==='e30', sign = side==='left'?-1:1;
  const face = (sign>0?rotor.bounds.max[2]:e30?rotor.bounds.max[2]:-rotor.bounds.min[2])-(e30?.006:.005);
  return {
    sign, face, spindleOffset:sign*(rotor.matrix[14]-spindle.matrix[14]),
    journal:fit.bore/2000, flange:fit.flange/2000,
    back:face-(e30?.061:.064), raceFace:face-(e30?.020:.025),
    nutHeight:e30?.014:.021, thread:e30?.012:.015, flats:e30?.036:.046,
    capSeat:e30?.025:.030, pilot:e30?.033:.0395, shieldRadius:e30?.028:.0345,
    pulseRadius:(fit.absDiameter??76)/2000,
    lugCenters:Array.from({length:fit.bolts},(_,i)=>at(fit.boltCircle/2000,i*2*Math.PI/fit.bolts)),
    rotorFixing:e30?at(.049,Math.PI/4):at(.064,Math.PI/5),
    teeth:fit.absTeeth,
  };
}

export function drawFrontHub(group, layout) {
  const { face, flange, journal, back, raceFace, pilot, capSeat, pulseRadius, lugCenters, rotorFixing, teeth } = layout;
  const plate = circle(new Shape(),0,0,flange);
  plate.holes.push(circle(new Path(),0,0,capSeat+.002,true),circle(new Path(),...rotorFixing,.0035,true));
  for(const center of lugCenters) plate.holes.push(circle(new Path(),...center,.00555,true));
  mesh(group,new ExtrudeGeometry(plate,{depth:.0085,bevelEnabled:false,curveSegments:15}),M.machined,[0,0,face-.0085]);

  const barrel = pulseRadius-.0034;
  lathe(group,[[journal+.006,back],[barrel-.002,back],[barrel,back+.0035],[barrel,face-.012],
    [pilot,face-.0085],[pilot,face+.012],[pilot-.001,face+.013],
    [capSeat,face+.013],[capSeat,face+.006],[capSeat+.0015,face+.003],
    [capSeat+.0015,raceFace+.001],[journal+.0055,raceFace-.002],[journal+.0055,back+.002],[journal+.006,back]],
  M.steel,'z',52);
  lathe(group,[[journal,back],[journal+.0038,back],[journal+.006,back+.003],[journal+.0057,raceFace-.001],
    [journal+.0045,raceFace],[journal,raceFace],[journal,back]],M.machined,'z',48);
  for(const seal of [back+.0017,raceFace-.0015]) {
    ring(group,barrel-.0006,journal+.0057,.002,[0,0,seal],M.rubber,'z',48);
  }
  const pulseMid = back+.0075;
  ring(group,pulseRadius-.0017,barrel-.001,.009,[0,0,pulseMid],M.dark,'z',48);
  const tooth = new BoxGeometry(.00185,.0022,.009);
  for(let i=0;i<teeth;i++) {
    const a=2*Math.PI*i/teeth;
    const [x,y]=at(pulseRadius-.00085,a);
    mesh(group,tooth,M.dark,[x,y,pulseMid]).rotation.z=a;
  }
}

export function drawFrontHubHardware(group, key, layout) {
  const { face, journal, back, raceFace, nutHeight, flats, thread, capSeat } = layout;
  if(key==='shield') {
    const radius=layout.shieldRadius;
    lathe(group,[[journal,back-.0038],[radius-.002,back-.0038],[radius,back-.0015],
      [radius,back+.0012],[radius-.0017,back+.0012],[radius-.0017,back-.0017],
      [journal,back-.0017],[journal,back-.0038]],M.steel,'z',48);
  } else if(key==='cap') {
    const rim=face+.012;
    lathe(group,[[capSeat-.0003,rim-.0048],[capSeat,rim-.0048],[capSeat,rim],
      [capSeat+.0014,rim],[capSeat+.0014,rim+.0012],[capSeat-.0015,rim+.0051],
      [capSeat-.006,rim+.0066],[0,rim+.0072],[0,rim+.0062],[capSeat-.006,rim+.0054],
      [capSeat-.0024,rim+.0045],[capSeat-.0013,rim+.001],[capSeat-.0013,rim-.0048],[capSeat-.0003,rim-.0048]],
    M.steel,'z',48);
  } else {
    const hex = new Shape(Array.from({length:6},(_,i)=>new Vector2(...at(flats/Math.sqrt(3),i*Math.PI/3))));
    hex.holes.push(circle(new Path(),0,0,thread,true));
    mesh(group,new ExtrudeGeometry(hex,{depth:nutHeight-.004,bevelEnabled:false,curveSegments:7}),
      M.machined,[0,0,raceFace+.002]);
    ring(group,journal+.003,thread,.003,[0,0,raceFace+.0015],M.steel,'z',36);
    lathe(group,[[thread,raceFace+nutHeight-.002],[thread+.003,raceFace+nutHeight-.002],
      [thread+.003,raceFace+nutHeight],[thread+.0023,raceFace+nutHeight+.0025],
      [thread,raceFace+nutHeight+.0025],[thread,raceFace+nutHeight-.002]],M.machined,'z',36);
  }
}

export function drawFrontBearingSpindle(group, layout) {
  const { sign, spindleOffset, back, journal, raceFace, nutHeight, thread } = layout;
  const shoulder=spindleOffset+back-.0038;
  const stop=spindleOffset+raceFace;
  const end=stop+nutHeight+.006;
  const profile = [[0,0],[journal+.010,0],[journal+.010,shoulder-.009],[journal+.006,shoulder-.003],
    [journal+.006,shoulder],[journal,shoulder],[journal,stop-.001],[thread,stop+.001],
    [thread,end-.002],[thread-.0014,end],[0,end]];
  lathe(group,profile,M.machined,'z',40).scale.z=sign;
  for(let z=stop+.002;z<end-.002;z+=.0015) {
    ring(group,thread,thread-.0005,.00045,[0,0,z*sign],M.dark,'z',28);
  }
  mesh(group,new BoxGeometry(.005,.0015,end-stop-.003),M.dark,[0,thread-.001,(stop+end-.001)*sign/2]);
}
