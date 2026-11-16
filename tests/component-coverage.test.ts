import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import release from "../data/digital-twin/525i-automatic-reference.json";
import { parseReference } from "../src/digital-twin/public/model";
import { componentCoverage } from "../src/servicing/component-coverage";
const model=parseReference(JSON.parse(readFileSync("public"+release.manifestUrl,"utf8")));
describe("mechanical reference coverage",()=>{
  it("distinguishes generic diagnostics from a specific procedure or authored repair",()=>{
    const node=model.nodes.find(node=>node.id==="m50:rod-bolt:1:-1")!;
    const coverage=componentCoverage(node,model.catalog!.bindings[node.id]);
    expect(coverage.geometry).toBe(true);expect(coverage.generalManualReferences).toBeGreaterThan(0);
    expect(coverage.specificManualReferences).toBe(0);expect(coverage.authoredRepairGuides).toBe(0);expect(coverage.dimensionallyVerified).toBe(false);
  });
  it("limits the outer-envelope check to its exact model revision and asset",()=>{
    const node=model.nodes.find(node=>node.id==="m50:oil-filter-element")!,binding=model.catalog!.bindings[node.id],asset=model.assets.find(asset=>asset.id===node.assetId)!;
    const correct={id:model.id,revision:model.revision,assetSha256:asset.sha256};
    expect(componentCoverage(node,binding,correct).outerEnvelope?.kind).toBe("outer-envelope-only");
    expect(componentCoverage(node,binding,{...correct,revision:14}).outerEnvelope).toBeNull();
    expect(componentCoverage(node,binding,{...correct,assetSha256:"0".repeat(64)}).outerEnvelope).toBeNull();
    expect(componentCoverage(node,binding,correct).dimensionallyVerified).toBe(false);
  });
});
