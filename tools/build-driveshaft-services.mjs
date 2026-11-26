import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Matrix4 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { siteContent } from '../scripts/site-content.mjs';
import { compressGeometryGlb } from './geometry/compress-glb.mjs';
import { buildDriveshaft } from './geometry/driveshaft-service.mjs';
import { compactPart } from './geometry/local-cabin-glb.mjs';
import { immutable, localReferenceTools, nameOf, readJson, replaceJson, sha } from './geometry/local-reference-review.mjs';

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
const pin = await readJson('data/digital-twin/' + (e30 ? 'e30-candidate' : '525i-service-release') + '.json');
const revision = pin.revision + 1;
const urlPrefix = '/models/' + series + '-lore/r' + revision + '/';
const diskPath = url => directory + (e30 ? url : '/' + nameOf(url));

async function verified(url, digest) {
  const bytes = await fs.readFile(content.publicDir + url);
  assert.equal(sha(bytes), digest, url);
  return bytes;
}

const model = JSON.parse(await verified(pin.manifestUrl, pin.sha256));
const catalog = model.catalog;
const nodes = new Map(model.nodes.map(node => [node.id, node]));
const parent = e30 ? 'e30assembly:propeller' : 'e34sys:driveshaft';
const stable = e30 ? {
  'front-section': 'e30assembly:propeller:front-section',
  'rear-section': 'e30assembly:propeller:rear-section',
  'flex-disc': 'e30assembly:propeller:flex-disc',
  'center-mount': 'e30assembly:propeller:center-mount',
  'output-flange': 'e30assembly:gearbox:output-flange',
} : {
  'front-section': 'e34sys:propeller-shaft',
  'flex-disc': 'e34sys:flexible-drive-coupling',
  'center-mount': 'e34sys:center-bearing',
  'bearing': 'e34sys:center-bearing-insert',
  'output-flange': 'e34auto:output-flange',
};
const assemblyId = {
  e30: { mount: 'catalog-assembly-4d31d64f7b548d258aded37f', shaft: 'catalog-assembly-36b3e445c4a75ded0f693ed2', shield: 'catalog-assembly-33e946cd66525ec3676d11e4' },
  e34: { mount: 'catalog-assembly-2c65f0c62b59f989ca691ff5', shaft: 'catalog-assembly-1bf97b3f6762a74b8fac68cc' },
}[series];
const pages = new Map();
for (const [key, id] of Object.entries(assemblyId)) {
  const page = catalog.assemblies[id];
  assert(page, id);
  pages.set(key, { page, items: JSON.parse(await verified(page.url, page.sha256)).items });
}
const catalogSource = e30 ? pages.get('mount').page.sourceUrl
  : 'https://www.realoem.com/bmw/enUS/showparts?diagId=26_0085&id=HD63-USA-06-1994-E34-BMW-525i';

const geometryAsset = model.assets.find(asset => asset.id === (e30 ? 'e30:325i-mechanical' : 'authored:525i-mechanical-detail'));
assert(geometryAsset);
const { scene } = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(Uint8Array.from(await verified(geometryAsset.url, geometryAsset.sha256)).buffer, '');
const reference = (chapter, page, printed, title) => ({
  chapter, page, pdf: page, printed, title,
  href: (e30 ? '/e30' : '') + '/manual/' + chapter + '?pdf=' + page,
});
const supportManual = e30 ? reference('26', 466, '26-10', 'BMW · Center mount replacement')
  : reference('260', 267, '260-7', 'Bentley · Center support and flex disc');
const discManual = e30 ? reference('26', 459, '26-6', 'BMW · Flex disc replacement')
  : supportManual;
const removalManual = e30 ? reference('26', 454, '26-3', 'BMW · Driveshaft removal') : reference('260', 264, '260-4', 'Bentley · Driveshaft removal');

