/** Assemble the next immutable Workshop references from the approved models. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { appendGeometry, compactPart } from './geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from './geometry/compress-glb.mjs';
import { cutCabinOpenings } from './geometry/cut-cabin-openings.mjs';
import { fuelDoorFit } from './geometry/fuel-door-fit.mjs';
import { immutable, localReferenceTools, readJson, replaceJson, sha } from './geometry/local-reference-review.mjs';
import { rearDoorCard } from './geometry/rear-door-card.mjs';

const identity = new Matrix4().toArray();
const zero = [0,0,0], up = [0,1,0], lateral = [0,0,1];
const shared = 'data/digital-twin/';
const { parseReference } = await localReferenceTools();
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
};
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .register(() => ({ name: 'inspect-workshop-geometry', loadMaterial: async () => new MeshStandardMaterial() }));
async function scene(bytes) {
  const { scene, parser } = await loader.parseAsync(Uint8Array.from(bytes).buffer, '');
  scene.updateMatrixWorld(true);
  return { scene, associations: parser.associations };
}
const worldBounds = node => new Box3(new Vector3(...node.bounds.min), new Vector3(...node.bounds.max))
  .applyMatrix4(new Matrix4().fromArray(node.matrix));
const localBounds = object => {
  const { min, max } = new Box3().setFromObject(object);
  return { min: min.toArray(), max: max.toArray() };
};
const read = async pin => {
  const bytes = await fs.readFile('public' + (pin.manifestUrl ?? pin.url));
  assert.equal(sha(bytes), pin.sha256);
  return bytes;
};
const archivePath = shared + 'workshop-panel-archives.json';
const archive = await readJson(archivePath);
const paths = ['525i-service-release','public-reference','vehicle-references','e30-candidate'];
const oldPins = new Map();
const initial = new Set([1042,14,15,16,17,18,19,20,21,22,1159]);
for (const path of paths) {
  const pins = [await readJson(shared + path + '.json')].flat();
  oldPins.set(path, pins.map(pin => {
    if (initial.has(pin.revision)) return pin;
    const prior = archive.find(p => p.id === pin.id && initial.has(p.revision));
    assert(prior, pin.id);
    return prior;
  }));
}
const detailed = JSON.parse(await read(oldPins.get(paths[0])[0]));
const baseBodyId = 'assembled:body-v7';
const detailedBody = detailed.assets.find(asset => asset.id === baseBodyId);
const legacyRoof = JSON.parse(await read(oldPins.get(paths[1])[0])).nodes.find(node => node.id === 'e34body:roof');
const sedanRoof = detailed.nodes.find(node => node.id === 'e34body:roof');
const correctedCards = new Group();
const rearCards = [];
for (const [side, sign] of [['left',-1],['right',1]]) {
  const geometry = rearDoorCard(sign);
  geometry.name = 'e34_rear_door_card_' + side;
  compactPart(geometry);
  correctedCards.add(geometry);
  rearCards.push({ id: sign < 0 ? 'e34sys:door-card-rear-1' : 'e34sys:door-card-rear--1', side, geometry });
}
async function exportGroup(group) {
  return compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(group, { binary:true })));
}
async function addAsset(model, revision, id, bytes) {
  const digest = sha(bytes), series = model.id.slice(0,3);
  const url = `/models/${series}-lore/r${revision}/${digest}.glb`;
  await immutable('public' + url, bytes);
  const asset = { id, url, sha256:digest, bytes:bytes.length };
  const index = model.assets.findIndex(existing => existing.id === id);
  if (index === -1) model.assets.push(asset);
  else model.assets[index] = asset;
  return asset;
}
function assignCard(model, card, assetId, parentId) {
  const existing = model.nodes.find(node => node.id === card.id);
  const source = existing ?? detailed.nodes.find(node => node.id === card.id);
  const node = {
    ...source, parentId, assetId, matrix:identity, meshNames:[card.geometry.name],
    bounds:localBounds(card.geometry), cabinVisible:true,
  };
  if (!existing) {
    node.sourceContext = undefined;
    node.oem = null;
    node.canonicalId = null;
    node.systemIds = ['system:interior'];
    model.nodes.push(node);
  } else Object.assign(existing, node);
}
const cardBytes = await exportGroup(correctedCards);
const serviceId = 'authored:525i-service-study';
const service = detailed.assets.find(asset => asset.id === serviceId);
const serviceBytes = await appendGeometry(await read(service), cardBytes);
const commonId = 'authored:e34-panel-interior';
const common = new Group();
const { scene:sourceScene } = await scene(await read(service));
const sharedParts = [
  'e34trim:glove-box-door','e34trim:glove-box-bin','e34sys:luggage-floor','e34trim:luggage-floor-carpet',
  'e34trim:spare-wheel','e34trim:spare-wheel-retainer','e34trim:fuel-door-hinge','e34trim:fuel-filler-pocket',
  'e34trim:sunroof-liner','e34trim:sunroof-aperture-finisher','e34sys:headliner','e34trim:trunk-lid-inner','e34trim:trunk-hinge-left','e34trim:trunk-hinge-right',
];
const carryParts = new Map();
for (const id of sharedParts) {
  const node = structuredClone(detailed.nodes.find(node => node.id === id));
  const geometry = sourceScene.getObjectByName(node.meshNames[0]).clone(true);
  geometry.traverse(object => {
    if (!(object instanceof Mesh)) return;
    // Preserve the authored materials from the geometry-only asset.
    const name = object.name;
    const color = /spare-wheel-well|luggage-floor$|hinge|retainer/.test(id) ? '#52595e' : '#2b2c2e';
    object.material = new MeshStandardMaterial({ color, roughness:.84, name });
  });
  common.add(geometry);
  carryParts.set(id, node);
}
for (const card of rearCards) common.add(card.geometry.clone(true));
const commonBytes = await exportGroup(common);
function fitBinding(model, node, titles, chapter) {
  if (!model.catalog || model.catalog.bindings[node.id]) return;
  const assemblies = Object.values(model.catalog.assemblies)
    .filter(assembly => titles.some(title => title.test(assembly.title)));
  model.catalog.bindings[node.id] = {
    nodeId:node.id, title:node.name, kind:'reference', note:'',
    assemblyIds:assemblies.map(assembly => assembly.id), positions:[], guideIds:[],
    manual: chapter ? [{ chapter, page:0, pdf:0, printed:'index', title:'Body and trim service literature', href:'/manual/'+chapter, guides:[] }] : [],
  };
  if (assemblies.length) node.sourceContext = { contextId:model.catalog.context.id, assemblyId:assemblies[0].id };
}
function installShared(model, id, parentId, title, matches, chapter='400') {
  const source = carryParts.get(id);
  const prior = model.nodes.find(node => node.id === id);
  const updated = {
    ...source, id, name:title??source.name, parentId, assetId:commonId,
    systemIds:source.systemIds.filter(system => model.nodes.some(node => node.id === system)),
    sourceContext:prior?.sourceContext, canonicalId:prior?.canonicalId??null, oem:prior?.oem??null,
    guideIds:prior?.guideIds??[], thumbnail:prior?.thumbnail??source.thumbnail,
  };
  if (!updated.systemIds.length) updated.systemIds = ['system:interior'];
  if (prior) Object.assign(prior, updated);
  else model.nodes.push(updated);
  fitBinding(model, prior??updated, matches, chapter);
}
function door(node, label, side, pivot) {
  const bounds = worldBounds(node);
  return { id:node.id, label, pivot:pivot??[bounds.max.x-.045,.56,side*(Math.abs(bounds.max.z+bounds.min.z)/2+.016)],
    axis:up, angle:side*62, slide:zero };
}
function pose(position, target) { return { position, target }; }
function touringTrimTriangles(mesh, node, accept) {
  const { position } = mesh.geometry.attributes, index = mesh.geometry.index;
  const matrix = new Matrix4().fromArray(node.matrix).multiply(mesh.matrixWorld);
  const vertices = new Map(), groups = new Map(), coordinates = new Map();
  const root = id => {
    let parent = id;
    while (parent !== groups.get(parent)) parent = groups.get(parent);
    groups.set(id, parent);
    return parent;
  };
  const join = (a, b) => groups.set(root(a), root(b));
  for (let i = 0; i < index.count; i++) {
    const id = index.getX(i);
    if (groups.has(id)) continue;
    const point = new Vector3().fromBufferAttribute(position,id).applyMatrix4(matrix);
    const key = point.toArray().map(value => Math.round(value * 100000)).join(',');
    groups.set(id, id);
    coordinates.set(id, point);
    if (vertices.has(key)) join(id, vertices.get(key));
    else vertices.set(key, id);
  }
  for (let i = 0; i < index.count; i+=3) {
    join(index.getX(i),index.getX(i+1));
    join(index.getX(i),index.getX(i+2));
  }
  const boxes = new Map();
  for (const [id,point] of coordinates) {
    const key = root(id);
    if (!boxes.has(key)) boxes.set(key, new Box3());
    boxes.get(key).expandByPoint(point);
  }
  const selected = new Set();
  for (let i = 0; i < index.count; i+=3) {
    if (accept(boxes.get(root(index.getX(i))))) selected.add(i);
  }
  return selected;
}
async function touringBody(model, revision, body) {
  let bytes = await read(body);
  const panel = model.nodes.find(node => node.id === 'touring:rear-quarter-right');
  let loaded = await scene(bytes);
  function cut(node, opening, extract) {
    const object = loaded.scene.getObjectByName(node.meshNames[0]);
    let mesh;
    object.traverse(child => { if (child.isMesh) mesh ??= child; });
    return cutCabinOpenings(bytes, node, mesh, [opening], {
      extract, sourceIndex:loaded.associations.get(mesh)?.nodes,
    });
  }
  const fuel = fuelDoorFit(false);
  const extract = 'touring_fuel_filler_flap';
  bytes = cut(panel, fuel.opening, extract);
  loaded = await scene(bytes);
  model.nodes.push({
    ...panel, id:'touring:fuel-door', name:'Fuel filler door', parentId:panel.id, meshNames:[extract],
    bounds:localBounds(loaded.scene.getObjectByName(extract)), canonicalId:null, oem:null, sourceContext:undefined, thumbnail:null,
  });
  const roof = model.nodes.find(node => node.id === 'touring:roof');
  for (const [name, from, to] of [['front',-.618,-.103],['rear',-1.195,-.625]]) {
    const meshName = 'touring_sunroof_' + name;
    bytes = cut(roof, { low:[from,1.343,-.391], high:[to,1.44,.391] }, meshName);
    loaded = await scene(bytes);
    const node = {
      ...roof, id:'touring:sunroof-'+name, name:(name==='front'?'Front':'Rear')+' sunroof panel',
      parentId:roof.id, meshNames:[meshName], bounds:localBounds(loaded.scene.getObjectByName(meshName)),
      canonicalId:null, oem:null, sourceContext:undefined, thumbnail:null,
    };
    model.nodes.push(node);
    fitBinding(model, node, [/sliding roof|sunroof|roof panel/i]);
  }
  // The roof liner is a single part on this donor body. Cut only the headliner
  // plane so the same roof aperture appears from inside.
  const liner = model.nodes.find(node => node.id === 'touring:cabin-lining');
  bytes = cut(liner, { low:[-1.195,1.265,-.391], high:[-.103,1.392,.391] });
  loaded = await scene(bytes);
  const trim = model.nodes.find(node => node.id === 'touring:body-trim');
  const wiperMesh = loaded.scene.getObjectByName(trim.meshNames[0]).getObjectByName('Mesh_0');
  const wiperName = 'touring_rear_window_wiper';
  bytes = cutCabinOpenings(bytes, trim, wiperMesh, [{
    low:[-2.357,.972,-.514], high:[-2.250,1.045,.024],
  }], { extract:wiperName, sourceIndex:loaded.associations.get(wiperMesh)?.nodes });
  const { scene:complete } = await scene(bytes);
  const wiper = {
    ...trim, id:'touring:rear-window-wiper', name:'Rear window wiper arm and blade', parentId:'touring:tailgate-glass',
    meshNames:[wiperName], bounds:localBounds(complete.getObjectByName(wiperName)),
    canonicalId:null, oem:null, sourceContext:undefined, thumbnail:null,
  };
  model.nodes.push(wiper);
  fitBinding(model, wiper, [/single parts for rear window wiper/i], '611');
  // The donor put the glass surround, plate and badges in the fixed trim mesh.
  // Transfer connected islands without changing their UVs or surface finish.
  for (const item of [
    { id:'touring:rear-glass-surround', name:'Rear glass surround', parentId:'touring:tailgate-glass',
      nodes:['Mesh_0','Mesh_3'], title:/trunk lid \/ rear window/i,
      accept:box=>box.min.x< -1.86&&box.max.x< -1.75&&box.min.y>.94&&box.max.y<1.39&&box.getSize(new Vector3()).z>.95 },
    { id:'touring:tailgate-trim', name:'Tailgate trim and badges', parentId:'touring:tailgate',
      nodes:['Mesh_0','Mesh_1','Mesh_2','Mesh_3','Mesh_4','Mesh_5','Mesh_6','Mesh_7','Mesh_8'],
      title:/trim panel, rear trunk \/ trunk lid|trunk lid \/ closing system/i,
      accept:box=>box.min.x< -2.26&&box.max.x< -2.23&&box.min.y>.61&&box.max.y<.91&&
        Math.max(Math.abs(box.min.z),Math.abs(box.max.z))<.623 },
  ]) {
    const meshNames = [];
    for (const name of item.nodes) {
      loaded = await scene(bytes);
      const mesh = loaded.scene.getObjectByName(trim.meshNames[0]).getObjectByName(name);
      const selected = touringTrimTriangles(mesh, trim, item.accept);
      if (!selected.size) continue;
      const extract = item.id.replaceAll(/[:-]/g,'_')+'_'+name;
      bytes = cutCabinOpenings(bytes, trim, mesh, [], {
        extract, sourceIndex:loaded.associations.get(mesh)?.nodes, extractTriangle:index=>selected.has(index),
      });
      meshNames.push(extract);
    }
    assert(meshNames.length, item.id);
    const { scene:trimScene } = await scene(bytes);
    const bounds = new Box3();
    for (const name of meshNames) bounds.union(new Box3().setFromObject(trimScene.getObjectByName(name)));
    const node = { ...trim, id:item.id, name:item.name, parentId:item.parentId, meshNames,
      bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}, canonicalId:null, oem:null, sourceContext:undefined, thumbnail:null };
    model.nodes.push(node);
    fitBinding(model, node, [item.title]);
  }
  await addAsset(model, revision, body.id, bytes);
}
async function make(pin) {
  const revision = pin.revision === 1042 ? 1043 : pin.revision === 1159 ? 1160 : pin.revision + 25;
  const model = JSON.parse(await read(pin));
  const e30 = model.id.startsWith('e30-'), touring = pin.body === 'Touring';
  const find = id => model.nodes.find(node => node.id === id);
  const addPanel = (id, label, pivot, axis, angle, slide=zero, camera, dropBeforeSlide) => ({
    id,label,pivot,axis,angle,slide,...(camera?{camera}:{}),...(dropBeforeSlide?{dropBeforeSlide:true}:{}),
  });

  if (pin.revision === 1042) {
    await addAsset(model, revision, serviceId, serviceBytes);
    for (const card of rearCards) assignCard(model, card, serviceId, find(card.id).parentId);
  } else if (!e30) {
    await addAsset(model, 39, commonId, commonBytes);
    if (!touring) {
      model.assets[model.assets.findIndex(asset => asset.id === baseBodyId)] = detailedBody;
      const roof = find(sedanRoof.id);
      assert.equal(roof.meshNames[0], legacyRoof.meshNames[0]);
      roof.matrix = sedanRoof.matrix;
      roof.bounds = sedanRoof.bounds;
      for (const id of ['e34body:sunroof','e34body:fuel-door']) {
        const source = structuredClone(detailed.nodes.find(node => node.id === id));
        source.systemIds = source.systemIds.filter(system => find(system));
        source.sourceContext = undefined;
        source.canonicalId = null;
        source.oem = null;
        model.nodes.push(source);
      }
    }
    for (const card of rearCards) {
      const parent = touring ? 'touring:rear-door-'+card.side : find(card.id).parentId;
      assignCard(model, card, commonId, parent);
      fitBinding(model, find(card.id), [/door trim, rear/i], '411');
    }
    if (touring) {
      const body = model.assets.find(asset => asset.id.startsWith('assembled:body-touring'));
      await touringBody(model, 46, body);
      for (const side of ['left','right']) find('touring:mirror-'+side).parentId = 'touring:front-door-'+side;
    }
    const fuelDoorId = touring ? 'touring:fuel-door' : 'e34body:fuel-door';
    const cargoId = touring ? 'touring:tailgate' : 'e34body:trunk';
    for (const id of sharedParts) {
      if (touring && /sunroof|headliner|trunk-(?:lid-inner|hinge)/.test(id)) continue;
      const source = carryParts.get(id);
      const parentId = id.includes('fuel-door-hinge') ? fuelDoorId
        : id.includes('fuel-filler-pocket') ? find(fuelDoorId).parentId
        : id.includes('luggage-floor-carpet') ? find('e34sys:luggage-floor').parentId
        : find(source.parentId) ? source.parentId : 'vehicle';
      const titles = /glove/.test(id) ? [/^glove box$/i] : /fuel/.test(id) ? [/side panel \/ tail trim/i]
        : /sunroof/.test(id) ? [/sliding roof|sunroof/i] : [/floor panel trunk|trunk lid/i];
      installShared(model, id, parentId, undefined, titles, /glove/.test(id)?'513':'400');
    }
    fitBinding(model, find(fuelDoorId), [/side panel \/ tail trim/i]);
    if (!touring) fitBinding(model, find('e34body:sunroof'), [/sliding roof|sunroof|roof panel/i]);
    if (touring) fitBinding(model, find(cargoId+ '-glass'), [/trunk lid \/ rear window/i]);
  }

  const prefix = touring ? 'touring:' : e30 ? 'e30body:' : 'e34body:';
  const doorIds = e30 ? ['door-left','door-right'] : ['front-door-left','front-door-right','rear-door-left','rear-door-right'];
  const previous = model.openingPanels??[];
  const doors = doorIds.map(key => {
    const left = key.endsWith('left'), side = left?-1:1;
    const existing = previous.find(panel => panel.id === prefix+key);
    const sideLabel = left ? 'left' : 'right';
    const label = existing?.label ?? (e30 ? (left ? 'Left' : 'Right') + ' door'
      : (key.startsWith('rear') ? 'Rear ' : 'Front ') + sideLabel + ' door');
    const position = !touring&&!e30 ? [key.startsWith('rear')?-.282:.698,.554,side*.821]
      : touring ? [key.startsWith('rear')?-.269:.712,.551,side*.813]
      : [.799,.545,side*.781];
    return door(find(prefix+key),label,side,position);
  });
  const panel = id => previous.find(panel => panel.id === id);
  const hood = panel(prefix+'hood')??addPanel(prefix+'hood','Hood',
    e30?[1.945,.765,0]:[1.99,.772,0],lateral,-55,e30?[.075,.021,0]:[.085,.025,0]);
  const luggage = touring ? addPanel(prefix+'tailgate','Tailgate',[-1.833,1.354,0],lateral,-83,zero,
    pose([-3.82,1.86,.30],[-1.96,.93,0]))
    : panel(prefix+'trunk')??addPanel(prefix+'trunk','Trunk',e30?[-1.578,.872,0]:[-1.818,1.024,0],lateral,-66);
  const sunroofs = touring ? [
    addPanel(prefix+'sunroof-front','Front sunroof',zero,up,0,[.31,-.058,0],undefined,true),
    addPanel(prefix+'sunroof-rear','Rear sunroof',zero,up,0,[-.38,-.067,0],undefined,true),
  ] : [{ ...(panel(prefix+'sunroof')??addPanel(prefix+'sunroof','Sunroof',zero,up,0,e30?[-.542,-.066,0]:[-.565,-.061,0])), dropBeforeSlide:true }];
  const fuel = panel(prefix+'fuel-door') ?? (() => {
    const fit = fuelDoorFit(false);
    return addPanel(prefix+'fuel-door','Fuel door',fit.pivot,up,92,zero,fit.camera);
  })();
  model.openingPanels = [...doors, hood, luggage, ...sunroofs, fuel];
  if (touring) model.openingPanels.push(addPanel(prefix+'tailgate-glass','Rear glass',[-1.803,1.359,0],lateral,-51,zero,
    pose([-3.75,1.87,.33],[-2.03,1.14,0])));
  const glove = e30 ? 'e30assembly:cockpit:glove-box' : 'e34trim:glove-box-door';
  const cover = e30 ? 'e30trim:trunk-carpet' : 'e34trim:luggage-floor-carpet';
  model.openingPanels.push(panel(glove)??addPanel(glove,'Glove box',[.674,.611,.403],lateral,57,zero,
    pose([-.168,1.134,.154],[.532,.676,.413])));
  model.openingPanels.push(panel(cover)??{
    ...addPanel(cover,'Spare-wheel cover',[-1.318,.512,0],lateral,-67,zero,
      pose([-3.08,1.86,.14],[-1.91,.57,0])),
    requires:luggage.id,
  });

  model.revision = revision;
  const renderableCount = model.nodes.filter(node => node.assetId).length;
  if (model.catalog) {
    model.catalog.modelRevision = revision;
    model.catalog.coverage.bound = Object.keys(model.catalog.bindings).length;
    if ('renderable' in model.catalog.coverage) model.catalog.coverage.renderable = renderableCount;
  }
  parseReference(model);
  const manifest = Buffer.from(JSON.stringify(model)), digest = sha(manifest);
  const manifestUrl = `/models/${e30?'e30':'e34'}-lore/r${revision}/manifest.${digest}.json`;
  await immutable('public'+manifestUrl, manifest);
  console.log(model.id, revision, model.openingPanels.length, 'opening panels');
  return { ...pin, revision, manifestUrl, sha256:digest, renderableCount, assetBytes:model.assets.reduce((sum,asset) => sum+asset.bytes,0) };
}
const next = new Map();
for (const [name,pins] of oldPins) {
  const updated = [];
  for (const pin of pins) {
    updated.push(await make(pin));
    if (!archive.some(entry => entry.id === pin.id && entry.revision === pin.revision)) archive.push(pin);
  }
  next.set(name, updated);
}
await replaceJson(archivePath, archive);
for (const [name, releases] of next) await replaceJson(shared+name+'.json', name==='vehicle-references'?releases:releases[0]);
