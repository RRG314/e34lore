import {planFor,separationOffset} from './explosion';
import { Box3, Matrix4, Vector3 } from 'three';
import { members, visibleNodes, type ReferenceModel, type ReaderView, type ReferenceNode, type Vec } from './model';
export function installedBounds(n: ReferenceNode) { return n.bounds ? new Box3(new Vector3(...n.bounds.min), new Vector3(...n.bounds.max)).applyMatrix4(new Matrix4().fromArray(n.matrix)) : new Box3().setFromCenterAndSize(new Vector3(n.matrix[12], n.matrix[13], n.matrix[14]), new Vector3(.1, .1, .1)); }
/** Source-anchored, held component separation; source transforms stay immutable. */
export function offsets(m:ReferenceModel,v:ReaderView){const ids=members(m,v.scope),result=new Map<string,Vec>();for(const n of m.nodes.filter(n=>n.assetId&&ids.has(n.id)))result.set(n.id,separationOffset(planFor(m,v.scope,n),v.explosion));return result;}
export function viewBounds(m: ReferenceModel, v: ReaderView, focus?: string) { const result = new Box3(), keep = focus ? members(m, focus) : null, spread = offsets(m, v); for (const n of visibleNodes(m, v)) {
    if (keep && !keep.has(n.id))
        continue;
    const b = installedBounds(n);
    b.translate(new Vector3(...spread.get(n.id) || [0, 0, 0]));
    result.union(b);
} return result; }
/** Fit the occupied component boxes, rather than empty corners of one giant
 * union box. Sparse exploded views otherwise waste much of the viewport. */
export function referenceFrame(m:ReferenceModel,v:ReaderView,direction:Vec,aspect:number,fov:number,focus?:string|readonly string[]){
    const keep=typeof focus==="string"?members(m,focus):focus?new Set(focus):null,spread=offsets(m,v),boxes=visibleNodes(m,v).filter(n=>!keep||keep.has(n.id)).map(n=>installedBounds(n).translate(new Vector3(...spread.get(n.id)||[0,0,0])));
    if(!boxes.length)return null;
    const union=new Box3();for(const box of boxes)union.union(box);
    const origin=union.getCenter(new Vector3()),axis=new Vector3(...direction).normalize(),right=new Vector3().crossVectors(new Vector3(0,1,0),axis).normalize();
    if(right.lengthSq()<.001)right.set(1,0,0);
    const up=new Vector3().crossVectors(axis,right).normalize(),points:Vector3[]=[],projected=new Box3();
    for(const box of boxes)for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
        const point=new Vector3(x,y,z).sub(origin),p=new Vector3(point.dot(right),point.dot(up),point.dot(axis));points.push(p);projected.expandByPoint(p);
    }
    const middle=projected.getCenter(new Vector3()),target=origin.clone().addScaledVector(right,middle.x).addScaledVector(up,middle.y),tanV=Math.tan(fov*Math.PI/360),tanH=tanV*aspect;
    let distance=.05;for(const p of points)distance=Math.max(distance,Math.abs(p.x-middle.x)/tanH+p.z,Math.abs(p.y-middle.y)/tanV+p.z);
    return{target:target.toArray() as Vec,position:target.clone().addScaledVector(axis,distance*1.07).toArray() as Vec};
}
