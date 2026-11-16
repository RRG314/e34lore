import {BufferGeometry, Float32BufferAttribute, Mesh, Vector3} from 'three';

export const lerp = (a,b,t) => a+(b-a)*t;
export const mix = (a,b,t) => a.map((value,i)=>lerp(value,b[i],t));
export const smooth = (value) => {
  const t = Math.min(1,Math.max(0,value));
  return t*t*(3-2*t);
};

export function patch(group, material, point, columns=24, rows=12) {
  const positions=[], uvs=[], indices=[];
  for(let i=0;i<=columns;i++) for(let j=0;j<=rows;j++) {
    const u=i/columns,v=j/rows;
    positions.push(...point(u,v));
    uvs.push(u,v);
  }
  for(let i=0;i<columns;i++) for(let j=0;j<rows;j++){
    const a=i*(rows+1)+j,b=a+rows+1;
    indices.push(a,b,a+1,a+1,b,b+1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry,material);
  group.add(mesh);
  return mesh;
}

export function between(group,material,low,high,columns,rows) {
  return patch(group,material,(t,v)=>mix(low(t),high(t),v),columns,rows);
}

// A narrow swept bead keeps a seal or brightwork rounded even where it turns a corner.
export function bead(group,material,path,radius,segments=44) {
  return patch(group,material,(u,v)=>{
    const p=new Vector3(...path(u));
    const a=new Vector3(...path(Math.max(0,u-.001)));
    const b=new Vector3(...path(Math.min(1,u+.001)));
    const tangent=b.sub(a).normalize();
    const normal=new Vector3(0,1,0).cross(tangent);
    if(normal.lengthSq()<.0001) normal.set(0,0,1).cross(tangent);
    normal.normalize();
    const binormal=tangent.cross(normal).normalize();
    const angle=v*2*Math.PI;
    return p.addScaledVector(normal,radius*Math.cos(angle)).addScaledVector(binormal,radius*Math.sin(angle)).toArray();
  },segments,9);
}

// Use one bowed footprint for the face, corners, and side returns.
export function bumperPath(front, x, halfWidth, radius, sideEnd, t, bow=.010, sideInset=.020) {
  const sign=t<.5?-1:1;
  const u=Math.abs(2*t-1);
  if(u<=.64) {
    const z=(halfWidth-radius)*u/.64;
    return [x-front*bow*(u/.64)**2,sign*z];
  }
  if(u<=.84) {
    const v=(u-.64)/.20;
    const frontX=x-front*bow, sideX=frontX-front*radius;
    const start=[frontX,halfWidth-radius];
    const control1=[frontX-front*radius*.22,halfWidth-radius*.46];
    const control2=[sideX+front*radius*.53,halfWidth];
    const [px,z]=mix(mix(mix(start,control1,v),mix(control1,control2,v),v),
      mix(mix(control1,control2,v),mix(control2,[sideX,halfWidth],v),v),v);
    return [px,sign*z];
  }
  const start=x-front*(radius+bow);
  const v=(u-.84)/.16;
  return [lerp(start,sideEnd,v),sign*(halfWidth-sideInset*smooth(v))];
}

function bumperPoint(profile,u,v) {
  const {front,x,width,radius,sideEnd,yMin,yMax,crown=.008,bow,bottomTuck=0,sideInset,sideSweep=0}=profile;
  const [px,z]=bumperPath(front,x,width,radius,sideEnd-front*sideSweep*(1-v),u,bow,sideInset);
  const angle=v*Math.PI;
  const tucked=bottomTuck*(1-v)**2;
  return [
    px+front*(Math.sin(angle)*crown-.007*Math.abs(Math.cos(angle))**8-tucked),
    lerp(yMin,yMax,v),
    z+Math.sign(z)*(Math.sin(angle)*crown-.006*Math.abs(Math.cos(angle))**8-tucked*.42),
  ];
}

export function bumperSurface(group,material,profile,fit=(point)=>point) {
  return patch(group,material,(u,v)=>fit(bumperPoint(profile,u,v),u,v),150,16);
}

// Project a lamp or opening onto the curved fascia at its actual height.
export function bumperFace(profile,y,z,offset=0) {
  const v=Math.min(1,Math.max(0,(y-profile.yMin)/(profile.yMax-profile.yMin)));
  let low=.5,high=.92;
  for(let i=0;i<16;i++){
    const middle=(low+high)*.5;
    if(bumperPoint(profile,middle,v)[2]<Math.abs(z))low=middle;
    else high=middle;
  }
  const [x]=bumperPoint(profile,(low+high)*.5,v);
  return [x+profile.front*offset,y,z];
}
