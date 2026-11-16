import * as T from 'three';
import {visualMaterials as M, bolts, box, cylinder, lathe, mesh, ring, surface, tube} from './525i-visual-details.mjs';

export const gearboxSystem = 'system:automatic-gearbox';
export const factorySources = {
  section: {
    title: 'Hydra-Matic 4L30-E cutaway · figure 6',
    url: 'https://cdn.static-repo.emanualonline.com/Other/NASa/15/87995-GM_4L30-E_4L430-E_Hydra-Matic_Transmission/8/8.jpg',
  },
  overdrive: {
    title: 'Isuzu 4L30-E overdrive · figure 7A-101',
    url: 'https://www.carmanualsonline.info/img/61/57183/w960_57183-1087.png',
  },
  main: {
    title: 'Isuzu 4L30-E main gearset · figure 7A-102',
    url: 'https://www.carmanualsonline.info/img/61/57183/w960_57183-1088.png',
  },
  hydraulics: {
    title: 'Isuzu 4L30-E valve bodies · figures 7A-99 and 7A-100',
    url: 'https://www.carmanualsonline.info/isuzu-trooper-1995-workshop-manual/109',
  },
};

const tau = Math.PI * 2;
const friction = new T.MeshStandardMaterial({name:'friction lining',color:'#9d7344',roughness:.79,metalness:.13});
const copper = new T.MeshStandardMaterial({name:'bronze bushings',color:'#ae8c61',roughness:.43,metalness:.75});
const wire = new T.MeshStandardMaterial({name:'wiring insulation',color:'#713f2a',roughness:.67});
const output = 'catalog-assembly-b851489b8de8676c447f9c42';
const solenoids = 'catalog-assembly-776579083044d28a48cc7b22';

function polar(x, radius, angle) {
  return [x, radius * Math.cos(angle), radius * Math.sin(angle)];
}

function turned(group, profile, material = M.machined) {
  return lathe(group, profile, material, 'x', 64);
}

/** Closed, toothed solids. Profiles show tooth engagement and helix direction.
 * Tooth counts, profiles and backlash are visual approximations. */
function teeth(group, {x, width, count, root, tip, bore, twist = 0, material = M.machined, center = [0, 0], phase = 0}) {
  const points = [];
  const faces = [];
  const samples = count * 4;
  const isInternal = tip < root;
  for (const end of [-1, 1]) {
    for (let tooth = 0; tooth < count; tooth++) {
      for (const [fraction, radius] of [[0,root],[.24,tip],[.65,tip],[.91,root]]) {
        const angle = phase + tau * (tooth + fraction) / count + end * twist / 2;
        for (const r of [radius, bore]) {
          const [axial,y,z] = polar(x + end * width / 2, r, angle);
          points.push([axial,y + center[0],z + center[1]]);
        }
      }
    }
  }
  const layer = samples * 2;
  for (let i = 0; i < samples; i++) {
    const a = i * 2;
    const b = ((i + 1) % samples) * 2;
    faces.push(a,b,layer+a,b,layer+b,layer+a);
    faces.push(a+1,layer+a+1,b+1,b+1,layer+a+1,layer+b+1);
    faces.push(a,a+1,b,b,a+1,b+1);
    faces.push(layer+a,layer+b,layer+a+1,layer+b,layer+b+1,layer+a+1);
  }
  if (isInternal) {
    for (let i = 0; i < faces.length; i += 3) [faces[i+1],faces[i+2]] = [faces[i+2],faces[i+1]];
  }
  return surface(group, points, faces, material);
}

function shaft(group, rear, front, radius, ends) {
  turned(group, [[0,rear],[radius*.68,rear],[radius*.85,rear+.025],[radius,rear+.04],
    [radius,front-.039],[radius*.79,front-.034],[radius*.67,front],[0,front]]);
  for (const x of ends) teeth(group, {x,width:.024,count:24,root:radius*.66,tip:radius*.90,bore:radius*.51});
  for (const x of [rear+.055,rear+.062,front-.048]) ring(group,radius*1.04,radius*.85,.002,[x,0,0],M.dark,'x',40);
}

