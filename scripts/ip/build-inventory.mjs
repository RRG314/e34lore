import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { assetFiles, privateAssetReason, reviewedAssetPayload } from './asset-boundary.mjs';

const json = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const registry = await json('data/ip/rights-families.json');
const overrides = new Map();
function photo(file, p) {
  overrides.set(file, { family: 'licensed-photo', creator: p.creator, source: p.filePageUrl ?? p.source,
    license: p.license, licenseUrl: p.licenseUrl, attribution: p.attribution ?? `${p.creator}; ${p.filePageUrl ?? p.source}; ${p.license}`,
    changes: p.changes ?? 'See source record', sourceRecord: p.sourceRecord,
    permittedUses: /public domain|^CC0/i.test(p.license) ? 'Source declares public domain; preserve provenance, no endorsement or trademark license.' : `Share/adapt under ${p.license}; retain credit, source, license and changes. ${p.license.includes('BY-SA') ? 'Adaptations must use the same or a compatible license; no extra restrictions on licensed rights.' : 'No additional restrictions on licensed rights.'}`,
    ownership: 'Third-party work; no E34 Lore ownership claim', aiStatus: 'Source-declared photograph, not project-generated', review: 'Source declaration recorded; upstream rights not independently warranted' });
}
for (const filename of ['src/data/hero-photos.json', 'src/data/e30-hero-photos.json', 'data/engine-photo-sources.json']) {
  for (const p of await json(filename)) photo(`public${p.localPath}`, { ...p, sourceRecord: filename });
}
for (const p of (await json('public/scanner/reference-index.json')).records.filter(p => !p.synthetic)) {
  photo(`public${p.thumbnail}`, { ...p.provenance, sourceRecord: 'public/scanner/reference-index.json' });
}
// Shared family photographs carry their own rights evidence. Adding a family
// example must not require copying it into the released recognition index.
for (const p of (await json('data/parts-media/manifest.json')).records.filter(p=>p.kind==='photograph')) {
  photo(`public${p.image}`, {...p.rights,creator:p.rights.attribution,source:p.source,sourceRecord:'data/parts-media/manifest.json'});
}
const diagrams = await fs.readFile('src/data/diagrams.ts', 'utf8');
for (const m of diagrams.matchAll(/image:\s*"([^"]+)"[\s\S]*?credit:\s*"([^"]+)"[\s\S]*?source:\s*"([^"]+)"/g)) {
  overrides.set(`public${m[1]}`, { family: 'oem-artwork', creator: m[2], source: m[3], sourceRecord: 'src/data/diagrams.ts' });
}
for (const release of ['r13', 'r14']) {
  const dir = `public/models/e34-lore/${release}`;
  const manifestFile = (await fs.readdir(dir)).find(p => p.startsWith('manifest.'));
  const manifest = await json(`${dir}/${manifestFile}`);
  for (const asset of manifest.assets) overrides.set(`public${asset.url}`, {
    family: asset.id.includes('body') || asset.id.includes('systems') ? 'model-derivative' : 'generated-geometry',
    sourceRecord: `${dir}/${manifestFile}`, assetId: asset.id,
    attribution: `${manifest.credit.author}; ${manifest.credit.url}; ${manifest.credit.license}; E34 Lore reconstruction/segmentation/optimization changes`,
  });
}
for(const pkg of (await json('data/build-studio/wheel-packages.json')).flatMap(p=>p.lodLow?[p,{...p,...p.lodLow}]:[p]))if(pkg.creator==='E34 Lore')overrides.set('public'+pkg.url,{family:'generated-geometry',creator:'E34 Lore with Codex assistance',source:'scripts/build-studio/build-wheel.mjs',license:'CC0-1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',attribution:'Original unbranded ten-spoke appearance study; E34 Lore with Codex assistance',ownership:'Project-generated study; no claim over manufacturer designs or branding',sourceRecord:'data/build-studio/wheel-packages.json',permittedUses:'CC0 dedication to the extent applicable; no wheel fitment, product authenticity or endorsement claim'});
for(const asset of (await json('public/models/e34-lore/r24/manifest.c26f8aecf883dd9788fa086d78c4850773e233c4c287de457539c1774fa49646.json')).assets.filter(asset=>asset.id.startsWith('authored:'))) {
  overrides.set('public'+asset.url,{family:'generated-geometry',creator:'E34 Lore with Codex assistance',source:'tools/geometry',sourceRecord:'public/models/e34-lore/r24/manifest.c26f8aecf883dd9788fa086d78c4850773e233c4c287de457539c1774fa49646.json',assetId:asset.id});
}
for (const wheel of await json('data/build-studio/factory-wheel-packages.json')) {
  for (const asset of [wheel,wheel.lodLow,wheel.right,wheel.right?.lodLow].filter(Boolean)) {
    overrides.set('public'+asset.url,{family:'generated-geometry',creator:'E34 Lore with Codex assistance',source:wheel.source,sourceRecord:'data/build-studio/factory-wheel-packages.json',attribution:'Original E34 Lore wheel appearance study based on documented factory styling and dimensions.'});
  }
}
function familyFor(p) {
  if (p.startsWith('data/ip/quarantine/')) return 'unresolved-image';
  if (p.startsWith('data/private-source-figures/')) return 'manual-reference';
  if (p.startsWith('public/fonts/')) return 'font';
  if (p === 'public/THIRD-PARTY-NOTICES.txt') return 'runtime-oss';
  if (p.startsWith('public/scanner-runtime/')) return 'runtime-oss';
  if (p.startsWith('public/assets/diagrams/')) return 'oem-artwork';
  if (p === 'public/assets/e34-525i-reference.jpg') return 'model-derivative';
  if (p.startsWith('public/models/e34-525i/')) return 'model-derivative';
  if (p === 'public/models/ATTRIBUTION.json') return 'model-derivative';
  if (p.startsWith('public/models/e34-lore/')) return 'model-derivative';
  if (p.startsWith('public/models/e30-lore/')) return 'generated-geometry';
  if (p.startsWith('public/models/nominal-seals/')) return 'generated-geometry';
  if (/^(public\/(brand|icons)\/|public\/favicon.svg)/.test(p)) return 'brand-art';
  if (p.startsWith('android/') && p.endsWith('.png')) return 'brand-art';
  if (p.startsWith('public/assets/guides/')) return 'generated-art';
  if (p === 'public/assets/e34-lore-install-qr.svg') return 'generated-art';
  if (/^(public\/catalog\/|data\/(catalog|archive-identities)|src\/data\/(catalog|parts|fitment))/.test(p)) return 'catalog-facts';
  if (p.startsWith('data/digital-twin/standards/')) return 'standards-oss';
  if (p.startsWith('vendor/') || p.startsWith('scripts/vite/')) return 'vendor-oss';
  if (p.startsWith('data/scanner/licenses/')) return 'runtime-oss';
  if (/\.(png|jpg|jpeg|glb|woff2|wasm)$/i.test(p)) return 'unclassified';
  if (p.startsWith('public/scanner/')) return 'scanner-index';
  if (/^(src\/data\/|data\/)/.test(p)) return 'source-informed-reference';
  if (p.startsWith('public/')) return 'first-party-code';
  return 'first-party-code';
}
const publicFiles = await assetFiles('public');
for (const p of publicFiles) {
  const reason = privateAssetReason(p);
  if (reason) throw new Error(`Refusing to register private asset ${p}: ${reason}`);
}
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
const files = [...new Set([...tracked, ...publicFiles.map(p => `public/${p}`)])]
  .filter(p => !p.startsWith('docs/ip/') && !p.startsWith('data/ip/') || p.startsWith('data/ip/quarantine/'))
  .filter(p => !p.startsWith('.openai/') && !p.startsWith('.agents/') && !/(^|\/)\.env/.test(p)).sort();
