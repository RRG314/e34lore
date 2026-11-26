import {CatmullRomCurve3, TubeGeometry, Vector3} from 'three';
import {visualMaterials as M, box, cylinder, lathe, mesh, ring, tube} from './525i-visual-details.mjs';
import {along, loft, pin} from './525i-fabrication.mjs';

export const frontScope = 'system:front-suspension';
export const rearScope = 'system:rear-suspension';
export const bayScope = 'system:engine-bay';
export const origin = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const systems = (...scopes) => ['system:suspension', ...scopes];
const front = systems(frontScope), rear = systems(rearScope);
const base = 'https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/front_rear_axle/';
export const suspensionSources = Object.fromEntries([
  ['frontCarrier','Front axle support','front_axle_support'],
  ['arms','Front crossmember, wishbones and thrust rods','cross_member_wishbone_rod'],
  ['frontStrut','Front strut, spindle and damper insert','front_spring_strut_shock_absorber'],
  ['frontTop','Front guide support and spring pads','guide_support_spring_pad_attaching_parts'],
  ['frontBar','Front stabilizer and links','stabilizer_front'],
  ['rearCarrier','Rear axle carrier and body mounts','rear_axle_carrier'],
  ['trailingArm','Rear trailing arms and rubber mounts','rear_axle_support_wheel_suspension'],
  ['rearStrut','Conventional rear spring strut','rear_spring_strut'],
  ['rearBar','Rear stabilizer and links','stabilizer_rear'],
].map(([key,title,slug])=>[key,{title,url:base+slug+'.html'}]));
const catalog = {
  frontCarrier:'76925e4c22b529b913e2f5b1', arms:'2c28dca395b83c6d6dec11d5',
  frontStrut:'ce9a09e31124e96abc30701d', frontTop:'ed8d647f41c215395cfcc408',
  frontBar:'e30ab47ec2ee3d101a89691c', rearCarrier:'b47268642ef28e7ced37daaf',
  trailingArm:'62ac4f997b71df4add6c56f0', rearStrut:'a0715708a7e7ffa21611266b',
  rearBar:'922d7dfb0576a329d4ba05bc',
};
const refs = (key, ...numbers) => ({
  visualSources:[suspensionSources[key]],
  ...(numbers.length ? {catalog:['catalog-assembly-'+catalog[key],...numbers]} : {}),
});
const sidePoint = (p, z) => [p[0],p[1],p[2]*z];
const level = (p, y) => [p[0],y,p[2]];
export const frontMount = side => [1.285,.816,side*.555];
export const engineMountFoot = side => [1.175,.319,side*.382];
export const rearMount = side => [-1.586,.995,side*.503];
const rearPivots = side => [[-1.077,.272,side*.312],[-1.181,.289,side*.492]];
const pivotFrame = (g, point, side, draw) => {
  const [inner,outer]=rearPivots(side);
  const target=new Vector3(...outer).sub(new Vector3(...inner)).add(new Vector3(...point));
  along(g,point,target.toArray(),draw);
};