function frictionPack(group, x, radius, inner, count) {
  const step = .0052;
  for (let i = 0; i < count; i++) {
    const axial = x + (i - (count-1)/2) * step;
    if (i % 2) {
      teeth(group,{x:axial,width:.0032,count:22,root:inner+.004,tip:inner,bore:radius,material:friction});
      ring(group,radius,inner+.006,.0009,[axial+.0018,0,0],friction,'x',56);
    } else {
      teeth(group,{x:axial,width:.0018,count:24,root:radius,tip:radius+.004,bore:inner+.002,material:M.steel});
    }
  }
  ring(group,radius+.003,inner+.001,.004,[x-(count-1)*step/2-.004,0,0],M.machined,'x');
}

function drum(group, x, width, radius, bore) {
  const rear = x-width/2;
  const front = x+width/2;
  turned(group, [[bore,rear],[radius-.006,rear],[radius,rear+.006],[radius,front-.004],
    [radius-.004,front],[radius-.012,front],[radius-.012,rear+.009],[bore,rear+.009],[bore,rear]], M.steel);
  teeth(group,{x:x+.003,width:width-.017,count:32,root:radius-.011,tip:radius-.015,bore:radius-.007,material:M.steel});
  ring(group,radius+.001,radius-.002,.003,[front-.006,0,0],M.machined,'x');
}

function piston(group, x, outer, inner, springCount = 12) {
  turned(group, [[inner,x-.005],[outer-.004,x-.005],[outer,x],[outer,x+.008],
    [outer-.008,x+.008],[outer-.012,x+.002],[inner,x+.002],[inner,x-.005]],M.alloy);
  ring(group,outer+.0009,outer-.002,.0024,[x+.004,0,0],M.rubber,'x');
  for (let i=0;i<springCount;i++) {
    const [,y,z] = polar(0,(inner+outer)*.5,tau*i/springCount);
    const points = Array.from({length:25},(_,j)=>[x-.016+j*.013/24,y+Math.cos(j*tau/6)*.0034,z+Math.sin(j*tau/6)*.0034]);
    const path=new T.CatmullRomCurve3(points.map(point=>new T.Vector3(...point)));
    mesh(group,new T.TubeGeometry(path,20,.0008,6,false),M.steel);
  }
  ring(group,outer-.011,inner+.004,.002,[x-.017,0,0],M.steel,'x');
}

function sprag(group, x, radius, roller) {
  ring(group,radius,radius-.004,.013,[x,0,0],M.steel,'x');
  ring(group,radius-.010,radius-.014,.015,[x,0,0],copper,'x');
  for (let i = 0; i < 18; i++) {
    const angle = tau * i / 18;
    const at = polar(x,radius-.007,angle);
    if (roller) cylinder(group,.0027,.012,at,M.machined,'x',12);
    else {
      const element = box(group,[.011,.005,.005],at,M.machined,.0008);
      element.rotation.x = angle + .35;
    }
  }
}

function rotor(group, x, inner, outer, count, axialSign, material) {
  turned(group, [[inner,x-.006],[outer-.006,x-.010],[outer,x-.004],
    [outer,x+.001],[outer-.011,x+.006],[inner,x+.002],[inner,x-.006]],material);
  ring(group,inner+.008,inner-.004,.014,[x,0,0],M.machined,'x');
  for (let i=0; i<count; i++) {
    const angle=tau*i/count;
    const points=[];
    const faces=[];
    const steps=9;
    for (let j=0;j<=steps;j++) {
      const t=j/steps;
      const radius=inner+(outer-inner)*t;
      const sweep=angle+axialSign*(.23*t+.24*t*t);
      const height=(.005+.017*Math.sin(Math.PI*t))*axialSign;
      points.push(polar(x,radius,sweep-.012),polar(x,radius,sweep+.012),
        polar(x+height,radius,sweep+.11),polar(x+height,radius,sweep+.085));
    }
    for(let j=0;j<steps;j++)for(let k=0;k<4;k++){
      const a=j*4+k,b=j*4+(k+1)%4;
      faces.push(a,b,a+4,b,b+4,a+4);
    }
    faces.push(0,2,1,0,3,2,36,37,38,36,38,39);
    surface(group,points,faces,material);
  }
}

function casing(group, front, rear, frontRadius, rearRadius, ribCount) {
  turned(group, [[rearRadius-.009,rear],[rearRadius+.004,rear],[rearRadius+.004,rear+.009],
    [rearRadius,rear+.012],[frontRadius,front-.012],[frontRadius+.005,front-.009],
    [frontRadius+.005,front],[frontRadius-.010,front],[rearRadius-.009,rear]],M.alloy);
  for (let i=0;i<ribCount;i++) {
    const angle=tau*i/ribCount;
    const path=[polar(rear+.012,rearRadius-.002,angle),polar((rear+front)/2,(rearRadius+frontRadius)/2+.002,angle),polar(front-.012,frontRadius-.002,angle)];
    tube(group,path,.0035,M.alloy,8);
  }
}

