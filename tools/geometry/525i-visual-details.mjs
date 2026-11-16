/** Original visual studies in metres. Source dimensions are identified separately.
 * Castings, interfaces and installed clearances remain illustrative. */
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const material=(name,color,metalness,roughness)=>Object.assign(new T.MeshStandardMaterial({color,metalness,roughness}),{name});
const M={
 plastic:material('moulded-graphite','#242b2c',.02,.72),
 edge:material('moulded-rib','#313a3b',.02,.64),
 rubber:material('rubber-seals','#151b1c',0,.93),
 alloy:material('cast-aluminium','#9b9fa0',.62,.54),
 machined:material('machined-metal','#b8bfc0',.85,.3),
 steel:material('formed-steel','#667174',.72,.5),
 dark:material('coated-steel','#323c40',.52,.63),
 rotor:material('brake-friction-surface','#939fa2',.78,.43),
 fin:material('radiator-fins','#596568',.68,.59),
 reservoir:material('reservoir-polymer','#cdd2c1',0,.5),
 seam:material('welded-seams','#89918e',.75,.55),
};
function mesh(g,geometry,mat,position=[0,0,0]){const o=new T.Mesh(geometry,mat);o.position.fromArray(position);g.add(o);return o;}
function box(g,size,at,mat=M.plastic,r=.004){const radius=Math.min(r,...size.map(n=>n*.24)),geometry=radius<.0015?new T.BoxGeometry(...size):new RoundedBoxGeometry(...size,radius>.004?2:1,radius);return mesh(g,geometry,mat,at);}
function cylinder(g,r,h,at,mat=M.alloy,axis='y',segments=40,r2=r){const geo=new T.CylinderGeometry(r2,r,h,segments);if(axis==='x')geo.rotateZ(-Math.PI/2);if(axis==='z')geo.rotateX(Math.PI/2);return mesh(g,geo,mat,at);}
function tube(g,points,r,mat=M.rubber,segments=28){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>V(...p))),segments,r,10,false),mat);}
function ring(g,outer,inner,h,at,mat=M.machined,axis='z',segments=64){
 const s=new T.Shape();s.absarc(0,0,outer,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);s.holes.push(hole);
 const geo=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:segments/4});geo.translate(0,0,-h/2);
 if(axis==='x')geo.rotateY(Math.PI/2);if(axis==='y')geo.rotateX(-Math.PI/2);return mesh(g,geo,mat,at);
}
function lathe(g,profile,mat,axis='z',segments=64,start=0,length=Math.PI*2){
 const geo=new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),segments,start,length);
 if(axis==='z')geo.rotateX(Math.PI/2);if(axis==='x')geo.rotateZ(-Math.PI/2);return mesh(g,geo,mat);
}
function bolts(g,count,r,at,axis='z',size=.004){for(let i=0;i<count;i++){const a=i*Math.PI*2/count;const p=axis==='x'?[at[0],at[1]+Math.cos(a)*r,at[2]+Math.sin(a)*r]:[at[0]+Math.cos(a)*r,at[1]+Math.sin(a)*r,at[2]];cylinder(g,size,.007,p,M.machined,axis,6);}}
function surface(g,points,indices,mat){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(g,geo,mat);}
function baked(g){
 g.updateMatrixWorld(true);const byMaterial=new Map();
 g.traverse(o=>{if(!(o instanceof T.Mesh))return;const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();for(const name of Object.keys(geo.attributes))if(!['position','normal'].includes(name))geo.deleteAttribute(name);geo.applyMatrix4(o.matrixWorld);const list=byMaterial.get(o.material)||[];list.push(geo);byMaterial.set(o.material,list);});
 const out=new T.Group();out.name=g.name;
 for(const [mat,geometries]of byMaterial){const merged=mergeGeometries(geometries);geometries.forEach(geo=>geo.dispose());if(!merged)throw Error('Visual detail merge failed');const indexed=mergeVertices(merged,.0000001);merged.dispose();out.add(new T.Mesh(indexed,mat));}
 return out;
}

