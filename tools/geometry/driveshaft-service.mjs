import { ExtrudeGeometry, Group, Path, Shape } from 'three';
import { centerSupport, sealedSupportBearing } from './525i-center-support.mjs';
import { box, cylinder, lathe, mesh, ring, surface, visualMaterials as M } from './525i-visual-details.mjs';

function circleHole(shape, u, v, radius) {
  const hole = new Path();
  hole.absarc(u, v, radius, 0, 2 * Math.PI, true);
  shape.holes.push(hole);
}

function plate(group, shape, width, material, at = [0, 0, 0], bevel = 0) {
  const geometry = new ExtrudeGeometry(shape, {
    depth: width, curveSegments: 16, bevelEnabled: bevel > 0,
    bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1,
  });
  geometry.translate(0, 0, -width / 2);
  geometry.rotateY(Math.PI / 2);
  return mesh(group, geometry, material, at);
}

function lugCenter(index, pitchRadius) {
  const angle = index * Math.PI / 3;
  return [pitchRadius * Math.cos(angle), pitchRadius * Math.sin(angle)];
}

function coupling(group, dimensions) {
  const { outer, pitchRadius, boltRadius, width } = dimensions;
  const body = new Shape();
  for (let i = 0; i <= 96; i++) {
    const a = i * Math.PI / 48;
    const radius = outer - .005 * (1 - Math.cos(6 * a)) / 2 - .001;
    body[i === 0 ? 'moveTo' : 'lineTo'](Math.sin(a) * radius, Math.cos(a) * radius);
  }
  body.closePath();
  circleHole(body, 0, 0, .022);
  for (let i = 0; i < 6; i++) {
    const [y, z] = lugCenter(i, pitchRadius);
    circleHole(body, -z, y, boltRadius + .0042);
    ring(group, boltRadius + .0042, boltRadius + .00035, width + .003, [0, y, z], M.machined, 'x', 28);
    // Raised marks alternate direction with the flange each sleeve engages.
    const sign = i % 2 === 0 ? 1 : -1;
    const a = i * Math.PI / 3;
    const radial = outer - .0012;
    const at = (x, t) => [x * sign, Math.cos(a) * radial - Math.sin(a) * t, Math.sin(a) * radial + Math.cos(a) * t];
    surface(group, [at(-.005, -.003), at(.006, 0), at(-.005, .003), at(-.005, -.001),
      at(-.011, -.001), at(-.011, .001), at(-.005, .001)], [0,1,2,3,4,5,3,5,6,2,1,0,5,4,3,6,5,3], M.edge);
  }
  plate(group, body, width, M.rubber, [0, 0, 0], .001);
}

function flange(group, dimensions, first, face, direction) {
  const { pitchRadius, boltRadius } = dimensions;
  const shape = new Shape();
  const angle = first * Math.PI / 3;
  for (let index = 0; index <= 96; index++) {
    const a = index * Math.PI / 48;
    const projection = Math.max(0, Math.cos(3 * (a - angle)));
    const radius = .022 + (pitchRadius + boltRadius + .005 - .022) * projection ** .34;
    shape[index === 0 ? 'moveTo' : 'lineTo'](-Math.sin(a) * radius, Math.cos(a) * radius);
  }
  shape.closePath();
  for (let index = first; index < 6; index += 2) {
    const [y, z] = lugCenter(index, pitchRadius);
    circleHole(shape, -z, y, boltRadius + .0004);
  }
  plate(group, shape, .009, M.steel, [face + direction * .0045, 0, 0], .0004);
  ring(group, .023, .012, .021, [face + direction * .018, 0, 0], M.machined, 'x', 40);
}

function weldedTube(group, start, end, yStart, yEnd, radius) {
  const average = (start + end) / 2;
  const pipe = cylinder(group, radius, Math.hypot(end - start, yEnd - yStart), [average, (yStart + yEnd) / 2, 0], M.dark, 'x', 40);
  pipe.rotation.z = Math.atan2(yEnd - yStart, end - start);
  for (const [x, y] of [[start + .013, yStart], [end - .013, yEnd]]) {
    ring(group, radius + .0013, radius - .0025, .0045, [x, y, 0], M.seam, 'x', 36);
  }
  box(group, [.034, .0038, .014], [average - .035, (yStart + yEnd) / 2 - radius, .002], M.steel, .001);
}