function bushing(g, center, axis, outer, width) {
  ring(g,outer,outer-.004,width,center,M.steel,axis,32);
  ring(g,outer-.004,.009,width-.003,center,M.rubber,axis,32);
  ring(g,.009,.0055,width+.004,center,M.machined,axis,28);
}
function spring(g, length, from, to, radius, wire, turns) {
  const path = [];
  const count = turns*24;
  for (let i=0; i<=count; i++) {
    const t=i/count, a=t*turns*2*Math.PI;
    const rise = .70*t+.30*(t-Math.sin(2*Math.PI*t)/(2*Math.PI));
    const r=radius*(.88+.12*Math.sin(Math.PI*t));
    path.push(new Vector3(Math.cos(a)*r,(from+(to-from)*rise)*length,Math.sin(a)*r));
  }
  mesh(g,new TubeGeometry(new CatmullRomCurve3(path),count,wire,10,false),M.dark);
}
function dish(g, radius, y, flip=1, material=M.dark) {
  const profile=[[.027,0],[.033,0],[radius*.62,.013],[radius*.89,.021],[radius,.016],
    [radius,.012],[radius*.89,.017],[radius*.62,.009],[.033,-.004],[.027,-.004],[.027,0]];
  lathe(g,profile.map(([r,h])=>[r,y+h*flip]),material,'y',48);
}
function boot(g,y0,y1,r0,r1) {
  const profile=[[r0-.002,y0],[r0,y0]];
  for(let i=0;i<=16;i++) {
    const t=i/16;
    profile.push([r0+(r1-r0)*t+(i%2)*.004,y0+(y1-y0)*t]);
  }
  profile.push([r1-.002,y1],[r0-.002,y0]);
  lathe(g,profile,M.rubber,'y',28);
}
function mount(g,y,r) {
  lathe(g,[[.010,y-.020],[.027,y-.018],[.036,y-.012],[r,y-.010],[r,y-.003],[.037,y],
    [.030,y+.012],[.022,y+.016],[.010,y+.016],[.010,y-.020]],M.steel,'y',44);
  ring(g,.030,.010,.020,[0,y+.006,0],M.rubber,'y',36);
  cylinder(g,.011,.012,[0,y+.018,0],M.machined,'y',6);
  lathe(g,[[0,y+.015],[.031,y+.015],[.031,y+.021],[.026,y+.032],[.017,y+.037],[0,y+.038]],M.plastic,'y',36);
  for(let i=0;i<3;i++) {
    const a=i*2*Math.PI/3, x=Math.cos(a)*(r-.012), z=Math.sin(a)*(r-.012);
    cylinder(g,.004,.018,[x,y+.006,z],M.steel,'y',12);
    cylinder(g,.007,.006,[x,y+.014,z],M.machined,'y',6);
  }
}
function ballJoint(g,point) {
  lathe(g,[[0,-.012],[.020,-.012],[.022,-.006],[.021,.003],[.016,.006],[0,.006]],M.alloy,'y',28).position.fromArray(point);
  lathe(g,[[.008,0],[.019,0],[.017,.012],[.011,.019],[.007,.019],[.007,0]],M.rubber,'y',24).position.fromArray(point);
  cylinder(g,.006,.038,level(point,point[1]+.018),M.machined,'y',16,.004);
  cylinder(g,.008,.008,level(point,point[1]+.041),M.machined,'y',6);
}

function addBar(collect, isRear) {
  const axle = isRear ? 'rear' : 'front', scope = isRear ? rear : front, key = axle+'Bar';
  const path = isRear
    ? [[-1.385,.275,.575],[-1.310,.269,.550],[-1.115,.265,.441],[-1.088,.264,.352],[-1.080,.265,.22],[-1.192,.208,.13],[-1.197,.211,0]]
    : [[1.192,.297,.594],[1.246,.277,.550],[1.477,.266,.463],[1.518,.260,.372],[1.522,.238,.180],[1.524,.237,0]];
  const radius = isRear ? .0075 : .012;
  const bushX = isRear ? -1.088 : 1.518, bushY = isRear ? .264 : .260, bushZ=.352;
  const id='e34sys:'+axle+'-antiroll-bar';
  collect(id, (isRear?'Rear':'Front')+' anti-roll bar', g=>{
    tube(g,[...path,...path.slice(0,-1).reverse().map(p=>sidePoint(p,-1))],radius,M.dark,68);
    for(const side of [-1,1])ring(g,.017,.0055,.012,sidePoint(path[0],side),M.steel,'x',28);
  },{matrix:origin,systems:scope,keepBinding:true,...refs(key)});
  for(const [side,suffix,label] of [[-1,'1','Left'],[1,'-1','Right']]){
    const bottom=sidePoint(path[0],side);
    const top=isRear?sidePoint([-1.365,.363,.578],side):sidePoint([1.269,.474,.598],side);
    collect('e34sys:'+axle+'-drop-link-'+suffix,label+' '+axle+' anti-roll bar link',g=>{
      if(isRear) {
        for(const p of [top,bottom])bushing(g,p,'x',.017,.025);
        pin(g,bottom,top,.009,M.dark);
      } else {
        pin(g,bottom,top,.0055,M.steel);
        for(const p of [bottom,top]){
          cylinder(g,.017,.019,p,M.rubber,'x',24);
          cylinder(g,.006,.034,p,M.machined,'x',16);
          cylinder(g,.009,.008,[p[0]-.019,p[1],p[2]],M.machined,'x',6);
        }
      }
    },{matrix:origin,systems:scope,keepBinding:true,...refs(key)});
    collect('e34chassis:'+axle+'-bar-clamp-'+suffix,label+' '+axle+' anti-roll bar bush and clamp',g=>{
      const center=[bushX,bushY,side*bushZ];
      const r=radius+.010;
      ring(g,r,radius,.032,center,M.rubber,'z',36);
      lathe(g,[[r+.002,-.019],[r+.002,.019],[r,.019],[r,-.019],[r+.002,-.019]],M.steel,'z',24,
        Math.PI/2,Math.PI).position.fromArray(center);
      for(const x of [bushX-.023,bushX+.023]){
        box(g,[.021,.006,.041],[x,bushY+.007,center[2]],M.steel,.002);
        cylinder(g,.006,.010,[x,bushY+.009,center[2]],M.machined,'y',6);
      }
    },{matrix:origin,parentId:id,systems:scope,...refs(key)});
  }
}

