import * as T from 'three';
import targets from '../../data/build-studio/appearance-targets.json';
import type {MaterialBinding} from './appearance';

/** UV islands reviewed against the pinned source atlas. Never select by color
 * alone: mirror glass, lamps and painted panels share the same source material. */
export function paintRegions(binding: MaterialBinding): readonly (readonly number[])[] | null {
  const selection = targets.paintSurfaceRegions.find(s => s.assetSha256 === binding.sha256 && s.assetId === binding.assetId && s.nodeIds.includes(binding.nodeId) && s.materialIndex === binding.materialIndex);
  return selection?.uvRects ?? null;
}

/** Separate paint from trim using a private geometry copy. Source buffers,
 * original draw groups and every triangle are retained unchanged. */
export function splitPaintSurfaces(geometry: T.BufferGeometry, materials: T.Material[], bindings: MaterialBinding[]): {geometry: T.BufferGeometry; materials: T.Material[]; owned: boolean} {
  const uv = geometry.getAttribute('uv');
  const regions = bindings.map(paintRegions);
  if (!uv || !regions.some(Boolean)) return {geometry, materials, owned: false};
  const index = geometry.getIndex();
  const groups = geometry.groups.length ? geometry.groups : [{start:0,count:index?.count ?? geometry.getAttribute('position').count,materialIndex:0}];
  const copies = materials.slice(), indices: number[] = [], result = geometry.clone();
  result.clearGroups();
  for (const group of groups) {
    const slot = group.materialIndex ?? 0, areas = regions[slot], base = materials[slot];
    const plain: number[] = [], painted: number[] = [];
    for (let offset=group.start; offset<group.start+group.count; offset+=3) {
      const triangle = [0,1,2].map(k=>index ? index.getX(offset+k) : offset+k);
      // A complete triangle must belong to one reviewed island. Ambiguous
      // boundary triangles keep their source finish rather than painting glass.
      const selected = areas?.some(([x0,y0,x1,y1])=>triangle.every(vertex=>uv.getX(vertex)>=x0 && uv.getX(vertex)<=x1 && uv.getY(vertex)>=y0 && uv.getY(vertex)<=y1));
      (selected ? painted : plain).push(...triangle);
    }
    if (areas && base) base.userData.buildRole = null;
    if (plain.length) {result.addGroup(indices.length,plain.length,slot);indices.push(...plain);}
    if (painted.length && base) {
      const paint=base.clone();paint.userData={...base.userData,buildRole:'paint'};const paintSlot=copies.push(paint)-1;
      result.addGroup(indices.length,painted.length,paintSlot);indices.push(...painted);
    }
  }
  result.setIndex(indices);
  return {geometry:result,materials:copies,owned:true};
}
