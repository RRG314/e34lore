import * as T from "three";
export type ModelPart = {
  object: T.Group;
  ids: string[];
  base: T.Vector3;
  offset: T.Vector3;
};
export type BuiltAssembly = { group: T.Group; parts: ModelPart[] };
const steel = () =>
  new T.MeshStandardMaterial({
    color: 0x8a9399,
    metalness: 0.7,
    roughness: 0.35,
  });
const cast = () =>
  new T.MeshStandardMaterial({
    color: 0xa9afb0,
    metalness: 0.45,
    roughness: 0.65,
  });
const rubber = () =>
  new T.MeshStandardMaterial({
    color: 0x22292c,
    metalness: 0.05,
    roughness: 0.86,
  });
const dark = () =>
  new T.MeshStandardMaterial({
    color: 0x3e474e,
    metalness: 0.6,
    roughness: 0.4,
  });
const brass = () =>
  new T.MeshStandardMaterial({
    color: 0xb8a16b,
    metalness: 0.7,
    roughness: 0.4,
  });
function mesh(
  group: T.Group,
  geometry: T.BufferGeometry,
  material: T.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const object = new T.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  group.add(object);
  return object;
}
function cylinder(
  group: T.Group,
  r: number,
  h: number,
  y = 0,
  material: T.Material = steel(),
  x = 0,
  z = 0,
  r2 = r,
  sides = 64,
) {
  return mesh(
    group,
    new T.CylinderGeometry(r2, r, h, sides),
    material,
    x,
    y,
    z,
  );
}
function ring(
  group: T.Group,
  outer: number,
  inner: number,
  height: number,
  y: number,
  material: T.Material = steel(),
) {
  const shape = new T.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new T.Path();
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new T.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    curveSegments: 64,
  });
  geometry.rotateX(-Math.PI / 2);
  return mesh(group, geometry, material, 0, y, 0);
}
function helix(
  group: T.Group,
  r: number,
  height: number,
  turns: number,
  wire: number,
  y: number,
  material: T.Material,
) {
  const points = [];
  for (let i = 0; i <= turns * 48; i++) {
    const t = i / (turns * 48),
      angle = t * turns * Math.PI * 2;
    points.push(
      new T.Vector3(Math.cos(angle) * r, y + t * height, Math.sin(angle) * r),
    );
  }
  return mesh(
    group,
    new T.TubeGeometry(
      new T.CatmullRomCurve3(points),
      Math.ceil(turns * 48),
      wire,
      10,
      false,
    ),
    material,
  );
}
function bolt(
  group: T.Group,
  x: number,
  y: number,
  z: number,
  size = 0.12,
  length = 0.5,
) {
  cylinder(group, size, length, y + length / 2, steel(), x, z);
  cylinder(
    group,
    size * 1.8,
    size * 1.3,
    y + length,
    steel(),
    x,
    z,
    size * 1.8,
    6,
  );
  const thread = new T.Group();
  thread.position.set(x, y, z);
  group.add(thread);
  helix(thread, size + 0.006, length * 0.65, 7, 0.012, 0, dark());
}
function plate(
  group: T.Group,
  points: [number, number][],
  thickness: number,
  material: T.Material,
  y = 0,
) {
  const shape = new T.Shape(points.map(([x, z]) => new T.Vector2(x, z)));
  const g = new T.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: 0.06,
    bevelThickness: 0.04,
    bevelSegments: 3,
  });
  g.rotateX(-Math.PI / 2);
  return mesh(group, g, material, 0, y, 0);
}
export function buildAssembly(assembly: string): BuiltAssembly {
  const group = new T.Group(),
    parts: ModelPart[] = [];
  function part(
    ids: string[],
    base: [number, number, number],
    offset: [number, number, number],
    draw: (g: T.Group) => void,
  ) {
    const object = new T.Group();
    object.name = "part:" + ids[0];
    draw(object);
    object.position.set(...base);
    object.traverse((node) => {
      node.userData.part = ids[0];
      node.userData.parts = ids;
    });
    group.add(object);
    parts.push({
      object,
      ids,
      base: object.position.clone(),
      offset: new T.Vector3(...offset),
    });
    return object;
  }
  if (assembly === "front-strut-upper") {
    const stack = (ids: string[], y: number, spread: number, draw: (g: T.Group) => void) =>
      part(ids, [0, y, 0], [0, spread, 0], draw);
    stack(["upper-spring-pad-oem"], 0, -0.55, g => {
      ring(g, 1.02, 0.32, 0.12, 0, rubber());
      ring(g, 1.02, 0.87, 0.09, 0.12, rubber());
    });
    stack(["upper-spring-plate-oem"], 0.14, -0.15, g => {
      ring(g, 1.03, 0.27, 0.11, 0, dark());
      ring(g, 0.43, 0.15, 0.14, 0.11, steel());
    });
    stack(["upper-flat-washer"], 0.39, 0.23, g => ring(g, 0.35, 0.13, 0.055, 0, steel()));
    stack(["upper-dust-collar"], 0.45, 0.53, g => {
      ring(g, 0.58, 0.46, 0.19, 0, rubber());
      ring(g, 0.58, 0.15, 0.065, 0.19, rubber());
    });
    stack(["upper-mount-standard", "upper-mount-camber"], 0.7, 0.97, g => {
      plate(g, [[0, -.94], [.72, -.62], [.89, .48], [.47, .75], [-.47, .75], [-.89, .48], [-.72, -.62]], .14, cast());
      ring(g, .5, .23, .28, .14, rubber());
      ring(g, .28, .13, .17, .41, steel());
      for (const [x, z] of [[0, .7], [.64, -.43], [-.64, -.43]]) bolt(g, x, .12, z, .065, .3);
    });
    stack(["upper-mount-washer"], 1.27, 1.38, g => ring(g, .29, .13, .055, 0, steel()));
    stack(["upper-strut-rod-nut"], 1.34, 1.72, g => ring(g, .22, .12, .15, 0, steel()));
    stack(["upper-strut-cap"], 1.5, 2.08, g => {
      ring(g, .35, .3, .16, 0, rubber());
      cylinder(g, .35, .06, .18, rubber());
    });
    part(["upper-mount-nut", "upper-mount-nut-alternate"], [.64, 1.2, -.43], [.65, 1.5, 0], g => {
      cylinder(g, .12, .13, .065, steel(), 0, 0, .12, 6);
    });
    part(["upper-mount-pin"], [.7, .68, .05], [.8, .47, 0], g => cylinder(g, .045, .24, 0, steel()));
    part(["strut-bump-stop-oem"], [0, -.52, 0], [1.28, -.12, 0], g => {
      ring(g, .28, .12, .58, 0, brass());
      for (const y of [.13, .32, .49]) ring(g, .29, .26, .08, y, rubber());
    });
    part(["strut-protection-tube-oem"], [0, -1.24, 0], [-1.28, -.23, 0], g => {
      ring(g, .36, .3, 1.03, 0, rubber());
      for (let index = 0; index < 8; index++) ring(g, .4, .33, .05, index * .13, rubber());
    });
    stack(["lower-spring-pad-oem"], -1.65, -.95, g => ring(g, 1.08, .35, .1, 0, rubber()));
    return { group, parts };
  }
  if (assembly === "front-strut" || assembly === "front-strut-damper") {
    const catalog = assembly.endsWith("damper");
    part(
      catalog
        ? [
            "strut-housing-left",
            "strut-housing-right",
            "strut-left-hub",
            "strut-right-hub",
          ]
        : ["strut-housing"],
      [0, 0, 0],
      [0, -0.35, 0],
      (g) => {
        cylinder(g, 0.33, 4, 2, dark());
        ring(g, 0.4, 0.27, 0.22, 4, steel());
        helix(g, 0.39, 0.25, 5, 0.014, 4, dark());
        ring(g, 1.15, 0.32, 0.12, 2.5, dark());
        const lip = mesh(
          g,
          new T.TorusGeometry(1.1, 0.06, 12, 80),
          dark(),
          0,
          2.61,
          0,
        );
        lip.rotation.x = Math.PI / 2;
        plate(
          g,
          [
            [-0.45, -0.4],
            [-0.8, -0.25],
            [-0.85, 0.15],
            [-0.45, 0.38],
            [0.65, 0.4],
            [1, 0.14],
            [0.7, -0.2],
          ],
          0.28,
          cast(),
          0.25,
        );
        const spindle = cylinder(g, 0.32, 1.45, 0.4, steel());
        spindle.rotation.z = Math.PI / 2;
        spindle.position.x = 0.8;
        for (const z of [-0.54, 0.5]) {
          const eye = ring(g, 0.23, 0.12, 0.25, 0.25, cast());
          eye.position.z = z;
          eye.position.x = -0.4;
        }
        bolt(g, -0.35, 0.48, -0.3, 0.11, 0.2);
        bolt(g, 0.4, 0.48, 0.22, 0.11, 0.2);
      },
    );
    part(
      catalog ? ["damper-catalog"] : ["strut-insert"],
      [0, 2.3, 0],
      [2.1, 0.4, 0],
      (g) => {
        cylinder(g, 0.24, 3, 0, steel());
        cylinder(g, 0.12, 2.5, 2.6, steel());
        cylinder(g, 0.26, 0.2, 1.54, dark());
        cylinder(g, 0.09, 0.38, 4, steel());
        helix(g, 0.094, 0.35, 8, 0.012, 3.82, dark());
      },
    );
    part(
      catalog ? ["damper-threaded-ring"] : ["strut-retaining-collar"],
      [0, 4.1, 0],
      [1.15, 1.25, 0],
      (g) => {
        ring(g, 0.4, 0.13, 0.18, 0, steel());
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          mesh(
            g,
            new T.BoxGeometry(0.09, 0.08, 0.12),
            dark(),
            Math.sin(a) * 0.31,
            0.17,
            Math.cos(a) * 0.31,
          );
        }
      },
    );
    if (!catalog) {
      part(["coil-spring"], [0, 2.7, 0], [-1.9, 0.2, 0], (g) =>
        helix(g, 0.92, 2.6, 5.2, 0.105, 0, dark()),
      );
      part(["bump-stop"], [0, 4.1, 0], [1.6, 1.8, 0], (g) => {
        cylinder(g, 0.28, 0.65, 0.3, brass(), 0, 0, 0.18);
        for (let i = 0; i < 3; i++)
          ring(g, 0.3 - i * 0.025, 0.12, 0.08, i * 0.18, rubber());
      });
      part(["strut-dust-tube"], [0, 3.3, 0], [-1.4, 1.7, 0], (g) => {
        ring(g, 0.34, 0.25, 1.3, 0, rubber());
        for (let i = 0; i < 10; i++)
          ring(g, 0.38, 0.3, 0.04, i * 0.13, rubber());
      });
      part(["spring-pad"], [0, 5.4, 0], [0, 1, 0], (g) =>
        ring(g, 1.08, 0.27, 0.09, 0, rubber()),
      );
      part(["upper-seat"], [0, 5.5, 0], [0, 1.5, 0], (g) => {
        ring(g, 1.12, 0.22, 0.1, 0, dark());
        cylinder(g, 0.39, 0.22, 0.15, steel());
        ring(g, 0.44, 0.12, 0.09, 0.25, dark());
      });
      part(["strut-mount"], [0, 5.95, 0], [0, 2.15, 0], (g) => {
        plate(
          g,
          [
            [-0.95, -0.5],
            [-0.65, 0.73],
            [0.63, 0.73],
            [0.95, -0.5],
            [0, -0.85],
          ],
          0.16,
          cast(),
        );
        ring(g, 0.58, 0.18, 0.33, 0.12, rubber());
        ring(g, 0.33, 0.13, 0.12, 0.43, steel());
        for (let i = 0; i < 3; i++) {
          const a = (i * 2 * Math.PI) / 3;
          bolt(g, Math.sin(a) * 0.77, 0.15, Math.cos(a) * 0.77, 0.09, 0.45);
        }
      });
      part(["strut-washer"], [0, 6.5, 0], [0, 2.5, 0], (g) =>
        ring(g, 0.3, 0.12, 0.06, 0, steel()),
      );
      part(["strut-top-nut"], [0, 6.6, 0], [0, 2.85, 0], (g) => {
        cylinder(g, 0.23, 0.2, 0.1, steel(), 0, 0, 0.23, 6);
        ring(g, 0.13, 0.08, 0.02, 0.2, dark());
      });
      part(["strut-cap"], [0, 6.9, 0], [0, 3.2, 0], (g) => {
        const m = mesh(
          g,
          new T.SphereGeometry(0.37, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
          rubber(),
        );
        m.scale.y = 0.5;
      });
    } else {
      part(["damper-spacer"], [-0.6, 0, 0], [-1.2, 1, 0], (g) =>
        ring(g, 0.36, 0.23, 0.18, 0, steel()),
      );
      part(
        ["abs-sensor-catalog", "abs-sensor-early"],
        [0.55, 0.8, 0.45],
        [1.8, 0.2, 0.7],
        (g) => {
          cylinder(g, 0.12, 0.48, 0, dark());
          plate(
            g,
            [
              [-0.16, 0],
              [-0.15, 0.4],
              [0.15, 0.4],
              [0.16, 0],
            ],
            0.08,
            rubber(),
          );
          const path = new T.CatmullRomCurve3([
            new T.Vector3(0, 0.2, 0),
            new T.Vector3(0.5, 1.2, 0.3),
            new T.Vector3(0.6, 2, 0.5),
            new T.Vector3(0.3, 2.5, 0.6),
          ]);
          mesh(g, new T.TubeGeometry(path, 64, 0.03, 8, false), rubber());
          mesh(g, new T.BoxGeometry(0.18, 0.4, 0.18), rubber(), 0.3, 2.6, 0.6);
        },
      );
    }
  } else if (assembly === "water-pump") {
    part(["coolant-pump"], [-1.8, 0, 0], [0, -0.8, 0], (g) => {
      cylinder(g, 0.7, 0.5, 0, cast(), 0, 0, 0.5);
      plate(
        g,
        [
          [-0.6, -0.6],
          [-1, -0.4],
          [-0.85, 0.13],
          [-0.35, 0.7],
          [0.4, 0.6],
          [0.9, 0.25],
          [0.8, -0.5],
        ],
        0.18,
        cast(),
        -0.3,
      );
      ring(g, 0.6, 0.37, 0.08, 0.28, steel());
      cylinder(g, 0.22, 0.75, 0.7, steel());
      ring(g, 0.45, 0.16, 0.12, 1, steel());
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        bolt(g, Math.cos(a) * 0.42, 0.96, Math.sin(a) * 0.42, 0.055, 0.12);
      }
      cylinder(g, 0.55, 0.18, -0.55, brass());
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4,
          m = mesh(
            g,
            new T.BoxGeometry(0.1, 0.22, 0.45),
            brass(),
            Math.cos(a) * 0.36,
            -0.68,
            Math.sin(a) * 0.36,
          );
        m.rotation.y = -a + 0.6;
      }
    });
    part(["pump-seal"], [-1.8, -0.33, 0], [0, -1.1, 0], (g) =>
      ring(g, 0.75, 0.67, 0.065, 0, rubber()),
    );
    part(["pump-nut"], [-1.8, 0.1, 0], [-1.15, 0.6, 0], (g) => {
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        cylinder(
          g,
          0.13,
          0.17,
          0,
          steel(),
          Math.cos(a) * 0.65,
          Math.sin(a) * 0.65,
          0.13,
          6,
        );
      }
    });
    part(["thermostat-housing"], [1.8, 1.3, 0], [0, 1.5, 0], (g) => {
      plate(
        g,
        [
          [-0.8, -0.65],
          [-0.9, 0.55],
          [0.3, 0.9],
          [0.85, 0.4],
          [0.75, -0.7],
        ],
        0.16,
        cast(),
      );
      ring(g, 0.68, 0.5, 0.25, 0.17, cast());
      const pipe = cylinder(g, 0.28, 1, 0.7, cast());
      pipe.rotation.z = 0.85;
      pipe.position.x = 0.6;
      ring(g, 0.32, 0.24, 0.11, 1.1, steel()).position.x = 0.96;
      for (const [x, z] of [
        [-0.7, 0.4],
        [-0.6, -0.5],
        [0.58, 0.65],
        [0.6, -0.5],
      ])
        bolt(g, x, 0.14, z, 0.065, 0.2);
    });
    part(["thermostat"], [1.8, 0.3, 0], [0, 0.4, 0], (g) => {
      ring(g, 0.62, 0.26, 0.08, 0.5, brass());
      cylinder(g, 0.3, 0.12, 0.6, steel());
      helix(g, 0.23, 0.65, 6, 0.035, -0.2, steel());
      cylinder(g, 0.08, 0.9, 0.2, brass());
      ring(g, 0.38, 0.16, 0.06, -0.25, brass());
    });
    part(["thermostat-seal"], [1.8, 0.85, 0], [0.2, 0.8, 0], (g) =>
      ring(g, 0.64, 0.58, 0.065, 0, rubber()),
    );
    part(["profile-gasket", "early-gasket"], [1.8, 1.2, 0], [-1.2, 1, 0], (g) =>
      ring(g, 0.7, 0.62, 0.055, 0, rubber()),
    );
    part(
      ["housing-bolt-m6", "housing-bolt-m8"],
      [2.5, 1.4, 0.4],
      [1, 0.5, 0],
      (g) => bolt(g, 0, 0, 0, 0.09, 0.7),
    );
  } else if (assembly === "front-brake" || assembly === "front-brake-disc") {
    const onlyDisc = assembly === "front-brake-disc";
    part(
      [onlyDisc ? "brake-disc" : "brake-disc-context", "front-disc-previous"],
      [0, 0, 0],
      [0, -0.8, 0],
      (g) => {
        ring(g, 1.8, 0.7, 0.12, 0, steel());
        ring(g, 1.8, 0.7, 0.12, 0.34, steel());
        ring(g, 0.8, 0.4, 0.5, 0.05, steel());
        for (let i = 0; i < 40; i++) {
          const a = (i * Math.PI) / 20,
            m = mesh(
              g,
              new T.BoxGeometry(0.055, 0.23, 0.93),
              cast(),
              Math.sin(a) * 1.25,
              0.23,
              Math.cos(a) * 1.25,
            );
          m.rotation.y = a;
        }
        const hat = new T.Shape();
        hat.absarc(0, 0, 0.8, 0, Math.PI * 2, false);
        for (let i = -1; i < 5; i++) {
          const hole = new T.Path(),
            a = (i * Math.PI * 2) / 5;
          hole.absarc(
            i === -1 ? 0 : Math.cos(a) * 0.6,
            i === -1 ? 0 : Math.sin(a) * 0.6,
            i === -1 ? 0.4 : 0.08,
            0,
            Math.PI * 2,
            true,
          );
          hat.holes.push(hole);
        }
        const geometry = new T.ExtrudeGeometry(hat, {
          depth: 0.11,
          bevelEnabled: false,
          curveSegments: 64,
        });
        geometry.rotateX(-Math.PI / 2);
        mesh(g, geometry, steel(), 0, 0.54, 0);
      },
    );
    if (onlyDisc) {
      part(
        ["disc-shield-left", "disc-shield-right"],
        [0, -0.3, 0],
        [-1.2, -1.6, 0],
        (g) => {
          const s = new T.Shape();
          s.absarc(0, 0, 1.9, 0.1, Math.PI * 1.8, false);
          s.absarc(0, 0, 0.6, Math.PI * 1.8, 0.1, true);
          s.closePath();
          const geo = new T.ExtrudeGeometry(s, {
            depth: 0.05,
            bevelEnabled: false,
            curveSegments: 60,
          });
          geo.rotateX(-Math.PI / 2);
          mesh(g, geo, dark());
        },
      );
      part(
        ["disc-locating-screw", "disc-locating-screw-early"],
        [0.6, 0.6, 0],
        [1.6, 1, 0],
        (g) => bolt(g, 0, 0, 0, 0.07, 0.38),
      );
      part(
        ["disc-shield-bolt", "disc-shield-bolt-old"],
        [-0.6, -0.3, 0],
        [-1.6, -0.3, 0],
        (g) => {
          bolt(g, 0, 0, 0, 0.07, 0.3);
          bolt(g, 0.35, 0, 0, 0.07, 0.3);
        },
      );
    } else {
      part(["brake-carrier"], [1.45, 0.3, 0], [1.8, 0, 0], (g) => {
        plate(
          g,
          [
            [-0.3, -1.25],
            [0.1, -1.3],
            [0.1, -0.85],
            [0.5, -0.85],
            [0.5, 0.9],
            [0.1, 0.9],
            [0.1, 1.3],
            [-0.3, 1.25],
          ],
          0.3,
          cast(),
        );
        for (const z of [-1, 1]) bolt(g, -0.05, 0.2, z, 0.11, 0.5);
      });
      part(["brake-pads"], [1.45, 0.5, 0], [0.9, 1.5, 0], (g) => {
        for (const y of [-0.6, 0.6]) {
          const shape = new T.Shape();
          shape.moveTo(-0.45, -0.8);
          shape.quadraticCurveTo(0.4, -1, 0.5, -0.5);
          shape.lineTo(0.5, 0.6);
          shape.quadraticCurveTo(0.2, 1, -0.45, 0.85);
          shape.closePath();
          const geo = new T.ExtrudeGeometry(shape, {
            depth: 0.12,
            bevelEnabled: true,
            bevelSize: 0.035,
            bevelThickness: 0.035,
            bevelSegments: 2,
          });
          geo.rotateX(-Math.PI / 2);
          mesh(g, geo, dark(), 0, y, 0);
          mesh(g, geo.clone(), rubber(), 0, y + 0.15, 0);
        }
      });
      part(
        [
          "brake-caliper",
          "caliper-housing-right",
          "caliper-assembly-left",
          "caliper-assembly-right",
        ],
        [1.65, 0.5, 0],
        [2.4, 1, 0],
        (g) => {
          for (const z of [-0.78, 0.78])
            mesh(g, new T.BoxGeometry(0.7, 1.5, 0.4), cast(), 0, 0, z);
          mesh(g, new T.BoxGeometry(0.65, 0.4, 1.9), cast(), 0.06, 0.75, 0);
          cylinder(g, 0.46, 0.4, -0.5, steel());
          ring(g, 0.49, 0.43, 0.08, -0.3, rubber());
          mesh(g, new T.BoxGeometry(0.6, 0.3, 1.9), cast(), 0.15, -0.8, 0);
          for (const z of [-0.8, 0.8])
            cylinder(g, 0.16, 1.7, 0, dark(), -0.4, z);
        },
      );
      part(["caliper-guide-bolt"], [1.2, 0.6, 0.9], [1.5, 2, 0], (g) =>
        bolt(g, 0, 0, 0, 0.09, 0.85),
      );
      part(["wear-sensor"], [1.2, 0.8, 0], [0.5, 2.5, 1], (g) => {
        mesh(g, new T.BoxGeometry(0.22, 0.15, 0.3), rubber());
        const curve = new T.CatmullRomCurve3([
          new T.Vector3(0, 0, 0),
          new T.Vector3(-0.6, 0.6, 0.4),
          new T.Vector3(-1, 1, 0.2),
        ]);
        mesh(g, new T.TubeGeometry(curve, 40, 0.025, 8, false), rubber());
      });
    }
  }
  if (!parts.length)
    throw Error("Unregistered reference assembly: " + assembly);
  return { group, parts };
}
