import { describe, expect, it } from "vitest";
import {
  sourceDrawingAdapter,
  catalogContextMatch,
  catalogSearchQuery,
  preferredCatalogContext,
  type CatalogContext,
  orderingNotes,
  formatCatalogCondition,
  catalogPositionHref,
  catalogCsvCell,
  type SourceDrawing,
  type CatalogPosition,
} from "../src/domain/catalog";
const drawing: SourceDrawing = {
  id: "drawing",
  assembly_id: "assembly",
  image_path: null,
  remote_url: "https://www.bmwpartsdeal.com/resources/encry/diagram/test.png",
  pixel_width: null,
  pixel_height: null,
  credit: "BMW catalog source",
  applicability: "Conditional source selection",
  rights_status: "unconfirmed",
  coordinate_space: "percent",
  hotspots: [
    { reference: "01", left: 10, top: 20, width: 2, height: 4 },
    { reference: "99", left: 50, top: 50, width: 1, height: 1 },
  ],
};
const positions = [
  { id: "early", reference: "01" },
  { id: "late", reference: "01" },
] as CatalogPosition[];
describe("owned catalog source relationships", () => {
  it("exports untrusted source text as quoted literal CSV cells", () => {
    expect(catalogCsvCell("=1+1")).toBe('"\'=1+1"');
    expect(catalogCsvCell('mount, "upper"')).toBe('"mount, ""upper"""');
  });
  it("shows variable source quantities but avoids repeating parsed package counts", () => {
    expect(
      orderingNotes({
        required_quantity: null,
        package_quantity: 10,
        conditions: [
          { name: "Require Quantity", value: "X" },
          { name: "Package Quantity", value: "10" },
          { name: "Production Date", value: "From 199209" },
        ],
      }),
    ).toEqual([
      { name: "Require Quantity", value: "X" },
      { name: "Production Date", value: "From 199209" },
    ]);
  });
  it("keeps production alternatives together at the original callout", () => {
    const art = sourceDrawingAdapter(drawing, positions, {
      width: 1288,
      height: 910,
    });
    expect(art.width).toBe(1288);
    expect(art.hotspots).toHaveLength(1);
    expect(art.hotspots[0].partIds).toEqual(["early", "late"]);
    expect(art.hotspots[0].x).toBe(0.11);
    expect(art.hotspots[0].y).toBe(0.22);
  });
  it("supports native-coordinate anchors without shifting their center", () => {
    const art = sourceDrawingAdapter(
      {
        ...drawing,
        coordinate_space: "native",
        pixel_width: 1000,
        pixel_height: 500,
      },
      positions,
    );
    expect(art.hotspots[0].x).toBe(0.011);
    expect(art.hotspots[0].y).toBe(0.044);
  });
  it("formats production months without rewriting unrelated ordering notes", () => {
    expect(
      formatCatalogCondition("Production Date", "From 199209 To 199504"),
    ).toBe("From 09/1992 To 04/1995");
    expect(formatCatalogCondition("Reference", "199209")).toBe("199209");
  });
  it("preserves exact assembly and source position in shareable links", () => {
    expect(
      catalogPositionHref({
        context_id: "context",
        assembly_id: "a/b",
        position_id: "position",
      }),
    ).toBe("/parts/catalog?context=context&assembly=a%2Fb&position=position");
  });
});


describe("source catalog selection", () => {
  const sedan = {
    id: "sedan", model_id: "525i", model_year: 1994, body: "Sedan", engine: null, market: "USA",
  } as CatalogContext;
  const touring = {
    ...sedan, id: "touring", model_year: 1995, body: "Touring", engine: "M50TU",
  };
  const car = { model: "525i", year: "1995", engine: "M50TU", body: "Touring", market: "USA" };

  it("uses a compatible selection before the remembered catalog", () => {
    expect(preferredCatalogContext([sedan, touring], car, "sedan")?.id).toBe("touring");
    expect(catalogContextMatch(sedan, car)).toBe("different");
    expect(catalogContextMatch(touring, car)).toBe("matching");
  });

  it("distinguishes unknown source data and sample browsing", () => {
    expect(catalogContextMatch({ ...touring, engine: null }, car)).toBe("partial");
    expect(catalogContextMatch(touring, { ...car, model: "" })).toBe("sample");
  });
});

describe('selected vehicle source boundary',()=>{
 it('does not silently fall back to a remembered catalog for a different car',()=>{const context={id:'other',model_id:'525i',model_year:1995,body:'Sedan',engine:'M50TU',market:'USA'} as CatalogContext;expect(preferredCatalogContext([context],{model:'540i',year:'1995',body:'Sedan',engine:'M60',market:'USA'},'other')).toBeUndefined();expect(preferredCatalogContext([context],{model:'525i',year:'1995',body:'Touring',engine:'M50TU',market:'USA'},'other')).toBeUndefined();expect(preferredCatalogContext([context],{model:'525i',year:'1993',body:'Sedan',engine:'M50TU',market:'USA'},'other')).toBeUndefined();});
 it('maps common component wording without changing exact identities or distributor parts',()=>{expect(catalogSearchQuery('water pump')).toBe('"water pump" OR "coolant pump"');expect(catalogSearchQuery('waterpump')).toBe('"water pump" OR "coolant pump"');expect(catalogSearchQuery('brake rotors')).toBe('brake disc');expect(catalogSearchQuery('center driveshaft support')).toContain('"centre mount"');expect(catalogSearchQuery('distributor rotor')).toBe('distributor rotor');expect(catalogSearchQuery('11 51 7 527 799')).toBe('11 51 7 527 799');});
});