const records = [];
for (const filename of files) {
  let stat; try {stat = await fs.lstat(filename);} catch (e) {if (e.code === 'ENOENT') continue; throw e;}
  if (stat.isSymbolicLink()) throw new Error(`Inventory refuses symlink: ${filename}`);
  if (!stat.isFile()) continue;
  const extra = overrides.get(filename) ?? {};
  const family = extra.family ?? familyFor(filename);
  if (family === 'unclassified' && filename.startsWith('public/')) throw new Error(`Public asset needs a specific provenance record: ${filename}`);
  const inherited = registry.families[family];
  if (!inherited) throw new Error(`Unknown rights family: ${family}`);
  const bytes = await fs.readFile(filename);
  const payload = reviewedAssetPayload(filename.replace(/^public\//, ''), bytes);
  records.push({ path: filename, bytes: stat.size, sha256: sha(payload), exposure: filename.startsWith('public/') ? 'public-viewer-file' : 'private-repository-source', family, ...inherited, ...extra });
}
const lock = await json('package-lock.json');
const dependencies = Object.entries(lock.packages).filter(([p]) => p).map(([p,d]) => ({path:p,version:d.version ?? null,license:d.license ?? 'MISSING—review upstream',integrity:d.integrity ?? null,dev:!!d.dev,optional:!!d.optional,source:d.resolved ?? null}));
const inventory = { schema: 1, generatedAt: new Date().toISOString(), repository: 'RRG314/e34lore', sourceCommit: execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), workingTreeIncluded: true,
  warning: 'Provenance inventory, not a legal ownership or clearance certification. AI assistance, hashes, Git identity and public availability do not establish copyright eligibility or a redistribution license. Existing review-pending assets are not newly cleared by this inventory.',
  scope: 'Tracked website files and actual public tree, excluding audit outputs themselves, connector configuration and credentials. Live member content is not exported. Companion records are separately inventoried.', records, dependencies };
await fs.mkdir('private/ip-audit', {recursive:true});
await fs.writeFile('private/ip-audit/inventory.json', JSON.stringify(inventory,null,2)+'\n');
await fs.writeFile('data/ip/public-assets.json', JSON.stringify({schema:1,notice:'Existing release boundary only; registration here does not establish copyright clearance. Review rights before intentionally refreshing.',files:Object.fromEntries(records.filter(r => r.exposure === 'public-viewer-file').map(r => [r.path.slice(7),r.sha256]))},null,2)+'\n');
// Put the digest before source filenames: a path ending in "api-key" followed
// immediately by an unrelated file digest resembles a credential assignment.
// Keep normal secret scanning enabled; do not allowlist the inventory.
const columns = ['sha256','path','bytes','family','exposure','creator','source','license','attribution','permittedUses','ownership','aiStatus','review','sourceRecord'];
const cell = v => '"'+String(v ?? '').replaceAll('"','""')+'"';
await fs.writeFile('private/ip-audit/inventory.csv',[columns,...records.map(r => columns.map(c => r[c]))].map(r=>r.map(cell).join(',')).join('\n')+'\n');
console.log(JSON.stringify({files:records.length,publicFiles:publicFiles.length,dependencies:dependencies.length,families:records.reduce((s,r)=>(s[r.family]=(s[r.family]??0)+1,s),{})},null,2));
