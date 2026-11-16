import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import targets from '../data/build-studio/appearance-targets.json';
import {parseReference} from '../src/digital-twin/public/model';
import {componentCatalog,loadCatalogPage,loadCatalogSearch} from '../src/digital-twin/public/catalog';
import {catalogPositionAllowed} from '../src/lib/catalog-integrity';
const manifests=targets.manifestPins.map(pin=>({pin,raw:JSON.parse(readFileSync('public'+pin.manifestUrl,'utf8'))}));
it('applies the same quarantine to all ten reference bindings without changing source manifests or geometry',()=>{
 let affected=0;
 for(const {raw} of manifests){
   const before=JSON.stringify(raw),model=parseReference(raw),source=raw.catalog||componentCatalog,current=model.catalog||componentCatalog;
   const bad=Object.values(source.bindings).flatMap((binding:unknown)=>{const b=binding as {positions:{id:string}[]};return b.positions.filter(p=>!catalogPositionAllowed(p.id));});
   if(bad.length)affected++;
   expect(Object.values(current.bindings).every(b=>b.positions.every(p=>catalogPositionAllowed(p.id)))).toBe(true);
   expect(model.assets).toEqual(raw.assets);expect(model.nodes).toEqual(raw.nodes);expect(JSON.stringify(raw)).toBe(before);
 }
 expect(affected).toBe(8);
});
it('removes those rows from checked page and search reads, retaining genuine ordering positions',async()=>{
 const {raw}=manifests.find(({pin})=>pin.id==='e34-540i-sedan-automatic')!;
 const model=parseReference(raw),index=model.catalog!;
 const bad=Object.values(raw.catalog.bindings).flatMap((binding:unknown)=>(binding as {positions:{id:string;assemblyId:string}[]}).positions).find(p=>!catalogPositionAllowed(p.id))!;
 const originalPage=JSON.parse(readFileSync('public'+index.assemblies[bad.assemblyId].url,'utf8')) as {items:{id:string}[]};
 expect(originalPage.items.some(i=>i.id===bad.id)).toBe(true);
 vi.stubGlobal('fetch',async(url:string)=>new Response(readFileSync('public'+url)));
 try{
   const page=await loadCatalogPage(bad.assemblyId,undefined,index),search=await loadCatalogSearch(undefined,index);
   expect(page.items.map(i=>i.id)).toEqual(originalPage.items.filter(i=>catalogPositionAllowed(i.id)).map(i=>i.id));
   expect(page.items.length).toBeGreaterThan(0);expect(page.items.some(i=>i.id===bad.id)).toBe(false);
   expect(search.every(i=>catalogPositionAllowed(i.positionId))).toBe(true);
   expect(search.some(i=>i.positionId===page.items[0].id)).toBe(true);
 }finally{vi.unstubAllGlobals();}
});
