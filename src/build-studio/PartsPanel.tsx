"use client";
import { useApp } from "../components/context";
import { modelKey, seriesForModel } from "../series/registry";
import { DocumentLink } from "../components/DocumentLink";
import {
  pinBuildGuide,
  buildGuideIdentity,
  buildGuideHref,
  buildServiceGuide,
} from "./guide-reference";
import { track } from "../analytics/client";
import { useEffect, useState } from "react";
import { db } from "../lib/supabase";
import { CatalogPartField } from "../components/CatalogPartField";
import { PartCompatibility } from "../components/PartCompatibility";
import { manualGuides } from "../data/manual";
import { serviceApplicability } from "../servicing/service";
import { buildCompatibility } from "./compatibility";
import type { FitmentEvidence } from "../domain/fitment";
import { formatPartNumber } from "../domain/fitment";
import {
  buildSystems,
  workStages,
  newComponent,
  componentSchema,
  type BuildComponent,
  type BuildState,
} from "./schema";
import { dependencyTasks } from "./dependencies";
import { useVehicleCatalog } from "../lib/use-vehicle-catalog";
import { preferredCatalogContext } from "../domain/catalog";
type Props = {
  state: BuildState;
  edit: (change: (s: BuildState) => BuildState) => void;
};
export function Compatibility({
  component,
  vehicle,
}: {
  component: BuildComponent;
  vehicle: BuildState["targetConfiguration"];
}) {
  const { series } = useApp();
  const [data, setData] = useState<{
    key: string;
    rows: FitmentEvidence[];
    error: boolean;
  } | null>(null);
  const key = component.partId || "";
  useEffect(() => {
    if (!key) return;
    let live = true;
    const abort = new AbortController();
    db.from("part_fitments")
      .select(
        "id,model_id,engine,market,body,production_from,production_to,status,conditions",
      )
      .eq("part_id", key)
      .limit(300)
      .abortSignal(AbortSignal.any([abort.signal, AbortSignal.timeout(12000)]))
      .then(({ data, error }) => {
        if (live) {
          setData({ key, rows: data || [], error: !!error });
          track("build_compatibility", "/workshop");
        }
      });
    return () => {
      live = false;
      abort.abort();
    };
  }, [key]);
  const result = buildCompatibility(
    component,
    { ...vehicle, model: vehicle.model ? modelKey(series, vehicle.model) : "" },
    data?.key === key ? data.rows.filter(row => row.model_id ? seriesForModel(row.model_id) === series : series === "e34") : [],
  );
  return (
    <div className={"build-compatibility " + result.status}>
      <strong>{result.label}</strong>
      {key && data?.key !== key ? (
        <p role="status">Loading catalog evidence…</p>
      ) : (
        <ul>
          {result.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {data?.key === key && data.error && (
        <p>Evidence could not load. Retry before relying on the result.</p>
      )}
      {component.partId && (
        <div className="build-source-evidence">
          <PartCompatibility
            partId={component.partId}
            vehicleOverride={vehicle}
          />
        </div>
      )}
    </div>
  );
}
export function PartsPanel({ state, edit }: Props) {
  const [draft, setDraft] = useState<BuildComponent>(() => newComponent()),
    [search, setSearch] = useState("");
  const { rows } = useVehicleCatalog();
  const contextId = preferredCatalogContext(rows, state.targetConfiguration)?.id;
  function findAccessory(query: string, system: BuildComponent["system"]) {
    setSearch(query);
    setDraft(d => ({ ...d, kind: "oem", system, partId: null, number: null, manufacturer: "", productCode: "" }));
  }
  const update = (id: string, patch: Partial<BuildComponent>) =>
    edit((s) => {
      s.components = s.components.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      );
      return s;
    });
  const requiredChecks=dependencyTasks(draft).length;
  const taskLimit=state.tasks.length+requiredChecks>300;
  return (
    <section className="build-fields">
      <h2>Parts & modifications</h2>
      <p className="small muted">
        Mechanical selections are a plan. Only supported appearance changes are
        visible on the model.
      </p>
      <details className="build-add" open={!state.components.length}>
        <summary>Add a component</summary>
        <fieldset>
          <legend>Find factory accessories</legend>
          <div className="inline-tags">
            <button type="button" className="button outline" onClick={() => findAccessory("seat heating", "interior")}>Heated seats</button>
            <button type="button" className="button outline" onClick={() => findAccessory("spoiler", "body")}>Spoilers</button>
            <button type="button" className="button outline" onClick={() => findAccessory("antenna OR aerial", "electrical")}>Radio &amp; antennas</button>
          </div>
        </fieldset>
        <div className="form-grid">
          <label>
            System
            <select
              value={draft.system}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  system: e.target.value as BuildComponent["system"],
                }))
              }
            >
              {buildSystems.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Identity
            <select
              value={draft.kind}
              onChange={(e) => {
                setDraft((d) => ({
                  ...d,
                  kind: e.target.value as BuildComponent["kind"],
                  partId: null,
                  number: null,
                  manufacturer: "",
                  productCode: "",
                }));
                setSearch("");
              }}
            >
              <option value="custom">Custom / research item</option>
              <option value="oem">BMW catalog part</option>
              <option value="aftermarket">Aftermarket product</option>
            </select>
          </label>
        </div>
        {draft.kind === "oem" ? (
          <CatalogPartField
            catalogOnly
            contextId={contextId}
            value={search}
            selected={
              draft.partId
                ? {
                    id: draft.partId,
                    name: draft.name,
                    number_normalized: draft.number,
                  }
                : null
            }
            onChange={(v) => {
              setSearch(v);
              setDraft((d) => ({ ...d, partId: null, number: null }));
            }}
            onSelect={(p) => {
              if (p.number_normalized)
                setDraft((d) => ({
                  ...d,
                  name: p.name.slice(0, 160),
                  partId: p.id,
                  number: p.number_normalized,
                }));
            }}
          />
        ) : (
          <>
            <label>
              Component name
              <input
                maxLength={160}
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </label>
            <div className="form-grid">
              <label>
                Manufacturer
                {draft.kind === "aftermarket" ? " (required)" : " (optional)"}
                <input
                  maxLength={100}
                  value={draft.manufacturer}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, manufacturer: e.target.value }))
                  }
                />
              </label>
              <label>
                Product / SKU
                <input
                  maxLength={100}
                  value={draft.productCode}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, productCode: e.target.value }))
                  }
                />
              </label>
            </div>
          </>
        )}
        <button
          className="button primary"
          disabled={
            !componentSchema.safeParse(draft).success ||
            state.components.length >= 150 || taskLimit
          }
          onClick={() => {
            edit((s) => {
              s.components.push(draft);
              s.tasks.push(
                ...dependencyTasks(draft),
              );
              return s;
            });
            setDraft(newComponent(draft.system));
            setSearch("");
          }}
        >
          Add to build & create checks
        </button>
        {taskLimit&&<p role="status">This component needs {requiredChecks} checks. Remove unused tasks before adding it; each build can hold 300 tasks.</p>}
        {state.components.length>=150&&<p role="status">This build has reached its 150-part limit. Remove an unused component to add another.</p>}
      </details>
      {state.components.map((c) => (
        <article className="build-component" key={c.id}>
          <header>
            <div>
              <span className="eyebrow">
                {c.system} · {c.kind}
              </span>
              <h3>{c.name}</h3>
              {c.number && (
                <DocumentLink
                  href={
                    "/parts/catalog?part=" + encodeURIComponent(c.partId || "")
                  }
                >
                  {formatPartNumber(c.number)} ↗
                </DocumentLink>
              )}
              {c.manufacturer && (
                <p className="small">
                  {c.manufacturer} · {c.productCode}
                </p>
              )}
            </div>
            <button
              className="text-link"
              onClick={() =>
                edit((s) => {
                  const taskIds = s.tasks
                    .filter((t) => t.componentId === c.id)
                    .map((t) => t.id);
                  s.components = s.components.filter((x) => x.id !== c.id);
                  s.tasks = s.tasks
                    .filter((t) => t.componentId !== c.id)
                    .map((t) => ({
                      ...t,
                      dependencies: t.dependencies.filter(
                        (id) => !taskIds.includes(id),
                      ),
                    }));
                  return s;
                })
              }
            >
              Remove
            </button>
          </header>
          <label>
            Component progress
            <select
              value={c.stage}
              onChange={(e) =>
                update(c.id, {
                  stage: e.target.value as BuildComponent["stage"],
                })
              }
            >
              {workStages.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Quantity
              <input
                type="number"
                min={1}
                max={1000}
                value={c.quantity}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 1 && n <= 1000)
                    update(c.id, { quantity: Math.floor(n) });
                }}
              />
            </label>
            <label>
              Fabrication
              <select
                value={c.fabrication}
                onChange={(e) =>
                  update(c.id, {
                    fabrication: e.target
                      .value as BuildComponent["fabrication"],
                  })
                }
              >
                <option value="unknown">Not established</option>
                <option value="required">Required · owner report</option>
                <option value="none-documented">
                  None documented · verify interfaces
                </option>
              </select>
            </label>
          </div>
          <Compatibility component={c} vehicle={state.targetConfiguration} />
          {c.system === "wheels" && (
            <fieldset>
              <legend>Actual wheel specifications · owner entered</legend>
              {!c.wheelFitment ? (
                <button
                  className="button outline"
                  onClick={() =>
                    update(c.id, {
                      wheelFitment: {
                        diameterIn: null,
                        widthIn: null,
                        offsetMm: null,
                        centerBoreMm: null,
                        boltPattern: "",
                        brakeClearanceConfirmed: false,
                      },
                    })
                  }
                >
                  Record wheel dimensions
                </button>
              ) : (
                <>
                  <div className="form-grid">
                    {(
                      [
                        "diameterIn",
                        "widthIn",
                        "offsetMm",
                        "centerBoreMm",
                      ] as const
                    ).map((key) => (
                      <label key={key}>
                        {
                          {
                            diameterIn: "Diameter (in)",
                            widthIn: "Width (in)",
                            offsetMm: "Offset (mm)",
                            centerBoreMm: "Center bore (mm)",
                          }[key]
                        }
                        <input
                          type="number"
                          step="0.1"
                          value={c.wheelFitment?.[key] ?? ""}
                          onChange={(e) =>
                            update(c.id, {
                              wheelFitment: {
                                ...c.wheelFitment!,
                                [key]:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    Bolt pattern
                    <input
                      maxLength={30}
                      value={c.wheelFitment.boltPattern}
                      onChange={(e) =>
                        update(c.id, {
                          wheelFitment: {
                            ...c.wheelFitment!,
                            boltPattern: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                </>
              )}
            </fieldset>
          )}
          <label>
            Linked walkthrough
            <select
              value={c.guideIds[0] ? buildGuideIdentity(c.guideIds[0]).id : ""}
              onChange={(e) =>
                update(c.id, {
                  guideIds: e.target.value
                    ? [pinBuildGuide(e.target.value)]
                    : [],
                })
              }
            >
              <option value="">Choose a reference</option>
              {manualGuides.map((g) => (
                <option value={g.slug} key={g.slug}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
          {c.guideIds.map((id) => {
            const g = buildServiceGuide(id);
            return g ? (
              <div key={id} className="build-guide">
                <DocumentLink href={buildGuideHref(id)}>
                  {g.guide.title} ↗
                </DocumentLink>
                <p className="small">
                  {g.guide.duration} · {g.guide.durationBasis}
                </p>
                <p className="small">
                  {
                    serviceApplicability(g.guide, state.targetConfiguration)
                      .message
                  }
                </p>
                <p className="small">
                  Tools: {g.tools.map((t) => t.name).join("; ")}
                </p>
                <small>
                  Source: {g.guide.source.section} · revision {g.revision}
                </small>
              </div>
            ) : (
              <p key={id}>
                This procedure revision is no longer current.{" "}
                <DocumentLink href={buildGuideHref(id)}>
                  Open the saved procedure and tool list ↗
                </DocumentLink>
              </p>
            );
          })}
          <label>
            Private component notes
            <textarea
              rows={3}
              maxLength={4000}
              value={c.privateNotes}
              onChange={(e) => update(c.id, { privateNotes: e.target.value })}
            />
          </label>
          <label>
            Public component notes
            <textarea
              rows={2}
              maxLength={1000}
              value={c.publicNotes}
              onChange={(e) => update(c.id, { publicNotes: e.target.value })}
            />
          </label>
        </article>
      ))}
      {!state.components.length && (
        <p>
          No components selected yet. Start with a catalog part or a custom
          research item.
        </p>
      )}
    </section>
  );
}
