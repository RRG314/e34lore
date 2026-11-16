import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Raycaster, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { compactPart } from '../geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from '../geometry/compress-glb.mjs';
import { immutable, localReferenceTools, readJson, replaceJson, sha } from '../geometry/local-reference-review.mjs';
import { buildE30Exterior, paint } from './e30-325i-exterior.mjs';
import { rearLensPoint } from './e30-325i-trim.mjs';

const revision = 1180;
const pinPath = 'data/digital-twin/e30-candidate.json';
const archivePath = 'data/digital-twin/workshop-panel-archives.json';
const current = await readJson(pinPath);
const archives = await readJson(archivePath);
const prior = [current, ...archives].find(pin => pin.id === current.id && pin.revision === 1179);
assert(prior && current.revision <= revision, 'Expected the 325i revision 1179 exterior');

const previousManifest = await fs.readFile('public' + prior.manifestUrl);
assert.equal(sha(previousManifest), prior.sha256);
const model = JSON.parse(previousManifest);
const nodes = new Map(model.nodes.map(node => [node.id, node]));
const exterior = model.assets.find(asset => asset.id === 'e30:325i-exterior');
const original = await fs.readFile('public' + exterior.url);
assert.equal(sha(original), exterior.sha256);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const { scene } = await loader.parseAsync(original.buffer.slice(original.byteOffset, original.byteOffset + original.length), '');
scene.updateMatrixWorld(true);

function paintedMeshes(key) {
  const group = scene.getObjectByName(nodes.get('e30body:' + key).meshNames[0]);
  const meshes = [];
  group.traverse(object => {
    if (object.isMesh && object.material.name === paint.name) meshes.push(object);
  });
  assert(meshes.length, 'Missing painted surface for ' + key);
  return meshes;
}

const rearRay = new Raycaster(new Vector3(), new Vector3(1, 0, 0), 0, .28);
function rearHit(meshes, y, z) {
  rearRay.ray.origin.set(-2.23, y, z);
  return rearRay.intersectObjects(meshes)[0];
}
const oldLid = paintedMeshes('trunk');
const lowerFace = [-.60, 0, .60].map(z => {
  const y = .7305 + .012 * (1 - (z / .7254) ** 2);
  return { y, z, x: rearHit(oldLid, y, z).point.x };
});
const panels = new Set(['trunk', 'tail-panel', 'rear-quarter-left', 'rear-quarter-right']);
buildE30Exterior((parent, key, _name, _position, _direction, draw) => {
  if (parent !== 'e30body:assembly' || !panels.delete(key)) return;
  const node = nodes.get('e30body:' + key);
  const old = scene.getObjectByName(node.meshNames[0]);
  assert(old?.parent, key);
  const group = new Group();
  group.name = old.name;
  draw(group);
  compactPart(group);
  const box = new Box3().setFromObject(group, true);
  node.bounds = { min: box.min.toArray(), max: box.max.toArray() };
  old.parent.add(group);
  old.removeFromParent();
});
assert.equal(panels.size, 0);
scene.updateMatrixWorld(true);

const lid = paintedMeshes('trunk');
const upperReach = rearHit(lid, .827, 0).point.x - rearHit(lid, .803, 0).point.x;
assert(upperReach > .009 && upperReach < .018, 'The upper return should turn gradually into the badge face');
assert(Math.abs(rearHit(lid, .794, 0).point.x - rearHit(lid, .754, 0).point.x + .0024) < .0004,
  'The badge face should maintain its shallow rake below the radius');
for (const { x, y, z } of lowerFace) {
  const movement = rearHit(lid, y, z).point.x - x;
  assert(Math.abs(movement) < .002, 'Lower trunk alignment at ' + z + ': ' + (movement * 1000).toFixed(2) + ' mm');
}

const downRay = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, .4);
const tail = paintedMeshes('tail-panel');
for (const [name, side] of [['left', -1], ['right', 1]]) {
  const quarter = paintedMeshes('rear-quarter-' + name);
  for (const x of [-1.62, -1.82, -1.98, -2.051]) {
    const edges = [[], []];
    for (let i = 0; i <= 68; i++) {
      const z = .71 + i * .001;
      downRay.ray.origin.set(x, 1.11, side * z);
      for (const [index, meshes] of [lid, quarter].entries()) {
        if (downRay.intersectObjects(meshes).some(hit => hit.point.y > .785)) edges[index].push(z);
      }
    }
    const gap = edges[1][0] - edges[0].at(-1);
    assert(gap >= 0 && gap < .010, name + ' lid seam at ' + x + ': ' + gap);
  }
  for (const u of [.80, .90, .96]) {
    for (const v of [.25, .50, .77, .92]) {
      const [x, y, z] = rearLensPoint(side, u, v, .0015);
      const hit = rearHit([...quarter, ...tail], y, z);
      assert(!hit || hit.point.x > x + .003, name + ' quarter overlaps the tail light');
    }
  }
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
const manifest = Buffer.from(JSON.stringify(model));
const digest = sha(manifest);
const pin = {
  ...prior, revision, sha256: digest, manifestUrl: prefix + 'manifest.' + digest + '.json',
  assetBytes: model.assets.reduce((sum, asset) => sum + asset.bytes, 0),
};
assert(pin.assetBytes <= 24 * 1024 * 1024, 'Vehicle geometry exceeds the transfer budget');
await immutable('public' + exterior.url, bytes);
await immutable('public' + pin.manifestUrl, manifest);
if (!archives.some(saved => saved.id === prior.id && saved.revision === prior.revision)) {
  await replaceJson(archivePath, [...archives, prior]);
}
if (current.sha256 !== digest) await replaceJson(pinPath, pin);
console.log('E30 revision ' + revision + ': ' + pin.assetBytes + ' bytes');
