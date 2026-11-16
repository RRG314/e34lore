import {Vector3} from 'three';
import {visualMaterials as M, box, cylinder, lathe, ring, surface, tube} from './525i-visual-details.mjs';
import {along, loft, pin} from './525i-fabrication.mjs';
import {bayScope, engineMountFoot, frontMount, frontScope, origin, rearMount, rearScope} from './525i-suspension.mjs';

const catalogBase = 'https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/';
export const engineBaySources = Object.fromEntries([
  ['cover','Cylinder head cover and upper trim','engine/cylinder_head_cover'],
  ['intake','Six-runner intake manifold','engine/intake_manifold_system'],
  ['throttle','Throttle housing and cable bracket','fuel_system/throttle_housing_assy'],
  ['airbox','Intake silencer, filter and spring clips','fuel_system/intake_silencer_filter_cartridge'],
  ['meter','Hot-film air mass meter','fuel_system/mass_air_flow_sensor'],
  ['mount','Engine brackets and rubber mounts','engine/engine_suspension_damper'],
  ['belt','Water pump and alternator belt drive','engine/belt_drive_water_pump_alternator'],
  ['alternator','Alternator housing and internal parts','engine_electrical_system/alternator_individual_parts'],
  ['washer','Windshield washer fluid container and pump','vehicle_electrical_system/single_parts_for_windshield_cleaning'],
  ['brake','Brake master cylinder and fluid tank','brakes_pedals/brake_master_cylinder_expansion_tank'],
  ['booster','Vacuum brake servo and check valve','brakes_pedals/power_brake_unit_depression'],
  ['steeringTank','Power-steering reservoir, cap and clamp','steering_drive_shaft/oil_carrier_single_parts'],
  ['steeringLines','Hydraulic steering hoses and pipes','steering_drive_shaft/hydro_steering_oil_pipes'],
  ['heater','Heater valve and coolant hoses','heater_and_air_conditioning/water_valve_water_hose'],
  ['harness','Engine wiring harness and connectors','engine_electrical_system/engine_wiring_harness'],
].map(([key,title,path])=>[key,{title,url:catalogBase+path+'.html'}]));
engineBaySources.installed = {
  title:'Installed E34 M50 engine bay · Beemwej',
  url:'https://commons.wikimedia.org/wiki/File:BMW_525i_M50_PL.JPG',
};
const catalog = {
  mount:'fe973d7fffdeebc7524e5ff8', washer:'ab2616886e7c0aa463167b0a',
  brake:'652210724f3812f0caa9db17', booster:'3832f92da718a566c7f4815d',
  belt:'32741e4c4f3a37ccb08fefa2', steeringTank:'b8ad3547a1a25d244b87d4a5',
  airbox:'c973ce2562754c1cfb37eada', meter:'73b9c7753a3c7a683351e3a6',
};
const sources = (...keys) => ({visualSources:keys.map(key=>engineBaySources[key])});
const refs = (key, ...numbers) => ({
  ...sources(key,'installed'),
  catalog:['catalog-assembly-'+catalog[key],...numbers],
});
const bay = (system, settings={}) => ({matrix:origin,systems:[system,bayScope],...settings});
const keep = (...keys) => ({keepBinding:true,...sources(...keys)});

export const airboxShift = [.235,-.042,-.010];
const airboxCenter = [1.545,.673,-.430];
const airOutlet = [1.378,.749,-.402];
const throttleCenter = [1.214,.716,-.241];
const elbowStart = [1.299,.746,-.402];
const elbowEnd = [1.214,.716,-.305];

function clamp(g,a,b,r) {
  along(g,a,b,(f,l)=>{
    ring(f,r+.002,r,.009,[0,l/2,0],M.steel,'y',36);
    box(f,[.015,.015,.006],[0,l/2,r],M.machined,.002);
  });
}

