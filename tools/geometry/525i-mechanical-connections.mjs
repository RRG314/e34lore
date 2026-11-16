import * as T from 'three';
import {visualMaterials as M, bolts, box, cylinder, lathe, mesh, ring, surface, tube} from './525i-visual-details.mjs';

const mounts='catalog-assembly-8ce1b967929ebcdc3956b384';
const cooler='catalog-assembly-f166fb4876b0f07cc11c25c0';
const steering='catalog-assembly-9af407e8546dd3f64946ac55';
const centerMount='catalog-assembly-2c65f0c62b59f989ca691ff5';
const waterHoses='catalog-assembly-a3ddd8f5d084b2502666face';
const driveShaft='catalog-assembly-1bf97b3f6762a74b8fac68cc';
const identity=new T.Matrix4().toArray();
const at=(x,y,z)=>new T.Matrix4().makeTranslation(x,y,z).toArray();
const vector=point=>new T.Vector3(...point);

function rod(group, from, to, radius, material=M.steel, segments=24) {
  const delta=vector(to).sub(vector(from));
  const mid=vector(from).addScaledVector(delta,.5);
  const shaft=cylinder(group,radius,delta.length(),mid.toArray(),material,'y',segments);
  shaft.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
  return shaft;
}

function cuff(group, point, direction, diameter) {
  const metal=ring(group,diameter/2+.002,diameter/2,.012,point,M.machined,'y',40);
  metal.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vector(direction).normalize());
  const screw=new T.Vector3(.003,0,diameter/2+.003).applyQuaternion(metal.quaternion).add(vector(point));
  box(group,[.013,.010,.010],screw.toArray(),M.machined,.002);
}

function formedHose(group, points, radius) {
  const path=new T.CatmullRomCurve3(points.map(vector));
  const sections=42, radial=20;
  const frames=path.computeFrenetFrames(sections,false);
  const vertices=[],indices=[];
  for (const inset of [0,.0034]) {
    for(let i=0;i<=sections;i++) {
      const t=i/sections,p=path.getPointAt(t);
      const r=radius*(1+.075*Math.pow(Math.abs(t-.5)*2,6))-inset;
      for(let j=0;j<radial;j++) {
        const angle=j*Math.PI*2/radial;
        const point=p.clone().addScaledVector(frames.normals[i],Math.cos(angle)*r)
          .addScaledVector(frames.binormals[i],Math.sin(angle)*r);
        vertices.push(point.toArray());
      }
    }
  }
  const layer=(sections+1)*radial;
  for(let i=0;i<sections;i++)for(let j=0;j<radial;j++){
    const a=i*radial+j,b=i*radial+(j+1)%radial,c=a+radial,d=b+radial;
    indices.push(a,b,c,b,d,c,layer+a,layer+c,layer+b,layer+b,layer+c,layer+d);
  }
  for (const offset of [0,sections*radial])for(let j=0;j<radial;j++){
    const a=offset+j,b=offset+(j+1)%radial;
    if(offset)indices.push(a,b,layer+a,b,layer+b,layer+a);
    else indices.push(a,layer+a,b,b,layer+a,layer+b);
  }
  surface(group,vertices,indices,M.rubber);
  for(const t of [.035,.965])cuff(group,path.getPointAt(t).toArray(),path.getTangentAt(t).toArray(),radius*2.10);
}

function ballJoint(group, point, direction=1) {
  const [x,y,z]=point;
  cylinder(group,.023,.015,[x,y,z],M.dark,'y',32);
  const boot=lathe(group,[[.020,-.007],[.020,.002],[.015,.007],[.014,.011],
    [.010,.016],[.008,.016],[.008,-.007],[.020,-.007]],M.rubber,'y',32);
  boot.position.set(x,y,z);
  boot.scale.y=direction;
  cylinder(group,.007,.022,[x,y+direction*.019,z],M.machined,'y',18);
  cylinder(group,.009,.007,[x,y+direction*.030,z],M.machined,'y',6);
}

function forgedArm(group, from, to, eyeRadius) {
  tube(group,[from,[from[0]+.061,from[1]-.003,from[2]-.005],to],.0125,M.steel,22);
  ring(group,eyeRadius,eyeRadius*.57,.022,from,M.steel,'y',48);
  ring(group,eyeRadius*.61,eyeRadius*.52,.025,from,M.machined,'y',40);
  ring(group,.021,.009,.017,to,M.steel,'y',40);
}

