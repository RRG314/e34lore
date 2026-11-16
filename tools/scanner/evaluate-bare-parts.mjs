// Local-only evaluation. Original regression and reserved retailer photos stay
// outside the reference set. This is not real-phone or exact-OEM accuracy.
import{readFile,writeFile}from'node:fs/promises';import{resolve}from'node:path';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';import{build}from'esbuild';import{pipeline,RawImage,env}from'@huggingface/transformers';
import{readSourceAudit,assertReferenceIndex}from'./reference-integrity.mjs';
const work=resolve('work/scanner-v2');
for(const [name,entry]of [['hybrid','src/scanner/bare-part-comparison.ts'],['framing','src/scanner/whole-part-image.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',packages:'external',outfile:work+'/'+name+'.mjs',logLevel:'silent'});
const{compareBareParts}=await import(pathToFileURL(work+'/hybrid.mjs')),{wholePartImage}=await import(pathToFileURL(work+'/framing.mjs'));
const inputs=JSON.parse(await readFile(work+'/regression-inputs.json','utf8')),source=JSON.parse(await readFile('data/scanner/local-v2/sources.json','utf8')),bytes=await readFile('data/scanner/local-v2/reference-index.json'),index=JSON.parse(bytes);
const records=[],policy=await readFile('src/scanner/bare-part-comparison.ts');
const sourceAudit=await readSourceAudit(source,inputs,{inspectPixels:true});
assertReferenceIndex(index,source,JSON.parse(await readFile('data/parts-media/manifest.json','utf8')));
env.cacheDir=resolve(process.argv[2]||'../e34-collective/work/scanner-evaluation/model-cache');env.allowLocalModels=false;
const model=await pipeline('image-feature-extraction',index.model.id,{revision:index.model.revision,dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
try{for(const row of [...inputs.records.map(r=>({...r,partition:'known-regression'})),...source.records.filter(r=>r.partition==='reserved-evaluation').map(r=>({...r,expected:r.family}))]){
 const bytes=await readFile(row.file),hash=createHash('sha256').update(bytes).digest('hex');
 if(hash!==row.sha256||index.records.some(r=>r.sourceSha256===hash))throw Error('Changed or leaked evaluation photograph: '+row.id);
 const tensor=await model(await wholePartImage(await RawImage.read(row.file))),comparison=compareBareParts([Array.from(tensor.data,Number)],index);tensor.dispose();
 records.push({id:row.id,expected:row.expected,partition:row.partition,sourceSha256:hash,comparison});console.log(row.id,'=>',comparison.candidates[0]?.id,comparison.status);
}}finally{await model.dispose()}
const positive=records.filter(r=>r.partition==='known-regression'&&r.expected!=='unknown');
const report={evaluatedAt:new Date().toISOString(),scope:'Known regression labels and one same-provider reserved retailer photograph, not independent real-world accuracy or physical part identification. All accepted:false. Source images remain private.',referenceSha256:createHash('sha256').update(bytes).digest('hex'),policySha256:createHash('sha256').update(policy).digest('hex'),sourceAudit,summary:{knownPositiveTopOne:positive.filter(r=>r.expected===r.comparison.candidates[0]?.id).length,knownPositives:positive.length,incorrectReviewLeads:records.filter(r=>r.comparison.status==='review'&&r.expected!==r.comparison.candidates[0]?.id).length,reservedCorrectReview:records.filter(r=>r.partition==='reserved-evaluation'&&r.comparison.status==='review'&&r.expected===r.comparison.candidates[0]?.id).length},records};
await writeFile(process.argv[3]||work+'/evaluation-final.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));
