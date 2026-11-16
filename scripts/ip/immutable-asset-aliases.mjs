import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Only content-addressed public model and catalog files can share storage.
const roots = ['models/e34-lore', 'models/e30-lore', 'catalog/workshop'];
const immutable = /^[a-f0-9]{64}\.(?:glb|json|png)$/;

export function immutableAssetAliases(publicDir) {
  const aliases = {};
  for (const root of roots) {
    if (!existsSync(path.join(publicDir,root))) continue;
    const files = readdirSync(path.join(publicDir,root), {recursive:true, withFileTypes:true})
      .filter(entry=>entry.isFile()&&immutable.test(entry.name))
      .map(entry=>path.relative(publicDir,path.join(entry.parentPath,entry.name)).split(path.sep).join('/'))
      .sort();
    const canonical = new Map();
    for (const file of files) {
      const name=path.posix.basename(file);
      const existing=canonical.get(name);
      if (!existing) {
        canonical.set(name,file);
        continue;
      }
      for (const candidate of [existing,file]) {
        const sha=createHash('sha256').update(readFileSync(path.join(publicDir,candidate))).digest('hex');
        if(sha!==name.slice(0,64))throw Error('Immutable asset does not match its name: '+candidate);
      }
      aliases['/'+file]='/'+existing;
    }
  }
  return aliases;
}
