import { ExtrudeGeometry, LatheGeometry, Mesh, MeshStandardMaterial, Path, Shape, Vector2 } from 'three';
import { black, brass, rubber, steel, xAxis, yAxis, zAxis, block, cylinder, ring, rod, curvedTube } from './e30-325i-geometry.mjs';

const cast = new MeshStandardMaterial({ name:'Cast clutch iron', color:'#8a8d89', metalness:.55, roughness:.62 });
const turned = new MeshStandardMaterial({ name:'Machined steel', color:'#a9adaa', metalness:.82, roughness:.36 });
const stamped = new MeshStandardMaterial({ name:'Stamped steel cover', color:'#626966', metalness:.71, roughness:.53 });
const facing = new MeshStandardMaterial({ name:'Organic clutch facing', color:'#50483d', metalness:.08, roughness:.9 });
const clutch = 'gearshift_clutch';
const housing = 'housing_attaching_parts_getrag_260_5_50';
const selector = 'inner_gear_shift_parts_getrag_260_5_50';
const gearset = 'gear_wheel_set_single_part_getrag_260_5_50';
const circle = Math.PI * 2;
const point = (x,r,a) => [x,r*Math.cos(a),r*Math.sin(a)];

function turnedProfile(group, profile, material, segments=64) {
  const geometry = new LatheGeometry(profile.map(([x,r])=>new Vector2(r,x)),segments);
  geometry.rotateZ(-Math.PI/2);
  group.add(new Mesh(geometry,material));
}

function bolt(group, head, length, shaft) {
  cylinder(group,head,.005,xAxis,turned,[-.0025,0,0],head*.84,6);
  cylinder(group,head*1.08,.0015,xAxis,steel,[-.0006,0,0],head*1.08,20);
  const profile = [[0,0],[0,shaft*.88]];
  for(let x=.001;x<length-.001;x+=.0013) {
    profile.push([x,shaft*.88],[x+.0003,shaft],[x+.0007,shaft],[x+.001,shaft*.88]);
  }
  profile.push([length,shaft*.82],[length,0]);
  turnedProfile(group,profile,steel,12);
}

export function frictionDisc(group) {
  for (const side of [-1,1]) {
    ring(group,.114,.073,.003,xAxis,facing,[side*.0035,0,0],64);
    for(let i=0;i<32;i++) {
      const a=i*circle/32,p=point(side*.00508,.094,a);
      const groove=block(group,[.00018,.037,.0011],black,p,.00003);
      groove.rotation.x=a+.18;
    }
  }
  ring(group,.110,.0175,.003,xAxis,stamped);
  for (let i=0;i<12;i++) {
    const a=i*circle/12;
    cylinder(group,.0025,.0104,xAxis,brass,point(0,.092,a),.0025,12);
  }
  for (const side of [-1,1]) {
    const plate = new Shape();
    plate.absarc(0,0,.073,0,circle,false);
    const bore = new Path();
    bore.absarc(0,0,.024,0,circle,true);
    plate.holes.push(bore);
    for(let i=0;i<4;i++){
      const a=(i+.5)*circle/4;
      const window = new Path();
      window.absellipse(-.048*Math.sin(a),.048*Math.cos(a),.019,.010,0,circle,true,a);
      plate.holes.push(window);
    }
    const geometry = new ExtrudeGeometry(plate,{depth:.003,bevelEnabled:false,curveSegments:16});
    geometry.rotateY(Math.PI/2);
    geometry.translate(side*.012-.0015,0,0);
    group.add(new Mesh(geometry,turned));
  }
  turnedProfile(group,[[-.017,.014],[-.017,.026],[-.012,.030],
    [.012,.030],[.017,.024],[.017,.014],[-.017,.014]],turned);
  for (let i=0;i<4;i++) {
    const a=(i+.5)*circle/4;
    const helix=Array.from({length:37},(_,step)=>{
      const t=step/36,phase=circle*5*t, radial=.048+.0055*Math.cos(phase), tangent=.030*(t-.5);
      return [.0055*Math.sin(phase),radial*Math.cos(a)-tangent*Math.sin(a),radial*Math.sin(a)+tangent*Math.cos(a)];
    });
    curvedTube(group,helix,.0013,steel,36);
  }
}