function frontPump(group) {
  turned(group,[[.018,-.211],[.088,-.211],[.105,-.207],[.111,-.191],[.099,-.182],
    [.056,-.182],[.048,-.177],[.018,-.177],[.018,-.211]],M.alloy);
  ring(group,.103,.087,.004,[-.183,0,0],M.machined,'x');
  ring(group,.030,.020,.023,[-.164,0,0],copper,'x');
  bolts(group,5,.097,[-.181,0,0],'x',.0042);
}

function carrier(group, x, outer, inner, width, compound) {
  for (const dx of [-width/2,width/2]) ring(group,outer,inner,.007,[x+dx,0,0],M.steel,'x',56);
  const longAxis=compound?.05833:.05733;
  const shortAxis=.04317;
  const pairSeparation=.04083;
  const pairAngle=Math.acos((longAxis**2+shortAxis**2-pairSeparation**2)/(2*longAxis*shortAxis));
  for (let i = 0; i < 3; i++) {
    const a = i * tau/3;
    const [,y,z] = polar(0,longAxis,a);
    cylinder(group,.004,width+.010,[x,y,z],M.machined,'x',16);
    teeth(group,{x,width:width-.011,count:compound?20:17,root:.0209,tip:.024,bore:.004,center:[y,z],twist:.11,phase:a});
    if (compound) {
      const [,shortY,shortZ] = polar(0,shortAxis,a+pairAngle);
      cylinder(group,.0035,width+.010,[x,shortY,shortZ],M.steel,'x',16);
      teeth(group,{x:x+.009,width:width*.60,count:15,root:.016,tip:.019,bore:.0035,center:[shortY,shortZ],twist:-.08,phase:a+.12});
    }
  }
}

function oilPan(group, x, length, width) {
  const top=-.116;
  const bottom=-.178;
  const outline=(l,w)=>[[-l/2+.014,-w/2],[l/2-.014,-w/2],[l/2,-w/2+.014],[l/2,w/2-.014],
    [l/2-.014,w/2],[-l/2+.014,w/2],[-l/2,w/2-.014],[-l/2,-w/2+.014]];
  const points=[];
  for (const [l,w,y] of [[length,width,top],[length-.027,width-.022,bottom],
    [length-.009,width-.009,top-.003],[length-.034,width-.029,bottom+.004]]) {
    points.push(...outline(l,w).map(([a,b])=>[x+a,y,b]));
  }
  const faces=[];
  for(let i=0;i<8;i++) {
    const j=(i+1)%8;
    faces.push(i,j,i+8,j,j+8,i+8,i+16,i+24,j+16,j+16,i+24,j+24,i,i+16,j,j,i+16,j+16);
  }
  for(let i=1;i<7;i++)faces.push(8,8+i,9+i,24,25+i,24+i);
  surface(group,points,faces,M.dark);
  for(const z of [-width*.5,width*.5])box(group,[length-.018,.006,.012],[x,top,z],M.steel,.002);
  for(const dx of [-length*.5,length*.5])box(group,[.013,.006,width-.024],[x+dx,top,0],M.steel,.002);
  for(let i=-2;i<=2;i++) {
    box(group,[length*.73,.006,.009],[x,bottom-.001,i*width*.14],M.dark,.002);
    for(const z of [-width*.5,width*.5])cylinder(group,.0036,.007,[x+i*length*.185,top-.004,z],M.machined,'y',6);
  }
  cylinder(group,.009,.007,[x+.027,bottom-.004,width*.19],M.machined,'y',6);
}

