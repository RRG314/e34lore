import { DoubleSide, MeshStandardMaterial } from 'three';
import { aluminum, black, brass, rubber, steel, xAxis, yAxis, zAxis, block, cylinder,
  ring, rod, curvedTube } from './e30-325i-geometry.mjs';
import { bead, lerp, patch, smooth } from './e30-exterior-surfaces.mjs';

const plastic = new MeshStandardMaterial({color:0x24272a, roughness:.75});
const bottle = new MeshStandardMaterial({color:0xc8c0a0, roughness:.57});
const washerBottle = new MeshStandardMaterial({color:0xb2bdac, roughness:.64});
const foil = new MeshStandardMaterial({color:0xc7c0a9, roughness:.73});
const warning = new MeshStandardMaterial({color:0xd5aa41, roughness:.76});
const red = new MeshStandardMaterial({color:0x962c24, roughness:.64});
const copper = new MeshStandardMaterial({color:0x866746, roughness:.64, metalness:.39});
const firewall = new MeshStandardMaterial({color:0x353632, roughness:.95, side:DoubleSide});
const cowl = new MeshStandardMaterial({color:0x1c2020, roughness:.83});

function cap(group, radius, position, material = black) {
  cylinder(group, radius, .019, yAxis, material, position);
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI / 5;
    const lug = block(group, [.009, .018, .008], material,
      [position[0] + radius * Math.cos(angle), position[1], position[2] + radius * Math.sin(angle)], .002);
    lug.rotation.y = -angle;
  }
}

function bolts(group, locations, height = .012) {
  for (const position of locations) cylinder(group, .007, height, yAxis, steel, position, .007, 6);
}

function hoseWithClamps(group, points, radius) {
  curvedTube(group, points, radius, rubber, 26);
  const last = points.length - 1;
  for (const [i, j] of [[0,1],[last,last-1]]) {
    const a = points[i], b = points[j];
    const near = a.map((v, axis) => lerp(v, b[axis], .20));
    const end = a.map((v, axis) => lerp(v, b[axis], .39));
    rod(group, near, end, radius + .0016, aluminum);
  }
}

