import fs from 'node:fs/promises';
import {statSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {siteContent} from '../site-content.mjs';
import {assetFiles} from './asset-boundary.mjs';
import {e30ReleaseEnabled} from '../vite/e30-release-plugin.mjs';
import {immutableAssetAliases} from './immutable-asset-aliases.mjs';
import {compressModelAsset, modelAssetPackage, releaseManifestPaths} from './compressed-model-manifests.mjs';

export async function prepareDeploymentAssets(clientDir, serverDir) {
  // Sites' upload currently exposes files excluded by Wrangler's .assetsignore.
  // Keep source/build indexes physically outside its public upload directory.
  const indexes = ['.vite/manifest.json','.vite/vinext-client-reference-sources.json'];
  const actual = await assetFiles(path.join(clientDir,'.vite'));
  assert.deepEqual(actual,['manifest.json','vinext-client-reference-sources.json'],'Unexpected Vite metadata; review before packaging');
  const ignore = await fs.readFile(path.join(clientDir,'.assetsignore'),'utf8');
  assert.deepEqual(ignore.trim().split(/\r?\n/),['wrangler.json','.dev.vars','.vite'],'Unexpected asset exclusions');
  const destination=path.join(serverDir,'build-indexes');
  await fs.mkdir(destination,{recursive:true});
  for(const filename of [...indexes,'.assetsignore']){
    const target=path.join(destination,filename);
    await fs.mkdir(path.dirname(target),{recursive:true});
    await fs.rename(path.join(clientDir,filename),target);
  }
  await fs.rmdir(path.join(clientDir,'.vite'));
  return indexes.length+1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const content=siteContent();
 if(content.release && e30ReleaseEnabled()) {
   const aliases=immutableAssetAliases(content.publicDir);
   for(const [duplicate,canonical] of Object.entries(aliases)){
     const target=await fs.stat('dist/client'+canonical);
     assert.ok(target.isFile(),'Expected a packaged asset for '+duplicate);
     await fs.unlink('dist/client'+duplicate);
   }
   console.log('Reused '+Object.keys(aliases).length+' byte-identical archived assets.');
   const {compressed, omitted} = modelAssetPackage(aliases);
   for (const url of omitted) {
     if (!aliases[url]) await fs.unlink('dist/client' + url);
   }
   let saved = 0;
   for (const url of [...releaseManifestPaths(), ...compressed]) {
     if (aliases[url]) continue;
     const filename = 'dist/client' + url;
     const raw = await fs.readFile(filename);
     const packed = compressModelAsset(raw);
     await fs.writeFile(filename, packed);
     saved += raw.length - packed.length;
   }
   console.log('Omitted '+omitted.size+' preview files and compressed packaged model assets, saving '+saved+' bytes before upload.');
 }
 const count=await prepareDeploymentAssets('dist/client','dist/server');
 const maps=await archiveServerMaps(path.resolve('dist/server'),path.resolve('work/server-source-maps'));
 console.log(`Moved ${count} private build indexes and ${maps} server source maps outside the upload tree; runtime bundles unchanged.`);
 if (e30ReleaseEnabled()) {
   let bytes = statSync('.openai/hosting.json', {throwIfNoEntry: false})?.size ?? 0;
   for (const directory of ['dist/client', 'dist/server']) {
     for (const name of await assetFiles(directory)) bytes += (await fs.stat(path.join(directory, name))).size;
   }
   assert(bytes <= 256 * 1024 * 1024, 'Site assets exceed the 256 MiB upload limit: ' + bytes + ' bytes.');
   console.log('Site package expands to ' + bytes + ' bytes.');
 }
}


// Debugging maps do not belong in the deployed Worker archive. Preserve them
// separately; this leaves every executable module and immutable asset intact.
export async function archiveServerMaps(serverDir, destinationDir) {
  let count=0;
  async function visit(directory) {
    for (const item of await fs.readdir(directory,{withFileTypes:true})) {
      const file=path.join(directory,item.name);
      if(item.isDirectory()) await visit(file);
      else if(item.isFile()&&item.name.endsWith('.map')) {
        const destination=path.join(destinationDir,path.relative(serverDir,file));
        await fs.mkdir(path.dirname(destination),{recursive:true});
        await fs.rename(file,destination);count++;
      }
    }
  }
  await visit(serverDir);return count;
}
