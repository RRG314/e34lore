import { BufferGeometry, CylinderGeometry, Float32BufferAttribute, LatheGeometry, Mesh, MeshStandardMaterial, ShapeUtils, Vector2, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const material = (name, color, roughness, metalness = 0) => new MeshStandardMaterial({ name, color, roughness, metalness });
const vinyl = material('Grained console vinyl', 0x242525, .77);
const insert = material('Textured selector trim', 0x1a1b1c, .62);
const rubber = material('Slot liner and seals', 0x111212, .91);
const leather = material('Shifter and brake leather', 0x202122, .58);
const seam = material('Leather seams', 0x3a3b3b, .85);
const lining = material('Recessed tray liner', 0x171819, .95);
const button = material('Switch caps', 0x2e3030, .49);
const marking = material('Shift and switch markings', 0xd6d7cb, .64);
const red = material('Hazard and selector marks', 0xc64432, .61);
const steel = material('Release button and socket metal', 0x7e8182, .37, .72);
const walnut = material('Walnut selector surround', 0x4b2a1b, .35);
walnut.vertexColors = true;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = value => Math.min(1, Math.max(0, value));
const flat = y => () => y;

function mesh(group, geometry, mat) {
  const object = new Mesh(geometry, mat);
  group.add(object);
  return object;
}

function box(group, mat, at, size, radius) {
  const object = mesh(group, new RoundedBoxGeometry(...size, 1, radius), mat);
  object.position.set(...at);
  return object;
}

function cylinder(group, mat, from, to, r0, r1 = r0, sides = 16) {
  const a = new Vector3(...from), b = new Vector3(...to);
  const object = mesh(group, new CylinderGeometry(r1, r0, a.distanceTo(b), sides), mat);
  object.position.copy(a).lerp(b, .5);
  object.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), b.sub(a).normalize());
  return object;
}

// All footprints use the assembled car's coordinates, with the front in +X.
const rect = (x, z, length, width, radius, rearWidth = width) => ({ x, z, length, width, radius, rearWidth });
function outline({ x, z, length, width, radius, rearWidth }) {
  const result = [];
  for (const [i, sx, sz] of [[0, 1, 1], [1, -1, 1], [2, -1, -1], [3, 1, -1]]) {
    for (let j = 0; j <= 4; j++) {
      const angle = Math.PI * (i + j / 4) / 2;
      const dx = sx * (length / 2 - radius) + radius * Math.cos(angle);
      const dz = sz * (width / 2 - radius) + radius * Math.sin(angle);
      const widthAtCorner = lerp(rearWidth, width, dx / length + .5);
      result.push(new Vector2(x + dx, z + dz * (widthAtCorner / width)));
    }
  }
  return result;
}

const resize = (footprint, inset) => ({
  ...footprint, length: footprint.length - inset * 2, width: footprint.width - inset * 2,
  rearWidth: footprint.rearWidth - inset * 2,
  radius: Math.max(.001, footprint.radius - inset),
});
const elevation = (points, height) => points.map(({ x, y }) => new Vector3(x, height(x, y), y));
const collect = (target, a, b, c) => target.push(...a.toArray(), ...b.toArray(), ...c.toArray());

function surface(group, mat, positions) {
  if (positions.length === 0) return;
  const geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  mesh(group, geometry, mat);
}

function strip(group, mat, first, second) {
  const positions = [];
  const normals = [];
  for (let i = 0; i < first.length; i++) {
    const j = (i + 1) % first.length;
    const along = first[j].clone().sub(first[i]).add(second[j].clone().sub(second[i]));
    const across = second[i].clone().sub(first[i]).add(second[j].clone().sub(first[j]));
    normals.push(across.cross(along).normalize());
    collect(positions, first[i], second[i], first[j]);
    collect(positions, first[j], second[i], second[j]);
  }
  const smooth = normals.map((n, i) => {
    const previous = normals.at(i - 1);
    return n.dot(previous) > .6 ? n.clone().add(previous).normalize().toArray() : null;
  });
  const vertexNormals = normals.flatMap((n, i) => {
    const a = smooth[i] ?? n.toArray(), b = smooth[(i + 1) % first.length] ?? n.toArray();
    return [...a, ...a, ...b, ...b, ...a, ...b];
  });
  mesh(group, new BufferGeometry()
    .setAttribute('position', new Float32BufferAttribute(positions, 3))
    .setAttribute('normal', new Float32BufferAttribute(vertexNormals, 3)), mat);
}

