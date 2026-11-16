import {MeshStandardMaterial} from 'three';
import {box, cylinder, lathe, ring, tube, visualMaterials as M} from './525i-visual-details.mjs';
import {loft} from './525i-fabrication.mjs';
import {origin} from './525i-suspension.mjs';

const base='https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/vehicle_trim/';
const drawings={
  side:['Side mouldings, clamps and body grommets','bumper_guard','ba05555373f07a8bfe452c27'],
  frame:['Door frame and cowl trim fasteners','exterior_trim_grille','5bd6dd3ac86e942c0fc22e03'],
  bumper:['Front bumper covers and rivets','trim_panel_bumper','85251121356aa0b661d0be86'],
};
export const trimSources=Object.values(drawings).map(([title,slug])=>({title,url:base+slug+'.html'}));
export const trimScope=['system:body-trim','Body trim','system:exterior'];
const scope=trimScope[0];
const moulding=new MeshStandardMaterial({name:'side-moulding-polymer',color:'#252827',roughness:.73});
const clip=new MeshStandardMaterial({name:'blue-retaining-clamp',color:'#658ea5',roughness:.55});
const socket=new MeshStandardMaterial({name:'natural-nylon-grommet',color:'#cccfc1',roughness:.70});
const mountingNote='Clip positions are illustrated. Compare the fastener and panel hole before ordering.';
const ref=(kind,...numbers)=>{
  const [title,slug,id]=drawings[kind];
  return {catalog:['catalog-assembly-'+id,...numbers],visualSources:[{title,url:base+slug+'.html'}]};
};
const bodyPart=(parentId,settings={})=>({matrix:origin,parentId,systems:['system:exterior',scope],...settings});
const installed=[
// Each station follows the retained exterior mesh, including the rake through the doors.
  ['rear-fender','rear-quarter',null,[[-1.066,.516,.859],[-1.045,.515,.863],[-1.013,.514,.864]], [51131934183,51131934184],1],
  ['rear-door','rear-door','15',[[-.997,.514,.864],[-.951,.513,.864],[-.781,.509,.866],
    [-.605,.503,.867],[-.431,.497,.869],[-.280,.493,.870]], [51131934181,51131934182],4],
  ['front-door','front-door','16',[[-.256,.493,.870],[-.177,.491,.870],[.018,.485,.869],
    [.226,.480,.867],[.438,.473,.865],[.609,.468,.863],[.737,.464,.859]], [51131934177,51131934178],5],
  ['front-fender','front-fender','14',[[.751,.463,.860],[.823,.461,.859],[.952,.459,.858],
    [1.068,.457,.855]], [51131944941,51131944942],2],
];

function interpolate(stations,x){
  const b=stations.findIndex(p=>p[0]>=x);
  if(b<=0)return stations[0];
  const from=stations[b-1],to=stations[b],t=(x-from[0])/(to[0]-from[0]);
  return [x,from[1]+(to[1]-from[1])*t,from[2]+(to[2]-from[2])*t];
}
function bar(g,stations,side){
  const levels=stations.map(([x,y,z],i)=>[[x,y,z*side],i===0||i===stations.length-1?.004:.0076,
    i===0||i===stations.length-1?.010:.015]);
  loft(g,levels,moulding,{roundness:.43,sides:18});
  tube(g,stations.map(([x,y,z])=>[x,y+.010,(z+.0048)*side]),.0013,M.edge,18);
  for(const y of [-.008,.008])loft(g,stations.map(([x,c,z])=>[[x,c+y,(z-.007)*side],.0023,.002]),
    M.dark,{roundness:.55,sides:8});
}
function sideClip(g,[x,y,z],side){
  const at=(dx,dy,dz)=>[x+dx,y+dy,z+side*dz];
  loft(g,[
    [at(-.010,0,.0023),.0014,.0058],[at(-.008,0,.0026),.0019,.0067],
    [at(.008,0,.0026),.0019,.0067],[at(.010,0,.0023),.0014,.0058],
  ],clip,{roundness:.35,sides:16});
  for(const h of [-.0063,.0063]){
    loft(g,[
      [at(-.013,h,.0025),.0018,.0013],[at(-.011,h,.0030),.0031,.0020],
      [at(.011,h,.0030),.0031,.0020],[at(.013,h,.0025),.0018,.0013],
    ],clip,{roundness:.42,sides:14});
    loft(g,[
      [at(-.010,h*1.15,.0005),.0014,.0010],[at(0,h*1.15,.0001),.0021,.0012],
      [at(.010,h*1.15,.0005),.0014,.0010],
    ],clip,{roundness:.45,sides:12});
  }
  for(const sign of [-1,1]){
    const d=sign*.0033;
    loft(g,[
      [at(d,0,.0011),.0020,.0028],[at(d*1.12,0,-.0023),.0023,.0030],
      [at(d*1.36,0,-.0058),.0019,.0027],[at(d*.92,0,-.0090),.0011,.0014],
    ],clip,{roundness:.56,sides:14});
  }
  cylinder(g,.0028,.0068,at(.009,.001,.0006),clip,'z',20);
}
function grommet(g,[x,y,z],side){
  const at=(dx,dy,dz)=>[x+dx,y+dy,z+side*dz];
  ring(g,.0081,.0046,.0026,at(0,0,-.0008),socket,'z',36);
  ring(g,.0061,.0046,.002,at(0,0,-.0084),socket,'z',32);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    const leg=box(g,[.0023,.0054,.009],at(Math.cos(a)*.0058,Math.sin(a)*.0058,-.0048),socket,.0007);
    leg.rotation.z=a;
  }
}
function rivet(g,point,axis='y'){
  ring(g,.0075,.0025,.0027,point,M.edge,axis,28);
  const stem=[...point],pin=[...point],axisIndex=axis==='x'?0:1;
  stem[axisIndex]-=.005;
  pin[axisIndex]+=.0026;
  ring(g,.004,.0023,.010,stem,M.plastic,axis,24);
  cylinder(g,.0024,.013,pin,M.dark,axis,16);
  cylinder(g,.0045,.003,pin,M.dark,axis,20);
}

