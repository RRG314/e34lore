"use client";
import { useKeyedResource } from "../hooks/use-keyed-resource";
import { useScopedState } from "../hooks/use-scoped-state";
import { DocumentLink } from "../components/DocumentLink";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronRight, Download, Save, Undo2, Redo2, Eye, Wrench, Search, ArrowUpRight } from "lucide-react";
import { db, useApp } from "../components/context";
import { AssemblyModel } from "../components/AssemblyModel";
import { VehicleScene } from "../components/VehicleScene";
import { PageIntro, Notice } from "../components/common";
import { parts } from "../data/catalog";
import { downloadJSON } from "../lib/download";
import { initialTwinGraph } from "./reference-configuration";
import { createWorkshop, validateGraph, removalBlockers, removeNode, restoreNode, changeViewState, undoWorkshop, redoWorkshop, descendants, changeWorkshopMode } from "./graph";
import { parseWorkshop } from "./validation";
import type { TwinGraph, WorkshopState, AssemblyNode } from "./types";
import { nominalSealForPart, referenceModelForPart } from "./model-registry";
import { SourceCatalog } from "./SourceCatalog";
import { AssetWorkspace } from "./assets/AssetWorkspace";
import { RelatedDiscussions } from "../components/RelatedDiscussions";
const initialRevision = "e34-525i-m50-workshop:reference-3";
export function Workshop({
  initialPart,
  initialNode,
  initialRevisionId,
  assets = false,
  readOnly = false,
}: {
  initialPart?: string;
  initialNode?: string;
  initialRevisionId?: string;
  assets?: boolean;
  readOnly?: boolean;
}) {
  const { user, toast } = useApp();
  function initialView(){const state=createWorkshop(initialTwinGraph),node=initialTwinGraph.nodes.find(n=>initialNode?n.id===initialNode:initialPart&&n.partId===initialPart);return node?changeViewState(state,{selected:node.id}):state;}
  const [graph, setGraph] = useState<TwinGraph>(initialTwinGraph),
    [revisionId, setRevisionId] = useState(initialRevision),
    [state, setState] = useState(initialView),
    [search, setSearch] = useState(""),
    [localError, setError] = useState(""),
    [sessionRevision,setSessionRevision]=useState(0),
    [sessionId, setSessionId] = useState(""),
    [savedAt, setSavedAt] = useState(""),
    [busy, setBusy] = useState(false),
    [label, setLabel] = useState("525i inspection"),
    [configurations, setConfigurations] = useState<{id:string;configuration_id:string;revision:number;graph:TwinGraph}[]>([]),
    [currentStep, setCurrentStep] = useState(-1),
    [expandedState, setExpanded] = useState<string[]>([
      "vehicle",
      "cooling",
      "pump-reference",
    ]);
  type Session={id:string;label:string;configuration_revision_id:string;updated_at:string};
  const sessionResource=useKeyedResource<Session[]>(JSON.stringify([user?.id,sessionRevision]),async signal=>{const r=await db.from('user_workshop_sessions').select('id,label,configuration_revision_id,updated_at').eq('user_id',user!.id).order('updated_at',{ascending:false}).limit(100).abortSignal(signal);if(r.error)throw r.error;return r.data||[];},{enabled:!!user,failureMessage:'Saved workshop sessions could not load.'});
  const sessions=sessionResource.data||[],error=localError||sessionResource.error;
  const refreshSessions=useCallback(async()=>setSessionRevision(n=>n+1),[]);
  useEffect(() => {
    let active = true;
    db.from("digital_twin_configuration_revisions")
      .select("id,configuration_id,revision,graph")
      .eq("publication_status", "published")
      .order("created_at", { ascending: false })
      .then((r) => {
        if (!active) return;
        if (r.error) {
          setError(
            "The configuration service is unavailable. The bundled reference remains usable.",
          );
          return;
        }
        setConfigurations(r.data || []);
        const selected = (r.data || []).find(
          (x) => x.id === (initialRevisionId || initialRevision),
        );
        if (initialRevisionId && !selected)
          setError(
            "The requested reference revision is unavailable. The bundled reference remains usable.",
          );
        if (selected) {
          try {
            if (validateGraph(selected.graph).length)
              throw Error("Invalid graph");
            setGraph(selected.graph);
            if (initialRevisionId) {
              setRevisionId(selected.id);
              let restored = createWorkshop(selected.graph);
              const focus = selected.graph.nodes.find((n: AssemblyNode) =>
                initialNode
                  ? n.id === initialNode
                  : initialPart && n.partId === initialPart,
              );
              if (focus)
                restored = changeViewState(restored, { selected: focus.id });
              setState(restored);
            }
          } catch {
            setError("The saved configuration did not pass validation.");
          }
        }
      });
    return () => {
      active = false;
    };
  }, [initialRevisionId, initialNode, initialPart]);

  const selected =
    graph.nodes.find((n) => n.id === state.present.selected) || graph.nodes[0];
  const model = useMemo(() => {
    if (selected.partId) {
      const direct = referenceModelForPart(selected.partId);
      if (direct?.assembly.startsWith("nominal-seal:")) return direct.assembly;
    }
    let n: AssemblyNode | undefined = selected;
    while (n) {
      const geometry = graph.geometry.find(
        (g) => g.id === n?.geometryRevisionId,
      );
      if (geometry?.format === "procedural")
        return geometry.assetId.replace("reference:", "");
      n = graph.nodes.find((x) => x.id === n?.parentId);
    }
    return selected.partId
      ? referenceModelForPart(selected.partId)?.assembly
      : undefined;
  }, [selected, graph]);
  const select = useCallback((id: string) => {
    setState((s) => changeViewState(s, { selected: id }));
    setError("");
  }, []);
  const selectPart = useCallback(
    (partId: string) => {
      const n =
        graph.nodes.find(
          (n) =>
            n.partId === partId && (!model || n.parentId === selected.parentId),
        ) || graph.nodes.find((n) => n.partId === partId);
      if (n) select(n.id);
    },
    [graph, model, selected.parentId, select],
  );
  const ancestors=useMemo(()=>{let node=graph.nodes.find(n=>n.id===state.present.selected);const ids:string[]=[];while(node?.parentId){ids.push(node.parentId);node=graph.nodes.find(n=>n.id===node!.parentId);}return ids;},[state.present.selected,graph]);
  const [collapsed,setCollapsed]=useScopedState<string[]|null>(JSON.stringify([graph.id,graph.revision,state.present.selected]),null);
  const expanded=[...new Set([...expandedState,...ancestors])].filter(id=>!collapsed?.includes(id));
  function toggleExpanded(id:string){const close=expanded.includes(id);setExpanded(old=>close?old.filter(x=>x!==id):[...old,id]);setCollapsed(old=>close?[...old||[],id]:(old||[]).filter(x=>x!==id));}
  const disabledNodes = [
    ...new Set(
      [...state.present.hidden, ...state.present.removed].flatMap((id) =>
        descendants(graph, id),
      ),
    ),
  ];
  const hiddenPartIds = graph.nodes
    .filter((n) => disabledNodes.includes(n.id) && n.partId)
    .map((n) => n.partId!);
  const blockers = removalBlockers(graph, state, selected.id);
  function action(fn: () => WorkshopState) {
    try {
      setState(fn());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function loadSession(id: string) {
    setBusy(true);
    try {
      const row = await db
        .from("user_workshop_sessions")
        .select("*")
        .eq("id", id)
        .single();
      if (row.error) throw row.error;
      const revision = await db
        .from("digital_twin_configuration_revisions")
        .select("id,graph")
        .eq("id", row.data.configuration_revision_id)
        .single();
      if (revision.error) throw revision.error;
      if (validateGraph(revision.data.graph).length)
        throw Error("Saved configuration is invalid");
      const parsed = parseWorkshop(row.data.state, revision.data.graph);
      setGraph(revision.data.graph);
      setRevisionId(revision.data.id);
      setState(parsed);
      setSessionId(id);
      setLabel(row.data.label);
      setSavedAt(row.data.updated_at);
      setError("");
      toast("Workshop restored.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!user) {
      toast(
        "Sign in to save workshop sessions. Your earlier private sessions remain available here.",
      );
      return;
    }
    setBusy(true);
    try {
      parseWorkshop(state, graph);
      let result;
      if (sessionId) {
        result = await db
          .from("user_workshop_sessions")
          .update({ state, label })
          .eq("id", sessionId)
          .eq("updated_at", savedAt)
          .select("id,updated_at")
          .maybeSingle();
        if (!result.error && !result.data)
          throw Error(
            "This session changed elsewhere. Reload it or save a new session.",
          );
      } else
        result = await db
          .from("user_workshop_sessions")
          .insert({
            user_id: user.id,
            configuration_id: graph.configuration.id,
            configuration_revision_id: revisionId,
            label,
            state,
          })
          .select("id,updated_at")
          .single();
      if (result.error) throw result.error;
      setSessionId(result.data!.id);
      setSavedAt(result.data!.updated_at);
      await refreshSessions();
      toast("Private workshop session saved.");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function switchConfiguration(id: string) {
    const config = configurations.find((c) => c.id === id);
    if (!config) return;
    try {
      const s = createWorkshop(config.graph);
      setGraph(config.graph);
      setRevisionId(id);
      setState(s);
      setSessionId("");
      setSavedAt("");
      setCurrentStep(-1);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const counts = {
    nodes: graph.nodes.length,
    modeled: graph.nodes.filter(
      (n) =>
        n.geometryRevisionId || (n.partId && referenceModelForPart(n.partId)),
    ).length,
    verified: graph.nodes.filter((n) => n.accuracy.dimensions === "verified")
      .length,
  };
  if (assets) return <AssetWorkspace graph={graph} revisionId={revisionId} />;
  return (
    <div className="page twin-page">
      <PageIntro
        eyebrow="BMW E34 / ASSEMBLY REFERENCE"
        title="Vehicle workshop."
        description="Vehicle structure, source drawings and component inspection."
      />
      <div className="twin-heading">
        <label>
          Reference configuration
          <select
            aria-label="Workshop configuration"
            value={revisionId}
            onChange={(e) => switchConfiguration(e.target.value)}
          >
            {configurations.length ? (
              configurations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.graph.configuration.referenceYear}{" "}
                  {c.graph.configuration.modelId} ·{" "}
                  {c.graph.configuration.engineFamily} · {c.revision}
                </option>
              ))
            ) : (
              <option value={initialRevision}>
                1995 525i · M50 family · reference-3
              </option>
            )}
          </select>
        </label>

      </div>
      <Notice>
        Visual reference models. Engine internals and installed geometry are
        incomplete. Checked removal requires a reviewed procedure; the manual
        sequence below is for planning.
      </Notice>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="twin-workspace">
        <aside className="twin-tree">
          <div className="twin-panel-title">
            <h2>Vehicle structure</h2>
            <span>{counts.nodes} records</span>
          </div>
          <label className="twin-search">
            <Search size={16} />
            <input
              aria-label="Find a workshop component"
              placeholder="Find component or number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div
            className="twin-node-list"
            role="tree"
            aria-label="Vehicle components"
          >
            {(() => {
              const ordered: AssemblyNode[] = [];
              function walk(id: string) {
                const n = graph.nodes.find((x) => x.id === id);
                if (!n) return;
                ordered.push(n);
                for (const c of graph.nodes.filter((x) => x.parentId === id))
                  walk(c.id);
              }
              walk(graph.configuration.rootNodeId);
              return ordered
                .filter((n) => {
                  if (search)
                    return [
                      n.name,
                      n.partId,
                      parts.find((p) => p.id === n.partId)?.number,
                    ]
                      .join(" ")
                      .toLowerCase()
                      .includes(search.toLowerCase());
                  let p = n.parentId;
                  while (p) {
                    if (!expanded.includes(p)) return false;
                    p = graph.nodes.find((x) => x.id === p)?.parentId || null;
                  }
                  return true;
                })
                .map((n) => {
                  let depth = 0,
                    parent = n.parentId;
                  while (parent) {
                    depth++;
                    parent =
                      graph.nodes.find((p) => p.id === parent)?.parentId ||
                      null;
                  }
                  const children = graph.nodes.some((x) => x.parentId === n.id);
                  return (
                    <div
                      className="twin-tree-row"
                      key={n.id}
                      style={{ paddingLeft: 8 + depth * 10 }}
                    >
                      {children ? (
                        <button
                          className="twin-expand"
                          aria-label={
                            (expanded.includes(n.id)
                              ? "Collapse "
                              : "Expand ") + n.name
                          }
                          aria-expanded={expanded.includes(n.id)}
                          onClick={()=>toggleExpanded(n.id)}
                        >
                          <ChevronRight
                            size={13}
                            style={{
                              transform: expanded.includes(n.id)
                                ? "rotate(90deg)"
                                : "",
                            }}
                          />
                        </button>
                      ) : (
                        <span className="twin-tree-spacer" />
                      )}
                      <button
                        role="treeitem"
                        aria-level={depth + 1}
                        aria-selected={n.id === selected.id}
                        className={n.id === selected.id ? "selected" : ""}
                        onClick={() => select(n.id)}
                      >
                        <span>{n.name}</span>
                        <i
                          className={
                            n.geometryRevisionId ||
                            (n.partId && referenceModelForPart(n.partId))
                              ? "has-geometry"
                              : ""
                          }
                          title={
                            n.geometryRevisionId ||
                            (n.partId && referenceModelForPart(n.partId))
                              ? "Reference geometry"
                              : "Geometry pending"
                          }
                        />
                        {state.present.removed.includes(n.id) && (
                          <small>removed</small>
                        )}
                      </button>
                    </div>
                  );
                });
            })()}
          </div>
        </aside>
        <section className="twin-inspection">
          <div className="twin-panel-title">
            <div>
              <span className="eyebrow">
                {model?.startsWith("nominal-seal:")
                  ? "ISOLATED NOMINAL MODEL"
                  : model
                    ? "ISOLATED RELATIONSHIP MODEL"
                    : "REFERENCE CONFIGURATION"}
              </span>
              <h2>{selected.name}</h2>
            </div>
            <span>{state.present.removed.length} removed</span>
          </div>
          {model ? (
            <AssemblyModel
              key={model}
              assembly={model}
              selected={selected.partId || ""}
              onSelect={selectPart}
              workshop={{
                hiddenPartIds,
                removedPartIds: [],
                explosion: state.present.explosion,
                onExplosion: (v) =>
                  setState((s) => changeViewState(s, { explosion: v })),
              }}
            />
          ) : selected.id === "vehicle" ||
            selected.id === "body-shell" ||
            selected.id === "exterior" ? (
            <VehicleScene
              onNode={select}
              visibility={{
                body: !disabledNodes.includes("body-shell"),
                wheels: !disabledNodes.includes("wheels"),
              }}
              onAssembly={(id) =>
                select(
                  graph.nodes.find(
                    (n) => n.geometryRevisionId === id + "-reference-r1",
                  )?.id || "cooling",
                )
              }
            />
          ) : (
            <div className="twin-missing">
              <span className="eyebrow">GEOMETRY NOT YET AVAILABLE</span>
              <h3>{selected.name}</h3>
              <p>
                The source catalog can identify the components. A model needs
                licensed source geometry or measured reconstruction before it
                can be placed here.
              </p>
              <a
                className="button"
                href={"/parts/catalog?q=" + encodeURIComponent(selected.name)}
              >
                Open parts and drawings <ArrowUpRight size={16} />
              </a>
              <a
                className="text-link"
                href={
                  "/workshop/assets?node=" + encodeURIComponent(selected.id)
                }
              >
                View reconstruction requirements
              </a>
            </div>
          )}
          {!readOnly && (
          <div className="twin-actions">
            <label>
              Interaction mode
              <select
                aria-label="Workshop interaction mode"
                value={state.mode}
                onChange={(e) =>
                  action(() =>
                    changeWorkshopMode(
                      graph,
                      state,
                      e.target.value as WorkshopState["mode"],
                    ),
                  )
                }
              >
                <option value="explore">Free exploration</option>
                <option value="constrained">Checked removal order</option>
              </select>
            </label>
            <button
              className="button"
              disabled={!selected.parentId}
              onClick={() =>
                action(() =>
                  state.present.removed.includes(selected.id)
                    ? restoreNode(graph, state, selected.id)
                    : removeNode(graph, state, selected.id),
                )
              }
            >
              <Wrench size={16} />
              {state.present.removed.includes(selected.id)
                ? "Reinstall"
                : "Remove virtually"}
            </button>
            <button
              className="button"
              onClick={() =>
                setState((s) =>
                  changeViewState(s, {
                    hidden: s.present.hidden.includes(selected.id)
                      ? s.present.hidden.filter((x) => x !== selected.id)
                      : [...s.present.hidden, selected.id],
                  }),
                )
              }
            >
              <Eye size={16} />
              {state.present.hidden.includes(selected.id) ? "Show" : "Hide"}
            </button>
            <button
              className="icon-button"
              aria-label="Undo workshop action"
              disabled={!state.past.length}
              onClick={() => setState(undoWorkshop)}
            >
              <Undo2 size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Redo workshop action"
              disabled={!state.future.length}
              onClick={() => setState(redoWorkshop)}
            >
              <Redo2 size={18} />
            </button>
          </div>
          )}
          {state.mode === "constrained" && blockers.length > 0 && (
            <div className="twin-blockers">
              <strong>Removal prerequisites</strong>
              {blockers.map((b, i) => (
                <button key={i} onClick={() => select(b.nodeId)}>
                  {b.message}
                </button>
              ))}
            </div>
          )}
          <div className="twin-evidence">
            <h3>Source and geometry record</h3>
            <div className="twin-accuracy">
              {Object.entries(selected.accuracy).map(([axis, status]) => (
                <span key={axis}>
                  {axis}
                  <strong>{status.replaceAll("-", " ")}</strong>
                </span>
              ))}
            </div>
            <ul>
              {selected.missingEvidence.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            {selected.partId === "pump-seal" && (
              <div className="twin-measurement">
                <h4>Coolant-pump O-ring geometry</h4>
                <p>
                  The catalog lists 68 × 5 mm. The nominal model interprets that
                  as a 68 mm inside diameter and a 5 mm section. Both published
                  meshes measure 78 mm across the outside and 5 mm through the
                  section.
                </p>
                <p>
                  Installed groove dimensions, seal compression, tolerance and
                  material still need physical evidence.
                </p>
                <a href={nominalSealForPart("pump-seal")?.evidence[0].sourceUrl}>Catalog dimension and part number <ArrowUpRight size={14} /></a>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- The workshop needs a full document navigation under Vinext. */}
                <a href="/guides/m50-water-pump-job-planning">Pump extraction and seal installation <ArrowUpRight size={14} /></a>
              </div>
            )}
            <div className="twin-link-row">
              {selected.partId && (
                <>
                  <a
                    href={
                      "/parts/catalog?part=" +
                      encodeURIComponent(selected.partId)
                    }
                  >
                    Part number & catalog conditions <ArrowUpRight size={15} />
                  </a>
                  <a
                    href={
                      "/community/new?" +
                      new URLSearchParams({
                        part: selected.partId,
                        node: selected.id,
                        configuration_revision: revisionId,
                      }).toString()
                    }
                  >
                    Discuss this part <ArrowUpRight size={15} />
                  </a>
                </>
              )}
              {selected.guideIds.map((g) => (
                <a key={g} href={"/guides/" + g}>
                  Service reference <ArrowUpRight size={15} />
                </a>
              ))}
              <DocumentLink href="/resources">
                Source library <ArrowUpRight size={15} />
              </DocumentLink>
            </div>
            <RelatedDiscussions
              kind="node"
              id={selected.id}
              revision={revisionId}
            />
            {graph.dependencies.filter((d) => d.target === selected.id).length >
              0 && (
              <>
                <h4>Documented access dependencies</h4>
                {graph.dependencies
                  .filter((d) => d.target === selected.id)
                  .map((d) => (
                    <button
                      className="twin-dependency"
                      key={d.id}
                      onClick={() => select(d.prerequisite)}
                    >
                      {d.reason}
                      <small>
                        {d.evidence.map((e) => e.locator).join(" · ")}
                      </small>
                    </button>
                  ))}
              </>
            )}
          </div>
        </section>
      </div>
      <SourceCatalog
        area={(() => {
          let n = selected;
          while (n.parentId && n.parentId !== "vehicle")
            n = graph.nodes.find((x) => x.id === n.parentId)!;
          return n.id;
        })()}
      />
      <div className="twin-bottom">
        <section className="twin-procedure">
          <span className="eyebrow">MANUAL-LINKED ACCESS PLANNING</span>
          <h2>M50 coolant pump</h2>
          <p>
            Review the sequence alongside the written planning guide. These
            steps do not authorize a complete replacement procedure.
          </p>
          {graph.repairSteps.map((step, i) => (
            <button
              className={currentStep === i ? "selected" : ""}
              key={step.id}
              onClick={() => {
                setCurrentStep(i);
                select(
                  step.nodeIds.find(
                    (id) => graph.nodes.find((n) => n.id === id)?.partId,
                  ) || step.nodeIds[0],
                );
              }}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                {step.title}
                <small>{step.evidence.map((e) => e.locator).join(" · ")}</small>
              </div>
              <ChevronRight size={16} />
            </button>
          ))}
          <DocumentLink href="/guides/m50-water-pump-job-planning" className="button">
            Open written planning guide <ArrowUpRight size={16} />
          </DocumentLink>
        </section>
        {!readOnly && (
        <section className="twin-sessions">
          <span className="eyebrow">WORKSHOP PROGRESS</span>
          <h2>Save your inspection</h2>
          <label>
            Session name
            <input
              value={label}
              maxLength={100}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <div className="twin-link-row">
            <button
              className="button primary"
              disabled={busy || !label.trim()}
              onClick={save}
            >
              <Save size={16} />
              {sessionId ? "Update session" : "Save private session"}
            </button>
            <button
              className="button"
              onClick={() => {
                setSessionId("");
                setSavedAt("");
                toast("The next save will create a new session.");
              }}
            >
              Save as new
            </button>
          </div>
          {!user && (
            <p>
              <DocumentLink href="/account?next=/workshop">Sign in</DocumentLink> for private cloud
              sessions, or use a local workshop file.
            </p>
          )}
          {sessions.map((s) => (
            <div className="twin-saved-session" key={s.id}>
              <button disabled={busy} onClick={() => loadSession(s.id)}>
                {s.label}
                <small>{new Date(s.updated_at).toLocaleDateString()}</small>
              </button>
              <button
                aria-label={"Delete session " + s.label}
                disabled={busy}
                onClick={async () => {
                  const r = await db
                    .from("user_workshop_sessions")
                    .delete()
                    .eq("id", s.id);
                  if (r.error) setError(r.error.message);
                  else {
                    if (sessionId === s.id) {
                      setSessionId("");
                      setSavedAt("");
                    }
                    refreshSessions();
                  }
                }}
              >
                Delete
              </button>
            </div>
          ))}
          <div className="twin-link-row">
            <button
              className="text-link"
              onClick={() => downloadJSON(state, "e34-workshop.json")}
            >
              <Download size={16} />
              Export workshop file
            </button>
            <label className="twin-file">
              Restore file
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    if (f.size > 500000)
                      throw Error("Workshop file exceeds 500 KB.");
                    setState(parseWorkshop(JSON.parse(await f.text()), graph));
                    setSessionId("");
                    setSavedAt("");
                    setError("");
                    toast("Workshop file restored.");
                  } catch (err) {
                    setError((err as Error).message);
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </section>
        )}
      </div>
      <div className="twin-coverage">
        <strong>Coverage at this revision</strong>
        <span>{counts.nodes} structural/component records</span>
        <span>{counts.modeled} records linked to visual references</span>
        <span>{counts.verified} dimensionally verified components</span>
        <DocumentLink href="/workshop/assets">
          Sources, gaps and submissions <ArrowUpRight size={15} />
        </DocumentLink>
      </div>
    </div>
  );
}
