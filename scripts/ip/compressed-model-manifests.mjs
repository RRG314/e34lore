import fs from 'node:fs';
import path from 'node:path';
import { siteContent } from '../site-content.mjs';
import { gunzipSync, gzipSync } from 'node:zlib';

const registry = 'data/digital-twin/';
const current = ['public-reference', 'vehicle-references', '525i-service-release', 'e30-candidate','e30-vehicle-references'];
const previous = ['workshop-panel-archives', 'reference-archives', '525i-automatic-reference'];
// Earlier readers may still be using an older manifest. Compress only new
// service meshes and previously compressed paths.
const firstGuidedRepairGeometry = {e30:1191,e34:1047};
const manifestPath = /^\/models\/(?:e34|e30)-lore\/r\d+\/manifest\.[a-f0-9]{64}\.json$/;

function modelPins() {
  return [...current, ...previous].flatMap(name => {
    const value = JSON.parse(fs.readFileSync(registry + name + '.json', 'utf8'));
    if (name === 'reference-archives') return Object.values(value);
    return value;
  });
}

export function releaseManifestPaths() {
  return new Set(modelPins().filter(pin => !pin.previewOnly).map(({ manifestUrl }) => {
    if (!manifestPath.test(manifestUrl)) throw Error('Invalid released model manifest path');
    return manifestUrl;
  }));
}

export function modelAssetPackage(aliases) {
  const {publicDir}=siteContent();
  const pins = modelPins();
  const previewDirectories = new Set(pins.filter(pin => pin.previewOnly).map(pin => path.posix.dirname(pin.manifestUrl)));
  const kept = new Set();
  const compressed = new Set();
  for (const pin of pins.filter(pin => !pin.previewOnly)) {
    const { assets } = JSON.parse(fs.readFileSync(publicDir + pin.manifestUrl, 'utf8'));
    for (const asset of assets) {
      const url = aliases[asset.url] ?? asset.url;
      kept.add(url);
      const directory = path.posix.dirname(url);
      const revision = /^\/models\/(e30|e34)-lore\/r(\d+)$/.exec(directory);
      const guidedRepairAsset = revision && Number(revision[2]) >= firstGuidedRepairGeometry[revision[1]];
      // Keep the archived reference available within the Site package limit.
      // The Workshop loader accepts both raw and gzip geometry at these URLs.
      const archivedServiceAsset = /^\/models\/e34-lore\/r1021$/.test(directory);
      if (guidedRepairAsset || archivedServiceAsset || previewDirectories.has(directory) || (pin.id.startsWith('e30-') && pin.revision >= 1177 && directory === path.posix.dirname(pin.manifestUrl))) {
        compressed.add(url);
      }
    }
  }
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (!previewDirectories.has(path.posix.dirname(alias))) kept.add(canonical);
  }
  const omitted = new Set();
  for (const directory of previewDirectories) {
    for (const name of fs.readdirSync(publicDir + directory)) {
      const url = directory + '/' + name;
      if (!kept.has(url) && !kept.has(aliases[url])) omitted.add(url);
    }
  }
  return { compressed, omitted };
}

export function compressModelAsset(bytes) {
  return gzipSync(bytes, { level: 9 });
}

export function unpackModelManifest(bytes) {
  return gunzipSync(bytes, { maxOutputLength: 4 * 1024 * 1024 });
}

export function unpackModelGeometry(bytes) {
  return gunzipSync(bytes, { maxOutputLength: 8 * 1024 * 1024 });
}
