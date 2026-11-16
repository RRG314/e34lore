/* eslint-disable @next/next/no-img-element -- Captured Blob images must remain local and bypass remote image optimization. */
"use client";
import { useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type ChangeEvent, type Ref, type ReactNode } from "react";
import { track } from "../analytics/client";
import { Camera, ImagePlus, RotateCw, Square, StopCircle } from "lucide-react";
import { CameraController, prepareImage, coverCrop } from "./camera";
import { boxSchema, type Box } from "./contracts";
export type CapturedImage = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  quality: ReturnType<typeof import("./camera").quality>;
};
export type ImageCaptureHandle = { showImage:(image:Omit<CapturedImage,"url">,notify?:boolean)=>void; clearImage:()=>void };
export function ImageCapture({
  ref,
  onImage,
  onClear,
  disabled=false,
  canAdd=true,
  onPendingChange,
  onPickerChange,
  scanAction,
}: {
  ref?: Ref<ImageCaptureHandle>;
  onImage: (image: CapturedImage,reason:"add"|"edit",scan?:boolean) => void;
  onClear?: () => void;
  disabled?: boolean;
  canAdd?: boolean;
  onPendingChange?: (pending:boolean)=>void;
  onPickerChange?: (open:boolean)=>void;
  scanAction?: ReactNode;
}) {
  const video = useRef<HTMLVideoElement>(null),
    camera = useRef(new CameraController()),
    alive = useRef(true),
    url = useRef(""),
    source = useRef<Blob | null>(null),
    nativeInput = useRef<HTMLInputElement>(null),
    galleryInput = useRef<HTMLInputElement>(null),
    liveCamera = useRef(false),
    captureReason = useRef<"add"|"edit">("add"),
    generation = useRef(0);
  const [accepted,setAccepted]=useState<CapturedImage|null>(null);
  const [active, setActive] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [image, setImage] = useState<CapturedImage | null>(null),
    [rotation, setRotation] = useState(0),
    [crop, setCrop] = useState<Box>({ xmin: 0, ymin: 0, xmax: 1, ymax: 1 }),
    [caps, setCaps] = useState<{
      zoom?: { min: number; max: number; step: number };
      torch?: boolean;
    }>({}),
    [zoom, setZoom] = useState(1),
    [torch, setTorch] = useState(false);
  const [secure,setSecure]=useState(true), [mobile,setMobile]=useState(false), [pending,setPending]=useState<"add"|"edit"|null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Read browser capability after hydration, without mismatching server markup.
  useEffect(()=>{setSecure(window.isSecureContext && !!navigator.mediaDevices?.getUserMedia);setMobile(matchMedia("(pointer:coarse)").matches||/Android|iPhone|iPad/.test(navigator.userAgent))},[]);
  function stop() {
    generation.current++;
    setBusy(false);
    onPendingChange?.(false);
    camera.current.stop();
    liveCamera.current=false;
    setActive(false);
    setTorch(false);
  }
  const pickerCancelled = useEffectEvent(() => onPickerChange?.(false));
  useEffect(() => {
    const inputs = [nativeInput.current, galleryInput.current];
    const cancel = () => pickerCancelled();
    for (const input of inputs) input?.addEventListener("cancel", cancel);
    return () => { for (const input of inputs) input?.removeEventListener("cancel", cancel); };
  }, []);
  const stopOnHidden=useEffectEvent(()=>{if(liveCamera.current)stop();});
  useEffect(() => {
    alive.current = true;
    const cameraController = camera.current,
      lifecycle = generation;
    const hide = () => {
      if (document.visibilityState === "hidden") {
        stopOnHidden();
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      alive.current = false;
      lifecycle.current++;
      cameraController.stop();
      URL.revokeObjectURL(url.current);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  async function prepare(
    blob: Blob,
    angle = 0,
    region: Box = { xmin: 0, ymin: 0, xmax: 1, ymax: 1 },
    reason:"add"|"edit"="add",
  ) {
    const g = ++generation.current;
    setBusy(true);
    onPendingChange?.(true);
    setError("");
    try {
      const next = await prepareImage(blob, angle, region);
      if (!alive.current || g !== generation.current) return;
      URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(next.blob);
      const value = { ...next, url: url.current };
      setImage(value);
      setPending(reason);
      track("scanner_capture", "/scanner");
    } catch (e) {
      track("scanner_error", "/scanner", { code: "unsupported" });
      if (alive.current && g === generation.current) { discardPending();
        setError(
          e instanceof Error
            ? e.message
            : "This image could not load. Use JPEG, PNG or WebP.",
        ); }
    } finally {
      if (alive.current && g === generation.current) setBusy(false);
    }
  }
  useImperativeHandle(ref,()=>({clearImage(){stop();setPending(null);setAccepted(null);onPendingChange?.(false);source.current=null;URL.revokeObjectURL(url.current);url.current="";setImage(null)},showImage(next:Omit<CapturedImage,"url">,notify=true){
    if(accepted?.blob===next.blob&&image?.blob===next.blob&&!pending&&!active)return;
    stop(); source.current=next.blob; setRotation(0); setCrop({xmin:0,ymin:0,xmax:1,ymax:1});
    URL.revokeObjectURL(url.current); url.current=URL.createObjectURL(next.blob);
    const value={...next,url:url.current};setAccepted(value);setPending(null);onPendingChange?.(false);setImage(value);if(notify)onImage(value,"edit");
  }}));
  async function start() {
    liveCamera.current=true;
    const g = ++generation.current;
    setError("");
    setBusy(true);
    onPendingChange?.(true);
    try {
      if (await camera.current.start(video.current!)) {
        if (!alive.current || g !== generation.current) return;
        setCaps(
          (camera.current.track()?.getCapabilities() || {}) as typeof caps,
        );
        setActive(true);
        track("scanner_permission", "/scanner", { code: "camera-granted" });
      }
    } catch (e) {
      track("scanner_permission", "/scanner", {
        code:
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "camera-denied"
            : "camera-unavailable",
      });
      if (alive.current && g === generation.current) {
        liveCamera.current=false;onPendingChange?.(false);
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Camera permission was denied. Choose a photo or enable camera permission in your browser."
            : "The camera could not open. Choose a photo instead.",
        ); }
    } finally {
      if (alive.current && g === generation.current) setBusy(false);
    }
  }
  function capture() {
    const v = video.current;
    if (!v?.videoWidth) return;
    const canvas = document.createElement("canvas"),
      rect = v.getBoundingClientRect(),
      c = coverCrop(v.videoWidth, v.videoHeight, rect.width, rect.height);
    canvas.width = Math.min(1600, c.width);
    canvas.height = Math.round((c.height * canvas.width) / c.width);
    canvas
      .getContext("2d")!
      .drawImage(
        v,
        c.x,
        c.y,
        c.width,
        c.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    const captureGeneration=++generation.current;
    camera.current.stop();liveCamera.current=false;setActive(false);setBusy(true);onPendingChange?.(true);
    canvas.toBlob(
      (blob) => {
        if (captureGeneration !== generation.current || !alive.current) return;
        if (blob) {
          source.current = blob;
          setRotation(0);
          setCrop({ xmin: 0, ymin: 0, xmax: 1, ymax: 1 });
          void prepare(blob,0,{xmin:0,ymin:0,xmax:1,ymax:1},captureReason.current);
        } else { setBusy(false);onPendingChange?.(false);setError("The photo could not be captured. Try again."); }
      },
      "image/jpeg",
      0.92,
    );
  }
  function discardPending(){
    stop();setPending(null);onPendingChange?.(false);setRotation(0);setCrop({xmin:0,ymin:0,xmax:1,ymax:1});
    URL.revokeObjectURL(url.current);const kept=accepted;
    if(kept){url.current=URL.createObjectURL(kept.blob);source.current=kept.blob;setImage({...kept,url:url.current});}else{url.current="";source.current=null;setImage(null);}
  }
  function selectedFile(event: ChangeEvent<HTMLInputElement>) {
    onPickerChange?.(false);
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    stop();
    source.current = file;
    setRotation(0);
    setCrop({ xmin: 0, ymin: 0, xmax: 1, ymax: 1 });
    void prepare(file, 0, undefined, captureReason.current);
  }
  function pickFile(input:HTMLInputElement|null,reason:"add"|"edit"){
    if(!input)return;
    captureReason.current=reason;
    onPickerChange?.(true);
    input.click();
  }
  function takeAnother(reason:"add"|"edit",galleryOnDesktop=false){captureReason.current=reason;if(mobile||!secure)pickFile(nativeInput.current,reason);else if(galleryOnDesktop)pickFile(galleryInput.current,reason);else void start();}
  return (
    <section className="scan-capture" aria-label="Camera and photo">
      <div className={"scan-viewfinder" + (active ? " active" : "")}>
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          aria-label="Rear camera preview"
          hidden={!active}
        />
        {!active && image ? (
          <img
            src={image.url}
            alt={pending?"Photo to review":"Your selected part photo"}
          />
        ) : (
          !active && (
            <div className="scan-camera-empty">
              <Camera size={36} />
              <p>Photograph one part. You can add other angles of the same part.</p>
            </div>
          )
        )}
        {active && <span className="scan-frame" aria-hidden />}
      </div>
      {pending && !busy && <div className="scan-photo-confirm"><p>Is the part clear and fully in view?</p><button type="button" className="button primary" disabled={disabled} onClick={()=>{if(!image)return;setAccepted(image);setPending(null);onPendingChange?.(false);onImage(image,pending,true);}}>Use photo and scan</button><button type="button" className="button outline" disabled={disabled} onClick={()=>{if(!image)return;setAccepted(image);setPending(null);onPendingChange?.(false);onImage(image,pending);}}>Keep photo</button><button type="button" className="text-link" onClick={()=>{const reason=pending;discardPending();takeAnother(reason);}}>Retake</button><button type="button" className="text-link" onClick={discardPending}>Cancel</button></div>}
      {!pending && !active && scanAction}
      {(!pending||busy)&&<div className="scan-actions">
        {busy && !active && (
          <button className="button outline" type="button" onClick={discardPending}>
            Cancel
          </button>
        )}
        {secure && !mobile ? <button
          className="button"
          type="button"
          disabled={busy || disabled || (!image && !canAdd)}
          onClick={active ? capture : ()=>takeAnother(accepted?"edit":"add")}
        >
          <Camera size={18} />
          {active ? "Take photo" : accepted ? "Retake this angle" : "Open camera"}
        </button> : <><button type="button" className="button" disabled={busy||disabled||(!image&&!canAdd)} onClick={()=>pickFile(nativeInput.current,accepted?"edit":"add")}><Camera size={18}/>{accepted?'Retake this angle':'Take photo'}</button>
        </>}
        <button type="button" className="button outline" disabled={busy||disabled||(!image&&!canAdd)} onClick={()=>pickFile(galleryInput.current,accepted?"edit":"add")}><ImagePlus size={18}/>{accepted?"Replace this angle":"Choose photo"}</button>
        {accepted && !pending && !active && <button type="button" className="button outline" disabled={busy||disabled||!canAdd} onClick={()=>takeAnother("add",true)}>Add another angle</button>}
        {mobile && accepted && !pending && !active && canAdd && <button type="button" className="text-link" disabled={busy||disabled} onClick={()=>pickFile(galleryInput.current,"add")}>Add from photos</button>}
        {active && (
          <button type="button" className="button outline" onClick={stop}>
            <StopCircle size={17} />
            Stop camera
          </button>
        )}
        {image && !active && !pending && (
          <>
            <button
              className="button outline"
              disabled={busy || disabled}
              onClick={() => {
                const r = (rotation + 90) % 360;
                setRotation(r);
                setCrop({ xmin: 0, ymin: 0, xmax: 1, ymax: 1 });
                if (source.current) void prepare(source.current, r, {xmin:0,ymin:0,xmax:1,ymax:1}, "edit");
              }}
            >
              <RotateCw size={16} />
              Rotate
            </button>
            <button
              className="button outline"
              disabled={disabled}
              onClick={() => {
                generation.current++;
                source.current = null;
                URL.revokeObjectURL(url.current);
                setImage(null);
                onClear?.();
              }}
            >
              Remove this photo
            </button>
          </>
        )}
      </div>}
      {/* Keep file inputs mounted so Retake can reopen the picker from photo review. */}
          <input hidden ref={nativeInput} type="file" accept="image/*" capture="environment" onChange={selectedFile}/>
        <input hidden ref={galleryInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={selectedFile}/>
      {accepted && !canAdd && !pending && <p className="small muted">Scan this part now, or remove a view to add another angle.</p>}
      {active && caps.zoom && (
        <label>
          Camera zoom
          <input
            type="range"
            aria-label="Camera zoom"
            min={caps.zoom.min}
            max={caps.zoom.max}
            step={caps.zoom.step || 0.1}
            value={zoom}
            onChange={(e) => {
              const z = Number(e.target.value);
              setZoom(z);
              camera.current
                .setting("zoom", z)
                .catch(() =>
                  setError("Zoom is not available. Move closer instead."),
                );
            }}
          />
        </label>
      )}
      {active && caps.torch && (
        <button
          className="button outline"
          onClick={() => {
            camera.current
              .setting("torch", !torch)
              .then(() => setTorch(!torch))
              .catch(() => setError("The camera light is not available."));
          }}
        >
          {torch ? "Turn light off" : "Turn light on"}
        </button>
      )}
      {image && !pending && (
        <details>
          <summary>
            <Square size={14} /> Crop to one component or marking
          </summary>
          <p>Set the edges as percentages of the rotated photo.</p>
          <div className="scan-crop-fields">
            {(["xmin", "ymin", "xmax", "ymax"] as const).map((k) => (
              <label key={k}>
                {
                  { xmin: "Left", ymin: "Top", xmax: "Right", ymax: "Bottom" }[
                    k
                  ]
                }
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(crop[k] * 100)}
                  onChange={(e) =>
                    setCrop((v) => ({
                      ...v,
                      [k]: Number(e.target.value) / 100,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <button
            className="button outline"
            disabled={busy || disabled || !boxSchema.safeParse(crop).success}
            onClick={() => {
              if (source.current) void prepare(source.current, rotation, crop, "edit");
            }}
          >
            Apply crop
          </button>
        </details>
      )}
      {busy && <p role="status">Preparing photo…</p>}
      {error && (
        <p className="scan-error" role="alert">
          {error}
        </p>
      )}
      {image?.quality.warnings.map((w) => (
        <p className="scan-guidance" key={w}>
          {w}
        </p>
      ))}
      {!secure && <p className="small muted">Take photo opens your phone’s camera. A live camera preview requires HTTPS; photo capture and local comparison are still available here.</p>}
      <p className="small muted">
        Photos stay on this device until you save them. You can resume this scan after reloading.
        Comparison and optional markings recognition run on this device. First comparison downloads about 90 MB of recognition files.
      </p>
    </section>
  );
}
