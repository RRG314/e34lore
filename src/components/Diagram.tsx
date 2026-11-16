"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Plus,
  Minus,
  RotateCcw,
  Maximize2,
  Move,
  Focus,
  Rotate3D,
} from "lucide-react";
import { parts } from "../data/catalog";
import {
  drawingsForAssembly,
  drawingForPart,
  type TechnicalDrawing,
} from "../data/diagrams";
import { canRenderReferenceModel } from "../digital-twin/model-registry";
import { AssemblyModel } from "./AssemblyModel";
import { useFullscreen } from "./useFullscreen";

export function AssemblyArt({
  assembly = "water-pump",
  transform = "",
}: {
  assembly?: string;
  selected?: string;
  onSelect?: (id: string) => void;
  explosion?: number;
  preview?: boolean;
  transform?: string;
}) {
  const drawing = drawingsForAssembly(assembly)[0];
  return drawing?.image ? (
    <g transform={transform}>
      <image
        href={drawing.image}
        width="900"
        height="560"
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  ) : null;
}
export function PartThumbnail({ id }: { id: string }) {
  const drawing = drawingForPart(id),
    spot = drawing?.hotspots.find((h) => h.partIds.includes(id));
  if (!drawing?.image || !spot) return null;
  const w = drawing.width * Math.max(0.25, spot.width || 0.25),
    h = drawing.height * Math.max(0.25, spot.height || 0.3);
  return (
    <div className="part-thumbnail"><svg
      viewBox={`${spot.x * drawing.width - w / 2} ${spot.y * drawing.height - h / 2} ${w} ${h}`}
      aria-label="Detail from the source illustration"
    >
      <image
        href={drawing.image}
        width={drawing.width}
        height={drawing.height}
      />
    </svg></div>
  );
}
export function Diagram({
  assembly,
  selected,
  onSelect,
  drawingOverride,
  partNames = {},
  modelOverride,
}: {
  assembly: string;
  selected: string;
  onSelect: (id: string) => void;
  drawingOverride?: TechnicalDrawing;
  partNames?: Record<string, string>;
  modelOverride?: {
    assembly: string;
    partId: string;
    onSelect: (id: string) => void;
    isolated?: boolean;
  };
}) {
  const drawing = drawingOverride || drawingsForAssembly(assembly)[0];
  const fullView = useFullscreen();
  const [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [rotation, setRotation] = useState(0),
    [markers, setMarkers] = useState(true),
    [mode, setMode] = useState("drawing");
  const svg = useRef<SVGSVGElement>(null),
    container = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const tap = useRef<{
    id: string;
    x: number;
    y: number;
    multi: boolean;
  } | null>(null);
  const gesture = useRef<{
    center: { x: number; y: number };
    distance: number;
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);
  const live = useRef({ zoom, pan });
  useLayoutEffect(() => { live.current = { zoom, pan }; }, [zoom, pan]);
  const width = drawing?.width || 900,
    height = drawing?.height || 560;
  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };
  const changeZoom = (next: number) =>
    setZoom(Math.min(10, Math.max(0.35, next)));
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((old) =>
        Math.min(10, Math.max(0.35, old * Math.exp(-event.deltaY * 0.0015))),
      );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [mode]);
  function startGesture() {
    const p = [...pointers.current.values()];
    if (!p.length) {
      gesture.current = null;
      return;
    }
    gesture.current = {
      center:
        p.length === 1
          ? p[0]
          : { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 },
      distance: p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0,
      zoom: live.current.zoom,
      pan: live.current.pan,
    };
  }
  function focus() {
    const spot = drawing?.hotspots.find((h) => h.partIds.includes(selected));
    if (!spot) return;
    setRotation(0);
    setZoom(2.8);
    setPan({
      x: (0.5 - spot.x) * width * 2.8,
      y: (0.5 - spot.y) * height * 2.8,
    });
  }
  const modelAvailable = canRenderReferenceModel(
    modelOverride?.assembly || assembly,
  );
  if (drawing && !drawing.image) return <section className="diagram source-only-drawing" aria-label="Source diagram reference">
    <h3>{modelAvailable ? "3D assembly reference" : drawing.label}</h3>
    {modelAvailable && <AssemblyModel
      assembly={modelOverride?.assembly || assembly}
      selected={modelOverride?.partId || selected}
      onSelect={modelOverride?.onSelect || onSelect}
      initialIsolate={modelOverride?.isolated}
    />}
    <a className="button outline" href={drawing.source} target="_blank" rel="noopener noreferrer">Open original diagram ↗</a>
    <p className="small">{drawing.scope}</p>
  </section>;
  if (!drawing)
    return modelAvailable ? (
      <AssemblyModel
        assembly={modelOverride?.assembly || assembly}
        selected={modelOverride?.partId || selected}
        onSelect={modelOverride?.onSelect || onSelect}
        initialIsolate={modelOverride?.isolated}
      />
    ) : (
      <div className="diagram">No registered drawing for this assembly.</div>
    );
  return (
    <div
      className={
        "diagram technical-viewer" +
        (fullView.fallback ? " viewer-expanded" : "")
      }
      ref={container}
      role={fullView.fallback ? "dialog" : undefined}
      aria-modal={fullView.fallback || undefined}
      aria-label={fullView.fallback ? "Expanded assembly viewer" : undefined}
      tabIndex={fullView.fallback ? -1 : undefined}
    >
      <div
        className="technical-view-tabs"
        role="group"
        aria-label="Drawing or model"
      >
        <button
          className={mode === "drawing" || !modelAvailable ? "active" : ""}
          onClick={() => setMode("drawing")}
        >
          {drawing.label}
        </button>
        {modelAvailable && (
          <button
            className={mode === "model" ? "active" : ""}
            onClick={() => setMode("model")}
          >
            <Rotate3D size={16} />
            3D reference model
          </button>
        )}
      </div>
      {mode === "model" && modelAvailable ? (
        <AssemblyModel
          expansion={{
            expanded: fullView.expanded,
            toggle: () => {
              void fullView.toggle(container.current);
            },
          }}
          assembly={modelOverride?.assembly || assembly}
          selected={modelOverride?.partId || selected}
          onSelect={modelOverride?.onSelect || onSelect}
          initialIsolate={modelOverride?.isolated}
        />
      ) : (
        <>
          <div className="diagram-top">
            <span>
              {drawing.id.includes("catalog")
                ? "PARTS CATALOG"
                : "SERVICE MANUAL"}
            </span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <svg
            ref={svg}
            viewBox={`0 0 ${width} ${height}`}
            role="group"
            tabIndex={0}
            aria-label="Technical parts drawing. Drag to pan, scroll or pinch to zoom, and select a component."
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              const step = width * 0.05;
              if (
                [
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "+",
                  "=",
                  "-",
                  "0",
                ].includes(e.key)
              )
                e.preventDefault();
              if (e.key === "+" || e.key === "=") changeZoom(zoom * 1.2);
              if (e.key === "-") changeZoom(zoom / 1.2);
              if (e.key === "0") reset();
              if (e.key === "ArrowLeft")
                setPan((p) => ({ ...p, x: p.x + step }));
              if (e.key === "ArrowRight")
                setPan((p) => ({ ...p, x: p.x - step }));
              if (e.key === "ArrowUp") setPan((p) => ({ ...p, y: p.y + step }));
              if (e.key === "ArrowDown")
                setPan((p) => ({ ...p, y: p.y - step }));
            }}
            onPointerDown={(e) => {
              const hit = (e.target as Element)
                .closest("[data-part-id]")
                ?.getAttribute("data-part-id");
              if (pointers.current.size === 0)
                tap.current = hit
                  ? { id: hit, x: e.clientX, y: e.clientY, multi: false }
                  : null;
              else if (tap.current) tap.current.multi = true;
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              e.currentTarget.setPointerCapture(e.pointerId);
              startGesture();
            }}
            onPointerMove={(e) => {
              if (!pointers.current.has(e.pointerId) || !gesture.current)
                return;
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              const p = [...pointers.current.values()];
              const c =
                p.length === 1
                  ? p[0]
                  : { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
              const s = Math.max(
                width / (svg.current?.clientWidth || width),
                height / (svg.current?.clientHeight || height),
              );
              setPan({
                x: gesture.current.pan.x + (c.x - gesture.current.center.x) * s,
                y: gesture.current.pan.y + (c.y - gesture.current.center.y) * s,
              });
              if (p.length > 1 && gesture.current.distance)
                changeZoom(
                  (gesture.current.zoom *
                    Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)) /
                    gesture.current.distance,
                );
            }}
            onPointerUp={(e) => {
              if (
                tap.current &&
                !tap.current.multi &&
                Math.hypot(
                  e.clientX - tap.current.x,
                  e.clientY - tap.current.y,
                ) < 5
              )
                onSelect(tap.current.id);
              tap.current = null;
              pointers.current.delete(e.pointerId);
              startGesture();
            }}
            onPointerCancel={(e) => {
              pointers.current.delete(e.pointerId);
              startGesture();
            }}
          >
            <rect width={width} height={height} fill="white" />
            <g
              transform={`translate(${width / 2 + pan.x} ${height / 2 + pan.y}) rotate(${rotation}) scale(${zoom}) translate(${-width / 2} ${-height / 2})`}
            >
              <image href={drawing.image} width={width} height={height} />
              {drawing.hotspots.map((spot, i) => {
                const active = spot.partIds.includes(selected),
                  part = parts.find((p) => p.id === spot.partIds[0]),
                  partName =
                    partNames[active ? selected : spot.partIds[0]] ||
                    part?.name ||
                    "Component";
                return (
                  <g
                    key={i}
                    data-part-id={active ? selected : spot.partIds[0]}
                    role="button"
                    tabIndex={0}
                    aria-label={`${spot.label ? "Position " + spot.label + ": " : ""}${partName}`}
                    aria-pressed={active}
                    className={"drawing-hotspot " + (active ? "selected" : "")}
                    onClick={() =>
                      onSelect(
                        spot.partIds.includes(selected)
                          ? selected
                          : spot.partIds[0],
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelect(
                          spot.partIds.includes(selected)
                            ? selected
                            : spot.partIds[0],
                        );
                      }
                    }}
                  >
                    <rect
                      x={(spot.x - (spot.width || 0.065) / 2) * width}
                      y={(spot.y - (spot.height || 0.065) / 2) * height}
                      width={(spot.width || 0.065) * width}
                      height={(spot.height || 0.065) * height}
                      rx={5}
                      className="drawing-hit-area"
                    />
                    {(markers || active) && (
                      <g
                        className="drawing-marker"
                        transform={`translate(${spot.x * width} ${spot.y * height}) scale(${1 / Math.sqrt(zoom)})`}
                      >
                        <circle r={Math.min(width, height) * 0.019} />
                        {spot.label ? (
                          <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={Math.min(width, height) * 0.023}
                          >
                            {spot.label}
                          </text>
                        ) : (
                          <circle
                            r={Math.min(width, height) * 0.005}
                            fill="currentColor"
                          />
                        )}
                      </g>
                    )}
                    <title>{partName}</title>
                  </g>
                );
              })}
            </g>
          </svg>
          <div className="diagram-toolbar">
            <div>
              <button
                className="icon-button"
                aria-label="Zoom out"
                onClick={() => changeZoom(zoom / 1.3)}
                disabled={zoom <= 0.35}
              >
                <Minus size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="Zoom in"
                onClick={() => changeZoom(zoom * 1.3)}
                disabled={zoom >= 10}
              >
                <Plus size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="Fit complete drawing"
                onClick={reset}
              >
                <RotateCcw size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="Focus selected part"
                onClick={focus}
              >
                <Focus size={17} />
              </button>
            </div>
            <label className="drawing-rotation">
              Rotate
              <input
                type="range"
                aria-label="Rotate drawing"
                min="0"
                max="360"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
              />
              {rotation}°
            </label>
            <button
              className="icon-button"
              aria-label={
                fullView.expanded ? "Exit expanded diagram" : "Expand diagram"
              }
              title={
                fullView.expanded ? "Exit expanded diagram" : "Expand diagram"
              }
              onClick={() => fullView.toggle(container.current)}
            >
              <Maximize2 size={17} />
            </button>
          </div>
          <div className="drawing-help">
            <span>
              <Move size={13} />
              Drag · Scroll or pinch to zoom
            </span>
            <label>
              <input
                type="checkbox"
                checked={markers}
                onChange={(e) => setMarkers(e.target.checked)}
              />
              Selection markers
            </label>
          </div>
          <p className="drawing-source">
            <a
              href={drawing.source}
              target={drawing.source.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
            >
              {drawing.credit}
            </a>
            <span>{drawing.scope}</span>
          </p>
        </>
      )}
    </div>
  );
}
