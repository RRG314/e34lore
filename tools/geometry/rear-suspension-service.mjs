import { CatmullRomCurve3, ExtrudeGeometry, Group, Path, Shape, TubeGeometry, Vector3 } from 'three';
import { along, loft, pin } from './525i-fabrication.mjs';
import { box, cylinder, lathe, mesh, ring, tube, visualMaterials as M } from './525i-visual-details.mjs';

const vector = point => new Vector3(...point);
const offset = (point, dx, dy, dz) => [point[0] + dx, point[1] + dy, point[2] + dz];

// Pivot centres are model datums in metres. The E30 pair follows the 15° rear axle drawing, BMW 33-0.
export function rearSuspensionDatums(series, side) {
  const e30 = series === 'e30';
  const mirror = ([x, y, z]) => [x, y, z * side];
  const pivots = (e30 ? [[-.990, .236, .299], [-1.032, .236, .456]]
    : [[-1.077, .272, .312], [-1.181, .289, .492]]).map(mirror);
  const shockFoot = mirror(e30 ? [-1.310, .229, .665] : [-1.444, .329, .598]);
  const shockTop = mirror(e30 ? [-1.310, .723, .671] : [-1.586, .995, .503]);
  return {
    pivots, shockFoot, shockTop,
    springFoot: e30 ? mirror([-1.142, .314, .512]) : shockFoot,
    springTop: e30 ? mirror([-1.142, .554, .512]) : shockTop,
    boltRadius: e30 ? .006 : .007,
    bushingDiameter: e30 ? .030 : .044,
    bushingWidth: e30 ? .041 : .044,
  };
}

const orientation = axis => new Group().quaternion.setFromUnitVectors(new Vector3(0, 1, 0), vector(axis).normalize());
const local = (at, axis, x, y, z) => new Vector3(x, y, z).applyQuaternion(orientation(axis)).add(vector(at)).toArray();

function pivotEye(group, bore, width) {
  ring(group, bore + .007, bore, width, [0,0,0], M.dark, 'y', 34);
  ring(group, bore + .008, bore + .002, .004, [0, -width / 2 + .002, 0], M.steel, 'y', 32);
}

function rubberBushing(group, radius, width, e30, outer) {
  ring(group, radius, radius - .0018, width, [0,0,0], M.steel, 'y', 30);
  const shoulder = outer ? 1 : -1;
  lathe(group, [[.009,-width/2], [radius-.0015,-width/2], [radius-.0015,width/2], [.009,width/2],
    [.009,-width/2]], M.rubber, 'y', 30);
  ring(group, radius + .003, .009, .003, [0, shoulder * (width / 2 + .001), 0], M.rubber, 'y', 28);
  ring(group, .009, .00615, width + .010, [0, e30 ? 0 : -.003, 0], M.machined, 'y', 24);
}

function metricBolt(group, radius, length, headRadius, start = -length / 2) {
  cylinder(group, radius - .00012, length, [0, start + length / 2, 0], M.machined, 'y', 18);
  cylinder(group, headRadius, .008, [0, start - .004, 0], M.steel, 'y', 6);
  ring(group, headRadius + .001, radius, .0015, [0, start + .001, 0], M.steel, 'y', 24);
  for (let i=1;i<=6;i++) ring(group, radius, radius - .001, .00055,
    [0, start + length - i * .002, 0], M.dark, 'y', 16);
}

function pocketBracket(group, radius, slot, axis) {
  const q = orientation(axis);
  const frame = new Group();
  frame.quaternion.copy(q);
  group.add(frame);
  const face = new Shape();
  face.moveTo(-.036,-.026);
  face.lineTo(.025,-.026);
  face.quadraticCurveTo(.033,-.025,.033,-.016);
  face.lineTo(.033,.019);
  face.quadraticCurveTo(.030,.026,.020,.026);
  face.lineTo(-.036,.026);
  face.closePath();
  const hole = new Path();
  hole.absarc(0,0,radius,0,Math.PI*2,true);
  face.holes.push(hole);
  for (const sign of [-1,1]) {
    const cheek = new ExtrudeGeometry(face, { depth:.007, bevelEnabled:false, curveSegments:8 });
    cheek.rotateX(-Math.PI/2);
    cheek.translate(0, sign * slot / 2 - .0035, 0);
    mesh(frame, cheek, M.dark);
  }
  box(frame, [.009,slot+.008,.052], [-.032,0,0], M.dark, .002);
}

