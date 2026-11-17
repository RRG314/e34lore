import {
  CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, LatheGeometry, Mesh,
  MeshStandardMaterial, Path, Shape, TubeGeometry, Vector2, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const finish = (name, color, roughness, metalness) => new MeshStandardMaterial({ name, color, roughness, metalness });
const cast = finish('Matte cast iron', 0x55595a, .65, .65);
const machined = finish('Machined brake steel', 0xa9adb0, .32, .83);
const plated = finish('Zinc-plated hardware', 0x878a86, .43, .68);
const backing = finish('Black pad backing', 0x22272a, .8, .26);
const lining = finish('Friction material', 0x49423b, .91, .04);
const rubber = finish('EPDM brake rubber', 0x1d1e1d, .88, 0);
const connector = finish('Sensor connector', 0x756856, .63, 0);
const rotorMount = .040;
const rotorBack = rotorMount - .0761;
const rotorFront = rotorBack + .022;
const rotorMid = (rotorFront + rotorBack) / 2;
const fixingAngle = Math.PI / 5;
const rotorFixing = [.064 * Math.cos(fixingAngle), .064 * Math.sin(fixingAngle)];
const guideCenters = [-.067, .067].map(y => [-.135, y + .020]);
const mountCenters = [-.049, .049].map(y => [-.095, y + .024]);
const padOutline = [
  [-.140,-.032],[-.130,-.044],[-.105,-.049],[-.099,-.038],
  [-.101,-.032],[-.090,-.023],[-.087,.029],[-.093,.057],
  [-.103,.062],[-.104,.070],[-.120,.068],[-.131,.053],
  [-.138,.034],[-.147,.008],[-.144,-.021],
];

function mesh(group, geometry, material, position = [0,0,0]) {
  const object = new Mesh(geometry, material);
  object.position.fromArray(position);
  group.add(object);
  return object;
}
function box(group, size, position, material, radius = .002) {
  return mesh(group, new RoundedBoxGeometry(...size, 2, radius), material, position);
}
function tube(group, points, radius, material) {
  const path = new CatmullRomCurve3(points.map(point => new Vector3(...point)));
  return mesh(group, new TubeGeometry(path, 22, radius, 8, false), material);
}
function cylinder(group, radius, lo, hi, x, y, material, faces = 28) {
  const part = mesh(group, new CylinderGeometry(radius, radius, hi - lo, faces), material, [x, y, (lo + hi) / 2]);
  part.rotation.x = Math.PI / 2;
  return part;
}
function lathe(group, profile, material, x = 0, y = 0, faces = 56) {
  const part = mesh(group, new LatheGeometry(profile.map(([r, z]) => new Vector2(r, z)), faces), material, [x, y, 0]);
  part.rotation.x = Math.PI / 2;
  return part;
}
function ring(group, inner, outer, lo, hi, material, x, y) {
  return lathe(group, [[inner,lo],[outer,lo],[outer,hi],[inner,hi],[inner,lo]], material, x, y);
}
function polygon(points) {
  const shape = new Shape(points.map(p => new Vector2(...p)));
  shape.closePath();
  return shape;
}
function circle(path, x, y, radius, clockwise = false) {
  path.absarc(x, y, radius, 0, 2 * Math.PI, clockwise);
  return path;
}
function extrude(group, shape, lo, hi, material, bevel = 0, curves = 12) {
  const geometry = new ExtrudeGeometry(shape, {
    depth: hi - lo, steps: 1, curveSegments: curves, bevelEnabled: bevel > 0,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2,
  });
  return mesh(group, geometry, material, [0,0,lo]);
}

function disc(group) {
  ring(group, .083, .151, rotorBack, rotorBack + .006, machined);
  ring(group, .083, .151, rotorFront - .006, rotorFront, machined);
  for (let i = 0; i < 40; i++) {
    const angle = i * 2 * Math.PI / 40;
    const vane = box(group,[.066,.0026,.010],
      [.115 * Math.cos(angle), .115 * Math.sin(angle), rotorMid], cast, .00065);
    vane.rotation.z = angle;
  }
  lathe(group, [[.076,rotorMount-.005],[.078,rotorMount-.005],[.084,rotorFront-.011],
    [.097,rotorFront-.010],[.097,rotorFront-.006],[.083,rotorFront-.006],
    [.075,rotorMount-.010],[.076,rotorMount-.005]], cast);
  const face = circle(new Shape(),0,0,.078);
  face.holes.push(circle(new Path(),0,0,.0395,true), circle(new Path(),...rotorFixing,.0054,true));
  for (let i=0; i<5; i++) {
    const a = i * 2 * Math.PI / 5;
    face.holes.push(circle(new Path(),.060*Math.cos(a),.060*Math.sin(a),.0072,true));
  }
  extrude(group, face, rotorMount-.005, rotorMount, cast, 0, 22);
}

function socketHead(group, x, y, lo, hi, head, drive, taper = false) {
  const face = circle(new Shape(), x, y, head);
  const centered = Array.from({length:6}, (_,i) => {
    const a = i * Math.PI / 3;
    return new Vector2(x + drive * Math.cos(a),y + drive * Math.sin(a));
  });
  face.holes.push(new Path(centered.reverse()));
  if (taper) lathe(group, [[.0038,lo-.004],[head,lo],[drive,lo],[.0038,lo-.004]], plated, x, y, 32);
  extrude(group, face, lo, hi, plated);
}
function retainingScrew(group) {
  const [x,y] = rotorFixing;
  cylinder(group,.0038,rotorMount-.016,rotorMount-.004,x,y,plated);
  socketHead(group,x,y,rotorMount-.0014,rotorMount+.0001,.0052,.00346,true);
}
function carrier(group) {
  const bridge = polygon([[-.167,-.053],[-.155,-.065],[-.149,-.042],[-.151,.036],
    [-.143,.066],[-.155,.083],[-.169,.047],[-.173,.006]]);
  extrude(group,bridge,rotorBack-.015,rotorFront+.016,cast,.002);
  for (const [x,y] of guideCenters) {
    ring(group,.0048,.011,rotorBack-.031,rotorBack-.006,cast,x,y);
    box(group,[.021,.019,.013],[x-.006,y,rotorFront+.013],cast,.003);
    box(group,[.026,.019,.016],[x+.001,y,rotorBack-.016],cast,.003);
  }
  for (const [x,y] of mountCenters) {
    ring(group,.0062,.013,rotorBack-.039,rotorBack-.023,cast,x,y);
    box(group,[.036,.023,.014],[x-.020,y,rotorBack-.032],cast,.004);
  }
}
function caliper(group) {
  const bridge = polygon([[-.179,-.025],[-.169,-.055],[-.145,-.056],[-.146,-.043],
    [-.159,-.020],[-.163,.024],[-.151,.054],[-.142,.067],[-.159,.077],[-.176,.047],[-.182,.009]]);
  extrude(group, bridge, rotorBack-.028, rotorFront+.028, cast, .003);
  const fingers = polygon([[-.172,-.032],[-.155,-.046],[-.123,-.044],[-.109,-.028],[-.115,-.015],
    [-.143,-.013],[-.148,.027],[-.121,.039],[-.107,.041],[-.112,.055],[-.127,.064],[-.158,.066],[-.173,.041]]);
  extrude(group, fingers, rotorFront+.012, rotorFront+.024, cast,.0024);
  const x=-.122, y=.009;
  lathe(group, [[.031,rotorBack-.011],[.039,rotorBack-.025],[.037,rotorBack-.045],
    [.033,rotorBack-.064],[.007,rotorBack-.064],[0,rotorBack-.058],
    [0,rotorBack-.050],[.032,rotorBack-.044],[.032,rotorBack-.013],
    [.031,rotorBack-.011]],cast,x,y);
  ring(group,.025,.030,rotorBack-.017,rotorBack-.011,rubber,x,y);
  ring(group,.022,.026,rotorBack-.018,rotorBack-.010,machined,x,y);
  for (const [bx,by] of guideCenters) {
    box(group,[.038,.024,.014],[bx-.016,by,rotorBack-.035],cast,.0035);
    ring(group,.0053,.0098,rotorBack-.054,rotorBack-.029,rubber,bx,by);
  }
  const bleeder = box(group,[.015,.019,.018],[x,.052,rotorBack-.042],cast,.003);
  bleeder.rotation.z=-.28;
  const nipple=cylinder(group,.0045,.047,.064,x,-(rotorBack-.043),plated,6);
  nipple.rotation.x=0;
  nipple.position.set(x,.061,rotorBack-.043);
  box(group,[.010,.011,.009],[x,.073,rotorBack-.043],rubber,.0024);
}
function pad(group, inside) {
  const face = polygon(padOutline);
  const lo = inside ? rotorBack-.0115 : rotorFront+.008;
  extrude(group, face, lo, lo+.0044, backing, .00075);
  const liningOutline = padOutline.filter((_,i)=>![3,4,9,10].includes(i))
    .map(([x,y]) => [-.118+(x+.118)*.89,.008+(y-.008)*.88]);
  const materialZ = inside ? lo+.0049 : rotorFront+.00045;
  extrude(group, polygon(liningOutline), materialZ, materialZ+.007, lining, .00034);
  if (inside) {
    for (let i=0; i<3; i++) {
      const a=i * 2 * Math.PI/3;
      const x=-.122 + .021*Math.cos(a), y=.009 + .021*Math.sin(a);
      const leg=box(group,[.008,.009,.013],[x,y,lo-.007],plated,.0012);
      leg.rotation.z=a;
    }
  }
}
function shoeSpring(group) {
  const z=rotorFront+.027;
  tube(group,[[-.132,-.048,z],[-.138,-.055,z+.005],[-.148,-.046,z+.006],[-.153,-.027,z+.007],
    [-.165,-.014,z+.002],[-.166,.030,z+.002],[-.155,.047,z+.007],[-.146,.068,z+.006],
    [-.135,.062,z+.004],[-.131,.056,z]],.0027,plated);
}
function guideBolt(group, x, y) {
  cylinder(group,.0048,rotorBack-.054,rotorBack-.013,x,y,machined);
  cylinder(group,.0038,rotorBack-.013,rotorBack+.003,x,y,plated);
  socketHead(group,x,y,rotorBack-.060,rotorBack-.054,.00625,.00404);
}
function guideCap(group, x, y) {
  const z=rotorBack-.059;
  lathe(group,[[0,z-.004],[.0085,z-.004],[.0094,z-.002],[.0094,z+.0015],
    [.0074,z+.003],[.0069,z+.001],[.0069,z-.001],[0,z-.001],[0,z-.004]],rubber,x,y,32);
}
function carrierBolt(group, x, y) {
  cylinder(group,.0058,rotorBack-.060,rotorBack-.019,x,y,plated);
  cylinder(group,.0106,rotorBack-.067,rotorBack-.060,x,y,plated,6);
}
function sensor(group) {
  const z=rotorBack-.004;
  box(group,[.016,.009,.006],[-.108,.050,z],connector,.0013);
  tube(group,[[-.108,.055,z],[-.105,.077,z-.016],[-.086,.091,z-.032],[-.052,.128,z-.045],
    [-.045,.154,z-.074],[-.033,.172,z-.109]],.0023,rubber);
  box(group,[.012,.024,.012],[-.033,.179,z-.109],connector,.002);
}

export function build525iFrontBrakes(side, add) {
  const left=side==='left', suffix=left?'1':'-1';
  add('disc', '302 × 22 mm ventilated brake disc', '34116756534', disc, 'e34sys:brake-disc-front-'+suffix);
  add('caliper', 'ATE floating caliper housing', left?'34111160367':'34111160368', caliper, 'e34sys:brake-caliper-front-'+suffix);
  add('carrier', 'ATE brake pad carrier', '34111160366', carrier);
  add('outer-pad', 'Outer brake pad', '34111162535', g=>pad(g,false), 'e34sys:brake-pad-front-'+suffix);
  add('inner-pad', 'Inner brake pad and piston spring', '34111162535', g=>pad(g,true));
  add('spring-clip', 'Caliper anti-rattle clip', '34111157687', shoeSpring);
  add('disc-screw','Brake disc retaining screw','34211161806',retainingScrew);
  guideCenters.forEach(([x,y],i) => {
    const where=i===0?'lower':'upper';
    add('guide-'+where,'Caliper guide bolt · '+where,'34111157041',g=>guideBolt(g,x,y));
    add('cap-'+where,'Guide bolt cap · '+where,'34111154979',g=>guideCap(g,x,y));
  });
  mountCenters.forEach(([x,y],i) => {
    const where=i===0?'lower':'upper';
    add('carrier-'+where,'Carrier mounting bolt · '+where,'34111151604',g=>carrierBolt(g,x,y));
  });
  if (left) add('wear-sensor','Front brake pad wear sensor','34351179820',sensor);
}
