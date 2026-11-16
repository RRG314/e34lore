// Evaluation labels are read only after inference. Photos remain outside public/.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {pipeline,env} from '@huggingface/transformers';
const root=resolve(process.argv[2]||'work/bearing-test'),cache=resolve(process.argv[3]||root+'/model-cache');
await mkdir(root,{recursive:true});
const compiled=resolve(root,'comparison.mjs');
await build({entryPoints:['src/scanner/family-comparison.ts'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:compiled,logLevel:'silent'});
const {compareFamilies}=await import(pathToFileURL(compiled));
const vectors=JSON.parse(await readFile('src/scanner/family-vectors.json','utf8'));
const source=JSON.parse(await readFile('docs/scanner/bearing-test/evaluation-sources.json','utf8'));
env.cacheDir=cache;env.allowLocalModels=false;env.useBrowserCache=false;
const start=performance.now(),pipe=await pipeline('image-feature-extraction',vectors.model.id,{revision:vectors.model.revision,dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
const report={schema:1,date:new Date().toISOString(),model:vectors.model,taxonomySha256:vectors.taxonomySha256,loadMs:performance.now()-start,runtime:'Node CPU, not phone acceptance',limits:'Convenience checks. One retailer bearing photo, not independent OEM ground truth. No test-time prompt tuning; no trained E34 recognition or calibrated probability. No physical owner images supplied yet.',records:[]};
try{
 for(const record of source.records){
  const file=resolve(root,record.file),bytes=await readFile(file);
  if(createHash('sha256').update(bytes).digest('hex')!==record.sha256)throw Error('Image hash mismatch: '+record.id);
  const start=performance.now(),tensor=await pipe(file),comparison=compareFamilies([Array.from(tensor.data,Number)],vectors);tensor.dispose();
  report.records.push({id:record.id,expected:record.expected,sha256:record.sha256,ms:performance.now()-start,...comparison});
  console.log(record.id,comparison.candidates[0]?.id,comparison.status);
 }
}finally{await pipe.dispose();report.peakRssBytes=process.resourceUsage().maxRSS*1024;await writeFile('docs/scanner/bearing-test/evaluation-results.json',JSON.stringify(report,null,2)+'\n');}