export function addSuspension(collect) {
  collect('e34sys:front-subframe','Front axle support and engine carrier',g=>{
    loft(g,[
      [[1.24,.264,-.506],.139,.031],[[1.22,.267,-.447],.151,.036],
      [[1.225,.242,-.360],.113,.039],[[1.254,.209,-.218],.081,.031],
      [[1.288,.186,0],.078,.026],[[1.254,.209,.218],.081,.031],
      [[1.225,.242,.360],.113,.039],[[1.22,.267,.447],.151,.036],
      [[1.24,.264,.506],.139,.031],
    ],M.dark,{sides:20,wall:.003});
    for(const side of [-1,1]){
      const foot=engineMountFoot(side);
      loft(g,[[[1.36,.265,side*.38],.073,.027],[foot,.058,.012],[[1.101,.30,side*.382],.048,.012]],M.steel);
      ring(g,.036,.009,.007,foot,M.dark,'y',32);
      for(const x of [1.120,1.347]){
        cylinder(g,.020,.052,[x,.290,side*.467],M.dark,'y',28);
        cylinder(g,.009,.012,[x,.268,side*.467],M.machined,'y',6);
      }
      for(const x of [1.251,1.317])box(g,[.010,.051,.069],[x,.225,side*.238],M.steel,.003);
      box(g,[.083,.017,.084],[1.284,.200,side*.238],M.dark,.005);
      box(g,[.099,.036,.127],[1.170,.327,side*.470],M.dark,.008);
      box(g,[.067,.028,.087],[1.508,.284,side*.352],M.dark,.008);
      tube(g,[[1.369,.260,side*.491],[1.35,.237,side*.39],[1.323,.214,side*.26],[1.351,.189,0]],.003,M.seam,24);
    }
  },{matrix:origin,systems:systems(frontScope,bayScope),keepBinding:true,...refs('frontCarrier','31111139660')});
  collect('e34sys:rear-subframe','Rear axle carrier',buildE34RearCarrier,
    {matrix:origin,systems:rear,keepBinding:true,...refs('rearCarrier','33311090566')});
  for(const [side,suffix,label] of [[-1,'1','Left'],[1,'-1','Right']]){
    addFrontCorner(collect,side,suffix,label);
    addRearCorner(collect,side,suffix,label);
  }
  addBar(collect,false);
  addBar(collect,true);
}