function clip(points, axis, limit, sign) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    if ((a[axis] - limit) * sign >= 0) out.push(a);
    if ((a[axis] - limit) * (b[axis] - limit) < 0) {
      out.push(a.clone().lerp(b, (limit - a[axis]) / (b[axis] - a[axis])));
    }
  }
  return out;
}

function subdivide(points, axis, stations) {
  const cuts = [-Infinity, ...stations, Infinity];
  return cuts.slice(1).map((end, i) => clip(clip(points, axis, cuts[i], 1), axis, end, -1));
}

function deck(group, mat, border, height, holes = [], xStations = [], zStations = []) {
  const indices = ShapeUtils.triangulateShape(border, holes);
  const points = border.concat(...holes);
  const positions = [];
  for (const face of indices) {
    const polygon = face.map(i => points[i]).reverse();
    for (const lengthwise of subdivide(polygon, 'x', xStations)) {
      for (const strip of subdivide(lengthwise, 'y', zStations)) {
        const segment = elevation(strip, height);
        for (let i = 1; i < segment.length - 1; i++) {
          const a = segment[0], b = segment[i], c = segment[i + 1];
          if (b.clone().sub(a).cross(c.clone().sub(a)).lengthSq() > 1e-16) collect(positions, a, b, c);
        }
      }
    }
  }
  surface(group, mat, positions);
  if (mat === walnut) {
    const colors = [];
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], z = positions[i + 2];
      const curl = Math.sin(x * 29 + Math.sin(z * 35) * 1.7);
      const tone = .77 + .12 * curl + .11 * Math.sin(z * 139 + curl * 2.5) + .069 * Math.cos(x * 93 + z * 67);
      colors.push(tone, tone * .93, tone * .86);
    }
    group.children.at(-1).geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  }
}

function profile(stations) {
  return x => {
    const right = stations.findIndex(station => x <= station[0]);
    if (right === 0) return stations[0];
    if (right === -1) return stations.at(-1);
    const a = stations[right - 1], b = stations[right];
    return a.map((value, i) => lerp(value, b[i], (x - a[0]) / (b[0] - a[0])));
  };
}

// Stations describe the console where it meets the carpet, up to the top edge.
function shell(group, stations, openings, { relief = () => 0, zStations = [], nose } = {}) {
  const at = profile(stations), height = (x, z) => at(x)[2] + relief(x, z);
  const boundary = (offset, end, column) => {
    const arc = stations.map(([x, width]) => new Vector2(x, width + offset))
      .concat(stations.toReversed().map(([x, width]) => new Vector2(x, -width - offset)));
    const min = stations[0][0], max = stations.at(-1)[0];
    const front = nose
      ? [-(stations.at(-1)[1] - .004), -.134, -.116, -.103, 0, .103, .116, .134, stations.at(-1)[1] - .004]
        .map(z => new Vector2(nose(z), z))
      : zStations.map(z => new Vector2(max, z));
    arc.splice(stations.length, 0, ...front.toReversed());
    arc.push(...zStations.map(z => new Vector2(min, z)));
    for (const p of arc) p.x = min + end + (max - min - end * 2) * (p.x - min) / (max - min);
    return elevation(arc, (x, z) => column === 2 ? height(x, z) - (offset > 0 ? .011 : 0) : at(x)[3]);
  };
  const top = boundary(0, .008, 2);
  const shoulder = boundary(.008, 0, 2);
  const base = boundary(.014, 0, 3);
  // The footprint above runs clockwise whereas the wall builder runs counterclockwise.
  strip(group, vinyl, shoulder.toReversed(), top.toReversed());
  strip(group, vinyl, base.toReversed(), shoulder.toReversed());
  const cuts = stations.slice(1, -1).map(([x]) => x);
  deck(group, vinyl, top.map(p => new Vector2(p.x, p.z)), height, openings.map(opening => outline(resize(opening, .0021))), cuts, zStations);
  // Mounting ledges block the view through the edge of each removable insert.
  for (const opening of openings) {
    const depth = opening.width < .17 ? .034 : .023;
    const lip = outline(resize(opening, -.005));
    deck(group, lining, lip, (x, z) => height(x, z) - depth, [outline(resize(opening, .009))], cuts, zStations);
  }
}