function seat(group, radius, rise, direction, material) {
  const outer = radius;
  return lathe(group, [[.019,0],[.035,0],[outer*.80,rise*.15],[outer,rise*.48],[outer,rise],
    [outer*.89,rise],[outer*.76,rise*.44],[.033,rise*.40],[.019,rise*.40],[.019,0]]
    .map(([r,y])=>[r,y*direction]), material,'y',44);
}

function spring(group, length, e30) {
  const wire = e30 ? .0064 : .0068;
  const count = 108;
  const points = [];
  for (let i=0;i<=count;i++) {
    const t=i/count, angle=t*(e30?6.1:7.15)*2*Math.PI;
    const progress = t - .84*Math.sin(t*2*Math.PI)/(2*Math.PI);
    const r = e30 ? .063+.020*Math.sin(t*Math.PI) : .073;
    points.push(new Vector3(Math.cos(angle)*r,wire+(length-2*wire)*progress,Math.sin(angle)*r));
  }
  mesh(group,new TubeGeometry(new CatmullRomCurve3(points),count,wire,8,false),M.dark);
}

function guideSupport(group, e30) {
  const r=e30?.047:.055;
  lathe(group, [[.011,-.013],[.028,-.013],[.043,-.008],[r,-.007],[r,.001],[.033,.005],
    [.027,.016],[.011,.016],[.011,-.013]],M.steel,'y',38);
  ring(group,.027,.006,.025,[0,.004,0],M.rubber,'y',32);
  ring(group,.012,.0052,.030,[0,.008,0],M.machined,'y',26);
}

const topStuds = e30 => e30 ? [[-.035,0],[.035,0]]
  : [[.043,0],[-.0215,.0372],[-.0215,-.0372]];

export function drawRearTrailingArm(g, series, side, hubHousing, drawWheelBearingSeat) {
  const e30=series==='e30', mirror=([x,y,z])=>[x,y,z*side];
  const {pivots,shockFoot:foot,springFoot:lowerSeat,bushingDiameter,bushingWidth,boltRadius}=rearSuspensionDatums(series,side);
  const pivotAxis=vector(pivots[1]).sub(vector(pivots[0])).normalize().toArray();
  const bore=bushingDiameter/2, bearingOuter=e30?.0375:.040;
  const relative=p=>vector(p).sub(vector(hubHousing)).toArray();
  const socket = relative(foot);
  for(const [i,pivot] of pivots.entries()) {
    const v=relative(pivot);
    along(g,v,vector(v).add(vector(pivotAxis)).toArray(),f=>pivotEye(f,bore,bushingWidth));
    const start=vector(v).lerp(new Vector3(0,-.018,0),.13).toArray();
    const arc=vector(v).lerp(new Vector3(0,-.018,0),.56);
    arc.y-=.024;
    loft(g,[[start,e30?.023:.030,e30?.018:.021],[arc.toArray(),.040,.024],
      [[-.013,-.015,-side*.016],.051,.029],[[0,0,0],.048,.035]],M.dark,{sides:16});
    tube(g,[offset(start,0,.014,0),offset(arc.toArray(),0,.022,0),[-.012,.021,side*.005]],
      .003,M.steel,15);
  }
  if (drawWheelBearingSeat) drawWheelBearingSeat(g);
  else {
    ring(g,bearingOuter+.016,bearingOuter,.055,[0,0,0],M.dark,'z',44);
    ring(g,bearingOuter+.009,bearingOuter,.004,[0,0,side*.028],M.machined,'z',40);
  }
  loft(g,[[[0,-.014,0],.038,.023],[socket,.026,.020]],M.dark,{sides:16});
  ring(g,.029,boltRadius+.0004,.019,socket,M.steel,'z',28);
  if(e30) {
    const pad=relative(lowerSeat);
    loft(g,[[relative(pivots[1]),.028,.018],[offset(pad,0,-.028,0),.069,.021],
      [[0,-.012,-side*.025],.044,.023]],M.dark,{sides:18});
    ring(g,.089,.028,.009,offset(pad,0,-.006,0),M.dark,'y',42);
  }
  const link=relative(mirror(e30?[-1.188,.258,.513]:[-1.377,.361,.579]));
  box(g,[.041,.013,.037],link,M.steel,.003);
}

