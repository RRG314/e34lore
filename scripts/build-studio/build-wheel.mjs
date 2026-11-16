// Original unbranded visual reference. Nominal geometry is not a wheel specification.
import * as T from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((data) => {
      this.result = data;
      this.onloadend?.();
    });
  }
};
async function createWheel(low = false) {
  const scene = new T.Scene(),
    g = new T.Group();
  g.name = "e34-original-ten-spoke-v1";
  scene.add(g);
  const rubber = new T.MeshStandardMaterial({
      name: "original-rubber",
      color: "#202324",
      roughness: 0.92,
    }),
    alloy = new T.MeshStandardMaterial({
      name: "original-alloy",
      color: "#aeb1b3",
      metalness: 0.85,
      roughness: 0.3,
    }),
    dark = new T.MeshStandardMaterial({
      name: "original-barrel",
      color: "#4e5356",
      metalness: 0.6,
      roughness: 0.45,
    });
  function mesh(geometry, material, name, z = 0) {
    const m = new T.Mesh(geometry, material);
    m.name = name;
    m.position.z = z;
    g.add(m);
    return m;
  }
  const tire = mesh(
    new T.TorusGeometry(0.265, 0.05875, low ? 6 : 12, low ? 24 : 56),
    rubber,
    "tire",
  );
  tire.scale.z = 1.72;
  mesh(
    new T.TorusGeometry(0.19, 0.013, low ? 5 : 8, low ? 24 : 56),
    alloy,
    "outer-rim",
    -0.085,
  );
  mesh(
    new T.TorusGeometry(0.19, 0.009, low ? 5 : 8, low ? 24 : 56),
    alloy,
    "inner-rim",
    0.08,
  );
  const barrel = mesh(
    new T.CylinderGeometry(0.184, 0.184, 0.15, low ? 20 : 48, 1, true),
    dark,
    "barrel",
  );
  barrel.rotation.x = Math.PI / 2;
  const hub = mesh(
    new T.CylinderGeometry(0.044, 0.044, 0.035, low ? 12 : 24),
    alloy,
    "plain-hub",
    -0.08,
  );
  hub.rotation.x = Math.PI / 2;
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5,
      m = mesh(
        new T.BoxGeometry(0.025, 0.147, 0.026),
        alloy,
        "spoke-" + i,
        -0.078,
      );
    m.position.x = Math.sin(angle) * 0.111;
    m.position.y = Math.cos(angle) * 0.111;
    m.rotation.z = -angle;
  }
  const bytes = new Uint8Array(
    await new GLTFExporter().parseAsync(scene, { binary: true }),
  );
  const sha256 = createHash("sha256").update(bytes).digest("hex"),
    url = "/models/e34-build-studio/r1/" + sha256 + ".glb";
  await mkdir("public/models/e34-build-studio/r1", { recursive: true });
  await writeFile("public" + url, bytes);
  return { url, bytes, sha256 };
}
const high = await createWheel(),
  low = await createWheel(true);
const { url, bytes, sha256 } = high;
await writeFile(
  "data/build-studio/wheel-packages.json",
  JSON.stringify(
    [
      {
        id: "e34-original-ten-spoke-v1",
        label: "Original ten-spoke study",
        url,
        bytes: bytes.length,
        sha256,
        normalization: 1,
        lodLow: { url: low.url, bytes: low.bytes.length, sha256: low.sha256 },
        license: "CC0-1.0",
        creator: "E34 Lore",
        revision: 1,
        fitment:
          "Unmeasured appearance study; no manufacturer identity or fitment claim.",
      },
      {
        id: "e34-artist-wheel-v1",
        label: "Licensed artist wheel",
        url: "/models/e34-525i/e34-wheel.glb",
        bytes: 71772,
        sha256:
          "9fa22896feab63d5d8f5ca665d1bb1a54a05d659c3e6582791c2cd3f8f5638da",
        normalization: 0.32375 / 0.35049301385879517,
        lodLow: null,
        license: "CC-BY-4.0",
        creator: "Uralvagonzavod / UVZZZ",
        revision: 1,
        fitment: "Artist reference; no manufacturer identity or fitment claim.",
      },
    ],
    null,
    2,
  ) + "\n",
);
console.log({ url, bytes: bytes.length, sha256 });
