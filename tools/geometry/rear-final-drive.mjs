import { ExtrudeGeometry, Group, Path, Shape, Vector3 } from 'three';
import { box, cylinder, lathe, mesh, ring, surface, tube, visualMaterials as M } from './525i-visual-details.mjs';

// The shared 33131213249 output flange has an 86 mm pitch circle for six M10 screws.
export const outputPitchRadius = .043;
const jointRadius = .050;

function boltCircle(index, radius = outputPitchRadius) {
  const angle = index * Math.PI / 3;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

function holedPlate(group, outside, width, z, material, center = 0, bolts = true) {
  const shape = new Shape();
  shape.absarc(0, 0, outside, 0, Math.PI * 2);
  const hole = (x, y, radius) => {
    const path = new Path();
    path.absarc(x, y, radius, 0, Math.PI * 2, true);
    shape.holes.push(path);
  };
  if (center) hole(0, 0, center);
  if (bolts) for (let i = 0; i < 6; i++) hole(...boltCircle(i), .00535);
  const geometry = new ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, curveSegments: 7 });
  geometry.translate(0, 0, -width / 2);
  mesh(group, geometry, material, [0, 0, z]);
}

function castHousing(group, stations, material) {
  const points = [], faces = [];
  const segments = 24;
  for (const [x, height, width, center] of stations) {
    for (let index = 0; index < segments; index++) {
      const a = index * Math.PI * 2 / segments;
      const shape = value => Math.sign(value) * Math.abs(value) ** .72;
      points.push([x, center + height * shape(Math.cos(a)), width * shape(Math.sin(a))]);
    }
  }
  for (let station = 0; station < stations.length - 1; station++) {
    for (let index = 0; index < segments; index++) {
      const a = station * segments + index;
      const b = station * segments + (index + 1) % segments;
      faces.push(a, b, a + segments, b, b + segments, a + segments);
    }
  }
  const end = (stations.length - 1) * segments;
  for (let index = 1; index < segments - 1; index++) {
    faces.push(0, index + 1, index, end, end + index, end + index + 1);
  }
  surface(group, points, faces, material);
}

function housing(group, cover, nose, e30) {
  castHousing(group, [
    [cover, .111, .118, .001], [cover + .008, .113, .122, .001],
    [cover + .039, .108, .132, .002], [-.051, .106, .135, .005],
    [.025, .098, .124, .012], [nose - .092, .081, .100, .013],
    [nose - .054, .060, .078, .007], [nose - .024, .047, .056, 0],
    [nose, .041, .048, 0],
  ], M.dark);
  for (const sign of [-1, 1]) {
    const outputX = e30 ? -.014 : 0;
    cylinder(group, .069, .034, [outputX, 0, sign * .122], M.dark, 'z', 28);
    ring(group, .060, .0375, .012, [outputX, 0, sign * .143], M.steel, 'z', 28);
    for (let i = 0; i < 6; i++) {
      const [x, y] = boltCircle(i, .053);
      cylinder(group, .006, .005, [x + outputX, y, sign * .150], M.steel, 'z', 6);
    }
    for (const y of [-.056, .046]) {
      const rib = box(group, [nose + .086, .016, .018], [(nose - .12) / 2, y, sign * .084], M.dark, .004);
      rib.rotation.y = sign * .18;
    }
    if (e30) {
      for (const x of [-.099, .040]) box(group, [.058, .025, .050], [x, .106, sign * .092], M.dark, .004);
    }
  }
  if (!e30) box(group, [.076, .050, .060], [nose - .049, .053, 0], M.dark, .007);
  ring(group, .044, .024, .007, [nose - .0035, 0, 0], M.steel, 'x', 30);
}

