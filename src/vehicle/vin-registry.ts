import { sanitizeVehicle, type Vehicle } from "../data/catalog";
import { seriesDefinitions, type Series } from "../series/registry";
import { validateVin } from "./configuration";

export function maskedVinPattern(input: string) {
  const { vin, valid } = validateVin(input);
  if (!valid) return null;
  // The serial and its check digit are unnecessary for a basic pattern lookup.
  return vin.slice(0, 8) + "*" + vin.slice(9, 11) + "******";
}

type VinResult = { series: Series; vehicle: Vehicle };
const e30ModelAliases: Readonly<Record<string, string>> = {
  "325is": "325i",
  "325ic": "325i",
  "325/325es": "325e",
  "325es": "325e",
};

export function decodeVinVehicle(fields: Record<string, unknown>): VinResult | null {
  const read = (key: string) => String(fields[key] ?? "").trim();
  if (read("Make").toUpperCase() !== "BMW") return null;

  const seriesName = read("Series");
  const year = read("ModelYear");
  const modelName = read("Model").toLowerCase();
  const e30 = /^3(?:[- ]?series)?$/i.test(seriesName) && [read("Trim"), read("Trim2")].some(value => /^E30$/i.test(value));
  const e34 = /^5(?:[- ]?series)?$/i.test(seriesName) && /^19(?:89|9[0-5])$/.test(year);
  if (!e30 && !e34) return null;

  const series = e30 ? "e30" : "e34";
  const definition = seriesDefinitions[series];
  const [first, last] = definition.years;
  if (!/^\d{4}$/.test(year) || Number(year) < first || Number(year) > last) return null;
  const catalogName = e30 ? e30ModelAliases[modelName] ?? modelName : modelName;
  const model = definition.models.find(row => row.id.toLowerCase() === catalogName);
  if (!model) return null;

  const bodyClass = read("BodyClass");
  const doors = read("Doors");
  const body = /^wagon$/i.test(bodyClass) ? "Touring"
    : e30 && /^convertible(?:\/cabriolet)?$/i.test(bodyClass) ? "Convertible"
    : e30 && (/^coupe$/i.test(bodyClass) || (/^sedan\/saloon$/i.test(bodyClass) && doors === "2")) ? "Coupe"
    : /^sedan\/saloon$/i.test(bodyClass) && (!e30 || doors === "4") ? "Sedan" : "";
  const engine = model.engines.find(code => code.toLowerCase() === read("EngineModel").toLowerCase()) ?? "";
  const transmission = ["Automatic", "Manual"].find(style => style.toLowerCase() === read("TransmissionStyle").toLowerCase()) ?? "";
  return { series, vehicle: sanitizeVehicle({ model: model.id, year, body, engine, transmission }) };
}
