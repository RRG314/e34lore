import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assetFiles, privateAssetReason, reviewedAssetPayload } from './ip/asset-boundary.mjs';

export async function checkPublicAssets(root = process.cwd()) {
const lock = JSON.parse(await fs.readFile(path.join(root, 'data/ip/public-assets.json'), 'utf8'));
const actual = await assetFiles(path.join(root, 'public'));
const expected = Object.keys(lock.files).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Public assets changed. Review provenance and run npm run ip:inventory; do not copy unpublished models or masters into public.');
for (const filename of actual) {
  const reason = privateAssetReason(filename);
  if (reason) throw new Error(`Public asset rejected (${reason}): ${filename}`);
  const bytes = await fs.readFile(path.join(root, 'public', filename));
  const sha = createHash('sha256').update(reviewedAssetPayload(filename, bytes)).digest('hex');
  if (sha !== lock.files[filename]) throw new Error(`Public asset changed without provenance review: ${filename}`);
}
return actual.length;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const count = await checkPublicAssets();
  console.log(`PASS: ${count} public files match the reviewed release inventory; no source documents, maps, archives, keys or editable masters.`);
}
