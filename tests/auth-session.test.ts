import { describe, expect, it, vi } from "vitest";
import type { AuthChangeEvent, User } from "@supabase/supabase-js";
import {
  observeAccountSession,
  type AccountSnapshot,
} from "../src/lib/auth-session";

const user: User = {
  id: "owner-fixture",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-11-07T00:00:00Z",
};
const aal1 = { user, access_token: "fixture-first-factor" };
const aal2 = { user, access_token: "fixture-mfa-verified" };
type Session = typeof aal1 | null;

function fixture() {
  let callback: (event: AuthChangeEvent, session: Session) => void = () => {};
  let resolve!: (value: { data: { session: Session }; error: null }) => void;
  let reject!: (error: Error) => void;
  const pending = new Promise<{ data: { session: Session }; error: null }>(
    (yes, no) => {
      resolve = yes;
      reject = no;
    },
  );
  const unsubscribe = vi.fn();
  const snapshots: AccountSnapshot[] = [];
  const stop = observeAccountSession(
    {
      getSession: () => pending,
      onAuthStateChange: (handler) => {
        callback = handler;
        return { data: { subscription: { unsubscribe } } };
      },
    },
    (snapshot) => snapshots.push(snapshot),
  );
  return {
    snapshots,
    stop,
    unsubscribe,
    resolve,
    reject,
    event: (event: AuthChangeEvent, session: Session) =>
      callback(event, session),
  };
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("account authorization lifecycle", () => {
  it("revalidates the same account on MFA and token renewal, without resetting forms on focus", () => {
    const f = fixture();
    f.event("SIGNED_IN", aal1);
    const first = f.snapshots.at(-1)!;
    f.event("SIGNED_IN", aal1);
    expect(f.snapshots.at(-1)!.authRevision).toBe(first.authRevision);
    f.event("MFA_CHALLENGE_VERIFIED", aal2);
    expect(f.snapshots.at(-1)!.user?.id).toBe(first.user?.id);
    expect(f.snapshots.at(-1)!.authRevision).toBeGreaterThan(
      first.authRevision,
    );
    const second = f.snapshots.at(-1)!.authRevision;
    f.event("TOKEN_REFRESHED", { ...aal2, access_token: "fixture-renewed" });
    expect(f.snapshots.at(-1)!.authRevision).toBeGreaterThan(second);
    expect(f.snapshots.at(-1)).not.toHaveProperty("access_token");
    f.stop();
  });
  it("does not let a late initial session read undo completed MFA or sign-out", async () => {
    for (const [event, session] of [
      ["MFA_CHALLENGE_VERIFIED", aal2],
      ["SIGNED_OUT", null],
    ] as const) {
      const f = fixture();
      f.event(event, session);
      f.resolve({ data: { session: aal1 }, error: null });
      await flush();
      expect(f.snapshots).toHaveLength(1);
      expect(f.snapshots[0].user).toBe(session?.user ?? null);
      f.stop();
    }
  });
  it("reports failed initial reads and recovers on a later valid auth event", async () => {
    const f = fixture();
    f.reject(new Error("network unavailable"));
    await flush();
    expect(f.snapshots.at(-1)).toMatchObject({ authReady: true, user: null });
    expect(f.snapshots.at(-1)!.authError).toBeTruthy();
    f.event("SIGNED_IN", aal1);
    expect(f.snapshots.at(-1)).toMatchObject({
      authReady: true,
      user,
      authError: "",
    });
    f.stop();
  });
  it("bounds an initial session stall and recovers through a real later auth event",async()=>{
    vi.useFakeTimers();
    try {const f=fixture();await vi.advanceTimersByTimeAsync(10000);expect(f.snapshots.at(-1)).toMatchObject({authReady:true,user:null});expect(f.snapshots.at(-1)!.authError).toBeTruthy();f.resolve({data:{session:aal1},error:null});await flush();expect(f.snapshots).toHaveLength(1);f.event("SIGNED_IN",aal2);expect(f.snapshots.at(-1)).toMatchObject({user,authError:""});f.stop();expect(vi.getTimerCount()).toBe(0);}finally{vi.useRealTimers();}
  });
  it("ignores session results and callbacks after unmount", async () => {
    const f = fixture();
    f.stop();
    f.resolve({ data: { session: aal1 }, error: null });
    f.event("SIGNED_IN", aal2);
    await flush();
    expect(f.snapshots).toEqual([]);
    expect(f.unsubscribe).toHaveBeenCalledOnce();
  });
});
