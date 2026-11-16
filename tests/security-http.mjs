import assert from 'node:assert/strict';
import hostedBackend from '../src/data/backend.json' with {type:'json'};
const origin=process.env.E34_TEST_ORIGIN||'http://127.0.0.1:3002';
const url=new URL(origin);
assert.ok(['e34lore.com','www.e34lore.com','127.0.0.1','localhost'].includes(url.hostname),'Only the owned Site or loopback preview may be checked');
const backend = process.env.E34_TEST_HOSTED_READONLY === "1" ? hostedBackend : {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};
if (backend !== hostedBackend) {
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(backend.url).hostname),
    "Use a loopback backend unless running the maintainer's hosted read-only checks");
  assert.ok(backend.publishableKey, "Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for the local backend");
}
let checks=0;
for(const path of ['/scanner','/scanner/credits','/workshop/repair?task=center-support-bearing','/workshop/repair','/garage/configuration','/manage/scanner','/','/account','/garage','/manage/security','/manage/analytics','/manage/support','/workshop/assets']){
 const response=await fetch(origin+path,{signal:AbortSignal.timeout(20000)});
 const held=['/workshop/repair','/garage/configuration'].includes(path)&&process.env.E34_TEST_LOCAL_FEATURES!=='1';
 assert.equal(response.status,held?404:200,path);
 const csp=response.headers.get('content-security-policy')||'';
 assert.ok(csp.includes("frame-ancestors 'none'")&&csp.includes("object-src 'none'"),path+' framing and active content policy');
 assert.ok(!csp.includes("'unsafe-eval'"),path+' does not allow JS string evaluation');
 assert.ok(csp.includes("connect-src 'self' blob:"),path+' permits embedded GLB texture decoding');
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 assert.equal(response.headers.get('x-frame-options'),'DENY');
 if(!['/'].includes(path))assert.match(response.headers.get('cache-control')||'',/private.*no-store/);
 if(url.protocol==='https:')assert.match(response.headers.get('strict-transport-security')||'',/max-age=31536000/);
 await response.body?.cancel();checks++;
}
for(const path of ['/scanner-worker-debug.html','/scanner-retrieval-debug.html','/.env','/.git/config','/docs/security-inventory-current.json','/supabase/functions/support/index.ts','/vinext-server.json','/dist/server/vinext-server.json']){
 const response=await fetch(origin+path,{signal:AbortSignal.timeout(10000)});
 assert.ok([403,404].includes(response.status),'Private source must not be served: '+path);
 await response.body?.cancel();checks++;
}
for(const name of ['delete-account','car-media']){
 const response=await fetch(backend.url+'/functions/v1/'+name,{method:'POST',headers:{apikey:backend.publishableKey,Origin:'https://e34lore.com','Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,401,name+' requires member identity');checks++;
}
for(const [action,method,payload] of [['health','GET',undefined],['webhook','POST','{}']]){
 const response=await fetch(backend.url+'/functions/v1/support/'+action,{method,headers:{apikey:backend.publishableKey,Origin:'https://e34lore.com','Content-Type':'application/json'},...(payload?{body:payload}:{}),signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,401,'Support '+action+' requires independent authorization');checks++;
}
for(const table of ['component_observations','vehicle_configuration_evidence','vehicle_configuration_revisions','scanner_corrections','completed_repair_runs']){
 const r=await fetch(backend.url+'/rest/v1/'+table+'?select=id&limit=1',{headers:{apikey:backend.publishableKey},signal:AbortSignal.timeout(15000)});assert.ok([401,403].includes(r.status),table+' denies anonymous access');await r.body?.cancel();checks++;
}
const runtime=await fetch(backend.url+'/rest/v1/rpc/scanner_runtime_config',{method:'POST',headers:{apikey:backend.publishableKey,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});assert.equal(runtime.status,200);const flags=await runtime.json();assert.equal(flags.visual_available,false);assert.equal(flags.public_visual_enabled,false);checks++;
const review=await fetch(backend.url+'/rest/v1/rpc/scanner_correction_queue',{method:'POST',headers:{apikey:backend.publishableKey,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});assert.ok([401,403].includes(review.status));checks++;
const securityStatus=await fetch(backend.url+'/rest/v1/rpc/security_status',{method:'POST',headers:{apikey:backend.publishableKey,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});assert.ok([401,403].includes(securityStatus.status),'Security inventory requires an authorized administrator session');await securityStatus.body?.cancel();checks++;
console.log('PASS: '+checks+' HTTP security boundaries; no authenticated writes or messages sent.');