export function buildRearSuspension(series, carrier, hubs, add) {
  const e30 = series === 'e30';
  for (const [sideName,side] of [['left',-1],['right',1]]) {
    const mirror = ([x,y,z]) => [x,y,z*side];
    const d = rearSuspensionDatums(series,side);
    const {pivots, shockFoot:foot, shockTop:top, springFoot, springTop, boltRadius, bushingDiameter, bushingWidth} = d;
    const pivotAxis=vector(pivots[1]).sub(vector(pivots[0])).normalize().toArray();
    const shockAxis=vector(top).sub(vector(foot)).normalize().toArray();
    const springAxis=e30?[0,1,0]:shockAxis;
    const length=vector(top).distanceTo(vector(foot));
    const lowerSeat=e30?springFoot:local(foot,shockAxis,0,length*.377,0);
    const upperSeat=e30?springTop:local(foot,shockAxis,0,length*.907,0);
    const springStart=local(lowerSeat,springAxis,0,.010,0);
    const springEnd=local(upperSeat,springAxis,0,-.010,0);
    const bore=bushingDiameter/2;
    const hub=hubs[sideName];
    const hubHousing=[hub[0],hub[1],hub[2]-side*(e30?.060:.084)];
    const damperLength=e30?.299:length*.64;
    const bodyPad=local(top,shockAxis,0,.006,0);
    const sideAdd=(key,name,at,draw,page,numbers=[],axis,meta={}) =>
      add(sideName+':'+key,(side<0?'Left ':'Right ')+name,at,draw,page,numbers,axis,meta);

    for (const [i,end] of ['inner','outer'].entries()) {
      const p=pivots[i];
      sideAdd(end+'-bracket','trailing arm carrier bracket ('+end+')',p,g=>pocketBracket(g,.0063,bushingWidth+.014,pivotAxis),'carrier');
      sideAdd(end+'-bushing','trailing arm bushing ('+end+')',p,
        g=>rubberBushing(g,bore,bushingWidth,e30,!!i),'arm',[e30?'33329061945':'33329061946'],pivotAxis);
      sideAdd(end+'-bolt','trailing arm pivot bolt ('+end+')',p,g=>metricBolt(g,.006,.090,.011,-.043),
        'arm',['33321136406'],pivotAxis);
      sideAdd(end+'-nut','trailing arm pivot locknut ('+end+')',local(p,pivotAxis,0,.039,0),
        g=>ring(g,.0109,.006,.010,[0,0,0],M.machined,'y',6),'arm',['07129900047'],pivotAxis);
    }
    sideAdd('arm','rear semi-trailing arm',hubHousing,g=>drawRearTrailingArm(g,series,side,hubHousing),
      'arm',[e30?(side<0?'33321137641':'33321137642'):(side<0?'33321132329':'33321132330')]);

    sideAdd('damper','rear shock absorber',foot,g=>{
      ring(g,.025,boltRadius+.0003,.031,[0,0,0],M.dark,'z',30);
      ring(g,.019,boltRadius+.0003,.034,[0,0,0],M.rubber,'z',30);
      ring(g,.009,boltRadius+.0003,.047,[0,0,0],M.machined,'z',28);
      along(g,[0,0,0],vector(top).sub(vector(foot)).toArray(),f=>{
        lathe(f,[[.017,.006],[.023,.017],[.026,.044],[.026,damperLength-.017],[.027,damperLength-.013],
          [.027,damperLength],[.010,damperLength],[.010,.006],[.017,.006]],M.dark,'y',32);
        cylinder(f,.008,(length-.004)-damperLength,[0,(length+damperLength-.004)/2,0],M.machined,'y',26);
        cylinder(f,.0054,.025,[0,length+.008,0],M.steel,'y',18);
        if(!e30) {
          seat(f,.089,.011,1,M.dark).position.y=length*.36;
          ring(f,.038,.025,.010,[0,length*.353,0],M.steel,'y',28);
        }
      });
    },'strut',e30?['33521135888','33521091999']:['33521133601','33521135613']);
    const boltDirection=[0,0,-side];
    sideAdd('lower-bolt','lower shock bolt',foot,g=>metricBolt(g,boltRadius,e30?.065:.085,e30?.011:.013,
      e30?-.024:-.032),'strut',[e30?'07119914647':'07119914829'],boltDirection);
    sideAdd('lower-washer','lower shock washer',offset(foot,0,0,side*.022),
      g=>ring(g,.014,boltRadius+.0005,.0028,[0,0,0],M.machined,'z',28),'strut',e30?['07119931021']:[]);
    sideAdd('top-mount','rear shock top mount',top,g=>guideSupport(g,e30),'strut',
      [e30?'33521128819':'33521132270'],shockAxis);
    sideAdd('mount-gasket','upper mount gasket',bodyPad,g=>ring(g,e30?.047:.055,e30?.027:.032,.0018,[0,0,0],M.rubber,'y',36),
      'strut',[e30?'33526772864':'33521129567'],shockAxis);
    for (const [i,[x,z]] of topStuds(e30).entries()) {
      const stud=local(top,shockAxis,x,.001,z);
      sideAdd('upper-nut-'+(i+1),'upper shock mount nut '+(i+1),stud,g=>{
        ring(g,.008,.004,.006,[0,.010,0],M.steel,'y',6);
        ring(g,.010,.004,.002,[0,.006,0],M.machined,'y',22);
      },'strut',['07119904295'],shockAxis);
      sideAdd('upper-stud-'+(i+1),'upper shock mount stud '+(i+1),stud,g=>{
        cylinder(g,.004,.024,[0,.005,0],M.machined,'y',16);
      },'strut',e30?[]:['31336765744'],shockAxis);
    }
    sideAdd('rod-nut','piston-rod locknut',local(top,shockAxis,0,.023,0),
      g=>ring(g,.010,.005,.009,[0,0,0],M.machined,'y',6),'strut',['07129922436'],shockAxis);
    sideAdd('rod-washer','piston-rod washer',local(top,shockAxis,0,.017,0),
      g=>ring(g,.015,.0053,.003,[0,0,0],M.machined,'y',24),'strut',[],shockAxis);
    if(!e30) sideAdd('top-cap','shock tower dust cap',local(top,shockAxis,0,.030,0),
      g=>lathe(g,[[.029,0],[.029,.008],[.024,.013],[.004,.013],[.004,.009],[.026,.006],[.026,0],[.029,0]],
        M.plastic,'y',26),'strut',['33521132854'],shockAxis);

    sideAdd('bump-stop','rear shock bump stop',local(foot,shockAxis,0,length*.845,0),g=>{
      lathe(g,[[.009,-.037],[.017,-.037],[.020,-.028],[.018,-.021],[.024,-.007],[.022,.006],
        [.023,.015],[.009,.015],[.009,-.037]],M.rubber,'y',32);
    },'strut',[e30?'33521125078':'33531135624'],shockAxis);
    sideAdd('boot','rear shock protection sleeve',local(foot,shockAxis,0,length*.615,0),g=>{
      const h=length*.25;
      lathe(g,[[.025,0],[.029,0],[.031,.009],[.028,h-.017],[.025,h],[.017,h],
        [.017,h-.004],[.024,h-.010],[.025,0]],M.plastic,'y',32);
    },'strut',[e30?'33521129263':'31331134314'],shockAxis);
    if(!e30) sideAdd('spring-cup','upper spring support cup',local(upperSeat,springAxis,0,.004,0),
      g=>seat(g,.088,.011,-1,M.steel),'strut',['33521136063'],springAxis);
    if(e30) sideAdd('body-perch','upper rear spring body perch',springTop,g=>{
      seat(g,.094,.011,-1,M.dark);
      ring(g,.049,.031,.015,[0,.006,0],M.dark,'y',30);
    },'strut');
    sideAdd('upper-pad','upper rear spring rubber pad',upperSeat,
      g=>seat(g,e30?.080:.083,.010,-1,M.rubber),'strut',[e30?'33531128610':'33531133670'],springAxis);
    sideAdd('lower-pad','lower rear spring rubber pad',lowerSeat,
      g=>seat(g,e30?.088:.084,.011,1,M.rubber),'strut',[e30?'33531136385':'33531133671'],springAxis);
    sideAdd('spring','rear coil spring',springStart,g=>spring(g,vector(springEnd).distanceTo(vector(springStart)),e30),
      'strut',e30?[]:['33531133339'],springAxis,{lowerSeat,upperSeat,springStart,springEnd});
    const linkUpper=mirror(e30?[-1.182,.355,.525]:[-1.377,.361,.579]);
    const linkLower=mirror(e30?[-1.188,.258,.513]:[-1.378,.277,.578]);
    if(e30) sideAdd('drop-link','rear stabilizer link',linkLower,g=>{
      const upper=vector(linkUpper).sub(vector(linkLower)).toArray();
      pin(g,[0,0,0],upper,.007,M.steel,16);
      ring(g,.014,.0043,.014,[0,0,0],M.rubber,'z',24);
      ring(g,.014,.006,.015,upper,M.rubber,'x',26);
    },'bar',['33551124375']);
    if(!e30 && side>0) {
      const braceEnd=[-1.475,.372,.214];
      const linkEnd=[-1.165,.248,.390];
      const span=vector(braceEnd).sub(vector(linkEnd)).toArray();
      sideAdd('diagonal-brace','diagonal rear axle support',linkEnd,g=>{
        pin(g,[0,0,0],span,.014,M.dark,22);
        for(const point of [[0,0,0],span]) ring(g,.018,.0065,.009,point,M.steel,'y',26);
      },'carrier',['33311134156']);
      sideAdd('brace-bolt','diagonal support mounting bolt',linkEnd,g=>metricBolt(g,.006,.035,.0108,-.018),
        'carrier',[],[0,1,0]);
    }
    sideAdd('link-bolt','rear stabilizer link lower bolt',linkLower,g=>metricBolt(g,.004,.033,.008,-.015),
      'bar',[],[0,0,side]);
    sideAdd('abs','rear ABS pulse sensor',offset(hubHousing,.023,.037,-side*.008),g=>{
      cylinder(g,.008,.018,[0,0,0],M.plastic,'z',18);
      box(g,[.025,.012,.013],[.006,.007,0],M.plastic,.003);
      tube(g,[[0,0,-side*.010],[.018,.014,-side*.020],[.040,.031,-side*.039]],.0028,M.rubber,8);
    },'arm',[e30?'34521155041':'34521181490']);
    sideAdd('brake-union','rear brake line union',offset(hubHousing,.068,.029,-side*.085),g=>{
      cylinder(g,.0065,.014,[0,0,0],M.machined,'z',6);
      tube(g,[[0,0,0],[0,0,side*.029],[-.040,-.006,side*.049],[-.073,.004,side*.060]],.0027,M.steel,14);
    },'arm');
  }
  if(e30) add('bar','Rear stabilizer bar',carrier,g=>{
    const pts=[[-1.182,.355,-.525],[-1.109,.305,-.452],[-.995,.288,-.329],[-.976,.281,0],
      [-.995,.288,.329],[-1.109,.305,.452],[-1.182,.355,.525]];
    tube(g,pts,.0068,M.dark,36);
    for(const z of [-.355,.355]) ring(g,.017,.0072,.024,[-1.027,.293,z],M.rubber,'z',24);
  },'bar',['33551127344']);
}
