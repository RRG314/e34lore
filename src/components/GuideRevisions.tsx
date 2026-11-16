"use client";
import {useKeyedResource} from "../hooks/use-keyed-resource";
import { useEffect, useState } from "react";
import { manualGuides, type ManualGuide } from "../data/manual";
import { guideRevision } from "../domain/walkthrough";
import { e30Guides } from "../series/e30-repairs";
import { db, useApp } from "./context";
export function useGuideRevision(slug: string, requested?: string) {
  const { series } = useApp();
  const current = (series === "e30" ? e30Guides : manualGuides).find((g) => g.slug === slug),
    latest = guideRevision(slug)?.revision || "";
  const archived=!!requested&&requested!==latest;
  const resource=useKeyedResource<ManualGuide>(JSON.stringify([slug,requested]),async signal=>{
    const r=await db.from("guide_revision_archive").select("content").eq("guide_id",slug).eq("revision",requested!).abortSignal(signal).maybeSingle();
    if(r.error||!r.data)throw Error("Missing guide revision");return r.data.content as ManualGuide;
  },{enabled:archived,failureMessage:"This guide revision is unavailable. Retry to load the saved version."});
  return {guide:archived?resource.data||undefined:current,loading:resource.loading,error:resource.error,revision:requested||latest,archived,retry:resource.retry};
}

export function GuideRevisionHistory({
  slug,
  revision,
}: {
  slug: string;
  revision: string;
}) {
  const [rows, setRows] = useState<{ revision: string; created_at: string }[]>(
      [],
    ),
    [limit, setLimit] = useState(20),
    [more, setMore] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    db.from("guide_revision_archive")
      .select("revision,created_at")
      .eq("guide_id", slug)
      .order("created_at", { ascending: false })
      .order("revision")
      .limit(limit + 1)
      .then((r) => {
        if (alive) {
          setRows((r.data || []).slice(0, limit));
          setMore((r.data || []).length > limit);
          setError(r.error?.message || "");
        }
      });
    return () => {
      alive = false;
    };
  }, [slug, limit]);
  return (
    <details className="guide-revisions">
      <summary>Source revision & history</summary>
      <p className="small">
        Viewing revision {revision.slice(0, 8)}. Each saved revision preserves
        its original content and review status.
      </p>
      {error ? (
        <p>{error}</p>
      ) : (
        rows.map((r) => (
          <a
            key={r.revision}
            href={"/guides/" + slug + "?revision=" + r.revision}
          >
            {r.revision.slice(0, 8)}
            {r.revision === guideRevision(slug)?.revision
              ? " · Current"
              : ""} · {new Date(r.created_at).toLocaleDateString("en-US")} ↗
          </a>
        ))
      )}
      {more && (
        <button className="text-link" onClick={() => setLimit((n) => n + 20)}>
          Earlier revisions
        </button>
      )}
    </details>
  );
}
