"use client";
import { demoAssets, demoBackend } from "../lib/backend";
import { displayModel, modelKey, seriesDefinitions, seriesForModel, seriesHref, seriesIds, type Series } from "../series/registry";
import type { OwnedVehicle, ServiceRecord, Bookmark as SavedBookmark, MemberNotification, VehicleModification, InstalledPart } from "../domain/owner-records";
import { BuildsPanel } from "../build-studio/BuildsPanel";
import { DocumentLink } from "./DocumentLink";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowRight, Plus, Car, Download, Trash2, Bell, Check } from "lucide-react";
import { safeReturnPath } from "../domain/navigation";
import { reviewDeskSchema, type ReviewDeskData } from "../domain/owner-dashboard";
import { fetchAllRows } from "../lib/data-export";
import { downloadJSON } from "../lib/download";
import { PrivateJournal } from "./Journals";
import { previewFeatures } from "../release/features";
import { ScanHistory } from "../scanner/History";
import { useOwnedCars } from "../vehicle/use-owned-cars";
import { journeyHref, requestedJourney, type Journey } from "../domain/repair-journey";
import { GarageWalkthroughs } from "./WalkthroughProgress";
import { VehicleDetails } from "./VehicleDetails";
import { GaragePublicationPanel } from "./Garages";
import { GarageProfileSettings } from "./GarageProfile";
import { MemberIdentity } from "./MemberIdentity";
import { GuestAccess, GuestSubmissions } from "./GuestAccess";
import { SocialSignIn, accountRedirect } from "./SocialSignIn";
import { AccountSecurity } from "./AccountSecurity";
import { SignOutButton } from "./SignOutButton";
import { withTimeout } from "../lib/account-actions";
import { DeleteAccount } from "./DeleteAccount";
import { CatalogPartField, type PartIdentity } from "./CatalogPartField";
import { db, useApp } from "./context";
import { emptyVehicle } from "../data/catalog";
import { PageIntro, Tag, Notice, Empty, Modal } from "./common";
function localDate() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
export function AccountPage() {
  const { user, authReady, authError, toast } = useApp();
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [recover, setRecover] = useState(false);
  // Hydrate the recovery fragment and subscribe to the external Auth recovery event.
  useEffect(() => {
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((e) => {
      if (e === "PASSWORD_RECOVERY") setRecover(true);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the external recovery URL fragment after hydration.
    if (location.hash.includes("type=recovery")) setRecover(true);
    return () => subscription.unsubscribe();
  }, []);
  // Read account notices and the saved return URL only after browser hydration.
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the external Auth navigation notice after hydration.
    if(query.get("notice")==="signed-out")setMessage("You are signed out of this browser.");
    if(query.get("notice")==="account-deleted")setMessage("Your account was deleted.");
    if (query.has("error"))
      setMessage("Sign-in was not completed. Please try again or use email.");
    let next: string | null = null;
    try {
      next = sessionStorage.getItem("e34.auth.next");
    } catch {}
    if (user && next) {
      try {
        sessionStorage.removeItem("e34.auth.next");
      } catch {}
      history.replaceState(
        null,
        "",
        "/account?next=" +
          encodeURIComponent(safeReturnPath(next, location.origin)),
      );
    }
  }, [user]);
  if (demoBackend) return (
    <div className="page account-page">
      <PageIntro eyebrow="ACCOUNT" title="Sign in" description="Connect a local Supabase instance to try sign-in." />
    </div>
  );
  if (!authReady)
    return (
      <div className="page">
        <p className="loading-state">Checking your session…</p>
      </div>
    );
  if (user && !user.is_anonymous)
    return (
      <div className="page account-page">
        <PageIntro
          eyebrow="YOUR ACCOUNT"
          title={recover ? "Set a new password." : "Account settings."}
          description={user.email || "Signed in"}
        />
        {recover ? (
          <form
            className="account-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const { error } = await db.auth.updateUser({
                password: String(f.get("password")),
              });
              if (error) toast(error.message);
              else {
                await db.auth.signOut({ scope: "others" });
                setRecover(false);
                toast("Password updated.");
              }
            }}
          >
            <label>
              New password
              <input
                name="password"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
              />
            </label>
            <button className="button primary">Update password</button>
          </form>
        ) : (
          <>
            <div className="account-primary-actions"><DocumentLink className="button primary" href="/garage">My Garage <ArrowUpRight size={16}/></DocumentLink><SignOutButton /></div>
            <MemberIdentity />
            <details className="account-security-options" open={typeof location!=="undefined"&&location.hash==="#account-security"}><summary>Sign-in & security</summary><AccountSecurity /></details>
            <div className="account-links">
              <DocumentLink href="/community/settings">
                Community preferences & appeals <ArrowUpRight size={18} />
              </DocumentLink>
              <DocumentLink href="/garage">
                Open My Garage
                <ArrowUpRight size={18} />
              </DocumentLink>
              <DocumentLink href="/workshop">
                Open virtual workshop
                <ArrowUpRight size={18} />
              </DocumentLink>
              <DocumentLink href="/admin">
                My corrections & review desk
                <ArrowUpRight size={18} />
              </DocumentLink>
              <DocumentLink href="/support?category=account">Get account help <ArrowUpRight size={18}/></DocumentLink>
              <DeleteAccount />
            </div>
          </>
        )}
      </div>
    );
  return (
    <div className="page auth-page">
      <div className="auth-story">
        <div className="eyebrow">MEMBER ACCOUNT</div>
        <h1>
          E34 Lore.
          <br />
          Vehicle records.
          <br />
          <em>Technical discussions.</em>
        </h1>
        <p>
          Save useful parts and guides, keep a private service record, and join
          the conversation.
        </p>
        <img
          src={demoAssets ? "/demo/vehicle.svg" : "/assets/e34-525i-reference.jpg"}
          alt="White E34 visual reference"
        />
        <span className="small muted">
          E34 model by Uralvagonzavod · CC BY 4.0
        </span>
      </div>
      <div className="auth-panel">
        <GuestSubmissions />
        <p className="small muted">
          Member access ·{" "}
          <DocumentLink href="/community/policies">Community guidelines</DocumentLink>
        </p>
        <p className="small muted">By creating or using an account, you agree to the <DocumentLink href="/terms">Terms of use</DocumentLink>. See <DocumentLink href="/privacy">Privacy</DocumentLink> for account data and publication choices.</p>
        <Tag>E34 LORE</Tag>
        <h2>
          {mode === "signup"
            ? "Create an account."
            : mode === "reset"
              ? "Password recovery."
              : mode === "link"
                ? "Sign in by email."
                : "Sign in."}
        </h2>
        <p>
          {mode === "signup"
            ? "Create your E34 Lore account."
            : mode === "reset"
              ? "Request a password-recovery email."
              : mode === "link"
                ? "Get a one-time link. No password needed."
                : "Sign in to your account."}
        </p>
        <DocumentLink href="/community" className="button outline full">
          Browse without signing in
        </DocumentLink>
        <GuestAccess />
        {mode !== "reset" && <SocialSignIn onError={setMessage} />}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            const f = new FormData(e.currentTarget),
              email = String(f.get("email")),
              password = String(f.get("password") || "");
            try {
              if (mode === "signup") {
                const { data, error } = await withTimeout(db.auth.signUp({
                  email,
                  password,
                  options: { emailRedirectTo: accountRedirect() },
                }),15000,"Account creation could not be confirmed. Check your inbox before trying again.");
                if (error) throw error;
                if (!data.session)
                  setMessage(
                    "Check your email for the confirmation link. Once confirmed, return here to sign in.",
                  );
                else toast("Account created. Choose your username to finish.");
              } else if (mode === "reset") {
                const { error } = await withTimeout(db.auth.resetPasswordForEmail(email, {
                  redirectTo: accountRedirect(),
                }),15000,"The email request could not be confirmed. Check your inbox before trying again.");
                if (error) throw error;
                setMessage(
                  "If an account exists for this email, a recovery message will be sent.",
                );
              } else if (mode === "link") {
                const { error } = await withTimeout(db.auth.signInWithOtp({
                  email,
                  options: { emailRedirectTo: accountRedirect() },
                }),15000,"The email request could not be confirmed. Check your inbox before trying again.");
                if (error) throw error;
                setMessage(
                  "Check your inbox for a one-time sign-in link. Open it in this browser. You can close this form after signing in.",
                );
              } else {
                const { data: signedIn, error } = await withTimeout(db.auth.signInWithPassword({
                  email,
                  password,
                }),15000,"Sign-in is taking too long. Check your connection and try again.");
                if (error) throw error;
                if(!signedIn.user)throw new Error("Sign-in could not be confirmed. Please try again.");
                const next = new URLSearchParams(location.search).get("next");
                const { data: identity } = await withTimeout(db
                  .from("profiles")
                  .select("username")
                  .eq("id", signedIn.user.id)
                  .maybeSingle(),10000,"You are signed in. Open your account to continue setting up your profile.");
                location.href = identity?.username
                  ? safeReturnPath(next, location.origin)
                  : "/account?next=" +
                    encodeURIComponent(safeReturnPath(next, location.origin));
              }
            } catch (e) {
              setMessage((e as Error).message);
            }
            setBusy(false);
          }}
        >
          <label>
            Email address
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              maxLength={254}
            />
          </label>
          {mode !== "reset" && mode !== "link" && (
            <label>
              Password
              <input
                type="password"
                name="password"
                required
                minLength={mode === "signup" ? 12 : 1}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
              />
            </label>
          )}
          {mode === "signup" && (
            <p className="small muted">
              Use at least 12 characters. By joining, you agree to keep public
              contributions respectful and source technical claims.
            </p>
          )}
          {(message || authError) && (
            <div className="form-message" role="status">
              {message || authError}
            </div>
          )}
          <button className="button primary full" disabled={busy}>
            {busy
              ? "Working…"
              : mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Send recovery email"
                  : mode === "link"
                    ? "Send sign-in link"
                    : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="auth-switch">
          {mode === "login" ? (
            <>
              <button
                onClick={() => {
                  setMode("link");
                  setMessage("");
                }}
              >
                Email me a sign-in link
              </button>
              <button
                onClick={() => {
                  setMode("signup");
                  setMessage("");
                }}
              >
                Create an account
              </button>
              <button
                onClick={() => {
                  setMode("reset");
                  setMessage("");
                }}
              >
                Forgot your password?
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Back to sign in
            </button>
          )}
        </div>
        <p className="small muted">
          <DocumentLink href="/support?category=account">Trouble signing in? Contact support</DocumentLink>
          <br/><DocumentLink href="/resources#privacy">How your information is handled</DocumentLink>.
        </p>
      </div>
    </div>
  );
}
export function GaragePage() {
  const {user}=useApp();
  return <AccountGarage key={user?.id||'visitor'}/>;
}
function AccountGarage() {
  const { user, authReady, vehicle, setVehicle, toast, series, seriesEnabled } = useApp();
  const [carSeries, setCarSeries] = useState<Series>(series);
  const owned = useOwnedCars();
  const [installationPart, setInstallationPart] = useState<PartIdentity | null>(
      null,
    ),
    [installationNumber, setInstallationNumber] = useState(""),
    [installationDescription, setInstallationDescription] = useState(""),
    [requestedPart, setRequestedPart] = useState(""),
    [garageReturn, setGarageReturn] = useState("/garage"),
    [partRequestError, setPartRequestError] = useState("");
  const [vehicles, setVehicles] = useState<OwnedVehicle[]>([]),
    [records, setRecords] = useState<ServiceRecord[]>([]),
    [bookmarks, setBookmarks] = useState<SavedBookmark[]>([]),
    [notifications, setNotifications] = useState<MemberNotification[]>([]),
    [modifications, setMods] = useState<VehicleModification[]>([]),
    [installed, setInstalled] = useState<InstalledPart[]>([]),
    [activeFallback, setActive] = useState(""),
    [tab, setTab] = useState("service"),
    [allScans, setAllScans] = useState(true),
    [scanLink, setScanLink] = useState<Journey>({}),
    [modal, setModal] = useState(""),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [garageError,setGarageError] = useState(""),
    [saving,setSaving] = useState(false);
  const active=vehicles.some(v=>v.id===owned.activeId)?owned.activeId:activeFallback;
  const [profileRevision,setProfileRevision]=useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore explicit garage navigation from the browser URL after hydration.
    setGarageReturn("/garage" + location.search);
    const params = new URLSearchParams(location.search);
    const requestedTab = params.get("tab");
    setAllScans(!params.get("vehicle"));
    setScanLink(requestedJourney(location.search));
    if (requestedTab && ["journal", "photos", "progress", "service", "mods", "saved", ...(previewFeatures.scanner ? ["scans"] : [])].includes(requestedTab)) setTab(requestedTab);
    if (new URLSearchParams(location.search).get("journal_guide"))
      setTab("journal");
    const id = new URLSearchParams(location.search).get("install_part");
    if (!id) return;
    let active = true;
    setRequestedPart(id);
    db.from("parts")
      .select("id,name,number_normalized")
      .eq("id", id.slice(0, 100))
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data)
          setPartRequestError(
            "The catalog identity could not be loaded. You can enter the part manually.",
          );
        else {
          setInstallationPart(data);
          setInstallationNumber(data.number_normalized || "");
          setInstallationDescription(data.name.slice(0, 160));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user || user.is_anonymous) {
      return;
    }
    let alive = true;
    const abort=new AbortController(),deadline=setTimeout(()=>abort.abort(),12000);
    async function get() {
      setLoading(true);setGarageError("");
      try {
      const r = await Promise.all([
        db.from("owned_vehicles").select("*").eq("user_id",user!.id).order("created_at").abortSignal(abort.signal),
        db
          .from("service_records")
          .select("*")
          .order("performed_on", { ascending: false }).abortSignal(abort.signal),
        db
          .from("bookmarks")
          .select("*")
          .order("created_at", { ascending: false }).abortSignal(abort.signal),
        db
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30).abortSignal(abort.signal),
        db
          .from("vehicle_modifications")
          .select("*")
          .order("created_at", { ascending: false }).abortSignal(abort.signal),
        db
          .from("installed_parts")
          .select("*")
          .order("created_at", { ascending: false }).abortSignal(abort.signal),
      ]);
      if (!alive) return;
      const failed=r.find(result=>result.error);if(failed)throw new Error("Your garage could not load. Check your connection and try again.");
      setVehicles(r[0].data || []);
      setRecords(r[1].data || []);
      setBookmarks(r[2].data || []);
      setNotifications(r[3].data || []);
      setMods(r[4].data || []);
      setInstalled(r[5].data || []);
      if (r[0].data?.length)
        setActive((a) =>
          r[0].data!.some((v) => v.id === a)
            ? a
            : r[0].data!.some(
                  (v) =>
                    v.id ===
                    (new URLSearchParams(location.search).get("vehicle") || owned.activeId),
                )
              ? (new URLSearchParams(location.search).get("vehicle") || owned.activeId)
              : r[0].data![0].id,
        );
      } catch {if(alive)setGarageError("Your garage could not load. Check your connection and try again.");} finally {clearTimeout(deadline);if(alive)setLoading(false);}
    }
    get();
    return () => {
      alive = false;abort.abort();clearTimeout(deadline);
    };
  }, [user, revision,owned.activeId]);
  if (demoBackend) return (
    <div className="page account-page">
      <PageIntro eyebrow="YOUR CARS" title="My Garage" description="Connect a local Supabase instance to save cars, repairs and photos." />
    </div>
  );
  if (!authReady)
    return (
      <div className="page">
        <p>Checking your garage…</p>
      </div>
    );
  if (!user || user.is_anonymous)
    return (
      <div className="page">
        <PageIntro
          eyebrow="MY GARAGE"
          title="My Garage."
          description="A private place for your vehicle details, maintenance history and saved knowledge."
        />
        <div className="garage-welcome">
          <img
            src={demoAssets ? "/demo/vehicle.svg" : "/assets/e34-525i-reference.jpg"}
            alt="White E34 sedan visual reference"
          />
          <div>
            <h2>Vehicle and service records.</h2>
            <p>
              Your selected vehicle stays on this device. Sign in to keep
              service records, save references and follow conversations across
              devices.
            </p>
            <a
              href={"/account?next=" + encodeURIComponent(garageReturn)}
              className="button primary"
            >
              Sign in to My Garage
              <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </div>
    );
  const v = vehicles.find((v) => v.id === active);
  const service = records.filter((r) => r.vehicle_id === active),
    mods = modifications.filter((m) => m.vehicle_id === active),
    installedParts = installed.filter((p) => p.vehicle_id === active);
  const refresh = () => setRevision((r) => r + 1);
  async function remove(table: string, id: string) {
    if (
      !confirm(
        "Delete this " +
          (table === "owned_vehicles"
            ? "vehicle and its service records"
            : "record") +
          "?",
      )
    )
      return;
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) toast(error.message);
    else { refresh(); if (table === "owned_vehicles") owned.retry(); }
  }
  return (
    <div className="page">
      <PageIntro
        eyebrow="YOUR ACCOUNT"
        title="My Garage"
        description="Your cars, service records and saved references."
      >
        <div className="inline-tags">
          <DocumentLink className="button outline" href="/garage/vins">VIN registry</DocumentLink>
          <button
            className="button outline"
            disabled={loading}
            onClick={async () => {
              const tables = [
                ["profile", "profiles", "id"],
                ["vehicles", "owned_vehicles", "user_id"],
                ["vehicleVins", "vehicle_vins", "user_id"],
                ["sharedGarageStories", "garage_showcases", "user_id"],
                ["serviceRecords", "service_records", "user_id"],
                ["bookmarks", "bookmarks", "user_id"],
                ["modifications", "vehicle_modifications", "user_id"],
                ["installedParts", "installed_parts", "user_id"],
                ["outcomes", "repair_outcomes", "user_id"],
                ["journalUpdates", "owner_journal_entries", "user_id"],
                [
                  "publishedJournalUpdates",
                  "garage_journal_entries",
                  "user_id",
                ],
                ["walkthroughProgress", "guide_progress", "user_id"],
                ["configurationEvidence", "vehicle_configuration_evidence", "user_id"],
                ["configurationRevisions", "vehicle_configuration_revisions", "user_id"],
                ["componentObservations", "component_observations", "user_id"],
                ["scannerCorrections", "scanner_corrections", "user_id"],
                ["repairPartsUsed", "repair_parts_used", "user_id"],
                ["completedRepairRuns", "completed_repair_runs", "user_id"],
                ["reports", "reports", "reporter_id"],
                ["corrections", "review_submissions", "author_id"],
                ["discussions", "threads", "author_id"],
                ["replies", "posts", "author_id"],
                ["carPhotos", "owner_car_photos", "user_id"],
                ["partPhotos", "observation_photos", "user_id"],
                ["notifications", "notifications", "user_id"],
                ["buildProjects","build_projects","user_id"],
                ["buildRevisions","build_project_revisions","user_id"],
                ["buildTransfers","build_task_transfers","user_id"],
                ["followedBuilds","build_follows","user_id"],
                ["buildNotificationPreferences","build_notification_preferences","user_id"],
                ["communityFeedback", "community_feedback", "user_id"],
                ["communityPreferences", "community_preferences", "user_id"],
                ["communityAppeals", "community_appeals", "user_id"],
                ["workshopSessions", "user_workshop_sessions", "user_id"],
                ["reconstructionJobs", "reconstruction_jobs", "user_id"],
                [
                  "reconstructionEvidence",
                  "reconstruction_evidence",
                  "user_id",
                ],
              ];
              const exports = await Promise.allSettled([
                (async () => {const {data,error}=await db.rpc('support_my_export');if(error)throw error;return ['supportConversations',data] as const;})(),
                (async () => {const {data,error}=await db.rpc('my_garage_profile_photo');if(error)throw error;return ['garageProfilePicture',data] as const;})(),
                (async () => {
                  const { data, error } = await db.rpc(
                    "my_car_photo_publications",
                  );
                  if (error) throw error;
                  return ["carPhotoPublicationLinks", data] as const;
                })(),
                (async () => {
                  const { data, error } = await db.rpc(
                    "my_journal_publications",
                  );
                  if (error) throw error;
                  return ["journalPublicationLinks", data] as const;
                })(),
                (async () => {
                  const { data, error } = await db.rpc(
                    "my_garage_publications",
                  );
                  if (error) throw error;
                  return ["garagePublicationLinks", data] as const;
                })(),
                (async () => {
                  const { data, error } = await db.rpc(
                    "my_community_restrictions",
                  );
                  if (error) throw error;
                  return ["communityRestrictions", data] as const;
                })(),
                ...tables.map(async ([name, table, owner]) => {
                  const rows = await fetchAllRows((from, to) => {
                    let query = db.from(table).select("*").eq(owner, user.id);
                    query =
                      table === "bookmarks"
                        ? query.order("kind").order("target_id")
                        : table === "community_preferences"
                          ? query.order("target_user_id")
                          : query.order("id");
                    return query.range(from, to);
                  });
                  return [name, rows] as const;
                }),
                ...(["threads", "posts"] as const).map(
                  async (parent) =>
                    [
                      parent === "threads"
                        ? "discussionHistory"
                        : "replyHistory",
                      await fetchAllRows((from, to) =>
                        db
                          .from("contribution_revisions")
                          .select("*," + parent + "!inner(author_id)")
                          .eq(parent + ".author_id", user.id)
                          .order("id")
                          .range(from, to),
                      ),
                    ] as const,
                ),
              ]);
              const failure = exports.find((r) => r.status === "rejected");
              if (failure?.status === "rejected") {
                toast(
                  "Export failed: " +
                    String(failure.reason?.message || failure.reason),
                );
                return;
              }
              const entries = exports.flatMap((r) =>
                r.status === "fulfilled" ? [r.value] : [],
              );
              downloadJSON(
                {
                  exportedAt: new Date().toISOString(),
                  consistency:
                    "Records are read in ordered pages. Avoid editing during export.",
                  ...Object.fromEntries(entries),
                },
                "e34-collective-export.json",
              );
            }}
          >
            <Download size={16} />
            Export data
          </button>
          <button
            className="button primary"
            onClick={() => setModal("vehicle")}
          >
            <Plus size={17} />
            {seriesEnabled ? "Add a car" : "Add an E34"}
          </button>
        </div>
      </PageIntro>
      <GarageProfileSettings vehicleId={active || undefined} revision={profileRevision} />
      {garageError&&<Notice tone="warning"><p role="alert">{garageError}</p><button className="button outline" onClick={refresh}>Retry loading garage</button></Notice>}
      {notifications.some((n) => !n.read_at) && (
        <div className="garage-notifications">
          <Bell size={19} />
          <strong>
            {notifications.filter((n) => !n.read_at).length} new notifications
          </strong>
          {notifications
            .filter((n) => !n.read_at)
            .slice(0, 2)
            .map((n) => (
              <a
                key={n.id}
                href={n.target_url || "/community/" + n.thread_id}
                onClick={() =>
                  db
                    .from("notifications")
                    .update({ read_at: new Date().toISOString() })
                    .eq("id", n.id)
                    .then(() => {})
                }
              >
                {n.message}
                <ArrowUpRight size={14} />
              </a>
            ))}
          <button
            className="text-link"
            onClick={async () => {
              const { error } = await db
                .from("notifications")
                .update({ read_at: new Date().toISOString() })
                .is("read_at", null);
              if (error) toast(error.message);
              else refresh();
            }}
          >
            Mark all read
          </button>
        </div>
      )}
      {requestedPart && (
        <Notice>
          {partRequestError || (
            <>
              Catalog part:{" "}
              <strong>{installationDescription || "Loading identity…"}</strong>
              {installationNumber && (
                <>
                  {" "}
                  · <code>{installationNumber}</code>
                </>
              )}
              . Select the vehicle below, then record the installation.
            </>
          )}
          {active && (
            <button
              className="text-link"
              disabled={!installationPart && !partRequestError}
              onClick={() => {
                setTab("mods");
                setModal("installed");
              }}
            >
              Record for selected vehicle
              <ArrowUpRight size={14} />
            </button>
          )}
        </Notice>
      )}
      {loading ? (
        <p className="loading-state">Opening your records…</p>
      ) : (
        <>
          <BuildsPanel/>
          <div className="garage-vehicles">
            {vehicles.map((car) => (
              <button
                className={active === car.id ? "selected" : ""}
                key={car.id}
                onClick={() => { setActive(car.id); owned.selectCar(car.id); }}
              >
                <Car size={28} />
                <div>
                  <strong>{car.nickname}</strong>
                  <span>
                    {car.configuration?.year} BMW {seriesForModel(car.model_id).toUpperCase()} {displayModel(car.model_id)} ·{" "}
                    {car.configuration?.engine || "Engine unknown"}
                  </span>
                  <small>
                    {car.mileage !== null
                      ? Number(car.mileage).toLocaleString() +
                        " " +
                        car.mileage_unit
                      : "Mileage not recorded"}
                  </small>
                </div>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
          {!garageError && !vehicles.length && (
            <Empty title="Your garage is empty.">
              {vehicle.model ? `Add your selected ${vehicle.year} ${vehicle.model} to save it here.` : "Add a car you own or used to own."} Photos and service records stay private until you choose to share them.
              <button
                className="button primary"
                onClick={() => setModal("vehicle")}
              >
                Add your car
                <Plus size={17} />
              </button>
            </Empty>
          )}
          {v && <VehicleDetails car={v} onChanged={() => { refresh(); owned.retry(); }} />}
          <nav className="tabs garage-record-tabs" aria-label="Garage records">
            {previewFeatures.scanner && <button aria-pressed={tab === "scans"} className={tab === "scans" ? "active" : ""} onClick={() => setTab("scans")}>Identifications</button>}
            <button
              aria-pressed={tab === "journal"}
              className={tab === "journal" ? "active" : ""}
              onClick={() => setTab("journal")}
            >
              Restoration journal
            </button>
            <button
              aria-pressed={tab === "photos"}
              className={tab === "photos" ? "active" : ""}
              onClick={() => setTab("photos")}
            >
              Photos & sharing
            </button>
            <button
              aria-pressed={tab === "progress"}
              className={tab === "progress" ? "active" : ""}
              onClick={() => setTab("progress")}
            >
              Walkthrough progress
            </button>
            <button
              aria-pressed={tab === "service"}
              className={tab === "service" ? "active" : ""}
              onClick={() => setTab("service")}
            >
              Service history
            </button>
            <button
              aria-pressed={tab === "mods"}
              className={tab === "mods" ? "active" : ""}
              onClick={() => setTab("mods")}
            >
              Modifications & parts
            </button>
            <button
              aria-pressed={tab === "saved"}
              className={tab === "saved" ? "active" : ""}
              onClick={() => setTab("saved")}
            >
              Saved knowledge <span>{bookmarks.length}</span>
            </button>
          </nav>
          {previewFeatures.scanner && tab === "scans" ? (
            scanLink.scan && scanLink.vehicle && owned.activeId === scanLink.vehicle && !allScans ? (
              <ScanHistory vehicleId={owned.activeId} focusId={scanLink.scan}/>
            ) : <>
              {v && <label className="garage-scan-scope">Show identifications
                <select value={allScans ? "all" : "car"} onChange={event => setAllScans(event.target.value === "all")}>
                  <option value="all">All cars and unassigned scans</option>
                  <option value="car">{v.nickname}</option>
                </select>
              </label>}
              <ScanHistory vehicleId={allScans ? undefined : v?.id}/>
            </>
          ) : tab === "journal" ? (
            v && (
              <>
                {previewFeatures.vehicleConfiguration && <a className="button outline" href={"/garage/configuration?vehicle="+v.id}>Vehicle evidence & installed configuration</a>}
                {previewFeatures.scanner && <a className="button outline" href={seriesHref("/scanner?vehicle="+v.id, seriesForModel(v.model_id))}>Identify a component</a>}
                <PrivateJournal
                  key={"journal:"+v.id}
                  vehicleId={v.id}
                  nickname={v.nickname}
                />
              </>
            )
          ) : tab === "photos" ? (
            v && <GaragePublicationPanel key={"publication:"+v.id} vehicle={v} onChanged={refresh}
              onSharingChanged={()=>setProfileRevision(value=>value+1)} />
          ) : tab === "progress" ? (
            v && <GarageWalkthroughs vehicleId={v.id} />
          ) : tab === "saved" ? (
            <div className="saved-list">
              {bookmarks.length ? (
                bookmarks.map((b) => (
                  <div key={b.kind + b.target_id}>
                    <Tag>{b.kind}</Tag>
                    <a
                      href={
                        b.kind === "guide"
                          ? seriesHref("/guides/" + b.target_id, seriesForModel(b.target_id))
                          : b.kind === "part"
                            ? seriesHref("/parts/catalog?part=" + b.target_id + (v ? "&vehicle=" + v.id : ""), seriesForModel(v?.model_id || ""))
                            : b.kind === "article"
                              ? "/articles/" + b.target_id
                              : "/community/" + b.target_id
                      }
                    >
                      {b.title}
                      <ArrowUpRight size={17} />
                    </a>
                    <button
                      className="icon-button"
                      aria-label={"Remove bookmark " + b.title}
                      onClick={async () => {
                        const { error } = await db
                          .from("bookmarks")
                          .delete()
                          .eq("kind", b.kind)
                          .eq("target_id", b.target_id);
                        if (error) toast(error.message);
                        else refresh();
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <Empty title="No saved references.">
                  Use the bookmark icon on a part, guide, article or discussion.
                </Empty>
              )}
            </div>
          ) : (
            v && (
              <>
                <div className="section-heading">
                  <div>
                    <h2>{v.nickname}</h2>
                    <button
                      className="text-link"
                      onClick={() => {
                        owned.selectCar(v.id);
                        if (seriesForModel(v.model_id) === series) setVehicle({
                          ...emptyVehicle, ...v.configuration, model: displayModel(v.model_id),
                        });
                        toast(
                          "Car selected.",
                        );
                      }}
                    >
                      Select this car
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <div className="inline-tags">
                    <button
                      className="button outline"
                      onClick={() =>
                        setModal(tab === "service" ? "service" : "modification")
                      }
                    >
                      <Plus size={16} />
                      {tab === "service"
                        ? "Record service"
                        : "Record modification"}
                    </button>
                    {tab === "mods" && (
                      <button
                        className="button outline"
                        onClick={() => setModal("installed")}
                      >
                        <Plus size={16} />
                        Record installed part
                      </button>
                    )}
                    <button
                      className="icon-button"
                      aria-label={"Delete " + v.nickname}
                      onClick={() => remove("owned_vehicles", v.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {previewFeatures.vehicleConfiguration && <a className="button outline" href={"/garage/configuration?vehicle="+v.id}>Vehicle evidence & installed configuration</a>}
                {previewFeatures.scanner && <a className="button outline" href={seriesHref("/scanner?vehicle="+v.id, seriesForModel(v.model_id))}>Identify a component</a>}
                {tab === "service" ? (
                  service.length ? (
                    <div className="service-timeline">
                      {service.map((r) => (
                        <div key={r.id}>
                          <span className="timeline-dot" />
                          <time>{r.performed_on}</time>
                          <div>
                            <h3>{r.title}</h3>
                            <p>{r.notes}</p>
                            <small>
                              {r.mileage !== null
                                ? Number(r.mileage).toLocaleString() +
                                  " " +
                                  v.mileage_unit
                                : ""}
                              {r.due_on ? " · Next due " + r.due_on : ""}
                              {r.due_mileage
                                ? " / " + r.due_mileage + " " + v.mileage_unit
                                : ""}
                            </small>
                            {r.due_on && r.due_on < localDate() && (
                              <Tag tone="amber">DATE REMINDER DUE</Tag>
                            )}
                          </div>
                          <button
                            className="icon-button"
                            aria-label={"Delete " + r.title}
                            onClick={() => remove("service_records", r.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty title="No service records.">
                      Record work you’ve done, observations and optional
                      next-service reminders.
                    </Empty>
                  )
                ) : (
                  <div className="modification-list">
                    {mods.map((m) => (
                      <div key={m.id}>
                        <Tag>MODIFICATION</Tag>
                        <h3>{m.title}</h3>
                        <p>{m.notes}</p>
                        <button
                          className="icon-button"
                          aria-label={"Delete " + m.title}
                          onClick={() => remove("vehicle_modifications", m.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                    {installedParts.map((p) => (
                      <div key={p.id}>
                        <Tag>INSTALLED PART</Tag>
                        <h3>{p.description}</h3>
                        <p>
                          {p.number_raw || "Number not recorded"} · {p.notes}
                        </p>
                        {p.part_id && (
                          <a
                            className="text-link"
                            href={
                              "/parts?part=" + encodeURIComponent(p.part_id)
                            }
                          >
                            Catalog record
                            <ArrowUpRight size={14} />
                          </a>
                        )}
                        <button
                          className="icon-button"
                          aria-label={"Delete " + p.description}
                          onClick={() => remove("installed_parts", p.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                    {!mods.length && !installedParts.length && (
                      <Empty title="No modifications or installed parts recorded.">
                        Keep the details that future fitment and repair
                        decisions depend on.
                      </Empty>
                    )}
                  </div>
                )}
              </>
            )
          )}
        </>
      )}
      {modal && (
        <Modal
          title={
            modal === "vehicle"
              ? (seriesEnabled ? "Add a car" : "Add an E34")
              : modal === "service"
                ? "Record maintenance"
                : modal === "installed"
                  ? "Record an installed part"
                  : "Document a modification"
          }
          onClose={() => setModal("")}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();if(saving)return;setSaving(true);try{
              const f = new FormData(e.currentTarget);
              let result;
              const abort=new AbortController(),deadline=setTimeout(()=>abort.abort(),15000);
              try {
              if (modal === "vehicle") {
                const config = {
                  ...emptyVehicle,
                  model: String(f.get("model")),
                  engine: String(f.get("engine") || ""),
                  year: String(f.get("year") || ""),
                  body: String(f.get("body") || ""),
                  transmission: String(f.get("transmission") || ""),
                  market: String(f.get("market") || ""),
                  month: String(f.get("month") || ""),
                };
                result = await db.from("owned_vehicles").insert({
                  nickname: f.get("nickname"),
                  model_id: modelKey(carSeries,String(f.get("model"))),
                  configuration: config,
                  mileage: f.get("mileage") ? Number(f.get("mileage")) : null,
                  mileage_unit: f.get("unit"),
                  ownership_status: f.get("ownership_status") || "current",
                  acquired_year: f.get("acquired_year")
                    ? Number(f.get("acquired_year"))
                    : null,
                  released_year:
                    f.get("ownership_status") === "previous" &&
                    f.get("released_year")
                      ? Number(f.get("released_year"))
                      : null,
                }).abortSignal(abort.signal);
              } else if (modal === "service") {
                result = await db.from("service_records").insert({
                  vehicle_id: active,
                  title: f.get("title"),
                  performed_on: f.get("date"),
                  mileage: f.get("mileage") ? Number(f.get("mileage")) : null,
                  notes: f.get("notes") || "",
                  due_on: f.get("due_on") || null,
                  due_mileage: f.get("due_mileage")
                    ? Number(f.get("due_mileage"))
                    : null,
                }).abortSignal(abort.signal);
              } else if (modal === "installed") {
                result = await db.from("installed_parts").insert({
                  vehicle_id: active,
                  description: f.get("title"),
                  number_raw: installationNumber,
                  part_id: installationPart?.id || null,
                  notes: f.get("notes") || "",
                }).abortSignal(abort.signal);
              } else
                result = await db.from("vehicle_modifications").insert({
                  vehicle_id: active,
                  title: f.get("title"),
                  notes: f.get("notes") || "",
                }).abortSignal(abort.signal);
              } finally {clearTimeout(deadline);}
              if (result.error) toast("The save could not be confirmed. Reload your garage before trying again.");
              else {
                setModal("");
                if (modal === "vehicle") owned.retry();
                if (modal === "installed") {
                  setRequestedPart("");
                  setInstallationPart(null);
                  setInstallationNumber("");
                  setInstallationDescription("");
                  history.replaceState(null, "", seriesHref(journeyHref("/garage?tab=mods", { vehicle: active }), series));
                }
                refresh();
                toast("Private garage record saved.");
              }
              }catch{toast("The save could not be confirmed. Reload your garage before trying again.");}finally{setSaving(false);}
            }}
          >
            {modal === "vehicle" ? (
              <>
                <label>
                  Nickname
                  <input
                    required
                    name="nickname"
                    maxLength={80}
                    placeholder="The daily, the project…"
                  />
                </label>
                <div className="form-grid">
                  {seriesEnabled && <label>BMW series<select value={carSeries} onChange={event=>setCarSeries(event.target.value as Series)}>
                    {seriesIds.map(id=><option key={id} value={id}>{seriesDefinitions[id].designation} · {id.toUpperCase()}</option>)}
                  </select></label>}
                  <label>
                    Model
                    <select name="model" key={carSeries} defaultValue={carSeries==='e30'?'325i':vehicle.model || "525i"}>
                      {seriesDefinitions[carSeries].models.map((m) => (
                        <option key={m.id}>{m.id}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Installed engine
                    <input
                      name="engine"
                      defaultValue=""
                      maxLength={40}
                      placeholder="Unknown if not identified"
                    />
                  </label>
                  <label>
                    Production year
                    <input
                      name="year"
                      type="number"
                      min={seriesDefinitions[carSeries].years[0]}
                      max={seriesDefinitions[carSeries].years[1]}
                      defaultValue={vehicle.year}
                    />
                  </label>
                  <label>Body style<select name="body" defaultValue=""><option value="">Unknown</option>{seriesDefinitions[carSeries].bodies.map(body=><option key={body}>{body}</option>)}</select></label>
                  <label>Transmission<select name="transmission" defaultValue=""><option value="">Unknown</option><option>Manual</option><option>Automatic</option></select></label>
                  <label>Sales market<select name="market" defaultValue=""><option value="">Unknown</option><option value="USA">United States</option><option value="EUR">Europe</option><option value="OTHER">Other</option></select></label>
                  <label>Production month<select name="month" defaultValue=""><option value="">Unknown</option>{Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => <option key={m}>{m}</option>)}</select></label>
                  <label>
                    Recorded mileage
                    <input type="number" name="mileage" min="0" />
                  </label>
                  <label>
                    Ownership
                    <select name="ownership_status">
                      <option value="current">Currently owned</option>
                      <option value="previous">Previously owned</option>
                    </select>
                  </label>
                  <label>
                    Acquired year (optional)
                    <input
                      type="number"
                      name="acquired_year"
                      min={seriesDefinitions[carSeries].years[0]}
                      max="2100"
                    />
                  </label>
                  <label>
                    Year ownership ended (optional)
                    <input
                      type="number"
                      name="released_year"
                      min={seriesDefinitions[carSeries].years[0]}
                      max="2100"
                    />
                  </label>
                  <label>
                    Distance units
                    <select name="unit">
                      <option value="mi">Miles</option>
                      <option value="km">Kilometers</option>
                    </select>
                  </label>
                </div>
                <p className="small muted">
                  Leave unconfirmed details unknown. You can add paint codes, mileage and private notes after saving.
                </p>
              </>
            ) : (
              <>
                <label>
                  {modal === "installed" ? "Part description" : "Title"}
                  {modal === "installed" ? (
                    <input
                      name="title"
                      required
                      minLength={2}
                      maxLength={160}
                      value={installationDescription}
                      onChange={(e) =>
                        setInstallationDescription(e.target.value)
                      }
                    />
                  ) : (
                    <input
                      name="title"
                      required
                      minLength={2}
                      maxLength={160}
                    />
                  )}
                </label>
                {modal === "installed" && (
                  <CatalogPartField
                    value={installationNumber}
                    selected={installationPart}
                    onChange={(number) => {
                      setInstallationNumber(number);
                      setInstallationPart(null);
                    }}
                    onSelect={(part) => {
                      setInstallationPart(part);
                      setInstallationNumber(part.number_normalized || "");
                      setInstallationDescription(
                        (old) => old || part.name.slice(0, 160),
                      );
                    }}
                  />
                )}
                {modal === "service" && (
                  <>
                    <div className="form-grid">
                      <label>
                        Service date
                        <input
                          type="date"
                          name="date"
                          required
                          defaultValue={localDate()}
                        />
                      </label>
                      <label>
                        Mileage ({v?.mileage_unit})
                        <input name="mileage" type="number" min="0" />
                      </label>
                      <label>
                        Next due date (optional)
                        <input type="date" name="due_on" />
                      </label>
                      <label>
                        Next due mileage (optional)
                        <input name="due_mileage" type="number" min="0" />
                      </label>
                    </div>
                    <p className="small muted">
                      Reminders appear in your garage. No email or push
                      notifications are scheduled.
                    </p>
                  </>
                )}
                <label>
                  Notes
                  <textarea name="notes" rows={5} maxLength={12000} />
                </label>
              </>
            )}
            <button className="button primary" disabled={saving}>
              {saving?"Saving…":"Save to garage"}
              <Check size={16} />
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
export function AdminPage() {
  const { user, authReady, toast } = useApp();
  const [response, setResponse] = useState<{
    key: string;
    data: ReviewDeskData | null;
    error: string;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const userId = user?.id;
  const requestKey = JSON.stringify([userId, revision]);
  const current = response?.key === requestKey ? response : null;
  const roles = current?.data?.roles || [];
  const submissions = current?.data?.submissions || [];
  const reports = current?.data?.reports || [];
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 15_000);
    async function load() {
      const p = await db
        .rpc("current_permissions")
        .abortSignal(controller.signal);
      if (p.error) throw new Error(p.error.message);
      const roleList = p.data || [];
      const s = await db
        .from("review_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)
        .abortSignal(controller.signal);
      if (s.error) throw new Error(s.error.message);
      let reportRows = [];
      if (roleList.includes("moderator") || roleList.includes("admin")) {
        const r = await db
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
          .abortSignal(controller.signal);
        if (r.error) throw new Error(r.error.message);
        reportRows = r.data || [];
      }
      const parsed = reviewDeskSchema.safeParse({
        roles: roleList,
        submissions: s.data || [],
        reports: reportRows,
      });
      if (!parsed.success)
        throw new Error(
          "The review desk returned incomplete data. Please try again later.",
        );
      if (active)
        setResponse({ key: requestKey, data: parsed.data, error: "" });
    }
    load()
      .catch((failure: unknown) => {
        if (active)
          setResponse({
            key: requestKey,
            data: null,
            error: controller.signal.aborted
              ? "The review desk took too long to respond. Please try again."
              : failure instanceof Error
                ? failure.message
                : "The review desk could not be loaded. Please try again.",
          });
      })
      .finally(() => clearTimeout(deadline));
    return () => {
      active = false;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [userId, requestKey]);
  if (!authReady || (user && !current))
    return (
      <div className="page">
        <p>Opening the review desk…</p>
      </div>
    );
  return (
    <div className="page">
      <PageIntro
        eyebrow="THE REVIEW DESK"
        title="Technical review & moderation."
        description="Technical corrections and community moderation have separate permissions."
      />
      {!user ? (
        <Empty title="Sign in to see your submissions">
          Members can follow their own corrections. Reviewer and moderator
          permissions are assigned separately by the owner.
          <DocumentLink className="button primary" href="/account?next=/admin">
            Sign in
            <ArrowUpRight size={17} />
          </DocumentLink>
        </Empty>
      ) : current?.error ? (
        <Notice tone="warning">
          <p role="alert">{current.error}</p>
          <button
            className="button outline"
            onClick={() => setRevision((r) => r + 1)}
          >
            Try again
          </button>
          <DocumentLink href="/account?next=/admin#account-security">Account security</DocumentLink>
        </Notice>
      ) : (
        <>
          <Notice>
            {roles.length
              ? "Your assigned permissions: " + roles.join(", ")
              : "You can view your own technical submissions. No reviewer or moderator permissions are assigned to your account."}
          </Notice>
          <p>
            <DocumentLink href="/manage">Owner dashboard ↗</DocumentLink>{roles.includes("admin")&&<> · <DocumentLink href="/manage/support">Support inbox ↗</DocumentLink></>} ·{" "}
            <DocumentLink href="/community/admin">
              Community moderation, restrictions & appeals ↗
            </DocumentLink>{" "}
            · Staff moderation requires MFA verification in{" "}
            <DocumentLink href="/account?next=/admin#account-security">Account security</DocumentLink>
            .
          </p>
          <h2>Technical submissions</h2>
          <p className="small muted">
            Accepting a proposal records a review decision. Publishing the
            actual content change requires a reviewed source revision.
          </p>
          {submissions.length ? (
            <div className="review-list">
              {submissions.map((s) => (
                <div key={s.id}>
                  <div className="inline-tags">
                    <Tag>{s.target_type}</Tag>
                    <Tag tone="amber">{s.status}</Tag>
                    <code>{s.target_id}</code>
                  </div>
                  <p className="post-body">{s.correction}</p>
                  {s.source_post_id && (
                    <p className="small">
                      Source comment: <code>{s.source_post_id}</code> · version{" "}
                      {s.source_post_version}. Original text is retained in the
                      immutable reply history while the source contribution
                      exists.
                    </p>
                  )}
                  {s.evidence_url && (
                    <a href={s.evidence_url} target="_blank" rel="noreferrer">
                      Submitted source
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                  {(roles.includes("reviewer") || roles.includes("admin")) && (
                    <label>
                      Review disposition
                      <select
                        value={s.status}
                        onChange={async (e) => {
                          const { error } = await db
                            .from("review_submissions")
                            .update({ status: e.target.value })
                            .eq("id", s.id);
                          if (error) toast(error.message);
                          else setRevision((r) => r + 1);
                        }}
                      >
                        {[
                          "pending",
                          "needs_evidence",
                          "accepted",
                          "rejected",
                        ].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty title="No technical submissions yet">
              Use “Suggest a correction” on a part, guide or article.
            </Empty>
          )}
          {(roles.includes("moderator") || roles.includes("admin")) && (
            <>
              <h2>Moderation reports</h2>
              {reports.map((r) => (
                <div className="review-card" key={r.id}>
                  <Tag>{r.target_type}</Tag>
                  <code>{r.target_id}</code>
                  <p>{r.reason}</p>
                  <label>
                    Disposition
                    <select
                      value={r.status}
                      onChange={async (e) => {
                        const { error } = await db
                          .from("reports")
                          .update({ status: e.target.value })
                          .eq("id", r.id);
                        if (error) toast(error.message);
                        else setRevision((x) => x + 1);
                      }}
                    >
                      {["open", "reviewing", "resolved", "dismissed"].map(
                        (x) => (
                          <option key={x}>{x}</option>
                        ),
                      )}
                    </select>
                  </label>
                  {["thread", "post", "garage", "journal"].includes(
                    r.target_type,
                  ) && (
                    <button
                      className="button outline"
                      onClick={async () => {
                        const { error } =
                          r.target_type === "journal"
                            ? await db.rpc("moderate_journal_entry", {
                                entry: r.target_id,
                                hide: true,
                                reason: "Reported content: " + r.reason,
                              })
                            : await db.rpc("moderate_community", {
                                action:
                                  r.target_type === "thread"
                                    ? "hide-thread"
                                    : r.target_type === "garage"
                                      ? "hide-garage"
                                      : "hide-post",
                                target_id: r.target_id,
                                reason: "Reported content: " + r.reason,
                              });
                        toast(
                          error
                            ? error.message
                            : "Content hidden by moderation.",
                        );
                      }}
                    >
                      Hide reported content
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