function addCovers(collect) {
  collect('m50:valve-cover','M50 cylinder head cover and gasket flange',g=>{
    loft(g,[[[-.317,.373,0],.103,.020],[[-.302,.377,0],.124,.025],
      [[-.264,.379,0],.126,.028],[[.241,.379,0],.126,.028],
      [[.279,.378,0],.124,.031],[[.315,.372,0],.105,.024]],M.plastic,{sides:28,roundness:.37});
    loft(g,[[[-.321,.353,0],.107,.005],[[-.302,.353,0],.129,.005],
      [[.293,.353,0],.129,.005],[[.321,.353,0],.108,.005]],M.edge,{roundness:.28});
    for(const z of [-.121,.121])for(let i=0;i<8;i++){
      const x=-.278+i*.0794;
      cylinder(g,.010,.019,[x,.361,z],M.plastic,'y',20);
      ring(g,.0105,.006,.003,[x,.374,z],M.rubber,'y',20);
    }
    ring(g,.033,.022,.012,[-.214,.407,.058],M.edge,'y',36);
  },keep('cover','installed'));
  collect('m50:coil-cover','M50 ribbed ignition cover',g=>{
    loft(g,[[[-.299,.414,.032],.077,.007],[[-.282,.421,.032],.087,.014],
      [[.240,.421,.032],.086,.014],[[.270,.411,.032],.077,.009]],M.plastic,{roundness:.35});
    for(let i=0;i<6;i++){
      const z=.026+i*.011;
      for(const [x,length] of [[-.171,.214],[.139,.220]])box(g,[length,.0026,.004],[x,.435,z],M.machined,.001);
    }
    for(const x of [-.137,.152]){
      ring(g,.011,.006,.003,[x,.435,-.026],M.edge,'y',24);
      cylinder(g,.005,.004,[x,.437,-.026],M.steel,'y',6);
    }
    loft(g,[[[-.291,.419,-.082],.025,.006],[[-.272,.424,-.082],.028,.010],
      [[.239,.424,-.082],.028,.010],[[.261,.419,-.082],.024,.006]],M.plastic,{roundness:.36});
    for(let i=0;i<4;i++)box(g,[.514,.0023,.0035],[-.017,.435,-.099+i*.010],M.machined,.001);
  },keep('cover','installed'));
}

