import { CatmullRomCurve3, Matrix4, Quaternion, TubeGeometry, Vector3 } from 'three';
import { along, loft, pin } from './525i-fabrication.mjs';
import { box, cylinder, lathe, mesh, ring, tube, visualMaterials as M } from './525i-visual-details.mjs';

const up = new Vector3(0, 1, 0);
const v = point => new Vector3(...point);
const add = (a,b) => v(a).add(v(b)).toArray();
const raise = (point,y) => add(point,[0,y,0]);

function nut(g, point, thread, hex, axis = 'y') {
  ring(g, hex / 2, thread / 2, .002, point, M.machined, axis, 24);
  ring(g, hex / Math.sqrt(3), thread / 2, thread * .68, point, M.machined, axis, 6);
}

function bolt(g, length, thread, hex) {
  cylinder(g, thread / 2, length, [0,length/2,0], M.steel, 'y', 18);
  cylinder(g, hex / Math.sqrt(3), .007, [0,-.0035,0], M.machined, 'y', 6);
  ring(g, hex * .57, thread / 2, .002, [0,.001,0], M.machined, 'y', 20);
}

function stud(g, point, thread) {
  const profile = [[0,-.010],[.014,-.010],[.021,-.005],[.021,.002],[.017,.006],[.009,.006],[0,.006]];
  lathe(g,profile,M.steel,'y',24).position.fromArray(point);
  const boot = [[.009,.004],[.018,.004],[.017,.010],[.012,.016],[thread/2,.018],[.008,.014],[.009,.004]];
  lathe(g,boot,M.rubber,'y',24).position.fromArray(point);
  lathe(g,[[0,.005],[.009,.005],[thread/2+.001,.017],[thread/2,.025],[thread/2,.044],[0,.044]],M.machined,'y',24).position.fromArray(point);
}

function bush(g, point, axis, radius, width, hole) {
  ring(g, radius, radius-.003, width, point, M.steel, axis, 32);
  ring(g, radius-.003, hole+.004, width-.004, point, M.rubber, axis, 32);
  ring(g, hole+.004, hole, width+.002, point, M.machined, axis, 24);
}

function ribbedBoot(g, start, end, outer, inner) {
  along(g,start,end,(frame,length)=>{
    const profile = [[outer-.003,0],[outer,0],[outer,.004]];
    for(let i=0;i<=14;i++){
      const t=i/14, r=outer+(inner-outer)*t;
      profile.push([r-(i%2)*.008,.006+(length-.013)*t]);
    }
    profile.push([inner,length],[inner-.002,length],[inner-.002,length-.008],[outer-.003,0]);
    lathe(frame,profile,M.rubber,'y',24);
  });
}

