import {CatmullRomCurve3, ExtrudeGeometry, Path, Shape, TubeGeometry, Vector3} from 'three';
import {box, cylinder, lathe, mesh, ring, tube, visualMaterials as M} from './525i-visual-details.mjs';
import {along, loft} from './525i-fabrication.mjs';

const base='https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/engine/';
const diagrams={
  crank:['Crankshaft and bearing shells','crankshaft_with_bearing_shells','88037ca78e75606380c52b41'],
  rod:['Connecting rod and big-end shells','crankshaft_connecting_rod','4ffd7ba40c9fceeb9ebd7388'],
  piston:['Pistons, pins and rings','crankshaft_pistons','1e633b66cd66121fd0a65f8a'],
  head:['Cylinder head and cam carriers','cylinder_head_attached_parts','c98ff7836b9ad629d0fa1ad3'],
  cam:['Camshafts, valves and hydraulic tappets','valve_timing_gear_camshaft','6e2bd0e4fc3e06fb0ddeafad'],
  lower:['Primary timing drive and tensioner','timing_timing_chain_lower_p','159c4ddd5193ce0e679bfa77'],
  upper:['Secondary timing drive and guides','timing_gear_timing_chain_top','07d849aa759e2d5bcac4ef23'],
  vanos:['Single VANOS actuator and oil line','cylinder_head_vanos','0fc301d66865f9a7a91533c8'],
  pump:['Oil pump, rotors and suction pipe','lubrication_system_oil_pump_with_drive','528986de9d3c1aec78de9b29'],
};
export const engineSources=Object.values(diagrams).map(([title,slug])=>({title,url:base+slug+'.html'}));
export const engineScopes=[
  ['system:m50-engine','M50 engine','system:engine'],
  ['system:m50-short-block','M50 short block','system:m50-engine'],
  ['system:m50-head','M50 cylinder head','system:m50-engine'],
  ['system:m50-timing','M50 timing drive','system:m50-engine'],
  ['system:m50-oil','M50 oil circuit','system:m50-engine'],
];
const [engine,short,head,timing,oil]=engineScopes.map(row=>row[0]);
const bay='system:engine-bay';
const systems=scope=>['system:engine',engine,scope,bay];
const TAU=Math.PI*2;
const cylinderX=i=>(2.5-i)*.091;
const mainX=i=>(3-i)*.091;
const phases=[0,-TAU/3,TAU/3,TAU/3,-TAU/3,0];
const crankAt=i=>[cylinderX(i),.0375*Math.cos(phases[i]),.0375*Math.sin(phases[i])];
const pinAt=i=>{
  const [x,y,z]=crankAt(i);
  return [x,y+Math.sqrt(.135**2-z**2),0];
};
const annotated=(key,...numbers)=>{
  const [title,slug,id]=diagrams[key];
  return {
    visualSources:[{title,url:base+slug+'.html'}],
    ...(numbers.length?{catalog:['catalog-assembly-'+id,...numbers]}:{}),
  };
};
const solid=(key,settings={})=>({keepBinding:true,...annotated(key),...settings});

function profile(g,points,thickness,mat,at,axis='x',holes=[],bevel=.0012){
  const shape=new Shape(points.map(([x,y])=>({x,y})));
  for(const [x,y,r] of holes){
    const hole=new Path();hole.absarc(x,y,r,0,TAU,true);shape.holes.push(hole);
  }
  const geo=new ExtrudeGeometry(shape,{depth:thickness,curveSegments:12,bevelEnabled:bevel>0,
    bevelSegments:1,bevelSize:bevel,bevelThickness:bevel});
  geo.translate(0,0,-thickness/2);
  if(axis==='x')geo.rotateY(Math.PI/2);
  if(axis==='y')geo.rotateX(-Math.PI/2);
  return mesh(g,geo,mat,at);
}
function bearing(g,r,outer,width,at,lower,axis='x'){
  lathe(g,[[r,-width/2],[outer,-width/2],[outer,width/2],[r,width/2],[r,-width/2]],
    M.machined,axis,28,lower?0:Math.PI,Math.PI).position.fromArray(at);
}
function makeDeck(g,y,thickness,material,bores){
  const outline=[[-.310,-.084],[-.295,-.109],[.265,-.109],[.310,-.090],[.310,.086],
    [.282,.108],[-.284,.108],[-.310,.089]];
  const holes=Array.from({length:6},(_,i)=>[cylinderX(i),0,bores]);
  for(let i=0;i<7;i++)for(const z of [-.096,.096])holes.push([mainX(i)*.98,z,.0055]);
  profile(g,outline,thickness,material,[0,y,0],'y',holes);
}