function coolingFan(g){
 // Cojali 8111602 / BMW11521712058: diameter420, 11 blades, centring134.8.
 const hub=new T.Shape();hub.absarc(0,0,.084,0,Math.PI*2,false);const centre=new T.Path();centre.absarc(0,0,.0674,0,Math.PI*2,true);hub.holes.push(centre);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3,hole=new T.Path();hole.absarc(Math.cos(a)*.076,Math.sin(a)*.076,.0034,0,Math.PI*2,true);hub.holes.push(hole);}
 const hubGeometry=new T.ExtrudeGeometry(hub,{depth:.012,bevelEnabled:false,curveSegments:48});hubGeometry.translate(0,0,-.006);hubGeometry.rotateY(Math.PI/2);mesh(g,hubGeometry,M.reservoir);
 for(let i=0;i<11;i++){
  const phi=i*Math.PI*2/11,points=[],indices=[],radial=14,chord=5;
  for(let side=0;side<2;side++)for(let j=0;j<=radial;j++)for(let k=0;k<=chord;k++){
   const t=j/radial,u=k/chord,r=.080+t*.130;
   const sweep=.11+.24*t,spread=(.25-.09*t),angle=phi+sweep+(u-.5)*spread;
   // Twisted, cambered blade with a closed skin instead of a rectangular slab.
   const x=(u-.5)*(.062-.022*t)*(.95-.25*t)+Math.sin(u*Math.PI)*.008+(side?-.0011:.0011);
   points.push([x,Math.cos(angle)*r,Math.sin(angle)*r]);
  }
  const layer=(radial+1)*(chord+1);
  for(let j=0;j<radial;j++)for(let k=0;k<chord;k++){const a=j*(chord+1)+k,b=a+chord+1;indices.push(a,b,a+1,a+1,b,b+1,layer+a,layer+a+1,layer+b,layer+a+1,layer+b+1,layer+b);}
  const edge=[];for(let k=0;k<=chord;k++)edge.push(k);for(let j=1;j<=radial;j++)edge.push(j*(chord+1)+chord);for(let k=chord-1;k>=0;k--)edge.push(radial*(chord+1)+k);for(let j=radial-1;j>0;j--)edge.push(j*(chord+1));
  for(let q=0;q<edge.length;q++){const a=edge[q],b=edge[(q+1)%edge.length];indices.push(a,layer+a,b,b,layer+a,layer+b);}
  const blade=surface(g,points,indices,M.reservoir);blade.name='curved-blade-'+i;
  box(g,[.016,.012,.011],[0,Math.cos(phi+.1)*.080,Math.sin(phi+.1)*.080],M.reservoir,.003);
 }
 // Mounting pads are illustrative; the three-hole count comes from the manufacturer.
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ring(g,.006,.0034,.014,[0,Math.cos(a)*.076,Math.sin(a)*.076],M.reservoir,'x',24);}
}
function fanCoupling(g){
 lathe(g,[[0,-.037],[.027,-.037],[.037,-.027],[.054,-.021],[.057,.007],[.052,.018],[.025,.021],[.018,.035],[0,.035]],M.alloy,'x');
 for(let i=0;i<40;i++){const a=i*Math.PI*2/40;const fin=box(g,[.026,.003,.022],[.002,Math.cos(a)*.044,Math.sin(a)*.044],M.alloy,.0008);fin.rotation.x=a;}
 cylinder(g,.016,.025,[.041,0,0],M.machined,'x',6);bolts(g,3,.076,[.019,0,0],'x');
}
function shroud(g){
 const points=[],idx=[],count=96;
 for(let side=0;side<2;side++)for(let i=0;i<=count;i++){
  const a=i*Math.PI*2/count,c=Math.cos(a),s=Math.sin(a),r=Math.min(.223/Math.max(.000001,Math.abs(c)),.304/Math.max(.000001,Math.abs(s)));
  points.push([-.004+side*.003,c*r,s*r],[-.042+side*.003,c*.217,s*.217]);
 }
 const layer=(count+1)*2;
 for(let i=0;i<count;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2,layer+a,layer+a+2,layer+a+1,layer+a+1,layer+a+2,layer+a+3);}
 surface(g,points,idx,M.plastic);
 ring(g,.221,.217,.067,[-.030,0,0],M.plastic,'x',96);
 for(const z of [-.285,.285])box(g,[.027,.435,.024],[-.001,0,z],M.edge,.005);
 for(const y of [-.216,.216])box(g,[.024,.020,.58],[0,y,0],M.edge,.004);
 for(const z of [-.24,.24]){box(g,[.040,.026,.035],[.005,.227,z],M.plastic,.004);cylinder(g,.005,.030,[.005,.235,z],M.steel,'x',16);}
}
function radiator(g){
 box(g,[.039,.412,.578],[0,0,0],M.dark,.002);
 // Recessed core, rows of tubes and folded fins on both faces.
 for(const x of [-.023,.023]){
  for(let row=0;row<31;row++)box(g,[.003,.0023,.566],[x,-.201+row*.0134,0],M.machined,.0005);
  const p=[],idx=[];
  for(let row=0;row<30;row++)for(let j=0;j<110;j++){
   const z=-.281+j*.0051,y=-.199+row*.0134;const n=p.length;
   p.push([x,y,z],[x+(j%2?.002:-.002),y+.009,z+.00255],[x,y,z+.0051]);idx.push(n,...(x<0?[n+2,n+1]:[n+1,n+2]));
  }
  const fins=surface(g,p,idx,M.fin);fins.material=M.fin;
 }
 for(const z of [-.32,.32]){
  box(g,[.070,.435,.063],[0,0,z],M.plastic,.012);
  for(let j=0;j<18;j++){box(g,[.014,.009,.016],[-.037,-.196+j*.023,z-Math.sign(z)*.029],M.machined,.001);}
 }
 for(const y of [-.212,.212])box(g,[.047,.018,.59],[0,y,0],M.dark,.004);
 for(const z of [-.23,.23]){box(g,[.11,.026,.045],[.003,.235,z],M.plastic,.007);cylinder(g,.010,.018,[.004,-.23,z],M.rubber);}
 for(const [y,z]of [[.16,-.322],[-.16,.322]]){cylinder(g,.020,.062,[-.061,y,z],M.plastic,'x');ring(g,.022,.018,.005,[-.088,y,z],M.edge,'x');}
}
function airbox(g,lid=false){
 if(lid){
  box(g,[.308,.025,.235],[0,.075,0],M.plastic,.012);
  for(const x of [-.148,.148])box(g,[.011,.035,.224],[x,.061,0],M.plastic,.004);
  for(const z of [-.111,.111])box(g,[.292,.035,.011],[0,.061,z],M.plastic,.004);
  for(let i=0;i<7;i++)box(g,[.012,.010,.209],[-.121+i*.0403,.093,0],M.edge,.004);
  box(g,[.090,.004,.042],[.025,.091,0],M.plastic,.004);
  return;
 }
 box(g,[.300,.009,.232],[0,-.084,0],M.plastic,.007);
 for(const x of [-.148,.148])box(g,[.010,.133,.230],[x,-.018,0],M.plastic,.006);
 for(const z of [-.112,.112])box(g,[.288,.133,.010],[0,-.018,z],M.plastic,.006);
 for(const x of [-.148,.148])box(g,[.012,.009,.240],[x,.048,0],M.edge,.003);
 for(const z of [-.116,.116])box(g,[.292,.009,.012],[0,.048,z],M.edge,.003);
 for(let i=0;i<6;i++)box(g,[.009,.007,.20],[-.12+i*.048,-.076,0],M.edge,.002);
 for(const x of [-.100,0,.100])for(const z of [-.124,.124]){box(g,[.016,.034,.004],[x,.032,z],M.steel,.001);tube(g,[[x-.008,.048,z],[x,.055,z+.004*Math.sign(z)],[x+.008,.048,z]],.0018,M.machined,8);}
 cylinder(g,.031,.036,[-.163,.010,-.045],M.plastic,'x');ring(g,.033,.027,.004,[-.181,.010,-.045],M.edge,'x');
}
function snorkel(g){
 // Hollow transition duct with a visible mouth and raised moulding seam.
 const p=[],idx=[],sections=15,around=32;
 for(let side=0;side<2;side++)for(let j=0;j<=sections;j++)for(let k=0;k<around;k++){
  const t=j/sections,a=k*Math.PI*2/around,w=.052+.025*t,h=.026+.006*t,inset=side*.003;
  const y=Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.36)*(h-inset),z=Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.36)*(w-inset);
  p.push([-.174+t*.348,y+Math.sin(t*Math.PI)*.007,z]);
 }
 const layer=(sections+1)*around;
 for(let j=0;j<sections;j++)for(let k=0;k<around;k++){const a=j*around+k,b=j*around+(k+1)%around,c=a+around,d=b+around;idx.push(a,c,b,b,c,d,layer+a,layer+b,layer+c,layer+b,layer+d,layer+c);}
 for(const row of [0,sections*around])for(let k=0;k<around;k++){const a=row+k,b=row+(k+1)%around;idx.push(a,b,layer+a,b,layer+b,layer+a);}
 surface(g,p,idx,M.plastic);
 for(const z of [-.053,.053])tube(g,[[-.16,.027,z],[-.02,.035,z*1.2],[.17,.032,z*1.46]],.002,M.edge,16);
 // Cut the visual aperture through the collar instead of closing it with a cap.
 for(const z of [-.083,.083])box(g,[.018,.072,.010],[.174,0,z],M.edge,.004);
 for(const y of [-.033,.033])box(g,[.018,.010,.166],[.174,y,0],M.edge,.004);
}
function reservoir(g){
 // CL-7010C /17111712835 photograph: tubular body, stepped neck, bottom seal and side bracket.
 // Dimensions and placement remain illustrative.
 lathe(g,[[0,-.141],[.051,-.141],[.052,-.134],[.046,-.128],[.043,-.114],[.043,.108],[.040,.113],[.029,.113],[.029,.143],[0,.143]],M.reservoir,'y',56);
 ring(g,.053,.047,.005,[0,-.138,0],M.rubber,'y');
 cylinder(g,.033,.020,[0,.153,0],M.plastic);ring(g,.032,.027,.003,[0,.165,0],M.edge,'y');
 for(let i=0;i<24;i++){const a=i*Math.PI/12;box(g,[.004,.016,.004],[Math.cos(a)*.031,.153,Math.sin(a)*.031],M.edge,.001);}
 for(const a of [-Math.PI/4,Math.PI/4,Math.PI*3/4]){const rib=box(g,[.003,.236,.003],[Math.cos(a)*.043,.002,Math.sin(a)*.043],M.reservoir,.0006);rib.rotation.y=-a;}
 for(const y of [-.108,-.060,-.012,.036,.084])ring(g,.044,.042,.002,[0,y,0],M.reservoir,'y');
 // Open mounting bracket, not a strap around the whole reservoir.
 for(const z of [-.023,.023])box(g,[.020,.116,.006],[.053,.045,z],M.reservoir,.002);
 for(const y of [-.010,.045,.100])box(g,[.020,.006,.049],[.053,y,0],M.reservoir,.002);
 cylinder(g,.008,.035,[.055,-.026,0],M.reservoir);ring(g,.010,.007,.003,[.055,-.043,0],M.rubber,'y');
}

