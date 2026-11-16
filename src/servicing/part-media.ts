import {z}from'zod';
import manifest from '../../data/parts-media/manifest.json';
const https=z.url().refine(value=>new URL(value).protocol==='https:'&&!new URL(value).username&&!new URL(value).password);
const base={id:z.string().min(1).max(160),family:z.string().min(1).max(100),scope:z.enum(['family','number']),numbers:z.array(z.string().regex(/^\d{11}$/).refine(n=>n!=='00000000000')).max(20),source:https,sourceGroup:z.string().min(1).max(200).optional(),objectGroup:z.string().min(1).max(200).nullable().optional(),view:z.enum(['front','back','side','installed','detail','unspecified']),condition:z.enum(['new','used','broken','unknown']),identityEvidence:z.string().min(1).max(600),reviewedAt:z.iso.date()};
const providerImage=https.refine(value=>{const u=new URL(value);if(u.port)return false;return u.hostname==='www.bimmerworld.com'&&u.pathname==='/core/media/media.nl'&&/^\d+$/.test(u.searchParams.get('id')||'')||u.hostname==='assets.ecstuning.com'&&/^\/product_library\/\d+_x\d+\.jpg$/.test(u.pathname)||u.hostname==='www.bmwpartsdeal.com'&&/^\/resources\/encry\/(?:actual-picture|part-picture)\/bpd\/large\/[a-f0-9]+\/[a-f0-9]+\.(?:jpg|png)$/.test(u.pathname)});
export const partMediaSchema=z.object({schema:z.literal(1),records:z.array(z.discriminatedUnion('kind',[
 z.object({...base,kind:z.literal('photograph'),recognition:z.literal('comparison-only').optional(),image:z.string().regex(/^\/scanner\/references\/[a-zA-Z0-9_-]+\.jpg$/),sha256:z.string().regex(/^[a-f0-9]{64}$/),rights:z.object({status:z.literal('licensed'),license:z.string().min(1),licenseUrl:https,attribution:z.string().min(1),changes:z.string().min(1)})}),
 z.object({...base,kind:z.literal('source-page'),label:z.string().min(1).max(200),rights:z.object({status:z.literal('link-only')})})
 ,z.object({...base,kind:z.literal('provider-image'),scope:z.literal('number'),image:providerImage,label:z.string().min(1).max(200),rights:z.object({status:z.literal('externally-hosted'),attribution:z.string().min(1)})})
])).max(10000)}).superRefine((value,ctx)=>{
 if(new Set(value.records.map(r=>r.id)).size!==value.records.length)ctx.addIssue({code:'custom',message:'Duplicate media ID'});
 for(const r of value.records)if(r.scope==='number'&&!r.numbers.length||r.scope==='family'&&r.numbers.length)ctx.addIssue({code:'custom',message:'Media identity scope is inconsistent'});
});
export const partMedia=partMediaSchema.parse(manifest);
/** Exact identities only: a category photo must never masquerade as a BMW SKU. */
export function mediaForNumber(number:string){return /^\d{11}$/.test(number)?partMedia.records.filter(r=>r.scope==='number'&&r.numbers.includes(number)):[]}
export function mediaForFamily(family:string){return partMedia.records.filter(r=>r.scope==='family'&&r.family===family)}
export function numberPhotograph(number:string){return mediaForNumber(number).find(r=>r.kind==='photograph'||r.kind==='provider-image')}
export function familyComparisonParts(family:string){
 return [...new Set(partMedia.records.filter(r=>r.kind==='provider-image'&&r.family===family).flatMap(r=>r.numbers))].map(number=>({number,photo:numberPhotograph(number)!}));
}
export function familyThumbnail(family:string){
 const photos=mediaForFamily(family).filter(row=>row.kind==='photograph');
 return photos.find(row=>row.recognition==='comparison-only')||familyComparisonParts(family)[0]?.photo||photos[0];
}