function addFrontCorner(collect,side,suffix,label) {
  const p = point => sidePoint(point,side);
  const id = name => 'e34sys:front-'+name+'-'+suffix;
  const strut = id('strut'), tower=frontMount(side);
  const spindle=p([1.3805,.32375,.638]), top=tower;
  const outer1=p([1.433,.259,.620]), outer2=p([1.335,.250,.620]);
  const inner1=p([1.284,.227,.239]), inner2=p([.946,.280,.455]);
  const scope = {matrix:origin,systems:front};
  const axial = draw => g => along(g,spindle,top,draw);
  collect(strut,label+' front strut housing and steering knuckle',g=>{
    along(g,spindle,top,(f,l)=>{
      lathe(f,[[.019,0],[.033,0],[.034,.027],[.027,.045],[.027,l*.58],[.029,l*.60],[.029,l*.63],
        [.022,l*.63],[.022,.029],[.019,0]],M.dark,'y',40);
      dish(f,.104,l*.395);
      ring(f,.030,.022,.014,[0,l*.614,0],M.machined,'y',36);
    });
    loft(g,[[p([1.324,.267,.619]),.032,.025],[p([1.374,.305,.631]),.052,.045],
      [p([1.425,.273,.626]),.038,.024],[outer1,.021,.015]],M.dark,{sides:20});
    ring(g,.052,.024,.048,spindle,M.dark,'z',40);
    const stub=lathe(g,[[.026,0],[.031,.005],[.030,.024],[.025,.026],[.025,.081],[.018,.094],[.018,.104],[0,.104]],M.machined,'z',48);
    stub.position.fromArray(p([1.3805,.32375,.640]));
    if(side<0)stub.rotation.y=Math.PI;
    for(const point of [outer1,outer2])ring(g,.025,.007,.010,level(point,point[1]+.025),M.dark,'y',32);
    loft(g,[[p([1.375,.305,.636]),.028,.016],[p([1.360,.292,.640]),.016,.011]],M.dark);
    loft(g,[[p([1.346,.470,.614]),.023,.010],[p([1.269,.474,.598]),.017,.008]],M.dark);
    box(g,[.028,.021,.015],p([1.289,.445,.625]),M.steel,.003);
  },{...scope,keepBinding:true,...refs('frontStrut',side<0?'31311138487':'31311138488')});
  collect(id('damper'),label+' front damper insert and piston rod',axial((f,l)=>{
    cylinder(f,.0215,l*.52,[0,l*.286,0],M.steel,'y',32);
    cylinder(f,.010,l*.448,[0,l*.764,0],M.machined,'y',32);
    cylinder(f,.007,.029,[0,l+.007,0],M.machined,'y',24);
  }),{...scope,keepBinding:true,...refs('frontStrut')});
  collect(id('spring'),label+' front coil spring',axial((f,l)=>spring(f,l,.447,.860,.092,.0072,6)),
    {...scope,keepBinding:true,...refs('frontTop')});
  collect(id('spring-seat'),label+' front upper spring plate and pads',axial((f,l)=>{
    dish(f,.102,l*.895,-1,M.steel);
    for(const [y,flip] of [[l*.414,1],[l*.881,-1]])dish(f,.103,y,flip,M.rubber);
  }),{...scope,keepBinding:true,...refs('frontTop','31331128522','31331128524')});
  collect(id('top-mount'),label+' front guide support',axial((f,l)=>mount(f,l,.063)),
    {...scope,parentId:strut,...refs('frontTop','31331139437','31331139452')});
  collect(id('dust-boot'),label+' front protection tube and bump stop',axial((f,l)=>{
    boot(f,l*.626,l*.857,.028,.023);
    cylinder(f,.019,.038,[0,l*.866,0],M.rubber,'y',28);
  }),{...scope,parentId:strut,...refs('frontTop','31331134314')});
  collect(id('control-arm'),label+' front lower control arm',g=>{
    loft(g,[[inner1,.022,.020],[p([1.274,.222,.334]),.028,.017],
      [p([1.330,.224,.493]),.029,.014],[outer1,.023,.019]],M.alloy,{sides:16});
    tube(g,[p([1.279,.237,.274]),p([1.298,.241,.408]),p([1.362,.249,.55])],.005,M.alloy,16);
    bushing(g,inner1,'x',.025,.049);
    ballJoint(g,outer1);
    pin(g,p([1.243,inner1[1],.239]),p([1.325,inner1[1],.239]),.0055,M.machined);
  },{...scope,keepBinding:true,...refs('arms',side<0?'31121139987':'31121139988'),
    note:'Aluminium wishbone shown. The catalog also lists a steel version.'});
  collect(id('thrust-arm'),label+' front thrust arm',g=>{
    loft(g,[[inner2,.028,.021],[p([1.022,.263,.480]),.030,.016],
      [p([1.127,.235,.561]),.031,.015],[p([1.253,.233,.603]),.024,.014],[outer2,.023,.018]],M.steel,{sides:16});
    bushing(g,inner2,'z',.036,.058);
    ballJoint(g,outer2);
    pin(g,p([inner2[0],inner2[1],.413]),p([inner2[0],inner2[1],.497]),.0065,M.machined);
  },{...scope,keepBinding:true,...refs('arms',side<0?'31121141097':'31121141098')});
  collect(id('thrust-bracket'),label+' thrust arm chassis bracket',g=>{
    for(const z of [.416,.493])box(g,[.103,.063,.009],p([.946,.299,z]),M.dark,.007);
    box(g,[.132,.012,.112],p([.946,.332,.455]),M.steel,.005);
    for(const x of [.903,.987])cylinder(g,.008,.014,p([x,.335,.465]),M.machined,'y',6);
  },{...scope,parentId:'e34sys:front-subframe',...refs('arms',side<0?'31121131639':'31121131640')});
}

