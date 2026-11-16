import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {Plugin} from 'vite';
/** ONNX dynamically imports its factory. Vite's public-dir module transform rejects
 * that import in development; return the already-vendored bytes before transformation.
 * Production continues using the same ordinary static assets. No executable remote code. */
export function scannerRuntimeDev():Plugin {
 let root='';
 return {name:'e34-scanner-runtime-dev',apply:'serve',configResolved(config){root=config.root},configureServer(server){
  server.middlewares.use(async(req,res,next)=>{
   const pathname=(req.url||'').split('?')[0];
   // Serve a supplied manual excerpt only in the development preview.
   if(pathname==='/source-preview/manual/center-bearing-removal.png'){
    if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.end();return;}
    const file=resolve(root,'work/bearing-test/manual-268.png');
    try{const metadata=await stat(file);res.setHeader('Content-Type','image/png');res.setHeader('Content-Length',metadata.size);res.setHeader('Cache-Control','private,no-store');res.setHeader('X-Content-Type-Options','nosniff');if(req.method==='HEAD'){res.end();return;}const stream=createReadStream(file);res.on('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);}catch{res.statusCode=404;res.end('The local manual excerpt is unavailable.');}return;
   }
   if(pathname==='/scanner-lab/reference-index.json'){
    if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.end();return;}
    const file=resolve(root,'data/scanner/local-v2/reference-index.json');
    try{const metadata=await stat(file);res.setHeader('Content-Type','application/json');res.setHeader('Content-Length',metadata.size);res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');if(req.method==='HEAD'){res.end();return;}const stream=createReadStream(file);res.on('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);}catch{res.statusCode=503;res.end('Prepare the local part references before scanning.');}return;
   }
   const modelPrefix='/scanner-models/6b7c523703ae26e39be4b03774966f8571c7f523/Xenova/clip-vit-base-patch32/';
   const modelFile=pathname.startsWith(modelPrefix)?pathname.slice(modelPrefix.length):'';
   if(['config.json','preprocessor_config.json','onnx/vision_model_quantized.onnx'].includes(modelFile)){
    if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.end();return;}
    const file=resolve(root,'work/scanner-models/6b7c523703ae26e39be4b03774966f8571c7f523',modelFile);
    try{const metadata=await stat(file);res.setHeader('Content-Type',modelFile.endsWith('.json')?'application/json':'application/octet-stream');res.setHeader('Content-Length',metadata.size);res.setHeader('Cache-Control','public,max-age=31536000,immutable');res.setHeader('X-Content-Type-Options','nosniff');if(req.method==='HEAD'){res.end();return;}const stream=createReadStream(file);res.on('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);}catch{res.statusCode=503;res.end('Local recognition files are not prepared.');}return;
   }

   if(!['/scanner-runtime/onnx/ort-wasm-simd-threaded.mjs','/scanner-runtime/onnx/ort-wasm-simd-threaded.wasm'].includes(pathname))return next();
   if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.end();return;}
   const file=resolve(root,'public'+pathname);
   try {
    const metadata=await stat(file);
    res.setHeader('Content-Type',pathname.endsWith('.wasm')?'application/wasm':'text/javascript');
    res.setHeader('Content-Length',metadata.size);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-cache');
    if(req.method==='HEAD'){res.end();return;}
    const stream=createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
   } catch {res.statusCode=503;res.end('Prepare the scanner runtime before starting this preview.');}
  });
 }};
}
