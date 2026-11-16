import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const origin=process.env.E34_TEST_ORIGIN||'http://127.0.0.1:3006';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname),'This acceptance script is for the frozen local review only.');
const references=[JSON.parse(await fs.readFile('data/digital-twin/public-reference.json','utf8')),...JSON.parse(await fs.readFile('data/digital-twin/vehicle-references.json','utf8'))];
const checked=new Set();let count=0;
for(const reference of references){
 const manifest=await fetch(origin+reference.manifestUrl,{signal:AbortSignal.timeout(20000)});assert.equal(manifest.status,200);
 const bytes=Buffer.from(await manifest.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),reference.sha256);const model=JSON.parse(bytes.toString());assert.equal(model.id,reference.id);count++;
 for(const asset of model.assets){if(checked.has(asset.url))continue;checked.add(asset.url);const r=await fetch(origin+asset.url,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);const b=Buffer.from(await r.arrayBuffer());assert.equal(b.length,asset.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),asset.sha256);count++;}
 const page=await fetch(origin+'/workshop?'+new URLSearchParams({reference:reference.id}),{signal:AbortSignal.timeout(30000)});assert.equal(page.status,200);const html=await page.text();assert(html.includes('aria-label="Car model"'));assert(!html.includes('525i Sedan · 3D reference'));count++;
 const row=html.indexOf('aria-label="Workshop reference view"'),search=html.indexOf('aria-label="Search model parts"');
 assert(search>=0&&row>search,reference.id+': model/view controls follow the system/search row');
 const controls=html.slice(row,html.indexOf('</nav>',row));
 const modelChoice=controls.indexOf('aria-label="Car model"'),interactive=controls.indexOf('<span>Interactive car</span>'),diagrams=controls.indexOf('<span>Catalog diagrams</span>');
 assert(modelChoice>=0&&interactive>modelChoice&&diagrams>interactive,reference.id+': model first, then interactive car and catalog diagrams');
}
console.log(`PASS: ${count} frozen local model/asset/page checks across ${references.length} configurations; no backend writes.`);