function addIntake(collect) {
  collect('m50:intake-plenum','M50 moulded intake plenum',g=>{
    loft(g,[[[.893,.708,-.195],.029,.040],[[.921,.714,-.190],.062,.064],
      [[1.02,.716,-.182],.070,.071],[[1.385,.716,-.179],.071,.071],
      [[1.464,.711,-.181],.052,.055],[[1.483,.705,-.181],.024,.033]],M.plastic,{roundness:.52});
    for(const x of [.96,1.05,1.145,1.29,1.385,1.437]){
      loft(g,[[[x,.651,-.199],.008,.007],[[x,.666,-.235],.008,.007],
        [[x,.718,-.249],.008,.007],[[x,.767,-.225],.008,.007]],M.edge,{sides:12,up:[1,0,0]});
    }
    ring(g,.051,.036,.010,throttleCenter,M.edge,'z',36);
  },bay('system:intake',keep('intake','installed')));
  for(let i=1;i<=6;i++){
    const x=1.4275-(i-1)*.091;
    collect('m50:intake-runner:'+i,'Intake manifold runner '+i,g=>{
      loft(g,[
        [[x,.736,-.210],.032,.027],[[x,.771,-.169],.032,.027],
        [[x,.800,-.120],.032,.024],[[x,.810,-.062],.032,.021],
        [[x,.790,-.016],.030,.021],[[x,.744,.013],.028,.023],[[x,.698,.050],.028,.020],
      ],M.plastic,{wall:.003,sides:24});
      loft(g,[[[x,.708,.039],.039,.026],[[x,.696,.053],.039,.026]],M.edge,{wall:.003,sides:20});
    },bay('system:intake',keep('intake','installed')));
  }
  collect('m50:throttle-body','Throttle housing and cable quadrant',g=>{
    const [x,y,z]=throttleCenter;
    lathe(g,[[.034,-.063],[.040,-.063],[.042,-.050],[.041,-.037],[.048,-.031],[.049,-.008],
      [.044,0],[.034,0],[.034,-.063]],M.alloy,'z',44).position.set(x,y,z);
    ring(g,.046,.036,.006,[x,y,z-.059],M.machined,'z',40);
    pin(g,[x-.052,y,z-.023],[x+.059,y,z-.023],.0045);
    const blade=cylinder(g,.033,.003,[x,y,z-.023],M.steel,'z',36);
    blade.rotation.y=.22;
    cylinder(g,.025,.015,[x+.052,y,z-.023],M.dark,'x',28);
    box(g,[.023,.049,.043],[x-.051,y,z-.019],M.plastic,.008);
    for(const dx of [-.041,.041])for(const dy of [-.032,.032]){
      cylinder(g,.010,.017,[x+dx,y+dy,z-.013],M.alloy,'z',20);
      cylinder(g,.005,.010,[x+dx,y+dy,z-.025],M.machined,'z',6);
    }
    tube(g,[[x+.063,y,z-.023],[x+.091,y+.038,z-.020],[x+.082,y+.073,z-.067],
      [x-.107,y+.091,z-.118],[.900,.775,-.287],[.746,.755,-.294]],.0045,M.rubber,32);
  },bay('system:intake',keep('throttle','intake','installed')));
  collect('m50:intake-boot','Meter-to-throttle intake bellows',g=>{
    const path=[elbowStart,[1.266,.746,-.400],[1.234,.740,-.381],
      [1.214,.727,-.345],elbowEnd];
    const stations=path.map((p,i)=>[p,i===0?.039:.037,i===0?.039:.036]);
    loft(g,stations,M.rubber,{wall:.003,roundness:1,sides:32});
    for(let i=1;i<9;i++){
      const j=i<=4?1:2, t=(i<=4?i:i-4)/5;
      const a=new Vector3(...path[j-1]), b=new Vector3(...path[j]);
      const q=a.clone().lerp(b,t), tip=q.clone().add(b.clone().sub(a).normalize().multiplyScalar(.003));
      along(g,q.toArray(),tip.toArray(),f=>{
        lathe(f,[[.036,-.003],[.039,-.003],[.043,0],[.041,.003],[.036,.003],[.036,-.003]],M.rubber,'y',32);
      });
    }
    clamp(g,path[0],path[1],.039);
    clamp(g,path[4],path[3],.038);
  },bay('system:intake',keep('meter','installed')));
  collect('e34sys:intake-boot-maf','Hot-film air mass meter',g=>{
    along(g,elbowStart,airOutlet,(f,l)=>{
      lathe(f,[[.034,-.008],[.039,-.008],[.040,.010],[.045,.017],[.045,l-.014],
        [.040,l-.006],[.039,l+.008],[.034,l+.008],[.034,-.008]],M.plastic,'y',40);
      ring(f,.041,.034,.004,[0,l*.22,0],M.steel,'y',36);
      box(f,[.059,.053,.030],[0,l*.55,-.040],M.edge,.007);
      box(f,[.033,.024,.033],[.034,l*.54,-.044],M.plastic,.004);
      for(let i=0;i<5;i++)box(f,[.002,.018,.055],[-.024+i*.012,l*.59,-.052],M.edge,.001);
    });
  },bay('system:intake',{keepBinding:true,...refs('meter','13621747155')}));
  collect('e34sys:airbox','Air cleaner housing with five spring clips',g=>{
    const [x,y,z]=airboxCenter, a=x-.174, b=x+.174;
    box(g,[.350,.010,.224],[x,y-.080,z],M.plastic,.009);
    for(const d of [-.112,.112])box(g,[.346,.125,.010],[x,y-.015,z+d],M.plastic,.007);
    // The front wall surrounds the intake aperture instead of capping the snorkel.
    for(const d of [-.089,.089])box(g,[.009,.125,.054],[b,y-.015,z+d],M.plastic,.004);
    for(const h of [-.061,.026])box(g,[.009,.040,.126],[b,y+h,z],M.plastic,.004);
    box(g,[.009,.119,.223],[a,y-.018,z],M.plastic,.008);
    for(const d of [-.118,.118])box(g,[.349,.009,.012],[x,y+.049,z+d],M.edge,.004);
    for(const [dx,d] of [[-.11,-1],[0,-1],[.11,-1],[-.11,1],[.11,1]]){
      const p=z+d*.122;
      box(g,[.019,.028,.004],[x+dx,y+.044,p],M.steel,.002);
      tube(g,[[x+dx-.008,y+.052,p],[x+dx,y+.062,p+d*.003],[x+dx+.008,y+.052,p]],.002,M.machined,8);
    }
    for(const dx of [-.113,.107])cylinder(g,.015,.038,[x+dx,y-.094,z+.052],M.rubber,'y',24);
    box(g,[.285,.020,.195],[x,y-.117,z+.024],M.dark,.006);
  },bay('system:intake',{keepBinding:true,...refs('airbox','13711735344')}));
  collect('e34sys:airbox-lid','Ribbed air cleaner lid and meter outlet',g=>{
    const [x,y,z]=airboxCenter;
    loft(g,[[[x-.174,y+.066,z],.102,.011],[[x-.162,y+.072,z],.121,.022],
      [[x+.148,y+.071,z],.121,.021],[[x+.173,y+.066,z],.105,.012]],M.plastic,{roundness:.36});
    for(let i=0;i<8;i++)box(g,[.011,.008,.209],[x-.141+i*.039,y+.094,z],M.edge,.004);
    const junction=[x-.153,y+.068,airOutlet[2]];
    loft(g,[[airOutlet,.039,.038],[junction,.039,.037],[[x-.118,y+.053,airOutlet[2]],.039,.032]],
      M.plastic,{wall:.003,roundness:.95});
    for(const d of [-.108,.108])box(g,[.345,.018,.016],[x,y+.055,z+d],M.edge,.004);
  },bay('system:intake',keep('airbox','installed')));
  collect('e34sys:fresh-air-snorkel','Fresh-air duct from front panel to airbox',g=>{
    loft(g,[[[1.707,.656,-.430],.061,.035],[[1.768,.657,-.431],.062,.035],
      [[1.832,.652,-.439],.071,.032],[[1.905,.659,-.439],.080,.031]],
      M.plastic,{wall:.0035,roundness:.36});
    for(const z of [-.509,-.369])box(g,[.033,.012,.015],[1.884,.681,z],M.edge,.002);
  },bay('system:intake',keep('airbox','installed')));
}

