import type{Vehicle}from'../data/catalog';
export type VehicleReference={id:string;model:string;year:number;body:string;engine:string;transmission:string;contextId?:string;exteriorOnly?:boolean};
export function engineMatches(reference:string,selected:string){
 if(!selected)return true;const r=reference.toUpperCase(),s=selected.toUpperCase();
 if(r===s)return true;
 // A family selection may use its member; a specified displacement cannot change.
 return !/B\d\d/.test(s)&&r.replace(/B\d\d.*$/,'')===s;
}
export function referenceCandidates<T extends VehicleReference>(rows:readonly T[],vehicle:Vehicle){
 if(!vehicle.model)return [];
 if(vehicle.steering==='RHD')return [];
 return rows.filter(r=>r.model===vehicle.model&&(!vehicle.body||r.body===vehicle.body)&&(!vehicle.transmission||r.transmission.toLowerCase()===vehicle.transmission.toLowerCase())&&engineMatches(r.engine,vehicle.engine));
}
export function resolveVehicleReference<T extends VehicleReference>(rows:readonly T[],vehicle:Vehicle,explicit?:string){
 if(explicit){const selected=rows.find(r=>r.id===explicit);return {selected,candidates:selected?[selected]:[],status:selected?'explicit' as const:'missing' as const};}
 if(!vehicle.model)return{selected:rows[0],candidates:rows.slice(0,1),status:'default' as const};
 const candidates=referenceCandidates(rows,vehicle);
 const exact=vehicle.year?candidates.filter(r=>String(r.year)===vehicle.year):[];
 const best=exact.length?exact:candidates;
 return{selected:best.length===1?best[0]:undefined,candidates:best,status:best.length===1?'matching' as const:best.length?'ambiguous' as const:'missing' as const};
}
export function referenceVehicle(r:VehicleReference):Vehicle{return{model:r.model,year:String(r.year),month:'',engine:r.engine.replace(/B\d\d.*$/,''),body:r.body,transmission:r.transmission,market:'',steering:''};}
export function switchReferenceHref(href:string,next:VehicleReference,destination:'/workshop'|'/quick-reference/model'='/workshop'){
 const old=new URL(href,'https://e34lore.com'),p=new URLSearchParams({reference:next.id});
 if(destination==='/quick-reference/model'){
  const focus=old.searchParams.get('focus');
  if(focus&&focus.length<=40)p.set('focus',focus);
  return destination+'?'+p;
 }
 if(old.searchParams.get('tab')==='diagrams')p.set('tab','diagrams');
 for(const key of ['part','system']){const value=old.searchParams.get(key);if(value&&value.length<=160)p.set(key,value);}
 // Node, source position/revision and private garage/scan IDs belong to the old selection.
 if(old.searchParams.get('tab')==='diagrams'&&next.contextId){p.set('context',next.contextId);p.set('transmission',next.transmission.toLowerCase());}
 return destination+'?'+p;
}
