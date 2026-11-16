// Geometry helpers for original, catalogue-informed studies in metres.
import {Group, Vector3} from 'three';
import {cylinder, surface, visualMaterials as M} from './525i-visual-details.mjs';

export function along(group, from, to, draw) {
  const frame = new Group();
  frame.position.fromArray(from);
  frame.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...to).sub(frame.position).normalize());
  group.add(frame);
  draw(frame, frame.position.distanceTo(new Vector3(...to)));
}

export function pin(group, from, to, radius, material = M.machined, segments = 20) {
  along(group, from, to, (frame, length) => cylinder(frame, radius, length, [0,length/2,0], material, 'y', segments));
}

// A closed solid through shaped stations. An optional inner wall leaves both ends open.
export function loft(group, stations, material, {sides = 20, wall = 0, roundness = .65, up = [0,1,0]} = {}) {
  const centers = stations.map(([point]) => new Vector3(...point));
  const vertical = new Vector3(...up);
  const points = [], indices = [];
  const layer = stations.length * sides;
  for (let shell = 0; shell <= Number(wall > 0); shell++) {
    stations.forEach(([,width,height], i) => {
      const direction = centers[Math.min(i+1,centers.length-1)].clone()
        .sub(centers[Math.max(i-1,0)]).normalize();
      const across = vertical.clone().cross(direction).normalize();
      const normal = direction.clone().cross(across);
      for (let j = 0; j < sides; j++) {
        const a = j * Math.PI * 2 / sides, c = Math.cos(a), s = Math.sin(a);
        points.push(centers[i].clone()
          .addScaledVector(across, Math.sign(c) * Math.abs(c)**roundness * (width-shell*wall))
          .addScaledVector(normal, Math.sign(s) * Math.abs(s)**roundness * (height-shell*wall)).toArray());
      }
    });
  }
  for (let i = 0; i < stations.length-1; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i*sides+j, b = i*sides+(j+1)%sides, c = a+sides, d = b+sides;
      indices.push(a,b,c,b,d,c);
      if (wall) indices.push(layer+a,layer+c,layer+b,layer+b,layer+c,layer+d);
    }
  }
  const end = layer - sides;
  for (let j = 0; j < sides; j++) {
    const next = (j+1)%sides;
    if (wall) {
      indices.push(j,layer+j,next,next,layer+j,layer+next);
      indices.push(end+j,end+next,layer+end+j,end+next,layer+end+next,layer+end+j);
    } else if (j > 0 && j < sides-1) {
      indices.push(0,j+1,j,end,end+j,end+j+1);
    }
  }
  return surface(group, points, indices, material);
}