function valveBody(group, x, length, width) {
  const base=-.119;
  const outline=[[-.48,-.38],[-.38,-.49],[-.11,-.49],[-.04,-.43],[.17,-.43],
    [.22,-.49],[.42,-.49],[.50,-.34],[.50,-.12],[.44,-.04],[.47,.32],[.36,.48],
    [.14,.48],[.07,.42],[-.18,.42],[-.23,.49],[-.42,.48],[-.50,.34],[-.50,.02],[-.45,-.06]];
  const body=new T.Shape(outline.map(([a,b])=>new T.Vector2(x+a*length,b*width)));
  const floor=new T.ExtrudeGeometry(body,{depth:.017,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1});
  floor.rotateX(Math.PI/2);
  floor.translate(0,base+.008,0);
  mesh(group,floor,M.alloy);
  for (let lane=0;lane<5;lane++) {
    const z=(lane-2)*width*.145;
    const left=x-length*(.36-(lane%2)*.04),right=x+length*(.39-(lane%3)*.03);
    const bend=(lane%2?.016:-.012);
    const route=[[left,base+.013,z],[left+.012,base+.013,z],[x-.018,base+.013,z+bend],
      [x+.014,base+.013,z+bend],[right-.012,base+.013,z],[right,base+.013,z]];
    tube(group,route,.0035,M.alloy,20);
    cylinder(group,.005,.009,[left,base+.012,z],M.alloy,'y',22);
    cylinder(group,.004,.009,[right,base+.012,z],M.alloy,'y',22);
    cylinder(group,.0055,.026,[x+(lane%2?-.024:.037),base,z],M.alloy,'y',16);
    ring(group,.004,.0021,.002,[x+(lane%2?-.024:.037),base+.016,z],M.dark,'y',20);
  }
  for (const dx of [-.39,.39]) for(const z of [-width*.39,width*.39]) {
    cylinder(group,.007,.027,[x+length*dx,base,z],M.alloy,'y',20);
    cylinder(group,.0035,.004,[x+length*dx,base-.015,z],M.machined,'y',6);
  }
}

function solenoid(group, x, z, large=false) {
  const radius=large?.016:.010;
  cylinder(group,radius,.032,[x,-.119,z],M.steel,'z',36);
  cylinder(group,radius*.63,.014,[x,-.119,z-.021],M.machined,'z',24);
  ring(group,radius*.78,radius*.53,.003,[x,-.119,z-.023],M.rubber,'z',32);
  box(group,[radius*1.35,.014,.022],[x,-.128,z+.017],M.plastic,.004);
  for(const dx of [-.003,.003])box(group,[.0016,.006,.005],[x+dx,-.128,z+.027],copper,.0005);
}

function extension(group) {
  casing(group,-.621,-.743,.101,.043,7);
  ring(group,.103,.088,.005,[-.622,0,0],M.machined,'x');
  ring(group,.043,.029,.013,[-.740,0,0],M.alloy,'x');
  for(let i=0;i<7;i++)cylinder(group,.0067,.016,polar(-.627,.102,i*tau/7),M.alloy,'x',20);
  box(group,[.049,.025,.044],[-.675,.071,.019],M.alloy,.006);
  box(group,[.057,.021,.10],[-.676,-.064,0],M.alloy,.005);
}

function flange(group) {
  const shape=new T.Shape();
  const hole = new T.Path();
  hole.absarc(0,0,.019,0,tau,true);
  shape.holes.push(hole);
  for(let i=0;i<=96;i++) {
    const a=i*tau/96;
    const r=.034+.024*Math.pow((1+Math.cos(a*3))/2,2);
    if(i===0)shape.moveTo(r*Math.cos(a),r*Math.sin(a));
    else shape.lineTo(r*Math.cos(a),r*Math.sin(a));
  }
  for(let i=0;i<3;i++){
    const a=i*tau/3;
    const mount=new T.Path();
    mount.absarc(.048*Math.cos(a),.048*Math.sin(a),.0062,0,tau,true);
    shape.holes.push(mount);
  }
  const geo=new T.ExtrudeGeometry(shape,{depth:.010,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:1,curveSegments:14});
  geo.rotateY(Math.PI/2);
  geo.translate(-.758,0,0);
  mesh(group,geo,M.steel);
  ring(group,.030,.019,.033,[-.739,0,0],M.machined,'x');
}

/** Mating stations share the archived engine-side datum. Axial intervals and
 * cover offsets are chosen for inspection, so they carry no service tolerances. */
