// Frozen convenience samples; no member photos and no remote inference.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { pipeline, RawImage, env } from '@huggingface/transformers';
const args=process.argv.slice(2),regression=args.includes('--regression');
if(args.some(arg=>arg.startsWith('--')&&arg!=='--regression'))throw Error('Unknown evaluation option');
const root='work/accuracy-review/'+(regression?'scanner-maintenance-regression':'scanner-evaluation');await mkdir(root,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const compile=async(entry,name)=>{const file=resolve(root,name+'.mjs');await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',packages:'external',outfile:file,logLevel:'silent'});return import(pathToFileURL(file));};
const {compareLicensedFamilies,licensedFamilyIndexSchema}=await compile('src/scanner/licensed-family-comparison.ts','licensed-policy');
const {compareFamilies}=await compile('src/scanner/family-comparison.ts','production-policy');
const {wholePartImage}=await compile('src/scanner/whole-part-image.ts','framing');
const {categoryMetrics}=await compile('src/scanner/evaluation-metrics.ts','metrics');
const original=JSON.parse(await readFile('src/scanner/family-vectors.json'));
const candidateBytes=await readFile('data/scanner/licensed-family/reference-index.json'),candidate=licensedFamilyIndexSchema.parse(JSON.parse(candidateBytes));
const research=JSON.parse(await readFile('work/accuracy-review/scanner-research/selected-sources.json'));
const known=JSON.parse(await readFile('../e34-scanner-repair-lab/work/scanner-v2/regression-inputs.json')).records;
const originalQueries=[...known.map(row=>({...row,partition:'known-regression'})),...research.records.filter(row=>row.partition==='evaluation-only').map(row=>({...row,expected:row.label,partition:'reserved-convenience'}))];
const queries=originalQueries.map(row=>regression?{...row,sourcePartition:row.partition,partition:'historical-regression'}:row);
const candidateHash=sha(candidateBytes),policyHash=sha(await readFile('src/scanner/licensed-family-comparison.ts'));
const freeze={candidateHash,policyHash,queryHashes:queries.map(row=>({id:row.id,sha256:row.sha256,partition:row.partition})),cutoffs:{photoSimilarity:.80,photoFamilyMargin:.035,textMinimum:.20,textRanks:3},frozenAtUtc:new Date().toISOString()};
const freezePath=root+'/freeze.json';
try{const previous=JSON.parse(await readFile(freezePath));if(previous.candidateHash!==candidateHash||previous.policyHash!==policyHash)throw Error('Frozen candidate changed; label this set regression before tuning');}catch(error){if(error.code!=='ENOENT')throw error;await writeFile(freezePath,JSON.stringify(freeze,null,2)+'\n');}
if(queries.some(row=>candidate.records.some(ref=>ref.sourceSha256===row.sha256)))throw Error('Reference/evaluation byte overlap');
const modelPath=resolve(args.find(arg=>!arg.startsWith('--'))||'../e34-collective/work/scanner-evaluation/model-cache/Xenova/clip-vit-base-patch32/6b7c523703ae26e39be4b03774966f8571c7f523');
if(sha(await readFile(modelPath+'/onnx/vision_model_quantized.onnx'))!=='583fd1110a514667812fee7d684952aaf82a99b959760c8d7dca7e0ab9839299')throw Error('Model hash differs');
env.allowLocalModels=true;env.allowRemoteModels=false;env.useBrowserCache=false;env.useFSCache=false;
const loadStart=performance.now(),encoder=await pipeline('image-feature-extraction',modelPath,{dtype:'q8',device:'cpu',local_files_only:true,session_options:{intraOpNumThreads:2,interOpNumThreads:1}}),loadMs=performance.now()-loadStart;
const records=[];
try{for(const row of queries){
 const bytes=await readFile(row.file);if(sha(bytes)!==row.sha256)throw Error('Query changed '+row.id);
 const raw=await RawImage.read(row.file),start=performance.now(),a=await encoder(raw,{}),b=await encoder(await wholePartImage(raw),{});
 const production=compareFamilies([Array.from(a.data,Number)],original),improved=compareLicensedFamilies([Array.from(b.data,Number)],candidate);a.dispose();b.dispose();
 records.push({id:row.id,expected:row.expected,partition:row.partition,sourceSha256:row.sha256,production,improved,combinedCpuMs:performance.now()-start});
 console.log(row.id,production.candidates[0]?.id,production.status,'=>',improved.candidates[0]?.id,improved.status);
}}finally{await encoder.dispose();}
const summaries={};for(const partition of new Set(queries.map(row=>row.partition)))for(const policy of ['production','improved'])summaries[partition+':'+policy]=categoryMetrics(records.filter(row=>row.partition===partition).map(row=>({expected:row.expected,predicted:row[policy].candidates[0]?.id||null,proposed:row[policy].status==='review',acceptedOem:row[policy].accepted})));
await writeFile(root+'/results.json',JSON.stringify({schema:1,mode:regression?'historical-regression':'frozen-convenience',evaluatedAtUtc:new Date().toISOString(),candidateHash,policyHash,loadMs,runtime:'Node CPU, two threads; not real-phone performance',referenceCount:candidate.records.length,summaries,records,independentAccuracyEstablished:false,exactOemAccuracyEstablished:false,physicalPhoneTested:false,limitations:['Known convenience regressions are not a test set for threshold selection.',regression?'All 15 previously examined samples are historical regressions; none is a new holdout.':'Five reserved images provide a first limited challenge, not representative accuracy.','No physical-owner identities or exact-number ground truth; camera and phone thermal/memory behavior remain separate tests.']},null,2)+'\n');
console.log(JSON.stringify(summaries,null,2));
