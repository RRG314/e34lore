"use client";
import type {OwnedVehicle} from "../domain/owner-records";
import { useState } from "react";
import { db, useApp } from "./context";
import { displayModel, modelKey, seriesDefinitions, seriesForModel } from "../series/registry";
import { sanitizeVehicle } from "../data/catalog";
import { Notice } from "./common";
export function VehicleDetails({
  car,
  onChanged,
}: {
  car: OwnedVehicle;
  onChanged: () => void;
}) {
  const { toast } = useApp();
  const series = seriesForModel(car.model_id), definition = seriesDefinitions[series];
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <details className="vehicle-details">
      <summary>Edit vehicle details & private notes</summary>
      <p>
        Record the car as it is today, including swaps or changes. Shared garage
        descriptions update only when you republish them.
      </p>
      <form
        key={
          car.id +
          JSON.stringify(car.configuration) +
          car.private_notes +
          car.mileage
        }
        onSubmit={async (e) => {
          e.preventDefault();
          if(busy)return;
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          const configuration = sanitizeVehicle(
            Object.fromEntries(
              [
                "model",
                "engine",
                "year",
                "month",
                "market",
                "body",
                "transmission",
                "steering",
              ].map((k) => [k, String(f.get(k) || "")]),
            ),
          );
          const abort=new AbortController(),deadline=setTimeout(()=>abort.abort(),15000);
          try {
          const r = await db
            .from("owned_vehicles")
            .update({
              nickname: f.get("nickname"),
              model_id: modelKey(series,configuration.model),
              configuration,
              mileage: f.get("mileage") ? Number(f.get("mileage")) : null,
              mileage_unit: f.get("mileage_unit"),
              exterior_color: f.get("exterior_color"),
              interior_trim: f.get("interior_trim"),
              private_notes: f.get("private_notes"),
            })
            .eq("id", car.id).abortSignal(abort.signal);
          if (r.error) setError("The update could not be confirmed. Reload your garage before trying again.");
          else {
            toast("Private vehicle details saved.");
            onChanged();
          }
          } catch {setError("The update could not be confirmed. Reload your garage before trying again.");}
          finally {clearTimeout(deadline);setBusy(false);}
        }}
      >
        <div className="form-grid">
          <label>
            Nickname
            <input
              name="nickname"
              maxLength={80}
              required
              defaultValue={car.nickname}
            />
          </label>
          <label>
            Model
            <select name="model" defaultValue={displayModel(car.model_id)}>
              {definition.models.map((m) => (
                <option key={m.id}>{m.id}</option>
              ))}
            </select>
          </label>
          <label>
            Installed engine
            <input
              name="engine"
              maxLength={80}
              defaultValue={car.configuration.engine}
            />
          </label>
          <label>
            Production year
            <input
              name="year"
              type="number"
              min={definition.years[0]}
              max={definition.years[1]}
              defaultValue={car.configuration.year}
            />
          </label>
          <label>
            Production month
            <input
              name="month"
              type="number"
              min={1}
              max={12}
              defaultValue={car.configuration.month}
            />
          </label>
          <label>
            Body style
            <select name="body" defaultValue={car.configuration.body || ""}>
              <option value="">Unknown</option>
              {definition.bodies.map(body => <option key={body}>{body}</option>)}
            </select>
          </label>
          {(["market", "transmission", "steering"] as const).map((k) => (
            <label key={k}>
              {k[0].toUpperCase() + k.slice(1)}
              <input
                name={k}
                maxLength={80}
                defaultValue={car.configuration[k]}
              />
            </label>
          ))}
          <label>
            Exterior color / paint code
            <input
              name="exterior_color"
              maxLength={100}
              defaultValue={car.exterior_color}
            />
          </label>
          <label>
            Interior / trim code
            <input
              name="interior_trim"
              maxLength={100}
              defaultValue={car.interior_trim}
            />
          </label>
          <label>
            Recorded odometer
            <input
              name="mileage"
              type="number"
              min={0}
              step="any"
              defaultValue={car.mileage ?? ""}
            />
          </label>
          <label>
            Distance units
            <select name="mileage_unit" defaultValue={car.mileage_unit}>
              <option value="mi">Miles</option>
              <option value="km">Kilometers</option>
            </select>
          </label>
        </div>
        <label>
          Private vehicle notes
          <textarea
            name="private_notes"
            rows={5}
            maxLength={12000}
            defaultValue={car.private_notes}
          />
        </label>
        {error && <Notice tone="warning">{error}</Notice>}
        <button className="button outline" disabled={busy}>
          Save vehicle details
        </button>
      </form>
    </details>
  );
}
