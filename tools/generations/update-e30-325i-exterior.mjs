import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { compactPart } from '../geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from '../geometry/compress-glb.mjs';
import { immutable, localReferenceTools, readJson, replaceJson, sha } from '../geometry/local-reference-review.mjs';
import { buildE30Exterior, paint } from './e30-325i-exterior.mjs';

const pinPath = 'data/digital-twin/e30-candidate.json';
const archivePath = 'data/digital-twin/workshop-panel-archives.json';
const revision = 1161;
const archive = await readJson(archivePath);
const current = await readJson(pinPath);
const prior = [current, ...archive].find(pin => pin.id === current.id && pin.revision === 1160);
assert(prior, 'Missing the released 325i reference');
const manifest = await fs.readFile('public' + prior.manifestUrl);
assert.equal(sha(manifest), prior.sha256);
const model = JSON.parse(manifest);
const exterior = model.assets.find(asset => asset.id === 'e30:325i-exterior');
const original = await fs.readFile('public' + exterior.url);
assert.equal(sha(original), exterior.sha256);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const { scene } = await loader.parseAsync(Uint8Array.from(original).buffer, '');
const nodes = new Map(model.nodes.filter(node => node.assetId === exterior.id).map(node => [node.id, node]));

// Retain the riveted sunroof seal, split fuel flap and the cutout for its hinge.
const retained = new Set(['frame', 'roof', 'sunroof', 'rear-quarter-right']);
buildE30Exterior((parent, key, label, location, direction, draw) => {
  if (retained.has(key) || key.startsWith('wiper-')) return;
  const doorSide = /^e30body:door-(left|right)$/.exec(parent)?.[1];
  const id = parent === 'e30body:assembly' ? 'e30body:' + key
    : doorSide && ['mirror', 'door-glass'].includes(key) ? 'e30body:' + key + '-' + doorSide : parent + ':' + key;
  const node = nodes.get(id);
  assert(node, 'Unknown exterior member ' + id);
  const existing = scene.getObjectByName(node.meshNames[0]);
  assert(existing?.parent, 'Missing existing exterior group ' + id);
  const group = new Group();
  group.name = existing.name;
  draw(group);
  compactPart(group);
  const bounds = new Box3().setFromObject(group, true);
  assert(!bounds.isEmpty(), 'Empty exterior group ' + id);
  node.bounds = { min: bounds.min.toArray(), max: bounds.max.toArray() };
  existing.parent.add(group);
  existing.removeFromParent();
});
scene.traverse(object => {
  if (!object.isMesh) return;
  if (object.material.name === paint.name) object.material = paint;
});

const installedEnvelope = (parts) => {
  const box = new Box3();
  for (const node of parts) {
    if (!node.id.startsWith('e30body:') || node.id.includes('mirror')) continue;
    const { min, max } = node.bounds;
    box.union(new Box3(new Vector3(...min), new Vector3(...max)));
  }
  return [...box.min, ...box.max];
};
const baseline = JSON.parse(manifest);
const before = installedEnvelope(baseline.nodes.filter(node => node.assetId === exterior.id));
const after = installedEnvelope(nodes.values());
assert(after.every((value, index) => Math.abs(value - before[index]) <= .002), '325i body envelope moved by more than 2 mm');

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
};
const bytes = await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true })));
assert(bytes.length < 8 * 1024 * 1024, 'Exterior exceeds Workshop asset limit');
const assetHash = sha(bytes), prefix = '/models/e30-lore/r' + revision + '/';
Object.assign(exterior, { url: prefix + assetHash + '.glb', bytes: bytes.length, sha256: assetHash });
model.revision = revision;
model.catalog.modelRevision = revision;
const { parseReference } = await localReferenceTools();
assert.equal(parseReference(model).nodes.length, baseline.nodes.length);
const nextManifest = Buffer.from(JSON.stringify(model));
const digest = sha(nextManifest);
const pin = {...prior, revision, manifestUrl: prefix + 'manifest.' + digest + '.json', sha256: digest,
  assetBytes: model.assets.reduce((sum, asset) => sum + asset.bytes, 0)};
await immutable('public' + exterior.url, bytes);
await immutable('public' + pin.manifestUrl, nextManifest);
if (!archive.some(entry => entry.id === prior.id && entry.revision === prior.revision)) {
  await replaceJson(archivePath, [...archive, prior]);
}
await replaceJson(pinPath, pin);
console.log(JSON.stringify({ prior: prior.revision, revision, exteriorBytes: bytes.length, totalBytes: pin.assetBytes, before, after }));
