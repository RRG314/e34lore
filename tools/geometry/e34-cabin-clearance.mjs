import assert from 'node:assert/strict';
import { Box3, CatmullRomCurve3, Float32BufferAttribute, Group, Matrix4, Mesh, TubeGeometry, Vector3 } from 'three';

const smoothstep=(start,end,value)=>{
  const t=Math.max(0,Math.min(1,(value-start)/(end-start)));
  return t*t*(3-2*t);
};

function firewall(x,y,z,part) {
  const floorReturn=part.max.y<.43;
  if(floorReturn) return [.772+(x-.615)*.45,y,z];
  return [x+.083*(1-smoothstep(.52,.81,y)),y,z];
}

function frontRail(x,y,z) {
  const engineBay=smoothstep(.56,.99,x);
  // Bring the rear of the longitudinal rail below the toe board and blend
  // into its existing engine-bay position before the front mounting points.
  return [x+.291*(1-engineBay),y-.177*(1-engineBay),z];
}

function fuelLines(x,y,z) {
  const rise=smoothstep(.13,.48,x), next=x+.320*rise;
  // Hold the underfloor run below the carpet until it reaches the engine
  // side of the splash wall. The tank end and the filter remain in place.
  const clearance=(1-smoothstep(.745,.803,next))*.35*smoothstep(.13,.40,x);
  return [next,y-clearance,z];
}

function wiring(x,y,z,part) {
  if(part.max.x>1.9) {
    const transition=smoothstep(.45,.95,x);
    return [x+.389*(1-transition),y,z];
  }
  if(part.min.y>.75) {
    return [x,y-.65,z+Math.sign(z)*.081];
  }
  const rise=smoothstep(.00,.43,x);
  return [x,y-.046-.506*rise,z+.059];
}

function innerSill(x,y,z,part) {
  if(Math.min(Math.abs(part.min.z),Math.abs(part.max.z))<.65) return [x,y,z];
  // The carpet return and sill cap fit over the upper flange.
  return [x,y-.038*smoothstep(.265,.345,y),z+Math.sign(z)*.012];
}

function fittedSill(x,y,z,part) {
  const outerRail=Math.min(Math.abs(part.min.z),Math.abs(part.max.z))>.65;
  return outerRail
    ? [x,y-.063,z+Math.sign(z)*.018]
    : [x,y-.044,z];
}

function fittedTunnel(x,y,z) {
  const shoulder=smoothstep(.12,.23,Math.abs(z));
  return [x,y-.016*shoulder*smoothstep(.28,.44,x),z*(1-.10*shoulder)];
}

function fittedFuelLines(x,y,z) {
  const [next,height,lateral]=fuelLines(x,y,z);
  // Compress the lowest part of the previous route up towards the floor.
  // The monotone blend retains the section of both pipes.
  const underfloor=smoothstep(.13,.38,next)*(1-smoothstep(.70,.76,next));
  return [next,height+.75*Math.max(0,.157-height)*underfloor,lateral];
}

function routedWiring(source,transform,material) {
  const {vertices,bounds,root}=islands(source,transform);
  const geometry=source.clone(), index=source.getIndex(), remaining=[];
  for(let i=0;i<index.count;i+=3) {
    const first=index.getX(i), branch=bounds.get(root(first));
    if(branch.max.x>1.9||branch.min.y>.75)
      remaining.push(first,index.getX(i+1),index.getX(i+2));
  }
  const corrected=vertices.flatMap(({x,y,z},i)=>bounds.get(root(i)).max.x>1.9
    ? wiring(x,y,z,bounds.get(root(i))) : [x,y-.538,z+Math.sign(z)*.068]);
  geometry.setIndex(remaining);
  geometry.setAttribute('position',new Float32BufferAttribute(corrected,3));
  geometry.deleteAttribute('normal');
  geometry.computeVertexNormals();

  // Follow the right sill at floor height, then rise on the engine side
  // of the splash wall to meet the retained engine branch.
  const points=[
    [-1.16,.226,.637],[-.94,.235,.671],[-.50,.237,.691],[-.02,.232,.701],
    [.36,.236,.691],[.64,.242,.654],[.751,.268,.622],[.803,.382,.582],
    [.827,.595,.559],[.836,.744,.561],
  ];
  const route=new CatmullRomCurve3(points.map(point=>new Vector3(...point)));
  return [new Mesh(geometry,material),new Mesh(new TubeGeometry(route,48,.009,8,false),material)];
}

