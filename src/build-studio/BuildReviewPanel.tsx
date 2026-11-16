"use client";
import { useEffect, useState } from "react";
import { db } from "../components/context";
import { PhotoImage } from "../components/CarPhotos";
import { Modal } from "../components/common";
import { DocumentLink } from "../components/DocumentLink";
type Queue = {
  builds: { id: string; snapshot: { title: string }; hidden: boolean }[];
  photos: {
    id: string;
    object_path: string;
    alt_text: string;
    caption: string;
    build_share_status: string;
    build_review_reason: string;
  }[];
};
export function BuildReviewPanel() {
  const [data, setData] = useState<Queue | null>(null),
    [error, setError] = useState(""),
    [rev, setRev] = useState(0),
    [action, setAction] = useState<{
      kind: "build" | "photo";
      id: string;
      value: string;
    } | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    db.rpc("build_review_queue").then(({ data, error }) => {
      if (live) {
        setData(error ? null : data);
        setError(error?.message || "");
      }
    });
    return () => {
      live = false;
    };
  }, [rev]);
  return (
    <section>
      <h2>Build publications & photos</h2>
      <p>
        Only submitted photos and public build snapshots appear here. Private
        plans and unshared photos stay private.
      </p>
      {error && <p role="alert">{error}</p>}
      <button className="button outline" onClick={() => setRev((n) => n + 1)}>
        Refresh build review
      </button>
      {!data && !error && <p role="status">Checking staff session…</p>}
      {data && (
        <>
          <h3>Submitted photographs</h3>
          <div className="private-photo-grid">
            {data.photos.map((p) => (
              <article key={p.id}>
                <PhotoImage path={p.object_path} alt={p.alt_text} />
                <p>{p.caption || p.alt_text}</p>
                <p>{p.build_share_status}</p>
                <p>{p.build_review_reason}</p>
                <button
                  className="button outline"
                  onClick={() =>
                    setAction({ kind: "photo", id: p.id, value: "approved" })
                  }
                >
                  Approve build photo
                </button>
                <button
                  className="text-link"
                  onClick={() =>
                    setAction({ kind: "photo", id: p.id, value: "rejected" })
                  }
                >
                  Reject build photo
                </button>
              </article>
            ))}
          </div>
          <h3>Latest public builds</h3>
          {data.builds.map((b) => (
            <article className="build-revision" key={b.id}>
              <h4>{b.snapshot.title}</h4>
              <p>{b.hidden ? "Held for review" : "Published"}</p>
              <DocumentLink href={"/builds/" + b.id}>
                Open public build ↗
              </DocumentLink>
              <button
                className="button outline"
                onClick={() =>
                  setAction({
                    kind: "build",
                    id: b.id,
                    value: b.hidden ? "restore" : "hide",
                  })
                }
              >
                {b.hidden ? "Restore build" : "Hide build & photos"}
              </button>
            </article>
          ))}
        </>
      )}
      {action && (
        <Modal title="Review build content" onClose={() => setAction(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const reason = String(
                new FormData(e.currentTarget).get("reason"),
              );
              setBusy(true);
              const { error } = await db.rpc(
                action.kind === "photo"
                  ? "review_build_photo"
                  : "moderate_build",
                action.kind === "photo"
                  ? { photo: action.id, decision: action.value, reason }
                  : { build: action.id, hide: action.value === "hide", reason },
              );
              setBusy(false);
              if (error) setError(error.message);
              else {
                setAction(null);
                setRev((n) => n + 1);
              }
            }}
          >
            <label>
              Review reason
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={2000}
              />
            </label>
            <p>
              Decision: {action.value}. This action is recorded in the staff
              audit history.
            </p>
            <button className="button primary" disabled={busy}>
              Confirm review
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
