import assert from 'node:assert/strict';
import { Box3, Group, Raycaster, Vector3 } from 'three';
import { compactPart } from '../geometry/local-cabin-glb.mjs';
import { buildE30Exterior, paint } from './e30-325i-exterior.mjs';

export function updateShoulderPanels(scene, nodes) {
  const sides = [['left', -1], ['right', 1]];
  const changed = new Set(sides.flatMap(([side]) => [
    'e30body:front-fender-' + side, 'e30body:door-' + side, 'e30body:rear-quarter-' + side,
    'e30body:door-' + side + ':outer-handle',
  ]));
  buildE30Exterior((parent, key, _name, _at, _direction, draw) => {
    const id = (parent === 'e30body:assembly' ? 'e30body' : parent) + ':' + key;
    if (!changed.delete(id)) return;
    const node = nodes.get(id);
    const previous = scene.getObjectByName(node.meshNames[0]);
    assert(previous?.parent, id);
    const group = new Group();
    group.name = previous.name;
    draw(group);
    compactPart(group);
    const box = new Box3().setFromObject(group, true);
    node.bounds = { min: box.min.toArray(), max: box.max.toArray() };
    previous.parent.add(group);
    previous.removeFromParent();
  });
  assert.equal(changed.size, 0);
  scene.updateMatrixWorld(true);

  function meshes(id, material) {
    const found = [];
    scene.getObjectByName(nodes.get(id).meshNames[0]).traverse(object => {
      if (object.isMesh && object.material.name === material) found.push(object);
    });
    assert(found.length, id + ' has no ' + material + ' mesh');
    return found;
  }

  for (const [side, sign] of sides) {
    const door = meshes('e30body:door-' + side, paint.name);
    const fender = meshes('e30body:front-fender-' + side, paint.name);
    const quarter = meshes('e30body:rear-quarter-' + side, paint.name);
    const handles = meshes('e30body:door-' + side + ':outer-handle', 'Rubber');
    const ray = new Raycaster(new Vector3(), new Vector3(0, 0, -sign), 0, .26);
    const width = (surfaces, x, y) => {
      ray.ray.origin.set(x, y, sign * .96);
      const hit = ray.intersectObjects(surfaces)[0];
      assert(hit, side + ': no surface at ' + [x, y]);
      return sign * hit.point.z;
    };

    let maxStep = 0;
    for (let y = .33; y <= .814; y += .006) {
      maxStep = Math.max(maxStep,
        Math.abs(width(door, .8018, y) - width(fender, .8062, y)),
        Math.abs(width(door, -.4628, y) - width(quarter, -.4712, y)));
    }
    assert(maxStep < .0015, side + ' shoulder does not line up at the door gaps');

    // Check for a distinct normal break at the swage with relaxed slopes above it.
    for (const [surface, x, y] of [[fender, 1.19, .721], [door, -.340, .736], [quarter, -1.18, .736]]) {
      const seat = width(surface, x, y + .007) - width(surface, x, y - .007);
      const upper = width(surface, x, y + .021) - width(surface, x, y + .008);
      const crest = width(surface, x, y + .003) - width(surface, x, y - .003);
      assert(crest > .0018, side + ' swage needs a sharper break at ' + x);
      assert(seat > .0035 && seat < .0085, side + ' swage depth is out of range at ' + x);
      assert(Math.abs(upper) < .0028, side + ' swage flares into the upper panel at ' + x);
    }
    for (const x of [-.390, -.340, -.290]) {
      const protrusion = width(handles, x, .757) - width(door, x, .757);
      assert(protrusion > .004 && protrusion < .018, side + ' handle does not sit on the door');
    }
    const lock = width(handles, -.400, .702) - width(door, -.400, .702);
    assert(lock > .002 && lock < .012, side + ' lock does not sit on the door');
    console.log(side + ' door gap step: ' + (maxStep * 1000).toFixed(2) + ' mm');
  }

}