const built = new Map();
buildDriveshaft(series, (key, name, point, draw, numbers = [], pageKey = 'mount', internal = false) => {
  const id = stable[key] ?? series + 'shaft:' + key;
  const existing = nodes.get(id);
  if (existing?.assetId === geometryAsset.id) {
    for (const name of existing.meshNames) {
      const mesh = scene.getObjectByName(name);
      assert(mesh, name);
      mesh.removeFromParent();
    }
  }
  const part = new Group();
  part.name = 'driveshaft_' + key.replaceAll('-', '_');
  draw(part);
  compactPart(part);
  for (const mesh of part.children) {
    const points = mesh.geometry.getAttribute('position').array;
    for (let i = 0; i < points.length; i++) points[i] = Math.round(points[i] * 65536) / 65536;
  }
  const bounds = new Box3().setFromObject(part, true);
  assert(!bounds.isEmpty(), id);
  scene.add(part);
  built.set(key, { point, bounds });
  const systemIds = [...new Set([...(existing?.systemIds ?? []), 'system:driveshaft'])];
  const previousBinding = catalog.bindings[id];
  const page = pages.get(pageKey);
  const rows = page?.items.filter(item => numbers.includes(item.number)) ?? [];
  assert(numbers.every(number => rows.some(item => item.number === number)), id + ' catalog number');
  const positions = rows.map(({ id, number, partId }) => ({ id, number, partId, assemblyId: page.page.id }));
  const verifiedPosition = positions.length === 1 && !(key === 'flex-disc' && !e30) ? positions[0] : undefined;
  const sourceContext = verifiedPosition ? {
    contextId: catalog.context.id, assemblyId: verifiedPosition.assemblyId, positionId: verifiedPosition.id,
  } : existing?.sourceContext;
  const keepExisting = numbers.length === 0 && key === 'output-flange' && previousBinding;
  const guideIds = [...new Set([...(existing?.guideIds ?? []), ...(e30 && ['center-mount', 'bearing'].includes(key) ? ['e30-driveshaft-center-support'] : [])])];
  nodes.set(id, {
    ...existing, id, name, kind: existing?.kind ?? 'part', parentId: existing?.parentId ?? (key === 'bearing' ? stable['center-mount'] : parent),
    assetId: geometryAsset.id, meshNames: [part.name], matrix: new Matrix4().setPosition(...point).toArray(),
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, systemIds,
    internal, displayDirection: key === 'tunnel-shield' ? [0, -.62, .26] : [.23, -.22, point[2] < 0 ? -.19 : .19],
    oem: verifiedPosition?.number ?? existing?.oem ?? null, canonicalId: verifiedPosition?.partId ?? existing?.canonicalId ?? null,
    thumbnail: existing?.thumbnail ?? null, guideIds, sourceContext,
  });
  if (keepExisting) return;
  const firstManual = key === 'flex-disc' ? discManual : key === 'tunnel-shield' ? removalManual : supportManual;
  const manual = { ...firstManual, guides: guideIds };
  catalog.bindings[id] = {
    nodeId: id, title: name, kind: verifiedPosition ? 'component' : 'reference',
    assemblyIds: page ? [page.page.id] : [], positions, guideIds, manual: [manual],
    note: !e30 && key === 'flex-disc' ? 'The 96 mm disc follows BMW diagram 26_0085 for the U.S. automatic. Match the fitted flange and bolt size.' : '',
    visualSources: page ? [{ title: 'BMW ' + page.page.title, url: pageKey === 'mount' ? catalogSource : page.page.sourceUrl }] : [],
  };
});

const support = built.get('center-mount');
const bearing = built.get('bearing');
assert.deepEqual(support.point, bearing.point, 'Bearing and rubber mount must share an axis.');
assert(Math.abs(bearing.bounds.max.y - bearing.bounds.min.y - .055) < .0001, 'Bearing diameter');
const flex = built.get('flex-disc');
const output = built.get('output-flange');
assert(Math.abs(output.point[0] - flex.point[0] - flex.bounds.max.x) < .003, 'The gearbox flange must meet the disc face.');
const raw = Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true }));
const bytes = await compressGeometryGlb(raw);
const assetSha = sha(bytes);
Object.assign(geometryAsset, { bytes: bytes.length, sha256: assetSha, url: urlPrefix + assetSha + '.glb' });
model.nodes = [...nodes.values()];
model.revision = catalog.modelRevision = revision;
catalog.coverage.renderable = model.nodes.filter(node => node.assetId).length;
catalog.coverage.bound = Object.values(catalog.bindings).filter(binding => binding.assemblyIds.length).length;
catalog.coverage.withCandidates = Object.values(catalog.bindings).filter(binding => binding.positions.length).length;
const { parseReference } = await localReferenceTools();
try {
  parseReference(model);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const manifest = Buffer.from(JSON.stringify(model));
const sha256 = sha(manifest);
const release = {
  ...pin,
  revision,
  sha256,
  manifestUrl: urlPrefix + 'manifest.' + sha256 + '.json',
  renderableCount: catalog.coverage.renderable,
  assetBytes: model.assets.reduce((total, asset) => total + asset.bytes, 0),
};
const previous = await readJson(receiptPath);
const archives = previous.archives ?? [];
await immutable(diskPath(geometryAsset.url), bytes);
await immutable(diskPath(release.manifestUrl), manifest);
await replaceJson(receiptPath, e30 ? { ...release, archives } : {
  release, archives, files: [geometryAsset, { url: release.manifestUrl, sha256 }].map(asset => ({
    url: asset.url, file: nameOf(asset.url), sha256: asset.sha256,
  })),
});
console.log(series + ' r' + revision + ': ' + release.renderableCount + ' parts, ' + release.assetBytes + ' geometry bytes');