export const clutchBoltSites = Array.from({length:6},(_,i)=>point(.705,.127,(i+.16)*circle/6));

export function pressurePlate(group) {
  turnedProfile(group,[
    [-.022,.074],[-.020,.105],[-.015,.120],[-.005,.127],
    [.014,.128],[.022,.124],[.023,.117],[.012,.116],
    [-.003,.115],[-.011,.102],[-.016,.074],[-.022,.074],
  ],stamped);
  turnedProfile(group,[[.008,.077],[.008,.111],[.012,.114],[.024,.114],
    [.0255,.112],[.0255,.077],[.008,.077]],cast);
  ring(group,.111,.077,.0008,xAxis,turned,[.0251,0,0],64);
  for(let i=0;i<18;i++) {
    const a=i*circle/18;
    const finger=block(group,[.004,.059,.012],turned,point(-.017,.057,a),.0009);
    finger.rotation.x=a;
  }
  for (const [,y,z] of clutchBoltSites) ring(group,.010,.0046,.005,xAxis,stamped,[.027,y,z],24);
  for (let i=0;i<3;i++) {
    const a=(i+.4)*circle/3;
    const strap=block(group,[.0035,.014,.032],steel,point(.010,.116,a),.001);
    strap.rotation.x=a;
    cylinder(group,.003,.006,xAxis,turned,point(-.018,.094,a),.003,12);
  }
}

export function releaseFork(group) {
  const face = new Shape([
    [-.111,-.012],[-.083,-.027],[-.039,-.037],[.037,-.037],
    [.091,-.024],[.116,-.010],[.122,.006],[.105,.016],
    [.042,.028],[-.030,.030],[-.090,.019],[-.116,.004],
  ].map(([z,y])=>new Vector2(-z,y)));
  const aperture = new Path();
  aperture.absellipse(0,0,.035,.023,0,circle,true);
  face.holes.push(aperture);
  const shell = new ExtrudeGeometry(face,{depth:.004,bevelEnabled:true,bevelThickness:.0014,bevelSize:.0014,bevelSegments:2});
  shell.rotateY(Math.PI/2);
  group.add(new Mesh(shell,stamped));
  for (const y of [-.021,.021]) {
    curvedTube(group,[[.001,y,-.088],[-.006,y*1.44,-.033],[-.008,y*1.4,.032],[.001,y,.09]],.0026,steel,14);
  }
  for(const z of [-.034,.034]) block(group,[.011,.015,.012],turned,[.006,0,z],.002);
  cylinder(group,.010,.004,xAxis,turned,[.006,-.005,.101],.009,24);
  cylinder(group,.008,.004,xAxis,turned,[.006,-.005,-.090],.008,24);
}

export function releaseBearing(group) {
  turnedProfile(group,[
    [-.0125,.025],[-.0125,.039],[-.009,.042],[-.002,.042],
    [.002,.038],[.009,.037],[.0125,.033],[.0125,.025],[-.0125,.025],
  ],turned);
  ring(group,.041,.031,.0018,xAxis,rubber,[-.0112,0,0],40);
  for(const z of [-.036,.036]) block(group,[.013,.020,.013],steel,[.005,0,z],.002);
}

