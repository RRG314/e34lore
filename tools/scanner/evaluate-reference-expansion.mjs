/** Compare a frozen local library expansion with its retained baseline.
 * New convenience examples remain separate from historical regressions. */
import{readFile,writeFile,mkdir}from'node:fs/promises';
import{resolve}from'node:path';import{pathToFileURL}from'node:url';
import{createHash}from'node:crypto';import{build}from'esbuild';
import{pipeline,RawImage,env}from'@huggingface/transformers';
import{readSourceAudit,sourceKey}from'./reference-integrity.mjs';
const root=resolve(process.argv[2]||'work/scanner-accuracy-20261110');
if(!root.startsWith(resolve('work')+'/'))throw Error('Evaluation receipts must stay in local work');
const receipt=process.argv[3]||'evaluation';if(!/^[a-z0-9][a-z0-9-]{0,60}$/.test(receipt))throw Error('Invalid receipt directory');
const output=root+'/'+receipt;await mkdir(output,{recursive:true});
const read=async p=>JSON.parse(await readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const compile=async(entry,name)=>{const out=output+'/'+name+'.mjs';await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',packages:'external',outfile:out,logLevel:'silent'});return import(pathToFileURL(out));};
const previous=await import(pathToFileURL(root+'/baseline/policy.mjs'));
const current=await compile('src/scanner/licensed-family-comparison.ts','policy');
const {wholePartImage}=await compile('src/scanner/whole-part-image.ts','framing');
const{categoryMetrics}=await compile('src/scanner/evaluation-metrics.ts','metrics');
const baselineBytes=await readFile(root+'/baseline/reference-index.json'),baseline=JSON.parse(baselineBytes);
const candidateBytes=await readFile('data/scanner/licensed-family/reference-index.json'),candidate=current.licensedFamilyIndexSchema.parse(JSON.parse(candidateBytes));
const selectionBytes=await readFile(root+'/selection.json'),selection=JSON.parse(selectionBytes),media=await read('data/parts-media/manifest.json');
const known=(await read('../e34-scanner-repair-lab/work/scanner-v2/regression-inputs.json')).records;
const old=(await read('work/accuracy-review/scanner-research/selected-sources.json')).records.filter(r=>r.partition==='evaluation-only');
const added=selection.records.filter(r=>r.partition==='evaluation');
if(added.length<3||added.some(r=>r.visualReview!=='reviewed'))throw Error('At least three manually reviewed new examples are required before freezing');
const queries=[...known.map(r=>({...r,partition:'historical-regression'})),...old.map(r=>({...r,expected:r.label,partition:'historical-regression'})),...added.map(r=>({...r,expected:r.label,partition:'new-convenience'}))];
const querySources=queries.map(row=>row.source||row.sourceUrl).filter(Boolean).map(sourceKey);
if(new Set(querySources).size!==querySources.length)throw Error('Duplicate evaluation source. Keep historical and new query inputs disjoint.');
const references=media.records.filter(r=>r.kind==='photograph'&&r.scope==='family').map(r=>({...r,file:'public'+r.image,partition:'reference'}));
const normalizeCreator=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
for(const row of added){
 if(references.some(r=>r.source===row.source||r.sha256===row.sha256||r.rights.changes.includes(row.sha256)))throw Error('New query overlaps a reference: '+row.id);
 if(references.some(r=>normalizeCreator(r.sourceGroup?.replace(/^commons-creator:/,'')||r.rights.attribution.split(' — ')[0])===normalizeCreator(row.creator)))throw Error('New query creator also supplies a reference: '+row.id);
}
const freeze={schema:1,createdAtUtc:new Date().toISOString(),baselineIndexSha256:sha(baselineBytes),baselinePolicySha256:sha(await readFile(root+'/baseline/policy.mjs')),candidateIndexSha256:sha(candidateBytes),candidatePolicySha256:sha(await readFile('src/scanner/licensed-family-comparison.ts')),selectionSha256:sha(selectionBytes),protocolSha256:sha(await readFile(root+'/evaluation-protocol.json')),queries:queries.map(r=>({id:r.id,expected:r.expected,partition:r.partition,sha256:r.sha256})),cutoffs:{photoSimilarity:.80,photoFamilyMargin:.035,textMinimum:.20,textRanks:3}};
try{const oldFreeze=await read(output+'/freeze.json');const{createdAtUtc:a,...before}=oldFreeze,{createdAtUtc:b,...after}=freeze;if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Frozen inputs changed; use a new evaluation directory and relabel prior examples as regression');void a;void b;}catch(error){if(error.code!=='ENOENT')throw error;await writeFile(output+'/freeze.json',JSON.stringify(freeze,null,2)+'\n');}
const audit=await readSourceAudit({records:[...references,...added.map(r=>({...r,partition:'reserved-evaluation',sourceGroup:'commons-creator:'+r.creator,objectGroup:null}))]},{records:[...known,...old.map(r=>({...r,expected:r.label}))]},{inspectPixels:true});
const queryPixels=audit.images.filter(row=>row.partition!=='reference').map(row=>row.pixelSha256);
if(new Set(queryPixels).size!==queryPixels.length)throw Error('Duplicate decoded query pixels; do not count the same photo twice.');
if(audit.nearDuplicates.some(r=>r.crossPartition))throw Error('Potential cross-partition near duplicate needs manual review');
await writeFile(output+'/partition-audit.json',JSON.stringify(audit,null,2)+'\n');
const modelPath=resolve('../e34-collective/work/scanner-evaluation/model-cache/Xenova/clip-vit-base-patch32/6b7c523703ae26e39be4b03774966f8571c7f523');
if(sha(await readFile(modelPath+'/onnx/vision_model_quantized.onnx'))!=='583fd1110a514667812fee7d684952aaf82a99b959760c8d7dca7e0ab9839299')throw Error('Image encoder differs');
env.allowLocalModels=true;env.allowRemoteModels=false;env.useBrowserCache=false;env.useFSCache=false;
const start=performance.now(),encoder=await pipeline('image-feature-extraction',modelPath,{dtype:'q8',device:'cpu',local_files_only:true,session_options:{intraOpNumThreads:2,interOpNumThreads:1}}),loadMs=performance.now()-start,records=[];
try{for(const row of queries){
 if(sha(await readFile(row.file))!==row.sha256)throw Error('Changed query '+row.id);
 const began=performance.now(),tensor=await encoder(await wholePartImage(await RawImage.read(row.file)),{}),vector=Array.from(tensor.data,Number);tensor.dispose();
 const before=previous.compareLicensedFamilies([vector],baseline),after=current.compareLicensedFamilies([vector],candidate);
 records.push({id:row.id,expected:row.expected,partition:row.partition,sourceSha256:row.sha256,before,after,cpuMs:performance.now()-began});
 console.log(row.id,before.candidates[0]?.id,before.status,'=>',after.candidates[0]?.id,after.status);
}}finally{await encoder.dispose();}
const summaries={};for(const partition of ['historical-regression','new-convenience'])for(const policy of ['before','after'])summaries[partition+':'+policy]=categoryMetrics(records.filter(r=>r.partition===partition).map(r=>({expected:r.expected,predicted:r[policy].candidates[0]?.id||null,proposed:r[policy].status==='review',acceptedOem:r[policy].accepted})));
await writeFile(output+'/results.json',JSON.stringify({schema:1,evaluatedAtUtc:new Date().toISOString(),baselineReferences:baseline.records.length,candidateReferences:candidate.records.length,loadMs,runtime:'Pinned q8 encoder, Node CPU with two threads. Not physical-phone timing.',summaries,records,exactOemReferences:0,independentAccuracyEstablished:false,physicalPhoneTested:false,limitations:['Small convenience selection, not representative population accuracy.','Historical examples were examined earlier and are not a fresh holdout.','New source creators and file/pixel hashes are separated; physical-object and pretraining independence are unproven.','No threshold tuning or automatic OEM acceptance.']},null,2)+'\n');
console.log(JSON.stringify(summaries,null,2));
