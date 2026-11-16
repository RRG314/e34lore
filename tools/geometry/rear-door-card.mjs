import { ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Shape, Vector2 } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const vinyl = new MeshStandardMaterial({ color: '#252628', roughness: .83 });
const inset = new MeshStandardMaterial({ color: '#303033', roughness: .91 });

export function rearDoorCard(side) {
  const card = new Group();
  // Follow the rear wheel-arch relief in the door skin. Coordinates are in
  // installed vehicle space, with the fasteners on the outboard face.
  const outline = [
    [-1.229,.848],[-1.201,.779],[-1.162,.711],[-1.115,.63],[-1.061,.54],
    [-1.013,.457],[-.958,.381],[-.913,.359],[-.414,.352],[-.353,.383],
    [-.337,.832],[-.388,.854],
  ];
  const panel = (points, material, depth, z) => {
    const shape = new Shape(points.map(point => new Vector2(...point)));
    const mesh = new Mesh(new ExtrudeGeometry(shape, { depth, bevelEnabled: false }), material);
    mesh.position.z = z;
    card.add(mesh);
  };
  const mount = side * .797;
  panel(outline, vinyl, .026, mount - (side > 0 ? .026 : 0));
  panel([[-1.155,.764],[-1.090,.631],[-.981,.462],[-.874,.421],[-.502,.43],
    [-.426,.482],[-.418,.742],[-.477,.784]], inset, .004, side > 0 ? .767 : -.771);
  const edge = new Mesh(new RoundedBoxGeometry(.796,.04,.028,2,.009), vinyl);
  edge.position.set(-.789,.831,side*.784);
  card.add(edge);
  return card;
}
