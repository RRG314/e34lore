"use client";
import { useState, useCallback } from "react";
import { ChevronDown, Car, Check } from "lucide-react";
import { emptyVehicle, type Vehicle } from "../data/catalog";
import { seriesDefinitions, seriesYears } from "../series/registry";
import { useApp } from "./context";
import { Modal, Notice } from "./common";
import { useOwnedCars } from "../vehicle/use-owned-cars";
export function VehiclePicker() {
  const { vehicle, setVehicle, toast, series } = useApp();
  const owned = useOwnedCars();
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(vehicle);
  const close = useCallback(() => setOpen(false), []);
  const change = (key: keyof Vehicle, value: string) =>
    setDraft((v) => ({
      ...v,
      [key]: value,
      ...(key === "model" ? { engine: "" } : {}),
    }));
  const {models,bodies}=seriesDefinitions[series];
  const model = models.find((m) => m.id === draft.model);
  return (
    <>
      <button
        className="vehicle-picker"
        onClick={() => {
          setDraft(vehicle);
          setOpen(true);
        }}
      >
        <Car size={19} />
        <span>
          <small>{owned.selected ? owned.selected.nickname : 'YOUR '+series.toUpperCase()}</small>
          {vehicle.model
            ? [vehicle.year, "BMW", vehicle.model, vehicle.engine]
                .filter(Boolean)
                .join(" ")
            : "Select your vehicle"}
        </span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <Modal title={"Select your "+series.toUpperCase()} onClose={close}>
          {owned.cars.length > 0 && <label>From My garage<select aria-label="Use a garage car" value={owned.activeId} onChange={e => { owned.selectCar(e.target.value); if (e.target.value) { close(); toast('Car selected.'); } }}><option value="">General vehicle reference</option>{owned.cars.map(c => <option key={c.id} value={c.id}>{c.nickname}</option>)}</select></label>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              owned.selectCar('');
              setVehicle(draft);
              close();
              toast(
                "Car updated.",
              );
            }}
          >
            <div className="form-grid">
              <label>
                Model
                <select
                  required
                  value={draft.model}
                  onChange={(e) => change("model", e.target.value)}
                >
                  <option value="">Choose model</option>
                  {models.map((m) => (
                    <option key={m.id}>{m.id}</option>
                  ))}
                </select>
              </label>
              <label>
                Installed engine
                <select
                  value={draft.engine}
                  onChange={(e) => change("engine", e.target.value)}
                >
                  <option value="">Unknown</option>
                  {model?.engines.map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </label>
              <label>
                Production year
                <select
                  value={draft.year}
                  onChange={(e) => change("year", e.target.value)}
                >
                  <option value="">Unknown</option>
                  {seriesYears(series).map(
                    (y) => (
                      <option key={y}>{y}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Production month
                <select
                  value={draft.month}
                  onChange={(e) => change("month", e.target.value)}
                >
                  <option value="">Unknown</option>
                  {Array.from({ length: 12 }, (_, i) =>
                    String(i + 1).padStart(2, "0"),
                  ).map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label>
                Sales market
                <select
                  value={draft.market}
                  onChange={(e) => change("market", e.target.value)}
                >
                  <option value="">Unknown</option>
                  <option value="USA">United States</option>
                  <option value="EUR">Europe</option>
                  <option value="OTHER">Other / not established</option>
                </select>
              </label>
              <label>
                Body style
                <select
                  value={draft.body}
                  onChange={(e) => change("body", e.target.value)}
                >
                  <option value="">Unknown</option>
                  {bodies.map(body => <option key={body}>{body}</option>)}
                </select>
              </label>
              <label>
                Transmission
                <select
                  value={draft.transmission}
                  onChange={(e) => change("transmission", e.target.value)}
                >
                  <option value="">Unknown</option>
                  <option>Manual</option>
                  <option>Automatic</option>
                </select>
              </label>
              <label>
                Steering
                <select
                  value={draft.steering}
                  onChange={(e) => change("steering", e.target.value)}
                >
                  <option value="">Unknown</option>
                  <option>Left-hand drive</option>
                  <option>Right-hand drive</option>
                </select>
              </label>
            </div>
            <Notice>
              These are owner-entered details. No VIN decoding or factory-option
              inference is performed.
            </Notice>
            <div className="form-actions">
              <button
                className="button quiet"
                type="button"
                onClick={() => {setDraft(emptyVehicle);setVehicle(emptyVehicle);close();toast("No vehicle selected. Browsing all E34 references.");}}
              >
                Clear vehicle
              </button>
              <button className="button primary">
                <Check size={17} />
                Use this vehicle
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
