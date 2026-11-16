// Offline, reproducible text prototypes. No owner labels or vehicle context are inputs.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {AutoTokenizer,CLIPTextModelWithProjection,env} from '@huggingface/transformers';
import {componentFamilies} from '../../src/scanner/families.ts';
const id='Xenova/clip-vit-base-patch32',revision='6b7c523703ae26e39be4b03774966f8571c7f523';
const outputFile=resolve(process.argv[3]||'src/scanner/family-vectors.json'),dtype=process.argv[4]||'q8';
if(!['q8','fp32'].includes(dtype))throw Error('Use q8 or fp32 text prototypes');
if(dtype!=='q8'&&outputFile===resolve('src/scanner/family-vectors.json'))throw Error('Experimental prototypes must not replace released vectors');
env.cacheDir=resolve(process.argv[2]||'work/bearing-test/model-cache');env.allowLocalModels=false;
const tokenizer=await AutoTokenizer.from_pretrained(id,{revision});
const model=await CLIPTextModelWithProjection.from_pretrained(id,{revision,dtype,device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
const records=[];
try {
 for(const family of componentFamilies){
  const prompts=family.prompts.map(p=>'A photo of '+p+'.');
  const inputs=await tokenizer(prompts,{padding:true,truncation:true}),outputs=await model(inputs);
  const rows=outputs.text_embeds.tolist();
  const normalized=rows.map(r=>{const length=Math.hypot(...r);return r.map(v=>v/length)});
  const mean=Array.from({length:512},(_,i)=>normalized.reduce((s,r)=>s+r[i],0)/rows.length),length=Math.hypot(...mean);
  records.push({id:family.id,embedding:mean.map(v=>v/length)});
  for(const t of Object.values({...inputs,...outputs}))t.dispose?.();
 }
 const weight=await readFile(resolve(env.cacheDir,id,revision,'onnx/'+(dtype==='q8'?'text_model_quantized.onnx':'text_model.onnx'))),weightHash=createHash('sha256').update(weight).digest('hex');
 const data={schema:1,model:{id,revision,dtype:'q8',license:'MIT'},method:'Mean of L2-normalized projected text prompts, renormalized. No image training or probability calibration.',prototypeEncoder:{dtype,weightBytes:weight.length,sha256:weightHash},taxonomySha256:createHash('sha256').update(JSON.stringify(componentFamilies)).digest('hex'),records};
 const output=JSON.stringify(data);await mkdir(resolve(outputFile,'..'),{recursive:true});await writeFile(outputFile,output+'\n');
 const receipt=outputFile===resolve('src/scanner/family-vectors.json')?resolve('docs/scanner/bearing-test/prototype-receipt.json'):outputFile+'.receipt.json';
 await writeFile(receipt,JSON.stringify({generatedAt:new Date().toISOString(),model:data.model,prototypeEncoder:data.prototypeEncoder,taxonomySha256:data.taxonomySha256,outputSha256:createHash('sha256').update(output+'\n').digest('hex'),families:records.length,dimensions:512,source:'https://huggingface.co/'+id+'/tree/'+revision,library:'@huggingface/transformers@4.3.2'},null,2)+'\n');
 console.log('Generated',records.length,'family vectors.');
} finally {await model.dispose()}
