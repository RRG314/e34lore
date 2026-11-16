import { describe, expect, it } from "vitest";
import { emptyVehicle } from "../src/data/catalog";
import { filterFuses, findFuseNumber, fusePositions, listedFuseCount } from "../src/data/fuse-reference";
import { quickReferenceSearch, referenceModelForVehicle, serviceLocations } from "../src/data/quick-reference";
import { publicShareUrl } from "../src/domain/identity";

describe("manual quick reference", () => {
  it("keeps documented, vacant and unlisted fuse positions distinct", () => {
    expect(listedFuseCount).toBe(44);
    expect(new Set(fusePositions.map((position) => position.number)).size).toBe(fusePositions.length);
    expect(findFuseNumber("Fuse #23")).toMatchObject({ number: 23, panel: "front", amps: 15, status: "listed" });
    expect(findFuseNumber("f8")).toMatchObject({ amps: null, status: "vacant" });
    expect(findFuseNumber("F33")).toMatchObject({ panel: "rear", amps: null, status: "unlisted" });
    expect(findFuseNumber("F55")).toMatchObject({ panel: "auxiliary", amps: null, status: "unlisted" });
    expect(filterFuses("F38")).toEqual([]);
  });

  it("finds common circuit terms and routes exact fuse searches", () => {
    expect(filterFuses("rear wiper").map((item) => item.number)).toEqual([37]);
    expect(filterFuses("12v socket").map((item) => item.number)).toContain(26);
    expect(filterFuses("cigarette lighter").map((item) => item.number)).toContain(26);
    expect(quickReferenceSearch("Fuse 23")[0]?.href).toBe("/quick-reference/fuses?fuse=23");
    expect(quickReferenceSearch("where is battery")[0]?.href).toBe("/quick-reference/locations?point=battery-rear");
    expect(quickReferenceSearch("coolant capacity")[0]?.href).toBe("/quick-reference/fluids");
  });

  it("uses a saved context only with a compatible U.S. engine and years", () => {
    const vehicle = { ...emptyVehicle, market: "USA", model: "525i", engine: "M50", year: "1992", body: "Touring" };
    expect(referenceModelForVehicle(vehicle)?.oil).toBe(5.75);
    expect(referenceModelForVehicle({ ...vehicle, market: "EUR" })).toBeUndefined();
    expect(referenceModelForVehicle({ ...vehicle, engine: "" })).toBeUndefined();
    expect(referenceModelForVehicle({ ...vehicle, year: "1991" })).toBeUndefined();
    expect(referenceModelForVehicle({ ...vehicle, year: "1993" })).toBeUndefined();
    expect(referenceModelForVehicle({ ...vehicle, model: "540i", engine: "M60", year: "1995", body: "Sedan" })?.coolant).toBe(12.5);
    expect(referenceModelForVehicle({ ...vehicle, engine: "M20", year: "1990", body: "Sedan" })).toMatchObject({ oil: null, coolant: null });
  });

  it("links public locations and fuse state without arbitrary query data", () => {
    expect(new Set(serviceLocations.map((point) => point.id)).size).toBe(serviceLocations.length);
    expect(publicShareUrl("/quick-reference/locations?point=washer-rear&token=private")).toBe(
      "https://e34lore.com/quick-reference/locations?point=washer-rear",
    );
    expect(publicShareUrl("/quick-reference/fuses?panel=front&fuse=23")).toBe(
      "https://e34lore.com/quick-reference/fuses?panel=front&fuse=23",
    );
    expect(publicShareUrl("/quick-reference/fluids?model=525i-m50#engine-oil")).toBe(
      "https://e34lore.com/quick-reference/fluids?model=525i-m50#engine-oil",
    );
  });
});
