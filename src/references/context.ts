import{z}from'zod';
import{parts}from'../data/catalog';
import{partGuideIds}from'../data/guide-parts';
import seeds from'./starter-sources.json';
import{externalReferenceUrl,referenceScope}from'../../supabase/functions/_shared/external-reference.mjs';
export type ReferenceTarget={kind:'part'|'assembly'|'component'|'guide'|'diagnostic'|'article'|'model'|'repair';id:string};
export const externalSourceSchema=z.object({id:z.string(),title:z.string().min(3).max(180),platform:z.string(),url:z.string(),reason:z.string(),scope:z.record(z.string(),z.string()),published_on:z.string().nullable().optional(),reviewed_at:z.string(),availability:z.enum(['available','unknown','unavailable']),relation:z.string(),related_id:z.string()});
export type ExternalSource=z.infer<typeof externalSourceSchema>;
// Async identity matches PostgreSQL's SHA256 canonical URL; no parallel registry.
export async function sourceIdentity(url:string){const u=externalReferenceUrl(url);if(!u)throw new Error('Unsupported discussion link');return 'external:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(u.canonical))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function starterReferences(target:ReferenceTarget,vehicle:Record<string,unknown>,related:ReferenceTarget[]=[]):Promise<ExternalSource[]>{
 const p=target.kind==='part'?parts.find(p=>p.id===target.id):null;
 const inferred=p?(partGuideIds[p.id]||[]).map(id=>({kind:'guide' as const,id})):[];
 const all=[target,...related,...inferred];
 return Promise.all(seeds.filter(s=>referenceScope(s.scope,vehicle)!=='different'&&s.targets.some(t=>all.some(a=>t.kind===a.kind&&t.id===a.id))).map(async s=>{const match=s.targets.find(t=>t.kind===target.kind&&t.id===target.id)||s.targets.find(t=>all.some(a=>a.kind===t.kind&&a.id===t.id))!;return{id:await sourceIdentity(s.url),title:s.title,platform:s.platform,url:s.url,reason:s.reason,scope:s.scope as Record<string,string>,published_on:null,reviewed_at:s.reviewed_at,availability:s.availability as ExternalSource['availability'],relation:match.kind,related_id:match.id};}));
}
export function mergeReferences(local:ExternalSource[],reviewed:ExternalSource[]){const m=new Map(local.map(s=>[s.id,s]));for(const s of reviewed){if(!externalReferenceUrl(s.url))continue;if(s.availability==='unavailable')m.delete(s.id);else m.set(s.id,s);}return [...m.values()].slice(0,12);}
