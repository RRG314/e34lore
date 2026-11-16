import type {
  TwinGraph,
  WorkshopSnapshot,
  WorkshopState,
  AssemblyNode,
} from "./types";
export type Blocker = { code: string; nodeId: string; message: string };
const reviewed = (state: string) =>
  state === "verified" || state === "source-checked";
export function validateGraph(graph: TwinGraph): string[] {
  const errors: string[] = [],
    nodes = new Map<string, AssemblyNode>();
  for (const n of graph.nodes) {
    if (nodes.has(n.id)) errors.push("Duplicate node: " + n.id);
    nodes.set(n.id, n);
    if (!n.configurationIds.includes(graph.configuration.id))
      errors.push("Missing configuration association: " + n.id);
    const t = n.transform;
    if (
      t.translation.length !== 3 ||
      t.rotation.length !== 4 ||
      t.scale.length !== 3 ||
      ![...t.translation, ...t.rotation, ...t.scale].every(Number.isFinite) ||
      t.scale.some((x) => x <= 0) ||
      Math.abs(Math.hypot(...t.rotation) - 1) > 0.0001
    )
      errors.push("Invalid transform: " + n.id);
  }
  const roots = graph.nodes.filter((n) => !n.parentId);
  if (roots.length !== 1 || roots[0]?.id !== graph.configuration.rootNodeId)
    errors.push("Exactly one declared root is required");
  for (const node of graph.nodes) {
    const seen = new Set<string>();
    let n: AssemblyNode | undefined = node;
    while (n) {
      if (seen.has(n.id)) {
        errors.push("Circular hierarchy: " + node.id);
        break;
      }
      seen.add(n.id);
      if (n.parentId && !nodes.has(n.parentId)) {
        errors.push("Missing parent: " + n.id);
        break;
      }
      n = n.parentId ? nodes.get(n.parentId) : undefined;
    }
    if (
      node.geometryRevisionId &&
      !graph.geometry.some((g) => g.id === node.geometryRevisionId)
    )
      errors.push("Missing geometry: " + node.id);
  }
  for (const collection of [
    graph.geometry,
    graph.dependencies,
    graph.connections,
    graph.removalPaths,
    graph.repairSteps,
  ]) {
    if (new Set(collection.map((x) => x.id)).size !== collection.length)
      errors.push("Duplicate relation or geometry identity");
  }
  const edges = new Map<string, string[]>();
  for (const d of graph.dependencies) {
    if (!nodes.has(d.target) || !nodes.has(d.prerequisite))
      errors.push("Broken dependency: " + d.id);
    if (d.target === d.prerequisite) errors.push("Self dependency: " + d.id);
    edges.set(d.target, [...(edges.get(d.target) || []), d.prerequisite]);
    if (reviewed(d.reviewState) && !d.evidence.length)
      errors.push("Dependency has no evidence: " + d.id);
  }
  const visiting = new Set<string>(),
    done = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) {
      errors.push("Circular disassembly dependency: " + id);
      return;
    }
    if (done.has(id)) return;
    visiting.add(id);
    for (const next of edges.get(id) || []) visit(next);
    visiting.delete(id);
    done.add(id);
  }
  for (const id of nodes.keys()) visit(id);
  for (const c of graph.connections) {
    if (!nodes.has(c.from) || !nodes.has(c.to))
      errors.push("Broken connection: " + c.id);
    if (c.point && !c.point.every(Number.isFinite))
      errors.push("Invalid connection point: " + c.id);
  }
  for (const p of graph.removalPaths) {
    if (!nodes.has(p.nodeId)) errors.push("Missing animation target: " + p.id);
    if (p.points.some((v) => v.length !== 3 || !v.every(Number.isFinite)))
      errors.push("Invalid removal path: " + p.id);
    if (
      p.kind === "documented" &&
      (!reviewed(p.reviewState) || !p.evidence.length)
    )
      errors.push("Unsubstantiated removal path: " + p.id);
  }
  for (const step of graph.repairSteps) {
    if ([...step.nodeIds, ...step.requiredRemoved].some((id) => !nodes.has(id)))
      errors.push("Broken repair scene step: " + step.id);
  }
  return [...new Set(errors)];
}
export function createWorkshop(graph: TwinGraph): WorkshopState {
  const errors = validateGraph(graph);
  if (errors.length) throw Error(errors.join("; "));
  return {
    schemaVersion: 1,
    graphId: graph.id,
    graphRevision: graph.revision,
    mode: "explore",
    present: {
      removed: [],
      hidden: [],
      detached: [],
      selected: graph.configuration.rootNodeId,
      explosion: 0,
    },
    past: [],
    future: [],
  };
}
export function removalBlockers(
  graph: TwinGraph,
  state: WorkshopState,
  nodeId: string,
): Blocker[] {
  const node = graph.nodes.find((n) => n.id === nodeId),
    out: Blocker[] = [];
  if (!node)
    return [
      {
        code: "unknown",
        nodeId,
        message: "Component is not in this configuration.",
      },
    ];
  if (!node.parentId)
    return [
      { code: "root", nodeId, message: "The vehicle root cannot be removed." },
    ];
  if (state.present.removed.includes(nodeId))
    return [
      { code: "removed", nodeId, message: "Component is already removed." },
    ];
  if (state.mode === "explore") return out;
  if (!reviewed(node.accuracy.removal))
    out.push({
      code: "unreviewed",
      nodeId,
      message: "The removal procedure for this component needs source review.",
    });
  for (const d of graph.dependencies.filter((d) => d.target === nodeId)) {
    if (!reviewed(d.reviewState) || !d.evidence.length)
      out.push({
        code: "unsupported-dependency",
        nodeId: d.prerequisite,
        message: "This dependency has not been checked: " + d.reason,
      });
    else if (!state.present.removed.includes(d.prerequisite))
      out.push({
        code: "prerequisite",
        nodeId: d.prerequisite,
        message: d.reason,
      });
  }
  for (const c of graph.connections.filter(
    (c) => c.from === nodeId || c.to === nodeId,
  )) {
    if (
      (c.kind === "electrical" || c.kind === "fluid") &&
      !state.present.detached.includes(c.id)
    )
      out.push({
        code: "connected",
        nodeId: nodeId,
        message:
          "Disconnect the documented " + c.kind + " connection first: " + c.id,
      });
  }
  return out;
}
function commit(
  state: WorkshopState,
  present: WorkshopSnapshot,
): WorkshopState {
  return {
    ...state,
    present,
    past: [...state.past, state.present].slice(-100),
    future: [],
  };
}
export function removeNode(
  graph: TwinGraph,
  state: WorkshopState,
  nodeId: string,
): WorkshopState {
  const blockers = removalBlockers(graph, state, nodeId);
  if (blockers.length) throw Error(blockers.map((b) => b.message).join(" "));
  return commit(state, {
    ...state.present,
    removed: [...state.present.removed, nodeId],
  });
}
export function restoreNode(
  graph: TwinGraph,
  state: WorkshopState,
  nodeId: string,
): WorkshopState {
  if (!state.present.removed.includes(nodeId))
    throw Error("Component is not removed.");
  if (state.mode === "constrained") {
    const blocked = graph.dependencies.filter(
      (d) =>
        d.prerequisite === nodeId && state.present.removed.includes(d.target),
    );
    if (blocked.length)
      throw Error(
        "Reinstall these components first: " +
          blocked
            .map(
              (d) =>
                graph.nodes.find((n) => n.id === d.target)?.name || d.target,
            )
            .join(", "),
      );
  }
  return commit(state, {
    ...state.present,
    removed: state.present.removed.filter((id) => id !== nodeId),
  });
}
export function detachConnection(
  graph: TwinGraph,
  state: WorkshopState,
  id: string,
): WorkshopState {
  const c = graph.connections.find((c) => c.id === id);
  if (!c) throw Error("Unknown connection.");
  if (
    state.mode === "constrained" &&
    (!reviewed(c.reviewState) || !c.evidence.length)
  )
    throw Error("This connection needs source review.");
  return commit(state, {
    ...state.present,
    detached: [...new Set([...state.present.detached, id])],
  });
}
export function changeViewState(
  state: WorkshopState,
  patch: Partial<Pick<WorkshopSnapshot, "selected" | "hidden" | "explosion">>,
) {
  return commit(state, { ...state.present, ...patch });
}
export function undoWorkshop(state: WorkshopState): WorkshopState {
  if (!state.past.length) return state;
  return {
    ...state,
    present: state.past[state.past.length - 1],
    past: state.past.slice(0, -1),
    future: [state.present, ...state.future].slice(0, 100),
  };
}
export function redoWorkshop(state: WorkshopState): WorkshopState {
  if (!state.future.length) return state;
  return {
    ...state,
    present: state.future[0],
    past: [...state.past, state.present].slice(-100),
    future: state.future.slice(1),
  };
}
export function validateWorkshop(
  graph: TwinGraph,
  state: WorkshopState,
): string[] {
  const errors: string[] = [];
  if (
    state.schemaVersion !== 1 ||
    state.graphId !== graph.id ||
    state.graphRevision !== graph.revision
  )
    errors.push("Workshop belongs to a different geometry/graph revision.");
  const ids = new Set(graph.nodes.map((n) => n.id));
  for (const snap of [state.present, ...state.past, ...state.future]) {
    if (
      [
        ...snap.removed,
        ...snap.hidden,
        ...(snap.selected ? [snap.selected] : []),
      ].some((id) => !ids.has(id))
    )
      errors.push("Workshop references an unknown component.");
    if (
      !Number.isFinite(snap.explosion) ||
      snap.explosion < 0 ||
      snap.explosion > 1
    )
      errors.push("Invalid assembly separation.");
    if (snap.removed.includes(graph.configuration.rootNodeId))
      errors.push("The vehicle root cannot be removed.");
    if (snap.detached.some((id) => !graph.connections.some((c) => c.id === id)))
      errors.push("Workshop references an unknown connection.");
  }
  if (state.mode === "constrained") {
    for (const snap of [state.present, ...state.past, ...state.future]) {
      if (snap.removed.includes(graph.configuration.rootNodeId))
        errors.push("The vehicle root cannot be removed.");
      for (const id of snap.removed) {
        const baseline = {
          ...state,
          present: { ...snap, removed: snap.removed.filter((x) => x !== id) },
        };
        if (removalBlockers(graph, baseline, id).length)
          errors.push(
            "Saved constrained removal lacks reviewed evidence or connections.",
          );
      }
      for (const d of graph.dependencies)
        if (
          snap.removed.includes(d.target) &&
          !snap.removed.includes(d.prerequisite)
        )
          errors.push("Saved state violates a removal prerequisite.");
    }
  }
  return [...new Set(errors)];
}
export function canMeasure(graph: TwinGraph, nodeId: string) {
  const node = graph.nodes.find((n) => n.id === nodeId),
    geometry = graph.geometry.find((g) => g.id === node?.geometryRevisionId);
  return (
    !!geometry &&
    geometry.accuracy.dimensions === "verified" &&
    geometry.metersPerUnit !== null &&
    geometry.metersPerUnit > 0
  );
}

export function changeWorkshopMode(
  graph: TwinGraph,
  state: WorkshopState,
  mode: WorkshopState["mode"],
) {
  const next = { ...state, mode, past: [], future: [] };
  const errors = validateWorkshop(graph, next);
  if (errors.length)
    throw Error(
      "Restore unsupported removals before entering checked order. " +
        errors.join(" "),
    );
  return next;
}
export function descendants(graph: TwinGraph, id: string): string[] {
  const result = [id];
  for (let i = 0; i < result.length; i++)
    result.push(
      ...graph.nodes.filter((n) => n.parentId === result[i]).map((n) => n.id),
    );
  return result;
}