export function buildFrontCorner(series,side,part,drawSpindle) {
  const e30=series==='e30', s=side==='right'?1:-1;
  const p=([x,y,z])=>[x,y,s*z];
  const spindle=p(e30?[1.39,.300,.648]:[1.3805,.32375,.638]);
  const top=p(e30?[1.387,.747,.542]:[1.285,.816,.555]);
  const axis=v(top).sub(v(spindle)), length=axis.length();
  axis.normalize();
  const rotation=new Quaternion().setFromUnitVectors(up,axis);
  const at=t=>v(spindle).addScaledVector(axis,t).toArray();
  const axial=(name,label,height,draw)=>part(name,label,at(height),draw,rotation);
  const seat=e30?.183:.211, upper=length-.047;
  const tubeRadius=e30?.0255:.0275, bore=tubeRadius-.003, collar=seat+.075;
  const coilRadius=e30?.077:.089, wire=e30?.0065:.0071;
  const armOuter=p(e30?[1.396,.202,.647]:[1.433,.243,.620]);
  const armInner=p(e30?[1.319,.190,.313]:[1.284,.227,.239]);
  const armRear=p([1.015,.202,.452]);
  const thrustOuter=p([1.335,.234,.620]), thrustInner=p([.946,.280,.455]);
  const tieOuter=p(e30?[1.255,.246,.645]:[1.360,.268,.640]);
  const tieInner=p(e30?[1.230,.240,.337]:[1.151,.249,.395]);
  const socketHeight=e30?.038:.020;
  const leverBolts=[[.038,-.012],[-.034,-.019],[.006,.032]].map(([x,z])=>add(spindle,[x,-.034,s*z]));
  const mountStuds=Array.from({length:3},(_,i)=>{
    const angle=Math.PI*2*i/3;
    return [Math.cos(angle)*.049, .018, Math.sin(angle)*.049];
  });

  axial('strut','Spring strut housing',0,g=>{
    lathe(g,[[bore,.034],[tubeRadius+.008,.034],[tubeRadius+.010,.059],[tubeRadius,.089],
      [tubeRadius,collar-.012],[tubeRadius+.002,collar-.006],[tubeRadius+.002,collar],
      [bore,collar],[bore,.040],[bore,.034]],M.dark,'y',32);
    lathe(g,[[tubeRadius,seat-.020],[.048,seat-.015],[.074,seat-.007],[coilRadius+.018,seat-.006],
      [coilRadius+.020,seat-.001],[coilRadius+.016,seat+.003],[.058,seat-.001],
      [tubeRadius,seat-.014],[tubeRadius,seat-.020]],M.dark,'y',44);
    ring(g,tubeRadius+.003,tubeRadius,.003,[0,seat-.020,0],M.steel,'y',32);
  });
  part('strut-spindle','Strut spindle and brake mounting ears',spindle,g=>{
    const q=point=>v(point).sub(v(spindle)).toArray();
    const brakeEar=p(e30?[1.317,.300,.669]:[1.299,.353,.640]);
    loft(g,[[[0,.045,0],.027,.023],[[0,.004,0],.046,.027],[[0,-.040,0],.037,.017]],M.dark,{sides:16,up:[0,0,1]});
    loft(g,[[[0,0,0],.035,.024],[q(brakeEar),.035,.023]],M.dark,{sides:16});
    for(const height of [-.043,.045])ring(g,.019,.006,.016,raise(q(brakeEar),height),M.steel,'z',24);
    if(drawSpindle) drawSpindle(g);
    else {
      const machined=lathe(g,[[.029,0],[.030,.007],[.029,.019],[.024,.029],
        [.024,.077],[.018,.084],[.018,.100],[0,.100]],M.machined,'z',36);
      machined.scale.z=s;
    }
    if(e30){
      for(const point of [armOuter,tieOuter]){
        const hole=raise(q(point),socketHeight-.009);
        loft(g,[[[0,-.024,0],.027,.017],[hole,.021,.012]],M.dark,{sides:16});
        ring(g,.022,.007,.015,hole,M.steel,'y',24);
      }
    }else{
      for(const point of leverBolts)ring(g,.013,.006,.013,raise(q(point),.007),M.dark,'y',20);
    }
  });
  axial('damper','Damper cartridge and piston rod',.05,g=>{
    cylinder(g,bore-.001,collar-.059,[0,(collar-.059)/2,0],M.steel,'y',28);
    cylinder(g,bore-.003,.012,[0,collar-.044,0],M.machined,'y',28);
    cylinder(g,.010,length-collar-.034,[0,length/2+collar/2-.037,0],M.machined,'y',24);
    cylinder(g,e30?.006:.007,.035,[0,length-.028,0],M.steel,'y',24);
    cylinder(g,.004,.009,[0,length-.008,0],M.machined,'y',6);
  });
  axial('gland-nut','Threaded cartridge retaining collar',collar-.004,g=>{
    lathe(g,[[.019,0],[tubeRadius-.002,0],[tubeRadius-.002,.009],[tubeRadius+.003,.009],
      [tubeRadius+.003,.016],[.019,.016],[.019,0]],M.machined,'y',28);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      const flat=box(g,[.006,.006,.008],[Math.cos(a)*tubeRadius,.015,Math.sin(a)*tubeRadius],M.machined,.001);
      flat.rotation.y=-a;
    }
  });
  axial('lower-pad','Lower rubber spring pad',seat,g=>{
    lathe(g,[[.047,0],[coilRadius+.014,0],[coilRadius+.014,.007],[coilRadius-.006,.007],[.047,.003],[.047,0]],M.rubber,'y',36);
    box(g,[.011,.011,.017],[coilRadius,.006,-.010],M.rubber,.001);
  });
  axial('spring','Front coil spring',seat+.014,g=>{
    const segments=132,turns=e30?5.75:6.15, travel=upper-seat-.029;
    const points=Array.from({length:segments+1},(_,i)=>{
      const t=i/segments, angle=t*turns*2*Math.PI;
      const rise=.45*t+.55*(t-Math.sin(2*Math.PI*t)/(2*Math.PI));
      const radius=coilRadius*(.91+.09*Math.sin(t*Math.PI));
      return new Vector3(Math.cos(angle)*radius,travel*rise,Math.sin(angle)*radius);
    });
    mesh(g,new TubeGeometry(new CatmullRomCurve3(points),segments,wire,9,false),M.dark);
    box(g,[.013,.003,.004],points[58].clone().add(new Vector3(0,wire,0)).toArray(),M.machined,.001);
  });
  axial('upper-pad','Upper rubber spring pad',upper-.013,g=>{
    lathe(g,[[.043,0],[coilRadius-.006,0],[coilRadius+.013,-.005],[coilRadius+.013,.003],
      [.048,.007],[.043,.004],[.043,0]],M.rubber,'y',36);
  });
  axial('upper-seat','Pressed steel upper spring plate',upper,g=>{
    lathe(g,[[.013,.018],[.034,.018],[.050,.004],[coilRadius+.015,0],[coilRadius+.015,-.008],
      [coilRadius+.010,-.008],[.048,.001],[.031,.015],[.013,.015],[.013,.018]],M.steel,'y',36);
  });
  axial('dust-boot','Damper protection tube',collar+.013,g=>{
    lathe(g,[[.023,0],[.028,0],[.028,.014],[.025,.020],[.025,.092],[.022,.105],
      [.016,.105],[.016,.102],[.022,.091],[.022,.012],[.023,0]],M.plastic,'y',30);
  });
  axial('bump-stop','Foam bump stop',upper-.064,g=>{
    lathe(g,[[.010,-.043],[.016,-.043],[.018,-.036],[.017,-.029],[.021,-.023],
      [.021,-.017],[.018,-.011],[.024,-.004],[.024,.010],[.010,.010],[.010,-.043]],
      M.reservoir,'y',28);
  });
  axial('top-mount','Upper strut mount and bearing',length-.011,g=>{
    lathe(g,[[.016,-.017],[.030,-.017],[.037,-.009],[.060,-.007],[.062,-.004],[.061,.002],
      [.034,.003],[.029,.009],[.019,.012],[.014,.008],[.016,-.017]],M.alloy,'y',36);
    ring(g,.031,.013,.020,[0,.003,0],M.rubber,'y',32);
    ring(g,.019,.009,.019,[0,.001,0],M.machined,'y',32);
    for(const [x,y,z] of mountStuds)cylinder(g,.004,.028,[x,y-.007,z],M.steel,'y',16);
  });
  axial('mount-insulator','Contoured mount dust shield',length-.035,g=>{
    lathe(g,[[.009,.003],[.024,.003],[.031,.009],[.036,.014],[.036,.012],
      [.030,.007],[.024,0],[.009,0],[.009,.003]],M.steel,'y',32);
  });
  if(e30)axial('mount-washer','Lower damper shaft washer',length-.037,
    g=>ring(g,.019,.0065,.0025,[0,0,0],M.machined,'y',28));
  axial('shaft-washer','Damper shaft washer',length+.004,g=>ring(g,.0185,e30?.0065:.0075,.0025,[0,0,0],M.steel,'y',30));
  axial('shaft-nut','Damper shaft self-locking nut',length+.012,g=>nut(g,[0,0,0],e30?.012:.014,e30?.019:.022));
  axial('top-cap','Upper mount dust cap',length+.020,g=>{
    lathe(g,[[.015,0],[.018,0],[.018,.008],[.014,.013],[0,.013],[0,.011],[.015,.011],[.015,0]],M.plastic,'y',30);
  });
  for(const [i,studPoint] of mountStuds.entries()){
    const center=add(at(length-.011),v(studPoint).applyQuaternion(rotation).toArray());
    part('tower-nut-'+(i+1),'Upper mount M8 locknut',center,g=>nut(g,[0,0,0],.008,.013),rotation);
  }

  part('control-arm',e30?'Forged steel wishbone':'Aluminum lower control arm',armInner,g=>{
    const outer=v(armOuter).sub(v(armInner)).toArray();
    if(e30){
      const tail=v(armRear).sub(v(armInner)).toArray();
      const bend=[-.040,-.019,s*.235];
      loft(g,[[[0,0,0],.022,.013],[[.004,-.006,s*.095],.026,.011],[bend,.028,.012],[outer,.022,.014]],M.steel,{sides:18});
      loft(g,[[bend,.027,.011],[[-.15,-.017,s*.198],.020,.012],[raise(tail,-.004),.013,.011]],M.steel,{sides:18});
      pin(g,add(tail,[.031,0,.002]),add(tail,[-.025,0,-.002]),.012);
      ring(g,.010,.0045,.013,[.061,.008,s*.217],M.steel,'x',20);
      stud(g,[0,0,0],.014);
    }else{
      loft(g,[[[0,0,0],.023,.018],[[-.006,-.010,s*.119],.027,.015],
        [[.046,-.009,s*.244],.026,.014],[outer,.022,.013]],M.alloy,{sides:20});
      tube(g,[[0,.011,0],[.006,.008,s*.128],[.060,.007,s*.244],raise(outer,.009)],.005,M.alloy,16);
      bush(g,[0,0,0],'x',.025,.049,.0065);
    }
    stud(g,outer,e30?.012:.014);
  });
  part('control-nut','Outer control arm joint nut',raise(armOuter,e30?.039:.036),g=>nut(g,[0,0,0],e30?.012:.014,e30?.019:.022));
  if(e30){
    part('control-inner-nut','Inner wishbone ball joint nut',raise(armInner,.038),g=>nut(g,[0,0,0],.014,.022));
    part('control-bush','Wishbone rear bushing and carrier',armRear,g=>{
      bush(g,[0,0,0],'x',.037,.040,.012);
      for(const z of [-.054,.054]){
        loft(g,[[[0,.012,0],.025,.010],[[0,.026,z],.025,.008]],M.steel,{sides:16});
        ring(g,.019,.0055,.012,[0,.027,z],M.steel,'y',24);
      }
    });
    for(const [i,z] of [-.054,.054].entries())part('control-bolt-'+(i+1),'Wishbone bushing carrier bolt',add(armRear,[0,.018,z]),g=>bolt(g,.040,.010,.017));
    const upperLink=p([1.432,.285,.533]), lowerLink=p([1.380,.198,.530]);
    part('drop-link','Control arm-mounted stabilizer link',lowerLink,g=>{
      const end=v(upperLink).sub(v(lowerLink)).toArray();
      pin(g,[0,0,0],end,.007,M.steel,18);
      bush(g,[0,0,0],'x',.017,.019,.0045);
      stud(g,end,.010);
    });
    part('drop-link-fastener','Stabilizer link locknut',raise(upperLink,.038),g=>nut(g,[0,0,0],.010,.017));
  }else{
    const xAxis = new Quaternion().setFromUnitVectors(up,new Vector3(1,0,0));
    const zAxis = new Quaternion().setFromUnitVectors(up,new Vector3(0,0,1));
    part('control-bolt','Lower control arm through-bolt',add(armInner,[-.036,0,0]),g=>bolt(g,.076,.012,.019),xAxis);
    part('control-inner-nut','Lower control arm through-bolt locknut and washers',add(armInner,[.036,0,0]),g=>nut(g,[0,0,0],.012,.019,'x'));
    part('thrust-arm','Front thrust arm',thrustInner,g=>{
      const outer=v(thrustOuter).sub(v(thrustInner)).toArray();
      loft(g,[[[0,0,0],.029,.017],[[.083,-.014,s*.038],.026,.014],
        [[.219,-.032,s*.137],.028,.014],[outer,.023,.014]],M.steel,{sides:20});
      bush(g,[0,0,0],'z',.036,.058,.007);
      stud(g,outer,.014);
    });
    part('thrust-bolt','Thrust arm through-bolt',add(thrustInner,[0,0,-.043]),g=>bolt(g,.088,.014,.022),zAxis);
    part('thrust-inner-nut','Thrust arm through-bolt locknut and washers',add(thrustInner,[0,0,.043]),g=>nut(g,[0,0,0],.014,.022,'z'));
    part('thrust-nut','Outer thrust arm ball joint nut',raise(thrustOuter,.039),g=>nut(g,[0,0,0],.014,.022));
    part('steering-arm','Bolt-on steering arm',raise(spindle,-.043),g=>{
      const local=point=>v(point).sub(v(raise(spindle,-.043))).toArray();
      for(const joint of [armOuter,thrustOuter,tieOuter]){
        const hole=local(raise(joint,.025));
        loft(g,[[[0,.007,0],.035,.009],[hole,.021,.011]],M.steel,{sides:18});
        ring(g,.022,.008,.015,hole,M.steel,'y',28);
      }
      for(const point of leverBolts)ring(g,.016,.006,.010,raise(local(point),.001),M.steel,'y',22);
    });
    for(const [i,point] of leverBolts.entries())part('lever-bolt-'+(i+1),'Steering arm to strut M12 bolt',raise(point,-.014),g=>bolt(g,.025,.012,.019));
    part('drop-link-fastener','Strut-side stabilizer link locknut',p([1.269,.474,.614]),g=>nut(g,[0,0,0],.010,.017,'z'));
  }

  const tieDelta=v(tieOuter).sub(v(tieInner));
  const tieAt=t=>v(tieInner).addScaledVector(tieDelta,t).toArray();
  part('tie-outer','Outer tie rod end',tieOuter,g=>{
    stud(g,[0,0,0],.010);
    const to=v(tieAt(.62)).sub(v(tieOuter)).toArray();
    pin(g,[0,0,0],to,.008,M.steel);
    pin(g,to,to.map(x=>x*.70),.0085,M.machined);
  });
  part('tie-outer-nut','Outer tie rod ball joint locknut',raise(tieOuter,e30?.042:.041),g=>nut(g,[0,0,0],.010,.017));
  part('tie-rod',e30?'Rack tie rod and inner ball socket':'Tie rod adjustment sleeve',tieInner,g=>{
    const loc=t=>v(tieAt(t)).sub(v(tieInner)).toArray();
    along(g,loc(e30?0:.22),loc(.73),(frame,l)=>{
      if(e30){
        lathe(frame,[[.008,-.018],[.008,-.006],[.023,-.005],[.023,.018],[.018,.024],
          [.010,.037],[.010,l-.047],[.014,l-.038],[.014,l],[.008,l],[.008,l-.037]],
          M.steel,'y',28);
      }else{
        lathe(frame,[[.008,0],[.013,0],[.014,.009],[.012,.021],[.012,l-.021],[.014,l-.009],
          [.013,l],[.008,l],[.008,0]],M.dark,'y',24);
      }
    });
  });
  for(const [i,t] of (e30?[.69]:[.26,.69]).entries()){
    const at=tieAt(t);
    part('tie-clamp-'+(i+1),'Tie rod clamp and pinch fastener',at,g=>{
      ring(g,.018,.012,.016,[0,0,0],M.steel,'y',28,.31,Math.PI*2-.50);
      box(g,[.012,.012,.016],[.015,0,-.007],M.steel,.002);
      cylinder(g,.004,.027,[.018,0,0],M.machined,'z',12);
      nut(g,[.018,0,.014],.008,.013,'z');
    },new Quaternion().setFromUnitVectors(up,tieDelta.clone().normalize()));
  }
  if(e30){
    const bootIn=p([1.230,.240,.292]), bootOut=tieAt(.50);
    part('rack-boot','Steering rack bellows',bootIn,g=>ribbedBoot(g,[0,0,0],v(bootOut).sub(v(bootIn)).toArray(),.039,.018));
    part('rack-boot-clip','Inboard rack boot clamp',bootIn,g=>ring(g,.040,.038,.007,[0,0,s*.003],M.machined,'z',28));
    part('rack-outer-clip','Outboard rack boot clamp',bootOut,g=>ring(g,.020,.018,.005,[0,0,-s*.003],M.machined,'z',22));
    part('rack-lock','Inner tie rod securing plate',add(tieInner,[0,0,-s*.009]),g=>{
      ring(g,.018,.008,.002,[0,0,0],M.machined,'z',24);
      box(g,[.010,.005,.010],[.016,0,s*.004],M.steel,.001);
    });
  }else{
    part('tie-inner','Center-link end of outer tie rod',tieInner,g=>{
      stud(g,[0,0,0],.010);
      pin(g,[0,0,0],v(tieAt(.31)).sub(v(tieInner)).toArray(),.008,M.steel);
    });
    part('tie-inner-nut','Center-link tie rod end locknut',raise(tieInner,.040),g=>nut(g,[0,0,0],.010,.017));
  }
  return {spindle,top,axis:axis.toArray(),length,lowerSeat:seat,upperSeat:upper,controlJoint:armOuter,tieJoint:tieOuter};
}