function addMounts(collect) {
  for(const [side,suffix,label] of [[-1,'1','Left'],[1,'-1','Right']]){
    const p = ([x,y,z]) => [x,y,z*side], foot=engineMountFoot(side);
    const id = 'e34bay:engine-mount-'+suffix;
    const opts = {parentId:'m50:block',...bay('system:engine')};
    collect(id,label+' rubber engine mount',g=>{
      const [x,y,z]=foot;
      lathe(g,[[0,0],[.040,0],[.047,.008],[.048,.020],[.046,.049],[.038,.059],[.024,.062],[0,.062]],
        M.rubber,'y',44).position.fromArray(foot);
      cylinder(g,.046,.009,[x,y+.006,z],M.steel,'y',40);
      cylinder(g,.035,.008,[x,y+.061,z],M.steel,'y',40);
      cylinder(g,.007,.088,[x,y+.032,z],M.machined,'y',20);
      cylinder(g,.010,.010,[x,y+.077,z],M.machined,'y',6);
    },{...opts,...refs('mount','11811133364','11811138879')});
    collect('e34bay:engine-bracket-'+suffix,label+' cast engine support bracket',g=>{
      const flange=p([1.158,.468,side<0?.107:.185]);
      const end=[foot[0],foot[1]+.067,foot[2]];
      loft(g,[[flange,.073,.043],[p([1.154,.452,.228]),.065,.028],
        [p([1.154,.411,.318]),.055,.022],[end,.033,.009]],M.alloy,{sides:20});
      for(const dx of [-.046,.046]){
        tube(g,[[flange[0]+dx,.500,flange[2]],[1.155+dx,.451,side*.258],
          [1.163+dx*.6,.401,side*.344],[end[0]+dx*.45,end[1]+.008,end[2]]],.007,M.alloy,22);
        for(const y of [.429,.505])cylinder(g,.009,.014,[flange[0]+dx,y,flange[2]+side*.017],M.machined,'z',6);
      }
      ring(g,.034,.008,.009,end,M.alloy,'y',36);
    },{...opts,...refs('mount',side<0?'11811136537':'11811135948')});
  }
}

