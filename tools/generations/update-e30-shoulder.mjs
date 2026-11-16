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

const revision = 1179;
const pinPath = 'data/digital-twin/e30-candidate.json';
const archivePath = 'data/digital-twin/workshop-panel-archives.json';
const current = await readJson(pinPath);
const archives = await readJson(archivePath);
const prior = [current, ...archives].find(pin => pin.id === current.id && pin.revision === 1177);
assert(prior && current.revision <= revision, 'Expected the 325i shoulder preview');
const manifest = await fs.readFile('public' + prior.manifestUrl);
assert.equal(sha(manifest), prior.sha256);
const model = JSON.parse(manifest);
const nodes = new Map(model.nodes.map(node => [node.id, node]));
const exterior = model.assets.find(asset => asset.id === 'e30:325i-exterior');
const original = await fs.readFile('public' + exterior.url);
assert.equal(sha(original), exterior.sha256);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const { scene } = await loader.parseAsync(Uint8Array.from(original).buffer, '');

const sides = [['left', -1], ['right', 1]];
const changed = new Set(sides.flatMap(([side]) => [
  'e30body:front-fender-' + side, 'e30body:door-' + side, 'e30body:rear-quarter-' + side,
  'e30body:door-' + side + ':outer-handle',
]));
buildE30Exterior((parent, key, _name, _at, _direction, draw) => {
  const id = (parent === 'e30body:assembly' ? 'e30body' : parent) + ':' + key;
  if (!changed.delete(id)) return;
  const node = nodes.get(id);
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
assert.equal(changed.size, 0);
scene.updateMatrixWorld(true);

function meshes(id, material) {
  const found = [];
  scene.getObjectByName(nodes.get(id).meshNames[0]).traverse(object => {
    if (object.isMesh && object.material.name === material) found.push(object);
  });
  assert(found.length, id + ' has no ' + material + ' mesh');
  return found;
}

for (const [side, sign] of sides) {
  const door = meshes('e30body:door-' + side, paint.name);
  const fender = meshes('e30body:front-fender-' + side, paint.name);
  const quarter = meshes('e30body:rear-quarter-' + side, paint.name);
  const handles = meshes('e30body:door-' + side + ':outer-handle', 'Rubber');
  const ray = new Raycaster(new Vector3(), new Vector3(0, 0, -sign), 0, .26);
  const width = (surfaces, x, y) => {
    ray.ray.origin.set(x, y, sign * .96);
    const hit = ray.intersectObjects(surfaces)[0];
    assert(hit, side + ': no surface at ' + [x, y]);
    return sign * hit.point.z;
  };

  let maxStep = 0;
  for (let y = .33; y <= .814; y += .006) {
    maxStep = Math.max(maxStep,
      Math.abs(width(door, .8018, y) - width(fender, .8062, y)),
      Math.abs(width(door, -.4628, y) - width(quarter, -.4712, y)));
  }
  assert(maxStep < .0015, side + ' shoulder does not line up at the door gaps');

  // Each stamping has a shallow step below the line and relaxed slopes above and below.
  for (const [surface, x, y] of [[fender, 1.19, .721], [door, -.340, .736], [quarter, -1.18, .736]]) {
    const seat = width(surface, x, y + .007) - width(surface, x, y - .007);
    const upper = width(surface, x, y + .021) - width(surface, x, y + .008);
    assert(seat > .002 && seat < .006, side + ' swage depth is out of range at ' + x);
    assert(Math.abs(upper) < .0028, side + ' swage flares into the upper panel at ' + x);
  }
  for (const x of [-.390, -.340, -.290]) {
    const protrusion = width(handles, x, .757) - width(door, x, .757);
    assert(protrusion > .004 && protrusion < .018, side + ' handle does not sit on the door');
  }
  const lock = width(handles, -.400, .702) - width(door, -.400, .702);
  assert(lock > .002 && lock < .012, side + ' lock does not sit on the door');
  console.log(side + ' door gap step: ' + (maxStep * 1000).toFixed(2) + ' mm');
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
model.revision = model.catalog.modelRevision = revision;
const { parseReference } = await localReferenceTools();
parseReference(model);
const nextManifest = Buffer.from(JSON.stringify(model));
const digest = sha(nextManifest);
const pin = {
  ...prior, revision, sha256: digest, manifestUrl: prefix + 'manifest.' + digest + '.json',
  assetBytes: model.assets.reduce((sum, asset) => sum + asset.bytes, 0),
};
assert(pin.assetBytes <= 24 * 1024 * 1024, 'Vehicle geometry exceeds the transfer budget');
await immutable('public' + exterior.url, bytes);
await immutable('public' + pin.manifestUrl, nextManifest);
const superseded = current.revision === 1178 ? {...current, previewOnly: true} : null;
const retired = [prior, superseded].filter(pin => pin && !archives.some(entry => entry.id === pin.id && entry.revision === pin.revision));
if (retired.length) {
  await replaceJson(archivePath, [...archives, ...retired]);
}
if (current.sha256 !== digest) await replaceJson(pinPath, pin);
console.log('E30 revision ' + revision + ': ' + pin.assetBytes + ' bytes');
