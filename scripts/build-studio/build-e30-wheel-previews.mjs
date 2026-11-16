// Authored geometry from the 1991 325i Coupe BMW wheel catalog.
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {baked,cylinder,lathe,mesh,ring,visualMaterials as M} from '../../tools/geometry/525i-visual-details.mjs';
import {loft} from '../../tools/geometry/525i-fabrication.mjs';

const output='work/e30/assets/models/e30-lore/r1137';
const source='https://www.bmwpartsdeal.com/parts-list/1991-bmw-325i-coupe_e30/wheels/';
const packages=[
  {style:'steel',label:'Steel',diameter:14,width:5.5,offset:35,number:'36111178826',drawing:'steel_rim'},
  {style:'bottlecap',label:'Bottlecap alloy',diameter:14,width:6,offset:35,number:'36111125688',drawing:'alloy_rim_style'},
  {style:'cross-spoke',label:'Style 5 · Cross-spoke',diameter:14,width:6.5,offset:30,number:'36112225540',drawing:'cross_spoke_styling'},
  {style:'cross-spoke',label:'Style 5 · Cross-spoke',diameter:15,width:7,offset:24,number:'36111179066',drawing:'cross_spoke_styling'},
  {style:'star-spoke',label:'Style 10 · Star-spoke',diameter:15,width:7,offset:24,number:'36111181240',drawing:'star_spoke_styling'},
];
const alloy=new T.MeshStandardMaterial({name:'original-alloy',color:0xa5abaa,metalness:.69,roughness:.34});
const steel=new T.MeshStandardMaterial({name:'original-alloy',color:0x35393a,metalness:.54,roughness:.44});
const badge=new T.MeshStandardMaterial({color:0x2c6799,metalness:.2,roughness:.4});
const point=(r,a,z)=>[r*Math.cos(a),r*Math.sin(a),z];
const full=Math.PI*2;
function spoke(group,angle,sections) {
  loft(group,sections.map(([radius,sweep,z,width,depth])=>[point(radius,angle+sweep,z),width,depth]),
    alloy,{sides:8,roundness:.32,up:[0,0,1]});
}
function cap(group,radius,z,material) {
  lathe(group,[[0,z-.006],[radius,z-.006],[radius,z+.002],[radius-.004,z+.007],[0,z+.009]],material,'z',64);
}
function lugs(group,z) {
  for(let i=0;i<4;i++) {
    const a=(i+.5)*full/4;
    cylinder(group,.010,.004,point(.050,a,z),M.dark,'z',18);
    cylinder(group,.007,.010,point(.050,a,z+.002),M.machined,'z',6);
  }
}
function face(group,style,r,z,capRadius) {
  if(style==='steel') {
    const face=new T.Shape();
    face.absarc(0,0,r-.008,0,full,false);
    for(let i=0;i<18;i++){
      const [x,y]=point(r*.83,i*full/18,0);
      const hole=new T.Path();
      hole.absarc(x,y,r*.057,0,full,true);
      face.holes.push(hole);
    }
    const center=new T.Path();
    center.absarc(0,0,.029,0,full,true);
    face.holes.push(center);
    mesh(group,new T.ExtrudeGeometry(face,{depth:.008,curveSegments:16,bevelEnabled:true,bevelSegments:1,bevelSize:.0015,bevelThickness:.0015}),steel,[0,0,z-.018]);
    ring(group,.076,.031,.012,[0,0,z-.007],steel,'z',64);
    lugs(group,z+.002);
    return;
  }
  if(style==='bottlecap') {
    cap(group,r*.57,z-.020,alloy);
    for(let i=0;i<20;i++)spoke(group,i*full/20,[
      [r*.54,0,z-.022,.019,.017],[r*.67,0,z-.013,.016,.015],[r*.92,0,z-.002,.011,.012],[r*.98,0,z-.004,.012,.012],
    ]);
    lugs(group,z-.012);
  }else if(style==='cross-spoke') {
    for(let i=0;i<20;i++)for(const direction of [-1,1])spoke(group,i*full/20+direction*.035,[
      [capRadius-.009,0,z-.017,.0085,.010],[r*.63,direction*.100,z-.010,.0075,.011],
      [r*.82,direction*.168,z-.003,.0068,.009],[r*.96,direction*.220,z-.004,.007,.009],
    ]);
  }else{
    for(let i=0;i<6;i++)spoke(group,i*full/6,[
      [r*.28,0,z-.015,.035,.020],[r*.53,0,z-.017,.025,.015],
      [r*.77,.015,z-.008,.018,.013],[r*.95,.025,z-.004,.026,.012],
    ]);
  }
  cap(group,capRadius,z-.006,alloy);
  cylinder(group,.021,.003,[0,0,z+.005],M.dark,'z',40);
  for(let i=0;i<4;i++)mesh(group,new T.CylinderGeometry(.016,.016,.002,12,1,false,i*Math.PI/2,Math.PI/2),i%2?M.machined:badge,[0,0,z+.007]).rotation.x=Math.PI/2;
}
function wheel({style,diameter,width}) {
  const group=new T.Group();
  const radius=diameter*.0254/2, half=width*.0254/2, z=half+.006;
  lathe(group,[[radius-.003,-half],[radius+.011,-half-.010],[.230,-.099],[.270,-.088],
    [.293,-.068],[.300,-.049],[.300,.049],[.293,.068],[.270,.088],[.230,.099],[radius+.011,half+.010],
    [radius-.003,half],[radius-.003,-half]],M.rubber,'z',88);
  const material=style==='steel'?steel:alloy;
  lathe(group,[[radius-.018,-half],[radius+.007,-half-.004],[radius+.007,-half+.004],
    [radius-.006,-half+.014],[radius-.010,half-.016],[radius+.007,half-.005],
    [radius+.007,z],[radius-.008,z],[radius-.019,half-.017],[radius-.018,-half]],material,'z',88);
  face(group,style,radius,z,style==='cross-spoke'?(diameter===14?.0755:.0855):style==='bottlecap'?.027:.059);
  cylinder(group,.004,.014,point(radius-.013,.55,z-.003),M.rubber,'z',14);
  return baked(group);
}
globalThis.FileReader=class{
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}
};
await mkdir(output,{recursive:true});
const rows=[];
for(const definition of packages) {
  const {style,label,diameter,width,offset,number,drawing}=definition;
  const bytes=Buffer.from(await new GLTFExporter().parseAsync(wheel(definition),{binary:true}));
  if(bytes.length>1_000_000)throw Error('Wheel package exceeds viewer budget: '+style);
  const sha256=createHash('sha256').update(bytes).digest('hex');
  await writeFile(output+'/'+sha256+'.glb',bytes);
  rows.push({id:`e30-factory-${style}-${diameter}-v1`,label,dimensions:`${width}J × ${diameter} ET${offset}`,
    number,source:source+drawing+'.html',group:'E30',url:'/models/e30-lore/r1137/'+sha256+'.glb',
    bytes:bytes.length,sha256,lodLow:null,normalization:1});
}
await writeFile('data/build-studio/e30-wheel-packages.json',JSON.stringify(rows,null,2)+'\n');
console.log('Generated '+rows.length+' E30 wheel previews');
