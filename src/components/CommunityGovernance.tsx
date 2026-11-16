"use client";
import {DocumentLink} from "./DocumentLink";
import { useEffect, useState } from "react";
import { db, useApp } from "./context";
import { Modal, Notice, Empty, PageIntro, Tag } from "./common";
import {
  communityModerationSchema,
  type CommunityModerationData,
} from "../domain/owner-dashboard";

export const communityPolicies = [
  {id:'conduct',title:'Make the community useful',paragraphs:[
    'Welcome beginners and discuss methods and evidence respectfully. Explain terminology, ask for missing vehicle details and return with the outcome of your repair. Do not harass, threaten, discriminate, expose private information, spam or disguise advertising.',
    'Separate observations, tests, hypotheses and conclusions. Include the vehicle, installed configuration and source conditions. Do not publish vehicle-security details or encourage bypassing protective systems.'
  ]},
  {id:'feedback',title:'Helpful, Bad advice and reports',paragraphs:[
    'Helpful marks a contribution you found useful. Bad advice requires an explanatory reply identifying the claim and a correction, test or source. Votes and an owner-accepted answer are not independent technical certification.',
    'Use Report for abuse, spam, private information or a rights concern that needs staff attention. Do not coordinate votes, retaliate through reports or create accounts to evade restrictions.'
  ]},
  {id:'recommendations',title:'Recommending a business',paragraphs:[
    'Describe your first-hand experience, the car, work and approximate date. Give the official business website and location. Disclose employment, ownership, discounts or other incentives. Keep criticism factual and avoid sharing private invoices, addresses or contact details.',
    'Directory listings identify businesses to investigate; they do not certify workmanship. New suggestions and listing corrections are community discussions. Staff review evidence before changing a sourced listing.'
  ]},
  {id:'content',title:'Share work you have the right to share',paragraphs:[
    'Post your own text and photographs or material you have permission to use. Link to external forum discussions and manuals instead of copying them. Credit sources, distinguish owner observations from source instructions and disclose commercial interests.',
    'You retain ownership of eligible original contributions. New submissions permit the hosting and display needed for your selected visibility, as explained in the contribution terms. Private records do not become public simply because you saved them.'
  ]},
  {id:'moderation',title:'Moderation and appeals',paragraphs:[
    'Authorized staff can hide or restore content, lock discussions, issue warnings and apply timeouts, suspensions or bans. Protected actions require an authenticated staff role and an authenticator. Staff record a reason in a restricted audit trail.',
    'A posting restriction does not prevent you from reading its stated reason or submitting a private appeal in Community settings. Reports and staff notes stay private. Repeated abuse or rights violations can lead to account removal. No fixed response time is promised.'
  ]},
];

export function CommunityPolicies() {
  return <div className="page policies-page"><PageIntro eyebrow="E34 LORE / COMMUNITY" title="Community guidelines." description="Respect the people. Explain the evidence. Share what helps the next owner."/>
    <nav className="policy-index" aria-label="Guideline sections">{communityPolicies.map(p=><DocumentLink href={'#'+p.id} key={p.id}>{p.title}</DocumentLink>)}</nav>
    {communityPolicies.map(p=><section id={p.id} key={p.id} className="policy-section"><h2>{p.title}</h2>{p.paragraphs.map(x=><p key={x}>{x}</p>)}</section>)}
    <section id="terms" className="policy-section"><h2>Site terms</h2><p><DocumentLink href="/terms">Read the Terms of use</DocumentLink>, including reference limitations and contribution permissions.</p></section>
    <section id="privacy" className="policy-section"><h2>Your information</h2><p><DocumentLink href="/privacy">Privacy policy and choices</DocumentLink> explain account data, publication, measurement, export and deletion.</p></section>
    <section id="copyright" className="policy-section"><h2>Copyright concerns</h2><p><DocumentLink href="/copyright#requests">Copyright and permission requests</DocumentLink> include the public contact and information needed to investigate a concern.</p></section>
  </div>;
}

