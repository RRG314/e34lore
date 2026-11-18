import { ExtrudeGeometry, Path, Shape, Vector2 } from 'three';
import { box, cylinder, mesh, tube, visualMaterials as M } from './525i-visual-details.mjs';
import { loft } from './525i-fabrication.mjs';

export function airCleanerDatums(series) {
  return series==='e30'
    ? { center:[1.678,.704,-.518], caseSize:[.292,.223], clips:[[-.105,1],[.105,1],[-.105,-1],[.105,-1]] }
    : { center:[1.545,.722,-.430], caseSize:[.350,.224], clips:[[-.11,1],[0,1],[.11,1],[-.11,-1],[.11,-1]] };
}

export function drawAirbox(group, series, shape, fit) {
  const [length,width] = shape.caseSize;
  const [filterLength,filterWidth] = [fit.length/1000,fit.width/1000];
  const level = series==='e30'?-.137:-.129;
  box(group,[length,.008,width],[0,level,0],M.plastic,.007);
  for(const sign of [-1,1]) box(group,[length,.124,.008],[0,level+.062,sign*(width/2-.004)],M.plastic,.003);
  box(group,[.008,.124,width],[-length/2+.004,level+.062,0],M.plastic,.003);
  for(const sign of [-1,1]) box(group,[.008,.124,.052],[length/2-.004,level+.062,sign*(width/2-.026)],M.plastic,.003);
  box(group,[.008,.036,width-.104],[length/2-.004,-.031,0],M.plastic,.002);
  box(group,[.008,.042,width-.104],[length/2-.004,level+.021,0],M.plastic,.002);

  // The opening supports the perimeter seal and leaves both sides of the filter open.
  const opening = (x,z)=>[[-x,-z],[x,-z],[x,z],[-x,z]].map(([a,b])=>new Vector2(a,b));
  const shelf = new Shape(opening(length/2,width/2));
  shelf.holes.push(new Path(opening(filterLength/2-.005,filterWidth/2-.005).reverse()));
  const surface = new ExtrudeGeometry(shelf,{depth:.006,bevelEnabled:false});
  surface.rotateX(Math.PI/2);
  mesh(group,surface,M.edge,[0,-.011,0]);
  for (const x of [-.101,.102]) {
    box(group,[.037,.009,.056],[x,level,-width/2-.015],M.dark,.002);
    cylinder(group,.015,.022,[x,level-.009,-width/2-.016],M.rubber,'y',16);
  }
}

export function drawAirFilter(group,{length,width,height}) {
  const [x,z,y] = [length,width,height].map(mm=>mm/1000);
  const rim = .008;
  for(const sign of [-1,1]) {
    box(group,[x,.011,rim],[0,-.0055,sign*(z-rim)/2],M.rubber,0);
    box(group,[rim,.011,z-2*rim],[sign*(x-rim)/2,-.0055,0],M.rubber,0);
  }
  const paper = M.filter;
  const folds = Math.round((x-.016)/.0075);
  const pitch = (x-.016)/folds;
  for(let i=0;i<folds;i++) {
    const a = -x/2+rim+i*pitch;
    const points = [a,-.008,a+pitch/2,-y,a+pitch,-.008];
    for(const end of [0,1]) {
      const fold = box(group,[Math.hypot(pitch/2,y-.008),.001,z-.015],
        [(points[end*2]+points[end*2+2])/2,-(y+.008)/2,0],paper,0);
      fold.rotation.z=(end?1:-1)*Math.atan2(y-.008,pitch/2);
    }
  }
}

export function drawAirboxClip(group, sign, span) {
  box(group,[.020,.010,.009],[0,-.002,0],M.dark,0);
  box(group,[.017,span-.009,.0035],[0,span/2-.006,0],M.steel,.0012);
  tube(group,[[-.008,span-.012,0],[-.008,span-.002,0],[0,span+.001,-sign*.004],
    [.008,span-.002,0],[.008,span-.012,0]],.0017,M.machined,9);
}

export function drawE30AirboxLid(group, shape) {
  const [l,w] = shape.caseSize;
  box(group,[l,.022,w+.002],[0,.011,0],M.plastic,.007);
  const outlet = [[-l/2,.026,.050],[-l/2-.026,.026,.050]];
  loft(group,outlet.map(point=>[point,.045,.041]),M.plastic,{wall:.004,sides:20});
  for(let i=0;i<8;i++) box(group,[.20,.005,.005],[0,.024,(i-3.5)*.023],M.edge,0);
}

export function drawE30IntakeFunnel(group) {
  loft(group,[[[-.035,0,0],.055,.024],[[.027,0,-.002],.058,.025],[[.092,.004,-.004],.079,.032]],
    M.plastic,{wall:.003,roundness:.4,sides:20});
}
