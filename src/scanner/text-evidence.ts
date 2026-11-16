import {z} from 'zod';
import {partMarkings} from './contracts';
export const photoTextSchema=z.object({revision:z.number().int().min(0),views:z.array(z.object({photoId:z.string().min(1).max(100),text:z.string().max(1200),confidence:z.number().finite().min(0).max(100)})).min(1).max(3),ms:z.number().finite().min(0)});
export type PhotoText=z.infer<typeof photoTextSchema>;
/** Preserve observed text. Never correct O/0, infer BMW prefixes, or promote a
 * seven-digit casting/supplier mark into a complete ordering identity. */
export function textEvidence(text:string){
 const normalized=text.normalize('NFKC').replace(/[\u2010-\u2015]/g,'-');
 const numbers=partMarkings(normalized);
 const raw=normalized.match(/(?<![A-Z0-9])(?:\d{7}|(?:\d{4}|\d[ \t.\-]+\d{3})[ \t.\-]+\d{3})(?![A-Z0-9])/gi)||[];
 const partials=[...new Set(raw.map(value=>value.replace(/\D/g,'')))]
  .filter(value=>value!=='0000000'&&!numbers.some(number=>number.endsWith(value))).slice(0,12);
 return {numbers,partials};
}
/** A complete number must occur in one view. Never concatenate partial marks
 * from different photos into an eleven-digit identity. */
export function photoTextEvidence(views:readonly {text:string}[]){
 const evidence=views.map(view=>textEvidence(view.text));
 const numbers=[...new Set(evidence.flatMap(e=>e.numbers))].slice(0,12);
 const partials=[...new Set(evidence.flatMap(e=>e.partials))]
  .filter(value=>!numbers.some(number=>number.endsWith(value))).slice(0,12);
 return {numbers,partials};
}
