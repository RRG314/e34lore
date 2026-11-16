/** Read a packaged model asset, accepting either raw bytes or gzip. */
export async function boundedModelBytes(response: Response, limit: number) {
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > limit) throw Error("The model file is too large.");
  const signature = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 2));
  if (signature[0] !== 0x1f || signature[1] !== 0x8b) return bytes;
  let size = 0;
  const decoded = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const bounded = decoded.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, output) {
      size += chunk.byteLength;
      if (size > limit) throw Error("The model file is too large.");
      output.enqueue(chunk);
    },
  }));
  return new Response(bounded).arrayBuffer();
}
