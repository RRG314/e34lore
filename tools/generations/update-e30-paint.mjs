import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { paint } from './e30-325i-exterior.mjs';
import { immutable, localReferenceTools, readJson, replaceJson, sha } from '../geometry/local-reference-review.mjs';

const revision = 1175;
const pinPath = 'data/digital-twin/e30-candidate.json';
const archivePath = 'data/digital-twin/workshop-panel-archives.json';
const current = await readJson(pinPath);
const archives = await readJson(archivePath);
const prior = [current, ...archives].find(pin => pin.id === current.id && pin.revision === 1174);
assert(prior, 'Missing the E30 paint reference');
const manifest = await fs.readFile('public' + prior.manifestUrl);
assert.equal(sha(manifest), prior.sha256);
const model = JSON.parse(manifest);
const exterior = model.assets.find(asset => asset.id === 'e30:325i-exterior');
const original = await fs.readFile('public' + exterior.url);
assert.equal(sha(original), exterior.sha256);

// Keep the mesh buffer intact. Only the paint entries in the JSON chunk change.
assert.equal(original.readUInt32LE(0), 0x46546c67);
assert.equal(original.readUInt32LE(16), 0x4e4f534a);
const chunkEnd = 20 + original.readUInt32LE(12);
const gltf = JSON.parse(original.subarray(20, chunkEnd));
const bodyMaterials = gltf.materials.filter(material => material.name === paint.name);
assert(bodyMaterials.length, 'The E30 body paint is missing');
for (const material of bodyMaterials) {
  Object.assign(material.pbrMetallicRoughness, {
    baseColorFactor: [...paint.color.toArray(), 1],
    metallicFactor: paint.metalness,
    roughnessFactor: paint.roughness,
  });
  Object.assign(material.extensions.KHR_materials_clearcoat, {
    clearcoatFactor: paint.clearcoat,
    clearcoatRoughnessFactor: paint.clearcoatRoughness,
  });
  material.extras = { ...material.extras, ...paint.userData };
}
const json = Buffer.from(JSON.stringify(gltf));
const padding = Buffer.alloc((4 - json.length % 4) % 4, 32);
const header = Buffer.from(original.subarray(0, 20));
const meshChunks = original.subarray(chunkEnd);
header.writeUInt32LE(header.length + json.length + padding.length + meshChunks.length, 8);
header.writeUInt32LE(json.length + padding.length, 12);
const bytes = Buffer.concat([header, json, padding, meshChunks]);
const prefix = '/models/e30-lore/r' + revision + '/';
const assetHash = sha(bytes);
Object.assign(exterior, { url: prefix + assetHash + '.glb', sha256: assetHash, bytes: bytes.length });
model.revision = revision;
model.catalog.modelRevision = revision;
const { parseReference } = await localReferenceTools();
parseReference(model);
const nextManifest = Buffer.from(JSON.stringify(model));
const digest = sha(nextManifest);
const pin = {
  ...prior, revision, sha256: digest, manifestUrl: prefix + 'manifest.' + digest + '.json',
  assetBytes: model.assets.reduce((sum, asset) => sum + asset.bytes, 0),
};
await immutable('public' + exterior.url, bytes);
await immutable('public' + pin.manifestUrl, nextManifest);
if (!archives.some(saved => saved.id === prior.id && saved.revision === prior.revision)) {
  await replaceJson(archivePath, [...archives, prior]);
}
if (current.sha256 !== digest) await replaceJson(pinPath, pin);
console.log(`E30 revision ${revision}: updated ${bodyMaterials.length} paint entries`);
