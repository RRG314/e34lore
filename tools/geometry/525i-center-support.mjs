import {ExtrudeGeometry, Path, Shape} from 'three';
import {lathe, mesh, ring, visualMaterials as M} from './525i-visual-details.mjs';

const catalog='catalog-assembly-2c65f0c62b59f989ca691ff5';
const source={
  title:'BMW driveshaft centre mount and bearing',
  url:'https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/steering_drive_shaft/drive_shaft_universal_joint_centre_mounting.html',
};

// The bearing axis is X. The two slots go through the stamped mounting flange.
export function centerSupport(group, size=1){
  const r=.050*size;
  const outline=new Shape();
  for(const [i,[x,z]] of [[-.023,-.091],[.023,-.091],[.026,-.085],[.022,-.047],
    [.019,-.032],[.019,.032],[.022,.047],[.026,.085],[.023,.091],[-.023,.091],
    [-.026,.085],[-.022,.047],[-.019,.032],[-.019,-.032],[-.022,-.047],[-.026,-.085]].entries()){
    if(!i)outline.moveTo(x,z*size);else outline.lineTo(x,z*size);
  }
  outline.closePath();
  for(const z of [-.076,.076]){
    const slot=new Path();
    const t=z*size;
    slot.moveTo(-.009,t-.005);slot.lineTo(.009,t-.005);
    slot.quadraticCurveTo(.015,t-.005,.015,t);
    slot.quadraticCurveTo(.015,t+.005,.009,t+.005);
    slot.lineTo(-.009,t+.005);
    slot.quadraticCurveTo(-.015,t+.005,-.015,t);
    slot.quadraticCurveTo(-.015,t-.005,-.009,t-.005);
    slot.closePath();
    outline.holes.push(slot);
  }
  const steel=new ExtrudeGeometry(outline,{depth:.005,bevelEnabled:true,bevelSegments:1,bevelSize:.0006,bevelThickness:.0006,curveSegments:8});
  steel.rotateX(Math.PI/2);
  const vertices=steel.getAttribute('position');
  for(let i=0;i<vertices.count;i++){
    const z=Math.abs(vertices.getZ(i))/size,x=Math.abs(vertices.getX(i));
    const shoulder=.009*Math.exp(-(((z-.043)/.018)**2));
    vertices.setY(i,vertices.getY(i)+.039+shoulder-.003*(x/.026)**2);
  }
  steel.computeVertexNormals();
  mesh(group,steel,M.steel);
  lathe(group,[[r-.004,-.015],[r,-.015],[r+.002,-.012],[r+.002,.011],[r,.015],[r-.004,.015],[r-.004,-.015]],
    M.steel,'x',64);
  lathe(group,[[.0275,-.013],[.031,-.014],[.036,-.011],[.040,-.013],[r-.004,-.014],
    [r-.004,.013],[.041,.011],[.039,.008],[.035,.009],[.031,.013],[.0275,.013],[.0275,-.013]],
    M.rubber,'x',64);
}
export function sealedSupportBearing(group,bore=.015){
  ring(group,.0275,.024,.013,[0,0,0],M.machined,'x',64);
  ring(group,bore+.0035,bore,.013,[0,0,0],M.machined,'x',64);
  for(const x of [-.0055,.0055])ring(group,.0245,bore+.0034,.0015,[x,0,0],M.rubber,'x',64);
}
export function addCenterSupport(collect){
  const keepBinding=true,visualSources=[source];
  collect('e34sys:center-bearing','Driveshaft centre support and slotted bracket',centerSupport,
    {keepBinding,visualSources,catalog:[catalog,'26121226723'],
      note:'Slotted bracket and rubber cushion shown. Use the car’s source catalog to check the complete support.'});
  collect('e34sys:center-bearing-insert','Sealed centre support ball bearing',sealedSupportBearing,
    {keepBinding,visualSources,catalog:[catalog,'26121225071'],
      note:'The 30 mm bore and 55 mm outside diameter follow the retained 525i catalog. The fit and seal construction remain illustrative.'});
}
