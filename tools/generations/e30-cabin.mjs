import { BoxGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, Mesh, MeshStandardMaterial, Shape, TorusGeometry, Vector3 } from 'three';
import {bead,lerp,patch,smooth} from './e30-exterior-surfaces.mjs';
import {pillarPoint,roofPoint} from './e30-325i-exterior.mjs';
import {comfortCushion,comfortBackrest,headrestShell,rearCushion,rearBackrest,gearBoot} from './e30-cabin-surfaces.mjs';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const material = (color, roughness = .86, metalness = 0) => new MeshStandardMaterial({color, roughness, metalness,side:DoubleSide});
const vinyl = material(0x292c2e,.78);
const plastic = material(0x202224);
const black = material(0x111314);
const carpet = material(0x333235, .99);
const leather = material(0x343338, .59);
const leatherInsert = material(0x3a383d, .64);
const trimLeather = leather.clone();
leather.name = leatherInsert.name = 'E30_Seat_Upholstery';
trimLeather.name = 'E30_Cabin_Trim';
const seam = material(0x242326,.78);
const headlining = material(0x9e9991, .97);
const visorCloth = material(0x62605d, .94);
const steel = material(0x787a79, .46, .44);
const webbing = material(0x292929, .98);
const red = material(0x9b2722);
const ink = material(0xdddcd0);
const display = material(0x73684e, .45);
const mirror = material(0x859091, .19, .6);
const wheelLeather = material(0x222426,.47);
const redMark=material(0xb52d1a,.65);
const blueMark=material(0x45778f,.62);
const glass=material(0x818d90,.18,.10);
glass.transparent=true;
glass.opacity=.11;
glass.depthWrite=false;

function mesh(group, geometry, surface, [x,y,z]) {
  const object = new Mesh(geometry, surface);
  object.position.set(x,y,z);
  group.add(object);
  return object;
}

function box(group, size, surface, position, radius = 0) {
  const geometry = radius
    ? new RoundedBoxGeometry(...size, 1, Math.min(radius, ...size.map(d => d * .45)))
    : new BoxGeometry(...size);
  return mesh(group, geometry, surface, position);
}

function drum(group, top, bottom, depth, surface, position, faceDriver = false, sides = 24) {
  const object = mesh(group, new CylinderGeometry(top,bottom,depth,sides), surface, position);
  if (faceDriver) object.rotation.z = Math.PI / 2;
  return object;
}

// A beveled cross-section in the X/Y plane, extruded across the car.
function section(group, points, width, surface, [x,y,z] = [0,0,0], bevel = .004) {
  const outline = new Shape();
  outline.moveTo(...points[0]);
  for (const point of points.slice(1)) outline.lineTo(...point);
  outline.closePath();
  const geometry = new ExtrudeGeometry(outline, {
    depth:width, bevelEnabled:bevel > 0, bevelThickness:bevel, bevelSize:bevel, bevelSegments:2,
  });
  return mesh(group, geometry, surface, [x,y,z-width/2]);
}

function bar(group, from, to, depth, width, surface, radius = 0) {
  const delta = new Vector3(...to).sub(new Vector3(...from));
  const midpoint = from.map((value,i)=>(value+to[i])/2);
  const part = box(group,[depth,delta.length(),width],surface,midpoint,radius);
  part.quaternion.setFromUnitVectors(new Vector3(0,1,0),delta.normalize());
}

function vent(group, width, height, position) {
  const [x,y,z] = position;
  box(group,[.019,height,width],vinyl,position,.006);
  box(group,[.011,height*.77,width*.91],black,[x-.011,y,z],.003);
  for (const step of [-2,-1,0,1,2])
    box(group,[.012,.002,width*.85],plastic,[x-.016,y+step*height*.126,z]);
  box(group,[.009,height*.29,.009],vinyl,[x-.021,y,z+.21*width],.001);
}

function sevenSegment(group,value,x,y,z,scale,surface=ink) {
  const glyphs=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
  const lines={
    a:[.73,0,1.5,.19],b:[.34,.71,.19,1.07],c:[-.37,.71,.19,1.07],
    d:[-.75,0,1.5,.19],e:[-.37,-.71,.19,1.07],f:[.34,-.71,.19,1.07],g:[0,0,1.43,.18],
  };
  const digits=String(value).split('');
  for(const [index,digit] of digits.entries()){
    const place=z+(index-(digits.length-1)/2)*2.05*scale;
    for(const line of glyphs[Number(digit)]){
      const [dy,dz,w,h]=lines[line];
      box(group,[.00065,h*scale,w*scale],surface,[x,y+dy*scale,place+dz*scale]);
    }
  }
}

