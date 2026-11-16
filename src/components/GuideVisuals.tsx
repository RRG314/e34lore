"use client";
import { useCallback,useState } from "react";
import { Modal } from "./common";
import {DocumentLink} from './DocumentLink';
import enginePhotos from "../data/engine-photos.json";
import { technicalDrawings } from "../data/diagrams";
import { ArrowUpRight } from "lucide-react";

const guideDrawingIds: Record<string, string> = {
  "m50-water-pump-job-planning": "water-pump-catalog",
  "front-strut-component-identification": "strut-upper-catalog",
};

function SourceImage({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  const [open, setOpen] = useState(false),
    [zoom, setZoom] = useState(1),[failed,setFailed]=useState(false);
  // An SSR image may fail before hydration attaches onError. Inspect its actual
  // load state at mount as well as handling later errors.
  const imageRef=useCallback((image:HTMLImageElement|null)=>{if(image?.complete&&!image.naturalWidth)setFailed(true)},[]);
  if(failed)return <p role="status">The reference image could not load. Its source and manual references are still available below. <button className="text-link" onClick={()=>{setOpen(false);setFailed(false)}}>Retry image</button></p>;
  return (
    <>
      <button
        className="source-image-button"
        aria-label={"Enlarge " + alt}
        onClick={() => {
          setZoom(1);
          setOpen(true);
        }}
      >
        <img ref={imageRef} src={src} alt={alt} width={width} height={height} loading="lazy" onError={()=>setFailed(true)}/>
        <span>Enlarge image ↗</span>
      </button>
      {open && (
        <Modal wide title={alt} onClose={() => setOpen(false)}>
          <div className="inline-tags">
            <button
              className="button outline"
              disabled={zoom <= 1}
              onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
            >
              Zoom out
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              className="button outline"
              disabled={zoom >= 4}
              onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
            >
              Zoom in
            </button>
            <a href={src} target="_blank" rel="noreferrer">
              Open original ↗
            </a>
          </div>
          <div
            className="source-image-viewport"
            tabIndex={0}
            aria-label="Enlarged image; scroll to pan"
          >
            <img
              src={src}
              ref={imageRef}
              alt={alt}
              onError={()=>setFailed(true)}
              style={{
                width: zoom * 100 + "%",
                maxWidth: "none",
                height: "auto",
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}

function guideFigure(slug: string) {
  const drawing = technicalDrawings.find((d) => d.id === guideDrawingIds[slug]);
  return drawing && { ...drawing, title: drawing.label };
}

export function GuidePreview({ slug }: { slug: string }) {
  const photo =
    (slug === "identify-your-engine" || slug === "m50-engine-oil-and-filter")
      ? enginePhotos.find((p) => p.family === "M50")
      : undefined;
  const figure = guideFigure(slug);
  if (!photo && !figure?.image) return null;
  return (
    <div
      className={"guide-preview " + (photo ? "photograph" : "source-drawing")}
    >
      <img
        src={photo?.localPath || figure!.image}
        alt={photo?.title || figure!.title}
        width={photo?.width || figure!.width}
        height={photo?.height || figure!.height}
        loading="lazy"
      />
      <span>
        {photo ? `${photo.creator} · ${photo.license}` : figure!.credit}
      </span>
    </div>
  );
}

export function EnginePhotoCredits() {
  return (
    <div className="engine-photo-credits">
      {enginePhotos.map((p) => (
        <p key={p.family}>
          <a href={p.filePageUrl} target="_blank" rel="noreferrer">
            {p.title}
          </a>{" "}
          — {p.creator} ·{" "}
          <a href={p.licenseUrl} target="_blank" rel="noreferrer">
            {p.license}
          </a>
          . Original photograph, unchanged.
        </p>
      ))}
    </div>
  );
}

export function GuideSourceVisual({ slug }: { slug: string }) {
  if (slug === "e30-rear-lamp-bulb") {
    return <figure className="guide-source-figure">
      <svg viewBox="0 0 660 270" width="660" height="270" style={{maxWidth:"100%",height:"auto"}} role="img" aria-labelledby="e30-lamp-access-title">
        <title id="e30-lamp-access-title">Left rear lamp and trunk-side access cover on the late E30 coupe</title>
        <rect width="660" height="270" rx="7" fill="#f0f1e9"/>
        <g fill="#243b30" fontFamily="sans-serif" fontSize="16" fontWeight="600">
          <text x="36" y="41">Rear view</text>
          <text x="369" y="41">Inside the trunk</text>
        </g>
        <path d="M36 113q23-21 51-21h210v110H52q-13 0-16-14z" fill="#a4afb0" stroke="#3d5752" strokeWidth="2"/>
        <path d="M49 121q7-9 21-9l200 1 9 62-204 4q-24 1-26-13z" fill="#9e3030" stroke="#263b31" strokeWidth="4"/>
        <path d="M50 121q11-11 43-9v66H74q-24 0-24-13z" fill="#c87928" stroke="#74451e" strokeWidth="2"/>
        <path d="M153 113v64m58-64v64" stroke="#76272a" strokeWidth="2"/>
        <path d="M226 136h43l3 14h-46z" fill="#e7e4d3"/>
        <path d="M380 110q7-13 29-15h202q14 1 16 14v68q-2 16-15 18H396q-16-3-17-17z" fill="#3b4b44" stroke="#243b30" strokeWidth="3"/>
        <path d="M396 114h208v63H396z" fill="none" stroke="#839486" strokeWidth="2"/>
        <circle cx="502" cy="146" r="17" fill="#e2ddc8" stroke="#263b31" strokeWidth="2"/>
        <path d="M491 146h22m4-29q23 7 23 29m-1-2 6-9m-6 9-9-4" stroke="#bc6334" fill="none" strokeWidth="3" strokeLinecap="round"/>
        <path d="M501 167v55" stroke="#bc6334" fill="none" strokeWidth="2"/>
        <text x="502" y="246" textAnchor="middle" fill="#243b30" fontFamily="sans-serif" fontSize="16">Release the cover fastener</text>
      </svg>
      <figcaption><strong>Trunk-side access</strong><p>Original orientation drawing for the late coupe. Compare the installed cover and bulb carrier with the parts diagram.</p>
        <DocumentLink href="https://www.bmwpartsdeal.com/parts-list/1991-bmw-325i-coupe_e30/lighting/rear_light.html" className="text-link">Rear lamp catalog diagram <ArrowUpRight size={14}/></DocumentLink>
      </figcaption>
    </figure>;
  }

  if (slug === "factory-halogen-headlight-bulb")
    return (
      <figure className="guide-source-figure">
        <SourceImage
          src="/assets/guides/halogen-quarter-turn.svg"
          alt="Viewed from behind the headlight, rotate the factory twist-lock bulb left to release and right to secure"
          width={640}
          height={284}
        />
        <figcaption>
          <strong>Twist-lock bulb · rear view</strong>
          <p>Original orientation diagram. Check the mount against Bentley 630 before turning it.</p>
          <DocumentLink className="text-link" href="/manual/630">Exterior lighting source <ArrowUpRight size={14} /></DocumentLink>
        </figcaption>
      </figure>
    );
  if (slug === "identify-your-engine")
    return (
      <section aria-labelledby="engine-examples">
        <h2 id="engine-examples">Engine-family reference photographs</h2>
        <p className="walkthrough-visual-note">
          Use these as examples alongside identification records and the
          installed hardware. A photograph alone does not establish the engine
          or precise variant in your car.
        </p>
        <div className="engine-photo-grid">
          {enginePhotos.map((p) => (
            <figure className="engine-photo-card" key={p.family}>
              <SourceImage
                src={p.localPath}
                alt={p.title}
                width={p.width}
                height={p.height}
              />
              <figcaption>
                <h3>
                  {p.family}
                  {p.family === "M50" ? " family" : ""}
                </h3>
                <p>{p.title}</p>
                <p>
                  {p.family === "M20"
                    ? "Native 640 × 480 image; fine identification detail is limited."
                    : p.family === "M30"
                      ? "An oblique example; the intake partly obscures the engine."
                      : "The source establishes the family; the precise M50/M50TU variant is not certified by this photograph."}
                </p>
                <small>
                  {p.creator} ·{" "}
                  <a href={p.licenseUrl} target="_blank" rel="noreferrer">
                    {p.license}
                  </a>
                  <br />
                  <a href={p.filePageUrl} target="_blank" rel="noreferrer">
                    Source & attribution ↗
                  </a>{" "}
                  · Original, unchanged
                </small>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    );
  const figure = guideFigure(slug);
  if (!figure) return null;
  if (!figure.image) return <figure className="guide-source-figure"><figcaption><strong>{figure.title}</strong><p>{figure.scope}</p><a href={figure.source} target="_blank" rel="noopener noreferrer">Open the original diagram ↗</a></figcaption></figure>;
  return (
    <figure className="guide-source-figure">
      <SourceImage
        src={figure.image}
        alt={figure.title + " with the source’s original callouts"}
        width={figure.width}
        height={figure.height}
      />
      <figcaption>
        <strong>{figure.title}</strong>
        <p>{figure.scope}</p>
        <p>
          {figure.credit}. Native source figure; applicability follows the
          source.
        </p>
        <a
          className="text-link"
          href={figure.source}
          target="_blank"
          rel="noreferrer"
        >
          Source & attribution <ArrowUpRight size={14} />
        </a>{" "}
        <DocumentLink
          className="text-link"
          href={"/parts/reference?assembly=" + figure.assembly}
        >
          Open the interactive drawing <ArrowUpRight size={14} />
        </DocumentLink>
      </figcaption>
    </figure>
  );
}