function addShortBlock(collect,datum){
  collect('m50:block','Cast-iron block with six machined bores',g=>{
    makeDeck(g,.202,.014,M.dark,.042);
    for(let i=0;i<6;i++){
      const x=cylinderX(i);
      lathe(g,[[.042,.030],[.048,.030],[.049,.042],[.049,.192],[.046,.199],
        [.042,.199],[.042,.030]],M.dark,'y',36).position.set(x,0,0);
      for(const z of [-.093,.093]){
        const a=Math.sign(z);
        loft(g,[[[x-.043,.022,z],.011,.031],[[x-.012,.097,z+a*.006],.016,.076],
          [[x+.037,.113,z+a*.009],.013,.078]],M.dark,{sides:12});
        cylinder(g,.019,.003,[x,.125,z+a*.021],M.steel,'z',28);
        ring(g,.019,.016,.002,[x,.125,z+a*.023],M.seam,'z',28);
      }
    }
    for(const z of [-.104,.104]){
      loft(g,[[[-.312,-.037,z],.008,.013],[[-.282,-.037,z],.014,.015],
        [[.276,-.037,z],.014,.016],[[.314,-.037,z],.010,.011]],M.dark,{sides:16});
      for(let i=0;i<7;i++){
        const x=mainX(i);
        loft(g,[[[x,-.026,z],.009,.015],[[x,.069,z*.82],.010,.016],[[x,.180,z*.93],.009,.010]],
          M.steel,{sides:10,up:[1,0,0]});
      }
    }
    for(let i=0;i<7;i++){
      const x=mainX(i);
      lathe(g,[[.032,-.012],[.052,-.012],[.052,.012],[.032,.012],[.032,-.012]],
        M.dark,'x',26,Math.PI,Math.PI).position.set(x,0,0);
      for(const z of [-.061,.061])box(g,[.033,.029,.062],[x,.011,z],M.dark,.006);
    }
    for(const x of [-.305,.307]){
      profile(g,[[-.096,-.038],[.097,-.038],[.107,.028],[.079,.179],[-.088,.179],[-.110,.027]],
        .018,M.dark,[x,0,0],'x',[[0,0,.038]]);
    }
  },solid('crank',{engine:'section'}));
  collect('m50:crankshaft','Crankshaft with seven main journals and six throws',g=>{
    for(let i=0;i<7;i++){
      const x=mainX(i);
      cylinder(g,.030,.030,[x,0,0],M.machined,'x',36);
      for(const sign of [-1,1])ring(g,.032,.026,.004,[x+sign*.015,0,0],M.steel,'x',32);
      cylinder(g,.0016,.001,[x+.003,.0297,0],M.dark,'y',12);
    }
    for(let i=0;i<6;i++){
      const [x,y,z]=crankAt(i);
      cylinder(g,.0225,.031,[x,y,z],M.machined,'x',32);
      for(const dx of [-.025,.025]){
        const web=profile(g,[[-.037,-.046],[-.052,-.014],[-.031,.018],[-.024,.045],
          [-.014,.058],[.009,.060],[.025,.050],[.031,.017],[.050,-.020],[.037,-.051],[.012,-.063],[-.017,-.062]],
          .021,M.steel,[x+dx,0,0],'x');
        web.rotation.x=phases[i];
        cylinder(g,.025,.004,[x+dx*.61,y,z],M.machined,'x',28);
      }
    }
    lathe(g,[[0,-.343],[.041,-.343],[.046,-.334],[.046,-.310],[.034,-.302],[.030,-.284],[0,-.284]],
      M.steel,'x',48);
    lathe(g,[[0,.286],[.028,.286],[.031,.312],[.025,.324],[.019,.328],[.019,.369],[.015,.373],[0,.373]],
      M.machined,'x',44);
    box(g,[.023,.005,.008],[.347,.020,0],M.steel,.0015);
  },solid('crank',{note:'The illustrated crank has 75 mm stroke and nominal 60 mm main and 45 mm rod journals. Check the service dimensions for a measured crankshaft.'}));
  for(let i=0;i<7;i++){
    const id='m50:main-cap:'+(i+1), x=mainX(i);
    collect(id,'Main bearing cap '+(i+1),g=>{
      lathe(g,[[.033,-.014],[.044,-.014],[.049,-.008],[.049,.008],[.044,.014],[.033,.014],[.033,-.014]],
        M.dark,'x',28,0,Math.PI).position.set(x,0,0);
      for(const z of [-.044,.044]){
        ring(g,.012,.007,.022,[x,-.016,z],M.dark,'y',24);
        cylinder(g,.0083,.006,[x,-.028,z],M.machined,'y',6);
      }
    },solid('crank'));
    for(const lower of [false,true]){
      const shell='m50:main-shell:'+i+':'+(lower?'lower':'upper');
      collect(shell,(lower?'Lower':'Upper')+' main bearing shell '+(i+1),g=>{
        bearing(g,.030,.033,.024,[x,0,0],lower);
        if(!lower)bearing(g,.030,.033,.003,[x+.009,0,0],false);
        if(i===5)for(const dx of [-.013,.013])bearing(g,.030,.040,.003,[x+dx,0,0],lower);
      },{matrix:datum,parentId:lower?id:'m50:short-block',systems:systems(short),internal:true,...annotated('crank')});
    }
  }
  for(let i=0;i<6;i++)addPistonAssembly(collect,datum,i);
}