function brakeShield(g,rear,side){
 const radius=rear?.155:.160;
 // Pressed dish, turned lip and caliper relief; thin formed steel remains thin.
 const shield=lathe(g,[[.055,-.002],[radius-.030,-.002],[radius-.012,-.009],[radius-.004,-.009],[radius,-.015],[radius,-.013],[radius-.003,-.007],[radius-.011,-.007],[radius-.030,0],[.055,0]],M.dark,'z',80,.38,Math.PI*2-.76);
 shield.scale.z=side;
 for(let i=0;i<3;i++){const a=.85+i*1.65;const ridge=lathe(g,[[.073,0],[radius-.035,0],[radius-.035,-.003],[.073,-.003]],M.steel,'z',4,a,.035);ridge.scale.z=side;}
 bolts(g,3,.064,[0,0,side*.003],'z',.0035);
}
function brakeCaliper(g,rear,side){
 const h=rear?.125:.153,w=rear?.077:.082;
 // Two shaped ears and an arch leave the disc/pad slot open.
 for(const y of [-h*.34,h*.34])box(g,[w*.88,h*.25,.116],[0,y,0],M.alloy,.014);
 box(g,[.026,h*.66,.109],[-w*.35,0,0],M.alloy,.012);
 box(g,[w*.73,h*.61,.023],[.007,0,side*.047],M.alloy,.009);
 lathe(g,[[.022,0],[.031,0],[.034,.012],[.032,.030],[.025,.040],[.021,.040],[.021,.034],[.025,.026],[.026,.012],[.022,.012]],M.alloy,'z',48).position.set(0,0,side*-.034);
 for(const y of [-h*.36,h*.36]){cylinder(g,.006,.133,[.004,y,0],M.machined,'z',16);cylinder(g,.010,.018,[.004,y,side*-.064],M.rubber,'z',20);}
 cylinder(g,.004,.021,[0,h*.50,side*-.027],M.machined,'y',6);
 tube(g,[[w*.35,-h*.20,side*.060],[w*.40,0,side*.063],[w*.30,h*.22,side*.060]],.0023,M.steel,18);
}
function brakeDisc(g,rear,side){
 const outer=rear?.150:.151,inner=rear?.087:.081;
 if(rear)ring(g,outer,inner,.010,[0,0,0],M.rotor,'z');
 else{
  for(const z of [-.009,.009])ring(g,outer,inner,.006,[0,0,z],M.rotor,'z');
  for(let i=0;i<40;i++){const a=i*Math.PI/20;const vane=box(g,[outer-inner-.006,.003,.012],[Math.cos(a)*(outer+inner)/2,Math.sin(a)*(outer+inner)/2,0],M.steel,.0005);vane.rotation.z=a;}
 }
 const hat=lathe(g,[[.036,-.038],[inner-.006,-.038],[inner,-.027],[inner,.005],[inner-.004,.005],[inner-.004,-.026],[inner-.008,-.033],[.036,-.033]],M.steel,'z');hat.scale.z=side;
 ring(g,inner+.001,inner-.004,.002,[0,0,.005],M.machined,'z');
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ring(g,.007,.0058,.006,[Math.cos(a)*.060,Math.sin(a)*.060,side*-.035],M.dark,'z',20);}
}
function floorPan(g){
 for(const side of [-1,1]){
  const p=[],idx=[],rows=30,cols=8;
  for(let layer=0;layer<2;layer++)for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){
   const x=-1.49+j*2.63/rows,z=side*(.239+k*.445/cols);
   const frontFoot=.020*Math.sin(Math.min(1,Math.max(0,(x+.5)/1.1))*Math.PI),edge=.027*Math.pow(k/cols,6);
   const stamp=.007*Math.cos(x*30)*Math.sin(k*Math.PI/cols)**2;
   p.push([x,frontFoot+edge+stamp-layer*.006,z]);
  }
  const layer=(rows+1)*(cols+1);
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k,b=a+cols+1;idx.push(a,a+1,b,a+1,b+1,b,layer+a,layer+b,layer+a+1,layer+a+1,layer+b,layer+b+1);}
  surface(g,p,idx,M.dark);
  for(const z of [.25,.67])tube(g,[[-1.48,.027,side*z],[-.55,.023,side*z],[.40,.023,side*z],[1.13,.032,side*z]],.004,M.steel,32);
  for(const x of [-.93,-.26,.49])box(g,[.070,.027,.39],[x,.032,side*.46],M.steel,.007);
 }
}
function muffler(g){
 const body=new T.Group();body.scale.set(1,.56,1);lathe(body,[[0,-.26],[.13,-.26],[.15,-.23],[.151,.22],[.14,.26],[0,.26]],M.dark,'x',64);g.add(body);
 for(const x of [-.24,.23]){const seam=ring(g,.153,.149,.006,[x,0,0],M.seam,'x');seam.scale.y=.56;}
 for(const z of [-.060,.060]){tube(g,[[.26,0,z],[.31,0,z],[.35,.015,z]],.022,M.steel,12);tube(g,[[-.25,-.01,z],[-.32,-.025,z],[-.40,-.025,z]],.026,M.steel,12);ring(g,.027,.023,.008,[-.40,-.025,z],M.machined,'x');}
 for(const x of [-.16,.16])tube(g,[[x,.07,.12],[x,.11,.14],[x,.12,.18]],.006,M.steel,10);
}

