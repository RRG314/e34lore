import {mkdir,copyFile,readdir,rm,stat,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash}from'node:crypto';
import {gzipSync} from 'node:zlib';
const root=process.cwd();
// The scanner uses Tesseract's LSTM-only engine. Keep its plain WASM, SIMD
// and relaxed SIMD variants so the worker can select one for each browser.
const legacyCore = /^tesseract-core(?:-simd|-relaxedsimd)?(?:\.wasm)?\.js$|^tesseract-core(?:-simd|-relaxedsimd)?\.wasm$/;
// The browser worker imports the self-contained LSTM bundles, which embed
// the WASM. The standalone loaders and their separate binaries are unused.
const lstmCore = /^tesseract-core(?:-simd|-relaxedsimd)?-lstm\.wasm\.js$/;
const standaloneLstm = /^tesseract-core(?:-simd|-relaxedsimd)?-lstm\.(?:js|wasm)$/;
const ocrCore = 'public/scanner-runtime/ocr/core';
await mkdir(ocrCore, { recursive: true });
for (const file of await readdir(ocrCore)) {
  if (legacyCore.test(file)||standaloneLstm.test(file)) await rm(path.join(ocrCore, file));
}
for(const [dir,target,predicate]of [['node_modules/onnxruntime-web/dist','public/scanner-runtime/onnx',n=>/^ort-wasm-simd-threaded\.(wasm|mjs)$/.test(n)],['node_modules/tesseract.js/dist','public/scanner-runtime/ocr',n=>n==='worker.min.js'],['node_modules/tesseract.js-core',ocrCore,n=>lstmCore.test(n)]]){await mkdir(path.join(root,target),{recursive:true});for(const name of await readdir(path.join(root,dir)))if(predicate(name))await copyFile(path.join(root,dir,name),path.join(root,target,name));}
await mkdir('public/scanner-runtime/ocr/lang',{recursive:true});
const lang='public/scanner-runtime/ocr/lang/eng.traineddata.gz';try{await stat(lang);}catch{const r=await fetch('https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int/eng.traineddata.gz');if(!r.ok)throw Error('OCR language download failed');await writeFile(lang,Buffer.from(new Uint8Array(await r.arrayBuffer())));}
console.log('Prepared local OCR and ONNX WASM assets.');

const bytes=await readFile(lang);if(createHash('sha256').update(bytes).digest('hex')!=="45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91")throw Error('OCR language file digest mismatch');
for(const [pkg,target]of [['onnxruntime-web','onnx'],['tesseract.js','ocr'],['tesseract.js-core','ocr/core']]){for(const filename of ['LICENSE','LICENSE.txt','LICENSE.md']){try{await copyFile('node_modules/'+pkg+'/'+filename,'public/scanner-runtime/'+target+'/LICENSE-'+pkg.replaceAll('.','-')+'.txt');break;}catch{}}}

await copyFile("data/scanner/licenses/ONNX-Runtime-MIT.txt","public/scanner-runtime/onnx/LICENSE-onnxruntime.txt");
const onnxWasm='public/scanner-runtime/onnx/ort-wasm-simd-threaded.wasm';
if(process.env.E34_E30_BUILD==='1') {
  await writeFile(onnxWasm+'.bin',gzipSync(await readFile(onnxWasm),{level:6}));
  await rm(onnxWasm);
} else {
  await rm(onnxWasm+'.bin',{force:true});
}
