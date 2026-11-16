// Only public, frozen comparison images; private work directory, never app assets.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('docs/scanner/bearing-test/evaluation-sources.json','utf8'));
const root=resolve(process.argv[2]||'work/bearing-test');await mkdir(root,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const r of manifest.records){
 if(!/^[a-zA-Z0-9_.-]+$/.test(r.file))throw Error('Invalid local file');
 const file=resolve(root,r.file);
 try{if(hash(await readFile(file))===r.sha256){console.log('Cached',r.id);continue}}catch{}
 const url=new URL(r.imageUrl);
 if(url.protocol!=='https:'||!['www.fcpeuro.com','thumb.wikimedia.org','upload.wikimedia.org'].includes(url.hostname))throw Error('Unapproved image origin');
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Image download failed: '+r.id+' '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length>8*1024*1024||hash(bytes)!==r.sha256)throw Error('Frozen image changed: '+r.id);
 await writeFile(file,bytes);console.log('Downloaded',r.id);
}
