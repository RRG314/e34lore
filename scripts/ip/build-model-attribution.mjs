import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const credit={creator:'Uralvagonzavod / UVZZZ (current display Silbergrau)',source:'https://sketchfab.com/3d-models/bmw-525i-e34-project-zomboid-c65aa3b7687d4f5dbbabdfad0b7816bb',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'};
const files=[];
async function append(file,metadata){const bytes=await fs.readFile('public'+file);files.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),...metadata});}
for(const n of ['e34-body.glb','e34-wheel.glb'])await append('/models/e34-525i/'+n,{...credit,notice:'/models/e34-525i/LICENSE.md',changes:'Single vehicle/wheel selected, transformed, segmented and optimized; see complete adaptation notes.'});
const registry=JSON.parse(await fs.readFile('data/digital-twin/vehicle-references.json','utf8'));
const readPin = async name => JSON.parse(await fs.readFile('data/digital-twin/'+name+'.json','utf8'));
const archives = Object.values(await readPin('reference-archives'));
const panelArchives = await readPin('workshop-panel-archives');
const active = await Promise.all([
 'public-reference', '525i-service-release', '525i-automatic-reference',
 'e30-candidate', 'e30-vehicle-references',
].map(readPin));
const releases = [...new Set([...archives, ...panelArchives, ...registry, ...active.flat()].map(pin => pin.manifestUrl))];
for (const manifest of releases) {
 const model = JSON.parse(await fs.readFile('public' + manifest, 'utf8'));
 for (const asset of model.assets) {
  await append(asset.url, {
   id: asset.id,
   revision: model.revision,
   sourceCredit: model.credits ?? [model.credit],
   manifest,
   ...(manifest.startsWith('/models/e34-lore/') ? { notice: '/models/e34-525i/LICENSE.md' } : {}),
   changes: 'See the versioned manifest for creators and adaptation notes. This index does not grant a new license.',
  });
 }
}
for(const n of (await fs.readdir('public/models/nominal-seals')).filter(n=>n.endsWith('.glb')).sort())await append('/models/nominal-seals/'+n,{notice:'/models/nominal-seals/LICENSE.md',source:'Nominal catalog dimensions; source context in existing model notice',license:null,changes:'Procedural nominal reference mesh; no new copyright ownership or redistribution license is assigned by this index.'});
const unique=new Map();for(const file of files){const existing=unique.get(file.file);if(existing){existing.referenceRevisions=[...new Set([...(existing.referenceRevisions||[existing.revision]),file.revision].filter(Boolean))];if(file.sourceCredit)existing.sourceCredit=[...new Map([...(Array.isArray(existing.sourceCredit)?existing.sourceCredit:[existing.sourceCredit]),...file.sourceCredit].filter(Boolean).map(c=>[c.url||c.source,c])).values()];}else unique.set(file.file,file);}
await fs.writeFile('public/models/ATTRIBUTION.json',JSON.stringify({schema:1,purpose:'Version and source notices accompanying the existing viewer model files. Does not change asset licenses, establish engineering accuracy or transfer third-party rights. Preserve applicable notices with any licensed redistribution.',files:[...unique.values()]},null,2)+'\n');
console.log(`Prepared existing-source attribution metadata for ${unique.size} viewer GLBs across the active reference releases.`);
