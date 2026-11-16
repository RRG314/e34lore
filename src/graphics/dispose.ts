import type { Object3D, BufferGeometry, Material, Texture } from "three";
/** Release shared geometry, material and texture resources once per scene. */
export function disposeObject(root: Object3D) {
  const geometries = new Set<BufferGeometry>(),
    materials = new Set<Material>(),
    textures = new Set<Texture>(),
    images = new Set<{ close: () => void }>();
  root.traverse((object) => {
    const renderable = object as Object3D & {
      geometry?: BufferGeometry;
      material?: Material | Material[];
    };
    if (renderable.geometry) geometries.add(renderable.geometry);
    if (renderable.material)
      for (const m of Array.isArray(renderable.material)
        ? renderable.material
        : [renderable.material])
        materials.add(m);
  });
  for (const material of materials)
    for (const value of Object.values(material)) {
      if (value && typeof value === "object" && (value as Texture).isTexture)
        textures.add(value as Texture);
    }
  for (const texture of textures) {
    const data = texture.source?.data as {close?:()=>void} | undefined;
    if (data && typeof data.close === "function") images.add(data as {close:()=>void});
    texture.dispose();
  }
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const image of images) image.close();
}