function addPistonAssembly(collect,datum,i){
  const n=i+1, crank=crankAt(i), p=pinAt(i), [x,y]=p;
  const parent='m50:piston-rod:'+n;
  const internal={matrix:datum,parentId:parent,systems:systems(short),internal:true};
  const rodAxis=new Vector3(...p).sub(new Vector3(...crank)).normalize();
  const pitch=Math.atan2(rodAxis.z,rodAxis.y);
  const makeRodEnd=(g,lower)=>{
    const end=lathe(g,[[.0245,-.0155],[.033,-.0155],[.035,-.010],[.035,.010],
      [.033,.0155],[.0245,.0155],[.0245,-.0155]],lower?M.steel:M.dark,'x',26,
      lower?0:Math.PI,Math.PI);
    end.position.fromArray(crank);
    end.rotation.x=pitch;
  };
  collect('m50:rod:'+n,'Forged connecting rod '+n,g=>{
    makeRodEnd(g,false);
    loft(g,[[[x,crank[1]+.018,crank[2]*.88],.024,.014],
      [[x,crank[1]+.043,crank[2]*.67],.013,.010],
      [[x,y-.038,crank[2]*.22],.009,.009],[[x,y-.010,0],.013,.011]],M.steel,{sides:16,up:[1,0,0]});
    for(const offset of [-.009,.009]){
      tube(g,[[x+offset,crank[1]+.024,crank[2]*.82],[x+offset,crank[1]+.058,crank[2]*.53],
        [x+offset,y-.017,.001]],.0037,M.steel,14);
    }
    ring(g,.016,.011,.024,p,M.steel,'x',32);
    ring(g,.011,.0098,.023,p,M.seam,'x',32);
  },solid('rod'));
  collect('m50:rod-cap:'+n,'Connecting-rod cap '+n,g=>{
    makeRodEnd(g,true);
    for(const side of [-1,1])box(g,[.024,.012,.013],[x,crank[1]-.007,crank[2]+side*.029],M.steel,.003);
  },solid('rod'));
  for(const side of [-1,1]){
    collect('m50:rod-bolt:'+n+':'+side,'Connecting-rod bolt '+n,g=>{
      const z=crank[2]-side*.029;
      cylinder(g,.0045,.032,[x,crank[1]+.001,z],M.machined,'y',14);
      cylinder(g,.0065,.006,[x,crank[1]-.016,z],M.steel,'y',12);
    },solid('rod'));
  }
  for(const lower of [false,true])collect('m50:rod-shell:'+n+':'+(lower?'lower':'upper'),
    (lower?'Lower':'Upper')+' rod bearing shell '+n,g=>bearing(g,.0225,.0245,.025,crank,lower),
    {...internal,...annotated('rod')});

  const r=.04199;
  collect('m50:piston:'+n,'Mahle three-ring piston '+n,g=>{
    const crown=lathe(g,[[.033,.004],[r-.0006,.004],[r,.0188],[.039,.0191],[.039,.0219],
      [r,.0222],[r,.0244],[.039,.0247],[.039,.027],[r,.0273],
      [r,.0298],[.039,.0301],[.039,.0325],[r,.0328],[r,.0378],[.041,.0395],
      [.033,.0395],[.020,.0379],[0,.0379],[0,.032],[.030,.032],[.033,.016],[.033,.004]],M.alloy,'y',56);
    crown.position.fromArray(p);
    for(const angle of [-.86,Math.PI-.86]){
      lathe(g,[[.036,-.016],[.0414,-.016],[.0418,-.010],[r,.004],[.034,.004],[.036,-.016]],
        M.alloy,'y',22,angle,1.72).position.fromArray(p);
    }
    for(const side of [-1,1]){
      ring(g,.015,.010,.014,[x+side*.025,y,0],M.alloy,'x',32);
      lathe(g,[[.010,-.001],[.0118,-.001],[.0118,.001],[.010,.001],[.010,-.001]],
        M.steel,'x',22,.18,TAU-.36).position.set(x+side*.032,y,0);
    }
  },{...solid('piston'),...annotated('piston','11251703456'),note:'83.980 mm standard-size Mahle example. The catalog lists other grades and sizes.'});
  collect('m50:piston-pin:'+n,'Hollow wrist pin '+n,g=>ring(g,.010,.0068,.061,p,M.machined,'x',44),solid('piston'));
  for(let j=0;j<3;j++){
    const yy=y+[.0314,.0258,.0204][j], h=j===2?.0026:.0016;
    collect('m50:piston-ring:'+n+':'+(j+1),(j===2?'Oil-control ring':'Compression ring')+' '+n+'.'+(j+1),g=>{
      lathe(g,[[.039,-h/2],[.042,-h/2],[.042,h/2],[.039,h/2],[.039,-h/2]],
        j===2?M.steel:M.machined,'y',44,j*1.7,TAU-.11).position.set(x,yy,0);
    },solid('piston'));
  }
}