function dashboardTop(group) {
  patch(group,vinyl,(u,v)=>{
    const z=(2*u-1)*.681;
    const roundedCorner=.021*Math.abs(2*u-1)**8;
    const x=lerp(-.139,.208,v)+roundedCorner*(1-v)**3;
    const roll=.043*smooth(v/.36);
    const tray=smooth((x-.008)/.034)*smooth((.172-x)/.025)
      *smooth((z-.150)/.040)*smooth((.582-z)/.040);
    const y=.015+roll-.014*smooth((v-.62)/.38)-roundedCorner*.42-.024*tray;
    return [x,y,z];
  },55,30);
  const hood=(u,v)=>{
    const z=(2*u-1)*.235-.371;
    const crown=Math.sin(Math.PI*u)**.63;
    const x=lerp(-.154,.129,v)+.030*Math.abs(2*u-1)**3*(1-v);
    const y=.018+.102*crown*(1-.62*v**3)+.016*Math.sin(Math.PI*v)*crown;
    return [x,y,z];
  };
  patch(group,vinyl,hood,50,22);
  patch(group,plastic,(u,v)=>{
    const [x,y,z]=hood(u,0);
    return [x+.022*v,y-.011*v,z];
  },50,6);
  // Shallow tray above the glove box and rear-facing defroster slots.
  box(group,[.124,.005,.333],plastic,[.107,.061,.359],.002);
  for(const z of [-.39,.39]){
    box(group,[.069,.006,.31],vinyl,[.154,.051,z],.002);
    for(let i=-8;i<=8;i++)box(group,[.052,.002,.006],black,[.154,.055,z+i*.016]);
  }
}

function airbagPad(group) {
  const shape=new Shape();
  shape.moveTo(-.105,.058);
  shape.bezierCurveTo(-.083,.086,.082,.086,.105,.058);
  shape.bezierCurveTo(.103,.016,.092,-.026,.107,-.076);
  shape.lineTo(.080,-.097);
  shape.bezierCurveTo(.035,-.069,-.030,-.069,-.080,-.097);
  shape.lineTo(-.107,-.076);
  shape.bezierCurveTo(-.092,-.025,-.102,.019,-.105,.058);
  const geometry=new ExtrudeGeometry(shape,{depth:.031,bevelEnabled:true,bevelSize:.013,bevelThickness:.011,bevelSegments:4,curveSegments:20});
  geometry.rotateY(-Math.PI/2);
  mesh(group,geometry,plastic,[.007,0,0]);
  for(const sign of [-1,1]){
    bar(group,[.010,.047,sign*.092],[.003,.054,sign*.166],.031,.050,wheelLeather,.013);
    bar(group,[.007,-.068,sign*.089],[.002,-.121,sign*.121],.033,.056,wheelLeather,.012);
  }
  patch(group,wheelLeather,(u,v)=>{
    const z=(2*u-1)*.094, curvature=1-(2*u-1)**4;
    return [-.042-.008*Math.sin(Math.PI*v)*curvature,.023+.036*v+.007*curvature,z];
  },40,16);
  for (const sign of [-1,1]) for(let row=0;row<3;row++) {
    for(let column=0;column<5;column++) {
      const z=sign*(.061+.005*column),y=.032+.005*row;
      drum(group,.0011,.0014,.002,vinyl,[-.051,y,z],true,8);
    }
  }
  drum(group,.022,.022,.004,vinyl,[-.036,-.019,0],true,40);
  drum(group,.016,.016,.003,black,[-.039,-.019,0],true,40);
}

function gauge(group, radius, y, z, ticks, major, labels=[]) {
  drum(group,radius,radius,.008,vinyl,[-.012,y,z],true);
  drum(group,radius*.93,radius*.93,.006,black,[-.017,y,z],true);
  for (let i=0; i<=ticks; i++) {
    const angle = -.67*Math.PI + 1.34*Math.PI*i/ticks;
    const long = i%major===0;
    const r = radius*(long?.78:.82);
    const tick = box(group,[.001,radius*(long?.16:.08),.0012],ink,[-.021,y+Math.cos(angle)*r,z+Math.sin(angle)*r]);
    tick.rotation.x = angle;
  }
  for(const [index,label] of labels.entries()){
    const a=-.67*Math.PI+1.34*Math.PI*index/(labels.length-1);
    sevenSegment(group,label,-.022,y+Math.cos(a)*radius*.57,z+Math.sin(a)*radius*.57,.0018);
  }
  const needle = box(group,[.002,.68*radius,.0019],ink,[-.023,y-.21*radius,z-.23*radius]);
  needle.rotation.x = -2.35;
  drum(group,.13*radius,.13*radius,.003,plastic,[-.025,y,z],true,12);
}

// Fixed liner and the sliding insert share the stamped roof's parameters.
export const roofAperture = [.424,.828,.151,.849];
export const linerBounds = [.018,.984,.029,.971];

export function cabinLiner(u,v) {
  const [x,y,z]=roofPoint(u,v);
  return [x,y-.026-.003*Math.abs(2*v-1)**4,z];
}

function linerAt(x,z) {
  let u=.5,v=.5;
  for(let i=0;i<5;i++){
    v=.5+z/(2*roofPoint(u,1)[2]);
    u=(x-roofPoint(0,v)[0])/(roofPoint(1,v)[0]-roofPoint(0,v)[0]);
  }
  return cabinLiner(u,v);
}

export const roofGrabHandles = [
  {key:'assist-handle',label:'Front passenger roof grab handle',x:.040,side:1},
  {key:'assist-handle-rear-left',label:'Left rear roof grab handle',x:-.760,side:-1},
  {key:'assist-handle-rear-right',label:'Right rear roof grab handle',x:-.760,side:1},
];