function supportedGearboxPlate(group) {
  const outline=[[-.691,-.155],[-.620,-.155],[-.612,-.143],[-.620,-.113],
    [-.641,-.083],[-.641,.083],[-.620,.113],[-.612,.143],[-.620,.155],[-.691,.155],
    [-.699,.142],[-.694,.106],[-.683,.069],[-.683,-.069],[-.694,-.106],[-.699,-.142]];
  const shape=new T.Shape(outline.map(point=>new T.Vector2(...point)));
  for(const z of [-.131,.131]) {
    const hole=new T.Path();
    hole.absarc(-.655,z,.0055,0,Math.PI*2,true);
    shape.holes.push(hole);
  }
  const plate=new T.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:false,curveSegments:16});
  plate.rotateX(Math.PI/2);
  const points=plate.getAttribute('position');
  for(let i=0;i<points.count;i++){
    const bend=T.MathUtils.clamp((Math.abs(points.getZ(i))-.045)/.071,0,1);
    points.setY(i,points.getY(i)-.065-.030*bend);
  }
  plate.computeVertexNormals();
  mesh(group,plate,M.steel);
  for(const z of [-.131,.131])ring(group,.010,.0055,.006,[-.655,-.092,z],M.machined,'y',36);
}

function oilCooler(group) {
  const x=1.885, y=.480, z=.19;
  box(group,[.023,.234,.219],[x,y,z],M.fin,.003);
  for(let i=0;i<18;i++)box(group,[.028,.003,.226],[x,y-.112+i*.0132,z],M.machined,.0005);
  for(const side of [-1,1]) {
    cylinder(group,.012,.261,[x,y,z+side*.114],M.alloy,'y',32);
    box(group,[.021,.055,.020],[x-.008,y+.132,z+side*.078],M.steel,.003);
    ring(group,.008,.0038,.004,[x+.004,y+.148,z+side*.078],M.steel,'x',24);
  }
  for(const pos of [.267,.304]){
    rod(group,[x,.35,pos],[x-.044,.335,pos],.007,M.alloy);
    ring(group,.009,.0056,.013,[x-.042,.335,pos],M.machined,'x',32);
  }
}

function oilLine(group, returnLine) {
  const offset=returnLine?.037:0;
  const startX=returnLine?.376:.408;
  const points=[[startX,.361,.126],[startX,.354,.180],[.458,.277,.200+offset],
    [.63,.240,.207+offset],[1.13,.218,.214+offset],[1.52,.244,.230+offset],
    [1.70,.282,.267+offset],[1.78,.330,.267+offset],[1.843,.335,.267+offset]];
  tube(group,points,.0044,M.machined,64);
  const path=new T.CatmullRomCurve3(points.map(vector));
  const flexPoints=Array.from({length:10},(_,i)=>path.getPoint(.30+i*.15/9).toArray());
  tube(group,flexPoints,.0075,M.rubber,18);
  for(const t of [.30,.45]){
    const p=path.getPoint(t),v=path.getTangent(t);
    rod(group,p.clone().addScaledVector(v,-.009).toArray(),p.clone().addScaledVector(v,.009).toArray(),.009,M.steel,24);
  }
  rod(group,points[0],[startX,.359,.146],.010,M.machined,6);
  rod(group,[1.813,.333,.267+offset],points.at(-1),.008,M.machined,24);
}

function coupling(group) {
  const shape=new T.Shape();
  for(let i=0;i<=96;i++){
    const angle=i*Math.PI/48;
    const radius=.055+.007*(1+Math.cos(angle*6))/2;
    if(i===0)shape.moveTo(radius*Math.cos(angle),radius*Math.sin(angle));
    else shape.lineTo(radius*Math.cos(angle),radius*Math.sin(angle));
  }
  const bore=new T.Path();
  bore.absarc(0,0,.028,0,Math.PI*2,true);
  shape.holes.push(bore);
  for(let i=0;i<6;i++){
    const angle=i*Math.PI/3;
    const hole=new T.Path();
    hole.absarc(.048*Math.cos(angle),.048*Math.sin(angle),.008,0,Math.PI*2,true);
    shape.holes.push(hole);
    ring(group,.0082,.0062,.021,[0,.048*Math.sin(angle),-.048*Math.cos(angle)],M.machined,'x',28);
  }
  const solid=new T.ExtrudeGeometry(shape,{depth:.019,bevelEnabled:true,bevelThickness:.001,bevelSize:.0008,bevelSegments:1,curveSegments:16});
  solid.rotateY(Math.PI/2);
  solid.translate(-.0095,0,0);
  mesh(group,solid,M.rubber);
}

