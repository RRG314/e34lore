import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { technicalDrawings } from "../src/data/diagrams";
import { availableDrawingImage, sourceOnlyDrawingPaths } from "../src/domain/drawing-rights";
import { parts, assemblies } from "../src/data/catalog";
import { buildAssembly } from "../src/graphics/assembly-geometry";
import { Box3, Mesh, Vector3 } from "three";

describe("source drawing integrity", () => {
  it("preserves source metadata while withholding uncleared copies", () => {
    for (const drawing of technicalDrawings) {
      expect(assemblies.some((a) => a.id === drawing.assembly)).toBe(true);
      expect(drawing.credit.length).toBeGreaterThan(10);
      expect(drawing.source).toMatch(/^https:\/\//);
      if (!drawing.image) continue;
      const file = path.resolve("public", drawing.image.slice(1));
      expect(fs.statSync(file).size).toBeGreaterThan(1000);
      const bytes = fs.readFileSync(file);
      if (file.endsWith(".png")) {
        expect(bytes.readUInt32BE(16)).toBe(drawing.width);
        expect(bytes.readUInt32BE(20)).toBe(drawing.height);
      }
    }
    for (const image of sourceOnlyDrawingPaths) {
      expect(fs.existsSync(path.resolve("public", image.slice(1)))).toBe(false);
      expect(availableDrawingImage(image, "https://example.invalid/replacement.png")).toBe("");
    }
  });
  it("links every selection anchor to a real component in its assembly", () => {
    for (const drawing of technicalDrawings)
      for (const spot of drawing.hotspots) {
        expect(spot.x).toBeGreaterThanOrEqual(0);
        expect(spot.x).toBeLessThanOrEqual(1);
        expect(spot.y).toBeGreaterThanOrEqual(0);
        expect(spot.y).toBeLessThanOrEqual(1);
        for (const id of spot.partIds) {
          const part = parts.find((p) => p.id === id);
          expect(part, id).toBeDefined();
          expect(part?.assembly, id).toBe(drawing.assembly);
        }
      }
  });
  it("keeps OEM identities unique and preserves stable upgraded links", () => {
    const numbered = parts.filter((p) => p.number);
    expect(new Set(numbered.map((p) => p.number)).size).toBe(numbered.length);
    expect(parts.find((p) => p.id === "brake-carrier")?.number).toBe(
      "34111160366",
    );
    expect(parts.find((p) => p.id === "brake-disc")?.assembly).toBe(
      "front-brake-disc",
    );
  });
});
describe("assembly geometry", () => {
  for (const id of [
    "water-pump",
    "front-strut",
    "front-strut-upper",
    "front-strut-damper",
    "front-brake",
    "front-brake-disc",
  ])
    it(id + " builds finite selectable solids and a separated pose", () => {
      const assembly = buildAssembly(id),
        box = new Box3().setFromObject(assembly.group),
        size = box.getSize(new Vector3());
      expect(
        [size.x, size.y, size.z].every((x) => Number.isFinite(x) && x > 0),
      ).toBe(true);
      expect(assembly.parts.length).toBeGreaterThan(2);
      for (const part of assembly.parts) {
        expect(
          part.ids.some((id) => parts.some((p) => p.id === id)) ||
            part.ids.includes("brake-disc-context"),
        ).toBe(true);
        part.object.position.copy(part.base).add(part.offset);
      }
      const exploded = new Box3().setFromObject(assembly.group);
      expect(exploded.isEmpty()).toBe(false);
      assembly.group.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((m) => m.dispose());
        }
      });
    });
});
