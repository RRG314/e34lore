import { ExtrudeGeometry, Path, Shape } from 'three';
import { box, cylinder, lathe, mesh, ring, surface, visualMaterials as M } from './525i-visual-details.mjs';

const slot = Math.PI / 4;
const bladeCount=11;
const screwPitch=.055;

export const fanFit = {
  e30:{center:[1.832,.548,.057],cowl:[1.875,.548,.057],radius:.205,width:.550,cowlTop:.224},
  e34:{center:[1.638,.547,0],cowl:[1.708,.547,0],radius:.210,width:.608,cowlTop:.222},
};

function disk(g, geometry, at, material, depth){
  const piece=new ExtrudeGeometry(geometry,{depth,bevelEnabled:false,curveSegments:24});
  piece.translate(0,0,-depth/2);
  piece.rotateY(Math.PI/2);
  mesh(g,piece,material,at);
}

const circle=(shape,y,z,r,direction=false)=>shape.absarc(-z,y,r,0,2*Math.PI,direction);
function fan(g,radius){
  const hub=new Shape();
  circle(hub,0,0,.074);
  const bore=new Path();
  circle(bore,0,0,.045,true);
  hub.holes.push(bore);
  for(let index=0;index<4;index++){
    const angle=slot+index*Math.PI/2,hole=new Path();
    circle(hole,screwPitch*Math.cos(angle),screwPitch*Math.sin(angle),.0034,true);
    hub.holes.push(hole);
  }
  disk(g,hub,[0,0,0],M.plastic,.010);
  for(let blade=0;blade<bladeCount;blade++){
    const radial=10,chord=4,points=[],indices=[];
    const phi=blade*Math.PI*2/bladeCount;
    for(const skin of [-1,1])for(let j=0;j<=radial;j++)for(let k=0;k<=chord;k++){
      const t=j/radial,u=k/chord;
      const r=.068+(radius-.068)*t;
      const sweep=.06+.29*t,angle=phi+sweep+(u-.5)*(.34-.14*t);
      const pitch=(u-.5)*(.054-.024*t);
      points.push([pitch+.007*Math.sin(u*Math.PI)+skin*.0011,Math.cos(angle)*r,Math.sin(angle)*r]);
    }
    const layer=(radial+1)*(chord+1);
    for(let j=0;j<radial;j++)for(let k=0;k<chord;k++){
      const a=j*(chord+1)+k,b=a+chord+1;
      indices.push(a,b,a+1,b,b+1,a+1,layer+a,layer+a+1,layer+b,layer+b,layer+a+1,layer+b+1);
    }
    const edge=[];
    for(let k=0;k<=chord;k++)edge.push(k);
    for(let j=1;j<=radial;j++)edge.push(j*(chord+1)+chord);
    for(let k=chord-1;k>=0;k--)edge.push(radial*(chord+1)+k);
    for(let j=radial-1;j>=1;j--)edge.push(j*(chord+1));
    for(let i=0;i<edge.length;i++){
      const a=edge[i],b=edge[(i+1)%edge.length];
      indices.push(a,layer+a,b,b,layer+a,layer+b);
    }
    surface(g,points,indices,M.plastic);
  }
}

function coupling(g,e30){
  lathe(g,[[.009,-.045],[.021,-.045],[.025,-.039],[.026,-.031],[.050,-.028],
    [.055,-.024],[.057,-.011],[.052,-.008],[.044,-.005],[.021,.016],[.009,.016],
    [.009,-.045]],M.alloy,'x',38);
  const nutX=e30?-.041:-.027;
  ring(g,.0185,.009,.014,[nutX,0,0],M.machined,'x',6);
  for(let index=0;index<36;index++){
    const a=index*Math.PI*2/36;
    const fin=box(g,[.015,.003,.031],[-.017,Math.cos(a)*.038,Math.sin(a)*.038],M.alloy,.0007);
    fin.rotation.x=a+Math.PI/2;
  }
  for(let index=0;index<4;index++){
    const angle=slot+index*Math.PI/2;
    const y=screwPitch*Math.cos(angle),z=screwPitch*Math.sin(angle);
    ring(g,.010,.0031,.011,[-.010,y,z],M.alloy,'x',20);
  }
  box(g,[.003,.005,.046],[.016,0,0],M.steel,.001);
}

