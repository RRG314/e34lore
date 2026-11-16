import {describe,it,expect}from'vitest';
import {compareBareParts,barePartReferencesSchema}from'../src/scanner/bare-part-comparison';
import {storedComparisonSchema,emptyPhotoDraft,restorePhotoDraft}from'../src/scanner/photo-session';
import {componentFamilies}from'../src/scanner/families';
import {models}from'../src/scanner/contracts';
import actual from '../data/scanner/local-v2/reference-index.json';
const axis=(i:number)=>Array.from({length:512},(_,j)=>i===j?1:0);
function fixture(){return{schema:1,version:'e34-local-bare-parts-v2',preprocessing:'contain-edge-median-384-v1',model:{...models.embedding,dtype:'q8'},text:{schema:1,model:{...models.embedding,dtype:'q8'},taxonomySha256:'a'.repeat(64),method:'Unit fixture',records:componentFamilies.map((f,i)=>({id:f.id,embedding:axis(i)}))},records:[{id:'mount',family:'center-support-bearing',sourceSha256:'b'.repeat(64),source:'https://example.org/mount',rights:'Test fixture',embedding:axis(100)},{id:'disc',family:'flex-disc',sourceSha256:'c'.repeat(64),source:'https://example.org/disc',rights:'Test fixture',embedding:axis(101)}]}}
const familyAxis=(id:string)=>axis(componentFamilies.findIndex(f=>f.id===id));
describe('local photo/text corroboration',()=>{
 it('accepts no automatic OEM identity, including a strongly corroborated family',()=>{
  const d=fixture(),i=componentFamilies.findIndex(f=>f.id==='center-support-bearing');const v=axis(100).map((x,j)=>x*.95+(j===i?.24:0));
  const result=compareBareParts([v],d);expect(result.status).toBe('review');expect(result.candidates[0].id).toBe('center-support-bearing');expect(result.accepted).toBe(false);
  expect(storedComparisonSchema.parse(result).recognizer).toBe(result.recognizer);
  const draft=emptyPhotoDraft();draft.comparison={value:result,ms:1,revision:0};expect(restorePhotoDraft(draft)?.comparison?.value.photoEvidence).toHaveLength(1);
  expect(storedComparisonSchema.safeParse({...result,accepted:true}).success).toBe(false);
 });
 it('abstains on strong conflicting photo and text evidence or different parts across views',()=>{
  const d=fixture(),i=componentFamilies.findIndex(f=>f.id==='oil-filter'),v=axis(100).map((x,j)=>x*.9+(j===i?.3:0));
  expect(compareBareParts([v],d).status).toBe('inconclusive');
  expect(compareBareParts([familyAxis('alternator'),familyAxis('brake-caliper')],d).status).toBe('inconclusive');
 });
 it('does not promote an image-only match with no supporting text or a non-part',()=>{
  const d=fixture();expect(compareBareParts([axis(100)],d).status).toBe('inconclusive');
  const negative=componentFamilies.findIndex(f=>f.negative);expect(compareBareParts([axis(negative)],d).status).toBe('inconclusive');
  const positive=componentFamilies.findIndex(f=>f.id==='center-support-bearing');const box=axis(100).map((v,i)=>v*.9+(i===negative?.3:0)+(i===positive?.24:0));expect(compareBareParts([box],d).status).toBe('inconclusive');
  expect(compareBareParts([axis(200)],d).status).toBe('inconclusive');
 });
 it('rejects evaluation contamination by duplicate photos, malformed vectors and unexpected models',()=>{
  const d=fixture();expect(barePartReferencesSchema.safeParse(actual).success).toBe(true);
  expect(barePartReferencesSchema.safeParse({...d,records:[d.records[0],{...d.records[0],id:'duplicate'}]}).success).toBe(false);
  expect(barePartReferencesSchema.safeParse({...d,model:{...d.model,revision:'latest'}}).success).toBe(false);
  expect(()=>compareBareParts([[NaN]],d)).toThrow();
 });
});
