/** Bounded account operations; a failed network request must not trap the UI. */
export function withTimeout<T>(operation: PromiseLike<T>, ms: number, message: string): Promise<T> { return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(message)), ms); Promise.resolve(operation).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); }); }); }
export async function signOutBrowser(auth: {
    signOut(options: {
        scope: 'local';
    }): Promise<{
        error: unknown;
    }>;
}, clear: () => void, ms = 5000) { let remoteConfirmed = false; try {
    const result = await withTimeout(auth.signOut({ scope: 'local' }), ms, 'Sign-out request timed out.');
    remoteConfirmed = !result.error;
}
catch { /* The SDK may be waiting for a refresh/lock or an unreachable server. */ }
finally {
    clear();
} return { remoteConfirmed }; }
export function clearAccountStorage(storage: Pick<Storage, 'removeItem'>, key: string) { for (const name of [key, key + '-user', key + '-code-verifier']) {
    try {
        storage.removeItem(name);
    }
    catch { /* A reload also clears a non-persistent SDK session. */ }
} }
export async function accountActionError(error: unknown, fallback: string) { const context = (error as {
    context?: unknown;
})?.context; if (context instanceof Response) {
    try {
        const body = await withTimeout(context.clone().json(), 2000, 'Response unavailable') as {
            error?: unknown;
        } | null;
        if (body && typeof body.error === 'string' && body.error.length < 500)
            return body.error;
    }
    catch { }
} return fallback; }
