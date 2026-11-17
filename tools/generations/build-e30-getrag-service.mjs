import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Matrix4, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { siteContent } from '../../scripts/site-content.mjs';
import { compactPart } from '../geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from '../geometry/compress-glb.mjs';
import { immutable, localReferenceTools, readJson, replaceJson, sha } from '../geometry/local-reference-review.mjs';
import { buildE30Getrag } from './e30-getrag-260.mjs';
import { updateShoulderPanels } from './update-e30-shoulder.mjs';

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};

const content = siteContent();
assert(content.release, 'Set E34_ASSET_PACK to the retained Workshop asset pack.');
const base = await readJson('data/digital-twin/e30-candidate.json');
assert.equal(base.revision, 1188);
const revision = 1192, directory = 'work/e30/getrag-service', prefix = '/models/e30-lore/r' + revision + '/';
const checked = async (url, digest) => {
  const bytes = await fs.readFile(content.publicDir + url);
  assert.equal(sha(bytes), digest, url);
  return JSON.parse(bytes);
};
const model = await checked(base.manifestUrl, base.sha256);
const catalog = model.catalog;
const byKey = new Map(Object.values(catalog.assemblies).map(assembly=>[assembly.key.replace(/\.html$/,''),assembly]));
const pages = new Map();
const nodes = new Map(model.nodes.map(node=>[node.id,node]));
const assetId = 'e30:getrag-260';
const root = new Group();
const systemIds = ['system:transmission','system:manual-gearbox'];
const fixture = 'e30assembly:gearbox';

const guide = (chapter,pdf,printed,title,href = '/e30/manual/'+chapter+'?pdf='+pdf) => ({
  chapter,page:pdf,pdf,printed,title,href,guides:[],
});
const clutchManual = guide('21',359,'21-2','BMW 21 21 000 · Clutch disc and pressure plate');
const bearingManual = guide('21',361,'21-4','BMW 21 51 000 · Clutch release');
const removalManual = guide('23',366,'23-1','BMW 23 00 022 · Gearbox removal');
const gearboxPage = (number,title)=>guide('23',number,'23-'+number,title,
  'https://e30mpower.com/23%20-%20Manual%20Transmission/23-'+number+'.jpg');
const shellManual = gearboxPage(169,'BMW 23 11 013 · Split the Getrag case');
const guideManual = gearboxPage(171,'BMW 23 11 623 · Guide sleeve and shim');
const shaftManual = gearboxPage(174,'BMW 23 21 503 · Getrag shaft assembly');

const commands = [];
buildE30Getrag((...args)=>commands.push(args), ()=>fixture);
for (const [parent,key,name,location,displayDirection,draw,options] of commands) {
  const id = parent + ':' + key;
  const group = new Group();
  group.name = id.replaceAll(':','_');
  draw(group);
  compactPart(group);
  root.add(group);
  const bounds = new Box3().setFromObject(group,true);
  assert(!bounds.isEmpty(), id);
  const original = nodes.get(id);
  const assembly = byKey.get(options.page);
  assert(assembly,id+' has no source assembly');
  if (!pages.has(assembly.id)) pages.set(assembly.id, await checked(assembly.url,assembly.sha256));
  const candidates = pages.get(assembly.id).items.filter(item=>item.number===options.row);
  const item = candidates.length===1 ? candidates[0] : undefined;
  assert(!options.row || !!item || !!original, id+' has no catalog number '+options.row);
  const node = {
    kind:'part', id, name, parentId:parent, systemIds, assetId, meshNames:[group.name],
    matrix:new Matrix4().makeTranslation(...location).toArray(),
    bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}, displayDirection,
    internal:!!options.internal, gearbox:options.gearbox,
    canonicalId:item?.partId ?? original?.canonicalId ?? null, oem:item?.number ?? original?.oem ?? null,
    guideIds:original?.guideIds ?? [], thumbnail:null,
    sourceContext:{contextId:catalog.context.id,assemblyId:assembly.id,
      ...(item && {positionId:item.id})},
  };
  const manual = /^(flywheel|clutch-|pressure-plate|pilot-bearing)/.test(key) ? [clutchManual]
    : /^(release-|fork-)/.test(key) ? [bearingManual]
    : /^(guide-|slave-cylinder)/.test(key) ? [key==='slave-cylinder'?removalManual:guideManual]
    : /^(main-case|tail-case|case-|reverse-retainer|interlock-|input-stop|input-snap)/.test(key) ? [shellManual]
    : [shaftManual];
  const previous = catalog.bindings[id];
  catalog.bindings[id] = {
    ...previous, nodeId:id, title:name, kind:item?'component':'reference', assemblyIds:[assembly.id],
    note:item?'BMW catalog occurrence for the 1991 325i reference. Check the conditions before ordering.'
      :'Represented at its factory service location. Match the installed component to the diagram.',
    positions:item ? [{assemblyId:assembly.id,id:item.id,number:item.number,partId:item.partId}]
      : previous?.positions ?? [],
    guideIds:previous?.guideIds ?? [], manual,
    visualSources:[{title:'BMW '+assembly.title, url:assembly.sourceUrl},
      ...(previous?.visualSources ?? [])].slice(0,6),
  };
  nodes.set(id,{...original,...node});
}

