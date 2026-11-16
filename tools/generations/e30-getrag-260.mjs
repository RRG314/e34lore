import {ExtrudeGeometry, Mesh, MeshStandardMaterial, Path, Shape} from 'three';
import {black, brass, rubber, steel, xAxis, yAxis, zAxis, block, cylinder, ring, rod, curvedTube} from './e30-325i-geometry.mjs';
import {bead, lerp, patch} from './e30-exterior-surfaces.mjs';

const cast = new MeshStandardMaterial({color:0x777e7b, metalness:.44, roughness:.71});
const machined = new MeshStandardMaterial({color:0xa5a9a8, metalness:.66, roughness:.36});
const friction = new MeshStandardMaterial({color:0x5f5144, metalness:.09, roughness:.86});
const TAU = Math.PI * 2;
const pitch = .128;
const layY = -.088;
const housing = 'housing_attaching_parts_getrag_260_5_50';
const gearset = 'gear_wheel_set_single_part_getrag_260_5_50';
const selector = 'inner_gear_shift_parts_getrag_260_5_50';
const linkage = 'gearshift_mechanical_transmission';
const point = (x, y, z, angle, radius) => [x,y + Math.cos(angle) * radius,z + Math.sin(angle) * radius];
const signedPower = (value, power) => Math.sign(value) * Math.abs(value) ** power;

// Each ring describes an axial section through the casting. The lower bulge
// encloses the countershaft. Flat mating faces share the same perimeter.
const mainProfile = [
  [.161,-.036,.117,.142,.71], [.176,-.036,.115,.139,.72],
  [.229,-.034,.104,.129,.71], [.355,-.036,.103,.133,.69],
  [.468,-.025,.115,.137,.72], [.527,-.011,.134,.144,.78],
  [.583, .004,.153,.158,.94], [.633, .010,.164,.170,.97],
  [.691, .012,.172,.179,.97], [.710, .012,.174,.179,.97],
];
const tailProfile = [
  [.009, .001,.051,.052,.94], [.025,-.009,.061,.069,.88],
  [.048,-.034,.095,.125,.77], [.070,-.039,.106,.133,.73],
  [.118,-.037,.111,.138,.70],
  [.148,-.036,.112,.137,.72], [.161,-.036,.117,.142,.71],
];
function outline(section, angle, offset = 0) {
  const [x,y,halfZ,halfY,power] = section;
  return [x,y + (halfY + offset) * signedPower(Math.cos(angle),power),
    (halfZ + offset) * signedPower(Math.sin(angle),power)];
}

function casting(group, profile, thickness) {
  const sectionAt = u => {
    const index = Math.min(profile.length-2,Math.floor(u*(profile.length-1)));
    const t = u * (profile.length-1) - index;
    return profile[index].map((v,i) => lerp(v,profile[index+1][i],t));
  };
  patch(group,cast,(u,v) => outline(sectionAt(u),-TAU*v),(profile.length-1)*4,72);
  patch(group,cast,(u,v) => outline(sectionAt(u),TAU*v,-thickness),(profile.length-1)*4,72);
  for (const end of [0,1]) {
    const p = profile[end ? profile.length-1 : 0];
    patch(group,machined,(u,v) => outline(p,TAU*v,-thickness*(end ? 1-u : u)),6,72);
  }
}

function castBand(group, section, width, rise) {
  const crown = u => Math.min(1,u*5,(1-u)*5);
  patch(group,cast,(u,v) => {
    const [x,y,z] = outline(section,-v*TAU,rise*crown(u));
    return [x + (u-.5)*width,y,z];
  },10,64);
}

