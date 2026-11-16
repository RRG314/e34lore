import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {RawImage} from '@huggingface/transformers';

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function sourceKey(value){
 if(!value)return null;
 const url=new URL(value);if(url.protocol!=='https:')throw Error('Expected HTTPS evidence source');
 // Retain identity-bearing parameters (for example retailer media.nl?id=...).
 for(const key of [...url.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(key))url.searchParams.delete(key);
 url.searchParams.sort();
 return url.origin.toLowerCase()+decodeURIComponent(url.pathname).replaceAll(' ','_').replace(/\/$/,'')+url.search;
}
export function assertPartitionSeparation(references,evaluation){
 const seen=new Set();
 if(new Set(references.map(r=>r.sha256)).size!==references.length)throw Error('Duplicate reference photograph bytes');
 for(const r of [...references,...evaluation]){
  if(seen.has(r.id))throw Error('Duplicate source ID: '+r.id);seen.add(r.id);
  if(!/^[a-f0-9]{64}$/.test(r.sha256))throw Error('Missing source hash: '+r.id);
 }
 const overlap=[];
 for(const ref of references)for(const row of evaluation){
  if(ref.sha256===row.sha256||sourceKey(ref.source)===sourceKey(row.source||row.sourceUrl)||
   (ref.url||ref.imageUrl)&&(row.url||row.imageUrl)&&sourceKey(ref.url||ref.imageUrl)===sourceKey(row.url||row.imageUrl)||
   ref.objectGroup&&ref.objectGroup===row.objectGroup)throw Error('Reference/evaluation leakage: '+ref.id+' / '+row.id);
  const refGroup=ref.sourceGroup||'provider:'+new URL(ref.source).host;
  const rowGroup=row.sourceGroup||('wikimedia.org'===new URL(row.source||row.sourceUrl).host?null:'provider:'+new URL(row.source||row.sourceUrl).host);
  if(refGroup===rowGroup)overlap.push({reference:ref.id,evaluation:row.id,sourceGroup:refGroup});
 }
 return {sourceOverlap:overlap,unknownObjectIdentity:[...references,...evaluation].filter(r=>!r.objectGroup).map(r=>r.id),independentAccuracyEstablished:false};
}
export function assertReferenceIndex(index,sources,media){
 const references=sources.records.filter(r=>r.partition==='reference');
 if(index.records.length!==references.length||new Set(index.records.map(r=>r.id)).size!==references.length)throw Error('Reference index count/IDs are stale. Rebuild before evaluating.');
 for(const row of index.records){
  const source=references.find(s=>s.id===row.id),shared=media.records.find(m=>m.id===row.mediaId);
  if(!source||row.sourceSha256!==source.sha256||row.family!==source.family||sourceKey(row.source)!==sourceKey(source.source)||!shared||shared.family!==source.family||sourceKey(shared.source)!==sourceKey(source.source)||shared.kind==='photograph'&&shared.sha256!==source.sha256)throw Error('Unlinked or stale reference evidence: '+row.id);
 }
}
export async function readSourceAudit(sources,regression,{inspectPixels=false}={}){
 const references=sources.records.filter(r=>r.partition==='reference');
 const evaluation=[...regression.records.map(r=>({...r,partition:'known-regression'})),...sources.records.filter(r=>r.partition==='reserved-evaluation')];
 const partitions=assertPartitionSeparation(references,evaluation),images=[];
 for(const row of [...references,...evaluation]){
  const bytes=await readFile(row.file);if(sha256(bytes)!==row.sha256)throw Error('Source changed: '+row.id);
  if(!inspectPixels)continue;
  const image=(await RawImage.read(row.file)).rgb();
  const pixels=sha256(Buffer.concat([Buffer.from(`${image.width}x${image.height}:`),Buffer.from(image.data)]));
  const small=await image.resize(9,8,{resample:2});
  const luminance=(x,y)=>{const i=(y*9+x)*3;return small.data[i]*.299+small.data[i+1]*.587+small.data[i+2]*.114};
  const bits=Array.from({length:64},(_,i)=>luminance(i%8,Math.floor(i/8))>luminance(i%8+1,Math.floor(i/8)));
  images.push({id:row.id,partition:row.partition,sha256:row.sha256,pixelSha256:pixels,bits});
 }
 const nearDuplicates=[];
 for(let i=0;i<images.length;i++)for(const b of images.slice(i+1)){
  const a=images[i],crossPartition=(a.partition==='reference')!==(b.partition==='reference');
  if(crossPartition&&a.pixelSha256===b.pixelSha256)throw Error('Pixel-identical evaluation leakage: '+a.id+' / '+b.id);
  const distance=a.bits.filter((v,i)=>v!==b.bits[i]).length;
  if(distance<=6)nearDuplicates.push({a:a.id,b:b.id,hammingDistance:distance,crossPartition,reviewRequired:true});
 }
 return {schema:1,checkedAt:new Date().toISOString(),references:references.length,evaluation:evaluation.length,...partitions,nearDuplicates,
  limits:'dHash is a review aid, not proof of independent objects, photographers or absence of cropped/reused imagery. Same-provider holdouts and unknown physical identities are never independent accuracy.',
  images:images.map(({bits,...row})=>({...row,dHash:bits.map(v=>Number(v)).join('')}))};
}
