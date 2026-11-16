import {
  BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial,
  Path, Shape, TorusGeometry, TubeGeometry, CatmullRomCurve3, Vector2, Vector3, Quaternion,
} from 'three';
import {factoryDimensions, frontAxleX, rearAxleX, axleHeight} from './e30-325i-dimensions.mjs';
import {drawE30CrossSpoke} from './e30-cross-spoke-wheel.mjs';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const xAxis = new Vector3(1, 0, 0);
const yAxis = new Vector3(0, 1, 0);
const zAxis = new Vector3(0, 0, 1);
const makeMaterial = (color, metalness, roughness) => new MeshStandardMaterial({ color, metalness, roughness });
const cast = makeMaterial(0x787b78, .46, .7);
const aluminum = makeMaterial(0xb1b6b5, .55, .47);
const steel = makeMaterial(0x555d61, .7, .42);
const rubber = makeMaterial(0x202426, .02, .88);
const black = makeMaterial(0x2d3434, .16, .71);
const brass = makeMaterial(0xaa8858, .48, .48);

function mesh(group, geometry, material, location = [0, 0, 0]) {
  const object = new Mesh(geometry, material);
  object.position.set(...location);
  group.add(object);
  return object;
}

function block(group, size, material, location, rounding = .014) {
  return mesh(group, new RoundedBoxGeometry(...size, 2, rounding), material, location);
}

function cylinder(group, radius, height, axis, material, location, taper = radius, segments = 24) {
  const part = mesh(group, new CylinderGeometry(taper, radius, height, segments), material, location);
  part.quaternion.setFromUnitVectors(yAxis, axis);
  return part;
}

function rod(group, start, end, radius, material) {
  const a = new Vector3(...start), b = new Vector3(...end);
  const delta = b.clone().sub(a);
  return cylinder(group, radius, delta.length(), delta.normalize(), material, a.add(b).multiplyScalar(.5).toArray());
}

function ring(group, outer, inner, depth, axis, material, location = [0, 0, 0]) {
  const shape = new Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new Path();
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 32 });
  geometry.translate(0, 0, -depth / 2);
  const part = mesh(group, geometry, material, location);
  part.quaternion.setFromUnitVectors(zAxis, axis);
  return part;
}

function curvedTube(group, points, radius, material, segments = 20) {
  const curve = new CatmullRomCurve3(points.map(p => new Vector3(...p)));
  return mesh(group, new TubeGeometry(curve, segments, radius, 8, false), material);
}

function coil(group, radius, height, turns, material, wire = .012) {
  const points = Array.from({ length: 81 }, (_, i) => {
    const t = i / 80, angle = t * turns * Math.PI * 2;
    return [Math.cos(angle) * radius, height * (t - .5), Math.sin(angle) * radius];
  });
  return curvedTube(group, points, wire, material, 100);
}