export function useCommunityPreferences() {
  const { user } = useApp();
  const [preferences, setPreferences] = useState<
      { target_user_id: string; mode: string }[]
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () => {
      if (!user) {
        setPreferences([]);
        return;
      }
      db.from("community_preferences")
        .select("target_user_id,mode")
        .then(({ data, error }) => {
          if (active) {
            setPreferences(data || []);
            setError(error?.message || "");
          }
        });
    };
    load();
    window.addEventListener("e34-community-preferences", load);
    return () => {
      active = false;
      window.removeEventListener("e34-community-preferences", load);
    };
  }, [user]);
  return { preferences, error };
}
export function MemberControls({ id, name }: { id: string; name: string }) {
  const { user, requireAuth, toast } = useApp();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  if (id === user?.id) return null;
  return (
    <>
      <button
        className="text-link muted"
        onClick={() => {
          if (requireAuth()) setOpen(true);
        }}
      >
        Member controls
      </button>
      {open && (
        <Modal
          title={"Member controls · " + name}
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p>
            Mute hides this member’s discussions and replies from your lists.
            Block also prevents replies to either member’s discussions and
            direct feedback between the two accounts. Public content remains
            accessible through public links.
          </p>
          <div className="form-actions">
            {["mute", "block"].map((mode) => (
              <button
                key={mode}
                disabled={busy}
                className="button outline"
                onClick={async () => {
                  setBusy(true);
                  const { error } = await db
                    .from("community_preferences")
                    .upsert({ user_id: user!.id, target_user_id: id, mode });
                  setBusy(false);
                  if (error) toast(error.message);
                  else {
                    window.dispatchEvent(
                      new Event("e34-community-preferences"),
                    );
                    setOpen(false);
                    toast(
                      mode === "mute" ? "Member muted." : "Member blocked.",
                    );
                  }
                }}
              >
                {mode === "mute" ? "Mute member" : "Block member"}
              </button>
            ))}
          </div>
          <DocumentLink href="/community/settings">Manage muted and blocked members</DocumentLink>
        </Modal>
      )}
    </>
  );
}