function yoke(group, end, direction, centerY) {
  cylinder(group, .021, .025, [end + direction * .013, centerY, 0], M.steel, 'x', 36);
  for (const side of [-1, 1]) {
    box(group, [.037, .021, .015], [end - direction * .004, centerY, side * .019], M.steel, .006);
    cylinder(group, .010, .006, [end - direction * .011, centerY, side * .025], M.machined, 'z', 24);
  }
}

function tunnelShield(group, e30) {
  const vertices = [];
  const indices = [];
  const stations = 24;
  const segments = 14;
  const layer = (stations + 1) * (segments + 1);
  for (let face = 0; face < 2; face++) {
    for (let i = 0; i <= stations; i++) {
      const t = i / stations;
      const endWidth = .77 + .23 * Math.sin(Math.PI * t) ** .6;
      for (let j = 0; j <= segments; j++) {
        const u = 2 * j / segments - 1;
        const x = (t - .5) * (e30 ? 1.18 : 1.25) - .035 * Math.abs(u) ** 3;
        const z = u * .182 * endWidth;
        const y = .012 * (1 - u * u) + .019 * Math.abs(u) ** 10 + .0024 * Math.cos(t * 26 * Math.PI) * (1 - u ** 6);
        vertices.push([x, y + face * .002, z]);
        if (i === stations || j === segments) continue;
        const a = face * layer + i * (segments + 1) + j;
        const b = a + segments + 1;
        if (face) indices.push(a, a + 1, b, a + 1, b + 1, b);
        else indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  for (let i = 0; i <= stations; i++) {
    for (const side of [0, segments]) {
      if (i === stations) continue;
      const a = i * (segments + 1) + side, b = a + segments + 1;
      indices.push(a, a + layer, b, b, a + layer, b + layer);
    }
  }
  surface(group, vertices, indices, M.alloy);
  for (const x of [-.44, -.15, .16, .44]) {
    for (const z of [-.148, .148]) ring(group, .009, .0034, .003, [x, .015, z], M.steel, 'y', 24);
  }
}

function bolt(group, radius, length, direction, head) {
  cylinder(group, radius, length, [direction * length / 2, 0, 0], M.machined, 'x', 20);
  cylinder(group, head, .0065, [-direction * .00325, 0, 0], M.steel, 'x', 6);
  cylinder(group, head * .89, .0016, [-direction * .0065, 0, 0], M.machined, 'x', 6);
  for (let i = 0; i < 5; i++) {
    ring(group, radius + .00045, radius - .0003, .00045, [direction * (length - .0014 * i - .001), 0, 0], M.steel, 'x', 12);
  }
}

function nut(group, radius, head) {
  ring(group, head + .001, radius, .0028, [0, 0, 0], M.steel, 'x', 24);
  ring(group, head, radius, .008, [.0047, 0, 0], M.machined, 'x', 8);
}

export function buildDriveshaft(series, add) {
  const e30 = series === 'e30';
  const flex = { outer: e30 ? .055 : .068, pitchRadius: e30 ? .039 : .048, boltRadius: e30 ? .005 : .006, width: e30 ? .027 : .032 };
  const disc = e30 ? [.106, .350, 0] : [.032, .375, 0];
  const support = e30 ? [-.356, .327, 0] : [-.560, .355, 0];
  const diff = e30 ? [-.963, .310, 0] : [-1.098, .325, 0];
  const frontFace = disc[0] + flex.width / 2;
  const rearFace = disc[0] - flex.width / 2;
  const middle = support[0] + (e30 ? -.044 : .058);
  const supportFasteners = e30 ? '07119915160' : '07147165618';
  const driveNum = e30 ? '26101226733' : '26111227387';
  const discNum = e30 ? '26111225624' : '26117511454';
  add('flex-disc', 'Six-sleeve driveshaft flex disc', disc, g => coupling(g, flex), [discNum]);
  add('output-flange', 'Gearbox output flange and centering pilot', [frontFace, disc[1], 0], g => {
    flange(g, flex, 0, 0, 1);
    cylinder(g, .012, .041, [-.013, 0, 0], M.machined, 'x', 36);
  });
  add('front-section', 'Front driveshaft section and centering sleeve', support, g => {
    const fx = rearFace - support[0];
    const fy = disc[1] - support[1];
    const frontFlange = new Group();
    flange(frontFlange, flex, 1, 0, -1);
    frontFlange.position.set(fx, fy, 0);
    g.add(frontFlange);
    ring(g, .020, .0123, .018, [fx - .012, fy, 0], M.machined, 'x', 40);
    weldedTube(g, e30 ? .060 : .089, fx - .021, 0, fy, .026);
    if (e30) {
      ring(g, .023, .0168, .033, [.050, 0, 0], M.machined, 'x', 40);
    } else {
      yoke(g, .058, 1, 0);
      yoke(g, .058, -1, 0);
      cylinder(g, .008, .049, [.058, 0, 0], M.machined, 'y', 20);
      cylinder(g, .008, .049, [.058, 0, 0], M.machined, 'z', 20);
    }
  }, [driveNum], 'shaft');
  add('rear-section', e30 ? 'Rear driveshaft section and universal joints' : 'Rear driveshaft section and CV joint', diff, g => {
    const cx = middle - diff[0];
    const cy = support[1] - diff[1];
    const journal = support[0] - diff[0];
    weldedTube(g, .056, (e30 ? cx : journal) - .033, 0, cy, .032);
    if (e30) {
      yoke(g, cx, -1, cy);
      yoke(g, cx, 1, cy);
      cylinder(g, .008, .048, [cx, cy, 0], M.machined, 'y', 20);
      cylinder(g, .008, .048, [cx, cy, 0], M.machined, 'z', 20);
      yoke(g, .031, 1, 0);
      ring(g, .052, .015, .009, [.005, 0, 0], M.steel, 'x', 40);
    } else {
      ring(g, .045, .024, .037, [.0195, 0, 0], M.steel, 'x', 56);
      for (const x of [.043, .052, .061]) ring(g, .039 - (x - .043) * .45, .024, .008, [x, 0, 0], M.rubber, 'x', 40);
    }
    ring(g, .015, .007, .062, [journal - .004, cy, 0], M.machined, 'x', 44);
    const splineLength = e30 ? .046 : .022;
    const splineAt = journal + .014 + splineLength / 2;
    ring(g, .014, .0061, splineLength, [splineAt, cy, 0], M.steel, 'x', 44);
    for (let i = 0; i < 22; i++) {
      const angle = 2 * Math.PI * i / 22;
      const rib = box(g, [splineLength, .0021, .0017], [splineAt, cy + Math.cos(angle) * .0144, Math.sin(angle) * .0144], M.machined, .0004);
      rib.rotation.x = angle;
    }
  }, [driveNum], 'shaft');
  if (e30) {
    add('differential-flange', 'Differential input flange', [diff[0] - .007, diff[1], 0], g =>
      ring(g, .054, .014, .014, [0, 0, 0], M.steel, 'x', 40));
  } else {
    add('cv-gasket', 'Rear CV flange gasket', diff, g =>
      ring(g, .045, .037, .0012, [0, 0, 0], M.edge, 'x', 44), ['26111229502'], 'mount', true);
  }
  add('center-mount', 'Slotted center support bracket and rubber carrier', support, centerSupport, ['26121226723']);
  add('bearing', 'Sealed center bearing, 55 × 30 × 13 mm', support, sealedSupportBearing, ['26121225071'], 'mount', true);
  for (const [side, direction] of [['front', 1], ['rear', -1]]) {
    if (!e30 && side === 'front') continue;
    add(side + '-dust-shield', side === 'front' ? 'Outer center bearing dust shield' : 'Inner center bearing dust shield',
      [support[0] + direction * .011, support[1], 0], g => {
        lathe(g, [[.015,0],[.022,0],[.028,direction*.002],[.029,direction*.004],[.028,direction*.005],
          [.026,direction*.0036],[.015,direction*.0011],[.015,0]], M.steel, 'x', 52);
      }, ['26111225088'], 'mount', true);
  }
  for (const [index, sign] of [-1, 1].entries()) {
    add('support-bolt-' + (index + 1), 'M8 center support fastener', [support[0], support[1] + .030, sign * .076], g => {
      cylinder(g, .004, .020, [0, .012, 0], M.machined, 'y', 20);
      ring(g, .0085, .004, .002, [0, .002, 0], M.steel, 'y', 24);
      cylinder(g, .0075, .006, [0, -.0025, 0], M.machined, 'y', 6);
    }, [supportFasteners]);
  }
  if (e30) {
    add('sleeve', 'Threaded sliding sleeve and clamping ring', [support[0] + .045, support[1], 0], g => {
      ring(g, .030, .020, .024, [0, 0, 0], M.steel, 'x', 40);
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        const tooth = box(g, [.023, .003, .005], [0, Math.cos(angle) * .030, Math.sin(angle) * .030], M.steel, .001);
        tooth.rotation.x = angle;
      }
    }, ['26117514037']);
    add('spline-washer', 'Sliding joint washer', [support[0] + .036, support[1], 0], g =>
      ring(g, .021, .015, .002, [0, 0, 0], M.machined, 'x', 36), [], 'mount', true);
    add('spline-seal', 'Sliding joint rubber ring', [support[0] + .040, support[1], 0], g =>
      ring(g, .021, .0155, .003, [0, 0, 0], M.rubber, 'x', 36), [], 'mount', true);
    add('circlip', 'External bearing circlip', [support[0] + .018, support[1], 0], g => {
      lathe(g, [[.015, -.001], [.019,-.001], [.019,.001], [.015,.001], [.015,-.001]],
        M.machined, 'x', 38, .15, 2 * Math.PI - .3);
    }, ['26123648156'], 'mount', true);
  } else {
    add('pivot-bolt', 'M12 center pivot bolt', [middle + .004, support[1], 0], g =>
      bolt(g, .006, .025, -1, .011), ['07119911694'], 'mount', true);
    add('pivot-washer', '36 mm center pivot washer', [middle + .001, support[1], 0], g =>
      ring(g, .018, .0064, .003, [0, 0, 0], M.machined, 'x', 38), ['26117572710'], 'mount', true);
  }
  for (let index = 0; index < 6; index++) {
    const [y, z] = lugCenter(index, flex.pitchRadius);
    const onGearbox = index % 2 === 0;
    const side = onGearbox ? 'gearbox' : 'shaft';
    const number = Math.floor(index / 2) + 1;
    const direction = onGearbox ? 1 : -1;
    const face = onGearbox ? rearFace : frontFace;
    const radius = flex.boltRadius;
    const head = e30 ? .0095 : .0108;
    add(side + '-bolt-' + number, (e30 ? 'M10' : 'M12') + ' flex disc bolt, ' + side + ' side',
      [face, disc[1] + y, z], g => bolt(g, radius, flex.width + .020, direction, head),
      [e30 ? '26111209498' : onGearbox ? '26117523709' : '27101220647']);
    add(side + '-nut-' + number, (e30 ? 'M10' : 'M12') + ' flex disc self-locking nut',
      [face + direction * (flex.width + .010), disc[1] + y, z], g => {
        const fitting = new Group();
        nut(fitting, radius, head);
        if (direction < 0) fitting.rotation.y = Math.PI;
        g.add(fitting);
      }, [e30 ? '07129964672' : '07129900047']);
  }
  for (let i = 0; i < (e30 ? 4 : 6); i++) {
    const a = i * Math.PI / (e30 ? 2 : 3) + (e30 ? Math.PI / 4 : 0);
    const radius = e30 ? .005 : .004;
    add('rear-nut-' + (i + 1), (e30 ? 'M10' : 'M8') + ' rear flange ribbed nut',
      [diff[0] + .014, diff[1] + Math.cos(a) * .040, Math.sin(a) * .040],
      g => nut(g, radius, e30 ? .0095 : .0075), [e30 ? '07129964672' : '26111227929']);
  }
  add('tunnel-shield', 'Stamped driveshaft tunnel heat shield', [e30 ? -.27 : -.39, e30 ? .277 : .274, e30 ? .116 : .129],
    g => tunnelShield(g, e30), [], 'shield');
}