function gear(group, radius, depth, teeth, axis = xAxis, material = steel) {
  const shape = new Shape();
  for (let i = 0; i <= teeth * 4; i++) {
    const angle = i * Math.PI * 2 / (teeth * 4);
    const tooth = (i % 4 === 1 || i % 4 === 2) ? radius : radius * .9;
    const x = Math.cos(angle) * tooth, y = Math.sin(angle) * tooth;
    if (!i) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const hole = new Path();
  hole.absarc(0, 0, radius * .29, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
  geometry.translate(0, 0, -depth / 2);
  mesh(group, geometry, material).quaternion.copy(new Quaternion().setFromUnitVectors(zAxis, axis));
}

function coverRibs(group, count, length, width, y, spacing) {
  for (let i = 0; i < count; i++) block(group, [length, .014, width], aluminum, [0, y, (i - (count - 1) / 2) * spacing], .004);
}

export function buildE30Mechanical(add, scope) {
  const engine = scope('engine', 'M20B25 engine', ['engine','engine-bay']);
  const driveline = scope('propeller', 'Propeller shaft and center mount', ['driveshaft']);
  const diff = scope('rear-final-drive', 'Rear final drive', ['differential']);
  const cooling = scope('radiator-pack', 'Radiator and cooling circuit', ['cooling','engine-bay']);
  const options = (page, row, extra = {}) => ({ page, row, ...extra });

  add(engine, 'block', 'Cast-iron M20 cylinder block', [1.30,.56,0], [0,0,0], g => {
    block(g, [.72,.25,.32], cast);
    block(g, [.76,.06,.36], steel, [0,.12,0]);
    block(g, [.66,.07,.30], cast, [0,-.13,0]);
    for (let i = 0; i < 6; i++) {
      ring(g, .052,.041,.016,yAxis,aluminum,[(i-2.5)*.11,.158,0]);
      block(g,[.026,.16,.018],steel,[(i-2.5)*.112,-.02,.166],.006);
    }
  }, options('engine_block_mounting_parts'));
  add(engine,'sump','Finned oil pan',[1.25,.38,0],[0,-.48,0],g=>{
    block(g,[.70,.09,.32],aluminum);
    block(g,[.32,.10,.26],aluminum,[-.16,-.065,0]);
    for(let i=0;i<7;i++)block(g,[.025,.015,.24],cast,[-.33+i*.044,-.123,0],.004);
  },options('oil_pan'));
  add(engine,'oil-filter','Spin-on engine oil filter',[1.15,.462,.214],[.05,-.16,.56],g=>{
    cylinder(g,.040,.085,zAxis,black,[0,0,0],.039,36);
    ring(g,.040,.029,.008,zAxis,steel,[0,0,-.044]);
    ring(g,.036,.028,.004,zAxis,rubber,[0,0,-.050]);
    ring(g,.024,.016,.002,zAxis,aluminum,[0,0,.043]);
  },options('lubrication_system_oil_filter','11421707779'));
  add(engine,'head','Single-overhead-cam cylinder head',[1.31,.76,-.055],[0,.48,0],g=>{
    block(g,[.73,.13,.27],aluminum);
    for(let i=0;i<6;i++) for(const z of [-.135,.135])cylinder(g,.032,.022,zAxis,steel,[(i-2.5)*.11,.008,z]);
  },options('cylinder_head_attached_parts'));
  for(let cylinderIndex=0;cylinderIndex<6;cylinderIndex++){
    const x=1.31+(2.5-cylinderIndex)*.11;
    add(engine,'spark-plug-'+(cylinderIndex+1),'Spark plug '+(cylinderIndex+1),
      [x,.78,.105],[.15+(2.5-cylinderIndex)*.05,.31,.54],g=>{
        const ceramic=makeMaterial(0xe6e2cf,.04,.58);
        const thread=[new Vector2(.0048,-.031)];
        for(let ridge=0;ridge<7;ridge++){
          const z=-.030+.0031*ridge;
          thread.push(new Vector2(.0061,z),new Vector2(.0048,z+.0014));
        }
        thread.push(new Vector2(.0054,-.004));
        mesh(g,new LatheGeometry(thread,18),steel).rotation.x=Math.PI/2;
        cylinder(g,.0105,.009,zAxis,steel,[0,0,-.003],.0105,6);
        const insulator=[[.006,.001],[.006,.008],[.0066,.009],[.006,.010],[.0066,.014],
          [.006,.015],[.0066,.019],[.006,.020],[.0065,.023],[.0049,.027],[.0043,.029]];
        mesh(g,new LatheGeometry(insulator.map(([radius,z])=>new Vector2(radius,z)),18),ceramic).rotation.x=Math.PI/2;
        cylinder(g,.0034,.006,zAxis,steel,[0,0,.032],.0034,12);
        rod(g,[.004,0,-.026],[.004,0,-.034],.0012,steel);
        rod(g,[.004,0,-.034],[.0008,0,-.034],.0012,steel);
        g.rotation.x=-.23;
      },options('ignition_wiring',undefined,{internal:true}));
  }
  add(engine,'rocker-cover','Ribbed M20 rocker cover and filler cap',[1.31,.87,-.033],[0,.75,0],g=>{
    block(g,[.68,.083,.207],black,[0,0,0],.022);
    block(g,[.646,.012,.174],cast,[0,.043,0],.008);
    for(const z of [-.061,-.041,.041,.061])
      block(g,[.591,.009,.008],aluminum,[0,.051,z],.003);
    cylinder(g,.034,.019,yAxis,rubber,[.165,.058,-.005]);
    ring(g,.028,.024,.004,yAxis,steel,[-.049,.052,0]);
    for(const x of [-.270,-.092,.091,.265])for(const z of [-.092,.092])
      cylinder(g,.0065,.011,yAxis,aluminum,[x,.045,z],.0065,6);
  },options('cylinder_head_cover'));
  add(engine,'camshaft','Camshaft',[1.31,.822,-.058],[0,.62,-.25],g=>{
    cylinder(g,.018,.66,xAxis,steel);
    for(let i=0;i<12;i++){
      const lobe=cylinder(g,.027,.023,xAxis,steel,[(i-5.5)*.052,.012*Math.sin(i*2),.012*Math.cos(i*2)]);
      lobe.scale.x=1.15;
    }
  },options('valve_timing_gear_camshaft','11311716138',{internal:true}));
  add(engine,'crankshaft','Crankshaft and counterweights',[1.30,.46,0],[-.15,-.48,.16],g=>{
    cylinder(g,.022,.69,xAxis,steel);
    for(let i=0;i<6;i++){
      const x=(i-2.5)*.108, angle=i*2*Math.PI/3;
      cylinder(g,.043,.020,xAxis,steel,[x-.027,.021*Math.sin(angle),.021*Math.cos(angle)]);
      cylinder(g,.043,.020,xAxis,steel,[x+.027,.021*Math.sin(angle),.021*Math.cos(angle)]);
      cylinder(g,.021,.053,xAxis,aluminum,[x,-.024*Math.sin(angle),-.024*Math.cos(angle)]);
    }
  },options('crankshaft_with_bearing_shells',undefined,{internal:true}));
  for(let i=0;i<6;i++){
    const x=1.30+(i-2.5)*.11;
    add(engine,'piston-'+(i+1),'Piston '+(i+1),[x,.59,0],[.25+(i-2.5)*.045,.30,.42],g=>{
      cylinder(g,.041,.048,yAxis,aluminum);
      for(const y of [.014,.004,-.006]) ring(g,.042,.039,.003,yAxis,steel,[0,y,0]);
      cylinder(g,.012,.080,zAxis,steel,[0,-.014,0]);
    },options('crankshaft_pistons',undefined,{internal:true}));
    add(engine,'rod-'+(i+1),'Connecting rod '+(i+1),[x,.48,0],[.25+(i-2.5)*.045,-.13,.42],g=>{
      block(g,[.024,.073,.020],steel);
      ring(g,.021,.013,.022,zAxis,steel,[0,.041,0]);
      ring(g,.033,.023,.025,xAxis,steel,[0,-.042,0]);
    },options('crankshaft_connecting_rod','11241288386',{internal:true}));
  }
  add(engine,'intake','Cast M20 six-runner manifold and plenum',[1.29,.740,-.249],[0,.35,-.58],g=>{
    block(g,[.590,.114,.150],aluminum,[.013,.096,-.081],.035);
    block(g,[.242,.022,.148],aluminum,[.010,.152,-.066],.012);
    for(let i=0;i<4;i++)block(g,[.178,.007,.008],cast,[.011,.168,-.117+i*.030],.002);
    for(let i=0;i<6;i++){
      const x=(i-2.5)*.103;
      const sweep=.059*(i-2.5)/2.5;
      curvedTube(g,[[x,-.027,.149],[x,.032,.124],[x+sweep*.42,.126,.082],
        [x+sweep,.145,.015],[x+sweep,.113,-.066]],.038,aluminum,27);
      block(g,[.071,.052,.017],cast,[x,-.026,.153],.007);
    }
    cylinder(g,.054,.098,zAxis,aluminum,[.063,.071,-.081]);
  },options('intake_manifold'));
  add(engine,'exhaust','Twin cast exhaust manifolds',[1.29,.61,.21],[0,.07,.50],g=>{
    for(const center of [-.17,.17]){
      for(let i=-1;i<=1;i++)curvedTube(g,[[center+i*.11,.063,-.08],[center+i*.105,.016,.025],[center,-.083,.11],[center-.065,-.12,.12]],.021,cast);
      ring(g,.046,.033,.019,xAxis,steel,[center-.10,-.12,.12]);
    }
  },options('exhaust_manifold'));
  add(engine,'timing','Timing belt and sprockets',[1.685,.65,-.047],[.56,.15,-.15],g=>{
    for(const [y,r] of [[.18,.063],[-.18,.037],[-.02,.026]]){
      const c=new Group(); c.position.y=y; g.add(c); gear(c,r,.022,Math.round(r*330));
    }
    curvedTube(g,[[0,.23,0],[0,.201,.06],[0,-.15,.047],[0,-.217,0],[0,-.17,-.037],[0,.19,-.064],[0,.23,0]],.009,rubber,48);
  },options('timing_gear_timing_belt'));
  add(engine,'water-pump','Coolant pump',[1.712,.59,.057],[.50,0,.34],g=>{
    cylinder(g,.070,.085,xAxis,aluminum);
    ring(g,.063,.036,.014,xAxis,cast,[-.041,0,0]);
    cylinder(g,.020,.084,xAxis,steel,[.055,0,0]);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      rod(g,[-.043,.017*Math.sin(a),.017*Math.cos(a)],[-.043,.057*Math.sin(a+.3),.057*Math.cos(a+.3)],.006,aluminum);
    }
  },options('cooling_system_water_pump','water pump'));
  add(engine,'alternator','Alternator',[1.51,.49,-.235],[.18,.10,-.59],g=>{
    cylinder(g,.073,.13,xAxis,aluminum);
    cylinder(g,.050,.036,xAxis,brass);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      rod(g,[-.07,.068*Math.sin(a),.068*Math.cos(a)],[.066,.068*Math.sin(a),.068*Math.cos(a)],.007,cast);
    }
    ring(g,.042,.013,.020,xAxis,steel,[.09,0,0]);
  },options('alternator'));
  add(cooling,'radiator','Radiator core and tanks',[1.91,.56,0],[.60,.20,0],g=>{
    block(g,[.065,.44,.61],black);
    for(let i=0;i<23;i++)block(g,[.010,.013,.60],aluminum,[.038,(i-11)*.018,0],.003);
    for(const z of [-.325,.325])block(g,[.085,.47,.061],black,[0,0,z]);
  },options('radiator'));
  add(cooling,'fan','Fan and viscous coupling',[1.815,.57,0],[.30,.41,.13],g=>{
    cylinder(g,.062,.050,xAxis,aluminum);
    for(let i=0;i<9;i++){
      const a=i*2*Math.PI/9;
      const blade=block(g,[.022,.16,.037],black,[0,.107*Math.cos(a),.107*Math.sin(a)],.007);
      blade.rotation.x=a;
    }
  },options('fan_fan_coupling'));
  add(cooling,'hoses','Radiator supply and return hoses',[1.78,.57,0],[.15,.20,-.43],g=>{
    curvedTube(g,[[.10,.18,.26],[.03,.20,.24],[-.06,.14,.17],[-.14,.09,.16]],.022,rubber);
    curvedTube(g,[[.11,-.16,-.27],[.07,-.16,-.24],[-.08,-.08,-.16],[-.19,-.06,-.17]],.024,rubber);
  },options('cooling_system_water_hoses'));
  add(driveline,'flex-disc','Six-hole flexible coupling',[.106,.35,0],[.24,.25,0],g=>{
    const coupling = new Shape();
    coupling.absarc(0,0,.054,0,Math.PI*2);
    const bore=new Path();
    bore.absarc(0,0,.022,0,Math.PI*2,true);
    coupling.holes.push(bore);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      const y=.039*Math.cos(a),z=.039*Math.sin(a);
      const sleeve=new Path();
      sleeve.absarc(-z,y,.010,0,Math.PI*2,true);
      coupling.holes.push(sleeve);
      ring(g,.010,.0058,.029,xAxis,steel,[0,y,z]);
    }
    const body=new ExtrudeGeometry(coupling,{depth:.024,curveSegments:22,bevelEnabled:true,bevelThickness:.002,bevelSize:.001,bevelSegments:2});
    body.translate(0,0,-.012);
    mesh(g,body,rubber).quaternion.setFromUnitVectors(zAxis,xAxis);
    g.rotation.z=.128;
  },options('drive_shaft_universal_joint_centre_mounting','flexible'));
  for(const [id,label,x,length] of [['front-section','Front propeller shaft',-.13,.40],['rear-section','Rear propeller shaft',-.72,.74]]){
    add(driveline,id,label,[x,.325,0],[x<-.4?-.25:.20,-.15,0],g=>{
      cylinder(g,.034,length,xAxis,steel);
      for(const end of [-1,1]){
        cylinder(g,.047,.05,xAxis,cast,[end*length/2,0,0]);
        ring(g,.049,.027,.022,xAxis,aluminum,[end*(length/2+.022),0,0]);
      }
    },options('drive_shaft_universal_joint_centre_mounting'));
  }
  add(driveline,'center-mount','Driveshaft center support',[ -.356,.327,0],[0,.32,-.31],g=>{
    ring(g,.067,.042,.032,xAxis,rubber);
    ring(g,.043,.022,.026,xAxis,aluminum);
    const shape = new Shape();
    shape.moveTo(-.117,.047); shape.lineTo(-.117,.070); shape.lineTo(-.063,.070);
    shape.quadraticCurveTo(0,.105,.063,.070);shape.lineTo(.117,.070);shape.lineTo(.117,.047);
    shape.lineTo(.069,.047);shape.lineTo(.072,-.016);shape.quadraticCurveTo(0,-.088,-.072,-.016);shape.lineTo(-.069,.047);shape.closePath();
    for (const [u,v,r] of [[0,0,.066],[-.094,.057,.008],[.094,.057,.008]]){const hole=new Path();hole.absarc(u,v,r,0,Math.PI*2,true);shape.holes.push(hole);}
    const mount=mesh(g,new ExtrudeGeometry(shape,{depth:.008,bevelEnabled:false,curveSegments:20}),steel);
    mount.rotation.y=Math.PI/2;
  },options('drive_shaft_universal_joint_centre_mounting','26121226723'));
  add(diff,'case','Differential housing',[ -1.156,.31,0],[-.16,.40,0],g=>{
    block(g,[.31,.24,.29],cast);
    ring(g,.111,.052,.02,xAxis,steel,[.17,0,0]);
    for(const z of [-.19,.19]) cylinder(g,.072,.070,zAxis,steel,[0,0,z]);
  },options('rear_axle_drive'));
  add(diff,'rear-cover','Finned rear differential cover',[ -1.335,.31,0],[-.41,.22,0],g=>{
    block(g,[.04,.24,.28],aluminum);
    for(let i=0;i<8;i++)block(g,[.024,.19,.013],aluminum,[-.028,0,(i-3.5)*.030],.004);
  },options('final_drive_cover_trigger_contact','33111210431'));
  add(diff,'ring-gear','Differential crown wheel',[ -1.16,.31,-.035],[0,.12,-.36],g=>gear(g,.105,.032,35,zAxis),
    options('rear_axle_drive',undefined,{internal:true}));
  add(diff,'pinion','Drive pinion',[ -1.03,.31,0],[.33,.10,.22],g=>{
    gear(g,.046,.048,11);
    cylinder(g,.020,.15,xAxis,steel,[.071,0,0]);
  },options('rear_axle_drive',undefined,{internal:true}));

  const front = scope('front-axle','Front suspension and steering',['front-suspension','suspension']);
  const rear = scope('rear-axle','Rear semi-trailing-arm suspension',['rear-suspension','suspension']);
  add(front,'subframe','Front crossmember',[1.31,.20,0],[0,-.43,0],g=>{
    block(g,[.18,.086,1.15],black);
    for(const z of [-.44,.44])block(g,[.29,.080,.16],steel,[.02,.035,z]);
  },options('front_axle_support_wishbone'));
  add(front,'steering-rack','Rack-and-pinion steering',[1.23,.24,0],[.28,-.24,0],g=>{
    cylinder(g,.043,.78,zAxis,aluminum);
    for(const side of [-1,1])for(let i=0;i<7;i++)ring(g,.046,.028,.018,zAxis,rubber,[0,0,side*(.39+i*.017)]);
    cylinder(g,.034,.11,yAxis,steel,[0,.055,-.16]);
  },options('steering_linkage_tie_rods'));
  add(rear,'rear-subframe','Rear axle carrier',[-1.15,.22,0],[-.20,-.37,0],g=>{
    block(g,[.19,.078,1.14],black);
    for(const z of [-.49,.49])ring(g,.065,.036,.05,yAxis,rubber,[.05,.020,z]);
  },options('rear_axle_support_wheel_suspension'));
  for (const [side,s] of [['left',-1],['right',1]]) {
    const z=s*(factoryDimensions.rearTrack/2-.036);
    const frontCorner=scope('front-'+side,'Front '+side+' corner',['suspension','front-suspension','braking'],front);
    const rearCorner=scope('rear-'+side,'Rear '+side+' corner',['suspension','rear-suspension','braking'],rear);
    add(frontCorner,'control-arm','Lower wishbone',[1.35,.175,z*.73],[.16,-.17,s*.26],g=>{
      rod(g,[-.19,0,-s*.15],[.02,.012,s*.19],.024,cast);
      rod(g,[.13,0,-s*.21],[.02,.012,s*.19],.026,cast);
      for(const [x,zz] of [[-.19,-s*.15],[.13,-s*.21],[.02,s*.19]])ring(g,.039,.019,.035,yAxis,steel,[x,.014,zz]);
    },options('front_axle_support_wishbone'));
    add(frontCorner,'strut','MacPherson strut housing',[1.387,.447,s*.619],[0,.14,s*.30],g=>{
      cylinder(g,.041,.38,yAxis,steel);
      cylinder(g,.019,.29,yAxis,aluminum,[0,.20,0]);
      ring(g,.106,.046,.019,yAxis,cast,[0,.045,0]);
      block(g,[.105,.13,.09],cast,[0,-.18,0]);
      for (const member of g.children) { member.position.applyAxisAngle(xAxis,-s*.245); member.rotateOnWorldAxis(xAxis,-s*.245); }
    },options('front_spring_strut_shock_absorber',side==='left'?'31311127315':'31311127316'));
    add(frontCorner,'spring','Front coil spring',[1.387,.575,s*.585],[.20,.37,s*.28],g=>{
      const spring=coil(g,.082,.228,5.8,steel);
      spring.rotateOnWorldAxis(xAxis,-s*.245);
    },options('coil_spring'));
    add(frontCorner,'top-mount','Front upper mount',[1.387,.747,s*.542],[.03,.43,s*.24],g=>{
      ring(g,.086,.022,.042,yAxis,rubber);
      cylinder(g,.024,.012,yAxis,black,[0,.025,0]);
      ring(g,.104,.044,.014,yAxis,aluminum,[0,-.029,0]);
      for(let i=0;i<3;i++)cylinder(g,.009,.038,yAxis,steel,[.08*Math.sin(i*2.094),.023,.08*Math.cos(i*2.094)],.009,6);
    },options('front_spring_strut_shock_absorber',undefined,{systems:['system:engine-bay']}));
    add(rearCorner,'trailing-arm','Semi-trailing arm',[-1.19,.234,z*.86],[-.18,-.22,s*.29],g=>{
      rod(g,[.25,.0,-s*.23],[-.08,.01,s*.07],.034,cast);
      rod(g,[.15,0,-s*.35],[-.08,.01,s*.07],.030,cast);
      ring(g,.073,.040,.04,zAxis,steel,[-.08,.01,s*.06]);
      block(g,[.19,.026,.16],black,[.065,.017,-s*.045]);
    },options('rear_axle_support_wheel_suspension'));
    add(rearCorner,'spring','Rear coil spring',[-1.07,.440,z*.87],[0,.38,s*.28],g=>coil(g,.078,.217,6,steel),options('set_coil_springs'));
    add(rearCorner,'damper','Rear shock absorber',[-1.31,.461,z],[0,.21,s*.40],g=>{
      cylinder(g,.030,.27,yAxis,steel,[0,-.05,0]);
      cylinder(g,.013,.22,yAxis,aluminum,[0,.159,0]);
      ring(g,.031,.012,.027,xAxis,rubber,[0,-.202,0]);
    },options('single_components_for_rear_spring_strut'));
    add(rearCorner,'halfshaft','Rear axle half-shaft',[-1.17,.305,z*.55],[.09,-.12,s*.25],g=>{
      cylinder(g,.018,.45,zAxis,steel);
      for(const end of [-1,1])for(let i=0;i<5;i++)ring(g,.037-i*.002,.024,.014,zAxis,rubber,[0,0,end*(.23-i*.017)]);
    },options('output_shaft'));
    for (const [scopeId,x,axle,track] of [
      [frontCorner,frontAxleX,'front',factoryDimensions.frontTrack],
      [rearCorner,rearAxleX,'rear',factoryDimensions.rearTrack],
    ]) {
      const wheelZ=s*track/2;
      const hubZ=wheelZ-s*.036;
      add(scopeId,'hub',axle==='front'?'Front wheel hub':'Rear wheel hub',[x,axleHeight,hubZ],[0,.025,s*.40],g=>{
        cylinder(g,.065,.055,zAxis,steel);
        cylinder(g,.034,.080,zAxis,aluminum,[0,0,s*.026]);
        for(let i=0;i<4;i++)cylinder(g,.009,.05,zAxis,steel,[.047*Math.sin(i*Math.PI/2),.047*Math.cos(i*Math.PI/2),s*.034],.009,6);
      },axle==='front'?options('wheel_bearings'):options('side_shaft_wheel_bearings','33411131121'));
      add(scopeId,'rotor',axle==='front'?'Front ventilated brake rotor':'Rear brake rotor',[x,axleHeight,wheelZ-s*.001],[0,0,s*.55],g=>{
        ring(g,axle==='front'?.131:.126,.064,axle==='front'?.020:.011,zAxis,aluminum);
        ring(g,.068,.032,.034,zAxis,steel,[0,0,s*.01]);
      },options(axle==='front'?'front_brake_brake_disc':'rear_wheel_brake_brake_pad_sensor'));
      add(scopeId,'caliper','Disc brake caliper',[x-.103,.36,wheelZ+s*.001],[-.14,.19,s*.63],g=>{
        block(g,[.08,.105,.091],cast);
        block(g,[.05,.076,.030],rubber,[.029,.001,-s*.041]);
        cylinder(g,.023,.036,zAxis,steel,[.020,-.006,s*.040]);
      },options(axle+'_wheel_brake_brake_pad_sensor'));
      add(scopeId,'wheel',axle==='front'?'Front cross-spoke wheel and tire':'Rear cross-spoke wheel and tire',
        [x,axleHeight,wheelZ],[0,.02,s*1.14],g=>drawE30CrossSpoke(g,s),
        {page:'alloy_rim_style',wheel:true});
    }
  }
  const underbody=scope('underbody','Fuel and exhaust',['fuel','exhaust','underbody']);
  add(underbody,'fuel-tank','Fuel tank and straps',[-.64,.26,0],[-.14,-.41,.40],g=>{
    // The late tank straddles the propeller shaft. Keep the low joining
    // section below its centerline, and route the exhaust outside the tank.
    for(const [side,width,center] of [[-1,.330,-.300],[1,.164,.189]]){
      block(g,[.440,.155,width],black,[0,-.015,center],.033);
      block(g,[.463,.012,width+.008],steel,[0,-.013,center],.006);
      for(const x of [-.165,.155]){
        const strapZ=center+side*.029;
        curvedTube(g,[[x-.051,.077,strapZ],[x-.036,-.087,strapZ],[x,-.097,strapZ],
          [x+.047,-.074,strapZ],[x+.051,.076,strapZ]],.011,steel,20);
        for(const end of [-1,1]) block(g,[.037,.021,.046],steel,[x+.050*end,.076,strapZ],.006);
      }
    }
    block(g,[.316,.041,.235],black,[.015,-.058,-.012],.015);
  },options('fuel_tank_fuel_feed'));
  add(underbody,'exhaust-pipes','Twin exhaust pipes and rear silencer',[-.24,.174,.24],[0,-.62,.40],g=>{
    for(const [x,z,lane] of [[1.355,.330,.043],[1.015,.330,-.022]]) {
      const toLocal=([x,y,z])=>[x+.24,y-.174,z-.24];
      curvedTube(g,[[x,.490,z],[x-.035,.430,z+.015],[x-.106,.285,.350+lane],
        [.595,.218,.348+lane],[.13,.193,.344+lane],[-.55,.183,.340+lane],
        [-1.17,.187,.332+lane],[-1.37,.165,.224+lane],[-1.51,.190,-.218+lane],
        [-1.642,.216,-.386+lane]].map(toLocal),.0215,steel,50);
      ring(g,.039,.020,.013,xAxis,steel,toLocal([x-.007,.489,z]));
      curvedTube(g,[[-1.982,.211,-.386+lane],[-2.048,.193,-.390+lane],[-2.137,.185,-.390+lane]].map(toLocal),.023,steel,21);
      ring(g,.023,.018,.012,xAxis,cast,toLocal([-2.141,.185,-.390+lane]));
    }
    block(g,[.375,.103,.237],aluminum,[.512,.019,.105],.041);
    // The oval silencer lies on the left in line with both tailpipes.
    const muffler = new Shape();
    muffler.absellipse(0,0,.103,.054,0,Math.PI*2);
    const caseMesh=new ExtrudeGeometry(muffler,{depth:.36,bevelEnabled:true,bevelThickness:.014,
      bevelSize:.005,bevelSegments:3,steps:1,curveSegments:30});
    caseMesh.translate(0,0,-.18);
    mesh(g,caseMesh,steel,[-1.586,.039,-.626]).quaternion.setFromUnitVectors(zAxis,xAxis);
    for(const x of [-1.708,-1.930]){
      rod(g,[x+.24,.069,-.689],[x+.24,.124,-.717],.009,steel);
      ring(g,.023,.010,.018,xAxis,rubber,[x+.24,.135,-.716]);
      rod(g,[x+.24,.141,-.712],[x+.24,.260,-.722],.008,steel);
    }
  },options('exhaust_system'));


}

