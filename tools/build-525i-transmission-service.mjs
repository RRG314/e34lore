import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Raycaster, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { siteContent } from '../scripts/site-content.mjs';
import { build525iSump } from './geometry/525i-transmission-sump.mjs';
import { compressGeometryGlb } from './geometry/compress-glb.mjs';
import { compactPart } from './geometry/local-cabin-glb.mjs';
import { immutable, localReferenceTools, nameOf, readJson, replaceJson, sha } from './geometry/local-reference-review.mjs';

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};

const content = siteContent();
assert(content.release, 'Set E34_ASSET_PACK to the retained Workshop asset pack.');
const base = await readJson('data/digital-twin/525i-service-release.json');
const revision = 1047;
assert.equal(base.revision, 1046);
const directory = 'work/525i-service-candidate';
const prefix = '/models/e34-lore/r' + revision + '/';
const verified = async (url, hash) => {
  const bytes = await fs.readFile(content.publicDir + url);
  assert.equal(sha(bytes), hash, url);
  return JSON.parse(bytes);
};
const model = await verified(base.manifestUrl, base.sha256);
const catalog = model.catalog;
const assemblyId = 'catalog-assembly-7e5418c6bc4e318f12bd131c';
const assembly = catalog.assemblies[assemblyId];
const listing = await verified(assembly.url, assembly.sha256);
const items = new Map(listing.items.map(item => [item.number, item]));
const matrix = model.nodes.find(n => n.id === 'e34auto:case').matrix;
const root = new Group();
const assetId = 'authored:525i-sump-service';

build525iSump((key, name, number, draw, parent = 'case', internal = false) => {
  const id = 'e34auto:' + key;
  const item = number ? items.get(number) : null;
  assert(!number || item, 'Missing catalog position for ' + id);
  const group = new Group();
  group.name = 'sump_' + key;
  draw(group);
  compactPart(group);
  root.add(group);
  group.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(group, true);
  assert(!bounds.isEmpty(), id);
  const node = {
    id, name, parentId: 'e34auto:' + parent, kind: 'component',
    systemIds: ['system:transmission', 'system:automatic-gearbox'], assetId, meshNames: [group.name],
    matrix, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    internal, canonicalId: item?.partId ?? null, oem: number, guideIds: [], thumbnail: null,
    sourceContext: { contextId: assembly.contextId, assemblyId, ...(item && { positionId: item.id }) },
    gearbox: { section: key === 'pan-main', ...(['pan-main-gasket', 'pan-mating-face'].includes(key) && { hideInCutaway: true }),
      spread: key.startsWith('strainer') ? [-.34,-.35,0] : [-.34,-.45,0] },
  };
  const existing = model.nodes.findIndex(n => n.id === id);
  if (existing < 0) model.nodes.push(node);
  else model.nodes[existing] = { ...model.nodes[existing], ...node };
  const originalManual = catalog.bindings['e34auto:pan-main'].manual;
  catalog.bindings[id] = {
    nodeId: id, title: name, kind: item ? 'component' : 'supplied-with',
    note: key.startsWith('pan-bolt-')
      ? 'Sixteen fasteners on the main pan. Catalog callout 05 includes the fasteners for both pans.'
      : 'A4S 310R reference. Profile and installed dimensions are approximate.',
    assemblyIds: [assemblyId],
    positions: item ? [{ id: item.id, number, partId: item.partId, assemblyId }] : [],
    manual: originalManual, guideIds: [],
    visualSources: [{ title: 'BMW oil pan and strainer · plate 24_1299', url: assembly.sourceUrl },
      ...(key === 'strainer' ? [{ title: 'Raybestos strainer reference photos', url: 'https://www.raybestospowertrain.com/filters/515836' }] : [])],
  };
});

// Each fastener must pass through matching modeled holes at its installed seat.
for (const [assembly, quantity, seats, y] of [
  ['pan-bolt-', 16, ['pan-main', 'pan-main-gasket', 'pan-mating-face'], -.108],
  ['strainer-bolt-', 3, ['strainer'], -.115],
]) {
  for (let i = 1; i <= quantity; i++) {
    const fastener = root.getObjectByName('sump_' + assembly + i);
    const center = new Box3().setFromObject(fastener).getCenter(new Vector3());
    const ray = new Raycaster(new Vector3(center.x, y, center.z), new Vector3(0, -1, 0), 0, .044);
    for (const id of seats) {
      assert.equal(ray.intersectObject(root.getObjectByName('sump_' + id)).length, 0,
        id + ' obstructs ' + assembly + i);
    }
  }
}

const data = await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(root, { binary: true })));
const sha256 = sha(data);
const asset = { id: assetId, url: prefix + sha256 + '.glb', bytes: data.length, sha256 };
model.assets.push(asset);
model.revision = revision;
catalog.modelRevision = revision;
const renderableCount = model.nodes.filter(node => node.assetId).length;
catalog.coverage.renderable = renderableCount;
catalog.coverage.bound = Object.values(catalog.bindings).filter(binding=>binding.assemblyIds.length).length;
catalog.coverage.withCandidates = Object.values(catalog.bindings).filter(binding=>binding.positions.length).length;
const { parseReference } = await localReferenceTools();
try {
  parseReference(model);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
assert.equal(model.nodes.filter(node => node.id.startsWith('e34auto:pan-bolt-')).length, 16);
assert.equal(model.nodes.filter(node => node.id.startsWith('e34auto:strainer-bolt-')).length, 3);

const manifest = Buffer.from(JSON.stringify(model));
const hash = sha(manifest);
const release = { ...base, revision, sha256: hash, manifestUrl: prefix + 'manifest.' + hash + '.json',
  assetBytes: model.assets.reduce((sum, entry) => sum + entry.bytes, 0), renderableCount };
const files = [
  { url: asset.url, file: nameOf(asset.url), sha256, data },
  { url: release.manifestUrl, file: nameOf(release.manifestUrl), sha256: hash, data: manifest },
];
for (const file of files) await immutable(directory + '/' + file.file, file.data);
await replaceJson(directory + '/fit-review.json', { release, files: files.map(({data, ...file}) => file) });
console.log('Built revision ' + revision + ' · sump asset ' + Math.round(data.length / 1024) + ' KB');
