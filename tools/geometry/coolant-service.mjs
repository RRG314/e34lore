import { CatmullRomCurve3, ExtrudeGeometry, Group, MeshStandardMaterial, Path, Shape, TorusGeometry, TubeGeometry, Vector3 } from 'three';
import { box, cylinder, lathe, mesh, ring, tube, visualMaterials as M } from './525i-visual-details.mjs';

const paper = new MeshStandardMaterial({name:'fiber pump gasket',color:'#a08e72',roughness:.89});
const brass = new MeshStandardMaterial({name:'machined brass',color:'#ba9c53',metalness:.63,roughness:.37});
const capMaterial = new MeshStandardMaterial({name:'distributor phenolic',color:'#54372c',roughness:.55});
const pumpCenter = [1.712,.548,.057];
const pumpMount = [[.044,-.036],[.039,.051],[-.053,-.001]];
const thermostatCenter = [1.688,.681,-.181];
const thermostatMount = [[.035,-.021],[.010,.037],[-.036,-.016]];
const pumpPitch = .027;
const Tau = Math.PI*2;

function disk(g, outline, holes, at, thickness, material) {
  const points = outline.map(([y,z])=>[z,y]);
  const shape = new Shape();
  shape.moveTo(...points.at(-1));
  for (const p of points)shape.lineTo(...p);
  for (const [y,z,r] of holes) {
    const hole = new Path();
    hole.absarc(z,y,r,0,Tau,true);
    shape.holes.push(hole);
  }
  const geo = new ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:10});
  geo.translate(0,0,-thickness/2);
  geo.rotateY(-Math.PI/2);
  mesh(g,geo,material,at);
}

const outline = mounts => Array.from({length:60},(_,i)=>{
  const a=i*Tau/60;
  const y=Math.cos(a),z=Math.sin(a);
  const supports=mounts.map(([cy,cz])=>[cy+.011*y,cz+.011*z]);
  return [[.044*y,.044*z],...supports].sort(([ay,az],[by,bz])=>(by-ay)*y+(bz-az)*z)[0];
});

const add = (p,x,y,z) => [p[0]+x,p[1]+y,p[2]+z];
const relative = (p,anchor) => p.map((v,i)=>v-anchor[i]);
const local = (pts,anchor) => pts.map(p=>relative(p,anchor));

function hollowNeck(g, from, to, radius, material=M.alloy) {
  const vector=new Vector3(...to).sub(new Vector3(...from));
  const o=ring(g,radius,radius-.0025,vector.length(),from.map((v,i)=>(v+to[i])/2),material,'z',32);
  o.quaternion.setFromUnitVectors(new Vector3(0,0,1),vector.normalize());
  const lip=ring(g,radius+.0017,radius-.0025,.003,to.map((v,i)=>v-vector.getComponent(i)*.004),material,'z',32);
  lip.quaternion.copy(o.quaternion);
}

function screw(g,diameter,length,head=diameter*1.67) {
  cylinder(g,diameter/2,length,[-length/2,0,0],M.steel,'x',14);
  cylinder(g,head*.62,diameter*.62,[diameter*.29,0,0],M.machined,'x',6);
  ring(g,head*.72,diameter*.51,.0015,[-.0006,0,0],M.machined,'x',20);
}

function coiled(g,radius,length,turns,wire,mat) {
  const points = Array.from({length:turns*9+1},(_,i)=>{
    const a=i*Tau/9;
    return new Vector3(length*(i/(turns*9)-.5),Math.cos(a)*radius,Math.sin(a)*radius);
  });
  mesh(g,new TubeGeometry(new CatmullRomCurve3(points),turns*12,wire,6,false),mat);
}

function seal(g,radius,section) {
  const geometry=new TorusGeometry(radius,section,8,44);
  geometry.rotateY(Math.PI/2);
  mesh(g,geometry,M.rubber);
}