function shroud(g,radius,width,top,throat){
  const points=[],indices=[],count=72,half=width/2;
  for(let side=0;side<2;side++)for(let i=0;i<=count;i++){
    const a=i*Math.PI*2/count,c=Math.cos(a),s=Math.sin(a);
    const h=c>0?top:.222;
    const r=Math.min(h/Math.max(.000001,Math.abs(c)),half/Math.max(.000001,Math.abs(s)));
    points.push([side*.003,c*r,s*r],[-throat+side*.003,c*(radius+.008),s*(radius+.008)]);
  }
  const layer=(count+1)*2;
  for(let i=0;i<count;i++){
    const a=i*2;
    indices.push(a,a+1,a+2,a+1,a+3,a+2,layer+a,layer+a+2,layer+a+1,layer+a+1,layer+a+2,layer+a+3);
  }
  surface(g,points,indices,M.plastic);
  ring(g,radius+.012,radius+.008,.030,[-throat-.008,0,0],M.plastic,'x',64);
  for(const sign of [-1,1]){
    box(g,[.028,.420,.017],[0,-.007,sign*(half-.010)],M.plastic,.003);
    for(const [y,x] of [[top-.004,.015],[-.220,.014]]){
      ring(g,.015,.004,.010,[x,y,sign*(half-.031)],M.plastic,'y',20);
      box(g,[.021,.017,.026],[0,y,sign*(half-.035)],M.plastic,.003);
    }
  }
  for(const y of [top,-.220])box(g,[.019,.012,width-.021],[0,y,0],M.plastic,.002);
}

export function buildFanService(series,part,paint){
  const {center,cowl,radius,width,cowlTop}=fanFit[series],e30=series==='e30';
  part('fan','11-blade engine cooling fan',center,g=>fan(g,radius));
  part('coupling','Viscous fan clutch and left-hand nut',center,g=>coupling(g,e30));
  part('shroud','Radiator fan shroud',cowl,g=>shroud(g,radius,width,cowlTop,e30?.032:.057));
  for(let index=0;index<4;index++){
    const angle=slot+index*Math.PI/2;
    const point=[center[0]+.012,center[1]+screwPitch*Math.cos(angle),center[2]+screwPitch*Math.sin(angle)];
    part('fan-screw-'+(index+1),'Fan to clutch screw '+(index+1),point,g=>{
      cylinder(g,.003,.016,[-.009,0,0],M.steel,'x',18);
      ring(g,.006,.0026,.003,[0,0,0],M.machined,'x',24);
      cylinder(g,.0045,.003,[-.002,0,0],M.machined,'x',20);
      ring(g,.0027,.0017,.0011,[.0016,0,0],M.dark,'x',6);
    });
  }
  for(const [side,sign] of [['left',-1],['right',1]]){
    const point=[cowl[0]+.015,cowl[1]+cowlTop+.003,cowl[2]+sign*(width/2-.031)];
    part('shroud-rivet-'+side,side==='left'?'Left shroud push rivet':'Right shroud push rivet',point,g=>{
      lathe(g,[[0,-.012],[.003,-.012],[.003,-.002],[.008,-.002],[.008,.001],[.004,.002],
        [.0038,.004],[0,.004]],M.plastic,'y',24);
    });
  }
  if(e30)part('radiator-support','Radiator cross panel and upper mounts',[1.904,.589,0],g=>{
    box(g,[.104,.035,1.228],[.031,.135,0],paint,.011);
    box(g,[.094,.035,1.211],[.030,-.185,0],paint,.012);
    for(const z of [-.53,.53]){
      box(g,[.108,.030,.073],[.013,.103,z],paint,.006);
      box(g,[.064,.080,.062],[.055,.079,z],paint,.006);
    }
    for(const z of [-.344,.344]){
      box(g,[.148,.057,.091],[-.012,.129,z],M.plastic,.013);
      for(const x of [.014,-.045])cylinder(g,.008,.006,[x,.150,z],M.machined,'y',6);
    }
  });
}