export function addGetragServiceParts(put, joint) {
  const b=(id,title,at,row,draw,page=clutch,spread=[.30,.18,.31],internal=true)=>
    put(id,title,at,spread,draw,{page,row,internal});
  clutchBoltSites.forEach((at,i)=>b('clutch-bolt-'+(i+1),'Pressure plate screw '+(i+1),at,'07129903984',
    group=>bolt(group,.006,.016,.004)));
  b('pilot-bearing','Crankshaft pilot bearing',[.741,0,0],'11211709934',group=>{
    ring(group,.016,.006,.010,xAxis,turned);
    ring(group,.0145,.007,.001,xAxis,rubber,[-.0046,0,0],40);
  },'flywheel_twin_mass_flywheel');
  b('fork-spring','Release fork retaining spring',[.598,-.006,.101],'21511204327',group=>{
    curvedTube(group,[[.005,-.015,-.012],[-.004,-.011,-.009],[-.009,0,0],[-.005,.012,.008],[.004,.014,.010]],.0015,steel,20);
  });
  b('fork-pivot','Release fork ball pin',[.595,-.008,.101],'21511202659',group=>{
    turnedProfile(group,[[-.008,.003],[-.004,.003],[-.004,.006],[0,.007],[.004,.005],[.007,.001],[.007,0]],turned);
  });
  for(const [i,angle] of Array.from({length:6},(_,i)=>[i,i*circle/6])){
    b('guide-bolt-'+(i+1),'Guide sleeve screw '+(i+1),point(.520,.041,angle),'07119904505',
      group=>{
        cylinder(group,.005,.005,xAxis,turned,[.0025,0,0],.005,6);
        cylinder(group,.003,.020,xAxis,turned,[-.010,0,0],.003,16);
      },housing);
  }
  b('guide-spacer','Guide sleeve shim',[.507,0,0],null,group=>ring(group,.039,.028,.002,xAxis,turned),housing);
  b('input-stop-washer','Input bearing stop washer',[.506,0,0],'23221224181',group=>ring(group,.036,.018,.002,xAxis,turned),gearset);
  b('input-snap-ring','Input bearing retaining ring',[.509,0,0],null,group=> {
    const angles=Array.from({length:40},(_,i)=>.29+(circle-.58)*i/39);
    curvedTube(group,angles.map(a=>point(0,.019,a)),.0014,steel,39);
  },gearset);
  b('reverse-retainer','Reverse shaft retaining screw',[.184,-.073,-.104],'23111224482',group=>
    cylinder(group,.008,.015,zAxis,turned,[0,0,.002],.008,6),housing);
  b('interlock-cap','Interlock end cap',[.147,.078,.062],null,group=>cylinder(group,.009,.008,zAxis,turned,[0,0,0],.009,20),selector);
  b('interlock-spring','Interlock spring',[.147,.078,.051],null,group=>{
    curvedTube(group,Array.from({length:43},(_,i)=>[.0034*Math.cos(i*circle/6),.0034*Math.sin(i*circle/6),(i/42-.5)*.012]),.00065,steel,42);
  },selector);
  b('interlock-pin','Interlock pin',[.147,.078,.036],null,group=>cylinder(group,.0035,.017,zAxis,turned,[0,0,0],.0035,18),selector);

  joint.forEach(([x,y,z],i)=>{
    b('case-bolt-'+(i+1),'Case seam bolt '+(i+1),[x-.015,y,z],i===0?null:'07119913676',
      group=>bolt(group,.007,i===0?.060:.035,.004),housing,[0,.20,.22],false);
  });
  for(const [i,a] of [1.56,4.70].entries()) {
    b('case-dowel-'+(i+1),'Case locating dowel '+(i+1),
      [joint[0][0],-.036+.139*Math.cos(a),.114*Math.sin(a)],'07119942304',
      group=>cylinder(group,.005,.032,xAxis,turned,[0,0,0],.005,18),housing,[0,.15,.20]);
  }
  b('output-lockplate','Output collar lockplate',[-.039,0,0],'23211490120',
    group=>ring(group,.027,.015,.002,xAxis,turned),gearset);
  b('output-nut','Output collar nut',[-.045,0,0],null,group=>{
    const shape=new Shape(Array.from({length:6},(_,i)=>new Vector2(.020*Math.cos(i*circle/6),.020*Math.sin(i*circle/6))));
    const hole=new Path();hole.absarc(0,0,.014,0,circle,true);shape.holes.push(hole);
    const geometry=new ExtrudeGeometry(shape,{depth:.011,bevelEnabled:false,curveSegments:12});
    geometry.rotateY(Math.PI/2);group.add(new Mesh(geometry,turned));
  },gearset);
}
