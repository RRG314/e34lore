import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { buildE30Exterior, paint } from './e30-325i-exterior.mjs';
import { compactPart } from '../geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from '../geometry/compress-glb.mjs';
import { immutable, localReferenceTools, readJson, replaceJson, sha } from '../geometry/local-reference-review.mjs';

const revision = 1173;
const pinPath = 'data/digital-twin/e30-candidate.json';
const archivePath = 'data/digital-twin/workshop-panel-archives.json';
const active = await readJson(pinPath);
const archives = await readJson(archivePath);
const prior = [active, ...archives].find(pin => pin.id === active.id && pin.revision === 1172);
assert(prior, 'Missing E30 door fit reference');
const manifest = await fs.readFile('public' + prior.manifestUrl);
assert.equal(sha(manifest), prior.sha256);
const model = JSON.parse(manifest);
const nodes = new Map(model.nodes.map(node => [node.id, node]));
const exterior = model.assets.find(asset => asset.id === 'e30:325i-exterior');
const source = await fs.readFile('public' + exterior.url);
assert.equal(sha(source), exterior.sha256);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const { scene } = await loader.parseAsync(Uint8Array.from(source).buffer, '');
const material = new MeshBasicMaterial({ side: DoubleSide });

function surfaces(id, materialName = paint.name) {
  const node = nodes.get(id);
  const root = scene.getObjectByName(node.meshNames[0]);
  assert(root, id);
  root.updateWorldMatrix(true, true);
  const transform = new Matrix4().fromArray(node.matrix);
  const meshes = [];
  root.traverse(object => {
    if (!object.isMesh || object.material.name !== materialName) return;
    const mesh = new Mesh(object.geometry, material);
    mesh.matrixWorld.multiplyMatrices(transform, object.matrixWorld);
    meshes.push(mesh);
  });
  assert(meshes.length, 'Missing geometry for ' + id);
  return meshes;
}

function compareSeam(door, fender, fenderX, side) {
  const ray = new Raycaster(new Vector3(), new Vector3(0, 0, -side), 0, .26);
  let largestStep = 0, largestAngle = 0;
  for (let i = 0; i < 28; i++) {
    const y = .28 + i * .02;
    ray.ray.origin.set(.8016, y, .96 * side);
    const doorHit = ray.intersectObjects(door)[0];
    ray.ray.origin.x = fenderX;
    const fenderHit = ray.intersectObjects(fender)[0];
    assert(doorHit && fenderHit, 'Incomplete seam at height ' + y);
    largestStep = Math.max(largestStep, Math.abs(doorHit.point.z - fenderHit.point.z));
    largestAngle = Math.max(largestAngle, doorHit.normal.angleTo(fenderHit.normal));
  }
  return { stepMm: largestStep * 1000, angleDeg: largestAngle * 180 / Math.PI };
}

const sides = [['left', -1], ['right', 1]];
const before = Object.fromEntries(sides.map(([name, side]) => [name, compareSeam(
  surfaces('e30body:door-' + name), surfaces('e30body:front-fender-' + name), .8094, side,
)]));
const remaining = new Set(sides.map(([name]) => 'front-fender-' + name));
buildE30Exterior((_parent, key, _label, _at, _direction, draw) => {
  if (!remaining.delete(key)) return;
  const node = nodes.get('e30body:' + key);
  const previous = scene.getObjectByName(node.meshNames[0]);
  const group = new Group();
  group.name = previous.name;
  draw(group);
  compactPart(group);
  const bounds = new Box3().setFromObject(group, true);
  assert(!bounds.isEmpty(), key);
  node.bounds = { min: bounds.min.toArray(), max: bounds.max.toArray() };
  previous.parent.add(group);
  previous.removeFromParent();
});
assert.equal(remaining.size, 0);

const hood = surfaces('e30body:hood');
const fits = {};
for (const [name, side] of sides) {
  const door = surfaces('e30body:door-' + name);
  const fenderId = 'e30body:front-fender-' + name;
  const fender = surfaces(fenderId);
  const seam = compareSeam(door, fender, .8064, side);
  assert(seam.stepMm < 1 && seam.angleDeg < 8, JSON.stringify(seam));
  const shutLine = nodes.get(fenderId).bounds.min[0] - nodes.get('e30body:door-' + name).bounds.max[0];
  assert(shutLine >= .0038 && shutLine <= .0042, 'Door shut line is not 4 mm');
  fits[name] = { before: before[name], after: seam, shutLineMm: shutLine * 1000 };

  const overhead = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, .5);
  for (const x of [.876, .91, 1.02, 1.28, 1.57, 1.81, 1.95]) {
    const edges = [[], []];
    for (let z = .69; z <= .81; z += .00075) {
      overhead.ray.origin.set(x, 1.13, side * z);
      for (const [index, meshes] of [hood, fender].entries()) {
        if (overhead.intersectObjects(meshes)[0]?.point.y > .71) edges[index].push(z);
      }
    }
    assert(edges.every(edge => edge.length), 'Missing hood or fender edge at ' + x);
    const hoodGap = edges[1][0] - edges[0].at(-1);
    assert(hoodGap >= .002 && hoodGap < .009, 'Hood clearance at ' + x + ' is ' + hoodGap);
  }

  const moulding = surfaces(fenderId, 'Rubber');
  const ray = new Raycaster(new Vector3(), new Vector3(0, 0, -side), 0, .22);
  for (const x of [.837, .917, .989, 1.053]) {
    let exposed = 0;
    for (let y = .484; y <= .524; y += .001) {
      ray.ray.origin.set(x, y, side * .94);
      const body = ray.intersectObjects(fender)[0], trim = ray.intersectObjects(moulding)[0];
      if (body && trim && trim.distance + .0007 < body.distance) exposed++;
    }
    assert(exposed >= 31, 'Fender moulding is buried at ' + x);
  }
}

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
};
const bytes = await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true })));
const prefix = '/models/e30-lore/r' + revision + '/';
const hash = sha(bytes);
Object.assign(exterior, { url: prefix + hash + '.glb', bytes: bytes.length, sha256: hash });
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
if (!archives.some(entry => entry.id === prior.id && entry.revision === prior.revision)) {
  await replaceJson(archivePath, [...archives, prior]);
}
if (active.sha256 !== pin.sha256) await replaceJson(pinPath, pin);
console.log(JSON.stringify({ revision, fits }));