function automaticPedals(g,pad=false){
 if(pad){
  const foot=box(g,[.017,.062,.100],[-.081,-.061,-.045],M.rubber,.005);foot.rotation.z=-.22;
  for(let i=0;i<5;i++)box(g,[.002,.004,.090],[-.091,-.085+i*.011,-.045],M.edge,.001);
  return;
 }
 box(g,[.100,.020,.220],[.045,.115,0],M.dark,.006);
 cylinder(g,.009,.215,[.035,.100,0],M.steel,'z',24);
 tube(g,[[.035,.100,-.045],[.010,.025,-.045],[-.079,-.052,-.045]],.008,M.steel,18);
 const gas=box(g,[.015,.119,.031],[-.084,-.067,.083],M.rubber,.006);gas.rotation.z=-.25;
 for(const z of [.076,.090])box(g,[.002,.100,.003],[-.096,-.067,z],M.edge,.0005);
 tube(g,[[.025,.075,.083],[-.020,-.005,.083],[-.070,-.055,.083]],.004,M.steel,16);
}

function automaticSelector(g){
 box(g,[.112,.012,.086],[0,-.052,0],M.plastic,.008);
 for(const z of [-.038,.038])box(g,[.104,.005,.006],[0,-.043,z],M.edge,.002);
 for(const x of [-.05,.05])box(g,[.006,.005,.070],[x,-.043,0],M.edge,.002);
 // A recessed automatic gate and lateral release grip replace the manual gaiter.
 box(g,[.085,.003,.012],[0,-.044,0],M.rubber,.003);
 cylinder(g,.006,.075,[.010,-.012,0],M.steel,'y',16);
 box(g,[.035,.028,.074],[.010,.033,0],M.plastic,.010);
 box(g,[.019,.009,.040],[.026,.028,0],M.edge,.003);
 for(let i=0;i<7;i++)box(g,[.006,.001,.004],[-.039+i*.013,-.042,-.024],M.machined,.0003);
}