export function addTrim(collect,model){
  for(const [index,side,label] of [[0,-1,'Left'],[1,1,'Right']]){
    const sideName=label.toLowerCase();
    const sidePoint=([x,y,z])=>[x,y,side*z];
    for(const [labelName,panel,existing,stations,numbers,count] of installed){
      const parent='e34body:'+panel+'-'+sideName;
      const node=existing?'e34body:side-moulding-e34-body-'+existing+'-'+sideName:'e34body:rear-fender-moulding-'+sideName;
      const partName=label+' '+labelName.replace('-',' ');
      collect(node,partName+' protective moulding',g=>bar(g,stations,side),
        {...bodyPart(parent),trimCover:true,...ref('side',String(numbers[index]))});
      const start=stations[0][0],end=stations.at(-1)[0];
      for(let j=0;j<count;j++){
        const t=count===1?.5:(j+.52)/count;
        const [x,y,z]=interpolate(stations,start+(end-start)*t);
        const p=sidePoint([x,y,z-.0077]);
        const id='e34trim:'+labelName+'-'+sideName+'-'+(j+1);
        collect(id+'-clamp',partName+' moulding clip '+(j+1),g=>sideClip(g,p,side),
          {...bodyPart(parent,{internal:true}),...ref('side','51131946258'),note:mountingNote});
        collect(id+'-grommet',partName+' moulding grommet '+(j+1),g=>grommet(g,p,side),
          {...bodyPart(parent,{internal:true}),...ref('side','51131934160'),note:mountingNote});
      }
    }
    const a=.376,b=.641;
    const frontPanel=sidePoint([2.158,.409,.531]);
    collect('e34body:bumper-louvre-'+sideName,label+' front bumper insert',g=>{
      const p=t=>[2.176-.060*t,.404-.004*t,side*(a+(b-a)*t)];
      for(const h of [-.021,.021])loft(g,[0,.12,.40,.72,1].map(t=>{
        const [x,y,z]=p(t);return [[x,y+h,z],.007,.0045];
      }),M.plastic,{sides:12,roundness:.45});
      for(const t of [0,.25,.50,.75,1]){
        const [x,y,z]=p(t);
        box(g,[.013,.041,.010],[x,y,z],M.plastic,.002);
      }
      for(const h of [-.010,0,.010])loft(g,[0,.20,.50,.80,1].map(t=>{
        const [x,y,z]=p(t);return [[x-.001,y+h,z],.005,.0025];
      }),M.edge,{sides:10});
    },{...bodyPart('e34body:front-bumper'),trimCover:true,...ref('bumper',index===0?'51111946495':'51111946496')});
    collect('e34trim:bumper-insert-clip-'+sideName,label+' bumper insert clamp',g=>{
      const [x,y,z]=frontPanel;
      box(g,[.007,.025,.032],[x-.009,y-.007,z],M.steel,.002);
      for(const offset of [-.010,.010])box(g,[.013,.005,.007],[x-.003,y-.005,z+offset],M.dark,.001);
      rivet(g,[x-.010,y-.021,z],'y');
    },{...bodyPart('e34body:front-bumper',{internal:true}),...ref('bumper',index===0?'51111973725':'51111973726')});
    collect('e34trim:bumper-expanding-rivet-'+sideName,label+' bumper expanding rivet',g=>{
      rivet(g,sidePoint([2.104,.367,.648]),'x');
    },{...bodyPart('e34body:front-bumper',{internal:true}),...ref('bumper','51111944537')});
    collect('e34body:cowl-trim-'+sideName,label+' cowl cover',g=>{
      const path=[sidePoint([.758,.876,.028]),sidePoint([.752,.877,.239]),
        sidePoint([.752,.866,.447]),sidePoint([.758,.846,.643])];
      loft(g,path.map((p,i)=>[p,i===0?.022:.040,.007]),M.plastic,{sides:16,roundness:.36});
      for(let i=0;i<13;i++){
        const z=.08+i*.041,y=.879-.038*(z/.66)**2;
        box(g,[.055,.003,.006],sidePoint([.752,y,z]),M.edge,.0012);
      }
    },{...bodyPart('e34bay:cowl',{systems:['system:exterior','system:engine-bay',scope]}),
      trimCover:true,...ref('frame',index===0?'51711946125':'51711946126')});
    for(const [i,z] of [.149,.536].entries()){
      collect('e34trim:cowl-rivet-'+sideName+'-'+(i+1),label+' cowl expanding rivet '+(i+1),g=>{
        rivet(g,sidePoint([.765,.882-.038*(z/.66)**2,z]));
      },{...bodyPart('e34bay:cowl',{internal:true}),...ref('frame','51711928946')});
    }
  }
  for(const node of model.nodes){
    if(/^(e34body:|wheel:|e34bay:cowl$)/.test(node.id)||node.systemIds.includes('system:interior')){
      node.systemIds=[...new Set([...node.systemIds,scope])];
    }
  }
}
