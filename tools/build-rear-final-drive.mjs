import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Matrix4, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { siteContent } from '../scripts/site-content.mjs';
import { compressGeometryGlb } from './geometry/compress-glb.mjs';
import { compactPart } from './geometry/local-cabin-glb.mjs';
import { immutable, localReferenceTools, nameOf, readJson, replaceJson, sha } from './geometry/local-reference-review.mjs';
import { buildRearFinalDrive, outputPitchRadius, partTransform } from './geometry/rear-final-drive.mjs';

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};

const series = process.argv[2];
assert(series === 'e30' || series === 'e34', 'Specify e30 or e34.');
const e30 = series === 'e30';
const content = siteContent();
assert(content.release, 'Set E34_ASSET_PACK to the Workshop asset pack.');
const directory = e30 ? 'work/e30/getrag-service' : 'work/525i-service-candidate';
const receiptPath = directory + (e30 ? '/review.json' : '/fit-review.json');
const baseline = await readJson('data/digital-twin/' + (e30 ? 'e30-candidate' : '525i-service-release') + '.json');
const driveshaftRevision = baseline.revision + 1;
const revision = driveshaftRevision + 1;
const receipt = await readJson(receiptPath);
const previous = e30 ? receipt : { release: receipt.release, files: receipt.files };
const candidates = [previous, ...(receipt.archives ?? [])];
const pinOf = entry => e30 ? entry : entry.release;
const driveshaft = candidates.find(entry => pinOf(entry).revision === driveshaftRevision);
assert(driveshaft, 'Build the center support and flex disc preview first.');
const pin = pinOf(driveshaft);

const urlPrefix = '/models/' + series + '-lore/r' + revision + '/';
const localPath = url => directory + (e30 ? url : '/' + nameOf(url));
async function readChecked(path, digest) {
  const bytes = await fs.readFile(path);
  assert.equal(sha(bytes), digest, path);
  return bytes;
}

const model = JSON.parse(await readChecked(localPath(pin.manifestUrl), pin.sha256));
const { catalog } = model;
const nodes = new Map(model.nodes.map(node => [node.id, node]));
const parent = e30 ? 'e30assembly:rear-final-drive' : 'e34sys:differential';
const ids = e30 ? {
  case: parent + ':case', cover: parent + ':rear-cover', 'ring-gear': parent + ':ring-gear', pinion: parent + ':pinion',
  carrier: 'e30assembly:rear-axle:rear-subframe',
  'left-axle': 'e30assembly:rear-left:halfshaft', 'right-axle': 'e30assembly:rear-right:halfshaft',
} : {
  case: 'e34sys:differential-case', 'left-axle': 'e34sys:halfshaft-1', 'right-axle': 'e34sys:halfshaft--1',
};
const flangeId = e30 ? 'e30shaft:differential-flange' : 'e34sys:differential-input-flange';
const propshaftId = e30 ? 'e30assembly:propeller:rear-section' : 'e34shaft:rear-section';
const leftHub = e30 ? 'e30assembly:rear-left:hub' : 'e34sys:hub-rear-1';
const rightHub = e30 ? 'e30assembly:rear-right:hub' : 'e34sys:hub-rear--1';
const pages = e30 ? {
  case: 'eec9654f3a8d389d56b6bcb8', cover: 'fbba89cf14a34355896c121e', carrier: 'bf3c80229c1825de1172769d',
  output: 'afe1a52e88108b4b73a62306', shaft: '070b46c2c712cc471bca3a8b', hub: 'c22a5af99a239fe8412ea005',
} : {
  case: '8ddddd4cbd46d1a8bb5d9d6e', cover: '8ddddd4cbd46d1a8bb5d9d6e', carrier: '575408d2bcab1d2bb163f7ca',
  output: '557963401be9ba390defb152', shaft: '73853b8a1ea160ec9ce26a00', hub: 'f5d0fb38ec840a3f676e6b63',
};
const manuals = e30 ? {
  final: { chapter: '33', page: 621, printed: '33-1', title: 'BMW · Rear final drive removal and installation' },
  shaft: { chapter: '33', page: 625, printed: '33-4', title: 'BMW · Rear output shaft removal and installation' },
} : {
  final: { chapter: '331', page: 314, printed: '331-2', title: 'Bentley · Rear final drive removal and installation' },
  shaft: { chapter: '330', page: 305, printed: '330-7', title: 'Bentley · Rear drive axle removal and installation' },
};