function well(group, footprint, height, depth, mat = insert, floor = lining) {
  const lip = outline(footprint), edge = outline(resize(footprint, .0025)), foot = outline(resize(footprint, .009));
  strip(group, mat, elevation(lip, (x, z) => height(x, z) - .004), elevation(edge, (x, z) => height(x, z) + .002));
  strip(group, mat, elevation(edge, (x, z) => height(x, z) + .002), elevation(foot, (x, z) => height(x, z) - depth));
  deck(group, floor, foot, (x, z) => height(x, z) - depth);
}

function frame(group, outer, inner, height, mat) {
  strip(group, mat, elevation(outline(outer), x => height(x) - .007), elevation(outline(resize(outer, .003)), x => height(x) + .002));
  const innerBorder = outline(inner);
  strip(group, mat, elevation(outline(resize(outer, .003)), x => height(x) + .002), elevation(innerBorder, height));
  strip(group, mat, elevation(innerBorder, height), elevation(innerBorder, x => height(x) - .016));
}

function cover(group, footprint, height, thickness, mat) {
  const upper = outline(resize(footprint, .0025)), lower = outline(footprint);
  strip(group, mat, elevation(lower, x => height(x) - thickness), elevation(upper, height));
  deck(group, mat, upper, height);
}

const glyphs = {
  P: [[[0, 0], [0, 1], [.64, 1], [.78, .86], [.78, .64], [.64, .52], [0, .52]]],
  R: [[[0, 0], [0, 1], [.62, 1], [.77, .87], [.77, .65], [.62, .55], [0, .55]], [[.39, .55], [.83, 0]]],
  N: [[[0, 0], [0, 1], [.79, 0], [.79, 1]]],
  D: [[[0, 0], [0, 1], [.49, 1], [.81, .79], [.81, .23], [.49, 0], [0, 0]]],
  A: [[[0, 0], [.40, 1], [.80, 0]], [[.16, .41], [.65, .41]]],
  M: [[[0, 0], [0, 1], [.39, .38], [.78, 1], [.78, 0]]],
  1: [[[.14, .78], [.42, 1], [.42, 0]], [[.10, 0], [.75, 0]]],
  2: [[[0, .83], [.17, 1], [.62, 1], [.78, .83], [.78, .64], [0, .10], [0, 0], [.81, 0]]],
  3: [[[0, .92], [.23, 1], [.66, .95], [.78, .79], [.64, .58], [.35, .51], [.65, .48], [.81, .28], [.66, .06], [.23, 0], [0, .10]]],
  4: [[[.60, 0], [.60, 1], [0, .30], [.80, .30]]],
  5: [[[.78, 1], [0, 1], [0, .53], [.66, .56], [.81, .37], [.71, .10], [.43, 0], [0, .08]]],
};

