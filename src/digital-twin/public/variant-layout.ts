import {Box3,Matrix4,Vector3} from 'three';
import {bodyTrimScope, isCabinTrimInspection, isExteriorNode, members, type ReferenceModel, type ReferenceNode, type Vec} from './model';
type Manifest=ReferenceModel; type Instance=ReferenceNode; type Snapshot={explodeScope:string;explosion:number;view:string;overrides:Record<string,never>};

type Unit={id:string;ids:string[];box:Box3;center:Vector3;family:string;direction:Vector3};
type Plan={offsets:Map<string,Vec>;units:Unit[]};
const plans=new WeakMap<Manifest,{overrides:Snapshot['overrides'];scopes:Map<string,Plan>}>();
export const EXPLODED_GAP=.025;
const shellSurface = /^e34body:(?:shell|roof|front-fender-(?:left|right)|rear-quarter-(?:left|right)|rocker-(?:left|right)|(?:front|rear)-bumper)$/;
const body=(n:Instance, detailed:boolean)=>!!n.assetId?.startsWith('assembled:body-') || detailed&&isExteriorNode(n);
function family(n: Instance, detailed: boolean) {
 if (/^(?:m50|m30b35|m60b30|m60b40):/.test(n.id) || n.assetId?.startsWith('vehicle-variant:engine:')) return 'engine';
 if ((detailed&&n.gearbox) || /^(?:zf-|getrag-)/.test(n.id) || n.assetId?.startsWith('vehicle-variant:transmission:')) return 'transmission';
 if (detailed&&n.id.startsWith('e34trim:') || body(n,detailed)) return 'body';
 return n.systemIds[0] || 'vehicle';
}
function displayDirection(owner: Instance, box: Box3, kind: string, detailed: boolean) {
 if (detailed&&owner.gearbox) return new Vector3(...owner.gearbox.spread);
 if (owner.displayDirection) return new Vector3(...owner.displayDirection);
 if (detailed && kind==='body' && owner.systemIds.includes(bodyTrimScope)) {
  const centre=box.getCenter(new Vector3());
  if (owner.id.includes('cowl')) return new Vector3(0,1,0);
  if (owner.id.includes('bumper')) return new Vector3(1,0,0);
  if (Math.abs(centre.z)>.15) return new Vector3(0,0,Math.sign(centre.z));
 }
 return new Vector3();
}
function stableDirection(id:string){let h=2166136261;for(const c of id)h=Math.imul(h^c.charCodeAt(0),16777619);const angle=(h>>>0)/4294967296*Math.PI*2;return new Vector3(Math.cos(angle),.45,Math.sin(angle)).normalize();}

/** Smallest forward distance on a display ray clear of all occupied boxes.
 * Uses merged intersection intervals, not an iteration limit or travel cap.
 * This certifies display-box separation at 100%, never physical removal paths. */
