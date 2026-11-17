import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { Box3, BoxGeometry, CylinderGeometry, Group, Matrix4, Mesh, MeshStandardMaterial } from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { demoCatalog } from "../src/demo/catalog.ts";

globalThis.FileReader = class {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
};

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const credit = {
  author: "E34 Lore contributors", url: "https://github.com/RRG314/e34lore",
  license: "CC0-1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
};

async function build(series, id, revision, color) {
  const { entry, context, assembly, position, part } = demoCatalog[series];
  const scene = new Group();
  const assetId = series + ":demo";
  const group = (id, name, kind, parentId) => ({
    id, name, kind, parentId, assetId: null, systemIds: [], meshNames: [],
    matrix: new Matrix4().toArray(), bounds: null, internal: false,
    canonicalId: null, oem: null, guideIds: [], thumbnail: null,
  });
  const nodes = [
    group("vehicle", "Workshop demonstration", "root", null),
    group("system:cooling", "Sample cooling assembly", "system", "vehicle"),
    group("system:exterior", "Body and wheels", "system", "vehicle"),
  ];
  const paint = new MeshStandardMaterial({ name: "Demo body", color, roughness: .4, metalness: .27 });
  const dark = new MeshStandardMaterial({ color: 0x252f31, roughness: .78 });
  const glass = new MeshStandardMaterial({ color: 0x4c7175, roughness: .3, metalness: .22 });
  const metal = new MeshStandardMaterial({ color: 0xb6bdba, roughness: .36, metalness: .2 });
  const pumpMaterial = new MeshStandardMaterial({ color: 0xc88345, roughness: .41, metalness: .2 });
  const grounded = series === "e34" ? 1 : .93;

  function add(id, name, system, geometry, mat, at, direction, rotation = 0) {
    const mesh = new Mesh(geometry, mat);
    mesh.name = id.replaceAll(":", "_");
    mesh.position.set(...at);
    mesh.rotation.x = rotation;
    scene.add(mesh);
    const bounds = new Box3().setFromObject(mesh, true);
    const node = group(id, name, "part", system);
    Object.assign(node, { assetId, meshNames: [mesh.name], systemIds: [system],
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, displayDirection: direction });
    nodes.push(node);
    return node;
  }
  const body = "system:exterior", cooling = "system:cooling";
  const shell = (length, height, width, radius = .035) => new RoundedBoxGeometry(length, height, width, 2, radius);
  const prefix = series + "body:";
  add(prefix+"frame", "Body frame", body, shell(3.4*grounded,.29,1.43,.09), paint, [0,.46,0], [0,-.3,0]);
  add(prefix+"cabin", "Cabin", body, shell(1.46*grounded,.39,1.21,.11), glass, [-.30,.92,0], [0,.75,0]);
  add(prefix+"roof", "Roof", body, shell(1.38*grounded,.077,1.22), paint, [-.32,1.125,0], [0,1,0]);
  add(prefix+"hood", "Hood", body, shell(1.04*grounded,.076,1.39), paint, [1.10*grounded,.763,0], [.5,.88,0]);
  add(prefix+"trunk", "Trunk lid", body, shell(.65,.099,1.38), paint, [-1.34*grounded,.689,0], [-.72,.5,0]);
  for (const [side, s] of [["left",-1],["right",1]]) {
    add(prefix+"door-"+side, side === "left" ? "Left door" : "Right door", body,
      shell(1.16,.318,.07), paint, [-.12,.655,s*.735], [0,.15,s*.85]);
    for (const [axle, sign] of [["front",1],["rear",-1]]) {
      const at = [sign*1.16*grounded,.301,s*.78];
      add("wheel:"+axle+"-"+side, "Wheel", body, new CylinderGeometry(.29,.29,.16,26), dark, at, [sign*.3,-.12,s*.9], Math.PI/2);
      add("hub:"+axle+"-"+side, "Wheel hub", body, new CylinderGeometry(.174,.174,.026,20), metal, [at[0],at[1],s*.868], [sign*.3,-.12,s*1.18], Math.PI/2);
    }
    add(prefix+"headlight-"+side, "Headlight", body, shell(.069,.12,.32), metal, [1.705*grounded,.625,s*.43], [.6,.25,s*.3]);
  }
  add(series+":radiator","Sample radiator",cooling,shell(.075,.36,.57),dark,[1.48*grounded,.606,0],[.74,.32,0]);
  const pump = add(series+":sample-pump",part.name,cooling,new CylinderGeometry(.116,.095,.11,24),pumpMaterial,
    [1.08*grounded,.675,-.13],[.1,.7,-.43],Math.PI/2);
  pump.canonicalId = part.id;
  pump.oem = entry.number;
  pump.sourceContext = { contextId: context.id, assemblyId: assembly.id, positionId: position.id };

  const data = Buffer.from(await new GLTFExporter().parseAsync(scene, { binary: true }));
  const folder = `/models/${series}-lore/r${revision}/`, sha256 = hash(data);
  const asset = { id: assetId, url: folder+sha256+".glb", bytes: data.length, sha256 };
  const configuration = { id, year: entry.year, model: entry.model, engine: entry.engine, body: entry.body, transmission: entry.transmission };
  const manifest = {
    schemaVersion: 1, id, revision, reference: series.toUpperCase()+" · Workshop demonstration",
    mechanicalExplosion: true, vehicleReference: configuration, credit,
    limits: "An original demonstration model. Geometry, component placement, and part numbers are examples.",
    openingPanels: [{ id: prefix+"hood", label: "Hood", pivot: [1.6*grounded,.76,0], axis: [0,0,1], angle: -62, slide: [0,0,0] }],
    assets: [asset], nodes,
  };
  const bytes = Buffer.from(JSON.stringify(manifest)), digest = hash(bytes);
  const manifestUrl = folder+"manifest."+digest+".json";
  await mkdir("public"+folder, { recursive: true });
  await writeFile("public"+asset.url, data);
  await writeFile("public"+manifestUrl, bytes);
  return { ...configuration, label: `${series.toUpperCase()} · Workshop demo`, revision,
    manifestUrl, sha256: digest, assetBytes: data.length, renderableCount: nodes.filter(n => n.assetId).length, contextId: context.id };
}

const e34 = await build("e34", "e34-525i-sedan-automatic", 9001, 0x6d9294);
const e30 = await build("e30", "e30-325i-coupe-manual", 9002, 0xaa5446);
await writeFile("src/demo/model-pins.json", JSON.stringify({ e34, e30 }, null, 2)+"\n");
