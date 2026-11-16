import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import variants from '../data/digital-twin/vehicle-references.json';
import {parseReference} from '../src/digital-twin/public/model';
import {supplementalPartLocation} from '../src/servicing/part-location';
describe('source-backed center support assembly location',()=>{
 for(const id of ['e34-540i-sedan-automatic','e34-540i-sedan-manual'])it('locates the existing mounted assembly in '+id+' without claiming exact part geometry',()=>{
  const reference=variants.find(v=>v.id===id)!;const model=parseReference(JSON.parse(readFileSync('public'+reference.manifestUrl,'utf8')));
  for(const number of ['26121226657','26121225002']){
   const result=supplementalPartLocation(model,'bmw-'+number)!;
   expect(result.node.id).toMatch(/:center-bearing$/);expect(result.node.assetId).toBeTruthy();expect(result.note).toContain('Exact geometry');expect(result.source).toContain('260-7');
  }
  expect(supplementalPartLocation(model,'bmw-11511315559')).toBeNull();
  expect(supplementalPartLocation({...model,nodes:[]},'bmw-26121226657')).toBeNull();
  expect(supplementalPartLocation({...model,vehicleReference:{...model.vehicleReference!,model:'525i'}},'bmw-26121226657')).toBeNull();
 });
});