export function clearDisplayRay(box:Box3,direction:Vector3,occupied:Box3[],gap=EXPLODED_GAP){
 const intervals:[number,number][]=[];
 for(const fixed of occupied){
  let low=-Infinity,high=Infinity;
  for(const axis of ['x','y','z'] as const){
   const d=direction[axis];
   if(Math.abs(d)<1e-10){if(box.max[axis]+gap<=fixed.min[axis]||box.min[axis]-gap>=fixed.max[axis]){high=-Infinity;break;}}
   else{const a=(fixed.min[axis]-gap-box.max[axis])/d,b=(fixed.max[axis]+gap-box.min[axis])/d;low=Math.max(low,Math.min(a,b));high=Math.min(high,Math.max(a,b));}
  }
  if(low<=high&&high>=0)intervals.push([low,high]);
 }
 let distance=0;
 for(const[low,high]of intervals.sort((a,b)=>a[0]-b[0]||a[1]-b[1])){if(low>distance+1e-8)break;if(high>=distance)distance=high+1e-6;}
 return distance;
}
function makePlan(m:Manifest,s:Snapshot,nodes:Instance[]):Plan{
 const indexed=new Map(m.nodes.map(n=>[n.id,n])),nodeIds=new Set(nodes.map(n=>n.id));
 const detailed=indexed.has(bodyTrimScope);
 const cabinTrim=isCabinTrimInspection(s.explodeScope);
 // These surfaces were cut from one continuous shell mesh by region. Move
 // them together in the whole-car view so the artificial cuts stay closed.
 const shell=detailed&&s.explodeScope==='vehicle'?indexed.get('e34body:shell'):undefined;
 const world=(id:string)=>new Matrix4().fromArray(indexed.get(id)!.matrix);
 const units=new Map<string,Unit>(),families=new Map<string,Box3>();
 for(const n of nodes){
  let owner=n;
  // Whole-car panels carry their glass/trim. Opening that panel's own scope
  // separates those components as well instead of leaving them obstructed.
  if(!cabinTrim&&body(n,detailed)&&!n.trimCover)while(owner.parentId&&nodeIds.has(owner.parentId)&&owner.parentId!==s.explodeScope){const parent=indexed.get(owner.parentId)!;if(!body(parent,detailed))break;owner=parent;}
  if(shell&&shell.assetId===owner.assetId&&shellSurface.test(owner.id))owner=shell;
  const matrix=world(n.id),source=n.bounds;
  const box=source?new Box3(new Vector3(...source.min),new Vector3(...source.max)).applyMatrix4(matrix):new Box3().setFromCenterAndSize(new Vector3().setFromMatrixPosition(matrix),new Vector3(.01,.01,.01));
  let unit=units.get(owner.id);
  if(!unit){const kind=family(owner,detailed);unit={id:owner.id,ids:[],box:new Box3(),center:new Vector3(),family:kind,direction:new Vector3()};units.set(owner.id,unit);}
  unit.ids.push(n.id);unit.box.union(box);
 }
 for(const u of units.values()){u.box.getCenter(u.center);u.direction=u.id===shell?.id?new Vector3(0,1,0):displayDirection(indexed.get(u.id)!,u.box,u.family,detailed);if(!families.has(u.family))families.set(u.family,new Box3());families.get(u.family)!.union(u.box);}
 const offsets=new Map<string,Vec>(),occupied:Box3[]=[];
 // Large shells establish the display envelope before small clips/fasteners.
 // Sorting by real size and stable identity makes order and slider history irrelevant.
 const ordered=[...units.values()].sort((a,b)=>{const av=a.box.getSize(new Vector3()),bv=b.box.getSize(new Vector3());return bv.x*bv.y*bv.z-av.x*av.y*av.z||a.id.localeCompare(b.id);});
 for(const u of ordered){
  const origin=families.get(u.family)!.getCenter(new Vector3()),relative=u.center.clone().sub(origin),size=u.box.getSize(new Vector3());
  let direction=relative.clone();
  if((cabinTrim||u.family==='body'||detailed&&indexed.get(u.id)?.gearbox)&&u.direction.lengthSq()>.00001)direction.copy(u.direction);
  else if(u.direction.lengthSq()>.00001)direction.addScaledVector(u.direction.clone().normalize(),.2);
  if(direction.lengthSq()<.0001)direction=stableDirection(u.id);else direction.normalize();
  const spread=cabinTrim ? .30 : u.family==='engine'||u.family==='transmission' ? 1.9 : .8;
  const largest=Math.max(size.x,size.y,size.z);
  const offset=relative.multiplyScalar(spread).addScaledVector(direction,cabinTrim ? .055+largest*.20 : .18+largest*.55);
  if(s.explodeScope==='vehicle'){
   if(u.family==='engine')offset.add(new Vector3(1.9,.7,0));
   else if(u.family==='transmission')offset.add(new Vector3(-.5,-1,0));
   else if(u.family==='body')offset.add(new Vector3(0,.8,0));
   else if(u.family==='system:interior')offset.add(new Vector3(0,.5,0));
   else if(/exhaust|driveshaft|differential/.test(u.family))offset.y-=.6;
  }
  if (u.id===shell?.id) offset.set(0,.72,0);
  const proposed=u.box.clone().translate(offset);
  offset.addScaledVector(direction,clearDisplayRay(proposed,direction,occupied));
  occupied.push(u.box.clone().translate(offset));
  for(const id of u.ids)offsets.set(id,offset.toArray() as Vec);
 }
 // Normalize relative spread across body styles without scaling any geometry.
 // Increasing separated centres preserves their existing box clearances.
 const installed=new Box3(),display=new Box3();
 for(const u of ordered){installed.union(u.box);display.union(u.box.clone().translate(new Vector3(...offsets.get(u.id)!)));}
 const size=installed.getSize(new Vector3()),target=Math.max(size.x,size.y,size.z)*(cabinTrim?1.65:3);
 const centre=display.getCenter(new Vector3());
 const spread=(factor:number)=>{const box=new Box3();for(const u of ordered){const old=new Vector3(...offsets.get(u.id)!);const delta=u.center.clone().add(old).sub(centre).multiplyScalar(factor).add(centre).sub(u.center);box.union(u.box.clone().translate(delta));}const v=box.getSize(new Vector3());return Math.max(v.x,v.y,v.z);};
 if(ordered.length>1&&spread(1)<target){
  let low=1,high=2;while(spread(high)<target)high*=2;
  for(let i=0;i<24;i++){const mid=(low+high)/2;if(spread(mid)<target)low=mid;else high=mid;}
  for(const u of ordered){const delta=u.center.clone().add(new Vector3(...offsets.get(u.id)!)).sub(centre).multiplyScalar(high).add(centre).sub(u.center).toArray() as Vec;for(const id of u.ids)offsets.set(id,delta);}
 }
 return{offsets,units:ordered};
}
// One layout policy for the 525i and all private variants; full plans are cached
// independently of slider amount, selection, camera and performance updates.
export function variantExplosion(m:Manifest,s:Snapshot,nodes:Instance[]){
 const amount=Math.max(0,Math.min(1,s.explosion/4));
 if(!amount)return new Map(nodes.map(n=>[n.id,[0,0,0] as Vec]));
 let cache=plans.get(m);if(!cache||cache.overrides!==s.overrides){cache={overrides:s.overrides,scopes:new Map()};plans.set(m,cache);}
 const key=s.view+'|'+s.explodeScope+'|'+nodes.map(n=>n.id).sort().join(',');
 let plan=cache.scopes.get(key);if(!plan){plan=makePlan(m,s,nodes);if(cache.scopes.size>=8)cache.scopes.delete(cache.scopes.keys().next().value!);cache.scopes.set(key,plan);}
 return new Map([...plan.offsets].map(([id,v])=>[id,v.map(x=>x*amount) as Vec]));
}

const emptyOverrides={};
const referencePlans=new WeakMap<ReferenceModel,Map<string,Map<string,Vec>>>();
export function referenceVariantOffsets(m:ReferenceModel,scope:string){
 let scopes=referencePlans.get(m);if(!scopes){scopes=new Map();referencePlans.set(m,scopes);}
 const cached=scopes.get(scope);if(cached)return cached;
 const ids=members(m,scope),offsets=variantExplosion(m,{view:'vehicle',explodeScope:scope,explosion:4,overrides:emptyOverrides},m.nodes.filter(n=>n.assetId&&ids.has(n.id)));
 if(scopes.size>=8)scopes.delete(scopes.keys().next().value!);scopes.set(scope,offsets);return offsets;
}
