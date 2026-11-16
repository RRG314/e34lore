"use client";
import { useState } from "react";

/** Call with a key containing src so a different drawing gets a fresh load state. */
export function CatalogDrawingPreview({ src, title }: {
  src?: string;
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="catalog-drawing-preview">
      {src && !failed ? (
        <img
          src={src}
          alt={title + " · source assembly drawing"}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="catalog-drawing-unavailable">
          <strong>
            {failed ? "Source image unavailable" : "No source image registered"}
          </strong>
          <small>Open the assembly to inspect its reference records.</small>
        </span>
      )}
    </span>
  );
}
