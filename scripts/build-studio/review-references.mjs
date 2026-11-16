// Only the disposable review transport calls this. Never a hosted migration.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,basename} from 'node:path';

export async function registerReviewReferences(sql, candidateRoot='work/525i-service-candidate') {
  const root=resolve(candidateRoot);
  if(!root.startsWith(resolve('work')+'/'))throw Error('Review references must stay in the local work directory');
  let archives;
  try { archives=JSON.parse(await readFile(root+'/releases.json','utf8')); }
  catch(error) { if(error.code==='ENOENT')return 0;throw error; }
  if(!Array.isArray(archives)||archives.length>100)throw Error('Invalid review reference archive');
  for(const entry of archives){
    const r=entry.release;
    if(r?.id!=='e34-525i-sedan-automatic'||!Number.isSafeInteger(r.revision)||r.revision<1000||!/^[a-f0-9]{64}$/.test(r.sha256)||!Array.isArray(entry.files))throw Error('Invalid review reference pin');
    const manifest=entry.files.find(f=>f.url===r.manifestUrl&&f.sha256===r.sha256&&f.type==='application/json');
    if(!manifest)throw Error('Missing archived review manifest');
    for(const file of entry.files){
      if(!/^[a-f0-9]{64}$/.test(file.sha256)||basename(file.file)!==file.file||!new RegExp('^(?:manifest\\.)?'+file.sha256+'\\.(?:json|glb)$').test(file.file))throw Error('Invalid review asset path');
      const bytes=await readFile(root+'/'+file.file);
      if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Review asset hash mismatch');
      if(file===manifest){const model=JSON.parse(bytes);if(model.id!==r.id||model.revision!==r.revision)throw Error('Review manifest identity differs');}
    }
  }
  return pinReferences(sql, archives.map(entry => entry.release));
}

function pinReferences(sql, releases) {
  // Existing pins are never updated.
  sql('begin;'+releases.map(r=>`insert into e34_private.build_references(id,revision,sha256) values('${r.id}',${r.revision},'${r.sha256}') on conflict(id,revision) do nothing;`).join('')+'commit;');
  for(const r of releases)if(sql(`select sha256 from e34_private.build_references where id='${r.id}' and revision=${r.revision}`)!==r.sha256)throw Error('An existing review reference pin differs');
  return releases.length;
}

export async function registerE30ReviewReferences(sql) {
  const root=resolve('work/e30/assets');
  let archives;
  try { archives=JSON.parse(await readFile(resolve('work/e30/releases.json'),'utf8')); }
  catch(error) { if(error.code==='ENOENT')return 0;throw error; }
  if(!Array.isArray(archives)||archives.length>100)throw Error('Invalid E30 review reference archive');
  const exterior=JSON.parse(await readFile('data/digital-twin/e30-exterior-reference.json','utf8'));
  const releases=[exterior,...archives];
  for(const release of releases){
    if(!['e30-325i-sedan-manual','e30-325i-coupe-manual','e30-1985-artist-exterior'].includes(release.id)||
      !Number.isSafeInteger(release.revision)||!/^[a-f0-9]{64}$/.test(release.sha256)||
      !new RegExp('^/models/e30-lore/(?:exterior-r1|r[1-9]\\d{3})/manifest\\.'+release.sha256+'\\.json$').test(release.manifestUrl))
      throw Error('Invalid E30 review reference pin');
    const bytes=await readFile(root+release.manifestUrl);
    if(createHash('sha256').update(bytes).digest('hex')!==release.sha256)throw Error('E30 review manifest hash mismatch');
    const model=JSON.parse(bytes);
    if(model.id!==release.id||model.revision!==release.revision)throw Error('E30 review manifest identity differs');
  }
  return pinReferences(sql,releases);
}