function addCylinderHead(collect,datum){
  collect('m50:cylinder-head','Aluminium cylinder head, ports and combustion chambers',g=>{
    makeDeck(g,.218,.014,M.alloy,.040);
    for(let i=0;i<6;i++){
      const x=cylinderX(i);
      lathe(g,[[.039,.213],[.042,.213],[.045,.230],[.040,.248],[.029,.255],[.021,.260],
        [.018,.256],[.027,.250],[.035,.240],[.039,.222],[.039,.213]],M.alloy,'y',38).position.set(x,0,0);
      cylinder(g,.011,.051,[x,.278,0],M.alloy,'y',24);
      ring(g,.013,.009,.008,[x,.310,0],M.machined,'y',24);
      for(const sign of [-1,1]){
        const baseY=sign===-1?.278:.249;
        loft(g,[[[x,.238,sign*.024],.032,.020],[[x,baseY,sign*.067],.033,.023],
          [[x,baseY,sign*.116],.034,.024]],M.alloy,{wall:.003,sides:20});
        for(const dx of [-.035,.035])cylinder(g,.005,.016,[x+dx,baseY,sign*.122],M.machined,'z',12);
      }
    }
    for(const sign of [-1,1]){
      loft(g,[[[-.310,.284,sign*.113],.010,.058],[[-.275,.284,sign*.118],.012,.068],
        [[.274,.284,sign*.118],.012,.067],[[.316,.286,sign*.103],.020,.061]],M.alloy,{sides:18});
      box(g,[.597,.010,.016],[0,.349,sign*.118],M.machined,.002);
    }
    for(const x of [-.309,.307])box(g,[.016,.121,.221],[x,.284,0],M.alloy,.007);
    for(let i=0;i<7;i++)for(const z of [-.095,.095]){
      ring(g,.010,.006,.025,[mainX(i)*.98,.324,z],M.alloy,'y',24);
    }
  },solid('head',{engine:'section'}));
  for(const [bank,sign] of [['intake',-1],['exhaust',1]]){
    const z=sign*.062,y=.356;
    collect('m50:camshaft:'+bank,(sign<0?'Intake':'Exhaust')+' camshaft with twelve lobes',g=>{
      cylinder(g,.0105,.620,[.011,y,z],M.steel,'x',32);
      for(let i=0;i<7;i++)cylinder(g,.0175,.018,[mainX(i),y,z],M.machined,'x',28);
      for(let i=0;i<6;i++)for(const dx of [-.019,.019]){
        const a=phases[i]/2+(sign<0?.63:2.19)+(i>=3?Math.PI:0);
        const pts=[];
        for(let j=0;j<44;j++){
          const t=TAU*j/44, r=.014+.010*Math.max(0,Math.cos(t-a))**5;
          pts.push([-Math.sin(t)*r,Math.cos(t)*r]);
        }
        profile(g,pts,.010,M.steel,[cylinderX(i)+dx,y,z],'x',[],.0013);
      }
      ring(g,.021,.008,.021,[.318,y,z],M.machined,'x',34);
      if(sign<0)for(let i=0;i<24;i++){
        const a=TAU*i/24;
        box(g,[.019,.0025,.0025],[.326,y+.012*Math.cos(a),z+.012*Math.sin(a)],M.steel,.0004);
      }
    },solid('cam'));
    collect('m50:cam-carrier:'+bank,(sign<0?'Intake':'Exhaust')+' cam carrier and tappet bores',g=>{
      for(const dz of [-.020,.020])box(g,[.596,.013,.011],[0,.314,z+dz],M.alloy,.003);
      for(let i=0;i<6;i++)for(const dx of [-.019,.019]){
        ring(g,.017,.013,.021,[cylinderX(i)+dx,.316,sign*.052],M.alloy,'y',22);
      }
      for(let i=0;i<7;i++){
        const x=mainX(i);
        lathe(g,[[.0175,-.010],[.024,-.010],[.024,.010],[.0175,.010],[.0175,-.010]],
          M.alloy,'x',24,0,Math.PI).position.set(x,y,z);
        box(g,[.025,.019,.060],[x,.331,z],M.alloy,.004);
      }
    },solid('head'));
    for(let i=0;i<7;i++){
      const x=mainX(i);
      const id='m50:cam-cap:'+(-sign)+':'+(i+1);
      collect(id,(sign<0?'Intake':'Exhaust')+' cam bearing cap '+(i+1),g=>{
        lathe(g,[[.0175,-.010],[.023,-.010],[.023,.010],[.0175,.010],[.0175,-.010]],
          M.alloy,'x',24,Math.PI,Math.PI).position.set(x,y,z);
        for(const dz of [-.024,.024]){
          ring(g,.009,.0045,.013,[x,y-.007,z+dz],M.alloy,'y',24);
          cylinder(g,.006,.005,[x,y+.004,z+dz],M.machined,'y',6);
        }
      },solid('head'));
    }
    for(let i=0;i<6;i++)for(let j=0;j<2;j++){
      const x=cylinderX(i)+(j===0?-.019:.019);
      const from=[x,.228,sign*.025],to=[x,.335,sign*.053];
      const id=bank+':'+(i+1)+':'+(j+1);
      collect('m50:valve:'+id,(sign<0?'Intake':'Exhaust')+' valve '+(i+1)+'.'+(j+1),g=>{
        along(g,from,to,(f,l)=>{
          const r=sign<0?.016:.0145;
          lathe(f,[[0,0],[r-.001,0],[r,.002],[r,.004],[r-.002,.0055],[.008,.008],
            [.0032,.017],[.0032,l-.005],[.0027,l-.003],[.0032,l-.001],[0,l-.001]],M.machined,'y',24);
        });
      },solid('cam'));
      collect('m50:valve-spring:'+id,'Valve spring and retainers '+id.replaceAll(':',' '),g=>{
        along(g,from,to,(f)=>{
          const path=[];
          for(let k=0;k<=60;k++){
            const t=k/60,a=TAU*5*t;
            path.push(new Vector3(.0084*Math.cos(a),.053+.041*t,.0084*Math.sin(a)));
          }
          mesh(f,new TubeGeometry(new CatmullRomCurve3(path),60,.00155,6,false),M.dark);
          for(const yy of [.050,.095])ring(f,.011,.0035,.003,[0,yy,0],M.machined,'y',20);
          ring(f,.006,.0033,.008,[0,.047,0],M.rubber,'y',22);
        });
      },solid('cam'));
      collect('m50:lifter:'+id,'Hydraulic bucket tappet '+id.replaceAll(':',' '),g=>{
        along(g,from,to,(f,l)=>{
          lathe(f,[[.009,l-.016],[.012,l-.016],[.012,l-.002],[.0115,l+.002],[0,l+.002],
            [0,l-.001],[.008,l-.001],[.009,l-.016]],M.steel,'y',24);
          ring(f,.0121,.0115,.001,[0,l-.008,0],M.machined,'y',20);
        });
      },solid('cam'));
    }
  }
  collect('m50:head-dowel:front','Front cylinder-head locating sleeve',g=>{
    ring(g,.0078,.0054,.017,[.261,.210,-.092],M.machined,'y',24);
  },{matrix:datum,parentId:'m50:top-end',systems:systems(head),internal:true,...annotated('head')});
}