function bearingWeb(group, section, openings) {
  const flange = new Shape();
  for (let i=0;i<=64;i++) {
    const [,y,z] = outline(section,i*TAU/64,-.007);
    if (i === 0) flange.moveTo(-z,y);
    else flange.lineTo(-z,y);
  }
  flange.closePath();
  for (const [y,radius] of openings) {
    const hole = new Path();
    hole.absarc(0,y,radius,0,TAU,true);
    flange.holes.push(hole);
  }
  const geometry = new ExtrudeGeometry(flange,{depth:.011,bevelEnabled:false,curveSegments:24});
  geometry.rotateY(Math.PI/2);
  geometry.translate(section[0]-.005,0,0);
  group.add(new Mesh(geometry,cast));
}

// Close the two faces and bore of every gear. The tooth lead follows the
// shaft axis. Tooth counts describe appearance, not service dimensions.
function toothedWheel(group, outer, bore, width, teeth, lead = 0, material = machined) {
  const segments = teeth*8;
  const roots = [.87,.87,.91,.99,1,.99,.91,.87];
  const radius = t => {
    const step = t * segments, index = Math.floor(step);
    return outer * lerp(roots[index%8],roots[(index+1)%8],step-index);
  };
  const flank = (u,v) => {
    const bevel = .0021 * (1-Math.min(1,Math.min(u,1-u)*11));
    return point(width*(u-.5),0,0,-TAU*v+lead*(u-.5),radius(v)-bevel);
  };
  patch(group,material,flank,5,segments);
  patch(group,steel,(u,v) => point(width*(u-.5),0,0,TAU*v,bore),2,48);
  for (const end of [0,1]) {
    patch(group,material,(u,v) => {
      const t = end ? 1-v : v;
      const [x,y,z] = flank(end,t);
      const factor = lerp(bore / Math.hypot(y,z),1,u);
      return [x,y*factor,z*factor];
    },2,segments);
  }
}

function fastener(group, x, y, z, radius=.010) {
  cylinder(group,radius*1.24,.003,xAxis,machined,[x-.004,y,z],radius*1.24,16);
  cylinder(group,radius,.008,xAxis,steel,[x,y,z],radius,6);
}

function shaft(group, sections) {
  for (const [start,end,radius,material = steel] of sections) {
    cylinder(group,radius,end-start,xAxis,material,[(start+end)/2,0,0],radius,32);
  }
}

function bearing(group, outer, inner, depth, balls=12) {
  const race = (outer-inner) * .24;
  ring(group,outer,outer-race,depth,xAxis,machined);
  ring(group,inner+race,inner,depth,xAxis,machined);
  for (let i=0;i<balls;i++) {
    const location = point(0,0,0,i*TAU/balls,(outer+inner)/2);
    cylinder(group,race*1.06,depth*.64,xAxis,steel,location,race*1.06,12);
  }
}

