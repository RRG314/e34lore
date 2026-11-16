import seals from "../../data/digital-twin/nominal-seals.json";
import registry from "./reference-models.json";
/** A canonical identity match exposes a reference, never a verified fitment claim. */
export function referenceModelForPart(partId: string) {
  const nominal = nominalSealForPart(partId);
  if (nominal)
    return {
      id: nominal.geometryId,
      assembly: nominal.geometryId,
      partIds: [partId],
      accuracy: nominal.accuracy,
      scope: nominal.interpretation,
    };
  return registry.models.find((model) => model.partIds.includes(partId));
}
export const referenceModels = registry.models;

export const nominalSeals = seals.seals;
export function nominalSealForPart(partId: string) {
  return seals.seals.find((s) => s.partId === partId);
}

export function canRenderReferenceModel(assembly: string) {
  return (
    registry.models.some((model) => model.assembly === assembly) ||
    seals.seals.some((seal) => seal.geometryId === assembly)
  );
}
