import { z } from 'zod';
import { cosine, models } from './contracts';
import { componentFamilies } from './families';
export const familyVectorsSchema = z.object({
  schema: z.literal(1),
  model: z.object({ id:z.literal(models.embedding.id), revision:z.literal(models.embedding.revision), dtype:z.literal('q8'), license:z.literal('MIT') }),
  taxonomySha256:z.string().regex(/^[a-f0-9]{64}$/), method:z.string(),
  records:z.array(z.object({id:z.string(),embedding:z.array(z.number().finite()).length(512)})).length(componentFamilies.length),
}).superRefine((data, ctx)=>{
  const ids=new Set<string>();
  for(const r of data.records){
    if(ids.has(r.id)||!componentFamilies.some(f=>f.id===r.id)||Math.abs(Math.hypot(...r.embedding)-1)>.001)
      ctx.addIssue({code:'custom',message:'Invalid or duplicate family vector'});
    ids.add(r.id);
  }
});
export type FamilyScore = { id:string; score:number; viewScores:number[]; votes:number };
export type FamilyComparison = { candidates:FamilyScore[]; status:'review'|'inconclusive'; reason:string; views:number; accepted:false; strongestAlternative:{id:string;score:number}|null;recognizer?:'whole-part-hybrid-v2'|'licensed-family-v1'|'center-support-shape-v1';photoEvidence?:{familyId:string;similarity:number;margin:number;referenceIds:string[]}[];nextView?:string };
/** Engineering abstention rules, not calibrated confidence or an exact-part classifier. */
export function compareFamilies(images:number[][], source:unknown):FamilyComparison {
  const data=familyVectorsSchema.parse(source);
  if(images.length<1||images.length>3||images.some(v=>v.length!==512||v.some(x=>!Number.isFinite(x))||Math.hypot(...v)<.001))throw Error('Use one to three valid component views.');
  const ranked=images.map(v=>data.records.map(r=>({id:r.id,score:cosine(v,r.embedding)})).sort((a,b)=>b.score-a.score));
  const scores=data.records.map(r=>{
    const viewScores=ranked.map(view=>view.find(v=>v.id===r.id)!.score);
    return {id:r.id,score:viewScores.reduce((s,v)=>s+v,0)/images.length,viewScores,votes:ranked.filter(view=>view[0].id===r.id).length};
  }).sort((a,b)=>b.score-a.score);
  const top=scores[0], second=scores[1];
  const negative=componentFamilies.find(f=>f.id===top.id)!.negative;
  // Every view must agree on its leading family; averaging must not hide contradictory photos.
  const consistent=ranked.every(view=>view[0].id===top.id);
  const separated=ranked.every(view=>view[0].score-view[1].score>=.008);
  const review=!negative&&consistent&&separated&&top.viewScores.every(v=>v>=.18);
  return { candidates:scores.filter(s=>!componentFamilies.find(f=>f.id===s.id)!.negative).slice(0,3),views:images.length,accepted:false,status:review?'review':'inconclusive',
    reason:negative?'The leading comparison is packaging, background or a non-part object. Photograph one bare component.':!consistent?'The views disagree. Check that they show the same part, then retake a clear front and side view.':!separated||top.score<.18?'The comparisons are too close or too weak to distinguish. Try a different angle on a plain background.':'A component family is worth checking. Compare its physical features below; no OEM identity or vehicle fitment has been established.',
    strongestAlternative:second?{id:second.id,score:second.score}:null };
}
/** Reusing an image is not independent evidence. Keep the active view plus at most two distinct saved views. */
export function comparisonImages<T extends {blob:Blob}>(current:T, saved:readonly T[]):T[] {
  return [current,...saved].filter((item,index,all)=>all.findIndex(other=>other.blob===item.blob)===index).slice(0,3);
}
/** Byte-identical reuploads are one view, even when the browser creates a new Blob. No secure-context API is required. */
export async function distinctPhotoBlobs(blobs:readonly Blob[]):Promise<Blob[]> {
 if(blobs.length>3)throw Error('Use at most three photos.');
 const unique:{blob:Blob;bytes:Uint8Array}[]=[];
 for(const blob of blobs){
  const bytes=new Uint8Array(await blob.arrayBuffer());
  if(!unique.some(item=>item.bytes.length===bytes.length&&item.bytes.every((v,i)=>v===bytes[i])))unique.push({blob,bytes});
 }
 return unique.map(item=>item.blob);
}