function strokes(group, mat, paths, x, z, height, size, width = size * .12) {
  const positions = [];
  for (const path of paths) {
    for (let i = 1; i < path.length; i++) {
      const [z0, x0] = path[i - 1], [z1, x1] = path[i];
      const span = Math.hypot(z1 - z0, x1 - x0), dx = (z1 - z0) * width / span / 2, dz = -(x1 - x0) * width / span / 2;
      const a = new Vector2(x + x0 * size, z + z0 * size), b = new Vector2(x + x1 * size, z + z1 * size);
      const [a0, a1, b0, b1] = elevation([new Vector2(a.x + dx, a.y + dz), new Vector2(a.x - dx, a.y - dz),
        new Vector2(b.x + dx, b.y + dz), new Vector2(b.x - dx, b.y - dz)], height);
      collect(positions, a0, a1, b0);
      collect(positions, a1, b1, b0);
    }
  }
  surface(group, mat, positions);
}

function gate(group, footprint, height, laneZ) {
  const lane = rect(footprint.x, laneZ, footprint.length - .023, .024, .007);
  const lo = lane.x - lane.length / 2, hi = lane.x + lane.length / 2;
  const upper = outline(resize(footprint, .003)), lower = outline(footprint);
  strip(group, insert, elevation(lower, x => height(x) - .014), elevation(upper, height));
  deck(group, insert, upper, height, [outline(resize(lane, .0021))]);
  well(group, lane, x => height(x) - .008, .006, rubber, rubber);
  // The flexible shutter covers the opening all the way to the lever.
  for (let x = lo + .007; x < hi - .006; x += .0024) {
    const y = height(x) - .004;
    cylinder(group, button, [x, y, laneZ - .0095], [x, y, laneZ + .0095], .00053, .00053, 5);
  }
  [...'PRND321'].forEach((letter, i) => {
    const x = lerp(hi - .018, lo + .012, i / 6);
    strokes(group, marking, glyphs[letter], x, laneZ - .028, p => height(p) + .0008, .009);
  });
  const park = hi - .014;
  box(group, red, [park, height(park) + .0006, laneZ - .035], [.006, .0012, .002], .0005);
}

function stem(group, x, z, height, top) {
  const y = height(x);
  cylinder(group, rubber, [x, y - .008, z], [x, y + .014, z], .009, .0075);
  cylinder(group, insert, [x, y + .006, z], [x - .008, top - .005, z], .008, .011);
}

function tGrip(group, x, y, z, span) {
  // The release button is at the driver's end of the asymmetrical leather grip.
  box(group, leather, [x - .008, y, z + .020], [.046, .041, span], .016);
  box(group, leather, [x - .008, y - .018, z], [.031, .031, .031], .010);
  box(group, button, [x - .008, y - .002, z + .020 - span / 2], [.027, .027, .005], .0022);
  for (const end of [-1, 1]) {
    const at = z + .020 + end * (span / 2 - .007);
    for (let i = 0; i < 15; i++) {
      const t = Math.PI * i / 14;
      box(group, seam, [x - .008 + Math.cos(t) * .021, y + Math.sin(t) * .020, at], [.002, .0018, .0028], .0007);
    }
  }
}

function boot(group, footprint, height, raisedAt, top) {
  frame(group, footprint, resize(footprint, .007), height, insert);
  const border = outline(resize(footprint, .007));
  const layers = Array.from({ length: 8 }, (_, row) => {
    const t = row / 7, pull = Math.pow(t, .65);
    return border.map(({ x, y: z }, i) => {
      const angle = Math.atan2(z - footprint.z, x - footprint.x);
      const w = Math.sin(angle * 8 + t * 5) * Math.sin(Math.PI * t) * .004;
      const x1 = lerp(x, raisedAt + Math.cos(angle) * .011, pull);
      const z1 = lerp(z, Math.sin(angle) * .011, pull);
      return new Vector3(x1, lerp(height(x) - .002, top, t) + w + Math.sin(i * 2) * .001 * Math.sin(t * Math.PI), z1);
    });
  });
  for (let i = 1; i < layers.length; i++) strip(group, leather, layers[i - 1], layers[i]);
}

