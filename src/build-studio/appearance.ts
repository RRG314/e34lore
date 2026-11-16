import * as T from "three";
import targets from "../../data/build-studio/appearance-targets.json";
import type { BuildAppearance } from "./schema";
export type MaterialBinding = {
  assetId: string;
  sha256: string;
  nodeId: string;
  materialIndex: number;
  name: string;
};
export function appearanceRole(
  b: MaterialBinding,
): keyof typeof targets.targets | null {
  if (b.assetId === "e30:cabin") {
    if (b.name === "E30_Seat_Upholstery") return "seatUpholstery";
    if (b.name === "E30_Cabin_Trim") return "interiorTrim";
  }
  if (b.assetId === "e30:cross-spoke-wheels" && b.name === "Cast silver wheel") return "wheelFinish";
  for (const [key, selectors] of Object.entries(targets.targets))
    if (
      selectors.some(
        (s) =>
          s.assetId === b.assetId &&
          s.assetSha256 === b.sha256 &&
          s.nodeIds.includes(b.nodeId) &&
          s.materialIndices.includes(b.materialIndex) &&
          (!s.materialNames.some(Boolean) || s.materialNames.includes(b.name)),
      )
    )
      return key as keyof typeof targets.targets;
  return null;
}
export function applyBuildMaterial(
  mat: T.Material,
  appearance: BuildAppearance | null,
) {
  const source = mat.userData.source as T.Material | undefined;
  if (
    !(mat instanceof T.MeshStandardMaterial) ||
    !(source instanceof T.MeshStandardMaterial)
  )
    return;
  mat.color.copy(source.color);
  mat.roughness = source.roughness;
  mat.metalness = source.metalness;
  mat.map = source.map;
  const e30Paint = mat instanceof T.MeshPhysicalMaterial
    && source instanceof T.MeshPhysicalMaterial && source.name === "E30_Body_Paint";
  if (e30Paint) {
    mat.clearcoat = source.clearcoat;
    mat.clearcoatRoughness = source.clearcoatRoughness;
    mat.needsUpdate = true;
  }
  if (!appearance) return;
  const role = mat.userData.buildRole as
    | ReturnType<typeof appearanceRole>
    | "originalWheel";
  if (role === "paint" && appearance.paint.enabled) {
    mat.color.set(appearance.paint.color);
    const finishes = {
      gloss: [0.2, 0.12],
      satin: [0.57, 0.06],
      matte: [0.94, 0.02],
      metallic: [0.28, 0.65],
    };
    [mat.roughness, mat.metalness] = finishes[appearance.paint.finish];
    if (e30Paint) {
      const coatings = {
        gloss: [0.78, 0.16],
        satin: [0.27, 0.48],
        matte: [0, 1],
        metallic: [0.74, 0.18],
      };
      [mat.clearcoat, mat.clearcoatRoughness] = coatings[appearance.paint.finish];
    }
  }
  if (role === "seatUpholstery" && appearance.upholstery.enabled) {
    mat.color.set(appearance.upholstery.color);
    mat.roughness = appearance.upholstery.finish === "leather" ? 0.48 : 0.96;
    mat.metalness = 0;
  }
  if (role === "interiorTrim" && appearance.trim.enabled) {
    mat.color.set(appearance.trim.color);
    mat.roughness = 0.5;
  }
  if (
    (role === "wheelFinish" || role === "originalWheel") &&
    appearance.wheels.finishEnabled
  )
    mat.color.set(appearance.wheels.color);
  if (role === "engineBayAccent" && appearance.engineAccent.enabled)
    mat.color.set(appearance.engineAccent.color);
  mat.needsUpdate = true;
}
export const paintReferences = [
  {
    code: "300",
    name: "Alpine White III",
    color: "#f1f1e8",
    finish: "gloss",
    source:
      "https://www.hubauer-shop.de/de/lackstift-set-alpinweiss-51910301918.html",
  },
  {
    code: "181",
    name: "Diamond Black metallic",
    color: "#272b2c",
    finish: "metallic",
    source:
      "https://www.hubauer-shop.de/de/lackstift-set-diamantschwarz-met-51910302080.html",
  },
  {
    code: "252",
    name: "Calypso Red metallic",
    color: "#672f37",
    finish: "metallic",
    source:
      "https://www.hubauer-shop.de/de/touch-up-stick-calypso-red-met-51910419776.html",
  },
  {
    code: "668",
    name: "Black II",
    color: "#161819",
    finish: "gloss",
    source:
      "https://www.hubauer-shop.de/de/lackstift-set-schwarz-51910301947.html",
  },
  {
    code: "309",
    name: "Arctic Silver metallic",
    color: "#b7bdc0",
    finish: "metallic",
    source:
      "https://www.hubauer-shop.de/de/lackstift-set-arktissilber-met-51910302033.html",
  },
] as const;
