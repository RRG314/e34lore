// Generated 525i fit study is served locally; the release reference stays pinned.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export function local525iFit(command) {
  if(command!=='serve'||process.env.E34_BUILD_REVIEW==='1')return null;
  const root=path.resolve('work/525i-service-candidate');
  const filename=path.join(root,'fit-review.json');
  if(!fs.existsSync(filename))return null;
  const receipt=JSON.parse(fs.readFileSync(filename,'utf8'));
  const release=JSON.parse(fs.readFileSync('data/digital-twin/525i-service-release.json','utf8'));
  if(receipt.release.id===release.id&&receipt.release.revision<release.revision)return null;
  const prefix='/models/e34-lore/r'+receipt.release.revision+'/';
  const valid=/^(?:manifest\.)?[a-f0-9]{64}\.(?:json|glb)$/;
  const files=new Map(receipt.files.map(file=>{
    if(!valid.test(file.file)||file.url!==prefix+file.file||!file.file.includes(file.sha256))throw Error('Invalid local 525i asset');
    return [file.url,file];
  }));
  if(!files.has(receipt.release.manifestUrl))throw Error('Missing local 525i manifest');
  const id='\0local-525i-fit-preview';
  return {
    name:'e34-525i-fit-preview',
    enforce:'pre',
    resolveId(source,importer){if(importer&&source.endsWith('/local-reference-candidate'))return id;},
    load(source){if(source===id)return 'export default '+JSON.stringify(receipt.release)+';export const localGeometryChecks=[];export const localReferenceArchives=[];';},
    configureServer(server){
      server.watcher.add(filename);
      server.watcher.on('change',changed=>{if(path.resolve(changed)===filename)void server.restart();});
      server.middlewares.use((req,res,next)=>{
        const file=files.get(new URL(req.url||'/','http://localhost').pathname);
        if(!file)return next();
        if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
        try{
          const bytes=fs.readFileSync(path.join(root,file.file));
          if(createHash('sha256').update(bytes).digest('hex')!==file.sha256){res.writeHead(409).end();return;}
          res.setHeader('Content-Type',file.file.endsWith('.json')?'application/json':'model/gltf-binary');
          res.setHeader('Cache-Control','no-store');
          res.setHeader('X-Content-Type-Options','nosniff');
          res.end(req.method==='HEAD'?undefined:bytes);
        }catch{res.writeHead(404).end();}
      });
    },
  };
}
