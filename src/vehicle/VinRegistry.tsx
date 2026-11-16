"use client";

import {useEffect, useState} from "react";
import {PageIntro} from "../components/common";
import {DocumentLink} from "../components/DocumentLink";
import {db, useApp} from "../components/context";
import {validateVin} from "./configuration";
import {decodeVinVehicle, maskedVinPattern} from "./vin-registry";
import {rememberVehicle} from "../lib/app-state";
import {seriesHref} from "../series/registry";
import {useOwnedCars} from "./use-owned-cars";

type SavedVin = {vehicle_id: string; vin: string};

export function VinRegistry({initialCar}: {initialCar?: string}) {
  const {user, authReady, seriesEnabled} = useApp();
  const {cars, selected, selectCar, loading: carsLoading} = useOwnedCars();
  const owner = user?.is_anonymous ? "" : user?.id || "";
  const [choice, setChoice] = useState(initialCar || "");
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState<SavedVin[] | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [decoded, setDecoded] = useState<ReturnType<typeof decodeVinVehicle>>(null);
  const car = cars.find(row => row.id === choice) || selected || cars[0];
  const existing = saved?.find(row => row.vehicle_id === car?.id);
  const vin = validateVin(input);

  useEffect(() => {
    if (!owner) return;
    const abort = new AbortController();
    void (async () => {
      try {
        const result = await db.from("vehicle_vins").select("vehicle_id,vin").eq("user_id",owner)
          .abortSignal(AbortSignal.any([abort.signal,AbortSignal.timeout(12000)]));
        if (abort.signal.aborted) return;
        if (result.error) throw result.error;
        setSaved(result.data || []);
      } catch {
        if (!abort.signal.aborted) setError("Your saved VINs could not load. Reload to try again.");
      }
    })();
    return () => abort.abort();
  }, [owner]);

  function changeCar(value: string) {
    setChoice(value);
    setInput("");
    setDecoded(null);
    setError("");
    setStatus("");
  }

  async function lookup(value: string) {
    const pattern = maskedVinPattern(value);
    if (!pattern || busy) return;
    setDecoded(null);
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/" +
        encodeURIComponent(pattern) + "?format=json", {
        signal: AbortSignal.timeout(12000), credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store",
      });
      if (!response.ok) throw Error("VIN lookup is unavailable.");
      const payload = await response.json() as {Results?:Record<string,unknown>[]};
      const result = decodeVinVehicle(payload?.Results?.[0] || {});
      const supported = result && (result.series === "e34" || seriesEnabled);
      setDecoded(supported ? result : null);
      if (!supported) setStatus(seriesEnabled
        ? "No supported E30 or E34 matched this VIN. Choose the model, year and body in the catalog."
        : "No supported E34 matched this VIN. Choose the model, year and body in the catalog.");
    } catch {
      setError("VIN lookup could not finish. You can choose your car in the catalog.");
    } finally {
      setBusy(false);
    }
  }

  async function changeSaved(remove: boolean) {
    if (!owner || !car || !saved || busy || (!remove && !vin.valid)) return;
    if (remove && !window.confirm("Remove the VIN from this garage car?")) return;
    const vehicleId = car.id;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const table = db.from("vehicle_vins");
      const action = remove ? table.delete().eq("vehicle_id",vehicleId).eq("user_id",owner)
        : table.upsert({vehicle_id:vehicleId,vin:vin.vin},{onConflict:"vehicle_id"});
      const {data,error} = await action.select("vehicle_id,vin").abortSignal(AbortSignal.timeout(12000));
      if (error || !data?.length) {
        if (error?.code === "23505") throw Error("That VIN is already saved to another car in your garage.");
        throw Error("Your VIN change could not be saved. Try signing in again.");
      }
      setSaved(rows => [...(rows || []).filter(row => row.vehicle_id !== vehicleId), ...(remove ? [] : data)]);
      setInput("");
      setStatus(remove ? "VIN removed from this car." : "VIN saved privately to this car.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your VIN change could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="page vehicle-configuration">
    <PageIntro eyebrow="MY GARAGE" title="VIN registry" description="Save a VIN privately or look up the basic model to browse its parts."/>
    <p><DocumentLink href="/garage">Back to My Garage</DocumentLink></p>
    {owner ? <>
      {car ? <label>Garage car<select value={car.id} disabled={busy} onChange={event => changeCar(event.target.value)}>
        {cars.map(row => <option key={row.id} value={row.id}>{row.nickname}</option>)}
      </select></label> : !carsLoading && <p><DocumentLink href="/garage">Add a car to save its VIN</DocumentLink></p>}
      {existing && <div className="inline-tags">
        <span>Saved VIN ending in {existing.vin.slice(-4)}</span>
        <button type="button" className="button outline" disabled={busy} onClick={() => void lookup(existing.vin)}>Look up saved VIN</button>
        <button type="button" className="text-link" disabled={busy} onClick={() => void changeSaved(true)}>Remove saved VIN</button>
      </div>}
    </> : authReady && <p><DocumentLink href="/account?next=%2Fgarage%2Fvins">Sign in to save a VIN in My Garage</DocumentLink></p>}
      <label>17-character VIN<input value={input} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={17} disabled={busy || !authReady}
        onChange={event => {setInput(event.target.value.toUpperCase());setDecoded(null);setStatus("");setError("");}}/></label>
      {!!input && !vin.valid && <p>Use 17 characters. VINs omit I, O and Q.</p>}
      <p className="small">Saved VINs are private. Lookup sends a masked pattern to NHTSA with the serial number removed.</p>
      <div className="inline-tags">
        <button type="button" className="button primary" disabled={busy || !authReady || !vin.valid} onClick={() => void lookup(input)}>Look up vehicle</button>
        {owner && car && <button type="button" className="button outline" disabled={busy || !vin.valid || !saved} onClick={() => void changeSaved(false)}>{existing ? "Replace saved VIN" : "Save VIN to this car"}</button>}
      </div>
      {error && <p role="alert">{error}</p>}
      {(busy || status) && <p role="status">{busy ? "Working…" : status}</p>}
      {decoded && <section aria-label="VIN lookup result">
        <h2>{[decoded.vehicle.year, decoded.vehicle.model, decoded.vehicle.body].filter(Boolean).join(" ")}</h2>
        <p>{[decoded.vehicle.engine, decoded.vehicle.transmission].filter(Boolean).join(" · ") || "Check the engine, transmission and build date on the car."} Source: NHTSA vPIC.</p>
        <DocumentLink href={seriesHref("/parts/catalog?vehicle=", decoded.series)} className="button primary" onClick={() => {
          selectCar("");
          rememberVehicle(decoded.series, decoded.vehicle);
        }}>Browse {decoded.series.toUpperCase()} parts</DocumentLink>
      </section>}
      <details>
        <summary>How to read a BMW VIN</summary>
        <p>Find the VIN in your registration documents, at the windscreen, or in the engine compartment. For U.S. cars, read the 17 characters in these groups.</p>
        <dl>
          <dt>1–3 · Manufacturer</dt><dd>Identifies the manufacturer and vehicle type.</dd>
          <dt>4–8 · Vehicle description</dt><dd>BMW uses these positions for attributes such as model and body. The codes depend on the vehicle and market.</dd>
          <dt>9 · Check digit</dt><dd>Helps catch typing errors. It is a digit or X on U.S. VINs.</dd>
          <dt>10–11 · Model year and plant</dt><dd>For these U.S. cars, M represents model year 1991 and S represents 1995. Use the production label for the build month.</dd>
          <dt>12–17 · Serial</dt><dd>Identifies the individual car. The lookup masks this group and the check digit.</dd>
        </dl>
        <p>Use the build sheet and installed parts to check equipment such as a limited-slip differential, heated seats, or a factory radio. A VIN lookup can give you a starting catalog selection.</p>
        <p><DocumentLink href="https://www.nhtsa.gov/vin-decoder" target="_blank" rel="noopener">NHTSA VIN decoder ↗</DocumentLink> · <DocumentLink href="https://baonline.bmw.com/?brand=bmw&locale=en-gb" target="_blank" rel="noopener">BMW Driver’s Guide ↗</DocumentLink></p>
      </details>
      <details>
        <summary>BMW chassis and engine codes</summary>
        <p>E30 identifies this generation of the 3 Series. E34 identifies this generation of the 5 Series. A U.S. 1991 E30 325i has an M20 inline-six, while the U.S. 1995 E34 525i has an M50TU inline-six with single VANOS. Use the engine code and build month when choosing engine parts.</p>
        <p><DocumentLink href="/e30/quick-reference">E30 Quick Reference</DocumentLink> · <DocumentLink href="/quick-reference">E34 Quick Reference</DocumentLink></p>
      </details>
  </div>;
}
