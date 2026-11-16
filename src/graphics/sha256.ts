/** Preserve pinned model/catalog integrity on the private LAN preview, where
 * WebCrypto SubtleCrypto is unavailable. Never skip a digest comparison. */
export async function sha256Hex(bytes:ArrayBuffer):Promise<string>{
 const digest=globalThis.crypto?.subtle
  ?new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))
  :(await import('@noble/hashes/sha2.js')).sha256(new Uint8Array(bytes));
 return Array.from(digest,n=>n.toString(16).padStart(2,'0')).join('');
}