function thermostatValve(g) {
  lathe(g,[[.016,.001],[.0285,.001],[.0295,0],[.0295,-.0023],[.0235,-.0023],
    [.020,-.005],[.017,-.005],[.016,.001]],M.machined,'x',42);
  cylinder(g,.011,.024,[-.009,0,0],brass,'x',24);
  const spring=new CatmullRomCurve3(Array.from({length:46},(_,i)=>{
    const a=i*Tau/9, r=.010+.003*i/45;
    return new Vector3(-.004-.021*i/45,Math.cos(a)*r,Math.sin(a)*r);
  }));
  mesh(g,new TubeGeometry(spring,62,.00145,7,false),M.steel);
  cylinder(g,.0155,.003,[-.026,0,0],M.machined,'x',28);
  for (const side of [-1,1])tube(g,[[0,.020*side,0],[-.011,.018*side,0],[-.027,.010*side,0]],.0019,M.steel,8);
  ring(g,.0032,.0013,.0026,[-.001,.025,0],brass,'x',16);
}

function hose(part,key,label,points,radius,page,numbers=[]) {
  part(key,label,points[0],g=>tube(g,local(points,points[0]),radius,M.rubber,23),page,numbers);
}

function clamp(part,key,label,at,next,radius,page,numbers=[]) {
  part(key,label,at,g=>{
    const direction=new Vector3(...next).sub(new Vector3(...at)).normalize();
    const band=ring(g,radius+.001,radius-.0005,.009,[0,0,0],M.machined,'z',32);
    band.quaternion.setFromUnitVectors(new Vector3(0,0,1),direction);
    const driver=box(g,[.016,.007,.009],[0,0,0],M.machined,.002);
    driver.position.set(0,radius+.003,0).applyQuaternion(band.quaternion);
    driver.quaternion.copy(band.quaternion);
  },page,numbers);
}

function belt(g, wheels) {
  // The outside envelope wraps all three V-grooves with tangents between the pulleys.
  const ringPoints=Array.from({length:96},(_,i)=>{
    const a=i*Tau/96,y=Math.cos(a),z=Math.sin(a);
    const [cy,cz,r]=[...wheels].sort(([ay,az,ar],[by,bz,br])=>(by-ay)*y+(bz-az)*z+br-ar)[0];
    return [cy+r*y,cz+r*z];
  });
  const edge=ringPoints.filter((p,i)=>i===0||p.some((v,j)=>Math.abs(v-ringPoints[i-1][j])>1e-6));
  const center=edge.reduce(([y,z],[py,pz])=>[y+py/edge.length,z+pz/edge.length],[0,0]);
  const shape=new Shape(),inner=new Path();
  edge.forEach(([y,z],i)=>shape[i?'lineTo':'moveTo'](z,y));
  [...edge].reverse().forEach(([y,z],i)=>inner[i?'lineTo':'moveTo'](z+(center[1]-z)*.043,y+(center[0]-y)*.043));
  shape.closePath();
  inner.closePath();
  shape.holes.push(inner);
  const geo=new ExtrudeGeometry(shape,{depth:.010,bevelEnabled:false});
  geo.translate(0,0,-.005);
  geo.rotateY(-Math.PI/2);
  mesh(g,geo,M.rubber);
}