const rules=new Map([
  ['e34sys:firewall',firewall],
  ['e34sys:chassis-rail-1',frontRail],
  ['e34sys:chassis-rail--1',frontRail],
  ['e34sys:fuel-supply-return-lines',fuelLines],
  ['e34sys:body-wiring-harness',wiring],
  ['e34sys:sill-1',innerSill],
  ['e34sys:sill--1',innerSill],
]);

// Keep each closed piece intact even where the source duplicates vertices at
// a seam. This also distinguishes the engine branch from the cabin harness.
function islands(geometry,transform) {
  const positions=geometry.getAttribute('position');
  const roots=Array.from({length:positions.count},(_,i)=>i), seen=new Map();
  function root(i) {
    while(roots[i]!==i) {
      roots[i]=roots[roots[i]];
      i=roots[i];
    }
    return i;
  }
  const join=(a,b)=>{roots[root(a)]=root(b);};
  const vertices=Array.from({length:positions.count},(_,i)=>{
    const v=new Vector3().fromBufferAttribute(positions,i).applyMatrix4(transform);
    const key=v.toArray().map(c=>Math.round(c*1e6)).join(',');
    if(seen.has(key)) join(i,seen.get(key));
    else seen.set(key,i);
    return v;
  });
  const index=geometry.getIndex();
  assert(index);
  for(let i=0;i<index.count;i+=3) {
    join(index.getX(i),index.getX(i+1));
    join(index.getX(i),index.getX(i+2));
  }
  const bounds=new Map();
  vertices.forEach((v,i)=>{
    const key=root(i), box=bounds.get(key)??new Box3();
    box.expandByPoint(v);
    bounds.set(key,box);
  });
  return {vertices,bounds,root};
}

export function refitCabinStructures(model,systemsScene,{assembledFit=false}={}) {
  const group=new Group(), replacements=[];
  group.name='e34_cabin_structural_clearance';
  const fittedRules=assembledFit?new Map([
    ...rules,
    ['e34sys:transmission-tunnel',fittedTunnel],
    ['e34sys:sill-1',fittedSill],
    ['e34sys:sill--1',fittedSill],
    ['e34sys:fuel-supply-return-lines',fittedFuelLines],
  ]):rules;
  for(const [id,route] of fittedRules) {
    const node=model.nodes.find(n=>n.id===id);
    assert(node);
    const part=new Group();
    part.name=id.replaceAll(':','_')+'_cabinfitted';
    const world=new Matrix4().fromArray(node.matrix);
    for(const name of node.meshNames) {
      const source=systemsScene.getObjectByName(name);
      assert(source,name);
      source.traverse(mesh=>{
        if(!mesh.isMesh) return;
        const source=mesh.geometry;
        const transform=world.clone().multiply(mesh.matrixWorld);
        if(assembledFit&&id==='e34sys:body-wiring-harness') {
          part.add(...routedWiring(source,transform,mesh.material));
          return;
        }
        // Write float positions before moving vertices. The source may use
        // normalized integer accessors whose ranges cannot hold world metres.
        const geometry=source.clone();
        const {vertices,bounds,root}=islands(source,transform);
        const corrected=vertices.flatMap((v,i)=>route(v.x,v.y,v.z,bounds.get(root(i))));
        geometry.setAttribute('position',new Float32BufferAttribute(corrected,3));
        geometry.deleteAttribute('normal');
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        part.add(new Mesh(geometry,mesh.material));
      });
    }
    assert(part.children.length);
    group.add(part);
    const box=new Box3().setFromObject(part);
    replacements.push({node,name:part.name,bounds:{min:box.min.toArray(),max:box.max.toArray()}});
  }
  return {group,replacements};
}
