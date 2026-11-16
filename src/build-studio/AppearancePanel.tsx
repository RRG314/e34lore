"use client";
import {localWheelPackages} from "./local-wheel-packages";
import { DocumentLink } from "../components/DocumentLink";
import { paintReferences } from "./appearance";
import type { Series } from "../series/registry";
import type { BuildAppearance } from "./schema";
export function AppearancePanel({
  value,
  series = "e34",
  exteriorOnly = false,
  onChange,
}: {
  value: BuildAppearance;
  series?: Series;
  exteriorOnly?: boolean;
  onChange: (
    v: BuildAppearance,
    category:
      | "appearance"
      | "paint"
      | "interior"
      | "wheels"
      | "stance"
      | "engine",
  ) => void;
}) {
  function change(update: (v: BuildAppearance) => void) {
    const next = structuredClone(value);
    update(next);
    const category =
      JSON.stringify(next.paint) !== JSON.stringify(value.paint)
        ? "paint"
        : JSON.stringify(next.wheels) !== JSON.stringify(value.wheels)
          ? "wheels"
          : next.rideHeight !== value.rideHeight
            ? "stance"
            : JSON.stringify(next.engineAccent) !==
                JSON.stringify(value.engineAccent)
              ? "engine"
              : JSON.stringify(next.upholstery) !==
                    JSON.stringify(value.upholstery) ||
                  JSON.stringify(next.trim) !== JSON.stringify(value.trim)
                ? "interior"
                : "appearance";
    onChange(next, category);
  }
  const hasE34Appearance = series === "e34";
  const wheelGroups = series === "e30" ? ["E30"] : ["E34", "M5", "525iX"];
  const paints = hasE34Appearance ? paintReferences : paintReferences.filter(paint => ["181", "252"].includes(paint.code));
  const wheelSource=localWheelPackages.find(wheel=>wheel.id===value.wheels.packageId);
  return (
    <section aria-label="Visual customization" className="build-fields">
      <fieldset>
        <legend>Paint</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={value.paint.enabled}
            onChange={(e) =>
              change((v) => {
                v.paint.enabled = e.target.checked;
              })
            }
          />
          Custom paint preview
        </label>
        <label>
          BMW paint reference
          <select
            value={value.paint.factoryCode || ""}
            onChange={(e) => {
              const p = paints.find((p) => p.code === e.target.value);
              change((v) => {
                v.paint.factoryCode = p?.code || null;
                if (p) {
                  v.paint.enabled = true;
                  v.paint.color = p.color;
                  v.paint.finish = p.finish;
                }
              });
            }}
          >
            <option value="">Custom color</option>
            {paints.map((p) => (
              <option value={p.code} key={p.code}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Paint color
            <input
              aria-label="Paint color"
              type="color"
              value={value.paint.color}
              onChange={(e) =>
                change((v) => {
                  v.paint.enabled = true;
                  v.paint.color = e.target.value;
                  v.paint.factoryCode = null;
                })
              }
            />
          </label>
          <label>
            Paint finish
            <select
              value={value.paint.finish}
              onChange={(e) =>
                change((v) => {
                  v.paint.enabled = true;
                  v.paint.finish = e.target
                    .value as BuildAppearance["paint"]["finish"];
                })
              }
            >
              {["gloss", "satin", "matte", "metallic"].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="small muted">
          Color preview only. Check your car’s paint code before ordering.
        </p>
        {value.paint.factoryCode && (
          <DocumentLink
            className="text-link small"
            href={
              paints.find((p) => p.code === value.paint.factoryCode)
                ?.source
            }
          >
            Paint name and code reference ↗
          </DocumentLink>
        )}
      </fieldset>
      {!exteriorOnly && <fieldset>
        <legend>{hasE34Appearance ? "Cabin & engine bay" : "Cabin"}</legend>
        {(["upholstery", "trim", "engineAccent"] as const).filter(key => hasE34Appearance || key !== "engineAccent").map((key) => (
          <div className="build-material" key={key}>
            <label className="check">
              <input
                type="checkbox"
                checked={value[key].enabled}
                onChange={(e) =>
                  change((v) => {
                    v[key].enabled = e.target.checked;
                  })
                }
              />
              {key === "upholstery"
                ? "Seat upholstery"
                : key === "trim"
                  ? "Door & cabin trim"
                  : "Engine cover accent"}
            </label>
            <input
              type="color"
              aria-label={key + " color"}
              value={value[key].color}
              onChange={(e) =>
                change((v) => {
                  v[key].enabled = true;
                  v[key].color = e.target.value;
                })
              }
            />
          </div>
        ))}
        <label>
          Upholstery finish
          <select
            value={value.upholstery.finish}
            onChange={(e) =>
              change((v) => {
                v.upholstery.enabled = true;
                v.upholstery.finish = e.target.value as "fabric" | "leather";
              })
            }
          >
            <option value="fabric">Fabric</option>
            <option value="leather">Leather appearance</option>
          </select>
        </label>
        {hasE34Appearance && <p className="small muted">
          Use the viewer’s cabin and engine views to inspect these changes.
          Dashboard markings and controls stay original. Some Touring surfaces
          aren’t separated in the source model.
        </p>}
      </fieldset>}
      {(hasE34Appearance || !exteriorOnly) && <fieldset>
        <legend>Wheels & stance</legend>
        <label>
          Wheel preview
          <select
            aria-label="Wheel preview"
            value={value.wheels.packageId}
            onChange={(e) =>
              change((v) => {
                v.wheels.packageId = e.target
                  .value as BuildAppearance["wheels"]["packageId"];
              })
            }
          >
            <option value="reference">Reference wheel</option>
            {wheelGroups.map(group=>{
              const options=localWheelPackages.filter(wheel=>wheel.group===group);
              return options.length>0&&<optgroup key={group} label={group==="E34"||group==="E30"?group+" factory styles":group}>
                {options.map(wheel=><option key={wheel.id} value={wheel.id}>{wheel.label} · {wheel.dimensions}</option>)}
              </optgroup>;
            })}
            {hasE34Appearance&&<optgroup label="Earlier previews">
              <option value="e34-original-ten-spoke-v1">Original ten-spoke study</option>
              <option value="e34-artist-wheel-v1">Licensed artist wheel</option>
            </optgroup>}
          </select>
        </label>
        {wheelSource&&<p className="small muted">{wheelSource.number&&<DocumentLink href={'/parts/catalog?q='+wheelSource.number}>BMW {wheelSource.number} · </DocumentLink>}<a href={wheelSource.source} target="_blank" rel="noreferrer">Wheel reference ↗</a></p>}
        <label className="check">
          <input
            type="checkbox"
            checked={!!value.wheels.finishEnabled}
            disabled={value.wheels.packageId === "e34-artist-wheel-v1"}
            onChange={(e) =>
              change((v) => {
                v.wheels.finishEnabled = e.target.checked;
              })
            }
          />
          Custom wheel finish
        </label>
        <label>
          Wheel finish
          <input
            type="color"
            aria-label="Wheel finish"
            disabled={value.wheels.packageId === "e34-artist-wheel-v1"}
            value={value.wheels.color}
            onChange={(e) =>
              change((v) => {
                v.wheels.color = e.target.value;
                v.wheels.finishEnabled = true;
              })
            }
          />
        </label>
        <label>
          Wheel and tire scale{" "}
          <output>{Math.round(value.wheels.scale * 100)}%</output>
          <input
            type="range"
            min="0.9"
            max="1.12"
            step="0.01"
            value={value.wheels.scale}
            onChange={(e) =>
              change((v) => {
                v.wheels.scale = Number(e.target.value);
              })
            }
          />
        </label>
        <label>
          Tire width preview{" "}
          <output>{Math.round(value.wheels.widthScale * 100)}%</output>
          <input
            type="range"
            min="0.85"
            max="1.15"
            step="0.01"
            value={value.wheels.widthScale}
            onChange={(e) =>
              change((v) => {
                v.wheels.widthScale = Number(e.target.value);
              })
            }
          />
        </label>
        <label>
          Exterior stance{" "}
          <output>
            {value.rideHeight === 0
              ? "Reference"
              : value.rideHeight < 0
                ? "Lower"
                : "Higher"}
          </output>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.1"
            value={value.rideHeight}
            onChange={(e) =>
              change((v) => {
                v.rideHeight = Number(e.target.value);
              })
            }
          />
        </label>
        <p className="small muted">
          Appearance studies, not product dimensions. Stance moves the body
          only; suspension geometry and clearances aren’t calculated. Record
          actual wheel and tire specifications under Parts.
        </p>
      </fieldset>}
      <label>
        Render quality
        <select
          value={value.quality}
          onChange={(e) =>
            change((v) => {
              v.quality = e.target.value as BuildAppearance["quality"];
            })
          }
        >
          <option value="low">Low · phone battery</option>
          <option value="balanced">Balanced</option>
          <option value="high">High</option>
        </select>
      </label>
      {hasE34Appearance && <details>
        <summary>Preview coverage & credits</summary>
        <p>
          Paint, supported seats and trim, engine cover colors, wheel packages
          and exterior stance are rendered. Seat replacements, dashboard
          veneers, body kits, bumpers, spoilers, grilles, lights, exhaust and
          engine swaps are plan-only until suitable geometry is added.
        </p>
        <p>
          Original ten-spoke study: E34 Lore, CC0. Artist wheel: Uralvagonzavod
          / UVZZZ, CC BY 4.0, adapted for this reference. Neither is a
          documented commercial wheel.
        </p>
        <DocumentLink href="/models/e34-525i/LICENSE.md">
          Original model and artist-wheel credits ↗
        </DocumentLink>
      </details>}
    </section>
  );
}