function rearCover(group, e30) {
  castHousing(group, [
    [-.050, .079, .075, -.005], [-.043, .100, .101, -.004],
    [-.026, .109, .114, -.002], [-.006, .112, .122, .001],
    [0, .111, .118, .001],
  ], M.alloy);
  for (const z of [-.096, -.072, -.048, -.024, .024, .048, .072, .096]) {
    const height = .178 - Math.abs(z) * .42;
    const depth = .036 - Math.abs(z) * .13;
    box(group, [depth, height, .0048], [-.038, -.014, z], M.alloy, .0022);
  }
  for (let index = 0; index < 8; index++) {
    const a = index * Math.PI / 4 + Math.PI / 8;
    const y = Math.cos(a) * .105;
    const z = Math.sin(a) * .112;
    cylinder(group, .011, .011, [-.012, y, z], M.alloy, 'x', 16);
    cylinder(group, .006, .006, [-.020, y, z], M.steel, 'x', 6);
  }
  for (const y of [-.085, .024]) {
    cylinder(group, .017, .011, [-.049, y, .033], M.alloy, 'x', 24);
  }
  if (e30) {
    box(group, [.061, .053, .061], [-.042, .089, -.080], M.alloy, .009);
    ring(group, .033, .026, .048, [-.066, .114, -.080], M.alloy, 'z', 32);
  } else {
    for (const z of [-.106, .106]) {
      box(group, [.080, .048, .054], [-.038, .070, z], M.alloy, .007);
      ring(group, .020, .0065, .007, [-.075, .075, z], M.machined, 'x', 24);
    }
  }
}

function jointBoot(group, start, end, smallAtEnd) {
  const length = end - start;
  const profile = [];
  for (let i = 0; i <= 16; i++) {
    const f = i / 16;
    const taper = smallAtEnd ? f : 1 - f;
    profile.push([.031 - .017 * taper - .004 * (i % 4 === 2 ? 1 : 0), start + length * f]);
  }
  lathe(group, profile, M.rubber, 'z', 28);
  for (const [z, r] of [[start, profile[0][0]], [end, profile.at(-1)[0]]]) {
    ring(group, r + .0008, r - .001, .0035, [0, 0, z], M.steel, 'z', 24);
    box(group, [.006, .002, .004], [0, r + .001, z], M.machined, .0005);
  }
}

function cvBody(group, at, direction, boltOn) {
  const neck = at + direction * .026;
  const lip = at + direction * .003;
  if (boltOn) {
    holedPlate(group, jointRadius, .006, lip, M.machined, .019);
    holedPlate(group, jointRadius - .0015, .007, at + direction * .0095, M.steel, .018);
  }
  const profile = [
    [.016, at + direction * .006], [boltOn ? .037 : .043, at + direction * .007],
    [.043, at + direction * .014], [.042, at + direction * .021], [.032, neck],
  ].sort((a, b) => a[1] - b[1]);
  lathe(group, profile, M.dark, 'z', 32);
}

function halfshaft(group, delta, e30) {
  const [x, y, length] = delta;
  const start = new Vector3(0, 0, .021);
  const end = new Vector3(x, y, length - .021);
  const shaft = cylinder(group, e30 ? .013 : .014, start.distanceTo(end),
    start.clone().lerp(end, .5).toArray(), M.dark, 'z', 28);
  shaft.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), end.sub(start).normalize());
  cvBody(group, 0, 1, true);
  jointBoot(group, .026, .077, true);
  const outer = new Group();
  outer.position.set(x, y, 0);
  group.add(outer);
  cvBody(outer, length, -1, !e30);
  if (e30) ring(outer, .040, .016, .009, [0, 0, length - .0045], M.machined, 'z', 30);
  jointBoot(outer, length - .077, length - .026, false);
  for (const z of [.087, length - .088]) {
    const f = (z - .021) / (length - .042);
    ring(group, .0152, .013, .007, [x * f, y * f, z], M.steel, 'z', 22);
  }
}

function splinedStub(group, length) {
  const core = .0148;
  cylinder(group, core, length - .020, [0, 0, (length - .020) / 2], M.machined, 'z', 38);
  for (let i = 0; i < 27; i++) {
    const angle = i * Math.PI * 2 / 27;
    const tooth = box(group, [.0014, .0017, length - .027], [Math.cos(angle) * core, Math.sin(angle) * core, length / 2 - .011], M.steel, .0002);
    tooth.rotation.z = angle;
  }
  cylinder(group, .011, .020, [0, 0, length - .010], M.machined, 'z', 24);
  for (let i = 1; i < 8; i++) ring(group, .0113, .010, .00048, [0, 0, length - .019 + i * .002], M.steel, 'z', 22);
}

function hexSocket(group, length, radius, at, axis, e12 = false) {
  const [x, y, z] = at;
  cylinder(group, radius, length, at, M.steel, axis, e12 ? 12 : 6);
  const tip = axis === 'x' ? [x - length / 2 - .00025, y, z] : [x, y, z - length / 2 - .00025];
  cylinder(group, radius * .45, .0005, tip, M.rubber, axis, 6);
}

