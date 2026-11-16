import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { siteContent } from './site-content.mjs';
import { assetFiles, privateAssetReason, reviewedAssetPayload } from './ip/asset-boundary.mjs';

/** @param {string} [root] */
export async function checkPublicAssets(root) {
const { publicDir, assetIndex } = root === undefined ? siteContent() : {
  publicDir: path.join(root, "public"),
  assetIndex: path.join(root, "data/ip/public-assets.json"),
};
const lock = JSON.parse(await fs.readFile(assetIndex, 'utf8'));
const actual = await assetFiles(publicDir);
const expected = Object.keys(lock.files).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Public assets changed. Review provenance and run npm run ip:inventory; do not copy unpublished models or masters into public.');
for (const filename of actual) {
  const reason = privateAssetReason(filename);
  if (reason) throw new Error(`Public asset rejected (${reason}): ${filename}`);
  const bytes = await fs.readFile(path.join(publicDir, filename));
  const sha = createHash('sha256').update(reviewedAssetPayload(filename, bytes)).digest('hex');
  if (sha !== lock.files[filename]) throw new Error(`Public asset changed without provenance review: ${filename}`);
}
return actual.length;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const count = await checkPublicAssets();
  console.log(`PASS: ${count} public files match the reviewed release inventory; no source documents, maps, archives, keys or editable masters.`);
}