export function buildE30PanelHardware(add) {
  for (const [side, sign] of [['left', -1], ['right', 1]]) {
    const door = 'e30body:door-' + side;
    const title = side[0].toUpperCase() + side.slice(1);
    add(door,'inner-shell',title+' inner door shell',[.188,.545,sign*.724],[-.045,.55,sign*.77],g=>{
      const skin=new Shape();
      skin.moveTo(-.58,.238); skin.lineTo(.596,.225); skin.lineTo(.590,-.196);
      skin.quadraticCurveTo(.560,-.241,.517,-.241);
      skin.lineTo(-.49,-.237); skin.quadraticCurveTo(-.54,-.205,-.55,-.141);
      skin.closePath();
      for(const [x,y,rx,ry] of [[-.23,.013,.215,.135],[.273,-.016,.206,.111]]){
        const hole=new Path();
        hole.absellipse(x,y,rx,ry,0,Math.PI*2,true);
        skin.holes.push(hole);
      }
      mesh(g,new ExtrudeGeometry(skin,{depth:.034,bevelEnabled:true,bevelThickness:.005,bevelSize:.006,bevelSegments:2,steps:1,curveSegments:14}),aluminum,[0,0,-.017]);
      block(g,[1.043,.043,.023],steel,[.014,-.165,-sign*.012],.011);
      block(g,[1.103,.028,.021],black,[.005,.218,-sign*.023],.006);
      for(const x of [-.49,-.32,.06,.34,.50])cylinder(g,.009,.013,zAxis,steel,[x,-.201,-sign*.024],.009,8);
    },{page:'front_door_hinge_door_brake',cabinVisible:true});
    for (const [height, label] of [[.66, 'upper'], [.42, 'lower']]) {
      add(door,label+'-hinge',side[0].toUpperCase()+side.slice(1)+' '+label+' door hinge',
        [.804,height,sign*.722],[.31,.37,sign*.87],g=>{
          block(g,[.073,.057,.012],cast,[-.03,0,-sign*.012],.005);
          block(g,[.047,.064,.015],steel,[.029,0,sign*.014],.004);
          cylinder(g,.012,.084,yAxis,steel,[0,0,0]);
          for(const y of [-.019,.019])cylinder(g,.009,.018,zAxis,steel,[-.046,y,-sign*.014],.009,6);
        },{page:'front_door_hinge_door_brake',internal:true});
    }
    add(door,'latch',side[0].toUpperCase()+side.slice(1)+' door latch',
      [-.403,.655,sign*.733],[-.27,.41,sign*.93],g=>{
        block(g,[.044,.076,.057],cast,[0,0,0],.008);
        ring(g,.021,.011,.013,xAxis,steel,[.024,0,0]);
        cylinder(g,.006,.049,zAxis,steel,[-.018,.020,0]);
      },{page:'door_lock_front',internal:true});
    add('e30body:hood','hinge-'+side,side[0].toUpperCase()+side.slice(1)+' hood hinge',
      [1.919,.68,sign*.53],[.76,1.08,sign*.29],g=>{
        block(g,[.12,.021,.041],steel,[0,0,0],.006);
        rod(g,[-.037,.008,0],[.052,.055,0],.013,cast);
        ring(g,.016,.007,.025,zAxis,steel,[.052,.055,0]);
      },{page:'engine_hood_mechanism',internal:true});
    add('e30body:trunk','hinge-'+side,side[0].toUpperCase()+side.slice(1)+' trunk hinge',
      [-1.63,.807,sign*.49],[-.70,1.04,sign*.24],g=>{
        curvedTube(g,[[.07,-.105,0],[.035,-.062,0],[-.018,-.010,0],[-.073,.019,0]],.014,steel,16);
        block(g,[.051,.013,.04],cast,[-.070,.026,0],.006);
        ring(g,.014,.007,.026,zAxis,steel,[.07,-.105,0]);
      },{page:'trunk_lid_closing_system',internal:true});
  }
}

export { aluminum, black, brass, rubber, steel, xAxis, yAxis, zAxis, block, cylinder, ring, rod, curvedTube };
