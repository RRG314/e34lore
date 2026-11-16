// Read-only acceptance of a local production build; never creates users or data.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import e30 from '../data/digital-twin/e30-candidate.json' with {type:'json'};
import {unpackModelManifest} from '../scripts/ip/compressed-model-manifests.mjs';
const origin = process.env.E34_TEST_ORIGIN || 'http://127.0.0.1:3006';
let checks = 0;
async function get(path) {
  const r = await fetch(new URL(path, origin), {signal: AbortSignal.timeout(30000), redirect: 'manual'});
  const html = await r.text();
  return {r, html};
}
for (const path of ['/workshop/repair', '/workshop/repair?task=m50-water-pump-job-planning', '/workshop/repair?preview=true', '/garage/configuration']) {
  const {r, html} = await get(path);
  assert.equal(r.status, 404, path + ' is not released');
  assert(!html.includes('type="file"') && !html.includes('Open camera'), path + ' has no capture controls');
  checks++;
}
// Development weights must not become a public model-serving endpoint.
for(const path of ['/scanner-lab/reference-index.json','/data/scanner/local-v2/reference-index.json','/scanner-lab/reference-index.json?preview=true']){
  const {r}=await get(path);assert.equal(r.status,404,'local reference data remains private: '+path);checks++;
}
{
  const {r} = await get('/scanner-models/6b7c523703ae26e39be4b03774966f8571c7f523/Xenova/clip-vit-base-patch32/config.json');
  assert.equal(r.status, 404, 'private scanner weights are not released');
  checks++;
}
for (const path of ['/', '/parts/catalog', '/parts/interchange', '/parts/reference', '/workshop', '/repairs', '/guides/m50-water-pump-job-planning', '/garage', '/account', '/scanner', '/scanner/credits', '/workshop/repair?task=center-support-bearing&reference=e34-540i-sedan-automatic']) {
  const {r, html} = await get(path);
  assert.equal(r.status, 200, path + ' still works');
  const main = html.match(/<nav[^>]*aria-label="Main navigation"[\s\S]*?<\/nav>/)?.[0];
  assert(main, path + ' has site navigation');
  assert(main.includes('/scanner') && !main.includes('/parts/interchange'), path + ' offers photo comparison and keeps interchange in OEM');
  assert(main.includes('/parts/catalog'), path + ' retains OEM reference');
  const hrefs = [...html.matchAll(/href="([^"#]*)"/g)].map(m => m[1]);
  assert(!hrefs.some(h => /^\/garage\/configuration(?:[/?]|$)/.test(h) || (h.startsWith('/workshop/repair')&&!new URL(h.replaceAll('&amp;','&'),origin).searchParams.has('task'))), path + ' has no held-feature links');
  if(path==='/scanner'){
    assert(html.includes('Choose photo'), 'gallery upload is present');
    assert(!html.includes('Run experimental image analysis')&&!html.includes('Additional comparison tools'),'unreleased image-analysis controls are absent');
    checks++;
  }
  if (path.startsWith('/parts/')) {
    assert(html.includes('aria-label="OEM reference sections"'), path + ' has OEM navigation');
    assert(html.includes('Interchange &amp; replacements'), path + ' offers interchange within OEM');
    checks++;
  }
  checks++;
}
if (process.env.E34_E30_BUILD === '1') {
  for (const [path, content] of [
    ['/e30', 'Show 1990 BMW 325i Touring'],
    ['/e30/workshop', 'Interactive E30 workshop · E30 Lore'],
    ['/e30/scanner', 'Choose photo'],
    ['/e30/parts/catalog', 'OEM number &amp; assembly reference.'],
    ['/e30/quick-reference', 'Which fuse?'],
    ['/e30/electrical', 'Wiring &amp; Electrical'],
    ['/e30/repairs/e30-brake-fluid-flush', '/e30/manual/34?pdf=641'],
  ]) {
    const {r, html} = await get(path);
    assert.equal(r.status, 200, path);
    assert(html.includes(content), path + ' renders the E30 entry');
    if (path === '/e30') {
      for (const destination of ['/e30/diagnostics', '/e30/repairs', '/e30/encyclopedia', '/garage?series=e30']) {
        assert(html.includes('href="' + destination + '"'), 'E30 home links to ' + destination);
      }
    }
    if (path === '/e30/scanner') assert(!html.includes('Additional comparison tools'));
    checks++;
  }
  const response = await fetch(new URL(e30.manifestUrl, origin), {signal: AbortSignal.timeout(20000)});
  assert.equal(response.status, 200, 'Current E30 manifest is packaged');
  let bytes = Buffer.from(await response.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = unpackModelManifest(bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), e30.sha256);
  const manifest = JSON.parse(bytes);
  for (const asset of manifest.assets) {
    const assetResponse = await fetch(new URL(asset.url, origin), {method:'HEAD', signal: AbortSignal.timeout(20000)});
    assert.equal(assetResponse.status, 200, asset.url);
    checks++;
  }
  checks++;
}
console.log(`PASS: ${checks} local production release checks; no accounts, uploads or backend writes.`);
