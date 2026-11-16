// Only licensed shared family photographs. No retailer research or member images.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { pipeline, RawImage, env } from '@huggingface/transformers';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const output='data/scanner/licensed-family';await mkdir(output,{recursive:true});
const compiled=await build({stdin:{contents:"export {wholePartImage} from './src/scanner/whole-part-image.ts';export {photoNegativeFamilies} from './src/scanner/families.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,packages:'external',logLevel:'silent'});
const temp='work/accuracy-review/whole-part-image.mjs';await writeFile(temp,compiled.outputFiles[0].contents);
const {wholePartImage,photoNegativeFamilies}=await import('../../'+temp);
const modelPath=resolve(process.argv[2]||'../e34-collective/work/scanner-evaluation/model-cache/Xenova/clip-vit-base-patch32/6b7c523703ae26e39be4b03774966f8571c7f523');
if(digest(await readFile(modelPath+'/onnx/vision_model_quantized.onnx'))!=='583fd1110a514667812fee7d684952aaf82a99b959760c8d7dca7e0ab9839299')throw Error('Vision model hash differs');
const media=JSON.parse(await readFile('data/parts-media/manifest.json'));
// Text-only vectors are generated from the original project prompts, using the
// pinned CLIP FP32 text encoder. No photo records from this held index are used.
const text=JSON.parse(await readFile('data/scanner/local-v2/reference-index.json')).text;
text.method='Original family prompts, FP32 text encoder, normalized for the pinned q8 image encoder. No photo/OEM labels derived from retailer research.';
env.allowLocalModels=true;env.allowRemoteModels=false;env.useBrowserCache=false;env.useFSCache=false;
const encoder=await pipeline('image-feature-extraction',modelPath,{dtype:'q8',device:'cpu',local_files_only:true,session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
const records=[];
try{for(const photo of media.records.filter(row=>row.kind==='photograph'&&row.scope==='family'&&row.rights.status==='licensed'&&row.recognition!=='comparison-only')){
 const bytes=await readFile('public'+photo.image);if(digest(bytes)!==photo.sha256)throw Error('Changed licensed photo '+photo.id);
 const tensor=await encoder(await wholePartImage(await RawImage.read('public'+photo.image))),embedding=Array.from(tensor.data,Number);tensor.dispose();
 if(embedding.length!==512||embedding.some(v=>!Number.isFinite(v)))throw Error('Unsupported embedding');
 const norm=Math.hypot(...embedding);
 records.push({id:photo.id,family:photo.family,negative:photoNegativeFamilies.some(family=>family.id===photo.family),sourceSha256:photo.sha256,source:photo.source,license:photo.rights.license,licenseUrl:photo.rights.licenseUrl,attribution:photo.rights.attribution,objectGroup:photo.objectGroup||photo.sourceGroup||photo.source,embedding:embedding.map(v=>v/norm)});
 console.log('Encoded licensed family:',photo.id);
}}finally{await encoder.dispose();}
const index={schema:1,version:'licensed-family-v1',preprocessing:'contain-edge-median-384-v1',model:{id:text.model.id,revision:text.model.revision,dtype:'q8'},text,records};
await writeFile(output+'/reference-index.json',JSON.stringify(index)+'\n');
await writeFile(output+'/provenance.json',JSON.stringify({schema:1,generatedAtUtc:new Date().toISOString(),referencePhotos:records.length,mediaManifestSha256:digest(await readFile('data/parts-media/manifest.json')),policySha256:digest(await readFile('src/scanner/licensed-family-comparison.ts')),indexSha256:digest(await readFile(output+'/reference-index.json')),exactOemReferences:0,retailerReferences:0,memberPhotos:0,scope:'Category candidate; release requires measured review and device acceptance. No automatic exact-part identity.'},null,2)+'\n');
