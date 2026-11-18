"use client";
import { useEffect, useState } from "react";
import { Copy, Share2, Check } from "lucide-react";
import { publicShareUrl } from "../domain/identity";

export function ShareControls({
  title,
  href,
  copyLabel,
}: {
  title: string;
  href?: string;
  copyLabel?: string;
}) {
  return <Controls key={JSON.stringify([title,href])} title={title} href={href} copyLabel={copyLabel}/>;
}
function Controls({title,href,copyLabel}:{title:string;href?:string;copyLabel?:string}){
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const [message, setMessage] = useState("");
  const link = () => publicShareUrl(href||location.href,import.meta.env.DEV?location.origin:undefined);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 3000);
    return () => clearTimeout(timer);
  }, [copied]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url!);
      setCopied(true);
      setMessage("Link copied.");
    } catch {
      setManual(true);
      setMessage("Select and copy the link below.");
    }
  }
  return (
    <div className="share-controls" aria-label="Share public content">
      <div className="share-actions">
        {!copyLabel&&<button
          type="button"
          className="button outline compact"
          onClick={async () => {
            // Resolve at click time so drawing/step navigation is reflected.
            const current = link();
            if (!current) return;
            setUrl(current);
            if (!navigator.share) {
              setManual(true);
              return;
            }
            try {
              await navigator.share({ title, url: current });
            } catch (e) {
              if ((e as Error).name !== "AbortError") {
                setManual(true);
                setMessage("Use the link below to share.");
              }
            }
          }}
        >
          <Share2 size={15} />
          Share
        </button>}
        <button
          type="button"
          className="button outline compact"
          onClick={async () => {
            const current = link();
            if (!current) return;
            try {
              await navigator.clipboard.writeText(current);
              setCopied(true);
              setMessage("Link copied.");
            } catch {
              setUrl(current);
              setManual(true);
              setMessage("Select and copy the link below.");
            }
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
          {copied ? "Copied" : copyLabel||"Copy link"}
        </button>
      </div>
      {manual && (
        <div className="share-link-panel">
          <label>
            Public link
            <input
              readOnly
              value={url||""}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <a
            href={
              "mailto:?" + new URLSearchParams({ subject: title, body: url||"" })
            }
          >
            Share by email
          </a>
          <button type="button" className="text-link" onClick={copy}>
            Copy
          </button>
          <button
            type="button"
            className="text-link"
            onClick={() => setManual(false)}
          >
            Close
          </button>
        </div>
      )}
      <span role="status" className="small muted">
        {message}
      </span>
    </div>
  );
}
