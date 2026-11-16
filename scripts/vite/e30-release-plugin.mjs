import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const pinFile = 'data/digital-twin/e30-candidate.json';
const assetRoot = 'public';
const referenceModule = '\0e30-release-reference';

export function e30ReleaseEnabled() {
  return process.env.E34_E30_BUILD === '1';
}

function readChecked(asset, pattern) {
  if (!pattern.test(asset.url) || !/^[a-f0-9]{64}$/.test(asset.sha256))
    throw Error('Invalid E30 release asset URL or hash');
  const bytes = fs.readFileSync(assetRoot + asset.url);
  if (bytes.length > 8 * 1024 * 1024 || (asset.bytes && bytes.length !== asset.bytes)
      || createHash('sha256').update(bytes).digest('hex') !== asset.sha256)
    throw Error('E30 release asset does not match its pin: '+asset.url);
  return bytes;
}

function releaseManifest() {
  const release = JSON.parse(fs.readFileSync(pinFile,'utf8'));
  if (release.id !== 'e30-325i-coupe-manual' || !Number.isSafeInteger(release.revision) || release.revision < 1108
      || release.manifestUrl !== '/models/e30-lore/r'+release.revision+'/manifest.'+release.sha256+'.json')
    throw Error('Expected the corrected E30 325i coupe release pin');
  const bytes = readChecked({...release,url:release.manifestUrl},/^\/models\/e30-lore\/r\d+\/manifest\.[a-f0-9]{64}\.json$/);
  const model = JSON.parse(bytes);
  if (model.id !== release.id || model.revision !== release.revision || !model.cabin ||
      !model.assets.some(asset=>asset.id==='e30:325i-exterior') ||
      model.catalog?.context?.id !== release.contextId)
    throw Error('E30 release manifest identity or coverage mismatch');
  return {release,model,bytes};
}

export function e30ReleasePlugin(command) {
  const localDevelopment = command === 'serve' && process.env.E34_BUILD_REVIEW !== '1';
  if (!localDevelopment && (command !== 'build' || !e30ReleaseEnabled())) return null;
  const {release,model} = releaseManifest();
  for(const asset of model.assets) readChecked(asset,/^\/models\/e30-lore\/r\d+\/[a-f0-9]{64}\.glb$/);
  return {
    name:'e34-e30-release',
    enforce:'pre',
    config:()=>({define:{'import.meta.env.E34_E30_BUILD':'true'}}),
    configureServer(server) {
      const pin = path.resolve(pinFile);
      server.watcher.add(pin);
      server.watcher.on('change', file => {
        if (pin === path.resolve(file)) void server.restart();
      });
    },
    resolveId(id,importer) {
      if (importer && id.endsWith('/local-e30-reference')) return referenceModule;
    },
    load(id) {
      if (id === referenceModule) return 'export default '+JSON.stringify(release)+'; export const localE30Archives = [];';
    },
  };
}