function propellerShaft(group) {
  const front=[.015,.375,0], center=[-.56,.355,0], rear=[-1.108,.325,0];
  rod(group,front,center,.027,M.steel,48);
  rod(group,[-.596,.354,0],rear,.032,M.steel,48);
  for(const point of [front,center,[-.596,.354,0],rear])ring(group,.034,.025,.012,point,M.machined,'x',44);
  for(const sign of [-1,1]) {
    box(group,[.042,.023,.018],[-.578,.355+sign*.021,0],M.steel,.006);
    box(group,[.043,.018,.022],[-.579,.355,sign*.022],M.steel,.006);
  }
  cylinder(group,.009,.053,[-.578,.355,0],M.machined,'y',24);
  cylinder(group,.009,.053,[-.578,.355,0],M.machined,'z',24);
  ring(group,.051,.026,.038,[-1.094,.326,0],M.steel,'x',48);
  bolts(group,6,.043,[-1.112,.325,0],'x',.0042);
}

function supportBearing(group) {
  ring(group,.047,.0275,.031,[0,0,0],M.rubber,'x',64);
  ring(group,.053,.046,.018,[0,0,0],M.steel,'x',64);
  const rubber=lathe(group,[[.028,-.015],[.036,-.015],[.045,-.010],[.046,-.005],[.046,.008],[.037,.013],[.028,.015]],M.rubber,'x',64);
  rubber.position.x=.001;
  for(const z of [-.086,.086]){
    box(group,[.032,.007,.054],[0,.033,z],M.steel,.005);
    ring(group,.010,.0045,.008,[0,.037,z*1.08],M.machined,'y',28);
    rod(group,[0,.016,z*.56],[0,.032,z*.86],.006,M.steel);
  }
}

function bearingInsert(group) {
  ring(group,.0275,.023,.013,[0,0,0],M.machined,'x',64);
  ring(group,.018,.015,.013,[0,0,0],M.machined,'x',64);
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5;
    mesh(group,new T.SphereGeometry(.0028,12,8),M.machined,[0,.0208*Math.sin(a),.0208*Math.cos(a)]);
  }
  ring(group,.023,.018,.002,[.005,0,0],M.rubber,'x',56);
}

