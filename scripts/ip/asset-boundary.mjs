import fs from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

export function reviewedAssetPayload(filename, bytes) {
  if (filename === 'scanner-runtime/onnx/ort-wasm-simd-threaded.wasm.bin') {
    // zlib can produce different gzip bytes on different runner platforms.
    return gunzipSync(bytes, { maxOutputLength: 32 * 1024 * 1024 });
  }
  return bytes;
}

// A release boundary, not DRM. Public viewer files and their license notices stay usable.
export function privateAssetReason(filename) {
  const normalized = filename.replaceAll('\\', '/');
  const parts = normalized.split('/');
  // Tesseract's pinned English data is a required runtime asset, not a source archive.
  if (normalized === 'scanner-runtime/ocr/lang/eng.traineddata.gz') return null;
  if (/\.md$/i.test(normalized) && !/^(?:models\/(?:e34-525i|nominal-seals|e34-build-studio)\/LICENSE\.md|scanner\/REFERENCE-CREDITS\.md)$/.test(normalized)) return 'source documentation';
  if (parts.some(p => (p.startsWith('.') && p !== '.well-known') || ['private', 'workspace', 'work', 'outputs', 'node_modules', 'src', 'app', 'worker', 'supabase', 'db', 'docs', 'data'].includes(p.toLowerCase()))) return 'private/source directory';
  if (/\.(?:map|tsx?|jsx|vue|svelte|py|sql|sqlite3?|db|pdf|docx?|xlsx?|pptx?|p8|pem|key|jks|keystore|blend\d*|fcstd\d*|step|stp|iges|igs|fbx|obj|psd|kra|xcf|zip|7z|tar|gz|bak|backup)$/i.test(normalized)) return 'source, master, archive or credential file';
  if (/(?:^|\/)(?:wrangler(?:\.[^/]+)?\.jsonc?|vinext-server\.json|package(?:-lock)?\.json|IMPLEMENTATION_STATUS\.md|qa[^/]*\.html)$/i.test(normalized)) return 'internal configuration or QA document';
  if (/(?:^|[./_-])(?:master|unpublished|private|original-source)(?:[./_-]|$)/i.test(normalized)) return 'unpublished or editable master';
  return null;
}

export async function assetFiles(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed in asset tree: ${path.relative(root, filename)}`);
      if (entry.isDirectory()) await walk(filename);
      else if (entry.isFile()) files.push(path.relative(root, filename).split(path.sep).join('/'));
      else throw new Error('Unsupported asset file type');
    }
  }
  await walk(root);
  return files.sort();
}