export function CommunitySettings() {
  const { user, authReady, requireAuth, toast } = useApp();
  const { preferences, error } = useCommunityPreferences();
  const [names, setNames] = useState<Record<string, string>>({}),
    [restrictions, setRestrictions] = useState<{id:string;kind:string;reason:string;expires_at:string|null;revoked_at:string|null;created_at:string}[]>([]),
    [appeals, setAppeals] = useState<{id:string;status:string;body:string;response:string}[]>([]),
    [loadError, setLoadError] = useState(""),
    [appeal, setAppeal] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (!user) return;
    Promise.all([
      db.rpc("my_community_restrictions"),
      db
        .from("community_appeals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]).then(([r, a]) => {
      if (active) {
        setRestrictions(r.data || []);
        setAppeals(a.data || []);
        setLoadError(r.error?.message || a.error?.message || "");
      }
    });
    return () => {
      active = false;
    };
  }, [user, appeal]);
  useEffect(() => {
    let active = true;
    if (!preferences.length) return;
    db.from("profiles")
      .select("id,display_name")
      .in(
        "id",
        preferences.map((p) => p.target_user_id),
      )
      .then(({ data }) => {
        if (active)
          setNames(
            Object.fromEntries((data || []).map((p) => [p.id, p.display_name])),
          );
      });
    return () => {
      active = false;
    };
  }, [preferences]);
  return (
    <div className="page community-settings">
      <DocumentLink className="back-link" href="/community">
        ← Community
      </DocumentLink>
      <PageIntro
        eyebrow="YOUR COMMUNITY ACCOUNT"
        title="Community settings."
        description="Manage member preferences, view restrictions and submit a private appeal."
      />
      {!authReady ? (
        <p>Checking your session…</p>
      ) : !user ? (
        <Empty title="Sign in to manage preferences">
          <button className="button primary" onClick={() => requireAuth()}>
            Sign in
          </button>
        </Empty>
      ) : (
        <>
          {(error || loadError) && (
            <Notice tone="warning">{error || loadError}</Notice>
          )}
          <section>
            <h2>Muted & blocked members</h2>
            <p>
              These preferences filter your discussion lists. A block also
              prevents targeted replies and feedback. Public content remains
              accessible.
            </p>
            {preferences.length ? (
              preferences.map((p) => (
                <div className="preference-row" key={p.target_user_id}>
                  <strong>{names[p.target_user_id] || "Member"}</strong>
                  <Tag>{p.mode}</Tag>
                  <button
                    className="text-link"
                    onClick={async () => {
                      const { error } = await db
                        .from("community_preferences")
                        .delete()
                        .eq("user_id", user.id)
                        .eq("target_user_id", p.target_user_id);
                      if (error) toast(error.message);
                      else
                        window.dispatchEvent(
                          new Event("e34-community-preferences"),
                        );
                    }}
                  >
                    Remove preference
                  </button>
                </div>
              ))
            ) : (
              <p className="muted">No members muted or blocked.</p>
            )}
          </section>
          <section>
            <h2>Warnings & restrictions</h2>
            {restrictions.length ? (
              restrictions.map((r) => (
                <div className="restriction-row" key={r.id}>
                  <Tag>{r.kind}</Tag>
                  <p>{r.reason}</p>
                  <small>
                    {r.revoked_at
                      ? "Revoked"
                      : r.expires_at
                        ? "Expires " + new Date(r.expires_at).toLocaleString()
                        : "No expiry"}
                  </small>
                  <button className="text-link" onClick={() => setAppeal(r.id)}>
                    Appeal this action
                  </button>
                </div>
              ))
            ) : (
              <p className="muted">
                No warnings or restrictions on your account.
              </p>
            )}
          </section>
          <section>
            <h2>Your appeals</h2>
            {appeals.length ? (
              appeals.map((a) => (
                <div key={a.id} className="restriction-row">
                  <Tag>{a.status}</Tag>
                  <p>{a.body}</p>
                  {a.response && (
                    <p>
                      <strong>Staff response:</strong> {a.response}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="muted">No appeals submitted.</p>
            )}
          </section>
          <DocumentLink href="/account" className="button outline">
            Account security & deletion
          </DocumentLink>
        </>
      )}
      {appeal && (
        <Modal
          title="Appeal a moderation action"
          onClose={() => {
            if (!busy) setAppeal(null);
          }}
        >
          <p>
            Explain the action you are appealing, the relevant context and the
            resolution you are requesting. Your appeal is private to you and
            authorized moderators.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const { error } = await db.rpc("appeal_community_restriction", {
                restriction: appeal,
                explanation: String(new FormData(e.currentTarget).get("body")),
              });
              setBusy(false);
              if (error) toast(error.message);
              else {
                setAppeal(null);
                toast("Appeal submitted.");
              }
            }}
          >
            <label>
              Appeal
              <textarea
                name="body"
                minLength={40}
                maxLength={4000}
                required
                rows={6}
              />
            </label>
            <button className="button primary" disabled={busy}>
              Submit appeal
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function CommunityAdministration() {
  const { user, authReady, toast } = useApp();
  const [response, setResponse] = useState<{
      key: string;
      data: CommunityModerationData | null;
      error: string;
    } | null>(null),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false);
  const userId = user?.id;
  const requestKey = JSON.stringify([userId, revision]);
  const current = response?.key === requestKey ? response : null;
  const state = current?.data;
  const error = current?.error;
  useEffect(() => {
    let active = true;
    if (!userId) return;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 15_000);
    Promise.resolve(
      db.rpc("community_moderation_state").abortSignal(controller.signal),
    )
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        const parsed = communityModerationSchema.safeParse(data);
        if (!parsed.success)
          throw new Error(
            "The moderation page returned incomplete data. Please try again later.",
          );
        if (active)
          setResponse({ key: requestKey, data: parsed.data, error: "" });
      })
      .catch((failure: unknown) => {
        if (active)
          setResponse({
            key: requestKey,
            data: null,
            error: controller.signal.aborted
              ? "Moderation records took too long to respond. Please try again."
              : failure instanceof Error
                ? failure.message
                : "Moderation records could not be loaded. Please try again.",
          });
      })
      .finally(() => clearTimeout(deadline));
    return () => {
      active = false;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [userId, requestKey]);
  async function act(
    action: string,
    target: string,
    reason: string,
    kind?: string,
    until?: string,
    note?: string,
  ) {
    setBusy(true);
    try {
      const { error } =
        action === "hide-journal" || action === "restore-journal"
          ? await db.rpc("moderate_journal_entry", {
              entry: target,
              hide: action === "hide-journal",
              reason,
            })
          : await db.rpc("moderate_community", {
              action,
              target_id: target,
              reason,
              restriction_kind: kind || null,
              until_time: until || null,
              internal_note: note || "",
            });
      if (error) toast(error.message);
      else {
        toast("Moderation action recorded.");
        setRevision((r) => r + 1);
      }
    } catch (failure) {
      toast(
        failure instanceof Error
          ? failure.message
          : "The moderation action could not be saved. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <PageIntro
        eyebrow="COMMUNITY OPERATIONS"
        title="Community moderation."
        description="Staff actions require the moderator role and an MFA-verified session. Every action requires a recorded reason."
      >
        <button
          className="button outline"
          disabled={busy}
          onClick={() => setRevision((r) => r + 1)}
        >
          Refresh moderation records
        </button>
      </PageIntro>
      {!authReady ? (
        <p>Checking session…</p>
      ) : !user ? (
        <Notice>Sign in with a staff account.</Notice>
      ) : error ? (
        <Notice tone="warning">
          <p role="alert">{error}</p>{" "}
          <DocumentLink href="/account?next=/community/admin#account-security">
            Account security
          </DocumentLink>
        </Notice>
      ) : state ? (
        <>
          <div className="community-metrics">
            {Object.entries(state.counts || {}).map(([key, value]) => (
              <div key={key}>
                <strong>{String(value)}</strong>
                <span>{key.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
          <p>
            <DocumentLink href="/admin">Reports & technical-review queue ↗</DocumentLink> ·{" "}
            <DocumentLink href="/community/policies#moderation">Moderation policy</DocumentLink>
          </p>
          <section className="community-admin-action">
            <h2>Record a moderation action</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const until = String(f.get("until") || "");
                act(
                  String(f.get("action")),
                  String(f.get("target")),
                  String(f.get("reason")),
                  String(f.get("kind")),
                  until ? new Date(until).toISOString() : undefined,
                  String(f.get("note")),
                );
              }}
            >
              <div className="form-grid">
                <label>
                  Action
                  <select name="action">
                    {[
                      "hide-thread",
                      "restore-thread",
                      "lock-thread",
                      "unlock-thread",
                      "hide-post",
                      "hide-garage",
                      "hide-journal",
                      "restore-journal",
                      "restore-garage",
                      "restore-post",
                      "restrict",
                      "revoke-restriction",
                    ].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Target UUID
                  <input
                    name="target"
                    required
                    pattern="[0-9a-fA-F-]{36}"
                    placeholder="Thread, reply, member or restriction ID"
                  />
                </label>
                <label>
                  Restriction type
                  <select name="kind">
                    <option value="warning">Warning</option>
                    <option value="timeout">Timeout</option>
                    <option value="suspension">Suspension</option>
                    <option value="ban">Ban</option>
                  </select>
                </label>
                <label>
                  Expiry (required for timeout / suspension)
                  <input type="datetime-local" name="until" />
                </label>
              </div>
              <label>
                Reason visible to the member / audit trail
                <textarea
                  name="reason"
                  minLength={10}
                  maxLength={2000}
                  required
                  rows={3}
                />
              </label>
              <label>
                Private staff note for a restriction
                <textarea name="note" maxLength={4000} rows={2} />
              </label>
              <button className="button primary" disabled={busy}>
                Record action
              </button>
            </form>
          </section>
          <section>
            <h2>Open appeals</h2>
            {state.appeals.length ? (
              state.appeals.map((a) => (
                <div className="restriction-row" key={a.id}>
                  <code>{a.user_id}</code>
                  <p>{a.body}</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(
                        "resolve-appeal",
                        a.id,
                        String(new FormData(e.currentTarget).get("response")),
                      );
                    }}
                  >
                    <label>
                      Written disposition
                      <textarea
                        name="response"
                        minLength={10}
                        maxLength={2000}
                        required
                      />
                    </label>
                    <button className="button outline" disabled={busy}>
                      Resolve appeal
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p>No open appeals.</p>
            )}
          </section>
          <section>
            <h2>Recent restrictions</h2>
            {!state.restrictions.length && <p>No restrictions recorded.</p>}
            {state.restrictions.map((r) => (
              <div className="restriction-row" key={r.id}>
                <Tag>{r.kind}</Tag>
                <code>{r.user_id}</code>
                <p>{r.reason}</p>
                <p className="small">Staff note: {r.internal_note || "None"}</p>
                <small>
                  Restriction ID: {r.id} ·{" "}
                  {r.revoked_at ? "Revoked" : r.expires_at || "No expiry"}
                </small>
              </div>
            ))}
          </section>
          <section>
            <h2>Moderation audit</h2>
            {!state.audit.length && (
              <p>No community moderation actions recorded.</p>
            )}
            {state.audit.map((a) => (
              <div className="preference-row" key={a.id}>
                <strong>{a.action}</strong>
                <code>{a.record_id}</code>
                <span>{a.metadata?.reason}</span>
                <small>{new Date(a.created_at).toLocaleString()}</small>
              </div>
            ))}
          </section>
        </>
      ) : (
        <p>Loading moderation records…</p>
      )}
    </div>
  );
}
