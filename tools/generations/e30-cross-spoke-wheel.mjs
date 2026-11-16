import {CylinderGeometry, LatheGeometry, Mesh, MeshStandardMaterial, Vector2} from 'three';
import {patch,lerp} from './e30-exterior-surfaces.mjs';

const material=(name,color,metalness,roughness)=>new MeshStandardMaterial({name,color,metalness,roughness});
const tire=material('Tire sidewall',0x151616,.01,.79);
const cast=material('Cast silver wheel',0x777a79,.62,.38);
const rim=material('Machined rim lip',0xa8aaa5,.82,.25);
const recess=material('Wheel cap inset',0x202428,.25,.59);
const blue=material('Roundel blue',0x27678e,.30,.38);
const white=material('Roundel white',0xd5d6cc,.28,.38);

function revolve(group,profile,surface) {
  const mesh=new Mesh(new LatheGeometry(profile.map(point=>new Vector2(...point)),96),surface);
  mesh.rotation.x=Math.PI/2;
  group.add(mesh);
}
function cap(group,radius,depth,z,surface,sides=48,start=0,arc=2*Math.PI) {
  const mesh=new Mesh(new CylinderGeometry(radius,radius,depth,sides,1,false,start,arc),surface);
  mesh.rotation.x=Math.PI/2;
  mesh.position.z=z;
  group.add(mesh);
}

export function drawE30CrossSpoke(group, side) {
  revolve(group,[
    [.174,-.085],[.180,-.089],[.207,-.097],[.237,-.099],[.263,-.092],[.285,-.079],[.297,-.061],
    [.299,-.045],[.296,-.041],[.296,-.037],[.299,-.035],[.300,-.015],[.297,-.012],[.297,-.008],
    [.300,-.006],[.300,.011],[.297,.013],[.297,.018],[.300,.020],[.300,.038],[.297,.041],
    [.297,.046],[.300,.048],[.297,.061],[.287,.075],[.267,.087],[.238,.097],[.205,.096],[.181,.091],[.174,.084],
  ],tire);
  // The rim barrel, stepped outer lip and face are distinct surfaces.
  revolve(group,[[.148,-.081],[.168,-.083],[.174,-.078],[.173,.078],[.168,.083],[.149,.083],[.145,.075],[.146,-.075],[.148,-.081]],cast);
  revolve(group,[[.157,-.084],[.167,-.089],[.175,-.087],[.176,-.080],[.172,-.076],[.172,.076],
    [.176,.080],[.175,.087],[.167,.091],[.155,.089],[.151,.079],[.156,.075],[.158,.079]],rim);

  for(let i=0;i<20;i++){
    const angle=i*2*Math.PI/20;
    for(const direction of [-1,1]){
      const root=angle+direction*.063,tip=angle+direction*.405;
      // Rounded trapezoidal cross-section with a thicker cast root.
      patch(group,cast,(u,v)=>{
        const ax=lerp(.043,.159,u),theta=lerp(root,tip,u);
        const t=2*Math.PI*v,width=lerp(.0058,.0031,u);
        return [ax*Math.cos(theta)-width*Math.sin(theta)*Math.cos(t),
          ax*Math.sin(theta)+width*Math.cos(theta)*Math.cos(t),
          side*(lerp(.069,.078,u)+direction*.0014+width*.67*Math.sin(t))];
      },15,9);
    }
  }
  cap(group,.051,.024,side*.066,cast,12);
  cap(group,.043,.008,side*.081,rim,12);
  cap(group,.025,.004,side*.087,recess);
  for(let i=0;i<4;i++)cap(group,.014,.003,side*.090,i%2?white:blue,10,i*Math.PI/2,Math.PI/2);
}
