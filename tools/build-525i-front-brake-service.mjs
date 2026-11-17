import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Group, Matrix4, Raycaster, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { siteContent } from '../scripts/site-content.mjs';
import { build525iFrontBrakes } from './geometry/525i-front-brakes.mjs';
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
const directory = 'work/525i-service-candidate';
const receiptPath = directory + '/fit-review.json';
const active = await readJson(receiptPath);
const base = active.release.revision === 1047 ? active : active.archives?.find(entry => entry.release.revision === 1047);
assert(base && base.release.id === 'e34-525i-sedan-automatic', 'Build the 525i sump reference first.');
const revision = 1048;
const prefix = '/models/e34-lore/r' + revision + '/';
async function checked(filename, digest) {
  const bytes = await fs.readFile(filename);
  assert.equal(sha(bytes), digest, filename);
  return bytes;
}
const model = JSON.parse(await checked(directory + '/' + nameOf(base.release.manifestUrl), base.release.sha256));
const catalog = model.catalog;
const discAssembly = catalog.assemblies['catalog-assembly-5e244f216376954a95911734'];
const caliperAssembly = catalog.assemblies['catalog-assembly-319e44e4e3d2718d4982357f'];
const items = new Map();
for (const assembly of [discAssembly, caliperAssembly]) {
  const page = JSON.parse(await checked(content.publicDir + assembly.url, assembly.sha256));
  for (const item of page.items) items.set(item.number, { item, assembly });
}

const nodes = new Map(model.nodes.map(node=>[node.id,node]));
const asset = model.assets.find(entry=>entry.id==='authored:525i-visual-detail');
const original = await checked(content.publicDir + asset.url, asset.sha256);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const { scene } = await loader.parseAsync(Uint8Array.from(original).buffer, '');
const scope = 'system:front-brakes';
const systemIds = ['system:braking','system:front-suspension',scope];
nodes.set(scope,{
  id:scope, name:'Front brakes', parentId:'system:braking', kind:'system', systemIds:[],
  assetId:null, meshNames:[], matrix:new Matrix4().toArray(), bounds:null,
  internal:false, canonicalId:null, oem:null, guideIds:[], thumbnail:null,
});
const guideId = 'factory-sliding-caliper-brake-pads';
const padManual = { chapter:'340',page:4,title:'Brake pad replacement',href:'/manual/340?pdf=320#job-brake-pad-replacement',
  printed:'340-4',pdf:320,guides:[guideId] };
const rotorManual = { chapter:'340',page:6,title:'Rotor removal and runout checks',href:'/manual/340?pdf=322#job-rotor-removal-and-runout-checks',
  printed:'340-6',pdf:322,guides:[] };

for (const [side, sign, suffix] of [['left',-1,'1'],['right',1,'-1']]) {
  const hub = nodes.get('e34sys:hub-front-' + suffix);
  const shield = nodes.get('e34sys:brake-shield-front-' + suffix);
  const wheel = nodes.get('wheel:front-' + side);
  for (const node of [hub, shield, wheel]) node.systemIds = [...new Set([...node.systemIds,scope])];
  const idFor = key => 'e34brake:front-' + side + '-' + key;
  function add(key, label, number, draw, previousId) {
    const id = previousId ?? idFor(key);
    const previous = nodes.get(id);
    if (previous?.assetId === asset.id) {
      const old = scene.getObjectByName(previous.meshNames[0]);
      assert(old?.parent, id);
      old.removeFromParent();
    }
    const { item, assembly } = items.get(number);
    const name = (side==='left'?'Left':'Right') + ' front ' + label;
    const group = new Group();
    group.name = id.replaceAll(':','_');
    draw(group);
    compactPart(group);
    group.scale.z = sign;
    scene.add(group);
    const bounds = new Box3().setFromObject(group,true);
    assert(!bounds.isEmpty(), id);
    const rotor = key.startsWith('disc');
    const pad = key.endsWith('-pad');
    const parentId = key.startsWith('cap-') || key.startsWith('guide-')
      ? 'e34sys:brake-caliper-front-' + suffix : hub.id;
    const guideIds = [...new Set([...(previous?.guideIds ?? []), ...(rotor ? [] : [guideId])])];
    const sourceContext = { contextId:catalog.context.id,assemblyId:assembly.id,positionId:item.id };
    nodes.set(id,{ ...previous,id,name,parentId,kind:'component',systemIds,assetId:asset.id,meshNames:[group.name],
      matrix:hub.matrix,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},internal:false,
      displayDirection:[0,.15,.42*sign], canonicalId:item.partId,oem:number,guideIds,thumbnail:null,sourceContext });
    const earlier = catalog.bindings[id];
    const positions = [{ assemblyId:assembly.id,id:item.id,number,partId:item.partId }];
    if (key==='disc') {
      const initial = items.get('34111160936').item;
      positions.unshift({ assemblyId:assembly.id,id:initial.id,number:initial.number,partId:initial.partId });
    }
    catalog.bindings[id] = {
      ...earlier,nodeId:id,title:name,kind:pad?'supplied-with':'component',assemblyIds:[assembly.id],positions,
      note:pad?'Both pads come in the axle kit. Verify the installed ATE caliper and sensor arrangement.'
        : key==='disc'?'The BMW catalog lists the original 302 × 22 mm rotor and its supersession.': '',
      manual:rotor?[rotorManual]:[padManual,rotorManual],guideIds,
      visualSources:[{title:'BMW '+assembly.title,url:assembly.sourceUrl}],
    };
  }
  build525iFrontBrakes(side,add);
  const rotor = scene.getObjectByName(('e34sys:brake-disc-front-'+suffix).replaceAll(':','_'));
  const box = new Box3().setFromObject(rotor,true);
  assert(Math.abs(box.max.x-box.min.x-.302)<.0002,'Rotor diameter');
  assert(Math.abs(box.max.z-box.min.z-.0761)<.0002,'Rotor overall height');
  const through = (x,y) => new Raycaster(new Vector3(x,y,sign*.045),new Vector3(0,0,-sign),0,.008)
    .intersectObject(rotor,true).length;
  assert.equal(through(.060,0),0,'Wheel bolt hole');
  assert.equal(through(.064*Math.cos(Math.PI/5),.064*Math.sin(Math.PI/5)),0,'Rotor screw hole');
  assert(through(.048,0)>0,'Rotor mating face');
}

const data = await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scene, {binary:true})));
const sha256 = sha(data);
Object.assign(asset,{ url:prefix+sha256+'.glb',bytes:data.length,sha256 });
model.nodes = [...nodes.values()];
model.revision = catalog.modelRevision = revision;
const renderableCount = model.nodes.filter(node=>node.assetId).length;
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
const manifest = Buffer.from(JSON.stringify(model));
const hash = sha(manifest);
const release = { ...base.release, revision, sha256:hash, manifestUrl:prefix+'manifest.'+hash+'.json',
  renderableCount, assetBytes:model.assets.reduce((sum,entry)=>sum+entry.bytes,0) };
const file = {url:asset.url,file:nameOf(asset.url),sha256};
const manifestFile = {url:release.manifestUrl,file:nameOf(release.manifestUrl),sha256:hash};
await immutable(directory+'/'+file.file,data);
await immutable(directory+'/'+manifestFile.file,manifest);
await replaceJson(receiptPath,{release,files:[file,manifestFile],archives:[base]});
console.log('Built revision '+revision+' · '+renderableCount+' parts · verified front brake disc seats');
