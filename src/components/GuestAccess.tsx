"use client";
import {useKeyedResource} from "../hooks/use-keyed-resource";
import { DocumentLink } from "./DocumentLink";

import { useEffect, useState } from "react";
import { db, useApp } from "./context";
import { Notice } from "./common";
import { loadAuthProviders } from "../lib/auth-providers";
import { DeleteAccount } from "./DeleteAccount";

type Submission = {
  id: string; status: string; kind: string; title: string; body: string;
  reason: string; created_at: string; discussion_id: string; post_id: string | null;
};

export function GuestAccess() {
  const { user } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    if (user) return;
    loadAuthProviders().then(providers => {
      if (active) setEnabled(Boolean(providers.anonymous_users));
    }).catch(() => {});
    return () => { active = false; };
  }, [user]);
  if (user && !user.is_anonymous) return null;
  if (!user && !enabled) return null;
  return (
    <Notice>
      {user?.is_anonymous ? (
        <p>Posting as a guest. Questions and replies are reviewed before publication. <DocumentLink href="/account?guest=1">Your guest submissions</DocumentLink></p>
      ) : (
        <>
          <p>You can ask a question or reply without an email address. Guest submissions are reviewed before publication.</p>
          <button type="button" className="button outline" disabled={busy} onClick={async () => {
            setBusy(true); setError("");
            try {
              const { error } = await db.auth.signInAnonymously();
              if (error) throw error;
            } catch (e) { setError((e as Error).message); }
            finally { setBusy(false); }
          }}>{busy ? "Starting guest session…" : "Continue as guest"}</button>
        </>
      )}
      <p className="small muted">Guest access stays in this browser. Signing out, clearing browser data or signing into a different account will not transfer your guest submissions.</p>
      {error && <p role="alert">{error}</p>}
    </Notice>
  );
}

export function GuestSubmissions({ review = false }: { review?: boolean }) {
  const { user } = useApp();
  const [localError,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[selected,setSelected]=useState<string|null>(null);
  const resource=useKeyedResource<Submission[]>(JSON.stringify([user,review,revision]),async signal=>{const r=await db.rpc('guest_submission_state',{for_review:review}).abortSignal(signal);if(r.error)throw r.error;return r.data||[];},{enabled:!!user,failureMessage:'Guest submissions could not be loaded. Please try again.'});
  const rows=resource.data||[],loading=resource.loading,error=localError||resource.error;
  if (!user || (!review && !user.is_anonymous)) return null;
  return (
    <section className="guest-submissions">
      <h2>{review ? "Guest submission review" : "Your guest submissions"}</h2>
      <p>{review ? "The oldest 100 pending submissions appear here. Review a submission to publish it or keep it out of the public discussion. Every decision requires a reason and is recorded in the moderation audit." : "Your recent submissions are listed below. Pending and rejected text stays out of the public community."}</p>
      <button type="button" className="button outline" disabled={loading || busy} onClick={() => setRevision(v => v + 1)}>Refresh submissions</button>
      {error && <Notice tone="warning">{error}</Notice>}
      {loading ? <p>Loading guest submissions…</p> : !rows.length ? <p>{review ? "No guest submissions are waiting for review." : "You have no guest submissions yet."}</p> : rows.map(row => (
        <article className="guest-submission" key={row.id}>
          <p className="eyebrow">{row.kind} · {row.status} · {new Date(row.created_at).toLocaleDateString()}</p>
          <h3>{row.title}</h3>
          <p className="post-body">{row.body}</p>
          {row.reason && <p>Moderator response: {row.reason}</p>}
          <a href={"/community/" + row.discussion_id + (row.post_id ? "?reply=" + row.post_id + "#post-" + row.post_id : "")}>Open discussion ↗</a>
          {review && (selected === row.id ? (
            <form className="account-form" onSubmit={async e => {
              e.preventDefault(); const fields = new FormData(e.currentTarget);
              setBusy(true); setError("");
              const { error } = await db.rpc("review_guest_submission", { submission: row.id, approve: fields.get("decision") === "approve", reason: String(fields.get("reason")) });
              setBusy(false);
              if (error) setError(error.message);
              else { setSelected(null); setRevision(v => v + 1); }
            }}>
              <label>Decision<select name="decision" required><option value="approve">Approve and publish</option><option value="reject">Reject and keep private</option></select></label>
              <label>Reason<textarea name="reason" required minLength={10} maxLength={2000} rows={3} /></label>
              <div className="form-actions"><button className="button primary" disabled={busy}>Save decision</button><button type="button" className="button outline" disabled={busy} onClick={() => setSelected(null)}>Cancel</button></div>
            </form>
          ) : <button type="button" className="button outline" onClick={() => setSelected(row.id)}>Review submission</button>)}
        </article>
      ))}
      {!review && user.is_anonymous && <DeleteAccount />}
    </section>
  );
}
