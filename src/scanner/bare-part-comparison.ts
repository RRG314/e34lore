import {z}from'zod';
import {componentFamilies}from'./families';
import {cosine,models}from'./contracts';
import {compareFamilies,familyVectorsSchema,type FamilyComparison,type FamilyScore}from'./family-comparison';
const positiveId=z.string().refine(id=>componentFamilies.some(f=>f.id===id&&!f.negative));
const vector=z.array(z.number().finite()).length(512).refine(v=>Math.abs(Math.hypot(...v)-1)<.001);
export const barePartReferencesSchema=z.object({schema:z.literal(1),version:z.literal('e34-local-bare-parts-v2'),preprocessing:z.literal('contain-edge-median-384-v1'),model:z.object({id:z.literal(models.embedding.id),revision:z.literal(models.embedding.revision),dtype:z.literal('q8'),license:z.literal('MIT')}),text:familyVectorsSchema,records:z.array(z.object({id:z.string().min(1).max(160),family:positiveId,sourceSha256:z.string().regex(/^[a-f0-9]{64}$/),source:z.url().refine(s=>s.startsWith('https:')),rights:z.string().max(400),embedding:vector})).min(1).max(200)}).superRefine((d,ctx)=>{
 if(new Set(d.records.map(r=>r.id)).size!==d.records.length||new Set(d.records.map(r=>r.sourceSha256)).size!==d.records.length)ctx.addIssue({code:'custom',message:'Duplicate reference photograph'});
});
export type PhotoComparisonEvidence={familyId:string;similarity:number;margin:number;referenceIds:string[]};
export type BarePartComparison=FamilyComparison&{recognizer:'whole-part-hybrid-v2';photoEvidence:PhotoComparisonEvidence[];nextView:string};
/** Category leads, never exact identity. Independent text and photograph
 * comparisons must corroborate a photo-assisted lead in every supplied view.
 * Cutoffs are engineering abstention rules, not calibrated probabilities. */
export function compareBareParts(images:number[][],source:unknown):BarePartComparison{
 const d=barePartReferencesSchema.parse(source),baseline=compareFamilies(images,d.text);
 const texts=images.map(image=>d.text.records.map(r=>({id:r.id,score:cosine(image,r.embedding)})).sort((a,b)=>b.score-a.score));
 const photoEvidence=images.map(image=>{
  const ranked=d.records.map(r=>({reference:r,score:cosine(image,r.embedding)})).sort((a,b)=>b.score-a.score),top=ranked[0];
  const rival=ranked.find(r=>r.reference.family!==top.reference.family);
  return{familyId:top.reference.family,similarity:top.score,margin:top.score-(rival?.score??top.score),referenceIds:ranked.filter(r=>r.reference.family===top.reference.family).slice(0,2).map(r=>r.reference.id)};
 });
 const photoFamily=photoEvidence[0].familyId;
 const photoLead=photoEvidence.every(p=>p.familyId===photoFamily&&p.similarity>=.80&&p.margin>=.035)&&texts.every(r=>!componentFamilies.find(f=>f.id===r[0].id)?.negative&&r.slice(0,3).some(t=>t.id===photoFamily&&t.score>=.20));
 const conflict=photoEvidence.some(p=>p.similarity>=.80&&p.margin>=.035&&p.familyId!==baseline.candidates[0]?.id);
 const supportedText=baseline.status==='review'&&baseline.candidates[0].viewScores.every(s=>s>=.26)&&!conflict;
 const candidates=[...baseline.candidates];
 const familyScore=(id:string):FamilyScore=>{const viewScores=texts.map(r=>r.find(t=>t.id===id)!.score);return{id,viewScores,score:viewScores.reduce((s,v)=>s+v,0)/images.length,votes:texts.filter(r=>r[0].id===id).length}};
 if(photoLead){const chosen=familyScore(photoFamily);candidates.splice(0,candidates.length,chosen,...baseline.candidates.filter(c=>c.id!==photoFamily).slice(0,2));}
 else if(conflict&&!candidates.some(c=>c.id===photoFamily))candidates[2]=familyScore(photoFamily);
 const status=photoLead||supportedText?'review':'inconclusive';
 const reason=photoLead?'Reference comparisons suggest this component family. Check its mounting features before choosing a catalog record.':supportedText?baseline.reason:conflict?'The comparisons disagree. Keep these photos and add a view of the mounting points, connector or broken edge.':baseline.status==='review'?'The comparison is too weak to establish a useful component lead. Keep the full part in view and add another angle.':baseline.reason;
 const nextView=(photoLead?photoFamily:candidates[0]?.id)==='center-support-bearing'?'Add a back or side view showing the rubber cushion, both mounting ears and the bearing opening. If it is broken, include the detached pieces in one photo.':'Show the other side and its mounting points or connector. For broken parts, include all remaining pieces and a separate view of where the part was installed.';
 return{...baseline,candidates,status,reason,recognizer:'whole-part-hybrid-v2',photoEvidence,nextView};
}
