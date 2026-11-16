import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { dirname } from 'node:path';
import { build } from 'esbuild';

export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const readJson = async path => JSON.parse(await fs.readFile(path, 'utf8'));
export const nameOf = url => url.split('/').at(-1);
export async function immutable(path, bytes) {
  await fs.mkdir(dirname(path), { recursive: true });
  try {
    await fs.writeFile(path, bytes, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    assert.equal(sha(await fs.readFile(path)), sha(bytes), `Existing revision differs at ${path}`);
  }
}
export async function replaceJson(path, value) {
  await fs.writeFile(path + '.tmp', JSON.stringify(value, null, 2) + '\n');
  await fs.rename(path + '.tmp', path);
}
export async function localReferenceTools() {
  const bundle = await build({
    stdin: { contents: `export {parseReference,members,visibleNodes,defaultView,resolveInitial} from './src/digital-twin/public/model.ts';
      export {planFor,separationOffset} from './src/digital-twin/public/explosion.ts';`, resolveDir: process.cwd() },
    bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
  });
  return import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
}