export function buildE34RearCarrier(g, includePivotBrackets = true) {
    loft(g,[
      [[-1.19,.29,-.604],.052,.039],[[-1.16,.283,-.505],.063,.037],
      [[-1.119,.267,-.362],.064,.032],[[-1.111,.27,-.203],.058,.034],
      [[-1.181,.359,-.120],.073,.040],[[-1.198,.393,0],.079,.035],
      [[-1.181,.359,.120],.073,.040],[[-1.111,.27,.203],.058,.034],
      [[-1.119,.267,.362],.064,.032],[[-1.16,.283,.505],.063,.037],
      [[-1.19,.29,.604],.052,.039],
    ],M.dark,{sides:20,wall:.003});
    for(const z of [-1,1]){
      loft(g,[[[-1.125,.295,z*.332],.045,.022],[[-1.278,.334,z*.299],.048,.028],
        [[-1.465,.395,z*.220],.039,.024],[[-1.490,.408,z*.113],.036,.020]],M.dark,{sides:16,wall:.003});
      if (includePivotBrackets) for(const pivot of rearPivots(z))pivotFrame(g,pivot,z,f=>{
        for(const offset of [-.027,.027])box(f,[.076,.009,.059],[0,offset,0],M.steel,.004);
        box(f,[.013,.064,.056],[-.029,0,0],M.dark,.004);
      });
      box(g,[.081,.021,.071],[-1.105,.287,z*.352],M.dark,.006);
    }
    loft(g,[[[-1.49,.408,-.21],.035,.020],[[-1.519,.403,0],.044,.022],[[-1.49,.408,.21],.035,.020]],M.dark);
    ring(g,.029,.013,.037,[-1.51,.399,0],M.steel,'x',32);
}