function e30Cooling(part) {
  const pump='cooling_system_water_pump',stat='cooling_system_thermostat_housing',hoses='cooling_system_water_hoses';
  const pulley='cooling_system_fan_fan_coupling',timing='timing_and_valve_train_tooth_belt',ignition='ignition_wiring';
  const mountOutline=outline(pumpMount);
  const pumpPort=[1.710,.542,-.021], feedPort=[1.718,.510,.114];
  const thermostatHose=[1.747,.682,-.187], lowerStat=[1.724,.631,-.162], pumpStat=[1.680,.625,-.165];
  part('water-pump','M20 water pump',pumpCenter,g=>{
    disk(g,mountOutline,[[0,0,.032],...pumpMount.map(([y,z])=>[y,z,.0045])],[-.019,0,0],.009,M.alloy);
    lathe(g,[[.033,-.025],[.040,-.016],[.041,-.004],[.036,.014],[.025,.023],
      [.022,.047],[.018,.055],[.010,.055],[.010,-.025]],M.alloy,'x',42);
    lathe(g,[[0,.013],[.011,.013],[.011,.054],[.039,.054],[.039,.063],
      [.011,.063],[.010,.096],[.009,.098],[0,.098]],M.machined,'x',40);
    hollowNeck(g,[-.008,-.005,-.029],relative(pumpPort,pumpCenter),.020);
    hollowNeck(g,[-.006,-.018,.027],relative(feedPort,pumpCenter),.012);
    box(g,[.015,.011,.018],[-.004,.043,-.017],M.alloy,.003);
    ring(g,.006,.0035,.003,[.003,.047,-.016],M.machined,'x',16);
  },pump,['11519070758']);
  part('pump-impeller','Water pump impeller',add(pumpCenter,-.033,0,0),g=>{
    cylinder(g,.030,.004,[0,0,0],M.machined,'x',40);
    cylinder(g,.008,.010,[-.002,0,0],M.steel,'x',20);
    for(let i=0;i<7;i++){
      const a=i*Tau/7,pt=(r,s)=>[-.005,r*Math.cos(a+s),r*Math.sin(a+s)];
      tube(g,[pt(.010,0),pt(.020,.18),pt(.028,.43)],.0028,M.machined,8);
    }
  },pump,['11519070758']);
  part('pump-gasket','Water pump flat gasket',add(pumpCenter,-.024,0,0),g=>{
    disk(g,mountOutline,[[0,0,.032],...pumpMount.map(([y,z])=>[y,z,.0046])],[0,0,0],.0013,paper);
  },pump,['11511722677']);
  pumpMount.forEach(([y,z],i)=>part('pump-bolt-'+(i+1),'Water pump bolt '+(i+1),add(pumpCenter,-.013,y,z),g=>screw(g,.008,.020,.013),pump,['07119903039']));

  part('pump-pulley','Water pump V-belt pulley',add(pumpCenter,.055,0,0),g=>{
    lathe(g,[[.015,.009],[.039,.009],[.051,.004],[.058,.001],[.058,-.005],[.051,-.005],
      [.047,-.012],[.057,-.020],[.057,-.023],[.051,-.024],[.040,-.015],[.034,-.003],
      [.015,.003],[.015,.009]],M.dark,'x',52);
  },pulley,['11511271424']);
  part('drive-belt','Alternator and water-pump V-belt',[1.755,0,0],g=>belt(g,[[.548,.057,.051],[.433,-.224,.033],[.422,-.043,.069]]),'fan_belt');
  part('alternator','M20 alternator',[1.661,.433,-.224],g=>{
    cylinder(g,.059,.120,[-.004,0,0],M.alloy,'x',36);
    lathe(g,[[.024,.045],[.056,.045],[.059,.056],[.058,.067],[.042,.074],[.017,.074],[.017,.052],[.024,.045]],M.alloy,'x',36);
    cylinder(g,.012,.034,[.080,0,0],M.machined,'x',22);
    for(let i=0;i<12;i++){
      const a=i*Tau/12;
      const rib=box(g,[.092,.010,.010],[-.008,.059*Math.cos(a),.059*Math.sin(a)],M.machined,.003);
      rib.rotation.x=a;
      cylinder(g,.004,.004,[.072,.044*Math.cos(a),.044*Math.sin(a)],M.dark,'x',12);
    }
    box(g,[.086,.031,.024],[-.014,-.059,0],M.alloy,.006);
    box(g,[.074,.023,.026],[-.024,.026,-.055],M.alloy,.004);
  },'fan_belt');
  part('alternator-pulley','Alternator belt pulley',[1.755,.433,-.224],g=>{
    lathe(g,[[0,-.009],[.038,-.009],[.038,-.006],[.031,-.003],[.031,.003],[.038,.007],[.037,.011],
      [.011,.011],[.011,.015],[0,.015]],M.machined,'x',36);
  },'fan_belt');
  part('crank-pulley','Crankshaft drive pulley',[1.734,.422,-.043],g=>{
    lathe(g,[[0,-.025],[.072,-.025],[.076,-.004],[.072,.009],[.075,.014],[.068,.016],[.068,.025],
      [.075,.027],[.073,.031],[.028,.033],[.025,.013],[0,.013]],M.dark,'x',46);
    cylinder(g,.018,.007,[.022,0,0],M.machined,'x',6);
  },'belt_drive_vibration_damper');

  const coverAt=[1.701,.640,-.046];
  const capAt=[1.738,.718,-.046], dustAt=[1.710,.718,-.046];
  part('timing-cover','Upper timing-belt cover',coverAt,g=>{
    const side=[[-.085,-.080],[-.088,.065],[-.059,.084],[.059,.078],[.113,.061],[.133,.026],
      [.134,-.023],[.116,-.050],[.075,-.081]];
    disk(g,side,[[.078,0,.039]],[0,0,0],.009,M.alloy);
    ring(g,.049,.038,.018,[.007,.078,0],M.alloy,'x',36);
    tube(g,side.concat([side[0]]).map(([y,z])=>[-.003,y,z]),.003,M.dark,23);
    for(const z of [-.066,.061])box(g,[.008,.115,.006],[.003,-.025,z],M.machined,.001);
  },timing,['11311713475','11311287699']);
  for(const [i,[y,z]] of [[-.052,-.064],[-.061,.065],[.094,.051]].entries()){
    part('cover-bolt-'+(i+1),'Upper timing cover bolt '+(i+1),add(coverAt,.007,y,z),g=>screw(g,.006,.016),timing);
  }
  part('distributor-cap','Distributor cap and lead sockets',capAt,g=>{
    lathe(g,[[.037,-.018],[.044,-.015],[.048,-.010],[.047,.009],[.039,.021],
      [.027,.023],[.026,.014],[.036,.012],[.039,-.018],[.037,-.018]],capMaterial,'x',38);
    for(let i=0;i<7;i++){
      const a=i*Tau/6,r=i===6?0:.033;
      ring(g,.008,.004,.018,[.026,r*Math.cos(a),r*Math.sin(a)],capMaterial,'x',20);
      cylinder(g,.002,.007,[.018,r*Math.cos(a),r*Math.sin(a)],brass,'x',10);
    }
    for(let i=0;i<3;i++){
      const a=i*Tau/3;
      const y=Math.cos(a)*.043,z=Math.sin(a)*.043;
      cylinder(g,.006,.010,[.006,y,z],capMaterial,'x',18);
      cylinder(g,.0046,.005,[.014,y,z],M.machined,'x',6);
    }
  },ignition,['12111715905','12111725070']);
  part('ignition-rotor','Distributor rotor',add(dustAt,.015,0,0),g=>{
    ring(g,.018,.007,.012,[0,0,0],capMaterial,'x',30);
    box(g,[.012,.037,.013],[.008,.012,0],capMaterial,.003);
    box(g,[.004,.013,.010],[.016,.028,0],brass,.001);
    for(let i=0;i<3;i++){
      const a=i*Tau/3;
      ring(g,.004,.0015,.003,[.010,.013*Math.cos(a),.013*Math.sin(a)],M.steel,'x',16);
    }
  },ignition,['12111715906','12111734110']);
  part('distributor-shield','Distributor dust shield',dustAt,g=>{
    ring(g,.040,.009,.006,[0,0,0],M.plastic,'x',42);
    ring(g,.040,.038,.007,[-.004,0,0],M.rubber,'x',42);
  },ignition,['12111710553']);
  part('tensioner-spring','Timing-belt tensioner spring',[1.687,.618,.045],g=>{
    const spring=new Group();
    coiled(spring,.005,.030,6,.00105,M.steel);
    spring.rotation.z=Math.PI*.47;
    g.add(spring);
  },timing,['11311267746']);
  part('tensioner-pin','Timing-belt tensioner guide pin',[1.687,.607,.045],g=>{
    cylinder(g,.0028,.031,[0,0,0],M.machined,'y',18);
    cylinder(g,.0045,.0039,[0,-.014,0],M.steel,'y',20);
  },timing,['11311280960']);

  part('thermostat-body','M20 thermostat housing',add(thermostatCenter,-.032,0,0),g=>{
    const flange=outline(thermostatMount).map(([y,z])=>[y*.95,z*.95]);
    disk(g,flange,[[0,0,.024],...thermostatMount.map(([y,z])=>[y,z,.0034])],[.027,0,0],.011,M.alloy);
    lathe(g,[[.023,-.042],[.039,-.038],[.042,-.027],[.035,.014],[.032,.025],[.024,.025],[.023,-.042]],M.alloy,'x',36);
    hollowNeck(g,[.010,-.027,.006],relative(lowerStat,add(thermostatCenter,-.032,0,0)),.018);
    hollowNeck(g,[-.004,-.027,.016],relative(pumpStat,add(thermostatCenter,-.032,0,0)),.017);
    for(const z of [-.019,.015]){
      cylinder(g,.008,.013,[-.018,.041,z],brass,'y',6);
      cylinder(g,.006,.006,[-.018,.050,z],M.dark,'y',16);
    }
  },stat,['11531730470']);
  part('thermostat-cover','Thermostat cover',thermostatCenter,g=>{
    disk(g,outline(thermostatMount),[[0,0,.027],...thermostatMount.map(([y,z])=>[y,z,.0034])],[.007,0,0],.013,M.alloy);
    lathe(g,[[.026,.006],[.034,.008],[.033,.020],[.028,.029],[.021,.037],[.020,.042],[.0175,.042],[.0175,.034],[.022,.026],[.026,.006]],M.alloy,'x',40);
    hollowNeck(g,[.033,0,0],relative(thermostatHose,thermostatCenter),.020);
  },stat,['11531265059']);
  part('thermostat','M20 thermostat',add(thermostatCenter,-.003,0,0),thermostatValve,stat,['11531710953','11531713040']);
  part('thermostat-seal','Thermostat O-ring',thermostatCenter,g=>seal(g,.03175,.00175),stat,['11531265084']);
  thermostatMount.forEach(([y,z],i)=>part('thermostat-bolt-'+(i+1),'Thermostat cover bolt '+(i+1),add(thermostatCenter,.014,y,z),g=>screw(g,.006,.025),stat,['07119913589']));
  part('bleed-screw','Thermostat housing bleed screw',[1.665,.730,-.177],g=>{
    cylinder(g,.004,.010,[0,-.006,0],brass,'y',16);
    cylinder(g,.0062,.004,[0,0,0],brass,'y',6);
    box(g,[.009,.0006,.0015],[0,.0021,0],M.dark,.0002);
  },stat,['11531275881']);

  const crossA=[1.771,.644,-.110], crossB=[1.776,.622,.160];
  part('coolant-cross-pipe','Steel coolant cross-pipe',crossA,g=>{
    tube(g,local([crossA,[1.770,.628,-.048],[1.772,.624,.059],crossB],crossA),.016,M.dark,15);
    for(const end of [crossA,crossB]) {
      const p=relative(end,crossA);
      ring(g,.0178,.014,.004,p,M.dark,'z',28);
    }
    for(const z of [-.061,.091])box(g,[.012,.031,.025],relative([1.751,.618,z],crossA),M.steel,.003);
  },hoses,['11531719788']);
  for(const [i,z] of [-.061,.091].entries())part('cross-pipe-bolt-'+(i+1),'Coolant cross-pipe bolt '+(i+1),[1.755,.607,z],g=>screw(g,.006,.016),hoses,['07119904357']);
  hose(part,'upper-hose','Upper radiator hose',[thermostatHose,[1.786,.684,-.213],[1.801,.695,-.282],[1.839,.698,-.321],[1.864,.698,-.321]],.021,hoses,['11531722218']);
  clamp(part,'upper-hose-clamp','Upper radiator hose clamp',thermostatHose,[1.786,.684,-.213],.021,hoses,['11531714433']);
  hose(part,'pump-return-hose','Thermostat to water-pump hose',[pumpPort,[1.719,.548,-.083],[1.701,.570,-.133],pumpStat],.018,hoses,['11531287651']);
  hose(part,'pump-feed-hose','Expansion-tank to water-pump hose',[feedPort,[1.675,.468,.166],[1.600,.438,.255],[1.528,.435,-.310],[1.691,.524,-.556],[1.722,.581,-.637]],.011,hoses);
  clamp(part,'pump-return-clamp','Pump return hose clamp',pumpPort,[1.719,.548,-.083],.018,hoses);
  clamp(part,'pump-feed-clamp','Pump feed hose clamp',feedPort,[1.675,.468,.166],.011,hoses);
  hose(part,'cross-pipe-thermostat-hose','Cross-pipe to thermostat hose',[crossA,[1.750,.639,-.139],lowerStat],.019,hoses,['11531718982']);
  hose(part,'cross-pipe-radiator-hose','Lower radiator hose',[crossB,[1.788,.554,.226],[1.800,.438,.278],[1.840,.412,.318],[1.868,.411,.323]],.020,hoses,['11531718980']);
}

