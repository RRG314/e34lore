"use client";
import { previewFeatures } from "../release/features";
import { useEffect, useRef } from "react";
import { useOwnedCars } from "./use-owned-cars";
import { useApp } from "../components/context";
import { sanitizeVehicle, type Vehicle } from "../data/catalog";
import type { ReferenceModel } from "../digital-twin/public/model";
export function configurationGeometry(model: ReferenceModel, vehicle: Vehicle) {
  const hidden = new Set<string>(),
    gaps: string[] = [];
  if ((vehicle.engine && !["M50", "M50TU"].includes(vehicle.engine)) || (!vehicle.engine && vehicle.model && vehicle.model !== "525i")) {
    gaps.push(
      "The installed " +
        (vehicle.engine || vehicle.model + " (installed engine unconfirmed)") +
        " engine and its attached systems have no assembled model in this reference.",
    );
    for (const n of model.nodes)
      if (
        n.id.startsWith("m50:") ||
        n.id.startsWith("m50tu:") ||
        n.systemIds.some((s) => ["system:engine", "system:cooling"].includes(s))
      )
        hidden.add(n.id);
  }
  if (vehicle.body && vehicle.body !== "Sedan") {
    gaps.push(
      "The " +
        vehicle.body +
        " body and interior are not modeled here. The Sedan shell is hidden.",
    );
    for (const n of model.nodes)
      if (
        n.id.startsWith("e34body:") ||
        n.systemIds.includes("system:interior")
      )
        hidden.add(n.id);
  }
  if (vehicle.transmission && /auto/i.test(vehicle.transmission)) {
    gaps.push(
      "Automatic transmission geometry is unavailable; the manual reference is hidden.",
    );
    for (const n of model.nodes)
      if (
        ["e34sys:manual-gearbox", "e34sys:gearbox-crossmember"].includes(n.id)
      )
        hidden.add(n.id);
  }
  if (!vehicle.engine)
    gaps.push(
      "The installed engine is unknown. The M50 reference does not establish what is fitted to this car.",
    );
  return { hidden: [...hidden], gaps };
}
export function WorkshopVehicle({
  model,
  onHidden,
  showSelector = true,
}: {
  model: ReferenceModel | null;
  showSelector?: boolean;
  onHidden: (ids: string[]) => void;
}) {
  const { user } = useApp(),
    owned = useOwnedCars();
  const car = owned.activeId, setCar = owned.selectCar;
  const callback = useRef(onHidden);
  useEffect(() => {
    callback.current = onHidden;
  }, [onHidden]);
  const current = owned.cars.find((c) => c.id === car),
    layer =
      model && current
        ? configurationGeometry(model, sanitizeVehicle(current.configuration))
        : null;
  const key = layer?.hidden.join("|") || "";
  useEffect(() => {
    callback.current(key ? key.split("|") : []);
  }, [key]);
  if (!user || user.is_anonymous || !owned.cars.length) return null;
  return (
    <section className="workshop-owned-context">
      {showSelector && <label>
        Compare with my car
        <select
          value={car}
          onChange={(e) => {
            setCar(e.target.value);

          }}
        >
          <option value="">Explore the 1995 525i Sedan reference</option>
          {owned.cars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nickname}
            </option>
          ))}
        </select>
      </label>}
      {current && (
        <>
          {previewFeatures.vehicleConfiguration && <a href={"/garage/configuration?vehicle=" + car}>Review installed configuration</a>}
          <p className="small">
            This is the available reference geometry, not a measured
            reconstruction of your car. Unsupported installed assemblies are
            hidden.
          </p>
          {layer?.gaps.map((g) => (
            <p className="reference-notice" key={g}>
              {g}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
