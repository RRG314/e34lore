"use client";
import { DocumentLink } from "../components/DocumentLink";
import { useEffect, useState } from "react";
import { useApp, db } from "../components/context";
import { useOwnedCars } from "../vehicle/use-owned-cars";
import { referencesForSeries } from "../digital-twin/public/load-reference";
import { seriesDefinitions, seriesForModel, seriesHref } from "../series/registry";
import { sanitizeVehicle } from "../data/catalog";
import { createProject, duplicateState, loadProject } from "./service";
import { newBuild, type BuildState } from "./schema";
import { track } from "../analytics/client";
type BuildCard={id:string;vehicle_id:string|null;version:number;updated_at:string;title:string;lifecycle:BuildState["lifecycle"];model:string;referenceId:string;paint:BuildState["appearance"]["paint"]};
export function BuildsPanel({
  reference,
  vehicleId,
}: {
  reference?: string;
  vehicleId?: string;
}) {
  const { user, toast, series } = useApp(),
    owned = useOwnedCars();
  const [rows, setRows] = useState<BuildCard[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [creating, setCreating] = useState(false),
    [car, setCar] = useState(vehicleId || ""),
    [refChoice, setRef] = useState<string|null>(null),
    [filter, setFilter] = useState("all");
  const selectedCar = owned.cars.find(row => row.id === car);
  const buildSeries = selectedCar ? seriesForModel(selectedCar.model_id) : series;
  const references = referencesForSeries(buildSeries);
  const ref = [refChoice, reference].find(id => references.some(row => row.id === id)) || seriesDefinitions[buildSeries].reference;
  const projectPath = (id: string) => "/workshop?mode=build&project=" + id;
  useEffect(() => {
    if (!user?.id) return;
    let live = true;
    db.from("build_projects")
      .select("id,vehicle_id,version,updated_at,title:state->>title,lifecycle:state->>lifecycle,model:state->targetConfiguration->>model,referenceId:state->reference->>id,paint:state->appearance->paint")
      .order("updated_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (live) {
          setRows((data || []) as unknown as BuildCard[]);
          setLoading(false);
          setError(
            error
              ? "Builds could not load. Check your connection or try again."
              : "",
          );
        }
      });
    return () => {
      live = false;
    };
  }, [user, revision]);
  async function create() {
    setCreating(true);
    setError("");
    try {
      const state = newBuild(ref),
        ownedCar = owned.cars.find((c) => c.id === car);
      if (ownedCar) {
        state.baseConfiguration = sanitizeVehicle(ownedCar.configuration);
        state.targetConfiguration = { ...state.baseConfiguration };
        state.title = ownedCar.nickname + " · build";
      }
      const p = await createProject(state, car || null);
      track("build_create", "/workshop");
      location.assign(seriesHref(projectPath(p.id), seriesForModel(state.reference.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create build.");
    } finally {
      setCreating(false);
    }
  }
  if (!user || user.is_anonymous)
    return (
      <section className="build-list" id="builds">
        <h2>Build Studio</h2>
        <p>
          Plan a build, compare parts and keep alternatives for your garage cars.
        </p>
        <DocumentLink className="button primary" href="/account">
          Sign in to save a build
        </DocumentLink>
      </section>
    );
  return (
    <section className="build-list" id="builds">
      <header>
        <div>
          <span className="eyebrow">MY GARAGE</span>
          <h2>My builds</h2>
          <p>
            Plans stay separate from your installed car and any published build.
          </p>
        </div>
        <DocumentLink href="/builds" className="text-link">
          Community builds ↗
        </DocumentLink>
      </header>
      <details className="build-add" open={!rows.length}>
        <summary>Start a build</summary>
        <div className="form-grid">
          <label>
            Starting point
            <select value={car} onChange={(e) => { setCar(e.target.value); setRef(null); }}>
              <option value="">Conceptual / factory reference</option>
              {owned.cars.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.nickname}
                </option>
              ))}
            </select>
          </label>
          <label>
            3D reference
            <select value={ref} onChange={(e) => setRef(e.target.value)}>
              {references.map((r) => (
                <option value={r.id} key={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="small muted">
          Choose the nearest illustrated reference. Different or modified
          hardware remains part of your plan; it won’t be shown as an exact
          model.
        </p>
        <button
          className="button primary"
          disabled={creating || !!owned.error}
          onClick={() => void create()}
        >
          {creating ? "Creating…" : "Create build"}
        </button>
        {owned.error && <p>{owned.error}</p>}
      </details>
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            className="text-link"
            onClick={() => setRevision((n) => n + 1)}
          >
            Retry
          </button>
        </p>
      )}
      <label>
        Project status
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          {["all", "draft", "active", "completed", "archived"].map((v) => (
            <option key={v} value={v}>
              {v === "all" ? "All builds" : v}
            </option>
          ))}
        </select>
      </label>
      {loading ? (
        <p role="status">Loading your builds…</p>
      ) : (
        <div className="build-card-grid">
          {rows
            .filter((p) => filter === "all" || p.lifecycle === filter)
            .map((p) => (
              <article className="build-card" key={p.id}>
                <span
                  className="build-color"
                  style={{
                    background: p.paint.enabled
                      ? p.paint.color
                      : "#e1e3dd",
                  }}
                />
                <div>
                  <small>
                    {p.lifecycle} · {p.model} ·
                    revision {p.version}
                  </small>
                  <h3>
                    <DocumentLink href={projectPath(p.id)} series={seriesForModel(p.referenceId)}>
                      {p.title} ↗
                    </DocumentLink>
                  </h3>
                  <p className="small">
                    {p.vehicle_id
                      ? owned.cars.find((c) => c.id === p.vehicle_id)
                          ?.nickname || "Linked garage car"
                      : "Conceptual build"}
                  </p>
                  <button
                    className="text-link"
                    disabled={creating}
                    onClick={async () => {
                      setCreating(true);
                      try {
                        const copy = await createProject(
                          duplicateState((await loadProject(p.id)).state),
                          p.vehicle_id,
                        );
                        location.assign(seriesHref(projectPath(copy.id), seriesForModel(p.referenceId)));
                      } catch (e) {
                        toast(
                          e instanceof Error
                            ? e.message
                            : "Could not duplicate build.",
                        );
                      } finally {
                        setCreating(false);
                      }
                    }}
                  >
                    Duplicate
                  </button>
                </div>
              </article>
            ))}
        </div>
      )}
    </section>
  );
}
