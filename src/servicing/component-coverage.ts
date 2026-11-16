import type { ReferenceNode } from "../digital-twin/public/model";
import type { CatalogBinding } from "../digital-twin/public/catalog";
import { manualGuides } from "../data/manual";
import { catalogPositionAllowed } from "../lib/catalog-integrity";
import geometryChecks from "../../data/digital-twin/geometry-checks.json";
import {localGeometryChecks} from "../digital-twin/public/local-reference-candidate";

export function componentCoverage(node: ReferenceNode, binding?: CatalogBinding, reference?: { id?: string; revision?: number; assetSha256?: string }) {
  const guides = (binding?.guideIds || []).map(id => manualGuides.find(g => g.slug === id)).filter(g => !!g);
  const manual = binding?.manual || [];
  const specific = manual.filter(link => !(link.chapter === "100" && link.page === 4) && !/engine noise, smoke and leak diagnosis/i.test(link.title));
  const geometry = !!node.assetId && node.meshNames.length > 0;
  const outerEnvelope = [...geometryChecks.checks,...localGeometryChecks].find(check => check.referenceId === reference?.id && check.revision === reference?.revision && check.nodeId === node.id && check.assetSha256 === reference?.assetSha256);
  return {
    geometry, selectable: geometry,
    catalogCandidates: (binding?.positions || []).filter(p => catalogPositionAllowed(p.id)).length,
    canonicalIdentity: !!node.canonicalId && !!node.oem,
    specificManualReferences: specific.length,
    generalManualReferences: manual.length - specific.length,
    guides: guides.map(g => ({ id: g.slug, title: g.title, kind: g.kind, reviewStatus: g.reviewStatus })),
    authoredRepairGuides: guides.filter(g => g.kind === "replacement").length,
    structuredProcedures: guides.filter(g => !!g.jobSupport && g.jobSupport.steps.length === g.steps.length).length,
    outerEnvelope: outerEnvelope || null,
    dimensionallyVerified: false as const,
  };
}