function automatic(g,kind){
 // A4S270/310R source family. These are external illustrative envelopes, not CAD.
 if(kind==='bellhousing'){
  lathe(g,[[.056,-.196],[.114,-.196],[.151,-.13],[.172,-.028],[.174,0],[.160,0],[.158,-.029],[.137,-.13],[.102,-.183],[.056,-.183]],M.alloy,'x',64);
  ring(g,.181,.159,.014,[0,0,0],M.machined,'x');
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const rib=box(g,[.16,.009,.012],[-.09,Math.cos(a)*.139,Math.sin(a)*.139],M.alloy,.002);rib.rotation.x=a;}
  bolts(g,8,.172,[.008,0,0],'x',.006);
 }else if(kind==='case'){
  lathe(g,[[.03,-.715],[.052,-.715],[.063,-.640],[.108,-.560],[.122,-.405],[.119,-.20],[.106,-.185],[.03,-.185]],M.alloy,'x',56);
  for(let i=0;i<10;i++)ring(g,.126-i*.001,.119-i*.001,.007,[-.22-i*.034,0,0],M.alloy,'x',48);
  for(const z of [-.098,.098]){box(g,[.40,.013,.013],[-.395,.05,z],M.alloy,.003);box(g,[.39,.012,.013],[-.395,-.05,z],M.alloy,.003);}
  for(const x of [-.32,-.51]){box(g,[.055,.020,.10],[x,.125,0],M.alloy,.004);cylinder(g,.006,.016,[x,.140,0],M.machined,'y',6);}
  ring(g,.047,.030,.022,[-.735,0,0],M.rubber,'x');
 }else if(kind==='converter'){
  lathe(g,[[0,-.160],[.055,-.160],[.105,-.144],[.132,-.110],[.137,-.065],[.128,-.032],[.080,-.014],[.024,-.008],[0,-.008]],M.steel,'x',72);
  ring(g,.138,.134,.006,[-.087,0,0],M.seam,'x');cylinder(g,.020,.045,[.006,0,0],M.machined,'x');bolts(g,3,.112,[-.025,0,0],'x',.006);
 }else if(kind==='pan-main'||kind==='pan-secondary'){
  const main=kind==='pan-main',l=main?.285:.167,x=main?-.45:-.245,w=main?.26:.243;
  box(g,[l,.043,w],[x,-.142,0],M.dark,.014);
  for(const z of [-w/2,w/2])box(g,[l+.018,.008,.014],[x,-.120,z],M.steel,.003);
  for(const xx of [x-l/2,x+l/2])box(g,[.014,.008,w],[xx,-.120,0],M.steel,.003);
  for(let i=0;i<5;i++)box(g,[l*.73,.005,.008],[x,-.167,-w*.34+i*w*.17],M.dark,.002);
  for(const z of [-w/2,w/2])for(let i=0;i<5;i++)cylinder(g,.004,.009,[x-l*.42+i*l*.21,-.124,z],M.machined,'y',6);
  for(const xx of [x-l/2,x+l/2])for(const z of [-w*.22,w*.22])cylinder(g,.004,.009,[xx,-.124,z],M.machined,'y',6);
 }else if(kind==='strainer'){
  box(g,[.202,.016,.146],[-.44,-.123,.006],M.plastic,.012);cylinder(g,.018,.036,[-.375,-.099,0],M.plastic);
  box(g,[.145,.003,.100],[-.46,-.133,.010],M.steel,.009);
  for(let i=0;i<13;i++)box(g,[.002,.002,.094],[-.525+i*.011,-.135,.010],M.fin,.0004);
 }else if(kind==='flexplate'){
  ring(g,.142,.024,.004,[.012,0,0],M.steel,'x',72);ring(g,.146,.139,.009,[.012,0,0],M.machined,'x');
  for(let i=0;i<96;i++){const a=i*Math.PI*2/96;const tooth=box(g,[.008,.004,.004],[.012,Math.cos(a)*.145,Math.sin(a)*.145],M.machined,.0004);tooth.rotation.x=a;}
  bolts(g,8,.036,[.016,0,0],'x',.004);
 }
}

