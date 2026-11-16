// Read-only checks against a local production build. Never creates accounts or posts.
import assert from 'node:assert/strict';
const root=process.env.E34_TEST_ORIGIN||'http://127.0.0.1:3006';
assert(['127.0.0.1','localhost'].includes(new URL(root).hostname),'Use the frozen local review build');
let checks=0,topicPaths=[];
const internalCopy=/EDITORIAL DRAFT|Operational drafts|PRIVATE DRAFT|requires legal review|Editorial starting point|Site editorial|48 original editorial resources|operational drafts that require legal review|The site remains in private review|Public uploads, marketplace transactions and private messaging are disabled/;
for(const path of ['/terms','/privacy','/copyright','/community/policies','/community/specialists','/community/topics','/community/topics/cooling-triage','/support','/shop','/marketplace','/roadmap','/manual','/quick-reference','/app','/garages','/community/cars','/resources','/guides/m50-water-pump-job-planning']){
 const r=await fetch(root+path,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);const html=await r.text();
 assert(!internalCopy.test(html),path+' has no internal publication labels');
 if(path==='/community/topics')topicPaths=[...new Set([...html.matchAll(/href="(\/community\/topics\/[a-z0-9-]+)"/g)].map(m=>m[1]))];
 assert(html.includes('/copyright')&&html.includes('/privacy')&&html.includes('/terms'),path+' exposes canonical policies');
 if(path==='/community/specialists'){assert(html.includes('Korman Autoworks')&&html.includes('Munich Legends'));assert(html.includes('intent=specialist'),'recommendations have a separate unsent draft');}
 if(path==='/shop'||path==='/marketplace')assert(!html.includes('DESIGN PREVIEW')&&html.includes('/roadmap#marketplace'));
 if(path==='/roadmap')assert(html.includes('Photo part comparison')&&html.includes('Coming soon')&&html.includes('Sound-assisted'));
 checks++;
}
assert(topicPaths.length>=48,'The full published topic library is present');
for(const path of topicPaths){const r=await fetch(root+path,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,path);const html=await r.text();assert(!internalCopy.test(html),path+' has no stale public-launch or internal-draft copy');checks++;}
for(const path of ['/.vite/manifest.json','/.vite/vinext-client-reference-sources.json','/.assetsignore','/terms/extra','/community/specialists/extra']){
 const r=await fetch(root+path,{signal:AbortSignal.timeout(20000)});assert([403,404].includes(r.status),path);await r.body?.cancel();checks++;
}
const notices=await fetch(root+'/THIRD-PARTY-NOTICES.txt');assert.equal(notices.status,200);const text=await notices.text();assert(text.includes('third-party software notices')&&text.includes('MIT License'));checks++;
console.log(`PASS: ${checks} public page, navigation, policy, notice and private-file checks; no writes.`);