export function buildE30Rack(part){
  part('subframe','Front axle carrier and engine supports',[0,0,0],g=>{
    loft(g,[[[1.34,.211,-.523],.063,.030],[[1.33,.200,-.315],.065,.031],
      [[1.37,.191,0],.070,.031],[[1.33,.200,.315],.065,.031],[[1.34,.211,.523],.063,.030]],M.dark,{sides:22});
    for(const side of [-1,1]){
      const z=x=>x*side;
      loft(g,[[[1.36,.198,z(.32)],.055,.030],[[1.30,.238,z(.438)],.077,.038],
        [[1.23,.265,z(.477)],.061,.036]],M.dark,{sides:18});
      ring(g,.024,.0077,.020,[1.319,.213,z(.313)],M.steel,'y',26);
      for(const x of [1.235,1.430])ring(g,.017,.0065,.012,[x,.244,z(.489)],M.steel,'y',24);
    }
  });
  part('steering-rack','Hydraulic steering rack housing',[1.230,.240,0],g=>{
    lathe(g,[[.022,-.315],[.035,-.315],[.038,-.272],[.030,-.240],[.030,.227],
      [.037,.256],[.036,.310],[.022,.310],[.022,-.315]],M.alloy,'z',32);
    pin(g,[0,0,-.336],[0,0,.336],.013,M.machined);
    const valve=[-.015,.075,-.172];
    pin(g,[0,0,-.172],valve,.034,M.alloy);
    ring(g,.025,.009,.009,valve,M.machined,'y',28);
    for(const z of [-.231,.267]){
      box(g,[.093,.026,.049],[0,-.024,z],M.alloy,.006);
      ring(g,.011,.005,.009,[.043,-.025,z],M.steel,'y',22);
    }
    for(const d of [0,.019])tube(g,[[-.018,.030,-.167+d],[-.044,.030,-.172+d],
      [-.044,.047,-.074+d],[-.042,.041,.144+d],[-.012,.032,.249+d]],.0035,M.steel,28);
  });
  part('antiroll-bar','Front 20 mm stabilizer bar',[0,0,0],g=>{
    const path=[[1.432,.306,.533],[1.498,.304,.488],[1.553,.285,.371],[1.562,.280,0]];
    tube(g,[...path,...path.slice(0,-1).reverse().map(([x,y,z])=>[x,y,-z])],.010,M.dark,48);
    for(const z of [-.343,.343]){
      bush(g,[1.555,.284,z],'z',.023,.037,.010);
      box(g,[.063,.012,.037],[1.555,.310,z],M.steel,.004);
    }
  });
}

export function placement(point,rotation) {
  return new Matrix4().makeRotationFromQuaternion(rotation??new Quaternion()).setPosition(...point);
}

export function buildE34CenterLink(part) {
  for(const [side,z] of [['left',-.443],['right',.443]]){
    part('center-'+side+'-nut',side==='left'?'Center link to pitman arm locknut':'Center link to idler arm locknut',
      [1.150,.316,z],g=>nut(g,[0,0,0],side==='left'?.012:.010,side==='left'?.019:.017));
  }
}
