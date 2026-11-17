import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { Webhook } from 'npm:svix@2.9.1';
import { supportService } from './core.mjs';
import { supportStore } from './store.mjs';
import { resendProvider } from './provider.mjs';
const options={auth:{persistSession:false,autoRefreshToken:false}};
Deno.serve(async request=>{
 const url=Deno.env.get('SUPABASE_URL')||'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',anon=Deno.env.get('SUPABASE_ANON_KEY')||'',apiKey=Deno.env.get('RESEND_SUPPORT_API_KEY')||'';
 const config={enabled:Deno.env.get('SUPPORT_ENABLED')==='true',providerConfigured:!!apiKey,secret:Deno.env.get('SUPPORT_SIGNING_SECRET')||'',workerToken:Deno.env.get('SUPPORT_WORKER_TOKEN')||'',from:Deno.env.get('SUPPORT_FROM')||'E34 Lore Support <support@mail.e34lore.com>',receiveDomain:'e34lore.com',origins:['https://e34lore.com','https://www.e34lore.com','http://127.0.0.1:3002','http://127.0.0.1:3004','http://127.0.0.1:3006','http://127.0.0.1:3009','http://localhost:3002','http://127.0.0.1:3000','http://localhost:3000']};
 const admin=createClient(url,service,options),store=supportStore(admin);
 try{if(!config.secret||!config.workerToken){const runtime=await admin.rpc('support_service_runtime').abortSignal(AbortSignal.timeout(10000));if(!runtime.error){config.secret ||= runtime.data?.signing||'';config.workerToken ||= runtime.data?.worker||'';}}}catch{/* Setup remains unavailable until the protected runtime is ready. */}
 const userClient=(token:string)=>createClient(url,anon,{...options,global:{headers:{Authorization:'Bearer '+token}}});
 const rpc=async(client:ReturnType<typeof createClient>,name:string,args:Record<string,unknown>={})=>{const result=await client.rpc(name,args).abortSignal(AbortSignal.timeout(12000));if(result.error)throw result.error;return result.data;};
 try{return await supportService(request,{config,store,provider:resendProvider(apiKey),defer:(task:Promise<unknown>)=>EdgeRuntime.waitUntil(task),verifyWebhook:(raw:string,headers:Record<string,string>)=>{new Webhook(Deno.env.get('RESEND_SUPPORT_WEBHOOK_SECRET')||'').verify(raw,headers);return JSON.parse(raw);},identity:async(token:string)=>{const result=await admin.auth.getUser(token);return result.error?null:result.data.user;},authorize:async(token:string)=>{const client=userClient(token);const identity=await client.auth.getUser(token);if(identity.error||!identity.data.user)return null;const allowed=await rpc(client,'support_authorized');return allowed?{rpc:(name:string,args:Record<string,unknown>)=>rpc(client,name,args)}:null;}});}catch{return new Response(JSON.stringify({error:'Support is temporarily unavailable.'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...(config.origins.includes(request.headers.get('origin')||'')?{'Access-Control-Allow-Origin':request.headers.get('origin')!,'Vary':'Origin'}:{})}});}
});
