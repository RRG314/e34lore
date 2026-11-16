"use client";
import {DocumentLink} from "./DocumentLink";
import { useEffect, useState } from "react";
import { Camera, Plus, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { db, useApp } from "./context";
import { Modal, Notice } from "./common";
import { ReportButton } from "./ReportButton";
type CarPhotoPublication={source_photo_id:string;photo_id:string;garage_id:string;state:"pending"|"approved"|"rejected"|"hidden";review_reason:string};
export type CarPhoto = {
  id: string;
  object_path: string;
  caption: string;
  alt_text: string;
  width: number;
  height: number;
  state?: string;
};
type OwnerCarPhoto=Omit<CarPhoto,"width"|"height"|"state">&{width:number|null;height:number|null;state:"processing"|"ready"|"deleting"};
const fields =
  "id,user_id,garage_id,object_path,width,height,bytes,caption,alt_text,state,created_at,reviewed_at";
export function PhotoImage({
  path,
  alt,
  className = "",
}: {
  path: string;
  alt: string;
  className?: string;
}) {
  const { user, authReady, authRevision } = useApp();
  const [retry, setRetry] = useState(0);
  const key=[user?.id||'visitor',authRevision,path,retry].join(':');
  const [result, setResult] = useState<{key:string;url:string;error:boolean}|null>(null);
  const current=result?.key===key?result:null,url=current?.url||'',error=current?.error||false;
  useEffect(() => {
    let active = true,
      objectUrl = "";
    if (!authReady) return;
    db.storage
      .from("e34-car-photos")
      .download(path)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setResult({key,url:'',error:true});
          return;
        }
        objectUrl = URL.createObjectURL(data);
        setResult({key,url:objectUrl,error:false});
      }).catch(()=>{if(active)setResult({key,url:'',error:true});});
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key, path, authReady]);
  return url ? (
    <img className={className} src={url} alt={alt} />
  ) : (
    <div
      className={"car-photo-placeholder " + className}
      role="img"
      aria-label={error ? "Photo unavailable" : alt}
    >
      <Camera size={24} />
      <span>{error ? "Photo unavailable" : "Loading photo…"}</span>
      {error&&<button type="button" className="text-link" onClick={()=>setRetry(n=>n+1)}>Retry photo</button>}
    </div>
  );
}
export function PhotoLightbox({
  photo,
  onClose,
  report = false,
}: {
  photo: Pick<CarPhoto,"id"|"object_path"|"caption"|"alt_text">;
  onClose: () => void;
  report?: boolean;
}) {
  const [zoom, setZoom] = useState(1),
    [rotation, setRotation] = useState(0);
  return (
    <Modal title="Car photograph" onClose={onClose} wide>
      <div className="photo-view-tools">
        <button
          aria-label="Zoom photo out"
          onClick={() => setZoom((v) => Math.max(1, v - 0.25))}
        >
          <ZoomOut size={18} />
        </button>
        <output>{Math.round(zoom * 100)}%</output>
        <button
          aria-label="Zoom photo in"
          onClick={() => setZoom((v) => Math.min(4, v + 0.25))}
        >
          <ZoomIn size={18} />
        </button>
        <button onClick={() => setRotation((v) => (v + 90) % 360)}>
          <RotateCw size={18} /> Rotate
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setRotation(0);
          }}
        >
          Reset
        </button>
      </div>
      <div className="photo-lightbox-scroll">
        <div
          style={{
            width: zoom * 100 + "%",
            padding: rotation % 180 ? "25% 0" : undefined,
          }}
        >
          <div style={{ transform: `rotate(${rotation}deg)` }}>
            <PhotoImage path={photo.object_path} alt={photo.alt_text} />
          </div>
        </div>
      </div>
      <p>{photo.caption}</p>
      {report && <ReportButton type="photo" id={photo.id} />}
      <p className="small muted">
        Scroll to pan when enlarged. Photograph rotation stays in the image
        plane.
      </p>
    </Modal>
  );
}
export function CarPhotoGallery({ garageId }: { garageId: string }) {
  const { user } = useApp();
  const [photos, setPhotos] = useState<CarPhoto[]>([]),
    [selected, setSelected] = useState<CarPhoto | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    db.from("garage_photos")
      .select(fields)
      .eq("garage_id", garageId)
      .eq("state", "approved")
      .order("created_at")
      .order("id")
      .limit(12)
      .then(({ data, error }) => {
        if (active) {
          setPhotos(data || []);
          setError(error?.message || "");
        }
      });
    return () => {
      active = false;
    };
  }, [garageId, user?.id]);
  if (error)
    return <Notice tone="warning">Photos could not be loaded. {error}</Notice>;
  if (!photos.length)
    return <p className="small muted">No photos shared for this car yet.</p>;
  return (
    <section className="car-photo-gallery" aria-label="Car photographs">
      <div className="car-photo-grid">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelected(photo)}
            aria-label={"Enlarge " + photo.alt_text}
          >
            <PhotoImage path={photo.object_path} alt={photo.alt_text} />
            {photo.caption && <span>{photo.caption}</span>}
          </button>
        ))}
      </div>
      {selected && (
        <PhotoLightbox
          photo={selected}
          onClose={() => setSelected(null)}
          report
        />
      )}
    </section>
  );
}
export function CarCover({ garageId }: { garageId: string }) {
  const [photo, setPhoto] = useState<CarPhoto | null>(null);
  const { user } = useApp();
  useEffect(() => {
    let active = true;
    db.from("garage_photos")
      .select(fields)
      .eq("garage_id", garageId)
      .eq("state", "approved")
      .order("created_at")
      .limit(1)
      .then(({ data }) => {
        if (active) setPhoto(data?.[0] || null);
      });
    return () => {
      active = false;
    };
  }, [garageId, user?.id]);
  return photo ? (
    <PhotoImage
      path={photo.object_path}
      alt={photo.alt_text}
      className="car-cover"
    />
  ) : (
    <div className="car-cover car-cover-empty">
      <Camera size={24} />
      <span>No shared photograph</span>
    </div>
  );
}
export async function preparePhoto(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 15 * 1024 * 1024
  )
    throw new Error("Choose a JPEG, PNG or WebP photo under 15 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40_000_000)
      throw new Error("Choose a photo under 40 megapixels.");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Photo processing is unavailable in this browser.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("Photo could not be prepared.")),
        "image/jpeg",
        0.86,
      ),
    );
    if (blob.size > 2 * 1024 * 1024) throw new Error("Choose a smaller photo.");
    return blob;
  } finally {
    bitmap.close();
  }
}
export async function invokeMedia(body: FormData | Record<string, string>) {
  const { data, error } = await db.functions.invoke("car-media", { body });
  if (error) {
    let message = error.message;
    try {
      message = (await error.context.json()).error || message;
    } catch {}
    throw new Error(message);
  }
  return data;
}
type CarPhotoManagerProps={vehicleId:string;garageId?:string;onChanged?:()=>void};
export function CarPhotoManager(props:CarPhotoManagerProps) {
  const {user}=useApp();
  return <AccountCarPhotoManager key={[user?.id||'visitor',props.vehicleId,props.garageId||''].join(':')} {...props}/>;
}
function AccountCarPhotoManager({
  vehicleId,
  garageId,
  onChanged,
}: CarPhotoManagerProps) {
  const { user, toast } = useApp();
  const [photos, setPhotos] = useState<OwnerCarPhoto[]>([]),
    [publications, setPublications] = useState<CarPhotoPublication[]>([]),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [share, setShare] = useState<OwnerCarPhoto | null>(null),
    [selected, setSelected] = useState<OwnerCarPhoto | null>(null);
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    let active = true;
    if (!user) return;
    Promise.all([
      db
        .from("owner_car_photos")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("created_at"),
      db.rpc("my_car_photo_publications"),
    ]).then(([p, b]) => {
      if (active) {
        setPhotos(p.data || []);
        setPublications(b.data || []);
        setError(p.error?.message || b.error?.message || "");
      }
    });
    return () => {
      active = false;
    };
  }, [vehicleId, user, revision]);
  useEffect(() => {
    if (user) invokeMedia({ action: "cleanup" }).catch(() => {});
  }, [user]);
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await work();
      setRevision((v) => v + 1);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="car-photo-manager">
      <div className="section-row">
        <div>
          <span className="eyebrow">YOUR CAR PHOTOS</span>
          <h3>Photos of this car</h3>
        </div>
        <span>{photos.length} / 12</span>
      </div>
      <p>
        Uploads stay private. Submit selected photos for the community after
        sharing your car’s story. Shared photos are reviewed before appearing.
      </p>
      {error && <Notice tone="warning">{error}</Notice>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            form = e.currentTarget;
          run(async () => {
            if (!file) throw new Error("Choose a photo.");
            const clean = await preparePhoto(file);
            const body = new FormData();
            body.set("photo", clean, "car.jpg");
            body.set("vehicle", vehicleId);
            body.set("caption", String(f.get("caption") || ""));
            body.set("alt", String(f.get("alt") || ""));
            body.set("rights", f.get("rights") ? "true" : "false");
            await invokeMedia(body);
            setFile(null);
            form.reset();
            toast("Photo saved privately.");
          });
        }}
      >
        <div className="form-grid">
          <label>
            Photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <label>
            Photo description
            <input
              name="alt"
              minLength={5}
              maxLength={240}
              required
              placeholder="The car viewed from the front"
            />
          </label>
        </div>
        <label>
          Caption <small>Optional</small>
          <input name="caption" maxLength={400} />
        </label>
        <label className="check-label">
          <input type="checkbox" name="rights" required />I took this photo or
          have permission to upload and share it under the <DocumentLink href="/terms#contributions">contribution terms</DocumentLink>.
        </label>
        <p className="small muted">
          JPEG, PNG or WebP, up to 15 MB. Photos are resized to 1600 pixels and
          reencoded on the server. Location metadata is removed. Visible number
          plates, faces or addresses remain in the picture; check before
          sharing.
        </p>
        <button
          className="button outline"
          disabled={busy || photos.length >= 12}
        >
          <Plus size={15} />
          {busy ? "Processing…" : "Upload private photo"}
        </button>
      </form>
      <div className="private-photo-grid">
        {photos.map((photo) => {
          const pub = publications.find((p) => p.source_photo_id === photo.id);
          return (
            <article key={photo.id}>
              <button
                className="photo-open"
                onClick={() => setSelected(photo)}
                disabled={photo.state !== "ready"}
              >
                <PhotoImage path={photo.object_path} alt={photo.alt_text} />
              </button>
              <p>{photo.caption || photo.alt_text}</p>
              <small>
                {pub
                  ? pub.state === "approved"
                    ? "Shared with the community"
                    : pub.state === "pending"
                      ? "Awaiting photo review"
                      : pub.state === "hidden"
                        ? "Hidden by moderation"
                        : "Not approved"
                  : photo.state === "ready"
                    ? "Private"
                    : "Upload incomplete"}
              </small>
              {pub?.review_reason && (
                <p className="small">Review: {pub.review_reason}</p>
              )}
              <div className="form-actions">
                {!pub && photo.state === "ready" && (
                  <button
                    className="text-link"
                    disabled={busy || !garageId}
                    onClick={() => setShare(photo)}
                  >
                    Share photo
                  </button>
                )}
                {pub && (
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const r = await db.rpc("withdraw_car_photo", {
                          photo: pub.photo_id,
                        });
                        if (r.error) throw r.error;
                        toast("Photo is no longer shared.");
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
                      confirm(
                        "Permanently delete this photo and its community copy?",
                      )
                    )
                      run(async () => {
                        const r = await invokeMedia({
                          action: "delete",
                          photo: photo.id,
                        });
                        toast(
                          r.cleanup_pending
                            ? "Photo removed. File cleanup will retry."
                            : "Photo deleted.",
                        );
                      });
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!garageId && (
        <p className="small">
          Share this car’s story above to submit photos to the community.
        </p>
      )}
      {share && (
        <Modal
          title="Share this car photo"
          onClose={() => {
            if (!busy) setShare(null);
          }}
        >
          <PhotoImage path={share.object_path} alt={share.alt_text} />
          <p>{share.caption || share.alt_text}</p>
          <p>
            This photo and caption will be submitted for review on your shared
            car page. Your private service history, mileage and notes are
            excluded.
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await db.rpc("publish_car_photo", {
                  photo: share.id,
                  entry: garageId,
                });
                if (r.error) throw r.error;
                setShare(null);
                toast("Photo submitted for community review.");
              })
            }
          >
            Submit photo for review
          </button>
        </Modal>
      )}
      {selected && (
        <PhotoLightbox photo={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