const catalogPages = new Map();
for (const [key, id] of Object.entries(pages)) {
  const page = catalog.assemblies['catalog-assembly-' + id];
  assert(page, id);
  const { items } = JSON.parse(await readChecked(content.publicDir + page.url, page.sha256));
  catalogPages.set(key, { page, items });
}

const asset = model.assets.find(asset => asset.id === (e30 ? 'e30:325i-mechanical' : 'authored:525i-mechanical-detail'));
assert(asset);
const source = await readChecked(localPath(asset.url), asset.sha256);
const { scene } = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(Uint8Array.from(source).buffer, '');
const flange = nodes.get(flangeId);
const prop = nodes.get(propshaftId);
const hubPoints = (side, id) => {
  const node = nodes.get(id);
  const matrix = new Matrix4().fromArray(node.matrix);
  const point = z => new Vector3(0, 0, z).applyMatrix4(matrix).toArray();
  const inboard = point(node.bounds.min[2]);
  const outer = point(e30 ? .024 : node.bounds.max[2]);
  assert.equal(Math.sign(inboard[2]), side);
  return { inboard, outer };
};
const anchors = {
  center: nodes.get(ids.case).matrix.slice(12, 15),
  inputBack: flange.matrix[12] + flange.bounds.min[0],
  output: e30 ? .157 : .168,
  hubs: { left: hubPoints(-1, leftHub), right: hubPoints(1, rightHub) },
};
const inputFront = flange.matrix[12] + flange.bounds.max[0];
const propFace = prop.matrix[12] + prop.bounds.min[0];
assert(Math.abs(propFace - inputFront) < .001, 'Propeller shaft and input flange must meet within 1 mm.');
assert(e30 ? Math.abs(nodes.get(leftHub).matrix[14] - nodes.get(rightHub).matrix[14] + 1.415) < 1e-6 : true, 'BMW 325i handbook rear track');
assert.deepEqual(prop.matrix.slice(13, 15), flange.matrix.slice(13, 15), 'Propeller shaft and input flange centerlines');

const built = new Map();
const templates = new Map();
buildRearFinalDrive(series, anchors, (key, name, point, draw, group, numbers = [], internal = false, orientation = 1, templateKey = key) => {
  const id = ids[key] ?? series + 'rear:' + key;
  const existing = nodes.get(id);
  if (existing?.assetId === asset.id) for (const meshName of existing.meshNames) {
    const object = scene.getObjectByName(meshName);
    assert(object, meshName);
    object.removeFromParent();
  }
  if (!templates.has(templateKey)) {
    const part = new Group();
    part.name = 'rear_final_drive_' + templateKey.replaceAll('-', '_');
    draw(part);
    compactPart(part);
    for (const mesh of part.children) {
      const points = mesh.geometry.getAttribute('position').array;
      for (let i = 0; i < points.length; i++) points[i] = Math.round(points[i] * 65536) / 65536;
    }
    templates.set(templateKey, { meshName: part.name, bounds: new Box3().setFromObject(part, true) });
    scene.add(part);
  }
  const { meshName, bounds } = templates.get(templateKey);
  const matrix = new Matrix4().makeRotationFromQuaternion(partTransform(new Group(), orientation).quaternion).setPosition(...point);
  assert(!bounds.isEmpty(), id);
  built.set(key, { matrix, bounds });
  const { page, items } = catalogPages.get(group);
  const positions = items.filter(row => numbers.includes(row.number)).map(({ id, number, partId }) => ({ id, number, partId, assemblyId: page.id }));
  assert(numbers.every(number => positions.some(position => position.number === number)), id + ' catalog number');
  const reference = positions.length === 1 ? positions[0] : undefined;
  const sourceContext = reference ? { contextId: catalog.context.id, assemblyId: page.id, positionId: reference.id } : undefined;
  const axle = group === 'shaft' || group === 'hub';
  const manual = axle ? manuals.shaft : manuals.final;
  const guideIds = existing?.guideIds ?? [];
  const mount = group === 'carrier' && key !== 'carrier';
  nodes.set(id, {
    ...existing, id, name, kind: existing?.kind ?? 'part', parentId: existing?.parentId ?? parent,
    assetId: asset.id, meshNames: [meshName], matrix: matrix.toArray(),
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    systemIds: [...new Set([...(existing?.systemIds ?? []), 'system:differential', 'system:rear-suspension'])],
    internal, displayDirection: axle || key.endsWith('-output') ? [0, -.14, point[2] < 0 ? -.57 : .57] : [mount ? .30 : -.41, -.40, .18],
    oem: reference?.number ?? null, canonicalId: reference?.partId ?? null, thumbnail: existing?.thumbnail ?? null,
    sourceContext, guideIds,
  });
  catalog.bindings[id] = {
    nodeId: id, title: name, kind: reference ? 'component' : 'reference',
    assemblyIds: [page.id], positions, guideIds,
    manual: [{ ...manual, pdf: manual.page, href: (e30 ? '/e30' : '') + '/manual/' + manual.chapter + '?pdf=' + manual.page, guides: guideIds }],
    note: key.endsWith('-output') ? '86 mm bolt circle for six M10 fasteners. Match the final drive fitted to the car.' :
      internal ? 'Illustrative Type 188 internal geometry. Use BMW setup data for backlash and bearing preload.' : '',
    visualSources: [{ title: 'BMW ' + page.title, url: page.sourceUrl }],
  };
});

