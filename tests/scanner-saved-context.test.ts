import{describe,expect,it}from'vitest';
import{scanReferenceFields,savedComponentContext}from'../src/scanner/saved-context';
import{componentHref}from'../src/servicing/context';
import{emptyPhotoDraft,restorePhotoDraft}from'../src/scanner/photo-session';
import accepted from'../data/digital-twin/525i-automatic-reference.json';
describe('saved scanner reference provenance',()=>{
 it('reopens the precise source occurrence and immutable model rather than an automatic current default',()=>{
  const pinned=scanReferenceFields('exact-source-position',accepted.id,accepted.revision);
  expect(pinned).toEqual({catalog_position_id:'exact-source-position',reference_id:accepted.id,model_revision:accepted.revision,model_manifest_sha256:accepted.sha256});
  const url=new URL(componentHref(savedComponentContext('coolant-pump',pinned),{vehicle:'c3500000-0000-4000-9000-000000000001',scan:'c3500000-0000-4000-8000-000000000011'}),'https://e34lore.com');
  expect(url.searchParams.get('position')).toBe('exact-source-position');expect(url.searchParams.get('model_revision')).toBe(String(accepted.revision));expect(url.searchParams.get('reference')).toBe(accepted.id);expect(url.searchParams.get('scan')).toBe('c3500000-0000-4000-8000-000000000011');
 });
 it('keeps legacy scans usable and rejects an unavailable or injected reference without silently choosing another',()=>{
  expect(savedComponentContext('coolant-pump',{})).toEqual({partId:'coolant-pump',positionId:undefined,referenceId:undefined,modelRevision:undefined});
  expect(scanReferenceFields()).toEqual({catalog_position_id:null,reference_id:null,model_revision:null,model_manifest_sha256:null});
  expect(()=>scanReferenceFields('position',accepted.id,99999)).toThrow('unavailable');
  expect(()=>scanReferenceFields('https://example.invalid',accepted.id,23)).toThrow('catalog record');
 });
 it('retains a pinned revision in the local photo draft while allowing drafts from before this field existed',()=>{
  const draft=emptyPhotoDraft();draft.referenceId=accepted.id;draft.modelRevision=23;
  expect(restorePhotoDraft(structuredClone(draft))?.modelRevision).toBe(23);
  const legacy:Record<string,unknown>={...draft};delete legacy.modelRevision;
  expect(restorePhotoDraft(legacy)?.modelRevision).toBeNull();
 });
});