function manualKnob(group, x, base) {
  const shape = [[.009, -.008], [.012, 0], [.013, .012], [.019, .028], [.023, .039], [.023, .048], [.020, .055], [.015, .058]]
    .map(v => new Vector2(...v));
  mesh(group, new LatheGeometry(shape, 28), leather).position.set(x, base, 0);
  cylinder(group, insert, [x, base + .055, 0], [x, base + .0585, 0], .015);
  cylinder(group, button, [x, base + .0579, 0], [x, base + .059, 0], .012);
  const y = flat(base + .0597);
  for (const [character, dx, dz] of [['R', .005, -.0105], ['1', .005, -.0045], ['3', .005, .0015], ['5', .005, .0075], ['2', -.009, -.0045], ['4', -.009, .0015]]) {
    strokes(group, marking, glyphs[character], x + dx, dz, y, .0042, .00049);
  }
  strokes(group, marking, [[[0, .3], [2.45, .3]], [[0, .3], [0, .75]], [[.8, -.3], [.8, .75]], [[1.6, -.3], [1.6, .75]], [[2.45, .3], [2.45, .75]]],
    x, -.009, y, .0075, .00046);
}

function handbrake(group, footprint, height) {
  const rear = footprint.x - footprint.length / 2 + .060, front = rear + .157, z = footprint.z - .004;
  const a = new Vector3(rear, height(rear) - .014, z), b = new Vector3(front, height(front) + .017, z);
  const grip = box(group, leather, a.clone().lerp(b, .58).toArray(), [.14, .034, .030], .013);
  grip.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), b.clone().sub(a).normalize());
  cylinder(group, steel, b.toArray(), b.clone().lerp(a, -.035).toArray(), .006, .0055);
  for (let i = 0; i < 5; i++) {
    const t = .23 - i * .042;
    const p = a.clone().lerp(b, t);
    const fold = box(group, i % 2 ? seam : leather, p.toArray(), [.018, .032 + i * .005, .035 + i * .006], .008);
    fold.quaternion.copy(grip.quaternion);
  }
}

function rocker(group, x, z, height, type) {
  const y = height(x);
  box(group, rubber, [x, y + .001, z], [.039, .010, .025], .0037);
  box(group, button, [x, y + .006, z], [.032, .009, .019], .0035);
  const top = flat(y + .0107);
  if (type === 'hazard') {
    strokes(group, red, [[[0, 0], [.49, .88], [.98, 0], [0, 0]], [[.49, .60], [.49, .29]], [[.49, .24], [.49, .16]]], x - .006, z - .006, top, .011);
  } else if (type === 'program') {
    strokes(group, marking, glyphs.A, x + .004, z - .0035, top, .0077);
    strokes(group, marking, glyphs.M, x - .011, z - .0035, top, .0077);
  } else {
    const arrows = [[[0, .73], [.40, 1], [.78, .73]], [[0, -.33], [.40, -.60], [.78, -.33]], [[0, 0], [.15, .34], [.80, .34], [.80, 0], [0, 0]]];
    strokes(group, marking, arrows, x - .001, z - .0038, top, .009, .0008);
  }
}

function ashtray(group, footprint, height) {
  cover(group, footprint, height, .009, vinyl);
  const x = footprint.x - footprint.length / 2 + .009;
  box(group, insert, [x, height(x) + .003, footprint.z], [.008, .007, footprint.width * .69], .0028);
}

function lighter(group, at, height) {
  const [x, z] = at, y = height(x);
  cylinder(group, insert, [x, y - .002, z], [x, y + .004, z], .015);
  cylinder(group, steel, [x, y + .003, z], [x, y + .005, z], .0105);
  cylinder(group, button, [x, y + .004, z], [x, y + .012, z], .009);
  strokes(group, marking, [[[0, 0], [.78, 0]], [[.78, .17], [.78, .74]]], x, z - .005, flat(y + .0124), .012, .0008);
}

