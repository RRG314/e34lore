// Local research artifact only. Source photos are not copied to public assets.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {pipeline,RawImage,env} from '@huggingface/transformers';
import {readSourceAudit} from './reference-integrity.mjs';
const dir=resolve('work/scanner-v2');await mkdir(dir,{recursive:true});
await build({entryPoints:['src/scanner/whole-part-image.ts'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:dir+'/framing.mjs',logLevel:'silent'});
const{wholePartImage}=await import(pathToFileURL(dir+'/framing.mjs'));
const sources=JSON.parse(await readFile('data/scanner/local-v2/sources.json','utf8'));
const media=JSON.parse(await readFile('data/parts-media/manifest.json','utf8'));
const text=JSON.parse(await readFile('work/scanner-v2/fp32-prototypes.json','utf8'));
const evaluation=JSON.parse(await readFile('work/scanner-v2/regression-inputs.json','utf8'));
// Validate the actual regression files and the reserved holdout before encoding.
// Historical evaluation metadata alone did not include the reserved photograph.
await readSourceAudit(sources,evaluation,{inspectPixels:true});
env.cacheDir=resolve(process.argv[2]||'../e34-collective/work/scanner-evaluation/model-cache');env.allowLocalModels=false;
const encoder=await pipeline('image-feature-extraction',text.model.id,{revision:text.model.revision,dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
const records=[];
try{for(const source of sources.records.filter(r=>r.partition==='reference')){
 const bytes=await readFile(source.file);if(createHash('sha256').update(bytes).digest('hex')!==source.sha256)throw Error('Source changed: '+source.id);
 const shared=media.records.find(r=>r.id===source.id||r.id==='source:'+source.id);
 if(!shared||shared.family!==source.family||shared.source!==source.source)throw Error('Unlinked shared media evidence: '+source.id);
 if(shared.kind==='photograph'&&shared.sha256!==source.sha256)throw Error('Shared photograph changed: '+source.id);
 const tensor=await encoder(await wholePartImage(await RawImage.read(source.file))),row=Array.from(tensor.data,Number);tensor.dispose();
 if(row.length!==512||row.some(v=>!Number.isFinite(v)))throw Error('Invalid projected image embedding');
 const norm=Math.hypot(...row);records.push({id:source.id,mediaId:shared.id,family:source.family,sourceSha256:source.sha256,source:source.source,rights:source.rights,embedding:row.map(v=>v/norm)});console.log('Reference:',source.id);
}}finally{await encoder.dispose()}
const artifact={schema:1,version:'e34-local-bare-parts-v2',preprocessing:'contain-edge-median-384-v1',model:text.model,text,records};
await writeFile('data/scanner/local-v2/reference-index.json',JSON.stringify(artifact)+'\n');
const encoded=await readFile('data/scanner/local-v2/reference-index.json');
await writeFile(dir+'/reference-build.json',JSON.stringify({generatedAt:new Date().toISOString(),count:records.length,sha256:createHash('sha256').update(encoded).digest('hex'),bytes:encoded.length,privateResearchOnly:true},null,2)+'\n');
