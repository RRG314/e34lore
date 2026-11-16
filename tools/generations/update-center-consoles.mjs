import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Matrix4, Raycaster, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { e30Console, e34Console } from '../geometry/center-console.mjs';
import { compactPart } from '../geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from '../geometry/compress-glb.mjs';
import { immutable, localReferenceTools, readJson, replaceJson, sha } from '../geometry/local-reference-review.mjs';

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};

const data = 'data/digital-twin/';
const archivePath = data + 'workshop-panel-archives.json';
const archives = await readJson(archivePath);
const { parseReference, visibleNodes, defaultView } = await localReferenceTools();
const originals = new Map();
const systems = ['system:center-console', 'system:interior'];
const switches = 'catalog-assembly-6e2038dd59f38122005fd088';
const e34Partition = 'catalog-assembly-ea8e987ab9cc3c17756ce8d9';
const e30Shift = 'catalog-assembly-80d4f2cd81a53684520de553';
const e34Sources = [
  { title: '1995 BMW 525i cabin photos', url: 'https://bringatrailer.com/listing/1995-bmw-525i-22/' },
  { title: 'BMW 1995 electrical troubleshooting manual · A4S 310R', url: 'https://shark.armchair.mb.ca/~dave/BMW/e34/e34_95.pdf' },
  { title: 'OEM rear console 51168181940 · detached part views', url: 'https://www.ebay.com/itm/314369960736' },
  { title: 'OEM front console 51161973683 · detached part views', url: 'https://www.schmiedmann.dk/da/bmw-E34/2036680-brugt?produkt=A63838' },
];
const e30ManualPhoto = { title: '1991 BMW 325i Coupe cabin photos', url: 'https://bringatrailer.com/listing/1991-bmw-325i-coupe/' };
const e30AutomaticPhoto = { title: '1991 BMW 325iX · four-speed automatic selector photo', url: 'https://www.ronsusser.com/inventory/listing/1991-bmw-325ix-e30-pristine-condition-turnkey-mint-example/' };

async function geometry(series, automatic, revision) {
  const scene = new Group(), parts = new Map();
  function part(id, draw) {
    const group = new Group();
    group.name = id.replaceAll(/[^a-z0-9]/gi, '_');
    draw(group);
    compactPart(group);
    scene.add(group);
    const bounds = new Box3().setFromObject(group, true);
    assert(!bounds.isEmpty() && bounds.min.y >= .39 && bounds.max.y < .85, id);
    parts.set(id, { meshNames: [group.name], bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } });
  }
  if (series === 'e34') e34Console(part);
  else e30Console(part, automatic);
  scene.updateMatrixWorld(true);

  // Shoot down through the fitted shifter and brake recesses. The first hit
  // must be part of the insert, with space between it and the surrounding deck.
  const samples = series === 'e34'
    ? [[.205, -.026, 'e34trim:selector-bezel'], [-.330, -.025, 'e34trim:parking-brake-finisher'],
      [-.518, .065, 'e34trim:rear-console-tray']]
    : [[.157, 0, automatic ? 'e30assembly:cabin-floor:auto-selector' : 'e30assembly:cabin-floor:shifter'],
      [-.330, -.010, 'e30trim:parking-brake-finisher'], [-.498, .052, 'e30trim:rear-console-tray']];
  for (const [x, z, id] of samples) {
    const ray = new Raycaster(new Vector3(x, 1, z), new Vector3(0, -1, 0));
    const first = ray.intersectObject(scene, true)[0];
    assert.equal(first?.object.parent.name, parts.get(id).meshNames[0], `Incorrect trim at ${id}`);
  }

  const bytes = await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true })));
  const sha256 = sha(bytes);
  const url = '/models/' + series + '-lore/r' + revision + '/' + sha256 + '.glb';
  assert(bytes.length < 330_000, 'Console geometry grew past its budget');
  return { bytes, parts, asset: { id: series + ':center-console', url, sha256, bytes: bytes.length } };
}

