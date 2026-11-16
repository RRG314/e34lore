"use client";
import { useEffect, useState } from "react";
import { db, useApp } from "./context";
import { Modal, Notice } from "./common";
import {
  changedContributionFields,
  revisionLabel,
  type ContributionRevision,
  type ContributionSnapshot,
} from "../domain/revisions";

const pageSize = 20;
export function RevisionHistory({
  type,
  id,
  current,
  onClose,
  onEdit,
}: {
  type: "thread" | "post";
  id: string;
  current: ContributionSnapshot & { content_version: number };
  onClose: () => void;
  onEdit?: (snapshot: ContributionSnapshot) => void;
}) {
  const { user } = useApp();
  const [rows, setRows] = useState<ContributionRevision[]>([]);
  const [selected, setSelected] = useState<ContributionRevision | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      let query = db
        .from("contribution_revisions")
        .select("id,content_version,editor_id,snapshot,kind,recorded_at")
        .eq(type === "thread" ? "thread_id" : "post_id", id)
        .order("content_version", { ascending: false })
        .limit(pageSize + 1);
      if (cursor !== null) query = query.lt("content_version", cursor);
      const result = await query;
      if (!active) return;
      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }
      const page = (result.data || []).slice(
        0,
        pageSize,
      ) as ContributionRevision[];
      setRows((previous) => (cursor === null ? page : [...previous, ...page]));
      setSelected((previous) => (cursor === null ? page[0] || null : previous));
      setHasMore((result.data || []).length > pageSize);
      const ids = [
        ...new Set(
          page.map((r) => r.editor_id).filter((x): x is string => !!x),
        ),
      ];
      if (ids.length) {
        const profiles = await db
          .from("profiles")
          .select("id,display_name")
          .in("id", ids);
        if (active)
          setNames((previous) => ({
            ...previous,
            ...Object.fromEntries(
              (profiles.data || []).map((p) => [p.id, p.display_name]),
            ),
          }));
      }
      if (active) setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [type, id, cursor, user?.id]);
  const changed = selected
    ? changedContributionFields(selected.snapshot, current)
    : [];
  return (
    <Modal title="Contribution history" onClose={onClose} wide>
      <p className="small muted">
        Edits are recorded automatically. History follows the contribution’s
        visibility and is removed when the contribution or account is deleted.
      </p>
      {error && (
        <Notice tone="warning">History could not be loaded: {error}</Notice>
      )}
      {!loading && !error && !rows.length && (
        <p>No history is available for this contribution.</p>
      )}
      <div className="revision-layout">
        <div className="revision-versions" aria-label="Recorded versions">
          {rows.map((row) => (
            <button
              key={row.id}
              className={selected?.id === row.id ? "selected" : ""}
              aria-pressed={selected?.id === row.id}
              onClick={() => setSelected(row)}
            >
              <strong>{revisionLabel(row)}</strong>
              <span>{new Date(row.recorded_at).toLocaleString()}</span>
              <span>
                {row.editor_id
                  ? names[row.editor_id] || "Member"
                  : "System record"}
              </span>
            </button>
          ))}
          {hasMore && (
            <button
              className="button outline"
              disabled={loading}
              onClick={() => setCursor(rows[rows.length - 1].content_version)}
            >
              Load older versions
            </button>
          )}
        </div>
        {selected && (
          <section aria-live="polite" className="revision-detail">
            <h3>{revisionLabel(selected)}</h3>
            {selected.kind === "baseline" && (
              <Notice>
                This is the earliest recorded text. Edits before history was
                enabled cannot be reconstructed.
              </Notice>
            )}
            <p className="small muted">
              {selected.content_version === current.content_version
                ? "This is the current version."
                : changed.length
                  ? "Changed since this version: " + changed.join(", ") + "."
                  : "The recorded text matches the current version."}
            </p>
            <div className="revision-comparison">
              <section>
                <h4>Recorded text</h4>
                {selected.snapshot.title && (
                  <strong>{selected.snapshot.title}</strong>
                )}
                <p className="post-body">{selected.snapshot.body}</p>
              </section>
              {selected.content_version !== current.content_version && (
                <section>
                  <h4>Current text · v{current.content_version}</h4>
                  {current.title && <strong>{current.title}</strong>}
                  <p className="post-body">{current.body}</p>
                </section>
              )}
            </div>
            {type === "thread" && (
              <details>
                <summary>Recorded vehicle and links</summary>
                <dl className="revision-context">
                  {[
                    ["Model", selected.snapshot.model_id],
                    ["Engine", selected.snapshot.engine],
                    ["Category", selected.snapshot.category],
                    ["System", selected.snapshot.component_id],
                    ["Part", selected.snapshot.part_id],
                    ["Guide", selected.snapshot.guide_id],
                    ...Object.entries(
                      selected.snapshot.vehicle_configuration || {},
                    ),
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || "Not established"}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
            {onEdit && selected.content_version !== current.content_version && (
              <button
                className="button outline"
                onClick={() => onEdit(selected.snapshot)}
              >
                Open this text in editor
              </button>
            )}
          </section>
        )}
      </div>
      {loading && <p role="status">Loading history…</p>}
    </Modal>
  );
}
