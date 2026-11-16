"use client";
import{BuildReviewPanel}from"../build-studio/BuildReviewPanel";
import { useEffect, useState } from "react";
import {
  Shield,
  BarChart3,
  Camera,
  Car,
  MessageSquare,
  Users,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { db, useApp } from "./context";
import { Empty, Modal, Notice, PageIntro, Tag } from "./common";
import { PhotoImage, PhotoLightbox, type CarPhoto } from "./CarPhotos";
import { GuestSubmissions } from "./GuestAccess";
import {DocumentLink} from "./DocumentLink";
import {
  ownerDashboardSchema,
  type OwnerDashboardData,
} from "../domain/owner-dashboard";
type Action = {
  kind: "photo" | "feature" | "moderate" | "report";
  id: string;
  label: string;
  value: string;
};
export function OwnerDashboard() {
  const { user, authReady, authRevision, toast } = useApp();
  const [response, setResponse] = useState<{
      key: string;
      scope: string;
      data: OwnerDashboardData | null;
      error: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("overview"),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [revision, setRevision] = useState(0),
    [action, setAction] = useState<Action | null>(null),
    [photo, setPhoto] = useState<CarPhoto | null>(null);
  const [analyticsAccess,setAnalyticsAccess]=useState<{scope:string;allowed:boolean}|null>(null);
  const userId = user?.id;
  const scope = JSON.stringify([userId, authRevision]);
  const requestKey = JSON.stringify([scope, search, revision]);
  useEffect(()=>{let active=true;if(!userId)return;db.rpc("analytics_authorized").then(({data,error})=>{if(active)setAnalyticsAccess({scope,allowed:!error&&data===true});});return()=>{active=false;};},[userId,scope]);
  const currentResponse = response?.key === requestKey ? response : null;
  const state = response?.scope === scope ? response.data : null;
  const error = currentResponse?.error;
  const updating = !!state && !currentResponse;
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    let active = true;
    if (!userId) return;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 15_000);
    Promise.resolve(
      db
        .rpc("owner_dashboard", { search_text: search })
        .abortSignal(controller.signal),
    )
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        const parsed = ownerDashboardSchema.safeParse(data);
        if (!parsed.success)
          throw new Error(
            "The dashboard returned incomplete data. Please refresh or try again later.",
          );
        if (active)
          setResponse({ key: requestKey, scope, data: parsed.data, error: "" });
      })
      .catch((failure: unknown) => {
        if (active)
          setResponse({
            key: requestKey,
            scope,
            data: null,
            error: controller.signal.aborted
              ? "The dashboard took too long to respond. Please try again."
              : failure instanceof Error
                ? failure.message
                : "The dashboard could not be loaded. Check your connection and try again.",
          });
      })
      .finally(() => clearTimeout(deadline));
    return () => {
      active = false;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [userId, search, requestKey, scope]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!action || updating) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const reason = String(f.get("reason"));
      let result;
      if (action.kind === "photo")
        result = await db.rpc("review_car_photo", {
          photo: action.id,
          decision: action.value,
          reason,
        });
      else if (action.kind === "feature")
        result = await db.rpc("feature_garage", {
          entry: action.id,
          featured: action.value === "feature",
          reason,
        });
      else if (action.kind === "report")
        result = await db.rpc("resolve_content_report", {
          report: action.id,
          disposition: action.value,
          reason,
        });
      else if (action.value === "hide-build")result=await db.rpc("moderate_build",{build:action.id,hide:true,reason});
      else if (action.value === "hide-journal")
        result = await db.rpc("moderate_journal_entry", {
          entry: action.id,
          hide: true,
          reason,
        });
      else
        result = await db.rpc("moderate_community", {
          action: action.value,
          target_id: action.id,
          reason,
          restriction_kind: f.get("kind") || null,
          until_time: f.get("until")
            ? new Date(String(f.get("until"))).toISOString()
            : null,
          internal_note: String(f.get("note") || ""),
        });
      if (result.error) toast(result.error.message);
      else {
        setAction(null);
        setRevision((v) => v + 1);
        toast("Action saved.");
      }
    } catch (failure) {
      toast(
        failure instanceof Error
          ? failure.message
          : "The action could not be saved. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const act = (
    kind: Action["kind"],
    id: string,
    label: string,
    value: string,
  ) => {
    if (!updating) setAction({ kind, id, label, value });
  };
  const usageTotals: Record<string, number> = (state?.usage || []).reduce(
    (all: Record<string, number>, row) => ({
      ...all,
      [row.area]: (all[row.area] || 0) + Number(row.opens),
    }),
    {},
  );
  const tabs = [
    ["overview", "Overview", BarChart3],
    ["photos", "Photo review", Camera],
    ["builds","Builds",Car],
    ["guests", "Guest review", MessageSquare],
    ["cars", "Cars", Car],
    ["threads", "Discussions", MessageSquare],
    ["reports", "Reports", Shield],
    ["members", "Members", Users],
  ] as const;
  return (
    <div className="page owner-dashboard">
      <PageIntro
        eyebrow="E34 LORE / SITE MANAGEMENT"
        title="Owner dashboard."
        description="Activity, car features and moderation in one place. Staff actions require your assigned permission and a verified authenticator session."
      >
        {state&&<DocumentLink className="button outline" href="/manage/support">Support inbox <ArrowUpRight size={15}/></DocumentLink>}
        {state&&<DocumentLink className="button outline" href="/community?q=BMW%20specialist">Specialist recommendations <ArrowUpRight size={15}/></DocumentLink>}
        {state&&analyticsAccess?.scope===scope&&analyticsAccess.allowed&&<DocumentLink className="button outline" href="/manage/analytics">Website analytics <BarChart3 size={15}/></DocumentLink>}
        <DocumentLink className="button outline" href="/manage/scanner">Scanner corrections</DocumentLink>
        {state&&analyticsAccess?.scope===scope&&analyticsAccess.allowed&&<DocumentLink className="button outline" href="/manage/security">Security status <Shield size={15}/></DocumentLink>}
        <DocumentLink className="button outline" href="/manage/partners">Affiliate & advertising <ArrowUpRight size={15}/></DocumentLink>
        {state&&<DocumentLink className="button outline" href="/manage/models">Model sources <ArrowUpRight size={15}/></DocumentLink>}
        <button
          className="button outline"
          onClick={() => setRevision((v) => v + 1)}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </PageIntro>
      {!authReady ? (
        <p>Checking your account…</p>
      ) : !user ? (
        <Empty title="Sign in with your owner account">
          <DocumentLink
            href="/account?next=/manage#account-security"
            className="button primary"
          >
            Sign in
          </DocumentLink>
        </Empty>
      ) : error ? (
        <Notice tone="warning">
          <p>{error}</p>
          <p>
            In Account settings, verify your authenticator session, then return
            here and refresh. A member account must also have its staff
            permission assigned; enrolling an authenticator alone does not grant
            moderation.
          </p>
          <DocumentLink
            className="button outline"
            href="/account?next=/manage#account-security"
          >
            Account security <ArrowUpRight size={15} />
          </DocumentLink>
          <button
            className="button outline"
            onClick={() => setRevision((v) => v + 1)}
          >
            Check again
          </button>
        </Notice>
      ) : !state ? (
        <p>Loading the dashboard…</p>
      ) : (
        <>
          <nav className="dashboard-tabs" aria-label="Owner dashboard sections">
            {tabs.map(([id, label, Icon]) => (
              <button
                key={id}
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                <Icon size={16} />
                {label}
                {id === "photos" && state.counts.pending_photos > 0 ? (
                  <span>{state.counts.pending_photos}</span>
                ) : null}
              </button>
            ))}
          </nav>
          {tab === "guests" && <GuestSubmissions review />}
          {tab === "overview" ? (
            <>
              <div className="owner-stat-grid">
                {Object.entries(state.counts).map(([name, value]) => (
                  <div key={name}>
                    <strong>{String(value)}</strong>
                    <span>{name.replaceAll("_", " ")}</span>
                  </div>
                ))}
              </div>
              <section>
                <h2>Anonymous page counts</h2>
                <p>
                  Last 30 days. These are optional section opens, not unique
                  visitors. Members must opt in; private routes, search text,
                  account IDs and IP addresses are excluded. Counts can include
                  automated traffic.
                </p>
                <div className="usage-area-bars">
                  {Object.entries(usageTotals).map(([area, total]) => (
                    <div key={area}>
                      <span>{area}</span>
                      <meter
                        min={0}
                        max={Math.max(1, ...Object.values(usageTotals))}
                        value={Number(total)}
                        aria-label={area + " page opens"}
                      />
                      <strong>{String(total)}</strong>
                    </div>
                  ))}
                </div>
                {!state.usage.length && (
                  <p className="muted">
                    No optional page counts have been recorded yet.
                  </p>
                )}
                <details>
                  <summary>Daily section totals</summary>
                  <table>
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Section</th>
                        <th>Opens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.usage.map((r) => (
                        <tr key={r.day + r.area}>
                          <td>{r.day}</td>
                          <td>{r.area}</td>
                          <td>{r.opens}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </section>
              <section className="dashboard-links">
                <DocumentLink href="/community/admin">
                  Restrictions, appeals and audit history <ArrowUpRight />
                </DocumentLink>
                <DocumentLink href="/admin">
                  Technical review desk <ArrowUpRight />
                </DocumentLink>
                <DocumentLink href="/community/cars">
                  Community car showcase <ArrowUpRight />
                </DocumentLink>
              </section>
            </>
          ) : null}
          {["cars", "threads", "members"].includes(tab) && (
            <label className="dashboard-search">
              Find a car, discussion or member
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={120}
                placeholder="Search by title, model or display name"
              />
            </label>
          )}
          <p role="status" className="small muted">
            {updating ? "Updating results…" : ""}
          </p>
          <fieldset
            className="dashboard-results"
            disabled={busy || updating}
            aria-busy={updating}
            aria-label="Dashboard results"
          >
            {tab === "photos" && (
              <section>
                <h2>Photo review queue</h2>
                <p>
                  Inspect the image and caption before approving. Check visible
                  private details, permission concerns and whether it belongs to
                  the car. Server image processing removes metadata but does not
                  blur what the photo shows.
                </p>
                <div className="dashboard-photo-queue">
                  {state.photos.map((p) => (
                    <article key={p.id}>
                      <button
                        className="photo-open"
                        onClick={() => setPhoto(p)}
                      >
                        <PhotoImage path={p.object_path} alt={p.alt_text} />
                      </button>
                      <h3>{p.car_title}</h3>
                      <Tag>{p.state}</Tag>
                      <p>{p.caption || p.alt_text}</p>
                      {p.review_reason && (
                        <p className="small">Prior review: {p.review_reason}</p>
                      )}
                      <a href={"/garages/" + p.car_owner + "/" + p.garage_id}>
                        Open car page ↗
                      </a>
                      <div className="form-actions">
                        <button
                          className="button primary"
                          onClick={() =>
                            act(
                              "photo",
                              p.id,
                              "Approve this car photo",
                              "approved",
                            )
                          }
                        >
                          Approve
                        </button>
                        <button
                          className="button outline"
                          onClick={() =>
                            act(
                              "photo",
                              p.id,
                              "Reject this car photo",
                              "rejected",
                            )
                          }
                        >
                          Reject
                        </button>
                        <button
                          className="text-link"
                          onClick={() =>
                            act("photo", p.id, "Hide this car photo", "hidden")
                          }
                        >
                          Hide
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {!state.photos.length && (
                  <Empty title="No photos waiting for review">
                    New member submissions appear here.
                  </Empty>
                )}
              </section>
            )}
            {tab === "cars" && (
              <section>
                <h2>Shared cars</h2>
                <p>
                  Features require an approved photo and a visible shared story.
                  Hiding a car also removes its photos and journal updates from
                  community views.
                </p>
                {!state.cars.length && (
                  <Empty title="No shared cars found">
                    Published member cars will appear here. Try another search
                    if you entered one.
                  </Empty>
                )}
                {state.cars.map((g) => (
                  <article className="dashboard-record" key={g.id}>
                    <div>
                      <Tag>{g.model_id}</Tag>
                      {g.hidden && <Tag>HIDDEN</Tag>}
                      {!g.published && <Tag>PRIVATE</Tag>}
                      {g.featured_at && <Tag>FEATURED</Tag>}
                      <h3>
                        <a href={"/garages/" + g.user_id + "/" + g.id}>
                          {g.title}
                        </a>
                      </h3>
                      <p>
                        {g.display_name || "Member"} · {g.story.slice(0, 180)}
                      </p>
                    </div>
                    <div className="form-actions">
                      <button
                        className="button outline"
                        onClick={() =>
                          act(
                            "feature",
                            g.id,
                            g.featured_at
                              ? "Remove this feature"
                              : "Feature this E34",
                            g.featured_at ? "unfeature" : "feature",
                          )
                        }
                      >
                        {g.featured_at ? "Remove feature" : "Feature car"}
                      </button>
                      <button
                        className="text-link"
                        onClick={() =>
                          act(
                            "moderate",
                            g.id,
                            g.hidden ? "Restore this car" : "Hide this car",
                            g.hidden ? "restore-garage" : "hide-garage",
                          )
                        }
                      >
                        {g.hidden ? "Restore" : "Hide"}
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            )}
            {tab === "threads" && (
              <section>
                <h2>Discussions</h2>
                {!state.threads.length && (
                  <Empty title="No discussions found">
                    Member questions and stories will appear here. Try another
                    search if you entered one.
                  </Empty>
                )}
                {state.threads.map((t) => (
                  <article className="dashboard-record" key={t.id}>
                    <div>
                      <h3>
                        <a href={"/community/" + t.id}>{t.title}</a>
                      </h3>
                      <p>
                        {t.display_name || "Member"} ·{" "}
                        {t.hidden ? "Hidden" : "Visible"} ·{" "}
                        {t.locked ? "Locked" : "Open"}
                      </p>
                    </div>
                    <div className="form-actions">
                      <button
                        className="button outline"
                        onClick={() =>
                          act(
                            "moderate",
                            t.id,
                            t.hidden ? "Restore discussion" : "Hide discussion",
                            t.hidden ? "restore-thread" : "hide-thread",
                          )
                        }
                      >
                        {t.hidden ? "Restore" : "Hide"}
                      </button>
                      <button
                        className="button outline"
                        onClick={() =>
                          act(
                            "moderate",
                            t.id,
                            t.locked ? "Unlock discussion" : "Lock discussion",
                            t.locked ? "unlock-thread" : "lock-thread",
                          )
                        }
                      >
                        {t.locked ? "Unlock" : "Lock"}
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            )}
            {tab === "builds" && <BuildReviewPanel/>}
            {tab === "reports" && (
              <section>
                <h2>Content reports</h2>
                {state.reports.map((r) => (
                  <article className="dashboard-record" key={r.id}>
                    <div>
                      <Tag>{r.target_type}</Tag>
                      <Tag>{r.status}</Tag>
                      <p>{r.reason}</p>
                      <code>{r.target_id}</code>
                    </div>
                    <div className="form-actions">
                      {[
                        "thread",
                        "post",
                        "garage",
                        "journal",
                        "photo",
                      ].includes(r.target_type) && (
                        <button
                          className="button outline"
                          onClick={() =>
                            act(
                              r.target_type === "photo" ? "photo" : "moderate",
                              r.target_id,
                              "Hide reported " + r.target_type,
                              r.target_type === "photo"
                                ? "hidden"
                                : "hide-" + r.target_type,
                            )
                          }
                        >
                          Hide reported content
                        </button>
                      )}
                      <button
                        className="text-link"
                        onClick={() =>
                          act("report", r.id, "Resolve this report", "resolved")
                        }
                      >
                        Resolve report
                      </button>
                    </div>
                  </article>
                ))}
                {!state.reports.length && (
                  <Empty title="No reports yet">
                    Member reports appear here.
                  </Empty>
                )}
              </section>
            )}
            {tab === "members" && (
              <section>
                <h2>Members</h2>
                <p>
                  Private email addresses and garage records are excluded. Use a
                  recorded reason for every restriction.
                </p>
                {!state.members.length && (
                  <Empty title="No members found">
                    Try another username or display name.
                  </Empty>
                )}
                {state.members.map((m) => (
                  <article className="dashboard-record" key={m.id}>
                    <div>
                      <h3>{m.display_name || "Member"}</h3>
                      <p>
                        Joined {new Date(m.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      className="button outline"
                      onClick={() =>
                        act(
                          "moderate",
                          m.id,
                          "Record a member restriction",
                          "restrict",
                        )
                      }
                    >
                      Warn or restrict
                    </button>
                  </article>
                ))}
                <DocumentLink href="/community/admin">
                  Review active restrictions and appeals ↗
                </DocumentLink>
              </section>
            )}
          </fieldset>
          <p className="small muted">
            Lists show up to 40 recent matches. Use search to narrow results.
            Staff actions are checked again by the server.
          </p>
        </>
      )}
      {action && (
        <Modal
          title={action.label}
          onClose={() => {
            if (!busy) setAction(null);
          }}
        >
          <form onSubmit={submit}>
            <p>
              {action.label}. A reason is required for the audit record.
              {action.kind === "photo"
                ? " The photo owner can see the review reason."
                : ""}
            </p>
            {action.value === "restrict" && (
              <div className="form-grid">
                <label>
                  Restriction
                  <select name="kind">
                    <option value="warning">Warning</option>
                    <option value="timeout">Timeout</option>
                    <option value="suspension">Suspension</option>
                    <option value="ban">Ban</option>
                  </select>
                </label>
                <label>
                  Expiry for timeout or suspension
                  <input name="until" type="datetime-local" />
                </label>
              </div>
            )}
            <label>
              Reason
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={2000}
                rows={4}
              />
            </label>
            {action.value === "restrict" && (
              <label>
                Private staff note
                <textarea name="note" maxLength={4000} />
              </label>
            )}
            <button className="button primary" disabled={busy || updating}>
              {busy ? "Saving…" : "Confirm action"}
            </button>
          </form>
        </Modal>
      )}
      {photo && <PhotoLightbox photo={photo} onClose={() => setPhoto(null)} />}
    </div>
  );
}
