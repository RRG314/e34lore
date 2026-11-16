export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_EDGE = 1600;
// Independent server decode and fresh encode discard EXIF/GPS, comments and appended payloads.
export function sanitizeJpeg(bytes, codec) {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.length < 4 ||
    bytes.length > MAX_BYTES ||
    bytes[0] !== 255 ||
    bytes[1] !== 216
  )
    throw new Error("Choose a JPEG photo under 2 MB.");
  const raw = codec.decode(bytes, {
    useTArray: true,
    formatAsRGBA: true,
    tolerantDecoding: false,
    maxResolutionInMP: 3,
    maxMemoryUsageInMB: 96,
  });
  if (
    !raw.width ||
    !raw.height ||
    raw.width > MAX_EDGE ||
    raw.height > MAX_EDGE ||
    raw.width * raw.height > MAX_EDGE * MAX_EDGE
  )
    throw new Error("Photo dimensions exceed 1600 pixels.");
  // Do not forward codec-parsed metadata into the output encoder.
  const clean = codec.encode(
    { width: raw.width, height: raw.height, data: raw.data },
    82,
  ).data;
  if (clean.length > MAX_BYTES)
    throw new Error("Processed photo is too large.");
  return { bytes: new Uint8Array(clean), width: raw.width, height: raw.height };
}
