import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { pipeline, env } from '@huggingface/transformers';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../../..'),root=resolve(process.argv[2]||resolve(repo,'work/scanner-evaluation'));
env.cacheDir=resolve(root,'model-cache');env.allowLocalModels=false;env.useBrowserCache=false;
const model={detector:{id:'Xenova/owlvit-base-patch32',revision:'b75f4e52949639c3bb0b96546ea4149482f6e7ef',dtype:'q8',bytes:155431700},retriever:{id:'Xenova/clip-vit-base-patch32',revision:'6b7c523703ae26e39be4b03774966f8571c7f523',dtype:'q8',bytes:89117001}};
const queries=[['water pump','an automotive water pump'],['alternator','an alternator'],['brake caliper','a brake caliper'],['oil filter','an oil filter'],['spark plug','a spark plug'],['thermostat housing','a thermostat housing'],['engine','a car engine'],['battery','a car battery'],['radiator','a car radiator'],['air intake','an engine air intake'],['starter motor','a starter motor'],['wheel','a car tire and wheel']];
const sources=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'));
const release=JSON.parse(await readFile(resolve(repo,'data/digital-twin/public-reference.json'),'utf8'));
const manifest=JSON.parse(await readFile(resolve(repo,'public'+release.manifestUrl),'utf8'));
const refs=[['water pump','m50:water-pump'],['alternator','m50:alternator'],['brake caliper','e34sys:brake-caliper-front--1'],['oil filter','m50:oil-filter-element'],['spark plug','m50:spark-plug:1'],['thermostat housing','m50:thermostat-housing'],['engine','m50:block'],['battery','e34sys:rear-seat-battery'],['radiator','e34sys:radiator']].map(([category,id])=>({category,id,...manifest.nodes.find(n=>n.id===id)}));
let peak=process.memoryUsage().rss;const timer=setInterval(()=>peak=Math.max(peak,process.memoryUsage().rss),50);
const out={schema:1,started_at:new Date().toISOString(),runtime:{node:process.version,transformers:'4.3.2',platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,cpu_count:os.cpus().length,total_memory_bytes:os.totalmem(),backend:'Node ONNX Runtime CPU, not browser or mobile'},models:model,detector_threshold:0.1,retrieval_threshold:0.5,limitation:'Eight convenience real photos; no training or threshold calibration performed on them. Categories from Commons descriptions with visual researcher review, not verified OEM labels. No localization ground truth. Synthetic-render reference corpus, not OEM part-photo ground truth. No production recognition certification.',records:[],refs:refs.map(r=>({id:r.id,category:r.category,thumbnail:r.thumbnail,synthetic:true,oem_verified:false}))};
let pipe;
const save=async()=>{out.peak_process_rss_bytes=peak;out.finished_at=new Date().toISOString();await writeFile(resolve(root,'results.json'),JSON.stringify(out,null,2));};
const options=(m)=>({revision:m.revision,dtype:m.dtype,device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
try{
 console.log('Loading pinned quantized OWL-ViT');let start=performance.now();pipe=await pipeline('zero-shot-object-detection',model.detector.id,options(model.detector));out.detector_load_ms=Math.round(performance.now()-start);
 for(const r of sources.records){start=performance.now();const detections=await pipe(resolve(root,r.file),queries.map(x=>x[1]),{threshold:out.detector_threshold,top_k:5});const mapped=detections.map(d=>({...d,category:queries.find(x=>x[1]===d.label)?.[0]}));out.records.push({id:r.id,expected:r.component_category,mode:r.viewpoint,sha256:r.sha256,detector_ms:Math.round(performance.now()-start),detections:mapped,detector_top1_hit:mapped[0]?.category===r.component_category,detector_top5_hit:mapped.some(x=>x.category===r.component_category),rejected:mapped.length===0});console.log('Detection',r.id,out.records.at(-1).detector_ms,mapped[0]?.category??'rejected');await save();}
 await pipe.dispose();pipe=null;
 console.log('Loading pinned CLIP image-only q8');start=performance.now();pipe=await pipeline('image-feature-extraction',model.retriever.id,options(model.retriever));out.retriever_load_ms=Math.round(performance.now()-start);
 const norm=(data)=>{const a=Array.from(data),n=Math.sqrt(a.reduce((s,x)=>s+x*x,0));return a.map(x=>x/(n||1));};
 const embed=async path=>norm((await pipe(path)).data);
 const vectors=[];for(const r of refs){vectors.push({id:r.id,category:r.category,thumbnail:r.thumbnail,vector:await embed(resolve(repo,'public'+r.thumbnail))});}
 await writeFile(resolve(root,'synthetic-reference-embeddings.json'),JSON.stringify({model:model.retriever,synthetic:true,model_revision:14,records:vectors}));
 for(let i=0;i<sources.records.length;i++){const r=sources.records[i];start=performance.now();const v=await embed(resolve(root,r.file));const rank=vectors.map(x=>({id:x.id,category:x.category,cosine:x.vector.reduce((s,y,j)=>s+y*v[j],0)})).sort((a,b)=>b.cosine-a.cosine);Object.assign(out.records[i],{retrieval_ms:Math.round(performance.now()-start),retrieval_top5:rank.slice(0,5),retrieval_top1_hit:rank[0]?.category===r.component_category,retrieval_top5_hit:rank.slice(0,5).some(x=>x.category===r.component_category),retrieval_rejected:rank[0]?.cosine<out.retrieval_threshold});console.log('Retrieval',r.id,out.records[i].retrieval_ms,rank[0]);await save();}
 await pipe.dispose();pipe=null;
 const pos=out.records.filter(r=>r.expected!=='unknown'),neg=out.records.filter(r=>r.expected==='unknown');out.metrics={positive_images:pos.length,negative_images:neg.length,detector_top1_hits:pos.filter(r=>r.detector_top1_hit).length,detector_top5_hits:pos.filter(r=>r.detector_top5_hit).length,detector_negative_false_accepts:neg.filter(r=>!r.rejected).length,retrieval_top1_hits:pos.filter(r=>r.retrieval_top1_hit).length,retrieval_top5_hits:pos.filter(r=>r.retrieval_top5_hit).length,retrieval_negative_false_accepts:neg.filter(r=>!r.retrieval_rejected).length};
 out.status='completed';
}catch(e){out.status='failed';out.error=String(e?.stack||e);console.error(out.error);process.exitCode=1;}
finally{clearInterval(timer);if(pipe)await pipe.dispose();await save();}