function sprocket(g,at,r,teeth,width,hub,open=false){
  const points=[];
  for(let i=0;i<teeth*4;i++){
    const a=TAU*i/(teeth*4), rr=r+(i%4===1||i%4===2?.0023:-.0022);
    points.push([rr*Math.sin(a),rr*Math.cos(a)]);
  }
  const holes=[[0,0,hub]];
  if(open)for(let i=0;i<4;i++){
    const a=TAU*i/4;
    holes.push([r*.60*Math.cos(a),r*.60*Math.sin(a),r*.158]);
  }
  profile(g,points,width,M.steel,at,'x',holes,.00065);
  ring(g,hub+.008,hub,width+.002,at,M.machined,'x',36);
}
function loopPath(a,b,ra,rb){
  const [ay,az]=a,[by,bz]=b;
  const theta=Math.atan2(bz-az,by-ay);
  const tangent=Math.acos((ra-rb)/Math.hypot(by-ay,bz-az));
  const point=(center,r,t)=>[center[0]+r*Math.cos(t),center[1]+r*Math.sin(t)];
  const rows=[];
  for(let i=0;i<=36;i++)rows.push(point(a,ra,theta+tangent+(TAU-2*tangent)*i/36));
  for(let i=0;i<=44;i++)rows.push(point(b,rb,theta-tangent+2*tangent*i/44));
  rows.push(rows[0]);
  return rows;
}
function chain(g,x,a,b,ra,rb,width){
  const pts=loopPath(a,b,ra,rb);
  const spans=pts.slice(1).map((p,i)=>Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1]));
  const total=spans.reduce((sum,v)=>sum+v,0);
  const count=Math.ceil(total/.014)*2;
  let segment=0, distance=0;
  const pivots=Array.from({length:count},(_,i)=>{
    const goal=total*i/count;
    while(distance+spans[segment]<goal)distance+=spans[segment++];
    const t=(goal-distance)/spans[segment];
    return pts[segment].map((v,axis)=>v+(pts[segment+1][axis]-v)*t);
  });
  for(let i=0;i<count;i++){
    const [y,z]=pivots[i], [yy,zz]=pivots[(i+1)%count];
    const w=width+(i%2)*.0016;
    cylinder(g,.0019,w*2+.002,[x,y,z],M.machined,'x',8);
    for(const side of [-1,1]){
      const plate=box(g,[.00155,Math.hypot(yy-y,zz-z)+.002,.0042],[x+side*w,(y+yy)/2,(z+zz)/2],
        i%2?M.steel:M.dark,.0007);
      plate.rotation.x=Math.atan2(zz-z,yy-y);
    }
  }
}
function addTiming(collect,datum){
  const a=[0,0],e=[.356,.062],i=[.356,-.062];
  const local=(parent='m50:timing')=>({matrix:datum,parentId:parent,systems:systems(timing),internal:true});
  collect('m50:crank-sprocket','Crankshaft timing sprocket',g=>sprocket(g,[.330,...a],.025,23,.010,.018),
    solid('lower',{internal:true}));
  collect('m50:cam-sprocket:exhaust','Exhaust cam double sprocket',g=>{
    sprocket(g,[.330,...e],.050,46,.009,.018,true);
    sprocket(g,[.347,...e],.049,44,.008,.018,true);
    ring(g,.028,.018,.026,[.338,...e],M.machined,'x',36);
  },solid('upper',{internal:true}));
  collect('m50:cam-sprocket:intake','Intake cam sprocket and VANOS splined hub',g=>{
    sprocket(g,[.347,...i],.049,44,.009,.017,true);
    ring(g,.024,.012,.026,[.356,...i],M.machined,'x',36);
    for(let j=0;j<20;j++){
      const a=j*TAU/20;
      cylinder(g,.0013,.016,[.366,i[0]+.014*Math.cos(a),i[1]+.014*Math.sin(a)],M.steel,'x',8);
    }
  },solid('upper',{internal:true}));
  collect('m50:timing-chain:primary','Primary timing chain',g=>chain(g,.330,a,e,.025,.050,.0068),solid('lower',{internal:true}));
  collect('m50:timing-chain:secondary','Cam-to-cam timing chain',g=>chain(g,.347,i,e,.049,.049,.0046),solid('upper',{internal:true}));
  for(const side of [-1,1]){
    const guide=[ [.330,.047,.006+side*.031],[.330,.115,.015+side*.043],
      [.330,.196,.032+side*.050],[.330,.287,.043+side*.051] ];
    collect('m50:chain-guide:'+side,(side<0?'Fixed':'Tensioning')+' primary chain rail',g=>{
      loft(g,guide.map(p=>[p,.010,.005]),M.edge,{sides:14,up:[1,0,0]});
      loft(g,guide.map(p=>[[p[0]-.006,p[1],p[2]+side*.004],.012,.004]),M.alloy,{sides:12,up:[1,0,0]});
      for(const p of [guide[0],guide[3]])ring(g,.010,.004,.022,p,M.alloy,'x',24);
    },solid('lower',{internal:true}));
  }
  collect('m50:primary-tensioner','Primary timing-chain hydraulic tensioner',g=>{
    along(g,[.326,.114,-.094],[.329,.144,-.019],(f,l)=>{
      cylinder(f,.010,l*.67,[0,l*.34,0],M.steel,'y',24);
      cylinder(f,.006,l*.37,[0,l*.83,0],M.machined,'y',22);
      cylinder(f,.013,.010,[0,0,0],M.machined,'y',6);
    });
  },{...local(),...annotated('lower','11311703746','11311738861')});
  collect('m50:upper-chain-tensioner','Upper chain tensioner and guide',g=>{
    loft(g,[[[.344,.319,-.045],.011,.006],[[.344,.312,0],.013,.007],[[.344,.319,.045],.011,.006]],
      M.edge,{sides:14,up:[1,0,0]});
    box(g,[.032,.033,.047],[.329,.299,0],M.alloy,.005);
    cylinder(g,.010,.024,[.345,.314,0],M.machined,'y',20);
  },{...local(),...annotated('upper','11311738700')});
  collect('m50:vanos','Single VANOS actuator casting',g=>{
    const [y,z]=i;
    lathe(g,[[.023,.351],[.038,.351],[.040,.359],[.039,.398],[.034,.415],[.023,.416],
      [.023,.351]],M.alloy,'x',44).position.set(0,y,z);
    loft(g,[[[.373,.298,-.128],.023,.031],[[.372,.297,-.045],.026,.034],
      [[.371,.308,.054],.018,.027],[[.369,.317,.084],.013,.016]],M.alloy,{sides:16});
    for(const [yy,zz] of [[.317,-.104],[.324,.062],[.285,-.079],[.284,.027],[.378,-.093]]){
      ring(g,.010,.005,.010,[.375,yy,zz],M.alloy,'x',24);
      cylinder(g,.007,.006,[.382,yy,zz],M.machined,'x',6);
    }
    ring(g,.027,.022,.006,[.417,y,z],M.steel,'x',40);
  },solid('vanos',{engine:'section'}));
  collect('m50:vanos-piston','VANOS piston, seals and helical spline',g=>{
    const [y,z]=i;
    lathe(g,[[.010,.326],[.015,.326],[.015,.372],[.020,.376],[.022,.389],[.022,.406],[.010,.406],
      [.010,.326]],M.machined,'x',44).position.set(0,y,z);
    for(const x of [.390,.403])ring(g,.023,.020,.002,[x,y,z],M.rubber,'x',40);
    for(let j=0;j<20;j++){
      const a=j*TAU/20;
      tube(g,Array.from({length:5},(_,k)=>{
        const t=k/4;return [.332+.035*t,y+.0158*Math.cos(a+t*.38),z+.0158*Math.sin(a+t*.38)];
      }),.00105,M.steel,7);
    }
  },solid('vanos'));
  collect('m50:vanos-oil-line','VANOS oil feed with banjo fittings',g=>{
    const points=[[.385,.261,-.129],[.340,.217,-.150],[.279,.205,-.171],[.223,.154,-.189]];
    tube(g,points,.005,M.rubber,24);
    for(const [x,y,z] of [points[0],points[3]]){
      ring(g,.011,.005,.006,[x,y,z],M.machined,'z',28);
      cylinder(g,.007,.010,[x,y,z-.003],M.machined,'z',6);
    }
  },{...local('m50:vanos'),internal:false,...annotated('vanos','11361703464')});
}