export function build525iVisualDetails(model){
 const root=new T.Group(),entries=[];
 function add(id,draw,{parentId,systemIds,matrix,internal=false,name,sourceAssembly,sourceNumbers,kind='component',canonicalId,oem}={}){
  const old=model.nodes.find(n=>n.id===id);if(!old&&!matrix)throw Error('New detail requires an installed transform: '+id);
  const raw=new T.Group();raw.name='detail_'+id.replace(/[^a-z0-9]/gi,'_');draw(raw);
  const group=baked(raw);root.add(group);group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(group);
  if(bounds.isEmpty())throw Error('Empty visual detail: '+id);
  entries.push({id,name:name||old?.name,parentId:parentId||old?.parentId,systemIds:systemIds||old?.systemIds,matrix:matrix||old?.matrix,internal:old?.internal||internal,kind:kind==='assembly'?'assembly':old?.kind||kind,meshNames:[group.name],bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},sourceAssembly,sourceNumbers,canonicalId:canonicalId===undefined?old?.canonicalId:canonicalId,oem:oem===undefined?old?.oem:oem,replacement:!!old});
 }
 add('e34sys:engine-cooling-fan',coolingFan,{canonicalId:'bmw-11521712058',oem:'11521712058',name:'Swept eleven-blade engine cooling fan',sourceAssembly:'catalog-assembly-0a99fad18571cd64327a4ef2',sourceNumbers:['11521712058']});
 const fan=model.nodes.find(n=>n.id==='e34sys:engine-cooling-fan');
 add('e34sys:fan-coupling',fanCoupling,{name:'Finned viscous fan coupling',matrix:fan.matrix,parentId:fan.parentId,systemIds:fan.systemIds,sourceAssembly:'catalog-assembly-0a99fad18571cd64327a4ef2',sourceNumbers:['11521719269','11521740963','11527505302']});
 add('e34sys:fan-shroud',shroud);add('e34sys:radiator',radiator);add('e34sys:expansion-tank',reservoir);
 add('e34sys:airbox',g=>airbox(g));
 const housing=model.nodes.find(n=>n.id==='e34sys:airbox');
 add('e34sys:airbox-lid',g=>airbox(g,true),{name:'Ribbed airbox lid',matrix:housing.matrix,parentId:housing.id,systemIds:housing.systemIds,sourceAssembly:'catalog-assembly-c973ce2562754c1cfb37eada',sourceNumbers:['13711735344'],kind:'assembly'});
 add('e34sys:pedal-box',g=>automaticPedals(g),{name:'Automatic brake and accelerator pedal assembly',kind:'assembly',canonicalId:null,oem:null,sourceAssembly:'catalog-assembly-e4aa7b5cf83dadfc5cc2238b',sourceNumbers:['35111159647']});
 const pedals=model.nodes.find(n=>n.id==='e34sys:pedal-box');
 add('e34auto:brake-pedal-pad',g=>automaticPedals(g,true),{name:'Automatic brake pedal rubber pad',parentId:pedals.id,matrix:pedals.matrix,systemIds:pedals.systemIds,canonicalId:'bmw-35211160421',oem:'35211160421',sourceAssembly:'catalog-assembly-e4aa7b5cf83dadfc5cc2238b',sourceNumbers:['35211160421']});
 add('e34sys:gear-lever',automaticSelector,{name:'Automatic selector, grip and gate',kind:'assembly',canonicalId:null,oem:null,sourceAssembly:'catalog-assembly-f94415eaf766f8decaa4d389',sourceNumbers:['25161219636','25112136166','25161216464','25161216905','25161216995']});
 add('e34sys:fresh-air-snorkel',snorkel);add('e34sys:floor-pan',floorPan);add('e34sys:rear-muffler',muffler);
 for(const end of ['front','rear'])for(const side of [-1,1]){
  const suffix=end+'-'+side;add('e34sys:brake-shield-'+suffix,g=>brakeShield(g,end==='rear',side));add('e34sys:brake-caliper-'+suffix,g=>brakeCaliper(g,end==='rear',side));add('e34sys:brake-disc-'+suffix,g=>brakeDisc(g,end==='rear',side));
 }
 const transform=new T.Matrix4().makeTranslation(.80,.375,0).toArray();
 const family='catalog-assembly-26e25410760168fb0112cca5',pans='catalog-assembly-7e5418c6bc4e318f12bd131c';
 for(const [key,name,sourceAssembly,sourceNumbers,internal]of [
  ['bellhousing','Automatic bellhousing',family,[],false],
  ['case','A4S 310R reference casing and extension',family,['24001421625','24001422636'],false],
  ['converter','Torque converter exterior',family,['24401423815'],true],
  ['pan-main','Automatic transmission main oil pan',pans,['24117519543','24118485596'],false],
  ['pan-secondary','Automatic transmission secondary oil pan',pans,['24111218896'],false],
  ['strainer','Automatic transmission oil strainer',pans,['24111218899'],true],
  ['flexplate','Automatic drive plate and ring gear','catalog-assembly-e6400f5d771e7719df88a5da',['11221717383'],true],
 ])add('e34auto:'+key,g=>automatic(g,key),{name,parentId:key==='bellhousing'?'system:transmission':['case','converter','flexplate'].includes(key)?'e34auto:bellhousing':'e34auto:case',matrix:transform,systemIds:['system:transmission'],internal,sourceAssembly,sourceNumbers,kind:key==='case'?'assembly':'component'});
 return {root,entries};
}

export {M as visualMaterials, baked, bolts, box, cylinder, lathe, mesh, ring, surface, tube};