export function addMechanicalConnections(add) {
  const transmission={transmission:true,parentId:'system:transmission',systems:['system:transmission']};
  add('e34auto:mount-plate','Gearbox holding plate',supportedGearboxPlate,{...transmission,catalog:[mounts,'24701138520']});
  for (const [side,z] of [['left',-.13],['right',.13]]) {
    add('e34auto:mount-'+side,side==='left'?'Left gearbox rubber mount':'Right gearbox rubber mount',g=>{
      const rubber=lathe(g,[[0,-.032],[.025,-.032],[.025,-.024],[.021,-.018],[.021,.003],[.025,.009],[.025,.015],[0,.015]],M.rubber,'y',44);
      rubber.position.set(-.655,-.115,z);
      cylinder(g,.024,.004,[-.655,-.101,z],M.steel);
      cylinder(g,.023,.004,[-.655,-.147,z],M.steel);
      cylinder(g,.004,.065,[-.655,-.124,z],M.machined);
    },{...transmission,catalog:[mounts,'24701138435']});
    add('e34auto:mount-bracket-'+side,side==='left'?'Left mount support bracket':'Right mount support bracket',g=>{
      box(g,[.067,.009,.061],[-.655,-.151,z],M.steel,.004);
      box(g,[.067,.038,.009],[-.655,-.135,z+Math.sign(z)*.027],M.steel,.003);
      for(const x of [-.676,-.634])ring(g,.009,.0045,.008,[x,-.150,z],M.machined,'y',28);
    },{...transmission,catalog:[mounts,'24701141633']});
  }
  const cooling={matrix:identity,parentId:'system:transmission',systems:['system:transmission','system:cooling']};
  add('e34auto:oil-cooler','Air-cooled transmission oil cooler',oilCooler,{...cooling,catalog:[cooler,'17201728770']});
  add('e34auto:cooler-inlet','Transmission oil cooler inlet pipe',g=>oilLine(g,false),{...cooling,catalog:[cooler,'17221728763']});
  add('e34auto:cooler-return','Transmission oil cooler return pipe',g=>oilLine(g,true),{...cooling,catalog:[cooler,'17221728764']});
  add('e34sys:flexible-drive-coupling','Driveshaft flex disc',coupling,{matrix:at(.032,.375,0),keepBinding:true,kind:'reference',
    note:'The illustration follows the display flange. Select the source option using the flange and coupling on your car.'});
  add('e34sys:propeller-shaft','Two-piece automatic driveshaft',propellerShaft,{matrix:identity,catalog:[driveShaft,'26111227387']});
  add('e34sys:center-bearing','Driveshaft centre support',supportBearing,{matrix:at(-.56,.355,0),catalog:[centerMount,'26121226723']});
  add('e34sys:center-bearing-insert','Centre support ball bearing',bearingInsert,{
    matrix:at(-.56,.355,0),parentId:'e34sys:center-bearing',systems:['system:driveshaft'],
    internal:true,catalog:[centerMount,'26121225071']});

  // The thermostat fits both molded hoses in this illustrated installation.
  add('m50:thermostat-housing','Thermostat housing',g=>{
    ring(g,.039,.024,.010,[.334,.267,.024],M.alloy,'x',56);
    tube(g,[[.338,.267,.024],[.364,.267,.022],[.386,.272,.004],[.418,.272,-.032]],.025,M.alloy,18);
    tube(g,[[.354,.267,.029],[.371,.256,.058],[.395,.240,.088],[.416,.229,.111]],.024,M.alloy,18);
    for(const [y,z] of [[.296,.044],[.239,.044],[.294,.002],[.241,-.002]])cylinder(g,.005,.013,[.335,y,z],M.machined,'x',6);
  },{keepBinding:true});
  add('e34sys:upper-radiator-hose','Upper radiator hose',g=>formedHose(g,
    [[1.615,.662,-.030],[1.652,.672,-.066],[1.655,.693,-.134],[1.633,.695,-.235],[1.658,.676,-.305],[1.708,.675,-.322]],.0217),
    {matrix:identity,catalog:[waterHoses,'11531720678']});
  add('e34sys:lower-radiator-hose','Lower radiator hose',g=>formedHose(g,
    [[1.609,.619,.104],[1.645,.592,.148],[1.651,.540,.203],[1.608,.479,.257],[1.626,.393,.307],[1.673,.355,.322],[1.708,.355,.322]],.0217),
    {matrix:identity,catalog:[waterHoses,'11531722852']});

  add('e34sys:pitman-arm','Steering box drop arm',g=>forgedArm(g,[.940,.282,-.450],[1.150,.281,-.443],.029),
    {matrix:identity,catalog:[steering,'32211137467']});
  add('e34sys:idler-arm','Steering idler arm',g=>{
    forgedArm(g,[.970,.284,.450],[1.150,.281,.443],.026);
    cylinder(g,.018,.053,[.970,.315,.450],M.rubber);
    ring(g,.019,.008,.053,[.970,.316,.450],M.steel,'y',36);
  },{matrix:identity,catalog:[steering,'32211136450']});
  add('e34sys:center-drag-link','Steering centre link',g=>{
    tube(g,[[1.150,.281,-.443],[1.140,.265,-.332],[1.111,.261,-.270],[1.111,.261,.270],[1.140,.265,.332],[1.150,.281,.443]],.0125,M.steel,36);
    for(const z of [-.443,.443])ballJoint(g,[1.150,.281,z]);
    for(const z of [-.395,.395])ring(g,.018,.009,.014,[1.151,.273,z],M.steel,'y',36);
  },{matrix:identity,catalog:[steering,'32211138854','32211138864']});
  for(const sign of [-1,1]) {
    add('e34sys:tie-rod-'+sign,sign===1?'Left adjustable tie rod':'Right adjustable tie rod',g=>{
      const inner=[1.151,.273,-sign*.395],outer=[1.360,.292,-sign*.640];
      rod(g,inner,outer,.009,M.steel);
      const direction=vector(outer).sub(vector(inner));
      const section=t=>vector(inner).addScaledVector(direction,t).toArray();
      rod(g,section(.26),section(.76),.013,M.dark,36);
      for(const t of [.30,.73])cuff(g,section(t),direction.toArray(),.026);
      ballJoint(g,inner,-1);
      ballJoint(g,outer,-1);
    },{matrix:identity,catalog:[steering,'32211135666','32211135668']});
  }
}
