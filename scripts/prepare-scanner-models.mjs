import {mkdir,writeFile,symlink,unlink,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const revision='6b7c523703ae26e39be4b03774966f8571c7f523',model='Xenova/clip-vit-base-patch32';
const cache=resolve(process.argv[2]||process.env.E34_SCANNER_MODEL_CACHE||'../e34-collective/work/scanner-evaluation/model-cache',model,revision),destination=resolve('work/scanner-models',revision);
const records=[];
for(const file of ['config.json','preprocessor_config.json','onnx/vision_model_quantized.onnx']){
 const path=resolve(cache,file),hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);const sha256=hash.digest('hex');
 if(file.endsWith('.onnx')&&sha256!=='583fd1110a514667812fee7d684952aaf82a99b959760c8d7dca7e0ab9839299')throw Error('Pinned vision weights do not match.');
 const out=resolve(destination,file);await mkdir(resolve(out,'..'),{recursive:true});try{await unlink(out)}catch{}
 await symlink(path,out);records.push({file,sha256,bytes:(await stat(path)).size});
}
await writeFile(resolve(destination,'receipt.json'),JSON.stringify({model,revision,license:'MIT',files:records},null,2)+'\n');
console.log('Prepared pinned vision files for the private Wi-Fi preview.');
