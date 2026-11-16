"use client";
import { DocumentLink } from "../components/DocumentLink";
import { useEffect, useState } from "react";
import { db, useApp } from "../components/context";
import {
  PhotoImage,
  PhotoLightbox,
  preparePhoto,
  invokeMedia,
  type CarPhoto,
} from "../components/CarPhotos";
import { Modal } from "../components/common";
type Photo = CarPhoto & {
  build_share_status: string;
  build_review_reason: string;
};
export function BuildPhotos({
  project,
  selected,
  onSelect,
}: {
  project: string;
  selected: string[];
  onSelect: (ids: string[]) => void;
}) {
  const { toast } = useApp();
  const [photos, setPhotos] = useState<Photo[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [open, setOpen] = useState<Photo | null>(null),
    [share, setShare] = useState<Photo | null>(null);
  useEffect(() => {
    let live = true;
    db.from("owner_car_photos")
      .select(
        "id,object_path,caption,alt_text,width,height,state,build_share_status,build_review_reason",
      )
      .eq("build_project_id", project)
      .order("created_at")
      .limit(24)
      .then(({ data, error }) => {
        if (live) {
          setPhotos(data || []);
          setError(
            error
              ? "Build photos could not load. Retry before uploading more."
              : "",
          );
        }
      });
    return () => {
      live = false;
    };
  }, [project, revision]);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
      setRevision((n) => n + 1);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Photo action failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="build-fields">
      <h2>Project photos</h2>
      <p className="small muted">
        Uploads are private. Share individual photos for review before they can
        appear in a public build. Check visible plates, VINs, faces and
        addresses.
      </p>
      {error && (
        <p role="alert">
          {error}
          <button
            className="text-link"
            onClick={() => setRevision((n) => n + 1)}
          >
            Retry
          </button>
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget,
            values = new FormData(form),
            file = values.get("photo");
          if (!(file instanceof File) || !file.size) return;
          void run(async () => {
            const clean = await preparePhoto(file),
              body = new FormData();
            body.set("photo", clean, "build.jpg");
            body.set("project", project);
            body.set("caption", String(values.get("caption") || ""));
            body.set("alt", String(values.get("alt") || ""));
            body.set("rights", "true");
            const result = await invokeMedia(body);
            onSelect([...selected, result.id]);
            form.reset();
            toast("Private build photo saved.");
          });
        }}
      >
        <label>
          Choose photo
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            required
          />
        </label>
        <label>
          Photo description
          <input name="alt" required minLength={5} maxLength={240} />
        </label>
        <label>
          Caption (optional)
          <input name="caption" maxLength={400} />
        </label>
        <label className="check">
          <input type="checkbox" required />I took this photo or have permission
          to upload it.{" "}
          <DocumentLink href="/terms#contributions">Photo terms</DocumentLink>
        </label>
        <p className="small muted">
          JPEG, PNG or WebP, up to 15 MB. Resized and cleaned on upload;
          location metadata is removed.
        </p>
        <button
          className="button outline"
          disabled={busy || photos.length >= 24}
        >
          {busy ? "Processing…" : "Upload private photo"}
        </button>
      </form>
      <div className="private-photo-grid">
        {photos.map((p) => (
          <article key={p.id}>
            <button
              className="photo-open"
              disabled={p.state !== "ready"}
              onClick={() => setOpen(p)}
            >
              <PhotoImage path={p.object_path} alt={p.alt_text} />
            </button>
            <p>{p.caption || p.alt_text}</p>
            <small>
              {p.state !== "ready"
                ? "Upload incomplete"
                : p.build_share_status === "approved"
                  ? "Approved for your next publication"
                  : p.build_share_status === "pending"
                    ? "Awaiting review"
                    : p.build_share_status === "rejected"
                      ? "Not approved"
                      : "Private"}
            </small>
            {p.build_review_reason && (
              <p className="small">Review: {p.build_review_reason}</p>
            )}
            <label className="check">
              <input
                type="checkbox"
                disabled={p.state !== "ready"}
                checked={selected.includes(p.id)}
                onChange={(e) =>
                  onSelect(
                    e.target.checked
                      ? [...selected, p.id]
                      : selected.filter((id) => id !== p.id),
                  )
                }
              />
              Include in this build
            </label>
            {["private", "withdrawn"].includes(p.build_share_status) &&
              p.state === "ready" && (
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => setShare(p)}
                >
                  Share photo for review
                </button>
              )}
            {["pending", "approved"].includes(p.build_share_status) && (
              <button
                className="text-link"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const { error } = await db.rpc("share_build_photo", {
                      photo: p.id,
                      enabled: false,
                    });
                    if (error) throw new Error(error.message);
                  })
                }
              >
                Make private
              </button>
            )}
            <button
              className="text-link danger"
              disabled={busy}
              onClick={() => {
                if (
                  confirm("Delete this photo and remove it from public builds?")
                )
                  void run(async () => {
                    await invokeMedia({ action: "delete", photo: p.id });
                    onSelect(selected.filter((id) => id !== p.id));
                  });
              }}
            >
              Delete photo
            </button>
          </article>
        ))}
      </div>
      {open && <PhotoLightbox photo={open} onClose={() => setOpen(null)} />}
      {share && (
        <Modal title="Share this photo" onClose={() => setShare(null)}>
          <PhotoImage path={share.object_path} alt={share.alt_text} />
          <p>
            This photo may appear on your published build after review. You can
            make it private again here.
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const { error } = await db.rpc("share_build_photo", {
                  photo: share.id,
                  enabled: true,
                });
                if (error) throw new Error(error.message);
                setShare(null);
              })
            }
          >
            Confirm photo sharing
          </button>
        </Modal>
      )}
    </section>
  );
}