function e34Cooling(part) {
  const pump='water_pump_thermostat',hoses='cooling_system_water_hoses';
  const stat=[1.530,.657,.024];
  part('pump-o-ring','Water pump O-ring',[1.525,.547,0],g=>seal(g,.0365,.0025),pump,['11511711484']);
  part('thermostat','M50 thermostat',add(stat,-.008,0,0),thermostatValve,pump,['11537511580','11537511083']);
  part('thermostat-seal','Thermostat O-ring',add(stat,-.005,0,0),g=>seal(g,.03175,.00175),pump,['11531265084']);
  part('thermostat-profile-seal','Late thermostat housing profile gasket',stat,g=>{
    const profile=[[-.033,-.021],[-.034,.023],[-.017,.037],[.021,.038],[.034,.025],[.036,-.022],[.016,-.038],[-.016,-.036]];
    const path=profile.map(([y,z])=>[0,y,z]);
    const geometry=new TubeGeometry(new CatmullRomCurve3(path.map(p=>new Vector3(...p)),true),40,.0017,7,true);
    mesh(g,geometry,M.rubber);
  },pump,['11531740437']);
  const mounts=[[.029,-.022],[.029,.020],[-.028,-.026]];
  mounts.forEach(([y,z],i)=>part('thermostat-bolt-'+(i+1),'Thermostat housing bolt '+(i+1),add(stat,.016,y,z),g=>screw(g,.006,.025),pump,['11531740317']));
  const bracket=add(stat,.022,-.028,.020);
  part('thermostat-bracket-bolt','Lifting bracket bolt',bracket,g=>screw(g,.008,.030,.013),pump,['11531740316']);
  part('thermostat-lifting-bracket','Front engine lifting bracket',add(bracket,-.004,0,0),g=>{
    tube(g,[[0,0,0],[-.012,.012,.015],[-.020,.035,.025]],.0055,M.steel,8);
    ring(g,.012,.006,.004,[-.020,.042,.025],M.steel,'x',26);
    ring(g,.008,.0042,.003,[0,0,0],M.steel,'x',24);
  },pump);
  part('thermostat-ground','Engine ground terminal',add(bracket,.001,0,0),g=>{
    ring(g,.007,.0042,.002,[0,0,0],brass,'x',20);
    tube(g,[[0,0,.007],[-.006,-.006,.023],[-.036,-.013,.030]],.0026,M.dark,10);
  },pump);
  clamp(part,'upper-hose-clamp','Upper radiator hose clamp',[1.621,.665,-.039],[1.652,.672,-.066],.022,hoses,['07129952121']);
  clamp(part,'lower-hose-clamp','Lower radiator hose clamp',[1.617,.614,.115],[1.645,.592,.148],.022,hoses,['07129952121']);
  part('expansion-tank','Radiator-mounted coolant expansion tank',[1.788,.543,.305],g=>{
    lathe(g,[[0,-.189],[.033,-.189],[.036,-.173],[.039,.155],[.034,.166],[.024,.166],
      [.024,.186],[.021,.186],[.021,.163],[.035,.152],[.032,-.187],[0,-.187]],M.reservoir,'y',36);
    ring(g,.037,.031,.004,[0,-.180,0],M.rubber,'y',30);
    cylinder(g,.030,.016,[0,.194,0],M.plastic,'y',30);
    for(let i=0;i<12;i++){
      const a=i*Tau/12;
      const rib=box(g,[.004,.012,.004],[.028*Math.cos(a),.195,.028*Math.sin(a)],M.edge,.0008);
      rib.rotation.y=-a;
    }
    box(g,[.070,.008,.105],[.015,.177,-.016],M.plastic,.004);
    box(g,[.004,.007,.031],[-.040,.071,0],M.machined,.001);
  },'radiator',['17111712835']);
  part('bleed-screw','Radiator expansion tank bleed screw',[1.821,.725,.257],g=>{
    cylinder(g,.004,.012,[0,-.006,0],M.plastic,'y',16);
    cylinder(g,.007,.004,[0,.001,0],M.plastic,'y',24);
    box(g,[.011,.0006,.0022],[0,.0032,0],M.edge,.0001);
  },'radiator',['17111712788']);
}

export function buildCoolantService(series,part) {
  const e30=series==='e30';
  if(e30)e30Cooling(part);
  else e34Cooling(part);
  const center=e30?[1.784,.548,.057]:[1.627,.547,0];
  for(let i=0;i<4;i++){
    const a=Math.PI/4+i*Math.PI/2;
    part('pulley-bolt-'+(i+1),'Water pump pulley bolt '+(i+1),add(center,0,pumpPitch*Math.cos(a),pumpPitch*Math.sin(a)),
      g=>screw(g,.006,e30?.010:.016),'cooling_system_fan_fan_coupling',e30?['07119904633']:['07119904524','07119903844']);
  }
}
