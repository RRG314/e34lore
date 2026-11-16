import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import index from "../data/scanner/licensed-family/reference-index.json";
import media from "../data/parts-media/manifest.json";
import { compareLicensedFamilies, licensedFamilyIndexSchema } from "../src/scanner/licensed-family-comparison";
import {emptyPhotoDraft,recordPhotoComparison,restorePhotoDraft} from "../src/scanner/photo-session";
import { categoryMetrics } from "../src/scanner/evaluation-metrics";

describe("licensed category comparisons", () => {
  it("uses only current licensed family images, without exact numbers or retailer research", () => {
    expect(() => licensedFamilyIndexSchema.parse(index)).not.toThrow();
    for (const reference of index.records) {
      const photo=media.records.find(row=>row.id===reference.id);
      expect(photo?.kind).toBe("photograph");expect(photo?.scope).toBe("family");expect(photo?.numbers).toEqual([]);
      if (!photo || photo.kind!=="photograph") throw Error("Missing shared photo");
      expect("recognition" in photo && photo.recognition==="comparison-only").toBe(false);
      expect(createHash("sha256").update(readFileSync("public"+photo.image)).digest("hex")).toBe(reference.sourceSha256);
      expect(photo.rights.license).toBe(reference.license);
    }
  });
  it("keeps and restores licensed results, including out-of-scope photo evidence", () => {
    for(const reference of index.records){
      const draft=emptyPhotoDraft(),comparison=compareLicensedFamilies([reference.embedding],index);
      const saved=recordPhotoComparison(draft,comparison,1200,draft.revision);
      expect(restorePhotoDraft(saved)?.comparison?.value.recognizer).toBe("licensed-family-v1");
      expect(saved.comparison?.value.photoEvidence?.[0].familyId).toBe(reference.family);
    }
  });
  it("rejects a visually similar out-of-scope bearing and conflicting views without claiming an OEM identity", () => {
    const negative=index.records.find(row=>row.negative)!,engine=index.records.find(row=>row.family==="engine")!,starter=index.records.find(row=>row.family==="starter")!;
    expect(compareLicensedFamilies([negative.embedding],index)).toMatchObject({status:"inconclusive",accepted:false});
    expect(compareLicensedFamilies([negative.embedding],index).candidates).toEqual([]);
    expect(compareLicensedFamilies([engine.embedding,starter.embedding],index)).toMatchObject({status:"inconclusive",accepted:false});
    expect(compareLicensedFamilies([engine.embedding,starter.embedding],index)).toMatchObject({candidates:[],reason:expect.stringContaining('different parts')});
    const ambiguous=engine.embedding.map((value,i)=>(value+starter.embedding[i])/2);
    expect(compareLicensedFamilies([ambiguous],index)).toMatchObject({status:'inconclusive',candidates:[]});
    expect(compareLicensedFamilies([engine.embedding],index).candidates.length).toBeLessThanOrEqual(1);
    expect(()=>compareLicensedFamilies([],index)).toThrow();
    const changed=structuredClone(index);changed.records[1].sourceSha256=changed.records[0].sourceSha256;
    expect(()=>compareLicensedFamilies([engine.embedding],changed)).toThrow("Duplicate");
    const unreviewed=structuredClone(index);unreviewed.records[0].family='unreviewed-negative';unreviewed.records[0].negative=true;
    expect(()=>licensedFamilyIndexSchema.parse(unreviewed)).toThrow('Unsupported component category');
  });
});
describe("category and exact-identity evaluation", () => {
  it("counts wrong-category and unknown promotions as false positives; missing evidence is null", () => {
    const result=categoryMetrics([
      {expected:"starter",predicted:"starter",proposed:true,acceptedOem:false},
      {expected:"engine",predicted:"starter",proposed:true,acceptedOem:false},
      {expected:"unknown",predicted:"starter",proposed:true,acceptedOem:false},
      {expected:"unknown",predicted:"engine",proposed:false,acceptedOem:false},
    ]);
    expect(result.precision).toBeCloseTo(1/3);expect(result.recall).toBe(.5);expect(result.unknownRejectionRate).toBe(.5);
    expect(result.exactOem.precision).toBeNull();expect(result.exactOem.recall).toBeNull();
    expect(categoryMetrics([]).precision).toBeNull();expect(categoryMetrics([]).recall).toBeNull();
    expect(categoryMetrics([{expected:"engine",predicted:"engine",proposed:false,acceptedOem:false}]).precision).toBeNull();
  });
});
