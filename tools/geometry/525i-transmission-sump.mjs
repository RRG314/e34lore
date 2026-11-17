import * as T from 'three';
import { box, cylinder, mesh, ring, visualMaterials as M } from './525i-visual-details.mjs';

/** Main sump on the A4S 310R. The pan profile, hardware layout and strainer
 * are reconstructed from catalog plate 24_1299 and the component reference.
 * Coordinates are in the existing gearbox frame, not measured dimensions. */
const center = -.484;
const outline = [
  [-.128,-.072],[-.097,-.117],[.084,-.117],[.121,-.104],
  [.133,-.083],[.133,.079],[.117,.112],[.082,.115],
  [-.076,.115],[-.110,.108],[-.132,.090],[-.132,-.023],
].map(([x,z])=>[center+x,z]);

// Ordered perimeter positions. The main sump takes 16 of the 28 cataloged pan bolts.
const panSites = [
  [-.122,-.065],[-.087,-.109],[-.035,-.110],[.018,-.110],[.068,-.110],[.114,-.096],
  [.126,-.050],[.126,.000],[.126,.050],[.116,.096],
  [.075,.108],[.025,.108],[-.027,.108],[-.082,.106],[-.122,.081],[-.125,.007],
].map(([x,z])=>[center+x,z]);

const filterOutline = [
  [-.576,.015],[-.537,-.054],[-.514,-.063],[-.491,-.053],[-.459,-.033],
  [-.450,-.015],[-.464,.010],[-.464,.030],[-.438,.046],[-.397,.042],
  [-.383,.031],[-.384,-.009],[-.395,-.023],[-.421,-.026],[-.446,-.036],
  [-.468,-.063],[-.495,-.070],[-.523,-.064],[-.572,-.013],
];
// The side ear and two ears at the narrow nose take the three strainer screws.
const filterSites = [[-.509,-.052],[-.402,.033],[-.402,-.012]];
const outlet = [-.410,.011];
const magnet = [-.543,.064];
const drain = [-.465,.041];
const filler = [-.492,-.104];
const flangeY = -.119;
const filterFace = -.129;
const castPan = new T.MeshStandardMaterial({name:'Transmission sump casting',color:'#828888',metalness:.65,roughness:.51});
const galvanized = new T.MeshStandardMaterial({name:'Strainer cover',color:'#a8aba0',metalness:.74,roughness:.39});
const gauze = new T.MeshStandardMaterial({name:'Strainer screen',color:'#a89558',metalness:.37,roughness:.64});
const sealingMetal = new T.MeshStandardMaterial({name:'Crush washer',color:'#a7a2a0',metalness:.78,roughness:.38});

function rounded(shape, points, amount=.16) {
  const edges = points.map((p,i)=>{
    const before = points.at(i-1), after = points[(i+1)%points.length];
    return [before,after].map(neighbor=>[
      p[0]+amount*(neighbor[0]-p[0]), -p[1]-amount*(neighbor[1]-p[1]),
    ]);
  });
  shape.moveTo(...edges[0][0]);
  for (const [i,p] of points.entries()) {
    shape.quadraticCurveTo(p[0],-p[1],...edges[i][1]);
    shape.lineTo(...edges[(i+1)%points.length][0]);
  }
  return shape;
}

function diskHole(x,z,r) {
  const hole = new T.Path();
  hole.absarc(x,-z,r,0,Math.PI*2,true);
  return hole;
}

function horizontal(group, points, y, thickness, material, openings=[]) {
  const shape = rounded(new T.Shape(),points);
  shape.holes.push(...openings);
  const geo = new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:7});
  geo.rotateX(-Math.PI/2);
  geo.translate(0,y,0);
  mesh(group,geo,material);
}

const inset = (points,scale)=>points.map(([x,z])=>[center+(x-center)*scale,z*scale]);

function lip(group, y, thickness, material, scale=1, inner=.85) {
  horizontal(group,inset(outline,scale),y,thickness,material,[
    rounded(new T.Path(),inset(outline,inner)),
    ...panSites.map(([x,z])=>diskHole(x,z,.0034)),
  ]);
}

