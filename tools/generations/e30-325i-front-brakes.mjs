import {
  BoxGeometry, CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, LatheGeometry,
  Mesh, MeshStandardMaterial, Path, Shape, TubeGeometry, Vector2, Vector3,
} from 'three';

const material = (name, color, roughness, metalness) => new MeshStandardMaterial({name,color,roughness,metalness});
const cast = material('Girling cast iron', 0x636568, .65, .59);
const iron = material('Brake disc hat and vanes', 0x515456, .58, .67);
const machined = material('Machined steel', 0xabb0b4, .33, .8);
const plated = material('Zinc plate', 0x92928a, .43, .64);
const dust = material('Stamped and coated steel', 0x303538, .77, .39);
const rubber = material('Caliper boot and sensor lead', 0x242523, .9, .02);
const padSteel = material('Coated pad backing', 0x282c31, .78, .24);
const friction = material('Pad friction material', 0x554d41, .93, .04);
const connector = material('Sensor connector', 0x6d6351, .74, .02);
const threadLock = material('Guide bolt locking patch', 0x345960, .69, .09);

const mount = .054;
const back = mount - .0351;
const front = back + .022;
const radius = .130;
const boltCircle = .050;
const screwSite = [.049/Math.sqrt(2),.049/Math.sqrt(2)];
const guides = [[-.103,-.051],[-.103,.058]];
const carrierSeats = [[-.078,-.043],[-.079,.046]];
export const upperGuide = [-.103,.058,back-.022];

function mesh(group, geometry, surface, at = [0,0,0]) {
  const part = new Mesh(geometry,surface);
  part.position.fromArray(at);
  group.add(part);
  return part;
}

function axial(group, profile, surface, x=0, y=0, segments=52, start=0, span=2*Math.PI) {
  const part = mesh(group,new LatheGeometry(profile.map(p=>new Vector2(...p)),segments,start,span),surface,[x,y,0]);
  part.rotation.x=Math.PI/2;
  return part;
}

function bush(group, x, y, inner, outer, lo, hi, surface) {
  axial(group,[[inner,lo],[outer,lo],[outer,hi],[inner,hi],[inner,lo]],surface,x,y,28);
}

function cylinder(group,x,y,r,lo,hi,surface,sides=24) {
  const part=mesh(group,new CylinderGeometry(r,r,hi-lo,sides),surface,[x,y,(hi+lo)/2]);
  part.rotation.x=Math.PI/2;
  return part;
}

function outline(points) {
  const shape=new Shape(points.map(p=>new Vector2(...p)));
  shape.closePath();
  return shape;
}

function circle(path,x,y,r,clockwise=false) {
  return path.absarc(x,y,r,0,2*Math.PI,clockwise);
}

function extrusion(group,shape,lo,hi,surface,bevel=0,curves=12) {
  return mesh(group,new ExtrudeGeometry(shape,{
    depth:hi-lo,steps:1,curveSegments:curves,bevelEnabled:bevel>0,bevelSegments:2,
    bevelSize:bevel,bevelThickness:bevel,
  }),surface,[0,0,lo]);
}

function wire(group,pts,r,surface,segments=18) {
  return mesh(group,new TubeGeometry(new CatmullRomCurve3(pts.map(p=>new Vector3(...p))),segments,r,7,false),surface);
}

function flangeShape(outer,bore,lug) {
  const face=circle(new Shape(),0,0,outer);
  face.holes.push(circle(new Path(),0,0,bore,true),circle(new Path(),...screwSite,.0051,true));
  for(const [x,y] of [[boltCircle,0],[0,boltCircle],[-boltCircle,0],[0,-boltCircle]]) {
    face.holes.push(circle(new Path(),x,y,lug,true));
  }
  return face;
}

function rotor(group) {
  for(const lo of [back,front-.006]) {
    axial(group,[[.078,lo],[radius-.0007,lo],[radius,lo+.0007],[radius,lo+.0053],
      [radius-.0007,lo+.006],[.078,lo+.006],[.078,lo]],machined,0,0,84);
  }
  for(let i=0;i<40;i++) {
    const a=2*Math.PI*i/40;
    const vane=mesh(group,new BoxGeometry(.049,.0024,.0103),iron,
      [.103*Math.cos(a),.103*Math.sin(a),(back+front)/2]);
    vane.rotation.z=a;
  }
  axial(group,[[.070,mount-.006],[.072,mount-.006],[.077,front-.002],[.082,front-.003],
    [.083,front-.009],[.078,front-.009],[.070,mount-.006]],iron);
  extrusion(group,flangeShape(.071,.033,.0074),mount-.006,mount,iron,0,18);
}

