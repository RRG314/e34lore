// Local geometry from BMW's styling drawings. No catalog image is embedded.
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile, rename} from 'node:fs/promises';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {baked, cylinder, lathe, mesh, ring, visualMaterials as M} from '../../tools/geometry/525i-visual-details.mjs';
import {loft} from '../../tools/geometry/525i-fabrication.mjs';

const chart='https://myair-bdr.bmwgroup.com/static/manual/RadReif/RadReif/mj1996/e34_1996.pdf';
const rimDiagram=(id,variant='HC22-EUR-08-1990-E34-BMW-525i')=>'https://www.realoem.com/bmw/enUS/showparts?diagId='+id+'&id='+variant;
const m5='https://www.realoem.com/bmw/en/partgrp?id=HJ91-EUR---E34-BMW-M5&mg=36';
const radius=.32375;
const finish=new T.MeshStandardMaterial({name:'original-alloy',color:'#b0b6b9',metalness:.67,roughness:.37});
const black=new T.MeshStandardMaterial({name:'original-alloy',color:'#34393a',metalness:.54,roughness:.46});
const at=(r,a,z)=>[Math.cos(a)*r,Math.sin(a)*r,z];

// Style, nominal bead diameter in mm, one representative rim width in mm, face geometry.
const styles=[
  ['1','Style 1 · Steel',381,177.8,'steel',20],
  ['2','Style 2 · BMW styling',381,177.8,'slots',20],
  ['3','Style 3 · Forged disc',381,177.8,'forged',20],
  ['4','Style 4 · Multi-spoke',381,177.8,'ribs',20],
  ['5','Style 5 · Cross-spoke',381,177.8,'mesh',20],
  ['5-composite','Style 5 · Two-piece cross-spoke',431.8,203.2,'mesh',20,{bolts:34}],
  ['5-trx','Style 5 · TRX cross-spoke',415,195,'mesh',20,{source:rimDiagram('36_0070')}],
  ['6','Style 6 · 525iX alloy',406.4,190.5,'slots',15,{ix:true}],
  ['7','Style 7 · 15-inch cross-spoke',381,177.8,'td',20,{source:rimDiagram('36_0029','HD53-USA-06_1990_E34_BMW-525i')}],
  ['7-td','Style 7 · Metric TD',390,180,'td',20],
  ['10','Style 10 · Star-spoke',431.8,203.2,'star',6],
  ['10-ii','Style 10 II · Star-spoke',406.4,177.8,'star',6,{source:rimDiagram('36_1622')}],
  ['12','Style 12 · 525iX steel',406.4,190.5,'ix-steel',20,{ix:true}],
  ['14','Style 14 · Ten-spoke',381,177.8,'ten',10],
  ['16','Style 16 · Flat star',406.4,177.8,'flat',5],
  ['18','Style 18 · Round-spoke',406.4,177.8,'round',5],
  ['19','Style 19 · Seven-spoke composite',431.8,203.2,'seven',7,{bolts:34}],
  ['20','Style 20 · M System I turbine',431.8,203.2,'turbine',5,{source:rimDiagram('36_0022'),directional:true}],
  ['21','Style 21 · M System II throwing star',431.8,203.2,'throwing',5,{source:rimDiagram('36_0055'),directional:true}],
  ['26','Style 26 · Ellipsoidal',406.4,177.8,'ellipse',5],
  ['29','Style 29 · Cross-spoke',406.4,177.8,'mesh',15],
  ['32','Style 32 · Radial',431.8,203.2,'radial',15],
  ['37','Style 37 · M Parallel',457.2,203.2,'parallel',4,{source:m5}],
  ['trx-1','TRX 1 · Forged metric',390,165,'trx-forged',16,{source:rimDiagram('36_0033')}],
  ['trx-2','TRX 2 · Cast metric',390,165,'trx-cast',20,{source:rimDiagram('36_0037')}],
];

