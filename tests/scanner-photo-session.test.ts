import {describe,it,expect} from 'vitest';
import {addSessionPhoto,editSessionPhoto,emptyPhotoDraft,photoRetentionMs,recordPhotoComparison,recordPhotoText,removeSessionPhoto,restorePhotoDraft,resumablePhotoDraft,selectSessionPart,partConfirmationCurrent,type ScanPhoto} from '../src/scanner/photo-session';
import {compareFamilies} from '../src/scanner/family-comparison';
import vectors from '../src/scanner/family-vectors.json';
const photo=(id:string):ScanPhoto=>({id,blob:new Blob([id],{type:'image/jpeg'}),width:640,height:480,quality:{brightness:120,detail:12,warnings:[]}});
const comparison=()=>compareFamilies([vectors.records[0].embedding],vectors);
describe('phone scan photo session',()=>{
 it('automatically keeps the previous photo when a second and third arrive',()=>{
  let draft=emptyPhotoDraft();draft=addSessionPhoto(draft,photo('front'));draft=addSessionPhoto(draft,photo('rear'));draft=addSessionPhoto(draft,photo('side'));
  expect(draft.photos.map(p=>p.id)).toEqual(['front','rear','side']);expect(draft.activeId).toBe('side');
  expect(()=>addSessionPhoto(draft,photo('fourth'))).toThrow('Remove a view');expect(draft.photos).toHaveLength(3);
 });
 it('roundtrips real Blob data, selected parts, notes and comparison through a structured clone',async()=>{
  let draft=addSessionPhoto(emptyPhotoDraft(),photo('front'));
  draft={...draft,notes:'Observed rubber separation',text:'',selectedPart:{id:'bmw-26121226657',number_normalized:'26121226657',name:'Centre Mount'},anchorPart:{id:'bmw-26121226657',number_normalized:'26121226657',name:'Centre Mount'}};
  draft=recordPhotoComparison(draft,comparison(),250,draft.revision);
  const restored=restorePhotoDraft(structuredClone(draft))!;
  expect(await restored.photos[0].blob.text()).toBe('front');expect(restored.notes).toBe(draft.notes);expect(restored.selectedPart).toEqual(draft.selectedPart);expect(restored.comparison?.value.accepted).toBe(false);
 });
 it('clears a previous comparison and retains notes when another photo is added, marking the result as older evidence',()=>{
  let draft=addSessionPhoto(emptyPhotoDraft(),photo('front'));draft={...draft,notes:'Keep these observations'};
  draft=recordPhotoComparison(draft,comparison(),250,draft.revision);draft=addSessionPhoto(draft,photo('back'));
  expect(draft.notes).toBe('Keep these observations');expect(draft.comparison).toBeNull();
 });
 it('retains marking provenance without relabeling older catalog-only drafts as read markings',()=>{
  const draft=addSessionPhoto(emptyPhotoDraft(),photo('front'));
  expect(restorePhotoDraft({...draft,identityMethod:'marking'})!.identityMethod).toBe('marking');
  const legacy={...draft} as Record<string,unknown>;delete legacy.identityMethod;
  const restored=restorePhotoDraft(legacy)!;
  expect(restored.identityMethod).toBe('catalog-comparison');expect(restored.photos).toHaveLength(1);
 });
 it('edits one selected image without losing the other views or changing their identities',()=>{
  let draft=addSessionPhoto(addSessionPhoto(emptyPhotoDraft(),photo('front')),photo('back'));
  const edited=photo('edited');draft=editSessionPhoto(draft,edited);
  expect(draft.photos.map(p=>p.id)).toEqual(['front','back']);expect(draft.photos[0].blob.size).toBe(5);expect(draft.photos[1].blob.size).toBe(6);
 });
 it('removes only the chosen photo and selects a remaining view',()=>{
  let draft=addSessionPhoto(addSessionPhoto(emptyPhotoDraft(),photo('front')),photo('back'));
  draft=removeSessionPhoto(draft,'back');expect(draft.activeId).toBe('front');expect(draft.photos).toHaveLength(1);
  draft=removeSessionPhoto(draft,'front');expect(draft.activeId).toBe('');expect(draft.photos).toEqual([]);
 });
 it('rejects a late inference result for a different photo set',()=>{
  const first=addSessionPhoto(emptyPhotoDraft(),photo('front')),next=addSessionPhoto(first,photo('back'));
  expect(()=>recordPhotoComparison(next,comparison(),100,first.revision)).toThrow('Photos changed');
 });
 it('keeps the chosen catalog provenance through OCR, including a conflicting complete number',()=>{
  const part={id:'bmw-26121226657',number_normalized:'26121226657',name:'Centre Mount'};
  let draft=selectSessionPart(addSessionPhoto(emptyPhotoDraft(),photo('front')),part,'catalog-comparison');
  draft=recordPhotoText(draft,{views:[{photoId:'front',text:'26121225002',confidence:90}],ms:20},draft.revision);
  const restored=restorePhotoDraft(structuredClone(draft))!;
  expect(restored.selectedPart).toEqual(part);expect(restored.identityMethod).toBe('catalog-comparison');expect(restored.text).toBe('26121225002');
  expect(selectSessionPart(restored,{...part,id:'bmw-26121225002',number_normalized:'26121225002'},'marking').identityMethod).toBe('marking');
 });
 it('rejects text from removed, edited or mismatched photo sets and retains manual text on a reread',()=>{
  const draft=addSessionPhoto(emptyPhotoDraft(),photo('front'));
  const result={views:[{photoId:'front',text:'26121226657',confidence:90}],ms:20};
  expect(()=>recordPhotoText(addSessionPhoto(draft,photo('back')),result,draft.revision)).toThrow('Photos changed');
  expect(()=>recordPhotoText(draft,{...result,views:[{...result.views[0],photoId:'other'}]},draft.revision)).toThrow('Photos changed');
  const read=recordPhotoText(draft,result,draft.revision);
  const blank={views:[{photoId:'front',text:'',confidence:0}],ms:20};
  expect(recordPhotoText(read,blank,read.revision).text).toBe('');
  expect(recordPhotoText({...read,text:'Manually checked 26121225002'},blank,read.revision).text).toBe('Manually checked 26121225002');
  expect(recordPhotoText(selectSessionPart(read,{id:'bmw-26121226657',name:'Mount',number_normalized:'26121226657'},'marking'),blank,read.revision).identityMethod).toBe('marking');
 });
 it('does not restore expired or malformed device records or elevate a visual result to a verified identity',()=>{
  const draft=addSessionPhoto(emptyPhotoDraft(),photo('front'));
  expect(restorePhotoDraft(draft,draft.updatedAt+photoRetentionMs+1)).toBeNull();
  expect(()=>restorePhotoDraft({...draft,activeId:'missing'})).toThrow();
  expect(()=>restorePhotoDraft({...draft,photos:[{...photo('bad'),blob:new Blob(['x'],{type:'text/html'})}]})).toThrow();
  expect(()=>recordPhotoComparison(draft,{...comparison(),accepted:true} as never,20,draft.revision)).toThrow();
 });
});

