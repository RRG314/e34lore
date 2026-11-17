"use client";
import { DocumentLink, navigateDocument } from "../components/DocumentLink";
import { lazy, Suspense, useEffect, useState, useRef, useMemo } from "react";
import { seriesForModel } from "../series/registry";
import { db, useApp } from "../components/context";
import { useOwnedCars } from "../vehicle/use-owned-cars";
import { PhotoImage, invokeMedia } from "../components/CarPhotos";
import { Modal } from "../components/common";
import { referencesForSeries } from "../digital-twin/public/load-reference";
import {
  buildStyles,
  buildTotals,
  type BuildProject,
  type BuildState,
  type BuildAppearance,
} from "./schema";
import { buildRpc, createProject, duplicateState } from "./service";
import { useBuildProject } from "./use-project";
import { BuildsPanel } from "./BuildsPanel";
import { AppearancePanel } from "./AppearancePanel";
import { PartsPanel } from "./PartsPanel";
import { ProgressPanel, BudgetPanel } from "./ProgressPanel";
import { BuildPhotos } from "./BuildPhotos";
import { BuildSheet, BuildSummary } from "./BuildSheet";
import { publicProjection, publicTextContainsVin } from "./public";
import { track } from "../analytics/client";
const Viewer = lazy(() =>
  import("../digital-twin/public/ReferenceWorkshop").then((m) => ({
    default: m.ReferenceWorkshop,
  })),
);
const panels = [
  "Appearance",
  "Parts",
  "Work plan",
  "Budget",
  "Photos",
  "Project",
] as const;
export function BuildStudio({
  project,
  reference,
  controls,
}: {
  project?: string;
  reference?: string;
  controls?: import("react").ReactNode;
}) {
  const { user } = useApp();
  useEffect(() => {
    const frame = requestAnimationFrame(() => track("build_open", "/workshop"));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="page build-studio">
      {!project && controls}
      {!project ? (
        <BuildsPanel reference={reference} />
      ) : !user || user.is_anonymous ? (
        <section>
          <h1>Open your build</h1>
          <p>Sign in with the account that owns this project.</p>
          <DocumentLink className="button primary" href="/account">
            Sign in
          </DocumentLink>
        </section>
      ) : (
        <ProjectEditor key={user.id + project} user={user.id} id={project} />
      )}
    </div>
  );
}
function ProjectEditor({ user, id }: { user: string; id: string }) {
  const [publicIdentity,setPublicIdentity]=useState<{display_name:string;username:string|null}|null>(null);
  const [compactPreview, setCompactPreview] = useState(true),
    [previewPhotos, setPreviewPhotos] = useState<string[] | null>(null);
  const model = useBuildProject(user, id),
    owned = useOwnedCars(),
    { toast } = useApp();
  const {
    ready: garageReady,
    cars: garageCars,
    selectCar: selectGarageCar,
  } = owned;
  const appliedCar = useRef(""),
    linkedProject = model.project?.id,
    linkedCar = model.project?.vehicle_id;
  const appearanceKey = JSON.stringify(model.state?.appearance || null);
  const viewerAppearance = useMemo(
    () => JSON.parse(appearanceKey) as BuildAppearance | null,
    [appearanceKey],
  );
  useEffect(() => {
    if (
      !linkedProject ||
      !linkedCar ||
      !garageReady ||
      !garageCars.some((c) => c.id === linkedCar)
    )
      return;
    const key = linkedProject + ":" + linkedCar;
    if (appliedCar.current === key) return;
    appliedCar.current = key;
    selectGarageCar(linkedCar);
  }, [linkedProject, linkedCar, garageReady, garageCars, selectGarageCar]);
  const [panel, setPanel] = useState<(typeof panels)[number]>("Appearance"),
    [sheet, setSheet] = useState(false),
    [publish, setPublish] = useState<BuildProject | null>(null),
    [history, setHistory] = useState<
      { version: number; summary: string; created_at: string }[] | null
    >(null),
    [operation, setOperation] = useState(false),
    [error, setError] = useState(""),
    [publication, setPublication] = useState<{
      id: string;
      version: number;
      published: boolean;
      hidden: boolean;
    } | null>(null),
    [transfer, setTransfer] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [notices, setNotices] = useState(false),
    [reminderReady, setReminderReady] = useState(false);
  useEffect(() => {
    let live = true;
    db.from("profiles").select("display_name,username").eq("id",user).maybeSingle().then(({data})=>{if(live)setPublicIdentity(data)});
    db.rpc("my_build_publication", { project: id }).then(({ data }) => {
      if (live) setPublication(data?.[0] || null);
    });
    db.from("build_notification_preferences")
      .select("reminders")
      .eq("user_id", user)
      .maybeSingle()
      .then(({ data, error }) => {
        if (live && !error) {
          setNotices(!!data?.reminders);
          setReminderReady(true);
        }
      });
    return () => {
      live = false;
    };
  }, [id, user]);
  const { state: s, project: p, edit } = model;
  async function run(fn: () => Promise<void>) {
    setOperation(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed. Try again.");
    } finally {
      setOperation(false);
    }
  }
  if (!s || !p)
    return (
      <section>
        <h1>Build Studio</h1>
        <p role="status">{model.error || model.message}</p>
        <button className="button outline" onClick={() => void model.reload()}>
          Retry
        </button>
        <DocumentLink href="/workshop?mode=build">All my builds</DocumentLink>
      </section>
    );
  const state = s,
    project = p,
    busy = model.busy || operation,
    totals = buildTotals(state);
  const series = seriesForModel(state.reference.id);
  const vehicleReferences = referencesForSeries(series);
  async function duplicate() {
    const copy = await createProject(duplicateState(state), project.vehicle_id);
    track("build_create", "/workshop");
    navigateDocument("/workshop?mode=build&project=" + copy.id);
  }
  async function openHistory(before?: number) {
    let query = db
      .from("build_project_revisions")
      .select("version,summary,created_at")
      .eq("project_id", id)
      .order("version", { ascending: false })
      .limit(30);
    if (before) query = query.lt("version", before);
    const { data, error } = await query;
    if (error) throw new Error("Revision history could not load.");
    setHistory((old) =>
      before ? [...(old || []), ...(data || [])] : data || [],
    );
  }
  const preview = publish ? publicProjection(publish.state) : null;
  return (
    <>
      <nav className="reference-mode-controls" aria-label="Workshop modes">
        <DocumentLink
          href={"/workshop?mode=explore&reference=" + encodeURIComponent(state.reference.id)}
        >
          Explore
        </DocumentLink>
        <DocumentLink
          href={
            "/workshop?mode=repair&reference=" +
            encodeURIComponent(state.reference.id)
          }
        >
          Repair
        </DocumentLink>
        <DocumentLink
          href={"/workshop?mode=build&project=" + id}
          aria-current="page"
        >
          Build
        </DocumentLink>
      </nav>
      <header className="build-editor-header">
        <div>
          <DocumentLink className="text-link" href="/workshop?mode=build">
            ← My builds
          </DocumentLink>
          <span className="eyebrow">PRIVATE BUILD · {state.lifecycle}</span>
          <h1>{state.title}</h1>
          <p className="small">
            {project.vehicle_id
              ? owned.cars.find((c) => c.id === project.vehicle_id)?.nickname ||
                "Linked garage car"
              : "Conceptual build"}{" "}
            · {totals.tasksDone} of {totals.tasksTotal} work items installed or
            checked
          </p>
        </div>
        <div className="build-save-actions">
          <span role="status" aria-live="polite">
            {model.dirty ? "Unsaved changes" : model.message}
          </span>
          <button
            className="button primary"
            disabled={busy || model.conflict || !!model.recovery}
            onClick={() => void model.save()}
          >
            Save build
          </button>
          <button
            className="button outline"
            disabled={!model.canUndo || busy}
            onClick={model.undo}
          >
            Undo
          </button>
          <button
            className="button outline"
            disabled={!model.canRedo || busy}
            onClick={model.redo}
          >
            Redo
          </button>
        </div>
      </header>
      {(error || model.error || model.conflict) && (
        <div className="build-error" role="alert">
          <p>
            {error ||
              model.error ||
              "Another tab changed this build. Reload it or save this draft as a separate build."}
          </p>
          {model.conflict && (
            <>
              <button
                className="button outline"
                onClick={() => void run(duplicate)}
              >
                Save draft as separate build
              </button>
              <button
                className="text-link"
                onClick={() => {
                  if (
                    confirm(
                      "Discard this local draft and load the saved build?",
                    )
                  )
                    void model.reload();
                }}
              >
                Reload saved build
              </button>
            </>
          )}
        </div>
      )}
      {model.recovery && (
        <div className="build-error">
          <p>
            An interrupted draft is kept on this device. Review it before
            continuing.
          </p>
          <button className="button outline" onClick={model.recover}>
            Recover draft
          </button>
          <button className="text-link" onClick={model.dismissRecovery}>
            Use saved version
          </button>
        </div>
      )}
      <div className="build-workspace">
        <div
          className={
            "build-viewport" + (compactPreview ? " build-compact-preview" : "")
          }
        >
          <div className="build-mobile-preview-tools">
            <strong>Car preview</strong>
            <button
              className="text-link"
              onClick={() => setCompactPreview((v) => !v)}
            >
              {compactPreview ? "Full car controls" : "Compact preview"}
            </button>
          </div>
          <Suspense fallback={<p role="status">Loading build preview…</p>}>
            <Viewer
              embedded
              initialReference={state.reference.id}
              initialModelRevision={String(state.reference.revision)}
              buildAppearance={viewerAppearance || undefined}
            />
          </Suspense>
          <p className="build-mobile-preview-note">
            Illustrated appearance. Check fitment separately.
          </p>
          <p className="build-view-note">
            Appearance preview. Check mechanical fitment in Parts.
          </p>
        </div>
        <div className="build-editor">
          <nav className="build-panel-tabs" aria-label="Build editor sections">
            {panels.map((name) => (
              <button
                key={name}
                aria-current={panel === name ? "page" : undefined}
                onClick={() => setPanel(name)}
              >
                {name}
              </button>
            ))}
          </nav>
          <div className="build-panel-content">
            {panel === "Appearance" ? (
              <AppearancePanel
                series={series}
                exteriorOnly={vehicleReferences.find(reference=>reference.id===state.reference.id)?.exteriorOnly}
                value={state.appearance}
                onChange={(a, category) => {
                  edit((s) => {
                    s.appearance = a;
                    return s;
                  });
                  track("build_customize", "/workshop", {
                    topic: category,
                  });
                }}
              />
            ) : panel === "Parts" ? (
              <PartsPanel state={state} edit={edit} />
            ) : panel === "Work plan" ? (
              <ProgressPanel state={state} edit={edit} />
            ) : panel === "Budget" ? (
              <BudgetPanel state={state} edit={edit} />
            ) : panel === "Photos" ? (
              <BuildPhotos
                project={id}
                selected={state.photoIds}
                onSelect={(ids) =>
                  edit((s) => {
                    s.photoIds = ids;
                    return s;
                  })
                }
              />
            ) : (
              <section className="build-fields">
                <h2>Project details</h2>
                <label>
                  Build title
                  <input
                    maxLength={120}
                    value={state.title}
                    onChange={(e) =>
                      edit((s) => {
                        s.title = e.target.value;
                        return s;
                      })
                    }
                  />
                </label>
                <label>
                  Private description
                  <textarea
                    rows={3}
                    maxLength={5000}
                    value={state.description}
                    onChange={(e) =>
                      edit((s) => {
                        s.description = e.target.value;
                        return s;
                      })
                    }
                  />
                </label>
                <label>
                  Public description
                  <textarea
                    rows={4}
                    maxLength={3000}
                    value={state.publicDescription}
                    onChange={(e) =>
                      edit((s) => {
                        s.publicDescription = e.target.value;
                        return s;
                      })
                    }
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Style
                    <select
                      value={state.style}
                      onChange={(e) =>
                        edit((s) => {
                          s.style = e.target.value as BuildState["style"];
                          return s;
                        })
                      }
                    >
                      {buildStyles.map((v) => (
                        <option value={v} key={v}>
                          {v.replaceAll("-", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Lifecycle
                    <select
                      value={state.lifecycle}
                      onChange={(e) =>
                        edit((s) => {
                          s.lifecycle = e.target
                            .value as BuildState["lifecycle"];
                          return s;
                        })
                      }
                    >
                      {["draft", "active", "completed", "archived"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="small muted">
                  Style labels describe the plan. They don’t identify genuine
                  branded parts or manufacturer approval.
                </p>
                <label>
                  Illustrated reference
                  <select
                    value={state.reference.id}
                    onChange={(e) => {
                      const r = vehicleReferences.find(
                        (r) => r.id === e.target.value,
                      );
                      if (r)
                        edit((s) => {
                          s.reference = {
                            id: r.id,
                            revision: r.revision,
                            sha256: r.sha256,
                          };
                          return s;
                        });
                    }}
                  >
                    {vehicleReferences.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                <small>
                  Model revision {state.reference.revision} ·{" "}
                  {state.reference.sha256.slice(0, 12)}. Changing the
                  illustration does not change your target configuration.
                </small>
                <fieldset>
                  <legend>Planned target configuration</legend>
                  <div className="form-grid">
                    {Object.entries(state.targetConfiguration).map(
                      ([key, value]) => (
                        <label key={key}>
                          {key}
                          <input
                            maxLength={
                              key === "year"
                                ? 4
                                : key === "month"
                                  ? 2
                                  : ["model", "engine"].includes(key)
                                    ? 80
                                    : 40
                            }
                            value={value}
                            onChange={(e) =>
                              edit((s) => {
                                s.targetConfiguration = {
                                  ...s.targetConfiguration,
                                  [key]: e.target.value,
                                };
                                return s;
                              })
                            }
                          />
                        </label>
                      ),
                    )}
                  </div>
                </fieldset>
                <details>
                  <summary>Starting configuration</summary>
                  <dl>
                    {Object.entries(state.baseConfiguration).map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v || "Unknown"}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
                <label>
                  Linked garage car
                  <select
                    disabled={busy || model.dirty}
                    value={project.vehicle_id || ""}
                    onChange={(e) =>
                      void run(async () => {
                        const updated = await buildRpc<BuildProject>(
                          "link_build_car",
                          {
                            project: id,
                            expected_version: project.version,
                            vehicle: e.target.value || null,
                          },
                        );
                        model.accept(updated);
                      })
                    }
                  >
                    <option value="">Conceptual · no actual car</option>
                    {owned.cars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nickname}
                      </option>
                    ))}
                  </select>
                </label>
                {model.dirty && (
                  <small>Save before changing the linked garage car.</small>
                )}
                <button
                  className="button outline"
                  disabled={busy}
                  onClick={() => void run(duplicate)}
                >
                  Duplicate this plan
                </button>
                <p className="small muted">
                  Copies keep the plan and reset transfer receipts. Photos stay
                  with the original build.
                </p>
                <button
                  className="button outline"
                  disabled={busy}
                  onClick={() => void run(() => openHistory())}
                >
                  Revision history
                </button>
                <button
                  className="button outline"
                  onClick={() => setSheet(true)}
                >
                  Build sheet & exports
                </button>
                <label className="check">
                  <input
                    type="checkbox"
                    disabled={!reminderReady || busy}
                    checked={notices}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      void run(async () => {
                        const { error } = await db
                          .from("build_notification_preferences")
                          .upsert({ user_id: user, reminders: enabled });
                        if (error) throw new Error(error.message);
                        setNotices(enabled);
                      });
                    }}
                  />
                  Send a daily reminder in My Garage for due build tasks
                </label>
                <p className="small muted">
                  Published updates require following a build. Discussion
                  replies use the existing community notifications.
                  Parts-availability alerts need a live supplier source and
                  aren’t available yet.
                </p>
                <button
                  className="text-link danger"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        "Delete this project, its revisions and published build? Existing actual-car service records stay in your garage.",
                      )
                    )
                      void run(async () => {
                        await buildRpc("delete_build", {
                          project: id,
                          expected_version: project.version,
                          confirmed: true,
                        });
                        try {
                          await invokeMedia({ action: "cleanup" });
                        } catch {
                          /* Access is already revoked; the durable cleanup queue remains available. */
                        }
                        navigateDocument("/workshop?mode=build");
                      });
                  }}
                >
                  Delete project
                </button>
                <details>
                  <summary>Draft recovery on this device</summary>
                  <p className="small">
                    Unsaved edits are kept in this browser for this account. On
                    a shared device, save your work and clear its recovery copy.
                  </p>
                  <button
                    className="text-link"
                    onClick={() => {
                      model.dismissRecovery();
                      toast(
                        "Saved recovery copy cleared. New unsaved changes will create another.",
                      );
                    }}
                  >
                    Clear recovery copy
                  </button>
                </details>
              </section>
            )}
          </div>
        </div>
      </div>
      <section className="build-project-actions">
        <div>
          <h2>Share the build</h2>
          <p className="small">
            Private edits stay private until you publish again. Only the
            previewed public fields and approved photos are shared.
          </p>
          {publication && (
            <p className="small">
              {publication.hidden
                ? "Held for review"
                : publication.published
                  ? "Public version " + publication.version
                  : "Unpublished"}
            </p>
          )}
        </div>
        <div className="form-actions">
          <button
            className="button primary"
            disabled={busy || model.conflict || !!model.recovery}
            onClick={() =>
              void run(async () => {
                const saved = await model.save();
                if (saved) {
                  setPreviewPhotos(null);
                  setPublish(saved);
                  track("build_publish_preview", "/workshop");
                }
              })
            }
          >
            Preview {publication ? "updated " : ""}publication
          </button>
          {publication?.published && (
            <>
              <DocumentLink
                className="button outline"
                href={"/builds/" + publication.id}
              >
                View published build ↗
              </DocumentLink>
              <button
                className="text-link"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await buildRpc("unpublish_build", { project: id });
                    setPublication({ ...publication, published: false });
                    toast("Build is no longer public.");
                  })
                }
              >
                Unpublish
              </button>
            </>
          )}
        </div>
      </section>
      <section className="build-project-actions">
        <div>
          <h2>Record completed work on the car</h2>
          <p className="small">
            Choose verified tasks to create actual service, modification and
            journal records. Planning and autosave never do this.
            {!project.vehicle_id?" Link a car in Project to record completed work.":!state.tasks.some(t=>t.status==="verified"&&!t.transferred)?" Mark completed tasks as verified in Work plan first.":""}
          </p>
        </div>
        <button
          className="button outline"
          disabled={
            busy ||
            !project.vehicle_id ||
            !state.tasks.some((t) => t.status === "verified" && !t.transferred)
          }
          onClick={() => {
            setSelected([]);
            setTransfer(true);
          }}
        >
          Choose completed work
        </button>
      </section>
      {sheet && <BuildSheet state={state} onClose={() => setSheet(false)} />}
      {history && (
        <Modal title="Revision history" onClose={() => setHistory(null)}>
          <p>
            Restoring creates a new revision. Actual-car work and deleted photos
            are not undone.
          </p>
          {history.map((r) => (
            <article className="build-revision" key={r.version}>
              <strong>Revision {r.version}</strong>
              <small>{new Date(r.created_at).toLocaleString()}</small>
              <p>{r.summary}</p>
              <button
                className="button outline"
                disabled={busy || r.version === project.version}
                onClick={() =>
                  void run(async () => {
                    const current = await model.save();
                    if (!current) return;
                    const updated = await buildRpc<BuildProject>(
                      "restore_build",
                      {
                        project: id,
                        expected_version: current.version,
                        restore_version: r.version,
                      },
                    );
                    model.accept(updated);
                    setHistory(null);
                    toast("Earlier plan restored as a new revision.");
                  })
                }
              >
                Restore revision {r.version}
              </button>
            </article>
          ))}
          {history.length > 0 && history.length % 30 === 0 && (
            <button
              className="text-link"
              onClick={() =>
                void run(() => openHistory(history.at(-1)!.version))
              }
            >
              Earlier revisions
            </button>
          )}
        </Modal>
      )}
      {publish && preview && (
        <Modal
          title="Publication preview"
          onClose={() => setPublish(null)}
          wide
        >
          <p>
            This is the public text, parts, progress and costs. Private notes,
            your garage/project identifiers and unapproved photos are excluded.
            Already downloaded copies cannot be recalled.
          </p>
          {publicIdentity?.username?<p>Published by <strong>{publicIdentity.display_name||publicIdentity.username}</strong> · @{publicIdentity.username}</p>:<p role="status"><DocumentLink href="/account">Choose your public username in Account</DocumentLink> before publishing.</p>}
          <BuildSummary build={preview} />
          <ApprovedPhotoPreview
            project={id}
            selected={publish.state.photoIds}
            onLoaded={setPreviewPhotos}
          />
          {publicTextContainsVin(preview) && (
            <p role="alert">
              Remove the full VIN from public text before publishing.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <button
            className="button primary"
            disabled={
              busy || !publicIdentity?.username || previewPhotos === null || publicTextContainsVin(preview)
            }
            onClick={() =>
              void run(async () => {
                const publicId = await buildRpc<string>("publish_build", {
                  project: id,
                  expected_version: publish.version,
                  confirmed: true,
                  approved_photos: previewPhotos,
                });
                setPublication({
                  id: publicId,
                  version: (publication?.version || 0) + 1,
                  published: true,
                  hidden: false,
                });
                setPublish(null);
                toast(
                  "Build published. Further edits stay private until you republish.",
                );
                track("build_publish", "/workshop");
              })
            }
          >
            Confirm {publication ? "republication" : "publication"}
          </button>
        </Modal>
      )}
      {transfer && (
        <Modal title="Record completed work" onClose={() => setTransfer(false)}>
          <p>
            These tasks will create service and journal entries for{" "}
            <strong>
              {owned.cars.find((c) => c.id === project.vehicle_id)?.nickname ||
                "the linked car"}
            </strong>
            . Installed components will also be added to its modification and
            installed-parts records. This does not change the factory
            configuration.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const date = String(new FormData(e.currentTarget).get("date"));
              void run(async () => {
                const current = await model.save();
                if (!current) return;
                const updated = await buildRpc<BuildProject>(
                  "transfer_build_work",
                  {
                    project: id,
                    expected_version: current.version,
                    task_ids: selected,
                    confirmed: true,
                    performed_on: date,
                  },
                );
                model.accept(updated);
                setTransfer(false);
                toast("Completed work recorded in your garage.");
              });
            }}
          >
            {state.tasks
              .filter((t) => t.status === "verified" && !t.transferred)
              .map((t) => (
                <label className="check" key={t.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(t.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, t.id]
                          : selected.filter((id) => id !== t.id),
                      )
                    }
                  />
                  {t.title}
                </label>
              ))}
            <label>
              Work date
              <input
                type="date"
                name="date"
                required
                min="1987-01-01"
                max={new Date().toISOString().slice(0, 10)}
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </label>
            <label className="check">
              <input type="checkbox" required />I confirm this work was
              completed on this car and want to add it to the actual records.
            </label>
            {error && <p role="alert">{error}</p>}
            <button
              className="button primary"
              disabled={busy || !selected.length || selected.length > 30}
            >
              Confirm & record selected work
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function ApprovedPhotoPreview({
  project,
  selected,
  onLoaded,
}: {
  project: string;
  selected: string[];
  onLoaded: (ids: string[]) => void;
}) {
  const [photos, setPhotos] = useState<
      | { id: string; object_path: string; alt_text: string; caption: string }[]
      | null
    >(null),
    [error, setError] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    db.from("owner_car_photos")
      .select("id,object_path,alt_text,caption")
      .eq("build_project_id", project)
      .eq("state", "ready")
      .eq("build_share_status", "approved")
      .in(
        "id",
        selected.length ? selected : ["00000000-0000-0000-0000-000000000000"],
      )
      .then(({ data, error }) => {
        if (!live) return;
        setError(!!error);
        if (!error) {
          setPhotos(data || []);
          onLoaded((data || []).map((p) => p.id));
        }
      });
    return () => {
      live = false;
    };
  }, [project, selected, onLoaded, revision]);
  return (
    <section aria-label="Public photo preview">
      {error ? (
        <p role="alert">
          Photo permissions could not load.{" "}
          <button
            className="text-link"
            onClick={() => setRevision((n) => n + 1)}
          >
            Retry photo preview
          </button>
        </p>
      ) : photos === null ? (
        <p role="status">Checking photo permissions…</p>
      ) : (
        <>
          <p>
            {photos.length} approved photos will be included.{" "}
            {selected.length - photos.length} selected photos remain private or
            await review.
          </p>
          <div className="private-photo-grid">
            {photos.map((p) => (
              <figure key={p.id}>
                <PhotoImage path={p.object_path} alt={p.alt_text} />
                <figcaption>{p.caption || p.alt_text}</figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
