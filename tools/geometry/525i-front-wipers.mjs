import {Matrix4} from 'three';
import {box,cylinder,tube,visualMaterials as materials} from './525i-visual-details.mjs';

export const e34WiperSource='https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/vehicle_electrical_system/single_components_for_wiper_arm.html';
const assembly='catalog-assembly-52c988e7e3c89d0ff557d66b';

export function addFrontWipers(collect) {
  for (const [side,sign,armNumber,bladeNumber] of [
    ['left',-1,'61618350717','61618361475'],
    ['right',1,'61611384978','61618355052'],
  ]) {
    const title=side==='left'?'Driver':'Passenger';
    // Follow the sampled outside surface of the pinned 525i windshield.
    const onGlass=t=>{
      const z=sign*(.025+.585*t);
      const y=.925+.025*t;
      return [.969-1.31*(y-.908)-.212*z*z,y,z];
    };
    const center=onGlass(.5);
    const pivot=sign<0?[.792,.884,-.555]:[.799,.887,.136];
    const base={
      parentId:'e34body:assembly',systems:['system:body','system:exterior','system:electrical'],
      matrix:new Matrix4().toArray(),kind:'component',visualSources:[{title:'BMW wiper arm and blade catalog',url:e34WiperSource}],
      note:'Compare the installed arm and retaining adapter with the source diagram.',
    };
    collect('e34body:wiper-arm-'+side,title+' front wiper arm',g=>{
      cylinder(g,.019,.019,pivot,materials.plastic,'y',20);
      tube(g,[
        [pivot[0],pivot[1]+.010,pivot[2]],
        [pivot[0]+.027,pivot[1]+.024,pivot[2]+.040],
        [center[0]+.044,center[1]+.022,center[2]-.049],
        [center[0]+.012,center[1]+.012,center[2]],
      ],.0064,materials.plastic,22);
    },{...base,catalog:[assembly,armNumber]});
    collect('e34body:wiper-blade-'+side,title+' front wiper blade',g=>{
      const rail=Array.from({length:19},(_,i)=>onGlass(i/18));
      tube(g,rail,.0042,materials.rubber,25);
      for(const [start,end] of [[.02,.49],[.51,.98]]) {
        tube(g,Array.from({length:9},(_,i)=>{
          const t=i/8,[x,y,z]=onGlass(start+(end-start)*t);
          return [x+.006,y+.010+.007*Math.sin(Math.PI*t),z];
        }),.0039,materials.plastic,15);
      }
      box(g,[.022,.020,.030],[center[0]+.008,center[1]+.014,center[2]],materials.plastic,.003);
    },{...base,catalog:[assembly,bladeNumber]});
  }
}