describe('photo identity confirmation',()=>{
 const part={id:'bmw-26121226657',name:'Centre mount',number_normalized:'26121226657'};
 function confirmed(){const d=selectSessionPart(addSessionPhoto(emptyPhotoDraft(),photo('front')),part,'catalog-comparison');return {...d,confirmedSelection:{draftId:d.id,revision:d.revision,partId:part.id}};}
 it('binds confirmation to this scan, photo revision and chosen part',()=>{const d=confirmed();expect(partConfirmationCurrent(d)).toBe(true);expect(partConfirmationCurrent({...d,id:'other'})).toBe(false);expect(partConfirmationCurrent({...d,revision:d.revision+1})).toBe(false);expect(partConfirmationCurrent({...d,selectedPart:{...part,id:'another'}})).toBe(false);});
 it('requires fresh selection and confirmation after adding, replacing or removing a photo',()=>{const d=confirmed();for(const next of [addSessionPhoto(d,photo('back')),editSessionPhoto(d,photo('replacement')),removeSessionPhoto(d,'front')]){expect(partConfirmationCurrent(next)).toBe(false);expect(next.selectedPart).toBeNull();expect(next.savedScan).toBeNull();}});
 it('retains pending photo saves across reload, separately from an already saved result',()=>{const d=confirmed(),savedScan={id:'ed340000-0000-4000-8000-000000000901',vehicleId:'',revision:d.revision,notes:'',selection:part.id,photosShared:false};for(const photoSave of ['pending','complete','skipped']){const restored=restorePhotoDraft(structuredClone({...d,savedScan:{...savedScan,photoSave}}))!;expect(restored.savedScan?.photoSave).toBe(photoSave);expect(!!resumablePhotoDraft(restored)).toBe(photoSave==='pending');}});
 it('does not grant sharing permission to old saved drafts',()=>{const d=confirmed();const restored=restorePhotoDraft({...d,savedScan:{id:'ed340000-0000-4000-8000-000000000901',vehicleId:'',revision:d.revision,notes:'',selection:part.id}})!;expect(restored.savedScan?.photosShared).toBe(false);expect(restored.savedScan?.photoSave).toBe('pending');});
});
