import { db } from "../lib/supabase";
import { buildStateSchema, type BuildProject, type BuildState } from "./schema";
export class BuildSaveError extends Error {
  constructor(
    message: string,
    public conflict = false,
  ) {
    super(message);
  }
}
export async function buildRpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await db
    .rpc(name, args)
    .abortSignal(AbortSignal.timeout(15000));
  if (error)
    throw new BuildSaveError(
      error.code === "40P01"
        ? "Another change is running. Try this action again."
        : /fetch|network|abort|timed out|timeout|load failed/i.test(error.message)?"This action could not finish. Check your connection and try again.":error.message,
      error.code === "40001",
    );
  return data as T;
}
export function parseProject(value: BuildProject): BuildProject {
  return { ...value, state: buildStateSchema.parse(value.state) };
}
export async function loadProject(id: string) {
  const { data, error } = await db
    .from("build_projects")
    .select("*")
    .eq("id", id)
    .abortSignal(AbortSignal.timeout(15000))
    .single();
  if (error)
    throw new Error(
      "This project could not load. Check your account and connection.",
    );
  return parseProject(data);
}
function validState(value: BuildState) {
  const result = buildStateSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new BuildSaveError(
      "Check " + (issue.path.join(" → ") || "project") + ": " + issue.message,
    );
  }
  return result.data;
}
export async function createProject(
  state: BuildState,
  vehicle: string | null = null,
) {
  return parseProject(
    await buildRpc<BuildProject>("create_build", {
      content: validState(state),
      vehicle,
    }),
  );
}
export async function saveProject(
  project: BuildProject,
  state: BuildState,
  intent: string,
) {
  return parseProject(
    await buildRpc<BuildProject>("save_build", {
      project: project.id,
      expected_version: project.version,
      content: validState(state),
      request_id: intent,
    }),
  );
}
export const recoveryKey = (user: string, project: string) =>
  "e34.build.recovery.v1." + user + "." + project;
export type Recovery = {
  user: string;
  project: string;
  version: number;
  intent: string;
  state: BuildState;
  at: string;
};
export function readRecovery(user: string, project: string): Recovery | null {
  try {
    const raw = JSON.parse(
      localStorage.getItem(recoveryKey(user, project)) || "null",
    );
    if (
      raw?.user !== user ||
      raw?.project !== project ||
      !Number.isSafeInteger(raw.version) ||
      typeof raw.intent !== "string"
    )
      return null;
    return { ...raw, state: buildStateSchema.parse(raw.state) };
  } catch {
    return null;
  }
}
export function writeRecovery(value: Recovery) {
  try {
    localStorage.setItem(
      recoveryKey(value.user, value.project),
      JSON.stringify(value),
    );
    return true;
  } catch {
    return false;
  }
}
export function removeRecovery(user: string, project: string) {
  try {
    localStorage.removeItem(recoveryKey(user, project));
  } catch {}
}
export function duplicateState(state: BuildState) {
  const copy = structuredClone(state);
  copy.title = (copy.title + " · copy").slice(0, 120);
  copy.lifecycle = "draft";
  copy.photoIds = [];
  copy.tasks.forEach((t) => (t.transferred = false));
  return copy;
}