function hub(group) {
  extrusion(group,flangeShape(.060,.025,.006),mount-.015,mount-.0063,machined);
  axial(group,[[.023,-.056],[.040,-.056],[.048,-.045],[.048,mount-.014],[.033,mount-.014],
    [.033,mount],[.0285,mount],[.0285,mount+.010],[.023,mount+.010],[.023,-.056]],machined);
  axial(group,[[0,mount+.009],[.0228,mount+.009],[.024,mount+.005],[.025,mount], [0,mount]],plated);
}

function shield(group) {
  const angle=.51+Math.PI/2;
  axial(group,[[.049,back-.015],[.099,back-.013],[.126,back-.008],[.139,back-.008],
    [.139,back-.006],[.126,back-.006],[.099,back-.011],[.049,back-.013]],
    dust,0,0,72,angle,2*Math.PI-1.02);
}

function rotorScrew(group) {
  const [x,y]=screwSite;
  cylinder(group,x,y,.0039,mount-.014,mount-.004,plated);
  const shape=circle(new Shape(),x,y,.0053);
  const socket=Array.from({length:6},(_,i)=>new Vector2(
    x+.002887*Math.cos(i*Math.PI/3),y+.002887*Math.sin(i*Math.PI/3),
  ));
  shape.holes.push(new Path(socket.reverse()));
  axial(group,[[.0038,mount-.0045],[.0053,mount-.0018],[.00289,mount-.0018],
    [.0038,mount-.0045]],plated,x,y,24);
  extrusion(group,shape,mount-.0019,mount-.0001,plated);
}

function carrier(group) {
  const shape=outline([[-.136,-.037],[-.123,-.055],[-.095,-.056],[-.081,-.049],
    [-.085,-.040],[-.106,-.040],[-.123,-.019],[-.125,.021],[-.109,.045],
    [-.084,.045],[-.080,.054],[-.096,.063],[-.125,.061],[-.137,.037]]);
  extrusion(group,shape,back-.025,back-.015,cast,.002);
  for(const [x,y] of guides) {
    bush(group,x,y,.0049,.010,back-.017,back+.011,cast);
    const rail=outline([[x-.010,y-.008],[x+.010,y-.009],[x+.014,y+.003],[x-.004,y+.008]]);
    extrusion(group,rail,back-.009,front+.019,cast,.0015);
  }
  for(const [x,y] of carrierSeats) {
    bush(group,x,y,.0061,.012,back-.031,back-.016,cast);
  }
}

function housing(group) {
  const bridge=outline([[-.139,-.027],[-.135,-.048],[-.116,-.054],[-.104,-.045],
    [-.116,-.034],[-.124,-.019],[-.128,.019],[-.116,.040],[-.103,.049],
    [-.114,.059],[-.134,.049],[-.142,.025],[-.143,-.003]]);
  extrusion(group,bridge,back-.028,front+.019,cast,.0026);
  const fingers=outline([[-.136,-.043],[-.115,-.050],[-.097,-.043],[-.088,-.028],[-.096,-.017],
    [-.120,-.020],[-.121,.022],[-.096,.024],[-.087,.037],[-.099,.052],[-.120,.052],[-.136,.040]]);
  extrusion(group,fingers,front+.016,front+.025,cast,.0018);

  const x=-.103, y=.003;
  axial(group,[[.024,back-.019],[.033,back-.023],[.033,back-.046],[.026,back-.056],
    [.006,back-.057],[0,back-.052],[0,back-.045],[.024,back-.043],[.024,back-.019]],cast,x,y);
  bush(group,x,y,.0218,.025,back-.023,back-.017,rubber);
  bush(group,x,y,.018,.0238,back-.019,back-.016,machined);

  for(const [x,y] of guides) {
    const flange=outline([[x-.021,y-.014],[x-.002,y-.014],[x+.010,y-.007],[x+.011,y+.007],
      [x+.003,y+.013],[x-.018,y+.014]]);
    flange.holes.push(circle(new Path(),x,y,.0045,true));
    extrusion(group,flange,back-.028,back-.021,cast,.0018);
  }

  const valve=mesh(group,new CylinderGeometry(.004,.0057,.014,6),plated,[-.103,.037,back-.041]);
  valve.rotation.z=-.27;
  const cap=mesh(group,new CylinderGeometry(.0039,.0047,.009,12),rubber,[-.101,.046,back-.041]);
  cap.rotation.z=-.27;
  cylinder(group,-.088,.016,.0085,back-.059,back-.050,cast,8);
  bush(group,-.088,.016,.0024,.0059,back-.061,back-.056,machined);
}