export function e34Console(part) {
  const rear = 'e34trim:center-console', front = 'e34trim:storing-partition';
  const bezel = 'e34trim:selector-bezel', lever = 'e34sys:gear-lever';

  // Profile stations in metres. The proportions come from the detached
  // 51168181940 shell and 51161973683 front molding. The installed front
  // width is scaled against the 180 mm radio opening, and the rear aligns
  // with the existing tunnel, seat clearance and rear air-grille mounts.
  const rearProfile = [
    [-.472, .099, .548, .418], [-.459, .111, .552, .410], [-.418, .115, .558, .416],
    [-.394, .117, .569, .420], [-.370, .118, .596, .428], [-.333, .120, .618, .441],
    [-.264, .122, .633, .457], [-.154, .125, .644, .487],
  ];
  const frontProfile = [
    [-.155, .125, .644, .487], [-.127, .126, .648, .495], [-.051, .127, .650, .509],
    [.037, .134, .652, .520], [.107, .140, .654, .530], [.237, .146, .659, .530],
    [.325, .151, .664, .525], [.365, .153, .671, .530], [.384, .154, .681, .538],
    [.401, .157, .704, .551], [.423, .160, .742, .573], [.452, .162, .778, .603],
    [.480, .164, .800, .625], [.520, .165, .801, .638], [.549, .159, .797, .644],
  ];
  const rearAt = profile(rearProfile), frontAt = profile(frontProfile);
  const dropsAtDriver = z => clamp((.009 - z) / .029);
  const rearRelief = (x, z) => -.043 * dropsAtDriver(z) * clamp((x + .410) / .068);
  const rise = profile([[.275, 0], [.343, .004], [.390, .018], [.452, .035], [.495, .037], [.549, .027]]);
  const frontRelief = (x, z) => rise(x)[1] * clamp((Math.abs(z) - .098) / .052)
    - .038 * dropsAtDriver(z) * clamp((.037 - x) / .071);
  const back = (x, z) => rearAt(x)[2] + rearRelief(x, z);
  const deckHeight = x => frontAt(x)[2];
  const frontSurface = (x, z) => deckHeight(x) + frontRelief(x, z);
  const brake = rect(-.278, -.059, .232, .083, .021);
  const sideBin = rect(-.285, .058, .217, .090, .012);
  const rearBin = rect(-.433, 0, .056, .177, .011);
  const changeBin = rect(-.065, -.056, .147, .092, .012);
  // The 1994 BMW trim brochure shows the wood panel widening toward the
  // dash, with the automatic gate inset on the driver's side.
  const partition = rect(.203, 0, .321, .249, .015, .183);
  const gateTop = rect(.183, -.034, .221, .084, .008);
  const ash = rect(.421, .003, .054, .185, .008);
  const stemX = .259, z = -.025, handleY = deckHeight(stemX) + .109;

  part(rear, group => {
    shell(group, rearProfile, [brake, sideBin, rearBin], { relief: rearRelief, zStations: [-.020, .009] });
    well(group, sideBin, back, .046, vinyl);
  });
  part(front, group => {
    shell(group, frontProfile, [changeBin, partition, ash], {
      relief: frontRelief, zStations: [-.098, -.020, .009, .098],
      nose: z => lerp(.467, .549, clamp((Math.abs(z) - .103) / .038)),
    });
    well(group, changeBin, frontSurface, .016, vinyl);
  });
  part('e34trim:selector-surround', group => {
    const inner = resize(partition, .004);
    frame(group, partition, inner, deckHeight, rubber);
    deck(group, walnut, outline(inner), deckHeight, [outline(resize(gateTop, .001))],
      [...new Set([...frontProfile.map(([x]) => x), ...Array.from({ length: 44 }, (_, i) => .054 + .0071 * i)])].sort((a, b) => a - b));
  });
  part(bezel, group => gate(group, gateTop, x => deckHeight(x) + .007, z));
  part(lever, group => stem(group, stemX, z, deckHeight, handleY - .009));
  part('e34trim:selector-grip', group => tGrip(group, stemX, handleY, z, .102));
  part('e34trim:parking-brake-finisher', group => well(group, brake, back, .012, vinyl));
  part('e34sys:handbrake-lever', group => handbrake(group, brake, x => back(x, brake.z)));
  part('e34trim:rear-console-tray', group => well(group, rearBin, back, .022, vinyl));
  const ashHeight = x => deckHeight(x);
  part('e34trim:front-ashtray-frame', group => frame(group, ash, resize(ash, .006), ashHeight, insert));
  part('e34trim:front-ashtray', group => ashtray(group, resize(ash, .0075), x => ashHeight(x) - .001));
  part('e34trim:program-switch', group => rocker(group, .210, -.091, deckHeight, 'program'));
  part('e34trim:hazard-switch', group => rocker(group, .014, .055, deckHeight, 'hazard'));
  part('e34trim:window-switches', group => {
    cover(group, rect(-.074, .057, .108, .081, .005), x => deckHeight(x) + .002, .005, rubber);
    for (const x of [-.048, -.094]) for (const z of [.035, .078]) rocker(group, x, z, deckHeight, 'window');
    box(group, button, [-.120, deckHeight(-.120) + .003, .058], [.009, .0045, .016], .0016);
  });
}