function contour(path,cx,cy,rx,ry,angle,steps,clockwise,power=1){
  for(let i=0;i<steps;i++){
    const a=i*2*Math.PI/steps*(clockwise?-1:1),c=Math.cos(a),s=Math.sin(a);
    const x=Math.sign(c)*Math.abs(c)**power*rx,y=Math.sign(s)*Math.abs(s)**power*ry;
    const point=[cx+x*Math.cos(angle)-y*Math.sin(angle),cy+x*Math.sin(angle)+y*Math.cos(angle)];
    if(i===0)path.moveTo(...point);else path.lineTo(...point);
  }
  path.closePath();
}
function opening(shape,r,a,length,width,steps,power){
  const hole=new T.Path();
  contour(hole,r*Math.cos(a),r*Math.sin(a),length,width,a,steps,true,power);
  shape.holes.push(hole);
}

function stampedFace(group, style, rim, z, material, low){
  const [kind,count]=style.slice(4);
  const steel=kind.includes('steel');
  const face=new T.Shape(),res=low?54:96,detail=low?12:24;
  const [atRadius,len,width,roundness]={
    steel:[.83,.063,.063,1],
    'ix-steel':[.84,.057,.086,.82],
    slots:[.79,.125,.067,.68],
    forged:[.875,.064,.111,.58],
    round:[.64,.224,.240,.85],
    ellipse:[.654,.214,.216,1],
    'trx-forged':[.846,.086,.081,.65],
    'trx-cast':[.825,.114,.075,.77],
  }[kind] || [];
  contour(face,0,0,rim,rim,0,res,false);
  for(let i=0;i<count;i++)opening(face,rim*atRadius,i*2*Math.PI/count,rim*len,rim*width,detail,roundness);
  if(steel){
    opening(face,0,0,.037,.037,detail,1);
    for(let i=0;i<5;i++)opening(face,.06,i*2*Math.PI/5,.010,.010,detail,1);
  }
  const geo=new T.ExtrudeGeometry(face,{depth:.011,bevelEnabled:true,bevelSegments:low?1:2,steps:1,bevelSize:.0018,bevelThickness:.002});
  mesh(group,geo,material,[0,0,z]);
  const ringR=(kind==='forged'?.70:steel?.39:.40)*rim;
  ring(group,ringR+.004,ringR-.001,.005,[0,0,z-.003],material,'z',res);
  if(kind==='ellipse'){
    for(let i=0;i<count;i++){
      const a=i*2*Math.PI/count;
      const piece=ring(group,rim*.237,rim*.227,.004,at(rim*.654,a,z-.005),material,'z',low?24:40);
      piece.scale.y=.98;
    }
  }
}

function spoke(group, angle, sections, material, low, hand=1){
  loft(group,sections.map(([r,offset,z,width,depth])=>[at(r,angle+offset*hand,z),width,depth]),
    material,{sides:low?8:14,roundness:.48,up:[0,0,1]});
}

