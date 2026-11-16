"use client";
import { buildId } from "./id";
import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "../analytics/client";
import {
  BuildSaveError,
  loadProject,
  saveProject,
  readRecovery,
  writeRecovery,
  removeRecovery,
  type Recovery,
} from "./service";
import { buildStateKey, type BuildProject, type BuildState } from "./schema";
export function useBuildProject(user: string, id: string) {
  const [project, setProject] = useState<BuildProject | null>(null),
    [state, setState] = useState<BuildState | null>(null),
    [past, setPast] = useState<BuildState[]>([]),
    [future, setFuture] = useState<BuildState[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState("Loading project…"),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState(false),
    [recovery, setRecovery] = useState<Recovery | null>(null);
  const live = useRef(true),
    saving = useRef(false),
    projectRef = useRef(project),
    stateRef = useRef(state),
    intent = useRef({ json: "", id: buildId() });
  useEffect(() => {
    projectRef.current = project;
    stateRef.current = state;
  }, [project, state]);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const reload = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const p = await loadProject(id);
      if (!live.current) return;
      projectRef.current = p;
      stateRef.current = p.state;
      setProject(p);
      setState(p.state);
      setPast([]);
      setFuture([]);
      setConflict(false);
      const draft = readRecovery(user, id);
      setRecovery(
        draft && buildStateKey(draft.state) !== buildStateKey(p.state)
          ? draft
          : null,
      );
      setMessage("Saved revision " + p.version);
    } catch (e) {
      if (live.current)
        setError(e instanceof Error ? e.message : "Project unavailable.");
    } finally {
      if (live.current) setBusy(false);
    }
  }, [user, id]);
  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);
  const edit = useCallback((change: (s: BuildState) => BuildState) => {
    const old = stateRef.current;
    if (!old) return;
    const next = change(structuredClone(old));
    if (buildStateKey(next) === buildStateKey(old)) return;
    stateRef.current = next;
    setPast((h) => [...h.slice(-39), old]);
    setFuture([]);
    setError("");
    setState(next);
  }, []);
  const save = useCallback(async () => {
    const p = projectRef.current,
      s = stateRef.current;
    if (!p || !s || saving.current) return null;
    if (buildStateKey(s) === buildStateKey(p.state)) return p;
    const json = buildStateKey(s);
    if (intent.current.json !== json) intent.current = { json, id: buildId() };
    const requestId = intent.current.id;
    writeRecovery({
      user,
      project: id,
      version: p.version,
      intent: requestId,
      state: s,
      at: new Date().toISOString(),
    });
    saving.current = true;
    setBusy(true);
    setMessage("Saving…");
    setError("");
    try {
      const updated = await saveProject(p, s, requestId);
      if (!live.current) return null;
      if (buildStateKey(updated.state) !== json) {
        setConflict(true);
        setError(
          "Another save is newer. Reload it or save your draft as a separate project.",
        );
        return null;
      }
      projectRef.current = updated;
      setProject(updated);
      setMessage("Saved revision " + updated.version);
      track("build_save", "/workshop");
      if (buildStateKey(stateRef.current) === json) removeRecovery(user, id);
      return updated;
    } catch (e) {
      if (live.current) {
        setConflict(e instanceof BuildSaveError && e.conflict);
        setError(
          e instanceof Error
            ? e.message
            : "Could not save. Your draft is kept on this device.",
        );
        setMessage("Draft kept on this device");
      }
      return null;
    } finally {
      saving.current = false;
      if (live.current) setBusy(false);
    }
  }, [user, id]);
  const dirty =
    !!state &&
    !!project &&
    buildStateKey(state) !== buildStateKey(project.state);
  useEffect(() => {
    if (!state || !project || !dirty) return;
    const json = buildStateKey(state);
    if (intent.current.json !== json) intent.current = { json, id: buildId() };
    const kept = writeRecovery({
      user,
      project: id,
      version: project.version,
      intent: intent.current.id,
      state,
      at: new Date().toISOString(),
    });
    if (!kept) setMessage("Browser recovery unavailable. Save before leaving.");
    if (error || conflict || recovery || busy) return;
    const timer = setTimeout(() => {
      void save();
    }, 1800);
    return () => clearTimeout(timer);
  }, [state, project, dirty, user, id, error, conflict, recovery, busy, save]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function undo() {
    if (!past.length || !state) return;
    setFuture((h) => [state, ...h].slice(0, 40));
    stateRef.current = past[past.length - 1];
    setState(past[past.length - 1]);
    setPast((h) => h.slice(0, -1));
    setError("");
  }
  function redo() {
    if (!future.length || !state) return;
    setPast((h) => [...h, state].slice(-40));
    stateRef.current = future[0];
    setState(future[0]);
    setFuture((h) => h.slice(1));
    setError("");
  }
  function recover() {
    if (!recovery) return;
    stateRef.current = recovery.state;
    setState(recovery.state);
    intent.current = {
      json: buildStateKey(recovery.state),
      id: recovery.intent,
    };
    setConflict(recovery.version !== project?.version);
    if (recovery.version !== project?.version)
      setError(
        "The server also changed. Save your recovered draft as a separate project or reload.",
      );
    setRecovery(null);
  }
  function dismissRecovery() {
    removeRecovery(user, id);
    setRecovery(null);
  }
  function accept(updated: BuildProject) {
    projectRef.current = updated;
    stateRef.current = updated.state;
    setProject(updated);
    setState(updated.state);
    setPast([]);
    setFuture([]);
    setError("");
    setConflict(false);
    setMessage("Saved revision " + updated.version);
    track("build_save", "/workshop");
    removeRecovery(user, id);
  }
  return {
    project,
    state,
    edit,
    dirty,
    busy,
    message,
    error,
    conflict,
    recovery,
    save,
    reload,
    undo,
    redo,
    canUndo: !!past.length,
    canRedo: !!future.length,
    recover,
    dismissRecovery,
    accept,
  };
}