function addOilCircuit(collect,datum){
  const pose=[.239,-.086,0];
  const local={matrix:datum,parentId:'m50:oil-pump',systems:systems(oil),internal:true};
  collect('m50:oil-pan','Front-sump oil pan and stiffening ribs',g=>{
    loft(g,[[[-.314,-.063,0],.102,.010],[[-.280,-.087,0],.110,.030],
      [[.070,-.091,0],.106,.035],[[.129,-.129,0],.112,.077],
      [[.262,-.139,0],.112,.089],[[.313,-.117,0],.098,.067]],M.alloy,
      {sides:24,roundness:.42,wall:.0035});
    for(const z of [-.109,.109])loft(g,[[[-.314,-.057,z],.007,.007],[[.015,-.057,z],.009,.006],
      [[.302,-.057,z],.008,.007]],M.alloy,{sides:14});
    for(let i=0;i<7;i++)for(const z of [-.109,.109]){
      const x=-.281+.092*i;
      cylinder(g,.008,.015,[x,-.060,z],M.alloy,'y',20);
      cylinder(g,.005,.007,[x,-.072,z],M.steel,'y',6);
    }
    for(let i=0;i<6;i++){
      const x=.146+i*.026;
      tube(g,[[x,-.072,-.104],[x,-.145,-.109],[x,-.207,-.075],[x,-.218,0],
        [x,-.207,.076],[x,-.145,.106],[x,-.072,.105]],.0032,M.alloy,18);
    }
    ring(g,.014,.007,.010,[.230,-.205,-.108],M.alloy,'z',24);
  },solid('pump',{engine:'section'}));
  collect('m50:oil-pump','Oil pump casting and mounting arms',g=>{
    const [x,y,z]=pose;
    lathe(g,[[.027,-.046],[.035,-.046],[.039,-.033],[.040,-.009],[.039,.012],
      [.027,.012],[.027,-.046]],M.alloy,'x',40).position.fromArray(pose);
    for(const sign of [-1,1]){
      loft(g,[[[x-.010,y,sign*.032],.020,.016],[[x-.034,-.061,sign*.049],.016,.011],
        [[x-.057,-.048,sign*.063],.014,.007]],M.alloy,{sides:16});
      ring(g,.012,.005,.010,[x-.057,-.049,sign*.063],M.alloy,'y',24);
    }
    cylinder(g,.013,.070,[.215,-.073,.032],M.alloy,'x',28);
    cylinder(g,.011,.012,[.177,-.073,.032],M.machined,'x',6);
  },solid('pump',{engine:'section'}));
  collect('m50:oil-pump-cover','Oil pump cover plate',g=>{
    profile(g,[[-.034,-.025],[-.038,.004],[-.017,.035],[.020,.036],[.037,.016],[.035,-.025],[.008,-.037]],
      .007,M.alloy,[.255,-.086,0],'x',[[0,0,.010],[-.026,.018,.003],[.024,.016,.003],[0,-.026,.003]]);
  },{...local,engine:'cover',...annotated('pump')});
  collect('m50:oil-pump-inner-rotor','Oil pump inner rotor and shaft',g=>{
    const pts=[];
    for(let j=0;j<60;j++){
      const a=TAU*j/60,r=.016+.004*Math.cos(a*5);
      pts.push([r*Math.sin(a),r*Math.cos(a)]);
    }
    profile(g,pts,.019,M.machined,[.237,-.086,0],'x');
    cylinder(g,.009,.054,[.253,-.086,0],M.machined,'x',30);
  },{...local,...annotated('pump','11411748098','11411722905')});
  collect('m50:oil-pump-outer-rotor','Oil pump outer rotor',g=>{
    const shape=new Shape();shape.absarc(0,0,.0266,0,TAU,false);
    const opening=new Path();
    for(let j=0;j<=72;j++){
      const a=-TAU*j/72,r=.020+.0034*Math.cos(a*6);
      const p=[r*Math.cos(a),r*Math.sin(a)];
      if(j===0)opening.moveTo(...p);else opening.lineTo(...p);
    }
    shape.holes.push(opening);
    const geo=new ExtrudeGeometry(shape,{depth:.019,bevelEnabled:false,curveSegments:32});
    geo.translate(0,0,-.0095);geo.rotateY(Math.PI/2);
    mesh(g,geo,M.steel,[.237,-.0875,0]);
  },{...local,...annotated('pump','11411748100','11411722907')});
  collect('m50:oil-pump-sprocket','Oil pump drive sprocket',g=>sprocket(g,[.275,-.086,0],.027,24,.008,.009,true),
    {...local,...annotated('pump','11411719935')});
  collect('m50:oil-pump-chain','Oil pump roller chain',g=>{
    sprocket(g,[.275,0,0],.023,20,.007,.017);
    chain(g,.275,[-.086,0],[0,0],.027,.023,.0042);
  },solid('pump'));
  collect('m50:oil-pickup','Oil suction tube and screened pickup',g=>{
    const path=[[.200,-.104,-.004],[.184,-.131,-.015],[.169,-.167,-.022],[.187,-.199,-.023]];
    loft(g,path.map(p=>[p,.009,.009]),M.alloy,{wall:.002,sides:18,up:[1,0,0]});
    lathe(g,[[.008,-.004],[.035,-.013],[.041,-.012],[.042,-.008],[.039,-.004],
      [.015,.006],[.008,.006],[.008,-.004]],M.alloy,'y',36).position.fromArray(path[3]);
    for(let i=-6;i<=6;i++){
      const offset=i*.0054, span=Math.sqrt(.037**2-offset**2);
      box(g,[span*2,.001,.001],[.187,-.212,-.023+offset],M.steel,.0002);
      box(g,[.001,.001,span*2],[.187+offset,-.212,-.023],M.steel,.0002);
    }
  },solid('pump'));
}

