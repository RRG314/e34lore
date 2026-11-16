/** Add the automatic choice without relabeling manual-only geometry.
 * Accepted assets and manifests are read-only; no new shape or dimension is inferred. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const output=resolve(process.argv[2]||'work/525i-automatic-reference');await fs.mkdir(output,{recursive:true});
await build({stdin:{contents:"export {parseReference} from './src/digital-twin/public/model.ts'; export {catalogIndexSchema} from './src/digital-twin/public/catalog.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:output+'/validation.mjs',logLevel:'silent'});
const {parseReference,catalogIndexSchema}=await import(pathToFileURL(output+'/validation.mjs'));
const read=async(file)=>JSON.parse(await fs.readFile(file,'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const accepted=await read('data/digital-twin/public-reference.json');
const bytes=await fs.readFile('public'+accepted.manifestUrl);
if(digest(bytes)!==accepted.sha256)throw Error('Accepted 525i manifest changed');
const base=parseReference(JSON.parse(bytes.toString())),sourceCatalog=await read('data/digital-twin/component-catalog.json');
if(sourceCatalog.context.model!=='525i'||sourceCatalog.context.body!=='Sedan'||sourceCatalog.context.year!==1995)throw Error('Expected the accepted 1995 525i Sedan catalog');
const catalog=catalogIndexSchema.parse(sourceCatalog);
// Retain the licensed original cabin surfaces. Their precise transmission
// applicability was never verified, so a name is not evidence to remove them.
const removed=new Set(['e34sys:manual-gearbox','m50:flywheel']);
let changed=true;while(changed){changed=false;for(const node of base.nodes)if(node.parentId&&removed.has(node.parentId)&&!removed.has(node.id)){removed.add(node.id);changed=true;}}
const id='e34-525i-sedan-automatic',revision=23;
const nodes=base.nodes.filter(node=>!removed.has(node.id));
catalog.modelId=id;catalog.modelRevision=revision;
for(const key of Object.keys(catalog.bindings))if(removed.has(key))delete catalog.bindings[key];
catalog.coverage.renderable=nodes.filter(n=>n.assetId).length;catalog.coverage.bound=Object.keys(catalog.bindings).length;
catalog.coverage.withCandidates=Object.values(catalog.bindings).filter(b=>b.positions.length).length;
const manifest={...base,id,revision,reference:'1995 BMW 525i Sedan · Automatic',vehicleReference:{id,year:1995,model:'525i',body:'Sedan',engine:'M50TU',transmission:'Automatic'},nodes,catalog,
 limits:'525i automatic reference retaining the original licensed exterior and cabin, M50 engine and common systems. Later illustrative manual gearbox, clutch and flywheel additions are excluded. Automatic gearbox and torque-converter geometry is not modeled; use the source catalog diagrams. The artist cabin controls and shared driveshaft location are not verified automatic-specific geometry. Existing dimensions and locations remain illustrative, not manufacturer CAD or confirmed fitment.'};
parseReference(manifest);
const encoded=Buffer.from(JSON.stringify(manifest)),sha256=digest(encoded),manifestUrl='/models/e34-lore/r23/manifest.'+sha256+'.json';
await fs.mkdir('public/models/e34-lore/r23',{recursive:true});
try{const existing=await fs.readFile('public'+manifestUrl);if(!existing.equals(encoded))throw Error('Immutable output changed');}catch(error){if(error.code!=='ENOENT')throw error;await fs.writeFile('public'+manifestUrl,encoded,{flag:'wx'});}
const release={id,revision,manifestUrl,sha256,renderableCount:nodes.filter(n=>n.assetId).length,assetBytes:base.assets.reduce((sum,a)=>sum+a.bytes,0),label:'525i Sedan · Automatic',year:1995,engine:'M50TU',body:'Sedan',model:'525i',transmission:'Automatic',contextId:catalog.context.id};
await fs.writeFile('data/digital-twin/525i-automatic-reference.json',JSON.stringify(release,null,2)+'\n');
await fs.writeFile(output+'/build.json',JSON.stringify({release,acceptedSha256:accepted.sha256,excludedNodes:[...removed],unchangedGeometry:base.assets.map(a=>a.sha256),limits:manifest.limits},null,2)+'\n');
console.log(JSON.stringify({id,renderableCount:release.renderableCount,bytes:encoded.length,automaticGeometry:'not modeled; manual-only components excluded',acceptedManifestUnchanged:digest(await fs.readFile('public'+accepted.manifestUrl))===accepted.sha256}));
