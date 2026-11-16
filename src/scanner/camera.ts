/** Adapted rear-camera lifecycle and object-cover crop math from Bill Bounty
 * ScanBillModal.tsx (434647a4). Explicit owner-authorized reuse; see audit. */
export class CameraController {
  private generation = 0;
  private stream: MediaStream | null = null;
  stop() {
    this.generation++;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
  async start(video: HTMLVideoElement) {
    this.stop();
    const generation = this.generation;
    if (!navigator.mediaDevices?.getUserMedia)
      throw Error(
        "Use Choose photo; a camera preview is not available in this browser.",
      );
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
    if (generation !== this.generation) {
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }
    this.stream = stream;
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      this.stop();
      throw Error(
        "The camera preview could not start. Choose a photo instead.",
      );
    }
    if (generation !== this.generation) {
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }
    return true;
  }
  track() {
    return this.stream?.getVideoTracks()[0];
  }
  async setting(key: "zoom" | "torch", value: number | boolean) {
    const t = this.track();
    if (!t) return;
    await t.applyConstraints({
      advanced: [{ [key]: value } as MediaTrackConstraintSet],
    });
  }
}
export function coverCrop(
  sourceWidth: number,
  sourceHeight: number,
  viewWidth: number,
  viewHeight: number,
) {
  const scale = Math.max(viewWidth / sourceWidth, viewHeight / sourceHeight);
  const width = viewWidth / scale,
    height = viewHeight / scale;
  return {
    x: (sourceWidth - width) / 2,
    y: (sourceHeight - height) / 2,
    width,
    height,
  };
}
export function quality(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
) {
  let sum = 0,
    diff = 0,
    n = 0;
  const gray = (i: number) =>
    0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
  for (let y = 1; y < height; y++)
    for (let x = 1; x < width; x++) {
      const i = (y * width + x) * 4,
        v = gray(i);
      sum += v;
      diff += Math.abs(v - gray(i - 4)) + Math.abs(v - gray(i - width * 4));
      n++;
    }
  const brightness = n ? sum / n : 0,
    detail = n ? diff / n : 0;
  return {
    brightness,
    detail,
    warnings: [
      ...(brightness < 35 ? ["Too dark: use more even light."] : []),
      ...(brightness > 235
        ? ["Very bright: avoid reflections and blown-out markings."]
        : []),
      ...(detail < 3
        ? ["Little visible detail: focus on the part and move closer."]
        : []),
    ],
  };
}
export async function prepareImage(
  blob: Blob,
  rotation = 0,
  box = { xmin: 0, ymin: 0, xmax: 1, ymax: 1 },
) {
  if (blob.size > 20 * 1024 * 1024)
    throw Error("Choose an image smaller than 20 MB.");
  const bitmap = await createImageBitmap(blob, {
    imageOrientation: "from-image",
  });
  try {
    if (bitmap.width * bitmap.height > 40000000)
      throw Error("Choose a photo smaller than 40 megapixels.");
    const swap = rotation % 180 !== 0,
      canvas = document.createElement("canvas"),
      w = swap ? bitmap.height : bitmap.width,
      h = swap ? bitmap.width : bitmap.height,
      scale = Math.min(1, 1600 / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const c = canvas.getContext("2d")!;
    c.translate(canvas.width / 2, canvas.height / 2);
    c.rotate((rotation * Math.PI) / 180);
    c.drawImage(
      bitmap,
      (-bitmap.width * scale) / 2,
      (-bitmap.height * scale) / 2,
      bitmap.width * scale,
      bitmap.height * scale,
    );
    const cropped = document.createElement("canvas");
    cropped.width = Math.max(
      1,
      Math.round(canvas.width * (box.xmax - box.xmin)),
    );
    cropped.height = Math.max(
      1,
      Math.round(canvas.height * (box.ymax - box.ymin)),
    );
    cropped
      .getContext("2d")!
      .drawImage(
        canvas,
        canvas.width * box.xmin,
        canvas.height * box.ymin,
        cropped.width,
        cropped.height,
        0,
        0,
        cropped.width,
        cropped.height,
      );
    const check = document.createElement("canvas");
    check.width = Math.max(
      2,
      Math.round(
        (cropped.width / Math.max(cropped.width, cropped.height)) * 160,
      ),
    );
    check.height = Math.max(
      2,
      Math.round(
        (cropped.height / Math.max(cropped.width, cropped.height)) * 160,
      ),
    );
    check.getContext("2d")!.drawImage(cropped, 0, 0, check.width, check.height);
    const q = quality(
      check.getContext("2d")!.getImageData(0, 0, check.width, check.height)
        .data,
      check.width,
      check.height,
    );
    const output = await new Promise<Blob>((resolve, reject) =>
      cropped.toBlob(
        (v) => (v ? resolve(v) : reject(Error("Photo could not be prepared."))),
        "image/jpeg",
        0.9,
      ),
    );
    return {
      blob: output,
      quality: q,
      width: cropped.width,
      height: cropped.height,
    };
  } finally {
    bitmap.close();
  }
}