export function buildE30EngineBay(add, scope, paint) {
  const bay = scope('engine-bay', 'Engine compartment equipment', ['engine-bay']);
  const part = (key, name, page, position, spread, draw, extra = {}) =>
    add(bay,key,name,position,spread,draw,{page,engineBay:true,...extra});
  for (const [side, sign, label] of [['left',-1,'Left'],['right',1,'Right']]) {
    part('tower-'+side,label+' strut tower and wheelhouse','wheelhouse_engine_support',
      [1.387,.747,sign*.542],[.09,.13,sign*.56],g=>{
        const tower = (u,v) => {
          const a=2*Math.PI*u;
          const x=(.117+.157*v)*Math.cos(a)-.022*v;
          const z=(.106+.082*v)*Math.sin(a)+sign*.034*v;
          const y=.013-.137*smooth(v)-.053*v**5+.042*v*Math.max(0,sign*Math.sin(a));
          return [x,y,z];
        };
        patch(g,paint,tower,70,22);
        patch(g,paint,(u,v)=>{
          const a=2*Math.PI*u,r=lerp(.047,.124,v);
          return [r*Math.cos(a),.012+.004*Math.sin(Math.PI*v),r*.91*Math.sin(a)];
        },68,12);
        bead(g,steel,u=>tower(u,.025),.0024,56);
        bolts(g,Array.from({length:3},(_,i)=>{
          const a=2*Math.PI*i/3;
          return [.093*Math.cos(a),.022,.090*Math.sin(a)];
        }));
        patch(g,paint,(u,v)=>{
          const x=lerp(-.459,.565,u);
          // The wheelhouse flange sits below the bolt-on outer fender.
          // Taper the high outward edge forward with the fender shoulder.
          const height=lerp(-.128,-.007-.039*smooth((u-.46)/.54),v)-.035*(2*u-1)**4;
          return [x,height,sign*(lerp(.143,.226,v)+.012*Math.sin(Math.PI*u))];
        },48,14);
      },{exterior:true,paintSurface:true});
  }

  part('bulkhead','Bulkhead insulation and scuttle','wheelhouse_engine_support',[.838,.589,0],[-.28,.24,0],g=>{
    patch(g,firewall,(u,v)=>{
      const side=2*u-1;
      return [.003+.051*side**2+.04*(1-v), lerp(-.276,.221,v)-.023*side**4,side*lerp(.544,.715,v)];
    },50,20);
    for (const z of [-.53,-.23,.25,.54])
      cylinder(g,.018,.006,xAxis,rubber,[.052,.122,z]);
    block(g,[.113,.030,1.393],cowl,[.029,.235,0],.012);
    for (const z of [-.483,.483]) for(let i=0;i<11;i++)
      block(g,[.073,.005,.005],steel,[.033,.252,z+(i-5)*.013],.002);
    bead(g,rubber,u=>[.085-.035*(2*u-1)**2,.234-.019*(2*u-1)**4,lerp(-.694,.694,u)],.009,48);
  });

  part('airbox','Air cleaner housing and intake snorkel','intake_silencer_filter_cartridge',
    [1.678,.652,-.518],[.28,.34,-.38],g=>{
      block(g,[.290,.170,.223],plastic,[0,0,0],.031);
      block(g,[.292,.022,.228],black,[0,.076,0],.009);
      for(let i=0;i<8;i++)
        block(g,[.207,.006,.005],cowl,[.004,.091,(i-3.5)*.021],.002);
      for (const x of [-.104,.103]) for (const s of [-1,1])
        block(g,[.030,.025,.010],steel,[x,.053,s*.117],.004);
      block(g,[.133,.058,.132],plastic,[.170,-.031,.024],.014);
      block(g,[.051,.069,.160],black,[.237,-.032,.018],.012);
      cylinder(g,.045,.037,xAxis,plastic,[-.151,.012,.036]);
      // Lower feet reach the air cleaner stay on the inner wing.
      for(const x of [-.102,.068]){
        block(g,[.052,.019,.120],steel,[x,-.071,-.149],.006);
        block(g,[.047,.018,.038],rubber,[x,-.078,-.191],.006);
      }
    });
  part('air-filter','Pleated engine air-filter element','intake_silencer_filter_cartridge',
    [1.678,.693,-.518],[.28,.58,-.50],g=>{
      const paper=new MeshStandardMaterial({color:0xc6a574,roughness:.9});
      const seal=new MeshStandardMaterial({color:0x9b4d2d,roughness:.8});
      for(const sign of [-1,1]){
        block(g,[.255,.034,.009],seal,[0,0,sign*.087],.003);
        block(g,[.010,.034,.177],seal,[sign*.122,0,0],.003);
      }
      for(let i=0;i<30;i++){
        const fold=block(g,[.009,.026,.158],paper,[(i-14.5)*.0077,0,0],.0013);
        fold.rotation.z=(i%2?1:-1)*.48;
      }
    },{row:'13721720861',internal:true});
  part('airflow-meter','Vane airflow meter','volume_air_flow_sensor',[1.504,.677,-.468],[-.05,.39,-.41],g=>{
    block(g,[.098,.088,.123],aluminum,[0,0,0],.011);
    block(g,[.094,.021,.112],cowl,[0,.045,0],.008);
    cylinder(g,.044,.035,xAxis,aluminum,[-.054,-.001,0]);
    block(g,[.045,.029,.030],black,[.002,.013,-.072],.004);
    bolts(g,[[-.038,.059,-.035],[.038,.059,-.035],[-.038,.059,.035],[.038,.059,.035]],.007);
  });
  part('intake-boot','Pleated intake boot and idle-air branch','volume_air_flow_sensor',
    [1.435,.683,-.407],[.08,.42,-.32],g=>{
      const points=[[.026,0,-.057],[-.014,.012,-.047],[-.046,.031,-.009],[-.065,.034,.047],[-.078,.040,.092]];
      hoseWithClamps(g,points,.038);
      for(let i=0;i<6;i++){
        const t=i/5,a=points[1],b=points[3];
        const center=a.map((v,j)=>lerp(v,b[j],t));
        rod(g,center,center.map((v,j)=>v+(j===2?.004:j===0?-.003:0)),.043,rubber);
      }
      hoseWithClamps(g,[[.014,.022,-.028],[.011,.045,.022],[.076,.037,.075],[.095,.008,.119]],.012);
    });
  part('throttle','Throttle body and cable quadrant','throttle_housing_assy',[1.356,.728,-.285],[-.10,.38,-.41],g=>{
    cylinder(g,.044,.080,zAxis,aluminum);
    ring(g,.051,.033,.010,zAxis,aluminum,[0,0,-.043]);
    cylinder(g,.033,.018,yAxis,steel,[0,.051,.001]);
    rod(g,[-.031,.055,-.011],[.058,.059,.029],.004,steel);
    block(g,[.045,.028,.035],black,[.033,.006,.048],.006);
  });
  part('expansion-tank','Coolant expansion tank and level sender','expansion_tank',[1.756,.632,-.684],[.16,.31,-.52],g=>{
    block(g,[.178,.123,.141],bottle,[0,0,0],.027);
    block(g,[.140,.010,.129],foil,[-.005,-.017,0],.005);
    cylinder(g,.030,.028,yAxis,bottle,[-.038,.065,.006]);
    cap(g,.036,[-.038,.088,.006]);
    cylinder(g,.018,.025,yAxis,plastic,[.051,.064,-.002]);
    hoseWithClamps(g,[[.051,.006,.061],[.063,.020,.094],[.014,.023,.113],[-.066,-.015,.120],[-.114,-.037,.153]],.011);
    block(g,[.009,.034,.009],warning,[.090,.004,.020],.002);
  });
  part('washer-reservoir','Windshield washer reservoir and pump','single_parts_for_windshield_cleaning',
    [1.744,.659,.647],[.18,.31,.52],g=>{
      block(g,[.196,.165,.164],washerBottle,[0,0,0],.028);
      block(g,[.123,.10,.050],washerBottle,[-.041,-.037,-.069],.019);
      cylinder(g,.028,.043,yAxis,washerBottle,[.022,.071,.005]);
      cap(g,.033,[.022,.097,.005],foil);
      cylinder(g,.017,.063,yAxis,black,[.051,-.020,-.085]);
      curvedTube(g,[[.052,.019,-.082],[.048,.052,-.099],[-.039,.049,-.088],[-.127,.009,-.079]],.0045,rubber);
      block(g,[.135,.015,.116],steel,[-.052,-.061,.013],.005);
    });
  part('power-steering','Power steering reservoir and return lines','hydro_steering_oil_pipes',
    [1.196,.624,-.424],[-.02,.28,-.49],g=>{
      cylinder(g,.062,.088,yAxis,copper,[0,-.003,0],.065);
      ring(g,.066,.059,.011,yAxis,steel,[0,.027,0]);
      block(g,[.038,.016,.297],steel,[.013,.020,-.163],.005);
      block(g,[.048,.047,.027],steel,[.013,.005,-.308],.004);
      cap(g,.047,[0,.056,0]);
      hoseWithClamps(g,[[.030,-.043,.012],[.052,-.091,.037],[.121,-.147,.111],[.168,-.238,.136]],.012);
      hoseWithClamps(g,[[-.015,-.046,-.021],[-.030,-.091,-.008],[-.022,-.176,.068],[.124,-.236,.123]],.010);
    });
  part('brake-booster','Vacuum brake booster','power_brake_unit_depression',
    [.920,.612,-.399],[-.22,.21,-.41],g=>{
      cylinder(g,.121,.102,xAxis,black,[0,0,0],.113,44);
      ring(g,.123,.111,.014,xAxis,steel,[.008,0,0]);
      cylinder(g,.041,.030,xAxis,black,[.055,0,0],.032);
      hoseWithClamps(g,[[.007,.080,.064],[.073,.107,.112],[.202,.108,.178],[.304,.069,.240]],.010);
    });
  part('brake-master','Brake master cylinder and fluid reservoir','brake_pipe_front_abs',
    [1.051,.618,-.398],[-.03,.34,-.34],g=>{
      cylinder(g,.025,.149,xAxis,aluminum,[.004,0,0],.023);
      block(g,[.136,.053,.069],bottle,[.008,.067,0],.014);
      block(g,[.096,.011,.068],foil,[.013,.057,0],.003);
      cap(g,.023,[.042,.101,0]);
      for(const x of [-.040,.048]){
        cylinder(g,.010,.019,yAxis,steel,[x,.023,.012],.010,6);
        curvedTube(g,[[x,.029,.013],[x,.031,.058],[x-.042,-.009,.091],[x-.056,-.134,.122]],.0037,steel);
      }
    });
  part('abs-pump','ABS modulator, pump and hard lines','brake_pipe_front_abs',
    [1.614,.670,-.613],[.19,.29,-.55],g=>{
      block(g,[.143,.067,.110],aluminum,[0,-.019,0],.009);
      block(g,[.114,.018,.141],steel,[.014,-.053,-.057],.006);
      block(g,[.094,.042,.026],steel,[.014,-.069,-.117],.005);
      block(g,[.091,.038,.091],plastic,[.019,.038,0],.008);
      cylinder(g,.041,.088,xAxis,steel,[-.089,-.018,.013]);
      for(let i=0;i<5;i++){
        const x=(i-2)*.024;
        cylinder(g,.008,.018,yAxis,brass,[x,.019,.048],.008,6);
        curvedTube(g,[[x,.029,.048],[x,.065,.052],[x-.012,.077,.096],
          [x-.030,.064,.103],[-.189+i*.012,.030,.101],[-.409,.015,.125+i*.009]],.0034,steel,22);
      }
    });
  const fuseDatum=[.956,.735,-.627];
  part('fuse-box','Front fuse and relay box','fuse_box',fuseDatum,[-.26,.36,-.48],g=>{
    block(g,[.173,.044,.173],plastic,[0,-.009,0],.011);
    block(g,[.104,.016,.132],steel,[-.009,-.040,-.044],.006);
    for(const sign of [-1,1]){
      block(g,[.173,.036,.007],black,[0,.019,sign*.083],.003);
      block(g,[.007,.036,.166],black,[sign*.083,.019,0],.003);
    }
    // In BMW 0670-0 both fuse banks run from front to rear. K10 sits
    // outside the first bank and K1–K8 sit between the two fuse banks.
    for(const sign of [-1,1])block(g,[.157,.014,.018],black,[0,.020,sign*.052],.003);
    for(const z of [-.018,.021])for(const x of [.062,.022,-.020,-.062])
      block(g,[.026,.030,.025],plastic,[x,.031,z],.003);
    block(g,[.085,.026,.016],black,[0,.027,-.071],.002);
  });
  part('fuse-box-cover','Fuse box lid','fuse_box',fuseDatum,[-.26,.54,-.58],g=>{
    block(g,[.171,.018,.171],black,[0,.052,0],.008);
    block(g,[.014,.018,.037],steel,[.083,.041,-.020],.003);
  },{row:'61131368802'});
  const ratings=[7.5,7.5,15,15,30,7.5,15,30,15,7.5,null,7.5,7.5,7.5,null,null,30,30,7.5,30,7.5,7.5,7.5,15,null,null,30,30,7.5,7.5];
  const fuseColors=new Map([[7.5,0x875634],[15,0x3d7297],[30,0x547650]].map(([amp,color])=>[amp,new MeshStandardMaterial({color,roughness:.52})]));
  for(const [index,rating] of ratings.entries()){
    const number=index+1,x=(7-(index%15))*.0105,z=index<15?-.052:.052;
    const vacant=[15,16,25,26].includes(number);
    part('fuse-'+number,vacant?'Fuse slot F'+number:'Fuse F'+number,'fuse_box',
      [fuseDatum[0]+x,fuseDatum[1]+.027,fuseDatum[2]+z],[-.24+x*2,.42,-.52+z*2],g=>{
        block(g,[.0086,.014,.013],vacant?black:(fuseColors.get(rating)||plastic),[0,.004,0],.0015);
        if(!vacant)for(const leg of [-.003,.003])block(g,[.003,.008,.002],copper,[0,-.006,leg],.0005);
      },{internal:true});
  }
  part('positive-junction','Underhood positive terminal and battery cable','battery',
    [.993,.728,.569],[-.22,.33,.41],g=>{
      block(g,[.087,.049,.085],black,[0,0,0],.010);
      block(g,[.060,.022,.061],red,[.002,.029,0],.007);
      block(g,[.014,.001,.004],foil,[.002,.041,0],.0005);
      block(g,[.004,.001,.014],foil,[.002,.041,0],.0005);
      curvedTube(g,[[0,-.015,.033],[-.042,-.036,.061],[-.100,-.078,.050],[-.125,-.115,-.013]],.008,red);
      block(g,[.064,.019,.147],steel,[-.014,-.026,.077],.005);
      block(g,[.069,.105,.018],steel,[-.014,-.066,.145],.005);
    });
  part('ignition-coil','Ignition coil and high-tension lead','ignition_wiring',[1.702,.603,.455],[.29,.34,.37],g=>{
    cylinder(g,.028,.102,yAxis,steel,[0,0,0]);
    cylinder(g,.024,.034,yAxis,plastic,[0,.055,0]);
    ring(g,.031,.028,.018,yAxis,aluminum,[0,-.006,0]);
    // The coil strap reaches the inner wing instead of ending in mid-air.
    block(g,[.033,.016,.246],steel,[0,.020,.145],.004);
    block(g,[.045,.033,.027],steel,[0,.020,.253],.005);
    curvedTube(g,[[0,.075,0],[.032,.098,-.026],[.065,.084,-.126],[.069,.078,-.233],[.018,.084,-.336]],.006,rubber);
  });
  part('ignition-leads','Distributor and six ignition leads','ignition_wiring',[1.741,.682,.011],[.37,.40,.27],g=>{
    cylinder(g,.055,.052,xAxis,black,[0,0,0],.050);
    for(let i=0;i<6;i++){
      const a=2*Math.PI*i/6;
      const y=.040*Math.cos(a),z=.040*Math.sin(a);
      cylinder(g,.009,.021,xAxis,plastic,[.031,y,z]);
      curvedTube(g,[[.041,y,z],[.066,y+.012,z+.045],[.033,.060+i*.003,.105],
        [-.112,.076+i*.002,.127],[-.145-i*.083,.073,.134],[-.174-i*.079,.021,.150]],.0043,rubber,24);
    }
  });
  part('ac-lines','A/C service lines and receiver drier','condenser_fan',[1.745,.593,.479],[.23,.23,.52],g=>{
    cylinder(g,.036,.116,yAxis,aluminum,[.047,-.024,.041]);
    ring(g,.039,.036,.021,yAxis,steel,[.047,-.011,.041]);
    rod(g,[.037,-.008,.070],[-.013,.020,.218],.012,steel);
    block(g,[.043,.037,.025],steel,[-.013,.022,.234],.005);
    for(const [offset,r] of [[.013,.010],[-.013,.007]]){
      const points=[[.048,.030,.041+offset],[.054,.061,.063+offset],[.002,.079,.105+offset],
        [-.298,.076,.178+offset],[-.545,.075,.132+offset],[-.779,.091,.037+offset]];
      curvedTube(g,points,r,aluminum,33);
      cylinder(g,.011,.019,yAxis,plastic,[-.239,.085,.161+offset]);
    }
  });
  part('radiator-support','Radiator cross panel, upper mounts and fan shroud','radiator_frame',
    [1.904,.589,0],[.30,.22,.12],g=>{
      block(g,[.104,.035,1.228],paint,[.031,.135,0],.011);
      block(g,[.094,.035,1.211],paint,[.030,-.185,0],.012);
      for(const z of [-.53,.53]) {
        block(g,[.108,.030,.073],paint,[.013,.103,z],.006);
        block(g,[.064,.080,.062],paint,[.055,.079,z],.006);
      }
      for(const z of [-.344,.344]){
        block(g,[.148,.057,.091],plastic,[-.012,.129,z],.013);
        bolts(g,[[.014,.145,z],[-.045,.144,z]]);
      }
      ring(g,.205,.182,.031,xAxis,plastic,[-.065,-.044,0]);
      for (const z of [-.387,.387])
        block(g,[.046,.326,.091],plastic,[-.029,-.010,z],.015);
    },{exterior:true,paintSurface:true});
  part('lower-splash-shield','Lower radiator splash shield and side baffles','radiator_frame',
    [1.700,.362,0],[.08,-.26,.14],g=>{
      patch(g,firewall,(u,v)=>{
        const z=1.31*(v-.5);
        return [lerp(-.46,.286,u),.045-.103*u+.047*Math.abs(2*v-1)**4,z];
      },27,42);
      for(const z of [-.438,-.223,.223,.438])
        block(g,[.283,.019,.027],plastic,[.075,.014,z],.006);
    });
  part('hood-catches','Hood catches and release cable','hood',[1.939,.704,0],[.30,.31,.12],g=>{
    for(const z of [-.561,.561]){
      block(g,[.060,.026,.086],steel,[0,0,z],.008);
      ring(g,.020,.011,.014,yAxis,black,[0,.016,z]);
      bolts(g,[[-.013,.016,z-.026],[-.013,.016,z+.026]],.008);
    }
    curvedTube(g,[[-.02,-.007,-.561],[-.039,-.006,-.44],[-.046,-.004,0],[-.048,-.008,.471],[-.012,0,.559]],.004,rubber,32);
  });
}