function shapedFace(group, style, rim, z, low, hand){
  const [, , , ,kind,count,options={}] = style;
  const baseRadius=(kind==='mesh'||kind==='td')?.40:kind==='flat'?.39:.285;
  const bodyZ=z+(kind==='parallel'?-.005:0);
  for(let i=0;i<count;i++){
    const a=(i+.25)*Math.PI*2/count;
    if(kind==='mesh'||kind==='td'){
      const start=(kind==='td'?.39:.35)*rim;
      for(const sign of [-1,1]){
        spoke(group,a,[
          [start,0,bodyZ+.012,.009,.011],
          [rim*.58,sign*.102,bodyZ+.002,.008,.009],
          [rim*.78,sign*.166,bodyZ-.005,.0068,.0095],
          [rim*.99,sign*.222,z-.002,.006,.010],
        ],finish,low);
        if(kind==='td')spoke(group,a+sign*.074,[
          [rim*.53,0,z+.012,.005,.006],
          [rim*.69,sign*.06,z+.002,.0048,.006],
          [rim*.80,sign*.08,z-.002,.0047,.007],
        ],finish,low);
      }
    }else if(kind==='turbine'||kind==='throwing'){
      const turbine=kind==='turbine';
      if(turbine)lathe(group,[[.034,z+.014],[rim*.82,z+.014],[rim*.91,z-.004],[rim*.88,z-.011],[.034,z-.012],[.034,z+.014]].reverse(),finish,'z',low?48:88);
      const sections=turbine?[
        [rim*.76,0,z-.010,.010,.006],[rim*.84,-.057,z-.014,.016,.008],[rim*.95,-.16,z-.006,.016,.009],
      ]:[
        [rim*.32,0,z+.009,.031,.012],[rim*.54,-.096,z+.002,.034,.014],
        [rim*.78,-.252,z-.012,.026,.016],[rim*.99,-.422,z-.005,.015,.014],
      ];
      for(let j=0;j<(turbine?4:1);j++)spoke(group,a+j*.30,sections,finish,low,hand);
    }else if(kind==='parallel'){
      for(const offset of [-.085,.085])spoke(group,a+offset,[
        [rim*.27,0,z+.008,.016,.018],[rim*.49,offset*.2,z-.006,.013,.016],
        [rim*.77,offset*.38,z-.013,.010,.014],[rim*.996,offset*.51,z-.005,.012,.012],
      ],finish,low);
    }else{
      const widths={ribs:[.009,.008,.005],star:[.023,.019,.015],ten:[.021,.016,.012],
        flat:[.069,.045,.022],seven:[.027,.016,.011],radial:[.013,.011,.008]}[kind];
      const [aWidth,bWidth,cWidth]=widths;
      const swept=kind==='seven'?.105:0;
      spoke(group,a,[
        [rim*baseRadius,0,bodyZ+.010,aWidth,.014],
        [rim*.53,swept*.3,bodyZ+.004,bWidth,.014],
        [rim*.78,swept*.6,z-.006,cWidth,.012],
        [rim*.998,swept,z-.002,cWidth+.002,.010],
      ],finish,low);
      if(kind==='star'||kind==='ribs')spoke(group,a,[
        [rim*.48,0,z-.010,.003,.002],[rim*.73,0,z-.019,.004,.002],
        [rim*.93,0,z-.014,.004,.002],
      ],M.machined,low);
    }
  }
  if(options.bolts)for(let i=0;i<options.bolts;i++){
    const a=i*2*Math.PI/options.bolts;
    cylinder(group,.004,.005,at(rim*.960,a,z-.013),M.machined,'z',low?6:10);
  }
}
function buildFace(group,style,rim,z,low,hand){
  const kind=style[4],steel=kind.includes('steel');
  const material=steel?black:finish;
  const stamped=['steel','ix-steel','slots','forged','round','ellipse','trx-forged','trx-cast'].includes(kind);
  if(stamped)stampedFace(group,style,rim,z,material,low);
  else shapedFace(group,style,rim,z,low,hand);
  if(steel) {
    ring(group,.080,.0365,.014,[0,0,z+.006],black,'z',48);
    for(let i=0;i<5;i++)cylinder(group,.009,.018,at(.060,i*2*Math.PI/5,z-.006),M.machined,'z',6);
    return;
  }
  const cap=({td:.0845,slots:.077,forged:.075,mesh:.076,turbine:.048,throwing:.057,
    ellipse:.061,seven:.054,'trx-forged':.061,'trx-cast':.060})[kind]||.035;
  const hub=Math.max(cap+.005,.076);
  lathe(group,[[0,z+.065],[hub*.85,z+.065],[hub,z+.011],[hub,z-.002],[cap,z-.009],[0,z-.009]].reverse(),
    material,'z',low?40:72);
  if(cap<.055){
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      ring(group,.013,.009,.005,at(.060,a,z-.003),M.dark,'z',20);
      cylinder(group,.008,.010,at(.060,a,z-.007),M.machined,'z',6);
    }
  }else ring(group,cap,cap-.003,.004,[0,0,z-.011],M.machined,'z',48);
  cylinder(group,Math.min(cap-.006,.028),.005,[0,0,z-.013],M.dark,'z',32);
}

