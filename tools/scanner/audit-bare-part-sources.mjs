import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {readSourceAudit} from './reference-integrity.mjs';
const sources=JSON.parse(await readFile('data/scanner/local-v2/sources.json','utf8'));
const regression=JSON.parse(await readFile('work/scanner-v2/regression-inputs.json','utf8'));
const report=await readSourceAudit(sources,regression,{inspectPixels:true});
const output=process.argv[2]||'work/scanner-v2/source-audit.json';await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,images:undefined}));
