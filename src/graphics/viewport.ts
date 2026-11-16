/** Hidden tabs and collapsed panels can report zero layout size during mounting. */
export function initialViewport(width: number, height: number) {
  const w = Number.isFinite(width) && width > 0 ? width : 640;
  const h = Number.isFinite(height) && height > 0 ? height : 440;
  return { width: w, height: h, aspect: w / h };
}