async function revise(active, previousRevision, revision, replacement) {
  const pin = [active, ...archives].find(item => item.id === active.id && item.revision === previousRevision);
  assert(pin, 'The console requires its original cabin revision');
  originals.set(pin.id, pin);
  const raw = await fs.readFile('public' + pin.manifestUrl);
  assert.equal(sha(raw), pin.sha256);
  const model = JSON.parse(raw);
  const { catalog, nodes } = model;
  const e34 = pin.id.startsWith('e34-'), automatic = pin.transmission === 'Automatic';
  const existing = new Map(nodes.map(node => [node.id, node]));
  const consoleId = e34 ? 'e34trim:center-console' : 'e30trim:front-console';

  async function binding(id, name, parentId, assemblyId, number, displayDirection, note = '') {
    const assembly = catalog.assemblies[assemblyId];
    const position = number && (await readJson('public' + assembly.url)).items.find(row => row.number === number);
    assert(!number || position, 'Missing source position for ' + id);
    const sourceContext = { contextId: catalog.context.id, assemblyId, ...(position ? { positionId: position.id } : {}) };
    const settings = { name, parentId, displayDirection, sourceContext,
      canonicalId: position ? position.partId : null, oem: number || null };
    if (existing.has(id)) Object.assign(existing.get(id), settings, { systemIds: systems });
    else {
      const node = { id, kind: 'part', ...settings, systemIds: systems, internal: false, guideIds: [], thumbnail: null };
      existing.set(id, node);
      nodes.push(node);
    }
    const previous = catalog.bindings[id];
    catalog.bindings[id] = {
      nodeId: id, title: name, kind: position ? 'component' : 'reference', note, assemblyIds: [assemblyId],
      positions: position ? [{ id: position.id, partId: position.partId, number, assemblyId }] : [],
      manual: previous?.manual ?? assembly.manual ?? [],
      guideIds: previous?.guideIds ?? [],
      visualSources: [{ title: 'BMW ' + assembly.title + ' diagram', url: assembly.sourceUrl }, ...(previous?.visualSources ?? [])],
    };
  }

  if (e34) {
    const front = 'e34trim:storing-partition';
    await binding(front, 'Front console and storage partition', consoleId, e34Partition, '51161973683', [.55, .78, .37],
      'Black front molding for the factory wood-trim configuration.');
    await binding('e34trim:selector-surround', 'Walnut selector surround', front, e34Partition, null, [.20, .83, .66]);
    for (const id of ['e34sys:gear-lever', 'e34trim:front-ashtray-frame', 'e34trim:console-support']) {
      existing.get(id).parentId = front;
    }
    existing.get('e34trim:selector-bezel').parentId = 'e34trim:selector-surround';
    catalog.bindings[front].visualSources.push(e34Sources[3]);
    const hazard = 'e34trim:hazard-switch', program = 'e34trim:program-switch', windows = 'e34trim:window-switches';
    await binding(hazard, 'Hazard warning switch', front, switches, '61311374220', [.08, .86, .7]);
    await binding(program, 'Automatic transmission program switch', front, switches, null, [.22, .92, -.53],
      'A/M layout for the A4S 310R. Check the installed switch and gearbox before ordering.');
    await binding(windows, 'Power window switch assembly', front, switches, '61311379075', [-.24, .90, .49]);
    catalog.bindings[program].visualSources.push(e34Sources[1]);
    catalog.bindings[consoleId].visualSources.push(e34Sources[0], e34Sources[2]);
    catalog.bindings['e34trim:selector-bezel'].visualSources.push(e34Sources[1]);
  } else {
    await binding('e30trim:rear-console-tray', 'Rear storage recess', 'e30assembly:cabin-floor:console',
      'catalog-assembly-a648f3d069f63bbb3a1ef029', null, [-.64, .76, .3], 'Molded into the rear console.');
    await binding('e30trim:cigarette-lighter', 'Front cigarette lighter', consoleId,
      'catalog-assembly-3d787d15077fcc573f2f9993', '61341367689', [.66, .74, -.4]);
    catalog.bindings[consoleId].visualSources = [...(catalog.bindings[consoleId].visualSources ?? []), e30ManualPhoto];
    if (automatic) {
      const selector = 'e30assembly:cabin-floor:auto-selector';
      await binding(selector, 'Automatic selector cover and indicator', consoleId, e30Shift, null, [.28, .86, .45]);
      await binding('e30trim:automatic-lever', 'Automatic selector lever and leather grip', selector,
        e30Shift, '25161216464', [.13, .97, -.2], 'Leather grip shown. The catalog also lists other handle finishes.');
      catalog.bindings[selector].visualSources.push(e30AutomaticPhoto);
    } else {
      const knob = catalog.bindings['e30trim:manual-shift-knob'];
      knob.visualSources = [...(knob.visualSources ?? []), e30ManualPhoto];
    }
  }

  for (const [id, part] of replacement.parts) {
    const node = existing.get(id);
    assert(node, 'Missing console node ' + id);
    Object.assign(node, part, { assetId: replacement.asset.id, matrix: new Matrix4().toArray(), cabinVisible: true });
  }
  model.assets.push(replacement.asset);
  model.revision = catalog.modelRevision = revision;
  const rendered = nodes.filter(node => node.assetId);
  Object.assign(catalog.coverage, {
    renderable: rendered.length,
    bound: rendered.filter(node => catalog.bindings[node.id]).length,
    withCandidates: rendered.filter(node => catalog.bindings[node.id]?.positions.length).length,
  });
  const parsed = parseReference(model);
  const views = [
    { ...defaultView(), cabin: 'driver' },
    { ...defaultView(), scope: 'system:center-console', explosion: 4 },
  ];
  for (const view of views) {
    const visible = new Set(visibleNodes(parsed, view).map(node => node.id));
    for (const id of replacement.parts.keys()) assert(visible.has(id), 'Console part is absent from its view: ' + id);
  }

  const bytes = Buffer.from(JSON.stringify(model)), sha256 = sha(bytes);
  const prefix = '/models/' + (e34 ? 'e34' : 'e30') + '-lore/r' + revision + '/';
  const manifestUrl = prefix + 'manifest.' + sha256 + '.json';
  await immutable('public' + replacement.asset.url, replacement.bytes);
  await immutable('public' + manifestUrl, bytes);
  return { ...pin, revision, manifestUrl, sha256, renderableCount: rendered.length,
    assetBytes: model.assets.reduce((sum, asset) => sum + asset.bytes, 0) };
}

const e34 = await geometry('e34', true, 1045);
const manual = await geometry('e30', false, 1185);
const automatic = await geometry('e30', true, 1186);
const e34Pin = data + '525i-service-release.json', manualPin = data + 'e30-candidate.json', variantsPin = data + 'e30-vehicle-references.json';
const [e34Base, manualBase, [automaticBase, spoilerBase]] = await Promise.all([e34Pin, manualPin, variantsPin].map(readJson));
const nextE34 = await revise(e34Base, 1044, 1045, e34);
const nextManual = await revise(manualBase, 1182, 1185, manual);
const nextAutomatic = await revise(automaticBase, 1183, 1186, automatic);
const nextSpoiler = await revise(spoilerBase, 1184, 1187, manual);
for (const pin of originals.values()) {
  if (!archives.some(entry => entry.id === pin.id && entry.revision === pin.revision)) archives.push(pin);
}
await replaceJson(archivePath, archives);
await replaceJson(e34Pin, nextE34);
await replaceJson(variantsPin, [nextAutomatic, nextSpoiler]);
await replaceJson(manualPin, nextManual);
