import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Raycaster, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { compressGeometryGlb } from '../geometry/compress-glb.mjs';
import { compactPart } from '../geometry/local-cabin-glb.mjs';
import { immutable, localReferenceTools, readJson, replaceJson, sha } from '../geometry/local-reference-review.mjs';
import { buildE30Exterior, paint } from './e30-325i-exterior.mjs';

const revision = 1177;
const pinPath = 'data/digital-twin/e30-candidate.json';
const archivePath = 'data/digital-twin/workshop-panel-archives.json';
const current = await readJson(pinPath);
const archives = await readJson(archivePath);
const prior = [current, ...archives].find(pin => pin.id === current.id && pin.revision === 1176);
assert(prior && current.revision <= revision, 'Expected 325i revision 1176 or 1177');
const manifest = await fs.readFile('public' + prior.manifestUrl);
assert.equal(sha(manifest), prior.sha256);
const model = JSON.parse(manifest);
const exterior = model.assets.find(asset => asset.id === 'e30:325i-exterior');
const original = await fs.readFile('public' + exterior.url);
assert.equal(sha(original), exterior.sha256);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const { scene } = await loader.parseAsync(Uint8Array.from(original).buffer, '');

const keys = new Set([
  'front-panel', 'kidney-grilles', 'headlamps-left', 'headlamps-right',
  'front-fender-left', 'front-fender-right', 'front-bumper',
]);
buildE30Exterior((parent, key, _label, _position, _direction, draw) => {
  if (!keys.delete(key)) return;
  const id = (parent === 'e30body:assembly' ? 'e30body' : parent) + ':' + key;
  const node = model.nodes.find(entry => entry.id === id);
  const previous = scene.getObjectByName(node.meshNames[0]);
  assert(previous?.parent, id);
  const group = new Group();
  group.name = previous.name;
  draw(group);
  compactPart(group);
  const box = new Box3().setFromObject(group, true);
  node.bounds = { min: box.min.toArray(), max: box.max.toArray() };
  previous.parent.add(group);
  previous.removeFromParent();
});
assert.equal(keys.size, 0);
scene.traverse(object => {
  if (object.isMesh && object.material.name === paint.name) object.material = paint;
});
scene.updateMatrixWorld(true);

const ray = new Raycaster(new Vector3(), new Vector3(-1, 0, 0), 0, 2);
const kidneys = scene.getObjectByName('e30body_front-panel_kidney-grilles');
const rim = kidneys.children.find(mesh => mesh.material.name === 'Polished kidney surround');
const hoodBounds = model.nodes.find(node => node.id === 'e30body:hood').bounds;
const bumperBounds = model.nodes.find(node => node.id === 'e30body:front-bumper').bounds;
for (const z of [-.081, .081]) {
  const edgeX = y => {
    ray.ray.origin.set(3, y, z);
    const hit = ray.intersectObject(rim)[0];
    assert(hit, 'Missing chrome rim at ' + [y, z]);
    return hit.point.x;
  };
  const upper = edgeX(.744);
  const lower = edgeX(.546);
  const rake = Math.atan2(upper - lower, .198) * 180 / Math.PI;
  assert(rake >= 5 && rake <= 7, 'Grille rake is ' + rake.toFixed(1) + ' degrees');
  assert(upper <= hoodBounds.max[0] && lower < bumperBounds.max[0], 'Grille extends beyond the nose');
}

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};
const bytes = await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true })));
const prefix = '/models/e30-lore/r' + revision + '/';
const hash = sha(bytes);
Object.assign(exterior, { url: prefix + hash + '.glb', sha256: hash, bytes: bytes.length });
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
assert(pin.assetBytes <= 24 * 1024 * 1024, 'Vehicle geometry exceeds the existing transfer budget');
await immutable('public' + exterior.url, bytes);
await immutable('public' + pin.manifestUrl, nextManifest);
if (!archives.some(pin => pin.id === prior.id && pin.revision === prior.revision)) {
  await replaceJson(archivePath, [...archives, prior]);
}
if (current.sha256 !== digest) await replaceJson(pinPath, pin);
console.log('E30 revision ' + revision + ': ' + pin.assetBytes + ' bytes, including the revised nose and clearcoat');