function addAccessories(collect) {
  collect('m50:alternator','Vented alternator with stator and mounting ears',g=>{
    const y=.058,z=-.185;
    for(const x of [.275,.381])ring(g,.059,.018,.009,[x,y,z],M.alloy,'x',44);
    ring(g,.050,.039,.086,[.329,y,z],M.dark,'x',44);
    cylinder(g,.027,.116,[.333,y,z],M.steel,'x',32);
    const copper=M.seam;
    for(let i=0;i<14;i++){
      const a=i*Math.PI/7, yy=Math.cos(a),zz=Math.sin(a);
      tube(g,[[.284,y+yy*.041,z+zz*.041],[.290,y+yy*.048,z+zz*.048],
        [.366,y+yy*.048,z+zz*.048],[.373,y+yy*.041,z+zz*.041]],.004,copper,12);
      const rib=box(g,[.104,.010,.009],[.327,y+yy*.056,z+zz*.056],M.alloy,.003);
      rib.rotation.x=a;
    }
    for(const [yy,zz] of [[.053,-.018],[-.056,.029]]){
      ring(g,.018,.0065,.025,[.292,y+yy,z+zz],M.alloy,'x',32);
      pin(g,[.270,y+yy,z+zz],[.313,y+yy,z+zz],.006);
    }
    cylinder(g,.010,.026,[.393,y,z],M.machined,'x',24);
    box(g,[.017,.032,.030],[.265,y+.023,z-.010],M.plastic,.005);
  },keep('alternator','belt'));
  collect('m50:belt-tensioner','Mechanical belt tensioner and pulley',g=>{
    const at=[.373,.065,-.088];
    lathe(g,[[.007,-.027],[.033,-.027],[.043,-.019],[.043,.013],[.039,.020],
      [.021,.022],[.007,.022],[.007,-.027]],M.alloy,'x',40).position.fromArray(at);
    ring(g,.030,.010,.018,[.410,.065,-.088],M.dark,'x',40);
    ring(g,.020,.008,.020,[.411,.065,-.088],M.machined,'x',36);
    cylinder(g,.009,.017,[.422,.065,-.088],M.machined,'x',6);
    for(const [y,z] of [[.103,-.104],[.026,-.062]])ring(g,.012,.0045,.018,[.363,y,z],M.alloy,'x',28);
  },{keepBinding:true,...refs('belt','11281427252'),note:'Mechanical tensioner shown. The catalog also lists hydraulic assemblies.'});
}

