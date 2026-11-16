import { BoxGeometry, CylinderGeometry, DoubleSide, Group, LatheGeometry, Mesh, MeshStandardMaterial, Vector2 } from 'three';

const rubber=new MeshStandardMaterial({color:'#222525',roughness:.90,side:DoubleSide});
const plastic=new MeshStandardMaterial({color:'#292d2f',roughness:.75});
const steel=new MeshStandardMaterial({color:'#60686a',roughness:.52,metalness:.43});

export function fuelDoorFit(e30, dimensions=e30?[-1.64,.658,.808,.129,.102]:[-1.78,.702,.837,.130,.114]) {
  const [x,y,z,width,height]=dimensions;
  const opening={
    low:[x-width/2,y-height/2,z-.023],
    high:[x+width/2,y+height/2,z+.025],
  };
  const recess=new Group(), hinge=new Group();
  function piece(group,geometry,material,at) {
    const mesh=new Mesh(geometry,material);
    mesh.position.set(...at);
    group.add(mesh);
    return mesh;
  }
  const back=z-.047, lip=z-.008;
  piece(recess,new BoxGeometry(width,.003,.044),rubber,[x,y-height/2,lip-.021]);
  piece(recess,new BoxGeometry(width,.003,.044),rubber,[x,y+height/2,lip-.021]);
  for(const sign of [-1,1])
    piece(recess,new BoxGeometry(.004,height,.044),rubber,[x+sign*width/2,y,lip-.021]);
  piece(recess,new BoxGeometry(width,height,.006),rubber,[x,y,back]);
  const cap=piece(recess,new LatheGeometry([
    [.027,0],[.030,.005],[.030,.014],[.028,.019],[.024,.021],[0,.021],
  ].map(p=>new Vector2(...p)),32),plastic,[x-.007,y-.002,back+.005]);
  cap.rotation.x=Math.PI/2;
  piece(recess,new BoxGeometry(.041,.011,.009),plastic,[x-.007,y-.002,back+.028]);
  const pivot=[x+width/2-.002,y,z-.003];
  piece(hinge,new CylinderGeometry(.005,.005,.054,12),steel,[pivot[0],y,pivot[2]-.003]);
  for(const dy of [-.016,.016])
    piece(hinge,new BoxGeometry(.029,.008,.011),steel,[pivot[0]-.012,y+dy,pivot[2]-.007]);
  return {opening,recess,hinge,pivot,camera:{position:[x-.29,y+.24,z+1.02],target:[x,y,z]}};
}