function wheel(style,low,hand=1){
  const [id,,diameter,width,kind]=style;
  const g=new T.Group();g.name='e34_wheel_'+id;
  const r=diameter/2000,half=(width/1000+.021)/2, tread=half+.005, z=-half+.018;
  const rim= r-.002;
  const segments=low?48:100;
  // Tire shoulder, bead, sidewall and crown. Wheel centre and rolling radius stay aligned to the car.
  lathe(g,[[r-.005,-half],[r+.005,-half-.004],[r+.026,-tread-.003],
    [radius-.038,-tread-.006],[radius-.016,-tread+.002],[radius-.003,-tread*.77],
    [radius,-tread*.60],[radius,tread*.60],[radius-.003,tread*.77],[radius-.016,tread-.002],
    [radius-.038,tread+.004],[r+.026,tread+.002],[r+.005,half+.004],[r-.005,half],
    [r-.005,-half]],M.rubber,'z',segments);
  for(const sign of [-1,1]){
    lathe(g,[[radius-.001,sign*.030],[radius+.0003,sign*.030],[radius+.0003,sign*.033],[radius-.001,sign*.033]],
      M.dark,'z',segments);
  }
  const isSteel=kind.includes('steel');
  lathe(g,[[r-.012,-half+.012],[r-.004,-half+.008],[r+.004,-half+.001],
    [r+.009,-half-.003],[r+.009,-half+.005],[r+.001,-half+.016],[r-.003,-half+.044],
    [r-.014,-.027],[r-.014,.036],[r-.004,half-.009],[r+.005,half],[r+.005,half+.004],
    [r-.004,half+.006],[r-.013,half-.010],[r-.020,.040],[r-.021,-.028],[r-.012,-half+.012]],
    isSteel?black:M.machined,'z',segments);
  buildFace(g,style,rim,z,low,hand);
  const a=.36;
  cylinder(g,.0038,.020,at(r-.010,a,-half+.009),M.rubber,'z',12);
  cylinder(g,.0045,.006,at(r-.010,a,-half-.003),M.dark,'z',12);
  return baked(g);
}

const output='work/525i-detail-review/wheels';
await mkdir(output,{recursive:true});
globalThis.FileReader=class{
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}
};
async function writeWheel(style,low,hand){
  const bytes=Buffer.from(await new GLTFExporter().parseAsync(wheel(style,low,hand),{binary:true}));
  if(bytes.length>1_000_000)throw Error('Oversized wheel package '+style[0]);
  const sha256=createHash('sha256').update(bytes).digest('hex');
  const url='/models/e34-build-review/wheels/'+sha256+'.glb';
  const filename=output+'/'+sha256+'.glb';
  try{await writeFile(filename,bytes,{flag:'wx'});}
  catch(error){if(error.code!=='EEXIST'||!(await readFile(filename)).equals(bytes))throw error;}
  return {url,bytes:bytes.length,sha256};
}

const packages=[];
for(const style of styles){
  const [id,label,diameter,width,,,options={}]=style;
  const dimensions=(diameter===390||diameter===415)?diameter+' mm metric':Math.round(diameter/25.4)+' in';
  const high=await writeWheel(style,false,1),low=await writeWheel(style,true,1);
  const right=options.directional?{...await writeWheel(style,false,-1),lodLow:await writeWheel(style,true,-1)}:null;
  packages.push({
    id:'e34-factory-'+id+'-v1',label,dimensions,nominalRimMm:[diameter,width],...high,lodLow:low,right,
    normalization:1,source:options.source||chart,group:options.ix?'525iX':id==='20'||id==='21'||id==='37'?'M5':'E34',
  });
}
const manifest=output+'/packages.json';
await writeFile(manifest+'.tmp',JSON.stringify(packages,null,2)+'\n');
await rename(manifest+'.tmp',manifest);
console.log(JSON.stringify({styles:packages.length,maxHighBytes:Math.max(...packages.map(p=>p.bytes))}));