const replacements = new Set(commands.map(([parent,key])=>parent+':'+key));
assert(model.nodes.filter(node=>node.assetId===assetId).every(node=>replacements.has(node.id)),
  'A previously selectable gearbox part was dropped.');
model.nodes = [...nodes.values()];
catalog.coverage.renderable = model.nodes.filter(node=>node.assetId).length;
catalog.coverage.bound = Object.values(catalog.bindings).filter(binding=>binding.assemblyIds.length).length;
catalog.coverage.withCandidates = Object.values(catalog.bindings).filter(binding=>binding.positions.length).length;
model.revision = revision;
catalog.modelRevision = revision;

const disc = nodes.get(fixture+':clutch-disc');
assert(Math.abs(disc.bounds.max[2]-disc.bounds.min[2]-.228)<.0002,'Clutch diameter must be 228 mm: ' + (disc.bounds.max[2]-disc.bounds.min[2]));
const pilot = new Vector3().fromArray(nodes.get(fixture+':pilot-bearing').matrix.slice(12,15));
const input = new Vector3().fromArray(nodes.get(fixture+':input-shaft').matrix.slice(12,15));
const bore = new Vector3(Math.cos(.128),Math.sin(.128),0);
assert(input.clone().sub(pilot).cross(bore).length() < 1e-5, 'Pilot and input shaft must share an axis');
assert(input.clone().sub(pilot).dot(bore)+.285 > -.005, 'Pilot tip needs to seat inside the bearing');

const pack = async (scene, id) => {
  const bytes = await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true})));
  const sha256 = sha(bytes);
  return { asset: {id,url:prefix+sha256+'.glb',bytes:bytes.length,sha256}, bytes };
};
const gearbox = await pack(root, assetId);
const exterior = model.assets.find(asset=>asset.id==='e30:325i-exterior');
const exteriorBytes = await fs.readFile(content.publicDir + exterior.url);
assert.equal(sha(exteriorBytes), exterior.sha256);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const { scene } = await loader.parseAsync(Uint8Array.from(exteriorBytes).buffer, '');
updateShoulderPanels(scene, nodes);
const body = await pack(scene, exterior.id);
model.assets = model.assets.map(old=>old.id===assetId?gearbox.asset:old===exterior?body.asset:old);
const { parseReference } = await localReferenceTools();
try { parseReference(model); }
catch (error) { console.error(error.message, 'gearbox GLB: ' + gearbox.bytes.length + ' bytes'); process.exit(1); }

const manifest = Buffer.from(JSON.stringify(model)), sha256 = sha(manifest);
const release = {...base,revision,sha256,manifestUrl:prefix+'manifest.'+sha256+'.json',
  renderableCount:catalog.coverage.renderable, assetBytes:model.assets.reduce((total,entry)=>total+entry.bytes,0)};
for (const asset of [gearbox, body]) await immutable(directory+asset.asset.url,asset.bytes);
await immutable(directory+release.manifestUrl,manifest);
await replaceJson(directory+'/review.json',release);
console.log('Built Getrag reference revision '+revision+' · '+release.assetBytes+' bytes · updated body and gearbox');
