import { BoxGeometry, BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';

const carpet=new MeshStandardMaterial({color:'#414345',roughness:.97,side:DoubleSide});
const backing=new MeshStandardMaterial({color:'#333637',roughness:.88,side:DoubleSide});

function surface(group,rows,material) {
  const vertices=rows.flat(2), indices=[], width=rows[0].length;
  for(let row=0;row<rows.length-1;row++) for(let col=0;col<width-1;col++) {
    const a=row*width+col, b=a+width;
    indices.push(a,b,a+1,a+1,b,b+1);
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  group.add(new Mesh(geometry,material));
}

export function luggageFit() {
  const floor=new Group(), partition=new Group();
  const liners=[-1,1].map(sign=>{
    const liner=new Group();
    // The sides are nearly straight behind the wheel, then wrap up and over
    // the damper towers before meeting the partition behind the rear seat.
    const stations=[
      [-2.274,.666,.657,.685,.710,.724],
      [-2.122,.670,.649,.680,.747,.749],
      [-1.967,.604,.566,.619,.793,.751],
      [-1.794,.499,.392,.441,.912,.721],
      [-1.665,.441,.337,.377,1.018,.695],
      [-1.509,.438,.342,.385,1.020,.666],
      [-1.382,.489,.375,.410,.994,.654],
      [-1.315,.532,.483,.495,.981,.649],
    ];
    surface(liner,stations.map(([x,foot,inside,shoulder,top,outside])=>[
      [x,.509,sign*foot],[x,.573,sign*inside],
      [x,.509+(top-.509)*.66,sign*inside],[x,top-.022,sign*shoulder],
      [x,top,sign*(outside+shoulder)*.5],[x,top-.008,sign*outside],
      [x,top-.060,sign*outside],
    ]),carpet);
    surface(liner,stations.map(([x,foot])=>[[x,.509,sign*foot],[x,.509,sign*(foot-.035)]]),carpet);
    const mounts=[-2.139,-1.919].map(x=>{
      const next=stations.findIndex(station=>station[0]>x);
      const [start,a]=stations[next-1], [end,b]=stations[next];
      const foot=a+(b-a)*(x-start)/(end-start);
      return [x,.509,sign*(foot-.017)];
    });
    return {liner,mounts};
  });
  surface(floor,[
    [-2.284,.648,.509],[-2.126,.670,.510],[-1.966,.605,.520],[-1.798,.505,.525],
    [-1.665,.448,.519],[-1.510,.448,.510],[-1.355,.526,.510],[-1.310,.530,.509],
  ].map(([x,half,height])=>[[x,height,-half],[x,height+.003,0],[x,height,half]]),carpet);
  const pull=new Mesh(new BoxGeometry(.043,.008,.056),backing);
  pull.position.set(-2.19,.515,0);
  floor.add(pull);
  surface(partition,[
    [-1.336,.508,.533],[-1.341,.548,.553],[-1.359,.764,.582],
    [-1.386,.974,.616],[-1.416,1.045,.630],
  ].map(([x,y,half])=>[[x,y,-half],[x-.015,y,0],[x,y,half]]),carpet);
  return {floor,partition,liners};
}