export function buildE30Getrag(add, scope) {
  const box = scope('gearbox','Getrag 260 five-speed',['transmission','manual-gearbox']);
  const put = (id,name,[x,y,z],spread,draw,{page=housing,row,internal=false,section=false,hideInCutaway=false}={}) => {
    const c=Math.cos(pitch), s=Math.sin(pitch);
    add(box,id,name,[.148+c*x-s*y,.355+s*x+c*y,z],spread,group => {
      draw(group);
      group.rotation.z = pitch;
    },{page,row,internal,gearbox:{section,spread,...(hideInCutaway ? {hideInCutaway:true} : {})},getrag:true});
  };

  put('main-case','Main casting with integral clutch bell',[0,0,0],[0,.47,-.05],group => {
    casting(group,mainProfile,.009);
    for (const section of [
      mainProfile[0], mainProfile[2], [.288,-.035,.105,.131,.70],
      mainProfile[3], [.411,-.030,.110,.135,.70], mainProfile[4], mainProfile[8],
    ]) castBand(group,section,.015,.007);
    castBand(group,mainProfile[9],.016,.012);
    for (const angle of [-2.42,-1.60,-.91,-.38,.38,.91,1.60,2.42]) {
      curvedTube(group,mainProfile.slice(1,6).map(section => outline(section,angle,.003)),.0058,cast,25);
    }
    bearingWeb(group,[.491,-.018,.117,.140,.76],[[0,.041],[layY,.030]]);
    ring(group,.055,.041,.027,xAxis,cast,[.485,0,0]);
    for (const angle of [-2.65,-1.7,-.8,.8,1.7,2.65]) {
      const start = point(.509,0,0,angle,.048);
      const finish = outline(mainProfile[6],angle,-.013);
      rod(group,start,finish,.005,cast);
    }
    ring(group,.041,.029,.018,xAxis,cast,[.475,layY,0]);
    for (const angle of [-2.64,-1.90,-.91,-.23,.30,.93,1.9,2.64]) {
      const [,y,z] = outline(mainProfile[8],angle,-.002);
      cylinder(group,.016,.031,xAxis,cast,[.697,y,z],.014,20);
      fastener(group,.716,y,z,.008);
    }
    rod(group,[.505,-.043,-.087],[.604,-.050,-.130],.014,cast);
  },{row:'23111222658',section:true});
  put('tail-case','Rear cover and output-bearing carrier',[0,0,0],[-.35,.34,-.07],group => {
    casting(group,tailProfile,.008);
    castBand(group,tailProfile.at(-1),.019,.010);
    for (const angle of [-2.61,-1.89,-1.15,-.42,.43,1.15,1.89,2.61]) {
      const [,y,z] = outline(tailProfile.at(-1),angle,0);
      curvedTube(group,tailProfile.slice(0,-1).map(section => outline(section,angle,.004)),.0055,cast,22);
      cylinder(group,.014,.029,xAxis,cast,[.152,y,z],.012,16);
      fastener(group,.140,y,z,.007);
    }
    bearingWeb(group,tailProfile[2],[[0,.036],[layY,.026]]);
    ring(group,.048,.029,.019,xAxis,machined,[.010,0,0]);
    ring(group,.036,.025,.007,xAxis,rubber,[-.001,0,0]);
    block(group,[.081,.024,.14],cast,[.059,-.105,0],.008);
    for(const z of [-.053,.053])cylinder(group,.011,.010,yAxis,steel,[.059,-.119,z],.011,6);
  },{row:'23111228020',section:true});

  put('filler-plug','Side oil filler plug',[.335,-.004,.107],[.13,.21,.32],group => {
    cylinder(group,.021,.013,zAxis,cast,[0,0,0],.018,20);
    cylinder(group,.013,.009,zAxis,steel,[0,0,.010],.013,6);
  },{row:'23117527440',hideInCutaway:true});
  put('drain-plug','Gearbox drain plug',[.200,-.175,0],[.04,-.30,0],group => {
    cylinder(group,.020,.012,yAxis,cast,[0,0,0],.019,20);
    cylinder(group,.013,.009,yAxis,steel,[0,-.009,0],.013,6);
  },{row:'23117546876'});
  put('breather','Capped gearbox breather',[.289,.097,-.038],[-.11,.41,-.27],group => {
    cylinder(group,.008,.022,yAxis,steel,[0,0,0],.008,12);
    cylinder(group,.013,.010,yAxis,machined,[0,.011,0],.010,20);
  },{row:'23131204841'});
  put('reverse-light-switch','Reverse-light switch and terminals',[.245,.023,.115],[-.13,.17,.36],group => {
    cylinder(group,.014,.020,zAxis,machined,[0,0,0],.014,6);
    block(group,[.023,.021,.021],black,[0,0,.020],.004);
    for(const y of [-.006,.006]) rod(group,[0,y,.026],[.006,y,.040],.0028,brass);
  },{row:'23141354071',hideInCutaway:true});

  put('flywheel','Flywheel and starter ring',[.731,0,0],[.48,.33,0],group => {
    toothedWheel(group,.146,.122,.023,98,0,steel);
    ring(group,.127,.024,.031,xAxis,machined);
    ring(group,.110,.052,.007,xAxis,steel,[-.018,0,0]);
    for(let i=0;i<8;i++) fastener(group,.020,.039*Math.cos(i*TAU/8),.039*Math.sin(i*TAU/8),.006);
  },{page:'flywheel_twin_mass_flywheel'});
  put('clutch-disc','Clutch friction disc and sprung hub',[.704,0,0],[.37,.16,-.29],group => {
    ring(group,.114,.072,.011,xAxis,friction);
    ring(group,.079,.017,.015,xAxis,steel);
    ring(group,.039,.014,.028,xAxis,machined);
    for(let i=0;i<8;i++) {
      const a=i*TAU/8;
      cylinder(group,.0028,.016,xAxis,brass,point(0,0,0,a,.094),.0028,10);
    }
    for(let i=0;i<4;i++) {
      const a=i*TAU/4;
      const [x,y,z] = point(0,0,0,a,.053);
      const helix = Array.from({length:41},(_,step)=>{
        const t=step/40, turn=TAU*5*t;
        const radial=.006*Math.sin(turn), tangential=.027*(t-.5);
        return [x+.006*Math.cos(turn),y+radial*Math.cos(a)-tangential*Math.sin(a),
          z+radial*Math.sin(a)+tangential*Math.cos(a)];
      });
      curvedTube(group,helix,.0015,machined,42);
    }
  },{page:'gearshift_clutch',row:'21211223097'});
  put('pressure-plate','Clutch pressure plate and diaphragm fingers',[.680,0,0],[.31,.12,.30],group => {
    ring(group,.130,.086,.035,xAxis,cast);
    ring(group,.113,.077,.011,xAxis,machined,[.017,0,0]);
    for(let i=0;i<18;i++) {
      const a=i*TAU/18;
      const finger = block(group,[.009,.072,.013],steel,point(-.015,0,0,a,.056),.002);
      finger.rotation.x=a;
    }
    for(let i=0;i<6;i++) fastener(group,-.019,.122*Math.cos(i*TAU/6),.122*Math.sin(i*TAU/6),.006);
  },{page:'gearshift_clutch',row:'21211223026'});
  put('guide-sleeve','Input shaft seal cover and release bearing guide',[.520,0,0],[.21,.06,-.35],group => {
    ring(group,.025,.017,.121,xAxis,machined,[.047,0,0]);
    ring(group,.049,.020,.012,xAxis,cast,[-.007,0,0]);
    ring(group,.026,.017,.007,xAxis,rubber,[-.014,0,0]);
    for (let i=0;i<6;i++) {
      const [,y,z]=point(0,0,0,i*TAU/6,.041);
      fastener(group,.001,y,z,.005);
    }
  },{row:'23111228228',internal:true});
  put('release-bearing','Clutch release bearing',[.600,0,0],[.25,.18,-.40],group => {
    bearing(group,.042,.025,.025);
    for (const z of [-.037,.037]) block(group,[.022,.019,.021],black,[.002,0,z],.004);
  },{page:'gearshift_clutch',row:'21517521471',internal:true});
  put('release-fork','Clutch release fork',[.603,-.004,0],[.26,-.22,-.42],group => {
    for(const sign of [-1,1]) curvedTube(group,[[0,-.025,-.102],[0,sign*.030,-.054],[0,sign*.044,0],[0,sign*.031,.060],[0,-.013,.120]],.0075,steel,24);
    block(group,[.018,.030,.042],steel,[0,-.018,.107],.005);
  },{page:'gearshift_clutch',row:'21511204229',internal:true});
  put('slave-cylinder','Clutch slave cylinder and bleeder',[.545,-.044,-.124],[.26,-.17,-.41],group => {
    cylinder(group,.023,.077,xAxis,cast,[0,0,0],.022,24);
    block(group,[.014,.058,.043],cast,[.021,0,0],.009);
    cylinder(group,.015,.029,xAxis,rubber,[.048,0,0]);
    cylinder(group,.007,.043,xAxis,steel,[.072,0,0]);
    cylinder(group,.007,.016,yAxis,machined,[-.026,.023,0],.006,6);
  },{page:'clutch_control',row:'21521157212'});

  put('input-shaft','Input shaft and fourth-gear drive',[.462,0,0],[.38,.13,.18],group => {
    shaft(group,[[-.006,.041,.024],[.041,.124,.017],[.124,.237,.013],[.237,.276,.008,machined]]);
    for(let i=0;i<20;i++) rod(group,point(.114,0,0,i*TAU/20,.013),point(.212,0,0,i*TAU/20,.013),.0015,machined);
    toothedWheel(group,.045,.023,.029,28,.081);
  },{page:gearset,row:'23211228286',internal:true});
  put('mainshaft','Output shaft',[.216,0,0],[-.11,.14,.24],group => {
    shaft(group,[[-.229,-.192,.014],[-.192,-.134,.019],[-.134,-.024,.022],
      [-.024,.070,.024],[.070,.162,.022],[.162,.236,.018],[.236,.251,.011,machined]]);
  },{page:gearset,row:'23211228297',internal:true});
  put('countershaft','Countershaft',[.226,layY,0],[-.10,-.27,-.22],group => {
    shaft(group,[[-.180,-.141,.017],[-.141,.171,.019],[.171,.238,.018],[.238,.254,.014,machined]]);
  },{page:gearset,row:'23211224452',internal:true});

  const gears = [
    ['drive','Input drive',.462,.045,.049,28,null],
    ['third','Third gear',.367,.052,.043,32,'23221228017'],
    ['second','Second gear',.317,.061,.034,36,'23221228018'],
    ['first','First gear',.232,.067,.028,40,'23221228157'],
    ['reverse','Reverse gear',.169,.051,.031,31,'23221228159'],
    ['fifth','Fifth gear',.074,.038,.057,24,'23221224253'],
  ];
  for(const [id,name,x,upper,lower,teeth,oem] of gears) {
    const reverse = id==='reverse', lead = reverse ? 0 : .093;
    if(id!=='drive') put('mainshaft-gear-'+id,name+' on output shaft',[x,0,0],
      [(x-.24)*1.8,.22,.43],group => {
        toothedWheel(group,upper,.022,.025,teeth,lead);
        ring(group,upper*.69,.023,.009,xAxis,steel,[-.014,0,0]);
      },{page:gearset,row:oem,internal:true});
    if(!reverse) put('countershaft-gear-'+id,name+' countershaft gear',[x,layY,0],
      [(x-.24)*1.7,-.27,-.43],group => {
        toothedWheel(group,lower,.018,.024,Math.round(teeth*lower/upper),-lead);
        ring(group,lower*.77,.018,.008,xAxis,steel,[.013,0,0]);
      },{page:gearset,internal:true});
  }
  put('reverse-idler','Reverse idler and its offset shaft',[.169,-.057,-.066],[-.21,-.05,-.55],group => {
    shaft(group,[[-.037,.039,.010]]);
    toothedWheel(group,.033,.010,.025,19);
    ring(group,.018,.010,.007,xAxis,steel,[-.017,0,0]);
  },{page:gearset,row:'23221282391',internal:true});
  put('reverse-countershaft','Reverse countershaft drive gear',[.169,layY,0],[-.14,-.22,-.43],group => {
    toothedWheel(group,.033,.018,.025,20);
  },{page:gearset,internal:true});

  for(const [index,[label,x,radius,slider,shiftRod]] of [
    ['Third and fourth',.412,.049,'23231224490','23311224196'],
    ['First and second',.273,.058,'23231228223','23311228229'],
    ['Fifth and reverse',.120,.046,'23231228224','23311224197'],
  ].entries()) {
    const offset=(x-.255)*1.8;
    put('synchronizer-'+(index+1),label+' synchronizer rings',[x,0,0],[offset,.31,.61],group => {
      for(const end of [-1,1]) {
        ring(group,radius*.88,.026,.008,xAxis,brass,[end*.019,0,0]);
        for(let i=0;i<18;i++) {
          const a=i*TAU/18;
          const tooth=block(group,[.008,.005,.004],brass,point(end*.022,0,0,a,radius*.89),.001);
          tooth.rotation.x=a;
        }
      }
    },{page:gearset,internal:true});
    put('selector-sleeve-'+(index+1),label+' sliding sleeve',[x,0,0],[offset,.09,.51],group => {
      ring(group,radius,.027,.023,xAxis,steel);
      for(const end of [-1,1]) ring(group,radius+.003,.026,.005,xAxis,machined,[end*.010,0,0]);
    },{page:gearset,row:slider,internal:true});
    put('selector-fork-'+(index+1),label+' selector fork and rail',[x,.080,(index-1)*.027],
      [offset,.58,.10+index*.11],group => {
        const z=(1-index)*.027;
        bead(group,cast,t => point(0,-.080,z,lerp(-2.10,2.10,t),radius+.006),.0065,44);
        rod(group,[0,-.024,z],[0,0,0],.008,cast);
        rod(group,[-.082,0,0],[.073,0,0],.005,steel);
        cylinder(group,.011,.016,xAxis,cast,[0,0,0],.011,20);
      },{page:selector,row:shiftRod,internal:true});
  }

  put('front-main-bearing','Front shaft ball bearing',[.493,0,0],[.30,.28,.31],group => bearing(group,.046,.023,.020),
    {page:gearset,row:'23121224164',internal:true});
  put('rear-main-bearing','Rear output shaft ball bearing',[.045,0,0],[-.34,.24,.31],group => bearing(group,.040,.018,.020),
    {page:gearset,row:'23121224166',internal:true});
  put('countershaft-bearing','Countershaft roller bearing',[.081,layY,0],[-.32,-.32,-.26],group => bearing(group,.034,.017,.022,13),
    {page:gearset,row:'23121224076',internal:true});
  put('output-flange','Three-arm output flange, 78 mm bolt circle',[-.020,0,0],[-.47,.06,.18],group => {
    ring(group,.029,.015,.030,xAxis,steel,[.008,0,0]);
    ring(group,.030,.019,.014,xAxis,machined,[-.014,0,0]);
    for(let i=0;i<3;i++) {
      const a=i*TAU/3;
      const arm=block(group,[.014,.031,.022],steel,point(-.014,0,0,a,.026),.005);
      arm.rotation.x=a;
      ring(group,.013,.0057,.016,xAxis,machined,point(-.014,0,0,a,.039));
    }
  },{page:gearset,row:'23211228298'});
  put('shift-carrier','Cast shift arm and rear bushing',[.042,.109,0],[-.36,.52,.13],group => {
    for(const z of [-.018,.018]) curvedTube(group,[[.083,-.020,z],[.054,0,z],[-.006,.014,z],[-.046,.033,z]],.008,cast,22);
    ring(group,.029,.019,.024,yAxis,cast,[-.049,.033,0]);
    ring(group,.020,.010,.026,yAxis,rubber,[-.049,.033,0]);
    cylinder(group,.012,.046,zAxis,machined,[.084,-.021,0]);
  },{page:linkage,row:'25111221201'});
  put('selector-rod','External selector rod and joint',[.025,.079,0],[-.32,.23,-.28],group => {
    curvedTube(group,[[.116,-.016,0],[.061,-.013,0],[-.010,-.012,.005],[-.049,.031,.010]],.0065,steel,22);
    ring(group,.014,.006,.020,zAxis,machined,[-.049,.031,.010]);
    ring(group,.014,.007,.029,xAxis,steel,[.109,-.016,0]);
  },{page:linkage});
}
