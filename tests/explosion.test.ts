import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {Vector3} from 'three';
import release from '../data/digital-twin/public-reference.json';
import { parseReference, defaultView, members, visibleNodes } from '../src/digital-twin/public/model';
import { offsets,installedBounds,viewBounds,referenceFrame } from '../src/digital-twin/public/layout';
import { separationOffset } from '../src/digital-twin/public/explosion';
const m = parseReference(JSON.parse(fs.readFileSync('public' + release.manifestUrl, 'utf8'))), n = (id: string) => m.nodes.find(n => n.id === id)!, spread = (scope: string, explosion = 4) => offsets(m, { ...defaultView(), scope, explosion });
const box=(id:string,scope='vehicle')=>installedBounds(n(id)).translate(new Vector3(...spread(scope).get(id)!));
describe('complete modeled-component separation',()=>{
 it('separates engine components individually while preserving the continuous body shell',()=>{
  const s=spread('vehicle');for(const id of ['m50:cylinder-head','m50:water-pump','m50:water-pump-impeller','m50:piston:1','m50:crankshaft'])expect(s.get(id)).not.toEqual(s.get('m50:block'));
  expect(s.get('m50:water-pump')).not.toEqual(s.get('m50:water-pump-impeller'));
  for(const id of ['e34body:shell','e34body:roof','e34body:front-fender-left','e34body:rear-quarter-right','e34sys:floor-pan'])expect(s.get(id)).toEqual([0,0,0]);
 });
 it('reveals every modeled internal component during separation and restores assembled visibility at zero',()=>{
  expect(visibleNodes(m,{...defaultView(),explosion:4})).toHaveLength(release.renderableCount);
  expect(visibleNodes(m,defaultView()).some(n=>n.id==='m50:crankshaft')).toBe(false);
  expect(visibleNodes(m,{...defaultView(),explosion:.01}).some(n=>n.id==='m50:crankshaft')).toBe(true);
 });
 it('detaches all four doors independently with clear body and neighbouring-door gaps',()=>{
  const ids=['front-door-left','front-door-right','rear-door-left','rear-door-right'].map(id=>'e34body:'+id),s=spread('vehicle');
  expect(new Set(ids.map(id=>JSON.stringify(s.get(id)))).size).toBe(4);
  const shell=box('e34body:shell');for(const id of ids){expect(box(id).intersectsBox(shell),id).toBe(false);for(const other of ids.filter(x=>x!==id))expect(box(id).intersectsBox(box(other)),id+' / '+other).toBe(false);}
  for(const side of ['left','right'])expect(box('e34body:front-door-glass-'+side).intersectsBox(box('e34body:front-door-'+side))).toBe(false);
 });
 it('retains door attachment context while exposing glass, mirror and trim as separate parts',()=>{
  for(const side of ['left','right']){
   const id='e34body:front-door-'+side,s=spread(id),whole=spread('vehicle');
   expect(s.get(id)).toEqual([0,0,0]);
   for(const child of ['e34body:mirror-'+side,'e34body:front-door-glass-'+side,'e34body:side-moulding-e34-body-16-'+side]){
    expect(members(m,id)).toContain(child);expect(s.get(child)).not.toEqual([0,0,0]);
    expect(new Vector3(...whole.get(child)!).sub(new Vector3(...whole.get(id)!)).toArray()).toEqual(s.get(child));
   }
  }
 });
 it('opens ordered wheel/brake layers on both sides without moving a rigid axle lump',()=>{
  const s=spread('vehicle');for(const [suffix,side,wheel]of [['1',-1,'front-left'],['-1',1,'front-right']]as const){
   const ids=['brake-shield','hub','brake-disc','brake-pad','brake-caliper'].map(prefix=>'e34sys:'+prefix+'-front-'+suffix);
   const positions=ids.map(id=>box(id).getCenter(new Vector3()).z*side);for(let i=1;i<positions.length;i++)expect(positions[i]).toBeGreaterThan(positions[i-1]);
   expect(box('wheel:'+wheel).getCenter(new Vector3()).z*side).toBeGreaterThan(positions.at(-1)!);
   for(const id of ids)expect(s.get(id)).not.toEqual(s.get('e34sys:front-subframe'));
  }
 });
 it('keeps focused parents anchored and opens pump, valvetrain and strut components',()=>{
  for(const id of ['m50:water-pump','m50:cylinder-head','e34body:hood','e34body:trunk'])expect(spread(id).get(id)).toEqual([0,0,0]);
  expect(spread('m50:water-pump').get('m50:water-pump-impeller')![0]).toBeLessThan(0);
  const head=spread('m50:cylinder-head');expect(head.get('m50:valve-spring:intake:1:1')).not.toEqual(head.get('m50:valve:intake:1:1'));
  expect(members(m,'e34sys:front-strut-1')).toContain('e34sys:front-spring-1');
  const strut=spread('e34sys:front-strut-1');expect(strut.get('e34sys:front-spring-1')).not.toEqual(strut.get('e34sys:front-damper-1'));expect(strut.get('e34sys:front-damper-1')).not.toEqual([0,0,0]);
  expect(box('m50:block','system:engine').intersectsBox(box('m50:cylinder-head','system:engine'))).toBe(false);
  expect(box('m50:block','system:engine').intersectsBox(box('m50:piston:1','system:engine'))).toBe(false);
 });
 it('uses proportional, continuous slider movement without stages, path jumps or growing repulsion',()=>{
  const final=spread('vehicle');for(const amount of [0,.01,.3,.8,1.3,2,2.7,3.99,4])for(const [id,v] of spread('vehicle',amount))for(let axis=0;axis<3;axis++)expect(v[axis],id).toBeCloseTo(final.get(id)![axis]*amount/4,10);
  const b=viewBounds(m,{...defaultView(),explosion:4}),size=b.getSize(new Vector3());expect(size.x).toBeLessThan(10);expect(size.y).toBeLessThan(7);expect(size.z).toBeLessThan(8);
 });
 it('fills the viewport with occupied geometry while keeping every visible component in frame',()=>{
  const v={...defaultView(),explosion:4},aspect=1280/298,fov=42,frame=referenceFrame(m,v,[1,.4,1],aspect,fov)!,target=new Vector3(...frame.target),axis=new Vector3(...frame.position).sub(target).normalize(),distance=new Vector3(...frame.position).distanceTo(target),right=new Vector3().crossVectors(new Vector3(0,1,0),axis).normalize(),up=new Vector3().crossVectors(axis,right).normalize(),tan=Math.tan(fov*Math.PI/360),s=spread('vehicle');let edge=0;
  for(const n of visibleNodes(m,v)){const b=installedBounds(n).translate(new Vector3(...s.get(n.id)!));for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new Vector3(x,y,z).sub(target),depth=distance-p.dot(axis),projection=Math.max(Math.abs(p.dot(right))/(depth*tan*aspect),Math.abs(p.dot(up))/(depth*tan));expect(projection).toBeLessThanOrEqual(1);edge=Math.max(edge,projection);}}
  expect(edge).toBeGreaterThan(.85);
 });
 it('is deterministic, reversible and immutable, with no random or time-dependent offsets',()=>{
  const before=JSON.stringify(m);for(const amount of [0,.1,1,2,4,2,0]){const a=spread('vehicle',amount);expect(a).toEqual(spread('vehicle',amount));for(const v of a.values())expect(v.every(Number.isFinite)).toBe(true);}
  expect(JSON.stringify(m)).toBe(before);expect([...spread('vehicle',0).values()].every(v=>v.every(c=>c===0))).toBe(true);
  expect(separationOffset({group:'test',start:0,end:1,path:[[0,2,0],[2,2,0]]},2)).toEqual([0,2,0]);
 });
});