function cvBolt(group, e30, fromInside) {
  const sign = fromInside ? 1 : -1;
  cylinder(group, .0049, .050, [0, 0, sign * .011], M.steel, 'z', 16);
  for (let i = 0; i < 6; i++) ring(group, .005, .0036, .00055, [0, 0, sign * (.022 + i * .002)], M.dark, 'z', 16);
  if (e30) {
    cylinder(group, .0074, .007, [0, 0, -sign * .018], M.dark, 'z', 22);
    for (let i = 0; i < 6; i++) {
      const [x, y] = boltCircle(i, .0040);
      cylinder(group, .0028, .006, [x, y, -sign * .022], M.steel, 'z', 10);
    }
  } else {
    const head = cylinder(group, .0078, .007, [0, 0, -sign * .018], M.steel, 'z', 24);
    head.rotation.z = Math.PI / 12;
    cylinder(group, .0046, .0004, [0, 0, -sign * .0215], M.rubber, 'z', 6);
  }

}

function reinforcement(group, z) {
  const shape = new Shape();
  const edge = (index, radius) => {
    const angle = (15 * index - 12) * Math.PI / 180;
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  };
  shape.moveTo(...edge(0, .052));
  for (let i = 1; i <= 6; i++) shape.lineTo(...edge(i, .052));
  for (let i = 6; i >= 0; i--) shape.lineTo(...edge(i, .034));
  shape.closePath();
  for (const i of [0, 1]) {
    const hole = new Path();
    hole.absarc(...boltCircle(i), .0052, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geometry = new ExtrudeGeometry(shape, {depth: .002, bevelEnabled: false, curveSegments: 6});
  geometry.translate(0, 0, z - .001);
  mesh(group, geometry, M.steel);
}

function supportBolt(group, axis, length, radius) {
  const shaft = axis === 'y' ? [0, -length / 2, 0] : axis === 'x' ? [-length / 2, 0, 0] : [0, 0, -length / 2];
  cylinder(group, .006, length, shaft, M.steel, axis, 20);
  cylinder(group, radius, .008, [0, 0, 0], M.machined, axis, 6);
  ring(group, .013, .0065, .002, shaft.map(value => Math.sign(value) * .005), M.steel, axis, 24);
}

export function buildE30RearCarrier(g, center, includePivotBrackets = true) {
    const at = (x, y, z) => [center[0] + x, center[1] + y, z];
      for (const sign of [-1, 1]) {
        const rail = includePivotBrackets
          ? [[-.958,.250,0],[-.983,.253,sign*.157],[-1.021,.244,sign*.300],[-1.075,.237,sign*.455],[-1.104,.230,sign*.545]]
          : [[-.958,.250,0],[-.963,.253,sign*.157],[-.966,.242,sign*.300],[-1.004,.231,sign*.455],[-1.104,.230,sign*.545]];
        tube(g, rail, .035, M.dark, 18);
        ring(g, .051, .022, .049, [-1.105,.226,sign*.548], M.dark, 'y', 28);
        ring(g, .022, .008, .047, [-1.105,.226,sign*.548], M.rubber, 'y', 24);
        if (includePivotBrackets) for (const z of [.297,.440]) box(g, [.093,.040,.041], [-1.104,.231,sign*z], M.steel, .005);
        for (const x of [-.099,.040]) {
          const mount = at(x,.126,sign*.092);
          box(g, [.060,.011,.043], mount, M.steel, .003);
          tube(g, [mount, at(x,.124,sign*.162),[-1.035,.310,sign*.206],[-1.000,.259,sign*.235]], .013, M.dark, 11);
        }
      }
}

export function buildRearFinalDrive(series, anchors, add) {
  const e30 = series === 'e30';
  const { center, inputBack, output, hubs } = anchors;
  const rearFace = e30 ? -.162 : -.180;
  const at = (x, y, z) => [center[0] + x, center[1] + y, z];
  const cover = at(rearFace, 0, 0);
  add('case', 'Rear final drive housing', center, g => housing(g, rearFace, inputBack - center[0], e30), 'case');
  add('cover', 'Finned differential cover', cover, g => rearCover(g, e30), 'cover', [e30 ? '33111210431' : '33101211707']);
  add('ring-gear', 'Differential crown wheel and carrier', at(e30 ? -.014 : 0, 0, -.026), g => {
    ring(g, .090, .058, .024, [0, 0, 0], M.steel, 'z', 52);
    ring(g, .059, .027, .039, [0, 0, .011], M.dark, 'z', 32);
    for (let i = 0; i < 41; i++) {
      const angle = i * Math.PI * 2 / 41;
      const tooth = box(g, [.009, .008, .026], [.089 * Math.cos(angle), .089 * Math.sin(angle), -.001], M.machined, .0004);
      tooth.rotation.z = angle + .26;
    }
  }, 'case', [], true);
  add('pinion', 'Differential drive pinion', at(.066, 0, 0), g => {
    cylinder(g, .021, inputBack - center[0] - .076, [(inputBack - center[0] - .076) / 2, 0, 0], M.steel, 'x', 24);
    cylinder(g, .036, .022, [-.012, 0, 0], M.dark, 'x', 24, .031);
    for (let i = 0; i < 11; i++) {
      const a = i * Math.PI * 2 / 11;
      const tooth = box(g, [.022, .009, .010], [-.012, Math.cos(a) * .033, Math.sin(a) * .033], M.machined, .0005);
      tooth.rotation.x = a;
    }
  }, 'case', [], true);
  add('sender', 'Speedometer pulse sender', at(rearFace - .052, .040, -.033), g => {
    ring(g, .0135, .0076, .003, [0, 0, 0], M.rubber, 'x', 24);
    cylinder(g, .0115, .018, [-.005, 0, 0], M.plastic, 'x', 24);
    box(g, [.020, .032, .025], [-.016, 0, 0], M.plastic, .004);
    for (const z of [-.013, .013]) cylinder(g, .0037, .004, [-.018, -.002, z], M.steel, 'x', 6);
  }, 'cover', [e30 ? '62168355008' : '62161390063']);
  add('sender-plug', 'Speedometer harness connector', at(rearFace - .072, .050, -.033), g => {
    box(g, [.018, .025, .018], [-.005, .011, 0], M.plastic, .003);
    box(g, [.005, .016, .004], [-.003, .012, .011], M.steel, .001);
    tube(g, [[-.006,.020,0],[-.014,.034,0],[-.023,.044,-.007]], .003, M.rubber, 9);
  }, 'cover');
  for (const [key, y] of [['fill', .024], ['drain', -.085]]) {
    add(key + '-plug', (key === 'fill' ? 'Fill' : 'Drain') + ' plug and seal', at(rearFace - .060, y, .033), g => {
      hexSocket(g, .009, .012, [0, 0, 0], 'x');
      ring(g, .0128, .009, .0015, [.0045, 0, 0], M.rubber, 'x', 26);
    }, 'cover', ['33117525064']);
  }
  if (e30) {
    add('carrier', 'Rear axle carrier', [0, 0, 0], g => buildE30RearCarrier(g, center), 'carrier');
    for (const side of [-1, 1]) {
      for (const [name, x] of [['front', .040], ['rear', -.099]]) {
        const key = name + '-mount-' + (side < 0 ? 'left' : 'right');
        add(key, name + ' differential carrier bolt (' + (side < 0 ? 'left' : 'right') + ')',
          at(x, .144, side * .092), g => supportBolt(g, 'y', .034, .0107), 'carrier');
      }
    }
    add('cover-mount', 'Rear differential mounting bushing', at(rearFace - .066, .114, -.080), g => {
      ring(g, .026, .007, .046, [0, 0, 0], M.rubber, 'z', 32);
      ring(g, .0105, .0065, .049, [0, 0, 0], M.machined, 'z', 24);
    }, 'cover', ['33171135242', '33171128586']);
    add('rear-mount-bolt', 'Rear differential through bolt', at(rearFace - .066, .114, -.048),
      g => supportBolt(g, 'z', .055, .0107), 'cover', ['07119914636']);
    add('rear-mount-nut', 'Rear differential through-bolt locknut', at(rearFace - .066, .114, -.112),
      g => ring(g, .0108, .006, .012, [0, 0, 0], M.steel, 'z', 6), 'cover', ['07129900047']);
  } else {
    const frontX = inputBack - center[0] - .061;
    add('front-mount', 'Front differential mounting sleeve', at(frontX, .105, 0), g => {
      ring(g, .026, .017, .026, [0, 0, 0], M.dark, 'x', 28);
      ring(g, .017, .007, .027, [0, 0, 0], M.rubber, 'x', 28);
    }, 'carrier', ['33311132251']);
    add('front-mount-bolt', 'Front differential mounting bolt', at(frontX + .032, .105, 0),
      g => supportBolt(g, 'x', .065, .0110), 'carrier');
    for (const [side, z] of [['left', -.106], ['right', .106]]) {
      add('rear-mount-' + side, 'Rear differential carrier bushing (' + side + ')',
        at(rearFace - .082, .075, z), g => {
          ring(g, .024, .009, .027, [0, 0, 0], M.rubber, 'x', 26);
          ring(g, .011, .0062, .028, [0, 0, 0], M.steel, 'x', 24);
        }, 'carrier');
      add('rear-mount-bolt-' + side, 'Rear differential mounting bolt (' + side + ')',
        at(rearFace - .112, .075, z), g => supportBolt(g, 'x', .046, .0105), 'carrier', [], false, 'reverse');
    }
  }
  for (const [side, sign] of [['left', -1], ['right', 1]]) {
    const inboard = at(e30 ? -.014 : 0, 0, sign * output);
    const hub = hubs[side];
    const delta = hub.inboard.map((coordinate, axis) => (coordinate - inboard[axis]) * (axis === 1 ? 1 : sign));
    add(side + '-output', 'Differential output flange (' + side + ')', inboard, g => {
      holedPlate(g, jointRadius, .010, -.005, M.machined, .017);
      lathe(g, [[.023,-.046], [.023,-.018], [.030,-.018], [.030,-.009], [.038,-.009], [.038,-.005]], M.steel, 'z', 32);
      ring(g, .047, .027, .004, [0, 0, -.021], M.steel, 'z', 30);
    }, 'output', ['33131213249'], false, sign);
    add(side + '-axle', (side === 'left' ? 'Left' : 'Right') + ' rear halfshaft', inboard,
      g => halfshaft(g, delta, e30), 'shaft', [e30 ? '33211226901' : '33211226720'], false, sign);
    if (e30) {
      const stubLength = Math.abs(hub.outer[2] - hub.inboard[2]) + .021;
      add(side + '-stub', 'Outer splined axle stub (' + side + ')', hub.inboard,
        g => splinedStub(g, stubLength), 'shaft', [], false, sign);
      add(side + '-collar', 'M22 axle collar nut (' + side + ')', hub.outer, g => {
        ring(g, .0174, .011, .005, [0, 0, .004], M.steel, 'z', 28);
        ring(g, .0173, .011, .013, [0, 0, .012], M.machined, 'z', 6);
      }, 'hub', ['33411125664'], false, sign);
      add(side + '-lock', 'Axle nut locking plate (' + side + ')', hub.outer, g => {
        ring(g, .0197, .0174, .005, [0, 0, .004], M.steel, 'z', 30);
        for (let i = 0; i < 6; i++) {
          const [x, y] = boltCircle(i, .0179);
          box(g, [.004, .0035, .006], [x, y, .008], M.steel, .0005);
        }
      }, 'hub', ['33411124945'], false, sign);
    } else {
      add(side + '-hub-flange', 'Wheel-side CV drive flange (' + side + ')', hub.inboard, g => {
        holedPlate(g, jointRadius, .009, .0045, M.machined, .018);
        ring(g, .025, .017, .005, [0, 0, .0105], M.steel, 'z', 28);
      }, 'hub', ['33411134880'], false, sign);
    }
    for (const [end, plane] of [['inner', inboard], ...(!e30 ? [['outer', hub.inboard]] : [])]) {
      for (let i = 0; i < 3; i++) {
        add(side + '-' + end + '-plate-' + (i + 1), 'CV bolt reinforcement plate (' + side + ' ' + end + ')', plane,
          g => {
            const plate = new Group();
            plate.rotation.z = i * 2 * Math.PI / 3;
            g.add(plate);
            reinforcement(plate, end === 'inner' ? .0135 : -.0135);
          }, 'shaft', ['33207572717'], false, sign, end + '-plate-' + i);
      }
      for (let i = 0; i < 6; i++) {
        const [x, y] = boltCircle(i);
        add(side + '-' + end + '-bolt-' + (i + 1), (end === 'inner' ? 'Inner' : 'Outer') + ' CV bolt (' + side + ')',
          [plane[0] + x * sign, plane[1] + y, plane[2]], g => cvBolt(g, e30, end === 'outer'), 'shaft',
          [e30 ? '33211227279' : '07119919620'], false, sign, end + '-bolt');
      }
    }
  }
}

export function partTransform(group, orientation) {
  if (orientation === -1 || orientation === 'reverse') group.rotation.y = Math.PI;
  return group;
}
