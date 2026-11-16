import type {FamilyComparison} from "./family-comparison";

type Raster = { width: number; height: number; channels: number; data: Uint8Array | Uint8ClampedArray };
type Region = {
  pixels: number[]; minX: number; maxX: number; minY: number; maxY: number;
  x: number; y: number; touchesEdge: boolean;
};

function regions(mask: Uint8Array, width: number, height: number, value: number) {
  const seen = new Uint8Array(mask.length);
  const found: Region[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (seen[i] || mask[i] !== value) continue;
    const pixels = [i];
    seen[i] = 1;
    let minX = width, minY = height, maxX = 0, maxY = 0, x = 0, y = 0;
    for (let head = 0; head < pixels.length; head++) {
      const p = pixels[head], px = p % width, py = Math.floor(p / width);
      minX = Math.min(px, minX); maxX = Math.max(px, maxX);
      minY = Math.min(py, minY); maxY = Math.max(py, maxY);
      x += px; y += py;
      for (const next of [px > 0 ? p - 1 : -1, px < width - 1 ? p + 1 : -1, p - width, p + width]) {
        if (next < 0 || next >= mask.length || seen[next] || mask[next] !== value) continue;
        seen[next] = 1;
        pixels.push(next);
      }
    }
    if (pixels.length >= 4) found.push({
      pixels, minX, maxX, minY, maxY, x: x / pixels.length, y: y / pixels.length,
      touchesEdge: minX === 0 || minY === 0 || maxX === width - 1 || maxY === height - 1,
    });
  }
  return found;
}

/** Read three openings in an intact silhouette on an even, contrasting background.
 * The center bore must sit away from the line between two slotted mounting ears. */
export function centerSupportShape(image: Raster): boolean {
  if (image.channels < 3 || image.width < 40 || image.height < 40) return false;
  const ratio = Math.min(1, 176 / Math.max(image.width, image.height));
  const width = Math.round(image.width * ratio), height = Math.round(image.height * ratio);
  const gray = new Uint8Array(width * height);
  const edge: number[] = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const source = (Math.floor(y * image.height / height) * image.width +
      Math.floor(x * image.width / width)) * image.channels;
    const luminance = Math.round(.299 * image.data[source] + .587 * image.data[source + 1] + .114 * image.data[source + 2]);
    gray[y * width + x] = luminance;
    if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) edge.push(luminance);
  }
  edge.sort((a, b) => a - b);
  const background = edge[Math.floor(edge.length / 2)];
  if (background < 170 || edge[Math.floor(edge.length * .9)] - edge[Math.floor(edge.length * .1)] > 27) return false;
  const mask = gray.map(pixel => Number(pixel <= background - 31));
  const [part, other] = regions(mask, width, height, 1).sort((a, b) => b.pixels.length - a.pixels.length);
  if (!part || part.touchesEdge || part.pixels.length < gray.length * .12) return false;
  if (other && other.pixels.length > part.pixels.length * .12) return false;
  const span = Math.max(part.maxX - part.minX + 1, part.maxY - part.minY + 1);
  if (span < 55) return false;
  const isolated = new Uint8Array(mask.length);
  for (const p of part.pixels) isolated[p] = 1;
  const holes = regions(isolated, width, height, 0).filter(region => !region.touchesEdge);
  const openings = holes.filter(hole => hole.pixels.length >= span * span * .00085);
  if (openings.length !== 3) return false;
  const [bore, earA, earB] = openings.sort((a, b) => b.pixels.length - a.pixels.length);
  const boreArea = bore.pixels.length / (span * span);
  const earBalance = earA.pixels.length / earB.pixels.length;
  if (boreArea < .014 || boreArea > .18 || earBalance > 3.5 || earA.pixels.length * 2.7 > bore.pixels.length) return false;
  const dx = earB.x - earA.x, dy = earB.y - earA.y, separation = Math.hypot(dx, dy);
  if (separation < span * .62) return false;
  const cx = bore.x - (earA.x + earB.x) / 2, cy = bore.y - (earA.y + earB.y) / 2;
  const along = (cx * dx + cy * dy) / separation;
  const away = Math.abs((cx * dy - cy * dx) / separation);
  return Math.abs(along) < separation * .18 && away > separation * .17 && away < separation * .72;
}

export function centerSupportComparison(matches: readonly boolean[]): FamilyComparison | null {
  if (!matches.length || matches.length > 3 || !matches.every(Boolean)) return null;
  return {
    status: "review",
    accepted: false,
    recognizer: "center-support-shape-v1",
    views: matches.length,
    // A 1 records a passed shape check for this view. It is not a probability.
    candidates: [{id:"center-support-bearing",score:1,viewScores:matches.map(Number),votes:matches.length}],
    strongestAlternative: null,
    reason: "The bearing opening and two mounting slots match a center support. Compare it with the catalog.",
  };
}
