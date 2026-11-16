import { releasePublic, hasReleasePack } from './release-content';
import {describe,it,expect} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {assetFiles,privateAssetReason} from '../scripts/ip/asset-boundary.mjs';
import {checkPublicAssets} from '../scripts/check-public-assets.mjs';
import {prepareDeploymentAssets} from '../scripts/ip/prepare-deployment-assets.mjs';

describe('asset release boundaries',()=>{
  it('physically separates generated source indexes instead of relying on uploader ignore behavior',async()=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'e34-ip-package-'));
    const client=path.join(root,'client'),server=path.join(root,'server');
    try{
      await fs.mkdir(path.join(client,'.vite'),{recursive:true});
      await fs.writeFile(path.join(client,'.vite/manifest.json'),'{}');
      await fs.writeFile(path.join(client,'.vite/vinext-client-reference-sources.json'),'{}');
      await fs.writeFile(path.join(client,'.assetsignore'),'wrangler.json\n.dev.vars\n.vite\n');
      await fs.writeFile(path.join(client,'viewer.js'),'runtime');
      expect(await prepareDeploymentAssets(client,server)).toBe(3);
      expect(await assetFiles(client)).toEqual(['viewer.js']);
      expect(await fs.readFile(path.join(server,'build-indexes/.vite/manifest.json'),'utf8')).toBe('{}');
    }finally{await fs.rm(root,{recursive:true,force:true});}
  });
  it('rejects confidential/source assets, including nested documents and source maps',()=>{
    for(const p of ['.env.local','.git/config','private/photo.jpg','docs/ip/policy.md','data/manual.pdf','manual.pdf','MASTER_SPEC.md','models/car.blend','models/car.FCStd','models/private.glb','engine.master.glb','assets/a.js.map','assets/../.dev.vars','src/main.tsx','qa-responsive.html','catalog/archive.zip','wrangler.json']) expect(privateAssetReason(p),p).not.toBeNull();
  });
  it('preserves viewer files, attribution, Android association and pinned OCR data',()=>{
    for(const p of ['models/e34-lore/r14/abc.glb','models/e34-525i/LICENSE.md','fonts/dmsans-OFL.txt','scanner/REFERENCE-CREDITS.md','.well-known/assetlinks.json','assets/hero/photo-original.jpg','scanner-runtime/ocr/lang/eng.traineddata.gz','assets/main.js','assets/worker.wasm','offline.html']) expect(privateAssetReason(p),p).toBeNull();
  });
  it('rejects symlinked public assets',async()=>{
    const dir=await fs.mkdtemp(path.join(os.tmpdir(),'e34-ip-tree-'));
    try {await fs.symlink('/etc/hosts',path.join(dir,'copy.txt'));await expect(assetFiles(dir)).rejects.toThrow('Symlink');}
    finally{await fs.rm(dir,{recursive:true,force:true});}
  });
  it('requires matching release hashes and rejects a new model even if ignored by Git',async()=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'e34-ip-release-'));
    try {
      await fs.mkdir(path.join(root,'public/models'),{recursive:true});
      await fs.mkdir(path.join(root,'data/ip'),{recursive:true});
      const file=path.join(root,'public/models/reference.glb');
      await fs.writeFile(file,'viewer fixture');
      await fs.writeFile(path.join(root,'data/ip/public-assets.json'),JSON.stringify({files:{'models/reference.glb':createHash('sha256').update('viewer fixture').digest('hex')}}));
      expect(await checkPublicAssets(root)).toBe(1);
      await fs.writeFile(file,'changed geometry');
      await expect(checkPublicAssets(root)).rejects.toThrow('without provenance');
      await fs.writeFile(file,'viewer fixture');
      await fs.writeFile(path.join(root,'public/models/new-car.glb'),'unpublished fixture');
      await expect(checkPublicAssets(root)).rejects.toThrow('Public assets changed');
    }finally{await fs.rm(root,{recursive:true,force:true});}
  });
  it('checks the executable scanner payload across gzip versions',async()=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'e34-onnx-pin-'));
    const name='scanner-runtime/onnx/ort-wasm-simd-threaded.wasm.bin';
    const payload=Buffer.alloc(256, 3);
    try{
      const asset=path.join(root,'public',name);
      await fs.mkdir(path.dirname(asset),{recursive:true});
      await fs.mkdir(path.join(root,'data/ip'),{recursive:true});
      await fs.writeFile(path.join(root,'data/ip/public-assets.json'),JSON.stringify({files:{[name]:createHash('sha256').update(payload).digest('hex')}}));
      await fs.writeFile(asset,gzipSync(payload,{level:1}));
      expect(await checkPublicAssets(root)).toBe(1);
      await fs.writeFile(asset,gzipSync(payload,{level:9}));
      expect(await checkPublicAssets(root)).toBe(1);
      await fs.writeFile(asset,gzipSync(Buffer.alloc(256, 4)));
      await expect(checkPublicAssets(root)).rejects.toThrow('without provenance');
    }finally{await fs.rm(root,{recursive:true,force:true});}
  });
});

describe.skipIf(!hasReleasePack)('active model attribution',()=>{
 it('carries actual viewer hashes and all recorded creators for every active reference',async()=>{
  const current=JSON.parse(await fs.readFile('data/digital-twin/public-reference.json','utf8'));
  const variants=JSON.parse(await fs.readFile('data/digital-twin/vehicle-references.json','utf8'));
  const notice=JSON.parse(await fs.readFile((releasePublic + '/models/ATTRIBUTION.json'),'utf8'));
  const files=new Map(notice.files.map((entry:{file:string})=>[entry.file,entry]));
  for(const release of [current,...variants]){
   const model=JSON.parse(await fs.readFile(releasePublic +release.manifestUrl,'utf8'));
   for(const asset of model.assets){
    const entry=files.get(asset.url) as {sha256:string;sourceCredit:{url?:string;source?:string}[]};
    expect(entry,asset.url).toBeDefined();expect(entry.sha256).toBe(asset.sha256);
    for(const credit of model.credits||[model.credit])expect(entry.sourceCredit.some(c=>c.url===credit.url||c.source===credit.url)).toBe(true);
   }
  }
 });
});
