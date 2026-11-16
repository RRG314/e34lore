"use client";
import { useEffect, useState } from "react";
import { db } from "../components/context";
import { referenceIndexSchema } from "./contracts";
import {ScannerPhotoReview} from "./PhotoReview";
import { PageIntro } from "../components/common";
type Correction = {
  id: string;
  proposed_part_id: string | null;
  part_id: string | null;
  node_id: string | null;
  reason: string;
  decision: string | null;
};
export function ScannerReview() {
  const [rows, setRows] = useState<Correction[] | null>(null),
    [error, setError] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let live = true;
    db.rpc("scanner_correction_queue")
      .abortSignal(AbortSignal.timeout(12000))
      .then((r) => {
        if (!live) return;
        if (r.error)
          setError(
            "A current administrator session and verified authenticator are required.",
          );
        else setRows(r.data || []);
      });
    return () => {
      live = false;
    };
  }, [refresh]);
  return (
    <div className="page">
      <PageIntro
        eyebrow="MANAGE / SCANNER"
        title="Review scanner contributions."
        description="Review shared part photos and suggested identification corrections."
      />
      <ScannerPhotoReview/><h2>Identification corrections</h2><p>Correction decisions record the evidence. They do not change catalog part numbers.</p>
      {error && <p role="alert">{error}</p>}
      {rows?.length === 0 && <p>No corrections awaiting review.</p>}
      {rows?.map((r) => (
        <article className="review-card" key={r.id}>
          <h2>{r.part_id || r.node_id || "Unidentified component"}</h2>
          <p>{r.reason}</p>
          <p>
            Proposed canonical record: {r.proposed_part_id || "None supplied"}
          </p>
          <p>Review: {r.decision || "Pending"}</p>
          <label>
            Review reason
            <textarea
              minLength={10}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {["reviewed", "needs_evidence", "rejected"].map((decision) => (
            <button
              className="button outline"
              key={decision}
              disabled={busy || reason.trim().length < 10}
              onClick={async () => {
                setBusy(true);
                const result = await db
                  .rpc("review_scanner_correction", {
                    correction: r.id,
                    decision,
                    reason,
                  })
                  .abortSignal(AbortSignal.timeout(12000));
                setBusy(false);
                if (result.error)
                  setError(
                    "Review could not save. Check your session and try again.",
                  );
                else {
                  setReason("");
                  setRefresh((n) => n + 1);
                }
              }}
            >
              {decision.replace("_", " ")}
            </button>
          ))}
        </article>
      ))}
    </div>
  );
}
export function ScannerCredits() {
  const [records, setRecords] = useState<
    {
      id: string;
      name: string;
      synthetic: boolean;
      provenance: Record<string, unknown>;
    }[]
  >([]);
  useEffect(() => {
    let live = true;
    fetch("/scanner/reference-index.json")
      .then((r) => r.json())
      .then((d) => {
        if (live) setRecords(referenceIndexSchema.parse(d).records);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return (
    <div className="page">
      <PageIntro
        eyebrow="SCANNER / SOURCES"
        title="Photo comparison sources."
        description="Photo comparison suggests component categories. It does not identify an exact ordering number or confirm vehicle fitment."
      />
      <p>The photo finder uses CLIP ViT-B/32 and a prepared set of component descriptions. Recognition files download from Hugging Face; your photos are processed on your device. <a href="https://huggingface.co/Xenova/clip-vit-base-patch32/tree/6b7c523703ae26e39be4b03774966f8571c7f523" target="_blank" rel="noopener noreferrer">Model and source files ↗</a> · <a href="/THIRD-PARTY-NOTICES.txt">Software notices</a></p>
      <h2>Additional reference image credits</h2><p>The following photographs and illustrative renders belong to the separate, unreleased visual-reference experiment. They do not establish exact OEM identity.</p>
      {records.map((r) => (
        <section key={r.id}>
          <h2>{r.name}</h2>
          <p>
            {r.synthetic
              ? "Illustrative 3D rendering"
              : "Photographic reference"}
          </p>
          <dl>
            <dt>Creator</dt>
            <dd>{String(r.provenance.creator || "See source attribution")}</dd>
            <dt>License</dt>
            <dd>
              <a
                href={String(
                  r.provenance.licenseUrl || "https://creativecommons.org/",
                )}
              >
                {String(r.provenance.license || "See source")}
              </a>
            </dd>
            <dt>Attribution</dt>
            <dd>{String(r.provenance.attribution || "")}</dd>
            <dt>Changes</dt>
            <dd>{String(r.provenance.changes || "")}</dd>
          </dl>
          {typeof r.provenance.source === "string" &&
            r.provenance.source.startsWith("https://") && (
              <a href={r.provenance.source}>
                Original photograph and license record
              </a>
            )}
        </section>
      ))}
      <a href="/scanner/REFERENCE-CREDITS.md">
        Read the complete attribution record
      </a>
    </div>
  );
}