const measured = [];
for (const side of ['left', 'right']) {
  const axle = built.get(side + '-axle');
  const face = new Vector3(0, 0, 0).applyMatrix4(axle.matrix);
  const hub = new Vector3().fromArray(anchors.hubs[side].inboard);
  const outerId = side + (e30 ? '-stub' : '-hub-flange');
  const hubFace = new Vector3().setFromMatrixPosition(built.get(outerId).matrix);
  assert(hubFace.distanceTo(hub) < 1e-6, side + ' hub registration');
  const outer = hub.clone().applyMatrix4(axle.matrix.clone().invert());
  assert(outer.x > axle.bounds.min.x && outer.x < axle.bounds.max.x, side + ' wheel-side lateral offset');
  assert(outer.y > axle.bounds.min.y && outer.y < axle.bounds.max.y, side + ' wheel-side vertical offset');
  assert(face.distanceTo(new Vector3().setFromMatrixPosition(built.get(side + '-output').matrix)) < 1e-6, side + ' flange registration');
  assert(Math.abs(axle.bounds.min.z) < .001 && Math.abs(axle.bounds.max.z - outer.z) < .001, side + ' visible axle face alignment');
  for (let index = 1; index <= 6; index++) {
    const bolt = new Vector3().setFromMatrixPosition(built.get(side + '-inner-bolt-' + index).matrix);
    assert(Math.abs(bolt.distanceTo(face) - outputPitchRadius) < 1e-6, side + ' output PCD');
    if (!e30) {
      const bolt = new Vector3().setFromMatrixPosition(built.get(side + '-outer-bolt-' + index).matrix);
      assert(Math.abs(bolt.distanceTo(hub) - outputPitchRadius) < 1e-6, side + ' wheel-side CV bolt circle');
    }
  }
  measured.push({ side, flangeToHubMm: +(face.distanceTo(hub) * 1000).toFixed(2), inboard: face.toArray(), hub: hub.toArray() });
}
const raw = Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true }));
const bytes = await compressGeometryGlb(raw);
const assetSha = sha(bytes);
Object.assign(asset, { bytes: bytes.length, sha256: assetSha, url: urlPrefix + assetSha + '.glb' });
model.nodes = [...nodes.values()];
model.revision = catalog.modelRevision = revision;
catalog.coverage.renderable = model.nodes.filter(node => node.assetId).length;
catalog.coverage.bound = Object.values(catalog.bindings).filter(binding => binding.assemblyIds.length).length;
catalog.coverage.withCandidates = Object.values(catalog.bindings).filter(binding => binding.positions.length).length;
const { parseReference } = await localReferenceTools();
parseReference(model);

const manifest = Buffer.from(JSON.stringify(model));
const sha256 = sha(manifest);
const release = {
  ...pin, revision, sha256, manifestUrl: urlPrefix + 'manifest.' + sha256 + '.json',
  renderableCount: catalog.coverage.renderable,
  assetBytes: model.assets.reduce((total, asset) => total + asset.bytes, 0),
};
const archives = candidates.filter(entry => pinOf(entry).revision < revision);
await immutable(localPath(asset.url), bytes);
await immutable(localPath(release.manifestUrl), manifest);
await replaceJson(receiptPath, e30 ? { ...release, archives } : {
  release, archives, files: [asset, { url: release.manifestUrl, sha256 }].map(asset => ({
    url: asset.url, file: nameOf(asset.url), sha256: asset.sha256,
  })),
});
console.log(series + ' r' + revision, { assetBytes: release.assetBytes, propFaceGapMm: +((propFace - inputFront) * 1000).toFixed(3), halfshafts: measured });
