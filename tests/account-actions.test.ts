import { describe, it, expect, vi, afterEach } from 'vitest';
import { withTimeout, signOutBrowser, clearAccountStorage, accountActionError } from '../src/lib/account-actions';
afterEach(() => vi.useRealTimers());
describe('account actions when the network is unreliable', () => {
    it('always clears only the current browser session after a stalled SDK call', async () => { vi.useFakeTimers(); const clear = vi.fn(), auth = { signOut: vi.fn(() => new Promise<{
            error: null;
        }>(() => { })) }; const action = signOutBrowser(auth, clear, 5000); await vi.advanceTimersByTimeAsync(5000); expect(await action).toEqual({ remoteConfirmed: false }); expect(clear).toHaveBeenCalledOnce(); expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' }); });
    it('does not keep a user signed in after a rejected logout request', async () => { const clear = vi.fn(); expect(await signOutBrowser({ signOut: async () => { throw Error('offline'); } }, clear)).toEqual({ remoteConfirmed: false }); expect(clear).toHaveBeenCalledOnce(); });
    it('does not clear unrelated accounts or private garage records from storage', () => { const storage = { removeItem: vi.fn() }; clearAccountStorage(storage, 'sb-e34-auth-token'); expect(storage.removeItem.mock.calls.flat()).toEqual(['sb-e34-auth-token', 'sb-e34-auth-token-user', 'sb-e34-auth-token-code-verifier']); });
    it('bounds a hung initial/session read without changing a later operation', async () => { vi.useFakeTimers(); let done!: (v: string) => void; const work = new Promise<string>(resolve => { done = resolve; }); const result = withTimeout(work, 500, 'Timed out').catch(e => e.message); await vi.advanceTimersByTimeAsync(500); expect(await result).toBe('Timed out'); done('late'); await Promise.resolve(); });
    it('presents the server’s account-deletion failure rather than an opaque SDK error', async () => { expect(await accountActionError({ context: new Response(JSON.stringify({ error: 'Source upload cleanup could not be checked. Sign in again and retry.' }), { status: 503 }) }, 'Failed')).toContain('Sign in again'); expect(await accountActionError({ context: new Response('<h1>Gateway failure</h1>', { status: 500 }) }, 'Try again')).toBe('Try again'); });
});