export function e30Console(part, automatic) {
  const rear = 'e30assembly:cabin-floor:console';
  const front = 'e30trim:front-console';
  const rearProfile = [
    [-.586, .078, .526, .460], [-.568, .101, .535, .452], [-.523, .107, .540, .450],
    [-.481, .108, .533, .450], [-.357, .110, .532, .443],
    [-.220, .117, .538, .445], [-.101, .120, .544, .449], [.018, .119, .551, .454],
  ];
  const frontProfile = [
    [.017, .119, .553, .454], [.039, .123, .555, .457],
    [.261, .129, .595, .466], [.321, .134, .612, .477],
    [.388, .135, .661, .486], [.467, .137, .703, .517], [.517, .134, .735, .534],
  ];
  const rearAt = profile(rearProfile), frontAt = profile(frontProfile);
  const back = x => rearAt(x)[2], deckHeight = x => frontAt(x)[2];
  const brake = rect(-.275, -.041, .379, .109, .032);
  const rearAsh = rect(-.537, .001, .064, .142, .010);
  const tray = rect(-.454, .052, .091, .065, .012);
  const frontAsh = rect(.406, .015, .115, .181, .009);
  const gear = automatic ? rect(.151, 0, .194, .152, .012) : rect(.148, 0, .160, .145, .018);

  part(rear, group => shell(group, rearProfile, [brake, rearAsh, tray]));
  part(front, group => shell(group, frontProfile, [resize(gear, .001), frontAsh]));
  part('e30trim:parking-brake-finisher', group => well(group, brake, back, .018, vinyl));
  part('e30assembly:cabin-floor:handbrake', group => handbrake(group, brake, back));
  part('e30trim:rear-ashtray', group => ashtray(group, rearAsh, back));
  part('e30trim:rear-console-tray', group => well(group, tray, back, .022));
  part('e30trim:front-ashtray-frame', group => frame(group, frontAsh, resize(frontAsh, .006), deckHeight, insert));
  part('e30trim:front-ashtray', group => ashtray(group, resize(frontAsh, .007), x => deckHeight(x) - .002));
  part('e30trim:cigarette-lighter', group => lighter(group, [.406, -.103], deckHeight));
  part('e30assembly:cabin-floor:window-switches', group => {
    for (const z of [-.099, .099]) rocker(group, .134, z, deckHeight, 'window');
  });
  if (automatic) {
    const x = .213, z = -.025, y = deckHeight(x) + .114;
    part('e30assembly:cabin-floor:auto-selector', group => gate(group, gear, t => deckHeight(t) + .012, z));
    part('e30trim:automatic-lever', group => {
      stem(group, x, z, t => deckHeight(t) + .012, y - .007);
      tGrip(group, x, y, z, .090);
    });
  } else {
    const x = .131, y = .647;
    part('e30assembly:cabin-floor:shifter', group => boot(group, gear, deckHeight, x, y));
    part('e30trim:manual-shift-knob', group => manualKnob(group, x, y));
  }
}