export function addAutomaticGearbox(add) {
  const part = (key, name, draw, options={}) => add('e34auto:'+key,name,draw,{
    parentId:'e34auto:case', systems:['system:transmission',gearboxSystem],
    transmission:true,internal:true,visualSources:[factorySources.section],...options,
  });
  part('bellhousing','Converter housing',g=>{
    casing(g,.005,-.184,.173,.109,12);
    ring(g,.180,.161,.012,[.002,0,0],M.alloy,'x');
    bolts(g,8,.171,[.009,0,0],'x',.005);
  },{parentId:gearboxSystem,internal:false,section:true,spread:[.24,.16,0],keepBinding:true});
  part('converter','Torque converter shell',g=>{
    turned(g,[[.020,-.167],[.066,-.167],[.108,-.150],[.131,-.113],[.137,-.070],
      [.133,-.038],[.111,-.021],[.026,-.013],[.022,-.019],[.107,-.027],[.127,-.043],
      [.131,-.068],[.125,-.109],[.103,-.145],[.063,-.161],[.020,-.161],[.020,-.167]],M.steel);
    ring(g,.138,.134,.005,[-.078,0,0],M.seam,'x');
    ring(g,.024,.016,.033,[-.165,0,0],M.machined,'x');
    bolts(g,3,.112,[-.019,0,0],'x',.0048);
  },{parentId:'e34auto:bellhousing',section:true,spread:[.43,.19,0],keepBinding:true});
  part('converter-impeller','Torque converter impeller',g=>rotor(g,-.115,.048,.121,29,1,M.steel),
    {parentId:'e34auto:converter',section:true,spread:[.35,0,0]});
  part('converter-turbine','Torque converter turbine',g=>rotor(g,-.066,.035,.121,31,-1,M.machined),
    {parentId:'e34auto:converter',section:true,spread:[.50,0,0]});
  part('converter-stator','Torque converter stator and one-way clutch',g=>{
    rotor(g,-.093,.023,.068,16,1,M.alloy);
    sprag(g,-.091,.026,true);
  },{parentId:'e34auto:converter',section:true,spread:[.42,-.12,0]});
  part('converter-lockup','Torque converter lockup plate',g=>{
    turned(g,[[.020,-.041],[.104,-.041],[.119,-.036],[.119,-.030],[.108,-.028],
      [.020,-.032],[.020,-.041]],M.steel);
    ring(g,.119,.104,.002,[-.030,0,0],friction,'x');
  },{parentId:'e34auto:converter',section:true,spread:[.61,0,0]});
  part('pump','Front transmission oil pump',frontPump,
    {parentId:'e34auto:bellhousing',section:true,spread:[.26,0,0]});
  part('pump-drive-gear','Oil pump drive gear',g=>teeth(g,{x:-.198,width:.012,count:13,root:.030,tip:.036,bore:.019}),
    {parentId:'e34auto:pump',spread:[.32,-.18,.07]});
  part('pump-driven-gear','Oil pump driven ring gear',g=>teeth(g,{x:-.198,width:.012,count:17,root:.047,tip:.041,bore:.054,center:[.009,0]}),
    {parentId:'e34auto:pump',section:true,spread:[.19,-.18,.07]});
  part('turbine-shaft','Turbine input shaft',g=>shaft(g,-.358,-.035,.014,[-.340,-.052]),
    {parentId:'e34auto:adapter-case',spread:[.27,.25,0],visualSources:[factorySources.overdrive,factorySources.section]});
  part('adapter-case','Overdrive adapter case',g=>{
    casing(g,-.203,-.348,.110,.115,9);
    for(const z of [-.106,.106])box(g,[.138,.012,.024],[-.278,-.107,z],M.alloy,.004);
    cylinder(g,.023,.028,[-.31,.016,.106],M.alloy,'z',32);
  },{parentId:gearboxSystem,internal:false,section:true,spread:[.12,.24,0]});
  const od={parentId:'e34auto:adapter-case',visualSources:[factorySources.overdrive,factorySources.section]};
  part('overrun-drum','Overrun clutch drum',g=>drum(g,-.253,.070,.099,.024),
    {...od,section:true,spread:[.15,.13,0]});
  part('overrun-clutch','Overrun clutch plates',g=>frictionPack(g,-.246,.086,.052,5),
    {...od,section:true,spread:[.19,0,0]});
  part('overrun-piston','Overrun clutch piston and return springs',g=>piston(g,-.276,.081,.028),
    {...od,section:true,spread:[.10,.11,.08]});
  part('overdrive-roller-clutch','Overdrive roller clutch',g=>sprag(g,-.268,.043,true),
    {...od,section:true,spread:[.13,-.13,.07]});
  part('fourth-clutch','Fourth clutch plates',g=>frictionPack(g,-.274,.104,.093,6),
    {...od,section:true,spread:[.06,0,0]});
  part('fourth-piston','Fourth clutch piston and return springs',g=>piston(g,-.310,.109,.092,16),
    {...od,section:true,spread:[.05,.16,.09]});
  part('overdrive-sun','Overdrive sun gear',g=>teeth(g,{x:-.311,width:.031,count:26,root:.0328,tip:.0362,bore:.015,twist:.08}),
    {...od,spread:[.065,-.15,0]});
  part('overdrive-carrier','Overdrive planetary carrier',g=>carrier(g,-.315,.074,.037,.040,false),
    {...od,section:true,spread:[.04,0,0]});
  part('overdrive-ring','Overdrive internal ring gear',g=>teeth(g,{x:-.314,width:.038,count:60,root:.0817,tip:.0783,bore:.087,twist:.06}),
    {...od,section:true,spread:[-.02,.13,0]});
  part('case','Main transmission case',g=>{
    casing(g,-.347,-.622,.116,.103,11);
    for(const z of [-.108,.108])box(g,[.267,.012,.023],[-.485,-.108,z],M.alloy,.004);
    box(g,[.069,.026,.045],[-.541,.086,.062],M.alloy,.008);
    for(const x of [-.392,-.424])cylinder(g,.010,.019,[x,-.014,.112],M.machined,'z',6);
  },{parentId:gearboxSystem,internal:false,section:true,spread:[-.22,.25,0],keepBinding:true});
  const main={visualSources:[factorySources.main,factorySources.section]};
  part('center-support','Center support and reverse clutch carrier',g=>{
    turned(g,[[.022,-.382],[.096,-.382],[.105,-.373],[.107,-.353],[.091,-.350],
      [.086,-.355],[.027,-.355],[.022,-.363],[.022,-.382]],M.alloy);
    bolts(g,6,.097,[-.349,0,0],'x',.0044);
    ring(g,.027,.020,.013,[-.364,0,0],copper,'x');
  },{...main,section:true,spread:[-.04,.11,0]});
  part('reverse-piston','Reverse clutch piston and return springs',g=>piston(g,-.384,.102,.070),
    {...main,section:true,spread:[-.075,.12,.12]});
  part('reverse-clutch','Reverse clutch plates',g=>frictionPack(g,-.402,.103,.083,6),
    {...main,section:true,spread:[-.105,0,0]});
  part('second-drum','Second clutch drum',g=>drum(g,-.456,.104,.092,.031),
    {...main,section:true,spread:[-.25,.17,0]});
  part('second-piston','Second clutch piston and return springs',g=>piston(g,-.420,.083,.043),
    {...main,section:true,spread:[-.17,.12,.13]});
  part('second-clutch','Second clutch plates',g=>frictionPack(g,-.451,.079,.059,7),
    {...main,section:true,spread:[-.19,0,0]});
  part('third-drum','Third clutch drum and intermediate shaft',g=>{
    drum(g,-.465,.078,.059,.018);
    shaft(g,-.522,-.330,.016,[-.505,-.347]);
  },{...main,section:true,spread:[-.29,.12,0]});
  part('third-piston','Third clutch piston and return springs',g=>piston(g,-.435,.049,.025,10),
    {...main,section:true,spread:[-.21,-.16,.09]});
  part('third-clutch','Third clutch plates',g=>frictionPack(g,-.466,.048,.026,7),
    {...main,section:true,spread:[-.32,0,0]});
  part('main-sprag','Main one-way sprag clutch',g=>sprag(g,-.512,.056,false),
    {...main,section:true,spread:[-.39,0,0]});
  part('main-sun','Main gearset sun gears',g=>{
    teeth(g,{x:-.547,width:.029,count:30,root:.0335,tip:.0365,bore:.018,twist:.10});
    teeth(g,{x:-.573,width:.021,count:22,root:.0242,tip:.0272,bore:.016,twist:.08});
  },{...main,spread:[-.44,.13,0]});
  part('main-carrier','Compound planetary carrier',g=>carrier(g,-.563,.069,.035,.069,true),
    {...main,section:true,spread:[-.46,0,0]});
  part('main-ring','Main planetary ring gear',g=>teeth(g,{x:-.561,width:.057,count:70,root:.0832,tip:.0802,bore:.089,twist:.10}),
    {...main,section:true,spread:[-.54,.14,0]});
  part('band-drum','Brake band reaction drum',g=>drum(g,-.581,.061,.093,.045),
    {...main,section:true,spread:[-.57,.17,.09]});
  part('brake-band','Brake band and lining',g=>{
    lathe(g,[[.094,-.599],[.098,-.599],[.098,-.562],[.094,-.562],[.094,-.599]],M.steel,'x',64,.40,tau-.78);
    lathe(g,[[.092,-.596],[.094,-.596],[.094,-.565],[.092,-.565],[.092,-.596]],friction,'x',64,.43,tau-.84);
    for(const a of [.41,tau-.38])box(g,[.035,.012,.011],polar(-.581,.100,a),M.steel,.002);
  },{...main,section:true,spread:[-.62,-.18,.08]});
  part('band-servo','Brake band servo and apply rod',g=>{
    cylinder(g,.027,.022,[-.563,-.083,.072],M.alloy,'y',40);
    ring(g,.028,.024,.003,[-.563,-.072,.072],M.rubber,'y');
    cylinder(g,.005,.058,[-.563,-.055,.072],M.machined);
    tube(g,Array.from({length:49},(_,i)=>[-.563+.016*Math.cos(i*tau/8),-.079+i*.028/48,.072+.016*Math.sin(i*tau/8)]),.0018,M.steel,48);
  },{...main,spread:[-.49,-.28,.13]});
  part('output-shaft','Transmission output shaft',g=>shaft(g,-.768,-.521,.020,[-.751,-.537]),
    {...main,spread:[-.66,0,0]});
  part('parking-gear','Parking lock gear',g=>teeth(g,{x:-.648,width:.017,count:14,root:.032,tip:.042,bore:.018,material:M.steel}),
    {...main,spread:[-.71,.12,0]});
  part('park-pawl','Parking pawl, pivot and linkage',g=>{
    const pawl=box(g,[.064,.014,.016],[-.638,-.030,.041],M.steel,.004);
    pawl.rotation.z=-.21;
    box(g,[.013,.013,.016],[-.662,-.036,.030],M.machined,.003);
    cylinder(g,.006,.031,[-.609,-.026,.047],M.machined,'z',24);
    tube(g,[[-.616,-.022,.051],[-.560,-.039,.094],[-.467,-.031,.105],[-.431,-.018,.116]],.0032,M.machined,18);
  },{...main,spread:[-.58,-.10,.16]});
  part('speed-wheel','Output speed sensor wheel',g=>teeth(g,{x:-.684,width:.015,count:28,root:.028,tip:.032,bore:.019}),
    {...main,spread:[-.81,0,0]});
  part('extension','Drive extension housing',extension,
    {internal:false,section:true,spread:[-.78,.21,0],catalog:[output,'24111421567']});
  part('output-seal','Output shaft seal',g=>{
    turned(g,[[.019,-.750],[.029,-.750],[.029,-.740],[.019,-.740],
      [.019,-.743],[.0205,-.745],[.019,-.747],[.019,-.750]],M.rubber);
  },{parentId:'e34auto:extension',section:true,spread:[-.90,0,0],catalog:[output,'24131218847']});
  part('speed-sensor','Output pulse generator',g=>{
    cylinder(g,.010,.032,[-.684,.045,.019],M.plastic,'y',28);
    ring(g,.011,.008,.003,[-.684,.035,.019],M.rubber,'y');
    box(g,[.032,.014,.024],[-.677,.065,.021],M.plastic,.004);
    box(g,[.017,.012,.014],[-.654,.064,.022],M.plastic,.003);
  },{parentId:'e34auto:extension',internal:false,spread:[-.82,.31,.08],catalog:[output,'24151219659']});
  part('output-flange','Three-arm output flange',flange,
    {parentId:'e34auto:extension',internal:false,spread:[-1.02,0,0],catalog:[output,'24211423883'],
      note:'The illustration follows catalog callout 09. Confirm the flange variant on the car.'});
  part('adapter-valve-body','Overdrive valve body',g=>valveBody(g,-.276,.137,.167),
    {...od,spread:[.09,-.22,0],visualSources:[factorySources.hydraulics,factorySources.section]});
  part('main-valve-body','Main valve body',g=>valveBody(g,-.479,.219,.180),
    {spread:[-.31,-.23,0],visualSources:[factorySources.hydraulics,factorySources.section]});
  part('transfer-plate','Main valve body transfer plate and gaskets',g=>{
    const plate=new T.Shape([
      [-.585,-.079],[-.573,-.092],[-.380,-.092],[-.370,-.078],[-.370,.070],[-.391,.091],[-.578,.091],[-.588,.070],
    ].map(point=>new T.Vector2(...point)));
    for(const x of [-.554,-.518,-.480,-.445,-.407])for(const z of [-.059,-.027,.012,.053]){
      const hole=new T.Path();
      hole.absarc(x,z,.0033,0,tau,true);
      plate.holes.push(hole);
    }
    const geometry=new T.ExtrudeGeometry(plate,{depth:.0024,bevelEnabled:false,curveSegments:10});
    geometry.rotateX(Math.PI/2);
    geometry.translate(0,-.0994,0);
    mesh(g,geometry,M.machined);
    for(const z of [-.087,.087])box(g,[.199,.0012,.005],[-.479,-.0993,z],friction,.0003);
  },{parentId:'e34auto:main-valve-body',spread:[-.25,-.30,.10],visualSources:[factorySources.hydraulics],
    catalog:['catalog-assembly-fb7894c6db1ef24f9147f72e','24271423311'],kind:'set',
    note:'Catalog number identifies the intermediate-plate repair kit. Passage locations are illustrative.'});
  const valveSource={visualSources:[factorySources.hydraulics,factorySources.section]};
  for(const [key,name,x,z,number,parent,large,spread] of [
    ['pressure-solenoid','Pressure regulator solenoid',-.270,.094,'24357537061','adapter-valve-body',true,[.14,-.23,.19]],
    ['lockup-solenoid','Converter clutch solenoid',-.231,.088,'24331218916','adapter-valve-body',false,[.28,-.23,.16]],
    ['shift-12-34','1–2 and 3–4 shift solenoid',-.418,.092,'24337537063','main-valve-body',false,[-.14,-.24,.19]],
    ['shift-23','2–3 shift solenoid',-.468,.095,'24337537062','main-valve-body',false,[-.29,-.24,.19]],
    ['band-solenoid','Band control solenoid',-.543,.094,'24331422093','main-valve-body',true,[-.46,-.24,.19]],
  ])part(key,name,g=>solenoid(g,x,z,large),{...valveSource,parentId:'e34auto:'+parent,catalog:[solenoids,number],
    kind:key==='pressure-solenoid'?'set':'component',spread});
  part('internal-harness','Internal transmission wiring harness',g=>{
    const trunk=[[-.566,-.126,.075],[-.535,-.137,.105],[-.485,-.137,.111],[-.412,-.128,.105],[-.373,-.090,.108],[-.365,-.042,.127]];
    tube(g,trunk,.0034,M.rubber,30);
    for(const x of [-.54,-.469,-.419])tube(g,[[x,-.135,.105],[x+.009,-.143,.111],[x+.006,-.132,.119]],.0015,wire,9);
    tube(g,[[-.366,-.055,.120],[-.328,-.089,.111],[-.275,-.127,.113],[-.239,-.129,.106]],.0025,wire,22);
    cylinder(g,.011,.016,[-.365,-.043,.127],M.plastic,'z',24);
    ring(g,.012,.010,.003,[-.365,-.043,.133],M.rubber,'z');
  },{...valveSource,catalog:[solenoids,'24361421368'],spread:[-.11,-.17,.19]});
  part('pan-main','Main transmission oil pan',g=>oilPan(g,-.484,.260,.238),
    {internal:false,section:true,spread:[-.34,-.45,0],keepBinding:true});
  part('pan-secondary','Overdrive oil pan',g=>oilPan(g,-.275,.140,.210),
    {parentId:'e34auto:adapter-case',internal:false,section:true,spread:[.03,-.43,0],keepBinding:true});
  part('strainer','Automatic transmission oil strainer',g=>{
    box(g,[.168,.014,.127],[-.488,-.143,-.004],M.plastic,.016);
    box(g,[.155,.003,.114],[-.488,-.151,-.004],M.steel,.008);
    cylinder(g,.016,.024,[-.447,-.128,.008],M.plastic,'y',40);
    ring(g,.016,.014,.003,[-.447,-.116,.008],M.rubber,'y');
    for(let i=0;i<16;i++)box(g,[.0015,.002,.097],[-.558+i*.0092,-.153,-.004],M.fin,.0004);
  },{spread:[-.34,-.35,0],keepBinding:true});
  part('flexplate','Automatic drive plate and ring gear',g=>{
    ring(g,.136,.024,.004,[.014,0,0],M.steel,'x',72);
    teeth(g,{x:.014,width:.008,count:108,root:.139,tip:.145,bore:.133,material:M.machined});
    bolts(g,8,.036,[.017,0,0],'x',.004);
    for(let i=0;i<3;i++)ring(g,.012,.0055,.006,polar(.012,.112,i*tau/3),M.steel,'x',24);
  },{parentId:'e34auto:bellhousing',section:true,spread:[.76,0,0],keepBinding:true});
}
