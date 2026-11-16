import {z} from 'zod';
import {componentFamilies,photoNegativeFamilies} from './families';
import type {FamilyComparison} from './family-comparison';
import {photoTextSchema,photoTextEvidence,type PhotoText} from './text-evidence';
export const maxScanPhotos=3;
export const photoRetentionMs=24*60*60*1000;
const familyId=z.string().refine(id=>componentFamilies.some(f=>f.id===id));
const photoFamilyId=z.string().refine(id=>componentFamilies.some(f=>f.id===id)||photoNegativeFamilies.some(f=>f.id===id));
const score=z.object({id:familyId,score:z.number().finite().min(-1).max(1),viewScores:z.array(z.number().finite().min(-1).max(1)).min(1).max(3),votes:z.number().int().min(0).max(3)});
export const storedComparisonSchema=z.object({candidates:z.array(score).max(3),status:z.enum(['review','inconclusive']),reason:z.string().max(1000),views:z.number().int().min(1).max(3),accepted:z.literal(false),strongestAlternative:z.object({id:familyId,score:z.number().finite().min(-1).max(1)}).nullable(),recognizer:z.enum(['whole-part-hybrid-v2','licensed-family-v1','center-support-shape-v1']).optional(),photoEvidence:z.array(z.object({familyId:photoFamilyId,similarity:z.number().finite().min(-1).max(1),margin:z.number().finite().min(-2).max(2),referenceIds:z.array(z.string().max(160)).min(1).max(2)})).min(1).max(3).optional(),nextView:z.string().max(600).optional()});
export const photoViews=['unspecified','front','back','side','detail'] as const;
export const photoSchema=z.object({id:z.string().min(1).max(100),blob:z.instanceof(Blob).refine(b=>b.size>0&&b.size<=4*1024*1024&&['image/jpeg','image/png','image/webp'].includes(b.type)),width:z.number().int().min(1).max(1600),height:z.number().int().min(1).max(1600),view:z.enum(photoViews).optional(),quality:z.object({brightness:z.number().finite(),detail:z.number().finite(),warnings:z.array(z.string().max(200)).max(6)})});
const savedPart=z.object({id:z.string().min(1).max(200),name:z.string().max(300),number_normalized:z.string().regex(/^\d{11}$/),positionId:z.string().max(200).optional(),assemblyId:z.string().max(200).optional(),contextId:z.string().max(200).optional()});
export const photoDraftSchema=z.object({version:z.literal(1),id:z.string().min(1).max(100),revision:z.number().int().min(0),updatedAt:z.number().finite(),photos:z.array(photoSchema).max(maxScanPhotos),activeId:z.string().max(100),notes:z.string().max(3000),text:z.string().max(300),photoText:photoTextSchema.nullable().default(null),identityMethod:z.enum(['marking','catalog-comparison']).default('catalog-comparison'),referenceId:z.string().max(100).default(''),modelRevision:z.number().int().positive().max(1000000).nullable().default(null),sourcePositionId:z.string().max(240).default(''),reviewedFamily:z.union([familyId,z.literal('')]),selectedPart:savedPart.nullable().default(null),anchorPart:savedPart.nullable().default(null),confirmedSelection:z.object({draftId:z.string().max(100),revision:z.number().int().min(0),partId:z.string().max(100)}).nullable().default(null),savedScan:z.object({id:z.string().uuid(),vehicleId:z.union([z.string().uuid(),z.literal('')]),revision:z.number().int(),notes:z.string().max(3000),selection:z.string().max(200),photosShared:z.boolean().default(false),photoSave:z.enum(['pending','complete','skipped']).default('pending')}).nullable().default(null),comparison:z.object({revision:z.number().int().min(0),value:storedComparisonSchema,ms:z.number().finite().min(0)}).nullable()}).refine(d=>new Set(d.photos.map(p=>p.id)).size===d.photos.length&&(!d.photos.length?d.activeId==='':d.photos.some(p=>p.id===d.activeId)),'Invalid selected photo');
export type ScanPhoto=z.infer<typeof photoSchema>;
export type PhotoDraft=z.infer<typeof photoDraftSchema>;
let sequence=0;
export function newPhotoId(){return Date.now().toString(36)+'-'+(++sequence).toString(36)}
export function emptyPhotoDraft():PhotoDraft{return {version:1,id:newPhotoId(),revision:0,updatedAt:Date.now(),photos:[],activeId:'',notes:'',text:'',photoText:null,identityMethod:'catalog-comparison',referenceId:'',modelRevision:null,sourcePositionId:'',reviewedFamily:'',selectedPart:null,anchorPart:null,confirmedSelection:null,savedScan:null,comparison:null}}
export function restorePhotoDraft(raw:unknown,now=Date.now()):PhotoDraft|null{
 if(raw==null)return null;
 const draft=photoDraftSchema.parse(raw);
 return now-draft.updatedAt>photoRetentionMs||draft.updatedAt>now+60000?null:draft;
}
/** Photos are displayed only after the user resumes a recoverable draft. */
export function resumablePhotoDraft(draft:PhotoDraft|null):PhotoDraft|null{
 if(!draft||(!draft.photos.length&&!draft.notes&&!draft.text&&!draft.selectedPart))return null;
 if(draft.savedScan&&draft.savedScan.revision===draft.revision&&draft.savedScan.notes===draft.notes
   &&draft.savedScan.selection===(draft.selectedPart?.id||draft.reviewedFamily)&&draft.savedScan.photoSave!=='pending')return null;
 return draft;
}
export function currentPhotoComparison(draft:PhotoDraft|null|undefined){
 const result=draft?.comparison;
 return result && result.revision===draft?.revision && ['licensed-family-v1','center-support-shape-v1'].includes(result.value.recognizer||'')?result.value:null;
}
function changedPhotos(draft:PhotoDraft,photos:ScanPhoto[],activeId:string):PhotoDraft{
 const previousNumbers=photoTextEvidence(draft.photoText?.views||[]).numbers.join(' ');
 return {...draft,photos,activeId,revision:draft.revision+1,
  photoText:null,text:draft.text===previousNumbers||draft.text===draft.selectedPart?.number_normalized||draft.text===draft.anchorPart?.number_normalized?'':draft.text,
  comparison:null,reviewedFamily:'',confirmedSelection:null,savedScan:null,selectedPart:null,anchorPart:null,
  identityMethod:'catalog-comparison',sourcePositionId:'',updatedAt:Date.now()};
}
export function addSessionPhoto(draft:PhotoDraft,photo:ScanPhoto):PhotoDraft{
 photoSchema.parse(photo);
 if(draft.photos.length>=maxScanPhotos)throw Error('Remove a view before adding another angle of this part.');
 if(draft.photos.some(p=>p.id===photo.id))throw Error('Photo already kept.');
 return changedPhotos(draft,[...draft.photos,photo],photo.id);
}
export function editSessionPhoto(draft:PhotoDraft,photo:Omit<ScanPhoto,'id'>):PhotoDraft{
 photoSchema.parse({...photo,id:draft.activeId});
 if(!draft.photos.some(p=>p.id===draft.activeId))throw Error('Choose a photo to edit.');
 return changedPhotos(draft,draft.photos.map(p=>p.id===draft.activeId?{...photo,id:p.id}:p),draft.activeId);
}
export function removeSessionPhoto(draft:PhotoDraft,id:string):PhotoDraft{
 const photos=draft.photos.filter(p=>p.id!==id);
 return changedPhotos(draft,photos,draft.activeId===id?photos.at(-1)?.id||'':draft.activeId);
}
export function recordPhotoComparison(draft:PhotoDraft,value:FamilyComparison,ms:number,revision:number):PhotoDraft{
 if(revision!==draft.revision)throw Error('Photos changed during the scan. Scan the current set again.');
 return {...draft,comparison:{revision,value:storedComparisonSchema.parse(value),ms},reviewedFamily:'',updatedAt:Date.now()};
}
/** OCR updates its own evidence, never the provenance of an owner's selection. */
export function recordPhotoText(draft:PhotoDraft,result:Omit<PhotoText,'revision'>,revision:number):PhotoDraft{
 if(revision!==draft.revision||result.views.length!==draft.photos.length||result.views.some((v,i)=>v.photoId!==draft.photos[i].id))throw Error('Photos changed during text reading. Read the current set again.');
 const photoText=photoTextSchema.parse({...result,revision});
 const oldNumbers=photoTextEvidence(draft.photoText?.views||[]).numbers.join(' ');
 const numbers=photoTextEvidence(photoText.views).numbers.join(' ');
 return {...draft,photoText,text:!draft.text||draft.text===oldNumbers?numbers:draft.text,updatedAt:Date.now()};
}
export function selectSessionPart(draft:PhotoDraft,part:PhotoDraft['selectedPart'],method:PhotoDraft['identityMethod']):PhotoDraft{
 return {...draft,selectedPart:part,anchorPart:part,sourcePositionId:part?.positionId||'',identityMethod:method,confirmedSelection:null,savedScan:null,updatedAt:Date.now()};
}

export function partConfirmationCurrent(draft:PhotoDraft|null|undefined){const c=draft?.confirmedSelection;return !!(draft&&c&&draft.selectedPart&&c.draftId===draft.id&&c.revision===draft.revision&&c.partId===draft.selectedPart.id)}