export function buildE30Cabin(add, scope) {
  const cabin = scope('cabin','Cabin controls and seats',['interior']);
  const cockpit = scope('cockpit','Dashboard and controls',['interior'],cabin);
  const frontSeats = scope('front-seats','Front seats and belts',['interior'],cabin);
  const rearSeats = scope('rear-seats','Rear seats and side trim',['interior'],cabin);
  const overhead = scope('headlining','Headlining and sunroof',['interior'],cabin);
  const floor = scope('cabin-floor','Carpet and console',['interior'],cabin);
  const part = (parent,id,name,page,position,direction,draw) =>
    add(parent,id,name,position,direction,draw,{page,cabin:true});

  part(cabin,'dashboard','Dashboard shell and instrument hood','trim_panel_dashboard',[.63,.822,0],[.24,.87,0],g=>{
    section(g,[[-.127,-.102],[-.127,-.024],[-.117,.018],[.051,.018],[.205,.021],[.202,-.049],[.071,-.10]],1.32,vinyl);
    dashboardTop(g);
  });
  part(cockpit,'cluster','Instrument cluster','instruments',[.482,.861,-.371],[.01,.62,-.34],g=>{
    patch(g,plastic,(u,v)=>{
      const z=(2*u-1)*(.214-.039*v*v),y=lerp(-.078,.093,v)-.024*Math.abs(2*u-1)**5*v;
      return [-.012,y,z];
    },40,18);
    gauge(g,.066,.013,-.073,28,4,[0,20,40,60,80,100,120,140]);
    gauge(g,.066,.013,.073,28,4,[0,1,2,3,4,5,6,7]);
    gauge(g,.031,-.012,-.171,8,4);
    gauge(g,.031,-.012,.171,8,4);
    box(g,[.001,.006,.013],redMark,[-.024,.004,.196],.0003);
    box(g,[.001,.006,.012],blueMark,[-.024,.004,.147],.0003);
    patch(g,glass,(u,v)=>{
      const z=(2*u-1)*(.211-.038*v*v),y=lerp(-.077,.092,v)-.025*Math.abs(2*u-1)**5*v;
      return [-.031+.004*(2*u-1)**2,y,z];
    },40,18);
    box(g,[.002,.014,.058],black,[-.023,-.039,-.074]);
    for (let i=0; i<6; i++) box(g,[.002,.007,.004],ink,[-.024,-.039,-.098+.009*i]);
    for (let i=-6; i<=6; i++) box(g,[.002,.007,.014],i%4===0?red:vinyl,[-.017,-.069,i*.022]);
  });
  part(cabin,'steering-wheel','Four-spoke airbag steering wheel','steering_wheel_airbag',[.355,.825,-.367],[-.44,.52,-.5],g=>{
    const wheel = mesh(g,new TorusGeometry(.172,.015,16,72),wheelLeather,[0,0,0]);
    wheel.rotation.y=Math.PI/2;
    airbagPad(g);
    g.rotation.z=-.16;
  });
  part(cockpit,'column','Column shroud and stalks','steering_column_switch',[.454,.797,-.367],[.14,.33,-.66],g=>{
    drum(g,.062,.051,.189,plastic,[0,0,0],true);
    for (const side of [-1,1]) {
      box(g,[.019,.019,.134],plastic,[.034,.011,side*.101],.004).rotation.x = side*.1;
      box(g,[.031,.024,.039],vinyl,[.034,.019,side*.16],.005);
    }
  });
  add(cockpit,'air-distribution','Heater housing and dash ducts',[.610,.695,0],[.31,.44,-.19],g=>{
    section(g,[[-.078,-.065],[-.085,.032],[-.045,.094],[.053,.094],[.089,.039],[.068,-.072]],.312,plastic,[0,0,0],.009);
    for(const sign of [-1,1]){
      bead(g,vinyl,u=>[.015+.055*Math.sin(Math.PI*u),.029-.021*smooth(u),sign*lerp(.116,.584,u)],.021,35);
      box(g,[.048,.042,.072],vinyl,[.015,.012,sign*.578],.005);
      box(g,[.039,.026,.055],black,[-.010,.012,sign*.578],.004);
      box(g,[.063,.021,.057],vinyl,[.040,-.066,sign*.112],.006);
    }
    box(g,[.159,.009,.318],vinyl,[.003,-.041,0],.003);
    for (const z of [-.132,.132])box(g,[.031,.011,.012],steel,[-.058,-.040,z],.002);
  },{page:'housing_parts_heater_microfilter_instrument',internal:true,cabin:true});
  part(cockpit,'air-outlets','Dashboard air outlets','fresh_air_grille',[.493,.83,0],[.19,.57,.3],g=>{
    box(g,[.026,.062,.323],vinyl,[.002,.004,0],.008);
    vent(g,.139,.053,[-.006,.004,-.076]); vent(g,.139,.053,[-.006,.004,.076]);
    vent(g,.111,.057,[.014,-.003,-.618]); vent(g,.109,.056,[.023,-.003,.611]);
  });
  part(cockpit,'center-stack','Center stack bezel','trim_panel_dashboard',[.524,.685,0],[.26,.43,.28],g=>{
    section(g,[[-.059,-.101],[-.067,.123],[.049,.129],[.043,-.101]],.323,plastic,[0,0,0],.011);
    for(const z of [-.113,-.072,-.031,.010,.051,.092]){
      box(g,[.012,.022,.031],black,[-.073,.106,z],.003);
    }
    box(g,[.004,.008,.012],redMark,[-.080,.106,.010],.001);
    box(g,[.017,.034,.221],black,[-.061,-.082,0],.004);
  });
  part(cockpit,'heater-controls','Heater and ventilation controls','heater_control',[.449,.69,-.002],[-.17,.57,.24],g=>{
    box(g,[.019,.072,.303],vinyl,[0,0,0],.005);
    for (const z of [-.114,.114]) {
      drum(g,.023,.023,.016,black,[-.015,0,z],true);
      box(g,[.002,.012,.002],ink,[-.023,.01,z]);
    }
    for (const [i,y] of [-.018,0,.018].entries()) {
      box(g,[.004,.003,.131],black,[-.011,y,0]);
      box(g,[.012,.008,.012],plastic,[-.016,y,[-.04,.02,-.014][i]],.002);
    }
    for (const z of [-.032,.032]) box(g,[.01,.013,.021],plastic,[-.013,-.027,z],.001);
  });
  part(cockpit,'radio','Cassette radio','radio',[.446,.769,-.053],[-.26,.75,.31],g=>{
    box(g,[.054,.047,.181],plastic,[.017,0,0],.004);
    box(g,[.004,.011,.069],black,[-.012,.008,.027]);
    box(g,[.004,.013,.041],display,[-.012,.008,-.046]);
    drum(g,.009,.009,.009,vinyl,[-.014,.008,-.078],true,16);
    for (let i=0;i<6;i++) box(g,[.004,.009,.018],vinyl,[-.012,-.012,-.052+i*.021],.001);
  });
  part(cockpit,'obc','On-board computer','on_board_computer',[.448,.769,.102],[-.17,.73,.49],g=>{
    box(g,[.026,.049,.099],plastic,[.006,0,0],.004);
    box(g,[.003,.011,.059],display,[-.009,.014,-.009],.002);
    for (const y of [-.016,-.003]) for(let i=0;i<5;i++)
      box(g,[.005,.007,.011],vinyl,[-.011,y,-.032+.016*i],.001);
  });
  part(cockpit,'glove-box','Glove box door and latch','glove_box',[.522,.695,.388],[.26,.54,.49],g=>{
    section(g,[[-.040,-.083],[-.052,-.058],[-.051,.050],[-.031,.072],[.040,.063],[.067,-.059],[.038,-.086]],.429,vinyl);
    patch(g,vinyl,(u,v)=>{
      const lateral=2*u-1;
      return [-.050+.006*lateral*lateral-.006*Math.sin(Math.PI*v),lerp(-.072,.060,v),.209*lateral];
    },42,20);
    box(g,[.010,.013,.422],black,[-.037,.072,0],.004);
    box(g,[.009,.017,.070],black,[-.043,.022,.007],.005);
    box(g,[.007,.008,.038],plastic,[-.049,.022,.007],.003);
    drum(g,.004,.004,.003,steel,[-.052,.022,.026],true,16);
  });
  part(cockpit,'knee-panel','Driver knee bolster','trim_panel_leg_room',[.527,.69,-.392],[.19,.32,-.63],g=>{
    section(g,[[-.061,-.097],[-.079,-.069],[-.074,.040],[-.061,.057],[.065,.058],[.104,-.054],[.081,-.103]],.481,vinyl,[0,0,0],.011);
    patch(g,vinyl,(u,v)=>{
      const lateral=2*u-1;
      return [-.077-.011*Math.sin(Math.PI*v)*(1-lateral**4),lerp(-.081,.047,v),.226*lateral];
    },48,20);
    for(const z of [-.203,.199])drum(g,.005,.005,.003,steel,[-.077,-.077,z],true,12);
    drum(g,.016,.016,.021,plastic,[-.079,.026,-.177],true);
    drum(g,.010,.010,.003,steel,[-.091,.026,-.177],true);
    box(g,[.012,.017,.028],black,[-.079,.030,-.126],.002);
  });

  part(floor,'toe-board','Insulated firewall and carpeted toe board','floor_covering',[0,0,0],[.14,.39,0],g=>{
    patch(g,carpet,(u,v)=>{
      const lateral=2*u-1;
      const y=lerp(.302,.838,v)+.012*Math.abs(lateral)**8;
      const tunnel=.009*Math.exp(-(lateral*lateral)/.053);
      const x=lerp(.592,.642,smooth(v))-.025*Math.abs(lateral)**7+tunnel;
      return [x,y,.703*lateral];
    },60,44);
    // The floor, toe board and center tunnel meet behind the pedals.
    patch(g,carpet,(u,v)=>{
      const lateral=2*u-1;
      return [lerp(.552,.616,v),.320+.024*v+.015*lateral**6,.703*lateral];
    },55,14);
    for(const z of [-.379,.381]){
      patch(g,vinyl,(u,v)=>{
        const lateral=(2*u-1)*.251;
        return [lerp(.465,.633,v),.603+.053*smooth(v)+.023*Math.abs(2*u-1)**6,z+lateral];
      },32,20);
    }
  });
  part(floor,'carpet','Molded floor carpet','floor_covering',[-.326,.331,0],[-.24,.29,0],g=>{
    for (const z of [-.402,.402]) {
      section(g,[[-.81,.05],[-.51,.005],[.56,-.028],[.97,-.017],[1.055,.114],[1.033,.143],[.957,.026],
        [.56,.008],[-.51,.041],[-.81,.095]],.59,carpet,[0,0,z]);
      box(g,[.445,.012,.335],webbing,[.642,.02,z],.005);
    }

    section(g,[[-.80,.04],[-.66,.137],[.73,.163],[.991,.24],[1.02,.12],[.9,.042],[-.8,.004]],.229,carpet);
  });
  part(floor,'console','Center console and ashtrays','centre_console',[-.119,.486,0],[.10,.86,.14],g=>{
    section(g,[[-.654,-.073],[-.654,.048],[-.47,.065],[.33,.044],[.468,.082],[.578,.149],
      [.638,.136],[.597,.015],[.497,-.071]],.227,plastic);
    const consoleFace = (u,v) => {
      const lateral=2*u-1;
      const recess=smooth((.79-Math.abs(lateral))/.14)*smooth((v-.19)/.13)*smooth((.92-v)/.13);
      return [lerp(.392,.585,v)+.016*lateral**6+.033*recess,
        .072+.139*v+.025*lateral*lateral-.019*recess,lateral*.128];
    };
    patch(g,vinyl,consoleFace,46,34);
    patch(g,black,(u,v)=>{
      const [x,y,z]=consoleFace(.166+.668*u,.326+.442*v);
      return [x-.0015,y+.0012,z];
    },32,26);
    for (const v of [.348,.396,.444,.492]) bead(g,vinyl,u=>{
      const [x,y,z]=consoleFace(.19+.62*u,v);
      return [x-.0024,y+.0018,z];
    },.0013,28);
    box(g,[.102,.009,.113],black,[.392,.075,0],.007);
    box(g,[.104,.007,.117],vinyl,[.418,.073,0],.008);
    box(g,[.069,.007,.114],vinyl,[-.604,.053,0],.004);
    box(g,[.034,.01,.058],black,[-.606,.06,0],.004);
    drum(g,.012,.012,.015,black,[.418,.077,.061]);
  });
  part(floor,'shifter','Five-speed gear lever and boot','gearshift_knobs_coverings_plaques',[.161,.547,0],[.19,.97,.27],g=>{
    box(g,[.148,.013,.126],vinyl,[0,0,0],.014);
    gearBoot(g,black);
    drum(g,.01,.014,.034,plastic,[-.028,.066,0]);
    drum(g,.025,.015,.042,wheelLeather,[-.032,.094,0]);
    drum(g,.018,.02,.009,plastic,[-.032,.114,0]);
    for (const z of [-.007,0,.007]) box(g,[.017,.001,.001],ink,[-.031,.12,z]);
    box(g,[.001,.001,.016],ink,[-.031,.12,0]);
  });
  part(floor,'window-switches','Power window switches','various_switches',[.144,.548,0],[.09,.66,.48],g=>{
    for(const z of [-.093,.093]) {
      box(g,[.034,.01,.022],vinyl,[0,0,z],.002);
      box(g,[.025,.01,.015],black,[0,.005,z],.002);
      box(g,[.003,.001,.008],ink,[0,.011,z]);
    }
  });
  part(floor,'handbrake','Parking-brake lever and boot','parking_brake_control',[-.412,.556,-.018],[-.17,.93,.20],g=>{
    box(g,[.182,.027,.094],black,[0,-.012,0],.012);
    section(g,[[-.087,.005],[-.022,.064],[.10,.06],[.103,.025],[.031,-.015]],.052,leather);
    box(g,[.111,.028,.038],plastic,[.087,.057,0],.011).rotation.z=.15;
    box(g,[.016,.014,.016],steel,[.147,.066,0],.003);
  });
  for (const [id,label,z,y,page] of [
    ['clutch','Clutch pedal',-.505,.449,'clutch_control'],
    ['brake','Brake pedal',-.386,.449,'pedals_stop_light_switch'],
    ['accelerator','Accelerator pedal',-.277,.391,'accelerator_pedal_bowden_cable'],
  ]) part(floor,id,label,page,[.518,y,z],[.16,.39,(z+.34)*3],g=>{
    const gas = id==='accelerator';
    const pad = box(g,[.015,gas?.135:.055,gas?.044:.064],plastic,[0,0,0],.005);
    pad.rotation.z = gas?-.4:-.12;
    if (!gas) section(g,[[.004,.009],[.081,.184],[.099,.181],[.022,.006]],.013,steel);
    for(let i=gas?-4:-2;i<=(gas?4:2);i++)
      box(g,[.003,.0025,gas?.036:.055],vinyl,[-.008-(gas?.006:0)*i,i*.009,0]);
  });
  part(floor,'footrest','Driver footrest','foot_rest',[.495,.387,-.592],[.16,.31,-.57],g=>{
    box(g,[.023,.14,.078],plastic,[0,0,0],.005).rotation.z=-.34;
  });

  for (const [side,sign,title] of [['left',-1,'Driver'],['right',1,'Passenger']]) {
    const z = sign*.357;
    part(frontSeats,'rail-'+side,title+' seat rails','front_seat_rail',[-.211,.382,z],[-.11,.23,sign*.42],g=>{
      for(const rail of [-.164,.164]){
        box(g,[.385,.03,.031],steel,[.004,0,rail],.003);
        box(g,[.388,.009,.018],plastic,[.008,.02,rail],.002);
        for(const x of [-.16,.17]) drum(g,.01,.01,.007,steel,[x,.026,rail],false,8);
      }
      box(g,[.028,.022,.315],plastic,[.201,.013,0],.005);
    });
    part(cabin,'seat-'+side,title+' seat cushion','seat_front_seat_coverings',[-.188,.454,z],[-.25,.61,sign*.50],g=>{
      comfortCushion(g,leather,leatherInsert,seam);
      box(g,[.093,.046,.046],plastic,[-.155,-.011,sign*.215],.011);
    });
    part(frontSeats,'backrest-'+side,title+' folding backrest','seat_cover_front',[-.422,.687,z],[-.38,.70,sign*.55],g=>{
      comfortBackrest(g,leather,leatherInsert,seam);
      patch(g,vinyl,(u,v)=>{
        const lateral=2*u-1;
        const y=lerp(-.175,.017,v)+.012*lateral*lateral;
        return [-.074-.050*v-.012*Math.sin(Math.PI*v)*(1-lateral*lateral),y,.161*lateral];
      },45,26);
      bead(g,seam,u=>[-.124,.017+.012*(2*u-1)**2,.161*(2*u-1)],.0024,41);
      box(g,[.031,.046,.026],plastic,[-.025,.113,sign*.222],.005);
      drum(g,.021,.021,.012,plastic,[-.004,-.188,sign*.222]).rotation.x=Math.PI/2;
    });
    part(frontSeats,'headrest-'+side,title+' head restraint','seat_parts',[-.499,.975,z],[-.31,.98,sign*.48],g=>{
      for(const rod of [-.081,.081]) drum(g,.006,.006,.10,steel,[.012,-.053,rod]);
      headrestShell(g,leather,seam);
    });
    part(frontSeats,'belt-'+side,title+' three-point seat belt','safety_belt_front',[-.516,.65,z],[-.24,.48,sign*.7],g=>{
      bar(g,[0,.449,sign*.27],[.057,-.282,sign*.292],.002,.045,webbing);
      box(g,[.034,.042,.019],plastic,[0,.43,sign*.267],.005);
      box(g,[.026,.14,.02],webbing,[.094,-.208,-sign*.222],.006).rotation.z=.25;
      box(g,[.028,.037,.029],plastic,[.077,-.141,-sign*.222],.005);
      box(g,[.022,.008,.025],red,[.077,-.121,-sign*.222],.001);
    });
    part(rearSeats,'quarter-trim-'+side,(side==='left'?'Left':'Right')+' rear quarter trim','interior_trim_lateral',[-.923,.662,sign*.631],[-.41,.54,sign*.66],g=>{
      section(g,[[-.327,.172],[.408,.167],[.403,-.246],[-.227,-.231],[-.327,-.123]],.051,trimLeather);
      for(let i=0;i<7;i++) box(g,[.61,.005,.004],seam,[.025,.108-i*.027,-sign*.027]);
      patch(g,trimLeather,(u,v)=>{
        const x=lerp(-.207,.302,u),y=lerp(-.116,-.033,v)+.013*Math.sin(Math.PI*u);
        return [x,y,-sign*(.031+.036*Math.sin(Math.PI*v)*Math.sin(Math.PI*u)**.31)];
      },41,19);
      bead(g,seam,u=>[lerp(-.219,.286,u),-.053+.014*Math.sin(Math.PI*u),-sign*.053],.0018,42);
    });
    part(rearSeats,'belt-'+side,(side==='left'?'Left':'Right')+' rear seat belt','safety_belt_rear',[-.965,.683,sign*.388],[-.53,.65,sign*.43],g=>{
      bar(g,[-.105,.209,sign*.175],[.021,-.152,-sign*.17],.002,.04,webbing);
      box(g,[.026,.058,.029],plastic,[.165,-.147,-sign*.172],.005);
      box(g,[.021,.008,.023],red,[.165,-.115,-sign*.172],.002);
    });
  }
  part(cabin,'rear-bench','Rear seat cushion','rear_seat_parts',[-.956,.479,0],[-.58,.50,.06],g=>{
    rearCushion(g,leather,seam);
  });
  part(rearSeats,'backrest','Rear seat backrest','seat_spring_frame_frame_pad_rear',[-1.164,.703,0],[-.60,.69,0],g=>{
    rearBackrest(g,leather,seam);
  });
  part(rearSeats,'parcel-shelf','Rear parcel shelf and speaker grilles','rear_window_shelf',[-1.382,.872,0],[-.75,.72,.21],g=>{
    box(g,[.332,.028,1.169],carpet,[.010,-.018,0],.010);
    // Rear edge turns down to meet the lower rear window surround.
    patch(g,carpet,(u,v)=>[lerp(-.149,-.169,v),lerp(-.014,.006,v),lerp(-.583,.583,u)],44,6);
    for(const z of [-.389,.389]){
      box(g,[.161,.010,.229],plastic,[0,.001,z],.008);
      for(let i=-5;i<=5;i++)box(g,[.122,.002,.002],black,[0,.007,z+i*.016]);
    }
  });
  part(rearSeats,'third-stoplamp','High-mounted third brake light','third_stoplamp',[-1.453,.892,0],[-.47,.72,0],g=>{
    box(g,[.134,.051,.191],plastic,[0,0,0],.015);
    box(g,[.006,.024,.152],redMark,[-.063,.001,0],.005);
    for(let j=-5;j<=5;j++)box(g,[.001,.016,.0012],red,[-.067,.001,j*.012]);
  });
  part(overhead,'headliner','Contoured headliner and roof edge seals','roof_trim_headlining_moulded_handle',[0,0,0],[-.13,.99,.08],g=>{
    const [a,b,l,r]=roofAperture, [front,rear,inboard,outboard]=linerBounds;
    // A real opening lets the sliding insert move with the metal panel.
    for(const [u0,u1,v0,v1] of [[front,a,inboard,outboard],[b,rear,inboard,outboard],
      [a,b,inboard,l],[a,b,r,outboard]]) {
      patch(g,headlining,(u,v)=>cabinLiner(lerp(u0,u1,u),lerp(v0,v1,v)),36,24);
    }
    for(const edge of [inboard,outboard])bead(g,vinyl,u=>cabinLiner(lerp(front,rear,u),edge),.005,64);
    for(const end of [front,rear])bead(g,headlining,v=>cabinLiner(end,lerp(inboard,outboard,v)),.004,42);
  });
  part(overhead,'sunroof-liner','Sliding roof trim panel','trim_sliding_lifting_roof',[0,0,0],[.19,.96,0],g=>{
    const inserted=(u,v)=>cabinLiner(lerp(.433,.818,u),lerp(.176,.824,v)).map((k,i)=>k+(i===1?.004:0));
    patch(g,headlining,inserted,32,32);
    for(const edge of [0,1]) {
      bead(g,vinyl,u=>inserted(u,edge),.003,36);
      bead(g,vinyl,v=>inserted(edge,v),.003,36);
    }
  });
  part(overhead,'check-panel','Overhead check panel and roof switch','roof_box',[.228,1.326,-.045],[.34,.79,-.15],g=>{
    box(g,[.138,.025,.197],plastic,[0,0,0],.008).rotation.z=-.055;
    box(g,[.092,.026,.151],vinyl,[.010,.012,0],.005);
    box(g,[.075,.009,.088],black,[-.018,-.014,-.035],.003);
    for(let i=0;i<7;i++)box(g,[.004,.002,.003],red,[-.045+i*.009,-.019,-.047]);
    box(g,[.023,.008,.033],vinyl,[.014,-.016,.063],.003);
  });
  part(overhead,'mirror','Interior rear-view mirror','interior_rear_view_mirror',[.432,1.145,0],[.42,.53,.22],g=>{
    bar(g,[.008,.027,0],[-.105,.169,0],.019,.020,plastic,.005);
    box(g,[.041,.051,.041],vinyl,[-.107,.185,0],.007);
    box(g,[.028,.067,.216],plastic,[0,0,0],.01);
    box(g,[.002,.056,.199],mirror,[-.015,0,0],.001);
  });
  for (const [side,sign] of [['left',-1],['right',1]]) {
    const name = side === 'left' ? 'Left' : 'Right';
    part(floor,'sill-cover-'+side,name+' door sill cover','cover_door_sill_wheel_arch',[.168,.334,sign*.704],[-.15,.30,sign*.54],g=>{
      box(g,[1.04,.015,.106],plastic,[0,0,0],.006);
      for(let j=-3;j<=3;j++)box(g,[.998,.003,.004],vinyl,[0,.009,j*.011],.001);
    });
    part(floor,'kick-panel-'+side,name+' footwell side trim and speaker grille','single_components_sound_system',[.541,.435,sign*.620],[.25,.29,sign*.40],g=>{
      section(g,[[-.168,-.085],[.136,-.088],[.103,.131],[-.126,.093]],.038,vinyl,[0,0,0],.007);
      const speaker=drum(g,.061,.061,.014,black,[-.018,.031,-sign*.024]);
      speaker.rotation.x=Math.PI/2;
      for(let j=-5;j<=5;j++){
        const y=j*.008,width=.096*Math.sqrt(1-(y/.051)**2);
        box(g,[width,.0016,.003],vinyl,[-.018,.031+y,-sign*.033],.0005);
      }
    });
    part(overhead,'pillar-trim-'+side,name+' windshield and pillar trim','interior_trim_lateral',[0,0,sign*.63],[.20,.66,sign*.59],g=>{
      // The three pillars follow the exterior window openings.
      bar(g,[.839,.879,sign*.053],[.333,1.258,sign*-.088],.047,.046,vinyl,.009);
      bar(g,[-.452,.759,sign*.047],[-.532,1.259,sign*-.058],.067,.057,vinyl,.013);
      patch(g,headlining,(u,v)=>{
        const [x,y,z]=pillarPoint(sign,false,.026+.936*u,.12+.74*v);
        return [x+.008,y-.016,z-sign*(.63+.010)];
      },45,13);
      const roofRail=u=>{
        const [x,y,z]=roofPoint(.025+.945*u,sign===1?.975:.025);
        return [x,y-.026,z-sign*.642];
      };
      bead(g,vinyl,roofRail,.008,58);
    });
    const lampSeat=linerAt(-.672,sign*.531);
    part(overhead,'dome-light-'+side,name+' cabin light','various_lamps',
      [lampSeat[0],lampSeat[1]-.005,lampSeat[2]],[-.13,.82,sign*.56],g=>{
      box(g,[.081,.026,.046],headlining,[0,.004,0],.006).rotation.x=-sign*.18;
      box(g,[.055,.007,.028],ink,[-.005,-.012,-sign*.003],.003);
      box(g,[.011,.007,.019],plastic,[.028,-.012,0],.002);
    });
    // Locate each hinge and clip off the same liner as its matching seat.
    part(overhead,'visor-'+side,name+' sun visor','sun_visors',[.118,1.312,sign*.347],[.22,.91,sign*.46],g=>{
      const visorTilt=sign*.095;
      const visor=box(g,[.137,.013,.384],visorCloth,[-.012,-.012,0],.006);
      visor.rotation.z=-.035;
      visor.rotation.x=visorTilt;
      for(const [x,z,inner] of [[.059,sign*.205,false],[.063,-sign*.207,true]]) {
        const cap=linerAt(.118+x,sign*.347+z)[1]-1.312;
        const pin=-.008-Math.sin(visorTilt)*z;
        const bottom=Math.min(cap-.023,pin);
        box(g,[inner?.022:.026,cap+.005-bottom,inner?.021:.030],inner?vinyl:plastic,[x,(cap+.005+bottom)/2,z],.004);
        bar(g,[x-.017,pin-.007,z*.87],[x,bottom+.004,z],.009,.010,vinyl,.003);
      }
      if(side==='right'){
        const cover=box(g,[.081,.004,.159],trimLeather,[-.014,-.021,-.018],.005);
        const glass=box(g,[.067,.002,.130],headlining,[-.014,-.0235,-.014],.003);
        cover.rotation.x=glass.rotation.x=visorTilt;
        cover.rotation.z=glass.rotation.z=-.035;
      }
    });
    for(const handle of roofGrabHandles.filter(handle=>handle.side===sign)) {
      const position=[handle.x,1.25,sign*.537];
      const feet=[-.100,.100].map(x=>{
        const [,y]=linerAt(handle.x+x,position[2]);
        return [x,y-position[1],0];
      });
      add(overhead,handle.key,handle.label,position,[-.13,.89,sign*.50],g=>{
        bead(g,headlining,u=>{
          const t=Math.sin(Math.PI*u)**.68;
          return [lerp(feet[0][0],feet[1][0],u),lerp(feet[0][1],feet[1][1],u)-.012-.041*t,-sign*.025*t];
        },.011,45);
        for(const [x,y,z] of feet){
          box(g,[.034,.026,.034],headlining,[x,y-.006,z],.005).rotation.x=-sign*.20;
          drum(g,.004,.004,.004,vinyl,[x,y-.019,z],false,14);
        }
      },{page:'roof_trim_headlining_moulded_handle',row:'51161888099',cabin:true});
    }
    part('e30body:door-'+side,'door-card',(side==='left'?'Left':'Right')+' interior door card','door_pocket',[.18,.564,sign*.674],[-.10,.64,sign*.55],g=>{
      section(g,[[-.558,.253],[.560,.250],[.554,-.149],[.498,-.204],[-.465,-.211],[-.531,-.158]],.025,trimLeather,[0,0,0],.007);
      const beltCap = (u, v) => {
        const x=lerp(-.552,.558,u), rise=.017*smooth(u/.095)-.012*smooth((u-.88)/.12);
        const edge=Math.sin(Math.PI*v);
        return [x,.239+rise+.021*edge,-sign*lerp(.047,-.049,v)];
      };
      patch(g,vinyl,beltCap,58,19);
      bead(g,seam,u=>beltCap(u,.91),.0030,53);
      bead(g,trimLeather,u=>beltCap(u,.045),.0044,53);
      patch(g,trimLeather,(u,v)=>{
        const x=lerp(-.499,.501,u),y=lerp(-.063,.173,v);
        const ribs=.006*(.5+.5*Math.cos(v*Math.PI*14));
        return [x,y,-sign*(.017+ribs*Math.sin(Math.PI*u)**.28)];
      },45,46);
      for(const edge of [-.498,.503])bead(g,seam,u=>[edge,lerp(-.061,.171,u),-sign*.018],.0015,24);
      box(g,[.084,.047,.017],plastic,[-.196,.102,-sign*.022],.007);
      box(g,[.043,.013,.009],steel,[-.185,.105,-sign*.031],.002);
      box(g,[.413,.086,.049],trimLeather,[.02,-.142,-sign*.024],.015);
      box(g,[.362,.011,.032],black,[.024,-.103,-sign*.042],.004);
      bead(g,vinyl,u=>[lerp(-.166,.222,u),-.103-.006*Math.sin(Math.PI*u),-sign*.058],.0027,44);
      box(g,[.012,.036,.012],plastic,[-.507,.249,-sign*.018],.002);
    });
    part('e30body:door-'+side+':door-card','armrest',name+' front door armrest','armrest_front',
      [.18,.564,sign*.674],[-.07,.65,sign*.73],g=>{
      patch(g,trimLeather,(u,v)=>{
        const x=lerp(-.176,.250,u);
        const rise=.095*smooth((u-.73)/.27);
        const y=-.030+rise+.034*(v-.5);
        const roll=.036*Math.sin(Math.PI*v)*Math.sin(Math.PI*u)**.4;
        return [x,y,-sign*(.029+roll)];
      },59,18);
      // The pull stands off the upholstery only between its two molded feet.
      box(g,[.054,.056,.040],trimLeather,[-.148,-.027,-sign*.020],.012);
      box(g,[.058,.062,.047],trimLeather,[.245,.073,-sign*.021],.012);
      bar(g,[.206,-.025,-sign*.052],[.260,.111,-sign*.040],.049,.057,trimLeather,.015);
      bead(g,seam,u=>[lerp(-.17,.249,u),-.047+.095*smooth((u-.73)/.27),-sign*.036],.0017,51);
      if(side==='left'){
        box(g,[.034,.014,.042],black,[.223,.104,-sign*.062],.005).rotation.z=.30;
        box(g,[.012,.004,.012],vinyl,[.228,.113,-sign*.067],.002);
      }
    });
  }
}
