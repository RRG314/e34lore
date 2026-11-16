export type ContributionSnapshot = {
  body: string;
  title?: string;
  category?: string;
  model_id?: string | null;
  engine?: string | null;
  component_id?: string | null;
  part_id?: string | null;
  guide_id?: string | null;
  vehicle_configuration?: Record<string, string>;
  observations?: unknown[];
};

export type ContributionRevision = {
  id: number;
  content_version: number;
  editor_id: string | null;
  snapshot: ContributionSnapshot;
  kind: "original" | "edit" | "baseline";
  recorded_at: string;
};

const fields: [keyof ContributionSnapshot, string][] = [
  ["title", "Title"],
  ["body", "Text"],
  ["category", "Category"],
  ["model_id", "Model"],
  ["engine", "Engine"],
  ["component_id", "System"],
  ["part_id", "Part link"],
  ["guide_id", "Guide link"],
  ["vehicle_configuration", "Vehicle configuration"],
  ["observations", "Observations"],
];

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => JSON.stringify(key) + ":" + canonical(item))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value ?? null);
}

export function changedContributionFields(
  before: ContributionSnapshot,
  after: ContributionSnapshot,
): string[] {
  return fields
    .filter(([field]) => canonical(before[field]) !== canonical(after[field]))
    .map(([, label]) => label);
}

export function revisionLabel(
  revision: Pick<ContributionRevision, "kind" | "content_version">,
): string {
  const kind =
    revision.kind === "original"
      ? "Original"
      : revision.kind === "baseline"
        ? "Recorded baseline"
        : "Edit";
  return `Version ${revision.content_version} · ${kind}`;
}
