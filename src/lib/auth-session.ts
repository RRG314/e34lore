import type { AuthChangeEvent, User } from "@supabase/supabase-js";

type AccountSession = { user: User; access_token: string } | null;
type AuthSource = {
  getSession(): Promise<{
    data: { session: AccountSession };
    error: { message: string } | null;
  }>;
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: AccountSession) => void,
  ): { data: { subscription: { unsubscribe(): void } } };
};

export type AccountSnapshot = {
  user: User | null;
  authReady: boolean;
  authError: string;
  authRevision: number;
};

export const initialAccountSnapshot: AccountSnapshot = {
  user: null,
  authReady: false,
  authError: "",
  authRevision: 0,
};

const sessionError =
  "Your session could not be checked. Try signing in again in this browser.";

/** Subscribe before reading the initial session, so an older read cannot undo
 * a sign-out, account switch or completed MFA challenge. Never call Auth APIs
 * from the synchronous SDK event callback: it runs under the SDK's lock. */
export function observeAccountSession(
  auth: AuthSource,
  publish: (snapshot: AccountSnapshot) => void,
): () => void {
  let active = true;
  let deadline:ReturnType<typeof setTimeout>|null=null;
  let revision = 0;
  let lastToken: string | null | undefined;
  let lastUserId: string | null | undefined;
  const emit = (session: AccountSession, error = "") => {
    if (!active) return;
    if(deadline)clearTimeout(deadline);
    const token = session?.access_token ?? null;
    const userId = session?.user.id ?? null;
    // Focus can emit SIGNED_IN for an unchanged session. Preserve in-progress
    // staff forms then; a new token (including MFA) must revalidate the pages.
    if (token !== lastToken || userId !== lastUserId) revision++;
    lastToken = token;
    lastUserId = userId;
    publish({
      user: session?.user ?? null,
      authReady: true,
      authError: error,
      authRevision: revision,
    });
  };
  deadline=setTimeout(()=>{if(revision===0)emit(null,sessionError);},10000);
  const {
    data: { subscription },
  } = auth.onAuthStateChange((_event, session) => {
    emit(session);
  });
  auth.getSession()
    .then(({ data, error }) => {
      if (revision === 0) emit(data.session, error ? sessionError : "");
    })
    .catch(() => {
      if (revision === 0) emit(null, sessionError);
    });
  return () => {
    active = false;if(deadline)clearTimeout(deadline);
    subscription.unsubscribe();
  };
}
