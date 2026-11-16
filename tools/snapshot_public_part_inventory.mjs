// Read-only public evidence inventory. No credentials beyond the existing browser
// publishable configuration; no member tables, writes, image downloads or imports.
import{readFile,writeFile,mkdir}from'node:fs/promises';
import{createHash}from'node:crypto';
import{createClient}from'@supabase/supabase-js';
const config = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};
if (!config.url || !config.publishableKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
}
const db=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
const parts=[];for(let from=0;;from+=1000){
 const result=await db.from('parts').select('id,number_normalized').order('id').range(from,from+999).abortSignal(AbortSignal.timeout(15000));
 if(result.error)throw Error('Public part inventory could not load: '+result.error.message);
 parts.push(...result.data);if(result.data.length<1000)break;
}
const tables=['part_assembly_positions','technical_drawings','vehicle_catalog_contexts'];const counts={parts:parts.length};
for(const table of tables){let query=db.from(table).select('id',{count:'exact',head:true});if(table==='part_assembly_positions')query=query.eq('active',true);const result=await query.abortSignal(AbortSignal.timeout(15000));if(result.error)throw Error('Public count failed: '+table);counts[table]=result.count;}
const report={schema:1,observedAt:new Date().toISOString(),scope:'Anonymous public read only; identifiers/counts, no private member data',counts,parts};
const encoded=JSON.stringify(report)+'\n';await mkdir('work/part-evidence',{recursive:true});await writeFile('work/part-evidence/public-inventory.json',encoded);console.log(JSON.stringify({observedAt:report.observedAt,counts,sha256:createHash('sha256').update(encoded).digest('hex')}));