function addRearCorner(collect,side,suffix,label) {
  const p = point => sidePoint(point,side);
  const id = name => 'e34sys:rear-'+name+'-'+suffix;
  const scope={matrix:origin,systems:rear};
  const arm=id('trailing-arm'), damper=id('damper');
  const [inner,outer]=rearPivots(side);
  const hub=p([-1.3805,.32375,.642]), bottom=p([-1.444,.329,.598]), top=rearMount(side);
  const axial = draw => g => along(g,bottom,top,draw);
  collect(arm,label+' rear semi-trailing arm',g=>{
    for(const pivot of [inner,outer]){
      loft(g,[[pivot,.026,.023],[[-1.251,.267,(pivot===inner?.397:.551)*side],.038,.032],
        [p([-1.338,.282,.593]),.046,.036],[hub,.046,.045]],M.dark,{sides:18,wall:.003});
      pivotFrame(g,pivot,side,f=>{
        bushing(f,[0,0,0],'y',.025,.046);
        cylinder(f,.0055,.068,[0,0,0],M.machined,'y',20);
        cylinder(f,.009,.007,[0,.036,0],M.machined,'y',6);
      });
    }
    ring(g,.061,.037,.078,hub,M.dark,'z',48);
    ring(g,.044,.036,.015,p([-1.3805,.32375,.688]),M.machined,'z',40);
    loft(g,[[p([-1.374,.305,.625]),.037,.024],[bottom,.034,.022]],M.dark);
    for(const offset of [-.024,.024])box(g,[.049,.045,.010],[bottom[0],bottom[1],bottom[2]+offset],M.steel,.006);
    box(g,[.047,.016,.031],p([-1.365,.361,.579]),M.dark,.004);
    tube(g,[p([-1.116,.300,.331]),p([-1.271,.305,.415]),p([-1.334,.319,.553])],.004,M.seam,22);
  },{...scope,keepBinding:true,...refs('trailingArm',side<0?'33321132329':'33321132330')});
  collect(damper,label+' rear damper and lower spring perch',g=>{
    axial((f,l)=>{
      lathe(f,[[.011,.015],[.026,.022],[.028,.043],[.026,l*.59],[.030,l*.604],
        [.030,l*.636],[.011,l*.636],[.011,.015]],M.dark,'y',44);
      cylinder(f,.009,l*.43,[0,l*.79,0],M.machined,'y',30);
      dish(f,.086,l*.365);
    })(g);
    bushing(g,bottom,'z',.022,.042);
    pin(g,[bottom[0],bottom[1],bottom[2]-.035],[bottom[0],bottom[1],bottom[2]+.035],.0065);
  },{...scope,keepBinding:true,...refs('rearStrut')});
  collect(id('coil-spring'),label+' rear coil spring',axial((f,l)=>spring(f,l,.402,.897,.076,.0065,8)),
    {...scope,keepBinding:true,...refs('rearStrut','33531133339')});
  collect(id('spring-pads'),label+' rear spring pads and upper cup',axial((f,l)=>{
    dish(f,.085,l*.917,-1,M.steel);
    dish(f,.085,l*.908,-1,M.rubber);
    dish(f,.085,l*.379,1,M.rubber);
  }),{...scope,parentId:damper,...refs('rearStrut','33531133670','33531133671','33521136063')});
  collect(id('top-mount'),label+' rear guide support',axial((f,l)=>mount(f,l,.055)),
    {...scope,parentId:damper,...refs('rearStrut','33521132270')});
  collect(id('dust-tube'),label+' rear protection tube and bump stop',axial((f,l)=>{
    boot(f,l*.61,l*.88,.030,.025);
    cylinder(f,.019,.046,[0,l*.896,0],M.rubber,'y',28);
  }),{...scope,parentId:damper,...refs('rearStrut','31331134314')});
  const center=p([-1.19,.313,.604]);
  collect(id('carrier-mount'),label+' rear carrier rubber mounting and thrust plate',g=>{
    ring(g,.049,.039,.070,center,M.steel,'y',40);
    ring(g,.040,.011,.079,center,M.rubber,'y',40);
    ring(g,.012,.006,.087,center,M.machined,'y',32);
    loft(g,[[p([-1.07,.258,.678]),.031,.009],[p([-1.15,.264,.645]),.043,.011],
      [p([-1.205,.265,.594]),.040,.010]],M.steel);
    cylinder(g,.013,.011,level(center,.258),M.machined,'y',6);
    box(g,[.126,.027,.113],p([-1.19,.364,.605]),M.dark,.009);
  },{...scope,parentId:'e34sys:rear-subframe',...refs('rearCarrier','33311128670')});
  collect(id('pitman-link'),label+' rear trailing arm link',g=>{
    const a=p([-1.242,.256,.404]),b=p([-1.165,.255,.390]);
    for(const q of [a,b])bushing(g,q,'y',.019,.018);
    pin(g,a,b,.010,M.steel);
    cylinder(g,.006,.038,a,M.machined,'y',12);
    cylinder(g,.006,.038,b,M.machined,'y',12);
    box(g,[.045,.014,.045],p([-1.165,.273,.390]),M.steel,.004);
  },{...scope,parentId:arm,...refs('trailingArm','33321125665','33321126476')});
}