function pad(group, inner) {
  const profile=[[-.127,-.025],[-.119,-.039],[-.109,-.041],[-.108,-.046],[-.096,-.046],
    [-.095,-.038],[-.082,-.033],[-.078,-.021],[-.077,.025],[-.083,.038],[-.094,.041],
    [-.095,.049],[-.107,.049],[-.110,.044],[-.120,.040],[-.128,.026]];
  const plate=inner?back-.017:front+.0124;
  extrusion(group,outline(profile),plate,plate+.0046,padSteel,.0006);
  const materialPlane=inner?back-.012:front+.0004;
  const lining=profile.filter((_,i)=>![3,4,11,12].includes(i))
    .map(([x,y])=>[-.102+(x+.102)*.88,.001+(y-.001)*.88]);
  extrusion(group,outline(lining),materialPlane,materialPlane+.0114,friction,.00034);
  const springZ=inner?plate-.004:plate+.0086;
  wire(group,[[-.107,.047,springZ],[-.113,.052,springZ],[-.118,.045,springZ],
    [-.112,.038,springZ]],.00135,plated,12);
}

function guidePin(group,x,y) {
  cylinder(group,x,y,.0046,back-.011,back+.016,machined);
  cylinder(group,x,y,.00866,back-.019,back-.009,plated,6);
  bush(group,x,y,.0041,.0054,back-.022,back-.018,plated);
}

function boot(group,x,y) {
  axial(group,[[.0045,back-.020],[.0085,back-.020],[.0085,back-.017],[.0065,back-.015],
    [.0085,back-.013],[.0066,back-.011],[.0084,back-.009],[.0084,back-.005],
    [.0045,back-.005],[.0045,back-.020]],rubber,x,y,24);
}

function guideBolt(group,x,y) {
  cylinder(group,x,y,.004,back-.030,back-.009,plated);
  cylinder(group,x,y,.00751,back-.035,back-.030,plated,6);
  cylinder(group,x,y,.00405,back-.015,back-.011,threadLock);
}

function carrierBolt(group,x,y) {
  cylinder(group,x,y,.0058,back-.058,back-.026,plated);
  cylinder(group,x,y,.01097,back-.066,back-.058,plated,6);
}

function sensor(group) {
  const z=back-.002;
  mesh(group,new BoxGeometry(.010,.007,.005),connector,[-.084,.034,z]);
  wire(group,[[-.084,.036,z],[-.079,.052,z-.020],[-.069,.072,z-.026],[-.052,.109,z-.039],
    [-.055,.132,z-.050],[-.043,.147,z-.069]],.0019,rubber);
  const plug=mesh(group,new CylinderGeometry(.0061,.0053,.020,12),connector,[-.041,.153,z-.075]);
  plug.rotation.x=-.74;
}

export function buildE30FrontBrakes(add) {
  add('rotor','260 × 22 mm ventilated brake disc',rotor);
  add('hub','Front hub and wheel bearing flange',hub);
  add('shield','Pressed brake disc shield',shield);
  add('disc-screw','Brake disc retaining screw',rotorScrew);
  add('carrier','Girling pad carrier',carrier);
  add('caliper','Girling floating caliper housing',housing,upperGuide);
  add('pad-inner','Inner brake pad and spring',g=>pad(g,true));
  add('pad-outer','Outer brake pad and spring',g=>pad(g,false));
  add('wear-sensor','Front pad wear sensor',sensor);
  for(const [i,[x,y]] of guides.entries()) {
    const where=i===0?'lower':'upper';
    add('guide-bolt-'+where,'Self-locking guide bolt · '+where,g=>guideBolt(g,x,y));
    add('guide-pin-'+where,'Guide pin · '+where,g=>guidePin(g,x,y));
    add('guide-boot-'+where,'Guide pin boot · '+where,g=>boot(g,x,y));
  }
  for(const [i,[x,y]] of carrierSeats.entries()) {
    add('carrier-bolt-'+(i===0?'lower':'upper'),'Carrier mounting bolt · '+(i===0?'lower':'upper'),
      g=>carrierBolt(g,x,y));
  }
}
