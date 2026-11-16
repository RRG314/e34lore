export class RequestBodyError extends Error {
  constructor(status, message) { super(message); this.name = 'RequestBodyError'; this.status = status; }
}
/** Enforce byte and time limits before buffering or parsing an untrusted body. */
export async function boundedBody(request, maxBytes, timeoutMs = 10000) {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    void request.body?.cancel().catch(() => {});
    throw new RequestBodyError(413, 'Request is too large.');
  }
  const signal = request.signal;
  if (signal?.aborted) throw new RequestBodyError(408, 'Request was interrupted.');
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  let timer, interrupt;
  const interrupted = new Promise((_, reject) => {
    interrupt = () => reject(new RequestBodyError(408, 'Request was interrupted.'));
    signal?.addEventListener('abort', interrupt, { once: true });
    timer = setTimeout(() => reject(new RequestBodyError(408, 'Request took too long.')), timeoutMs);
  });
  const chunks = []; let total = 0;
  try {
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), interrupted]);
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new RequestBodyError(413, 'Request is too large.');
      chunks.push(value);
    }
    const bytes = new Uint8Array(total); let at = 0;
    for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
    return bytes;
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', interrupt);
    reader.releaseLock();
  }
}
/** Call only after Auth.getUser has verified the token and supplied the user ID. */
export async function activeVerifiedSession(admin, token, userId) {
  try {
    if (token.length > 8192) return false;
    const pieces = token.split('.'); if (pieces.length !== 3) return false;
    const claims = JSON.parse(atob(pieces[1].replaceAll('-', '+').replaceAll('_', '/')));
    if (claims.sub !== userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.session_id || '')) return false;
    const result = await admin.rpc('security_session_active', { target_user_id: userId, target_session_id: claims.session_id });
    return !result.error && result.data === true;
  } catch { return false; }
}
