import type { ReferenceNode } from "../digital-twin/public/model";
import type { CatalogBinding } from "../digital-twin/public/catalog";
import { componentCoverage } from "../servicing/component-coverage";
import { DocumentLink } from "./DocumentLink";

export function ComponentCoverage({ node, binding, referenceId, revision, assetSha256, visible }: { node: ReferenceNode; binding?: CatalogBinding; referenceId?: string; revision?: number; assetSha256?: string; visible?: boolean }) {
  const coverage = componentCoverage(node, binding, { id: referenceId, revision, assetSha256 });
  return <section className="component-coverage" aria-label="Component reference coverage">
    <h3>Available for this component</h3>
    <dl>
      <div><dt>3D</dt><dd>{coverage.geometry ? "Illustrated geometry" : "No geometry linked"}{visible !== undefined && coverage.geometry && (visible ? " · shown" : " · hidden in this view")}</dd></div>
      <div><dt>Selection</dt><dd>{coverage.selectable ? "Individually selectable" : "Assembly reference only"}</dd></div>
      <div><dt>Catalog</dt><dd>{coverage.catalogCandidates ? `${coverage.catalogCandidates} source ${coverage.catalogCandidates === 1 ? "position" : "positions"}` : binding?.assemblyIds.length ? "Source assembly linked" : "No source positions linked"}{coverage.canonicalIdentity && " · number linked"}</dd></div>
      <div><dt>Repair</dt><dd>{coverage.authoredRepairGuides ? `${coverage.authoredRepairGuides} authored ${coverage.authoredRepairGuides === 1 ? "guide" : "guides"}` : "No authored replacement guide"}{coverage.guides.some(g => g.kind !== "replacement") && " · inspection/planning references"}</dd></div>
      <div><dt>Manual</dt><dd>{coverage.specificManualReferences ? "Specific source locator" : coverage.generalManualReferences ? "General diagnostic locator" : "No manual locator linked"}</dd></div>
      <div><dt>Dimensions</dt><dd>{coverage.outerEnvelope ? (coverage.outerEnvelope.kind==='diameter-and-blade-count-only'?"Diameter checked":coverage.outerEnvelope.kind==='catalog-size-only'?"Listed sizes checked":"Outer size checked") : "Not dimension checked"}</dd></div>
    </dl>
    {coverage.outerEnvelope && <p className="small"><DocumentLink href={coverage.outerEnvelope.source} target="_blank" rel="noopener noreferrer">{coverage.outerEnvelope.sourceTitle} · {coverage.outerEnvelope.displaySize} ↗</DocumentLink><br/>{coverage.outerEnvelope.limitations}</p>}
  </section>;
}