function addBodyAndServices(collect) {
  for(const [side,suffix,label] of [[-1,'1','Left'],[1,'-1','Right']]){
    const p=([x,y,z])=>[x,y,z*side];
    const tower=frontMount(side);
    collect('e34bay:front-tower-'+suffix,label+' front strut tower',g=>{
      lathe(g,[[.061,.003],[.088,.004],[.104,-.011],[.130,-.052],[.142,-.103],
        [.149,-.153],[.146,-.157],[.139,-.106],[.126,-.056],[.100,-.015],[.061,-.005],[.061,.003]].reverse(),
        M.dark,'y',60).position.fromArray(tower);
    },{parentId:'e34sys:body',...bay('system:body'),systems:['system:body',bayScope,frontScope],...sources('installed')});
    collect('e34bay:front-apron-'+suffix,label+' front wheelhouse and inner apron',g=>{
      loft(g,[[p([.749,.706,.600]),.061,.033],[p([.974,.724,.617]),.069,.043],
        [p([1.266,.716,.622]),.074,.049],[p([1.512,.687,.650]),.065,.045],
        [p([1.822,.629,.660]),.061,.033],[p([1.913,.622,.633]),.051,.024]],M.dark,
        {sides:20,roundness:.36});
      const stations=18, span=8, points=[], indices=[];
      for(const skin of [0,1])for(let i=0;i<=stations;i++)for(let j=0;j<=span;j++){
        const t=i/stations, s=j/span;
        const x=.812+t*1.073;
        const arch=Math.sqrt(Math.max(0,.348**2-(x-1.3805)**2));
        const high=.623+arch*.40, low=.397+arch*.17;
        const y=low+(high-low)*s;
        const z=.495+.141*s+.019*Math.sin(Math.PI*s)*Math.sin(Math.PI*t)+skin*.003;
        points.push(p([x,y,z]));
      }
      const layer=(stations+1)*(span+1);
      for(let i=0;i<stations;i++)for(let j=0;j<span;j++){
        const a=i*(span+1)+j,b=a+span+1;
        indices.push(a,b,a+1,a+1,b,b+1,layer+a,layer+a+1,layer+b,layer+a+1,layer+b+1,layer+b);
      }
      surface(g,points,indices,M.dark);
      tube(g,[p([.832,.429,.495]),p([1.083,.443,.495]),p([1.310,.455,.495]),
        p([1.601,.439,.496]),p([1.862,.405,.495])],.006,M.steel,24);
      tube(g,[p([.788,.729,.642]),p([1.071,.766,.668]),p([1.358,.755,.681]),
        p([1.663,.702,.692]),p([1.906,.643,.669])],.004,M.seam,32);
    },{parentId:'e34sys:body',...bay('system:body'),...sources('installed')});
    collect('e34chassis:rear-tower-'+suffix,label+' rear upper damper tower',g=>{
      lathe(g,[[.052,.004],[.078,.004],[.096,-.014],[.112,-.060],[.130,-.115],
        [.126,-.115],[.108,-.064],[.091,-.017],[.052,-.004],[.052,.004]].reverse(),M.dark,'y',48)
        .position.fromArray(rearMount(side));
      loft(g,[[p([-1.38,.807,.625]),.086,.022],[p([-1.59,.861,.561]),.100,.032],
        [p([-1.77,.782,.644]),.072,.029]],M.dark,{roundness:.55});
    },{parentId:'e34sys:body',matrix:origin,systems:['system:body',rearScope]});
  }
  collect('e34chassis:rear-package-tray','Rear parcel shelf above the damper mounts',g=>{
    loft(g,[[[-1.306,1.049,0],.592,.010],[[-1.358,1.049,0],.634,.014],
      [[-1.574,1.048,0],.638,.014],[[-1.732,1.041,0],.622,.012],
      [[-1.773,1.039,0],.576,.009]],M.plastic,{sides:28,roundness:.28});
    for(const z of [-.458,.458]){
      const speaker=[-1.488,1.065,z];
      cylinder(g,.070,.006,speaker,M.edge,'y',36);
      for(let i=-4;i<=4;i++){
        const dx=i*.011;
        const width=Math.sqrt(.060**2-dx**2)*2;
        box(g,[.003,.0018,width],[-1.488+dx,1.068,z],M.plastic,.0004);
      }
    }
  },{parentId:'e34sys:interior',matrix:origin,systems:['system:interior','system:body']});
  collect('e34bay:radiator-support','Upper radiator support and hood catches',g=>{
    loft(g,[[[1.88,.657,-.654],.045,.015],[[1.896,.701,-.519],.050,.018],
      [[1.9,.730,-.310],.040,.019],[[1.902,.741,0],.038,.017],
      [[1.9,.730,.310],.040,.019],[[1.896,.701,.519],.050,.018],[[1.88,.657,.654],.045,.015]],
      M.dark,{roundness:.39});
    for(const z of [-.472,.472]){
      box(g,[.065,.033,.062],[1.885,.723,z],M.steel,.006);
      ring(g,.015,.008,.009,[1.881,.743,z],M.dark,'y',24);
      for(const d of [-.023,.023])cylinder(g,.005,.007,[1.883,.741,z+d],M.machined,'y',6);
    }
  },{parentId:'e34sys:body',...bay('system:body'),...sources('installed')});
  collect('e34bay:cowl','Cowl grille and firewall seal',g=>{
    loft(g,[[[.756,.838,-.655],.037,.016],[[.748,.861,-.451],.049,.021],
      [[.742,.868,0],.051,.021],[[.748,.861,.451],.049,.021],[[.756,.838,.655],.037,.016]],
      M.plastic,{roundness:.38});
    for(let i=0;i<40;i++){
      const z=-.575+i*.0295;
      box(g,[.055,.004,.006],[.748,.887-.036*(z/.67)**2,z],M.edge,.0015);
    }
    tube(g,[[.797,.854,-.650],[.796,.872,-.42],[.794,.886,0],
      [.796,.872,.42],[.797,.854,.650]],.006,M.rubber,32);
  },{parentId:'e34sys:body',...bay('system:body'),...sources('installed')});
  collect('e34sys:brake-booster-master','Vacuum brake booster and master cylinder',g=>{
    const y=.702,z=-.468;
    lathe(g,[[0,.748],[.070,.748],[.107,.761],[.113,.778],[.113,.818],
      [.107,.835],[.083,.845],[.032,.849],[0,.849]],M.dark,'x',52).position.set(0,y,z);
    ring(g,.116,.109,.008,[.799,y,z],M.steel,'x',48);
    lathe(g,[[.010,.845],[.034,.845],[.037,.855],[.024,.871],[.023,1.010],
      [.019,1.029],[.010,1.030],[.010,.845]],M.alloy,'x',40).position.set(0,y,z);
    for(const x of [.906,.976]){
      cylinder(g,.013,.035,[x,y+.028,z],M.rubber,'y',24);
      cylinder(g,.008,.020,[x,y+.009,z-.024],M.machined,'z',6);
      tube(g,[[x,y+.009,z-.031],[x,y+.025,z-.068],[x+.086,y-.028,z-.083],
        [1.04,.650,-.55]],.0025,M.steel,22);
    }
    tube(g,[[.823,.762,-.388],[.876,.753,-.348],[.969,.702,-.304],[1.024,.671,-.241]],.010,M.rubber,28);
    cylinder(g,.015,.020,[.869,.750,-.351],M.plastic,'y',26);
  },bay('system:braking',keep('brake','booster','installed')));
  collect('e34bay:brake-reservoir','Brake fluid reservoir and level switch',g=>{
    loft(g,[[[.866,.769,-.467],.028,.016],[[.890,.779,-.467],.042,.026],
      [[.983,.782,-.467],.045,.026],[[1.014,.777,-.467],.032,.020]],M.reservoir,{roundness:.38});
    box(g,[.126,.004,.084],[.947,.782,-.467],M.reservoir,.002);
    cylinder(g,.022,.022,[.935,.813,-.467],M.reservoir,'y',36);
    cylinder(g,.025,.013,[.935,.828,-.467],M.plastic,'y',32);
    for(const z of [-.487,-.447])box(g,[.044,.004,.004],[.935,.831,z],M.edge,.001);
    box(g,[.022,.013,.015],[.910,.829,-.467],M.plastic,.002);
  },{parentId:'e34sys:brake-booster-master',...bay('system:braking'),...refs('brake','34321158840','34321160492')});
  collect('e34bay:washer-tank','Windshield washer tank and pump',g=>{
    loft(g,[[[1.416,.647,.593],.063,.051],[[1.452,.648,.592],.078,.072],
      [[1.601,.630,.575],.084,.080],[[1.716,.611,.558],.079,.060],
      [[1.763,.599,.554],.055,.040]],M.reservoir,{roundness:.40});
    loft(g,[[[1.434,.657,.590],.075,.004],[[1.584,.648,.577],.086,.004],
      [[1.731,.629,.554],.074,.004]],M.reservoir,{roundness:.45});
    cylinder(g,.029,.047,[1.609,.718,.579],M.reservoir,'y',36);
    cylinder(g,.032,.013,[1.609,.744,.579],M.plastic,'y',36);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      cylinder(g,.003,.011,[1.609+.030*Math.cos(a),.744,.579+.030*Math.sin(a)],M.edge,'y',10);
    }
    cylinder(g,.017,.061,[1.496,.578,.649],M.plastic,'y',28);
    box(g,[.028,.020,.023],[1.496,.613,.649],M.plastic,.004);
    tube(g,[[1.496,.552,.658],[1.451,.575,.669],[1.39,.664,.692],
      [1.201,.740,.684],[.836,.806,.663]],.003,M.rubber,26);
  },{parentId:'e34sys:body',...bay('system:body'),...refs('washer','61671391590','61678359046')});
  collect('e34bay:steering-reservoir','Power steering fluid reservoir and support strap',g=>{
    const x=1.080,y=.691,z=-.395;
    lathe(g,[[0,-.040],[.043,-.040],[.047,-.033],[.047,.038],[.042,.047],[.033,.050],[0,.050]],
      M.plastic,'y',40).position.set(x,y,z);
    cylinder(g,.043,.017,[x,y+.056,z],M.plastic,'y',40);
    for(let i=0;i<20;i++){
      const a=i*Math.PI/10;
      cylinder(g,.002,.012,[x+.043*Math.cos(a),y+.057,z+.043*Math.sin(a)],M.edge,'y',10);
    }
    ring(g,.050,.047,.019,[x,y-.009,z],M.steel,'y',40);
    loft(g,[[[x,y-.014,z-.041],.017,.009],[[x,.655,-.483],.019,.008],[[x,.664,-.513],.015,.007]],M.dark);
    for(const offset of [-.020,.022])cylinder(g,.009,.031,[x+offset,y-.047,z],M.plastic,'y',24);
  },{parentId:'e34sys:steering',...bay('system:steering'),...refs('steeringTank','32411097164','32411139671')});
  collect('e34bay:power-steering-hoses','Power steering supply, pressure and return lines',g=>{
    const lines=[
      [[1.10,.637,-.395],[1.112,.571,-.405],[1.292,.473,-.306],[1.448,.409,-.236],[1.512,.388,-.220]],
      [[1.06,.634,-.395],[1.035,.563,-.414],[.978,.511,-.425],[.923,.477,-.447]],
      [[1.518,.353,-.208],[1.387,.353,-.272],[1.198,.354,-.373],[1.005,.359,-.435],[.923,.449,-.438]],
    ];
    for(const line of lines){
      tube(g,line,.009,M.rubber,32);
      clamp(g,line[0],new Vector3(...line[0]).lerp(new Vector3(...line[1]),.25).toArray(),.009);
    }
  },{parentId:'e34sys:steering',...bay('system:steering'),...sources('steeringLines','installed')});
  collect('e34sys:heater-hoses','Heater supply and return hoses at firewall',g=>{
    const paths=[
      [[.744,.653,.037],[.781,.653,.026],[.843,.631,.014],[.913,.611,-.061],[.966,.552,-.101]],
      [[.745,.686,.073],[.798,.689,.049],[.825,.692,-.057],[.845,.702,-.157],[.839,.714,-.279]],
      [[.837,.695,-.285],[.870,.644,-.283],[.969,.532,-.306],[1.161,.505,-.283],[1.363,.508,-.217]],
    ];
    for(const path of paths)tube(g,path,.012,M.rubber,32);
    for(const z of [-.261,-.297])cylinder(g,.023,.034,[.839,.710,z],M.dark,'y',28);
    box(g,[.034,.025,.026],[.826,.711,-.278],M.plastic,.004);
  },bay('system:hvac',keep('heater','installed')));
  collect('e34bay:engine-harness','Engine harness, injector loom and branch connectors',g=>{
    const points=[[.898,.760,.242],[1.003,.761,.271],[1.265,.723,.285],[1.490,.672,.263],
      [1.526,.621,.199],[1.564,.541,.095]];
    tube(g,points,.0095,M.rubber,40);
    tube(g,[[.898,.760,.242],[.817,.743,.305],[.798,.726,.404],[.831,.718,.530]],.013,M.rubber,24);
    tube(g,[[.898,.759,.239],[.877,.740,.116],[.887,.757,.025],[.927,.772,-.004],[1.468,.769,-.004]],.008,M.rubber,30);
    for(let i=0;i<6;i++){
      const x=.971+i*.091;
      box(g,[.021,.017,.026],[x,.771,.010],M.plastic,.004);
      tube(g,[[x,.774,-.011],[x,.773,.004],[x,.752,.023]],.0035,M.rubber,8);
    }
    for(const [x,y,z] of points.slice(1,-1))box(g,[.016,.016,.026],[x,y,z],M.edge,.003);
    tube(g,[[1.508,.642,.243],[1.514,.560,.196],[1.484,.556,-.118],[1.469,.559,-.189]],.006,M.rubber,26);
    tube(g,[[.906,.753,.230],[.879,.725,-.166],[.900,.718,-.325],[.951,.688,-.517]],.007,M.rubber,26);
  },{parentId:'e34sys:electrical',...bay('system:electrical'),...sources('harness','installed')});
}

export function addEngineBay(collect) {
  addCovers(collect);
  addIntake(collect);
  addMounts(collect);
  addAccessories(collect);
  addBodyAndServices(collect);
}
