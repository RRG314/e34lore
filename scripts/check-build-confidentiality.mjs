import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { siteContent } from './site-content.mjs';
import { privateAssetReason, reviewedAssetPayload } from './ip/asset-boundary.mjs';
import { immutableAssetAliases } from './ip/immutable-asset-aliases.mjs';
import { e30ReleaseEnabled } from './vite/e30-release-plugin.mjs';
import { modelAssetPackage, releaseManifestPaths, unpackModelGeometry, unpackModelManifest } from './ip/compressed-model-manifests.mjs';
const manifest=JSON.parse(await fs.readFile('dist/server/vinext-server.json','utf8'));
const secret=manifest.prerenderSecret;
assert.ok(typeof secret==='string'&&/^[a-f0-9]{64}$/i.test(secret),'Expected server-only prerender configuration');
let checked=0;
async function inspect(directory){
 for(const entry of await fs.readdir(directory,{withFileTypes:true})){
  const filename=path.join(directory,entry.name);
  assert.ok(!entry.isSymbolicLink(),'Client assets must not include filesystem symlinks');
  if(entry.isDirectory()){await inspect(filename);continue;}
  assert.ok(!/(^\.env|\.p8$|\.jks$|\.keystore$|^vinext-server\.json$|^wrangler\.json$)/i.test(entry.name),'Private configuration in client asset tree');
  const reason = privateAssetReason(path.relative('dist/client', filename));
  assert.ok(!reason, `Client asset rejected (${reason}): ${path.relative('dist/client', filename)}`);
  const bytes=await fs.readFile(filename);
  assert.ok(!bytes.includes(Buffer.from(secret)),'Server prerender credential found in client asset tree');
  checked++;
 }
}
await inspect('dist/client');
const content=siteContent(), fullRelease=content.release && e30ReleaseEnabled();
const release = JSON.parse(await fs.readFile(content.assetIndex, 'utf8'));
const aliases = fullRelease ? immutableAssetAliases(content.publicDir) : {};
const compressedManifests = fullRelease ? releaseManifestPaths() : new Set();
const { compressed, omitted } = fullRelease ? modelAssetPackage(aliases) : { compressed: new Set(), omitted: new Set() };
for (const [filename, expected] of Object.entries(release.files)) {
 if (omitted.has('/'+filename)) {
  await assert.rejects(fs.stat('dist/client/'+filename), {code:'ENOENT'}, 'Preview asset was packaged: '+filename);
  continue;
 }
 const canonical = aliases['/'+filename] ?? '/'+filename;
 const bytes = await fs.readFile('dist/client'+canonical);
 const payload = compressedManifests.has(canonical) ? unpackModelManifest(bytes)
  : compressed.has(canonical) ? unpackModelGeometry(bytes) : reviewedAssetPayload(filename, bytes);
 assert.equal(createHash('sha256').update(payload).digest('hex'), expected, `Built public file differs from reviewed source: ${filename}`);
}
console.log('PASS: '+checked+' client assets exclude the server prerender credential and private configuration files.');