function sides(group) {
  const shape = rounded(new T.Shape(),outline);
  const perimeter = shape.getPoints(7).slice(0,-1).map(p=>[p.x,-p.y]);
  const vertices = [
    [.89,flangeY], [.89,-.128], [.84,-.169], [.80,-.177],
    [.76,-.173], [.80,-.164], [.85,-.127], [.85,flangeY],
  ].flatMap(([s,y])=>inset(perimeter,s).flatMap(([x,z])=>[x,y,z]));
  const indices = [];
  const count = perimeter.length;
  for (let layer=0;layer<8;layer++) {
    for (let i=0;i<count;i++) {
      const next=(i+1)%count, a=layer*count+i,b=layer*count+next;
      const c=((layer+1)%8)*count+i,d=((layer+1)%8)*count+next;
      indices.push(a,c,b,b,c,d);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  mesh(group,geometry,castPan);
}

function mainPan(group) {
  sides(group);
  lip(group,flangeY-.005,.005,castPan);
  horizontal(group,inset(outline,.798),-.177,.004,castPan,[diskHole(...drain,.006)]);
  ring(group,.014,.006,.007,[drain[0],-.176,drain[1]],M.machined,'y',32);
  ring(group,.015,.009,.012,[filler[0],-.145,filler[1]],castPan,'z',36);
  ring(group,.013,.009,.003,[filler[0],-.145,filler[1]-.007],M.machined,'z',32);
  for (const x of [-.545,-.500,-.454,-.411]) {
    box(group,[.012,.004,.132],[x,-.179,0],castPan,.001);
  }
  for (const [x,z] of panSites) ring(group,.0061,.0034,.004,[x,flangeY-.005,z],castPan,'y',16);
}

function fastener(group,x,y,z,{head,shaft,length,axis='y',sign=1,washer=false}) {
  const offset=(distance)=>[x,y+(axis==='y'?sign*distance:0),z+(axis==='z'?sign*distance:0)];
  cylinder(group,head,.0045,offset(-.00225),M.machined,axis,6);
  cylinder(group,head*.83,.001,offset(-.005),M.machined,axis,6,head);
  if (washer) cylinder(group,head*1.2,.0013,offset(-.00065),M.steel,axis,20);
  cylinder(group,shaft*.87,length,offset(length*.5),M.steel,axis,20);
  for (let d=.001;d<length-.0007;d+=.0011) {
    ring(group,shaft,shaft*.86,.00045,offset(d),M.machined,axis,16);
  }
}

function strainer(group) {
  const openings = filterSites.map(([x,z])=>diskHole(x,z,.0042));
  const pickup = [-.528,-.004];
  horizontal(group,filterOutline,filterFace-.021,.017,M.plastic,[...openings,diskHole(...pickup,.014)]);
  horizontal(group,filterOutline,filterFace-.004,.003,galvanized,[
    ...openings, rounded(new T.Path(),sealOutline(.008,.004)),
  ]);
  for (const [x,z] of filterSites) ring(group,.006,.0042,.003,[x,filterFace-.020,z],M.machined,'y',24);
  ring(group,.018,.014,.006,[pickup[0],filterFace-.019,pickup[1]],M.edge,'y',40);
  cylinder(group,.0139,.001,[pickup[0],filterFace-.018,pickup[1]],gauze,'y',48);
  for (let i=-5;i<=5;i++) {
    const width=2*Math.sqrt(.0133**2-(i*.0022)**2);
    box(group,[.0004,.0006,width],[pickup[0]+i*.0022,filterFace-.0188,pickup[1]],M.fin,0);
  }
  for (const [x,z,width] of [[-.550,.006,.015],[-.502,.015,.040],[-.487,.025,.025],[-.475,-.025,.024],[-.441,.029,.020]]) {
    box(group,[.004,.002,width],[x,filterFace-.0005,z],galvanized,.0005);
  }
  horizontal(group,sealOutline(.011,.007),filterFace-.001,.006,galvanized,[
    rounded(new T.Path(),sealOutline(.007,.0035)),
  ]);
}

function sealOutline(a,b) {
  return [[-a,-b],[a,-b],[a,b],[-a,b]].map(([x,z])=>[outlet[0]+x,outlet[1]+z]);
}

export function build525iSump(add) {
  add('pan-main','Main transmission oil pan','24117519543',mainPan);
  add('pan-mating-face','Main case sump flange',null,g=>lip(g,flangeY+.002,.005,M.alloy),'case');
  add('pan-main-gasket','Main pan gasket','24111421367',g=>lip(g,flangeY,.002,M.rubber),'case');
  add('pan-magnet','Main pan magnet','24111218901',g=>{
    ring(g,.014,.005,.005,[magnet[0],-.1705,magnet[1]],M.dark,'y',40);
    ring(g,.013,.006,.0006,[magnet[0],-.1677,magnet[1]],M.steel,'y',40);
  },'pan-main',true);
  add('pan-drain-plug','Main pan drain plug','24111218900',g=>{
    fastener(g,drain[0],-.181,drain[1],{head:.009,shaft:.006,length:.012});
  },'pan-main');
  add('pan-drain-seal','Drain plug sealing washer','24111218851',g=>{
    ring(g,.010,.006,.0015,[drain[0],-.180,drain[1]],sealingMetal,'y',32);
  },'pan-drain-plug');
  add('pan-fill-plug','Main pan fill plug','24111219749',g=>{
    fastener(g,filler[0],-.145,filler[1]-.010,{head:.012,shaft:.0085,length:.014,axis:'z'});
  },'pan-main');
  add('pan-fill-seal','Fill plug sealing washer','24111219750',g=>{
    ring(g,.013,.0085,.0015,[filler[0],-.145,filler[1]-.009],sealingMetal,'z',36);
  },'pan-fill-plug');
  panSites.forEach(([x,z],i)=>add('pan-bolt-'+(i+1),'Main pan bolt '+(i+1),'24111218854',g=>{
    fastener(g,x,flangeY-.008,z,{head:.0055,shaft:.003,length:.018,washer:true});
  },'pan-main'));
  add('strainer','Automatic transmission oil strainer','24111218899',strainer,'case',true);
  add('strainer-seal','Strainer outlet seal',null,g=>{
    horizontal(g,sealOutline(.0105,.0065),filterFace+.005,.002,M.rubber,[
      rounded(new T.Path(),sealOutline(.007,.0035)),
    ]);
  },'strainer',true);
  filterSites.forEach(([x,z],i)=>add('strainer-bolt-'+(i+1),'Strainer screw '+(i+1),'24111218898',g=>{
    fastener(g,x,filterFace-.022,z,{head:.0052,shaft:.0038,length:.027,washer:true});
  },'strainer',true));
}