export function addM50Internals(collect,model){
  const datum=model.nodes.find(n=>n.id==='m50:block').matrix;
  addShortBlock(collect,datum);
  addCylinderHead(collect,datum);
  addTiming(collect,datum);
  addOilCircuit(collect,datum);
  const scopes={
    'm50:short-block':short,'m50:top-end':head,'m50:timing':timing,'m50:lubrication':oil,
    'm50:exhaust':engine,'m50:accessories':engine,'m50:intake':engine,'m50:cooling':engine,
  };
  for(const node of model.nodes.filter(n=>/^e34bay:engine-(mount|bracket)-/.test(n.id)))node.engine='cover';
  for(const n of model.nodes.filter(node=>node.assetId&&node.id.startsWith('m50:'))){
    let parent=n;
    while(parent&&!scopes[parent.id])parent=model.nodes.find(node=>node.id===parent.parentId);
    if(!parent)continue;
    n.systemIds=[...new Set([...n.systemIds,engine,scopes[parent.id]])];
    if(!n.engine&&(/^(m50:(valve-cover|coil-cover|oil-filler-cap|lower-timing-cover)$|m50:(intake-runner|intake-plenum|fuel-rail|injector|intake-boot|throttle-body|idle-control-valve|exhaust-manifold|pulley|ignition-coil|cover-bolt|front-cover-bolt|spark-plug))/.test(n.id)
      ||parent.id==='m50:accessories'||parent.id==='m50:cooling'))n.engine='cover';
    if(/^m50:(?:main-bolt|head-bolt)/.test(n.id))n.engine='cover';
    if(n.id==='m50:head-gasket')n.engine='section';
  }
}
