import { describe, expect, it } from "vitest";
import { decodeVinVehicle, maskedVinPattern } from "../src/vehicle/vin-registry";
import { e30FusePositions, e30FuseReference } from "../src/series/e30-quick-reference";
import { e30FuseDrawing, e34FuseDrawings, e34FuseReference } from "../src/data/fuse-panel-layouts";
import { filterFusePositions } from "../src/data/fuse-reference";
import { e30FactoryGuides } from "../src/series/e30-factory-guides";
import { guideSourcePages } from "../src/domain/guide-support";
import { workshopPartService } from "../src/servicing/workshop-service";
import { serviceGuide } from "../src/servicing/service";
import { specsForNode, specsForPart } from "../src/servicing/repair-specs";

const coupe = { Make:"BMW", Series:"3-Series", Trim:"E30", Model:"325iS", ModelYear:"1991",
  BodyClass:"Sedan/Saloon", Doors:"2", TransmissionStyle:"Automatic", EngineModel:"4-Value" };

describe("E30 VIN and service references", () => {
  it("maps the vPIC 2-door saloon and iS aliases to the 325i coupe catalog", () => {
    expect(decodeVinVehicle(coupe)).toMatchObject({series:"e30",vehicle:{
      model:"325i",year:"1991",body:"Coupe",transmission:"Automatic",engine:"",month:"",
    }});
    expect(decodeVinVehicle({...coupe,Model:"325iC",BodyClass:"Convertible/Cabriolet"}))
      .toMatchObject({series:"e30",vehicle:{model:"325i",body:"Convertible"}});
  });

  it("preserves E34 lookup and rejects another BMW chassis from the same period", () => {
    expect(decodeVinVehicle({...coupe,Trim:"E36",ModelYear:"1992"})).toBeNull();
    expect(decodeVinVehicle({...coupe,Series:"5-Series",Trim:"",Model:"525i",ModelYear:"1994",Doors:"4"}))
      .toMatchObject({series:"e34",vehicle:{model:"525i",year:"1994",body:"Sedan"}});
    expect(maskedVinPattern("WBAAA2310ME000001")).toBe("WBAAA231*ME******");
  });

  it("keeps the disputed E30 fuel-pump fuse rating unresolved", () => {
    expect(filterFusePositions("fuel pump",e30FusePositions)).toEqual([
      expect.objectContaining({number:11,amps:null,source:"BMW 1989 ETM 0670-1 and 0670-5"}),
    ]);
  });

  it("keeps factory fuse banks in physical order and uses the applicable circuit page", () => {
    expect(e30FuseDrawing.banks.map(bank => [bank.numbers[0],bank.numbers.at(-1)])).toEqual([[1,15],[16,30]]);
    expect(e34FuseDrawings.front.banks[0].numbers).toEqual(Array.from({length:29},(_,i)=>i+1));
    expect(e34FuseDrawings.rear.banks.map(bank => bank.numbers)).toEqual([
      [37,36,35,34],[33,32,31,30],[44,45,46,47],[43,42,41,40],
    ]);
    expect(e34FuseReference("1995").find(fuse=>fuse.number===20)).toMatchObject({amps:15,chart:expect.stringMatching(/#page=26$/)});
    expect(e34FuseReference("1995","525tds").find(fuse=>fuse.number===20)?.source).toContain("Bentley");
    expect(e30FuseReference({year:"1991",model:"325i",body:"Coupe"}).find(fuse=>fuse.number===10))
      .toMatchObject({source:"BMW 1991 325i ETM · 0670-8",chart:expect.stringMatching(/#page=10$/)});
    expect(e30FuseReference({year:"1991",model:"325i",body:"Convertible"}).find(fuse=>fuse.number===10)?.source)
      .toBe("BMW 1989 ETM 0670-1");
  });

  it("opens the exact E30 manual group and page for a service guide", () => {
    const oil = e30FactoryGuides.find(g => g.slug === "e30-oil-service")!;
    expect(guideSourcePages(oil)).toEqual([
      expect.objectContaining({pdf:22,href:"/manual/00?pdf=22"}),
    ]);
  });

  it("connects the automatic pan, catalog number and registered walkthrough", () => {
    const [job] = specsForNode("e30","e30assembly:automatic:pan");
    expect(job.modelReferenceId).toBe("e30-325i-coupe-automatic");
    expect(specsForPart("e30","24 11 1 215 935")).toContain(job);
    const service = serviceGuide(job.guide!)!;
    expect(service.revision).toMatch(/^[a-f0-9]{24}$/);
    expect(guideSourcePages(service.guide)).toEqual([
      expect.objectContaining({pdf:388,href:"/manual/24?pdf=388"}),
    ]);
  });

  it("keeps the E30 tool sizes and guide pages linked from their modeled parts", () => {
    const service = (id: string) => workshopPartService("e30",{id,systemIds:[]},"e30-325i-coupe-manual")?.jobs[0];
    const oil = service("e30assembly:engine:oil-filter");
    expect(oil?.manual.href).toBe("/manual/00?pdf=22");
    expect(serviceGuide(oil!.guide!)?.tools.some(tool=>tool.name.includes("17 mm six-point socket"))).toBe(true);
    expect(service("e30assembly:engine-bay:air-filter")).toMatchObject({guide:"e30-air-filter",manual:{href:"/manual/13?pdf=272"}});
    expect(service("e30body:headlamps-left")?.manual.href).toMatch(/#page=61$/);
    expect(service("e30assembly:engine:spark-plug-1")?.tools?.[0]).toContain("20.8 mm");
  });
});
