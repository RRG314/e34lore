import {
  BoxGeometry, CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, Group, LatheGeometry,
  Mesh, MeshStandardMaterial, Path, Shape, TubeGeometry, Vector2, Vector3,
} from 'three';

const finish = (name,color,roughness,metalness) => new MeshStandardMaterial({name,color,roughness,metalness});
const cast = finish('Cast brake iron',0x5d6164,.69,.53);
const turned = finish('Turned friction surface',0x9ba1a5,.38,.73);
const plated = finish('Zinc hardware',0x97988b,.44,.65);
const clean = finish('Steel guide and hub',0x797e7c,.37,.78);
const coated = finish('Coated steel',0x272e31,.78,.32);
const lining = finish('Friction lining',0x504840,.9,.04);
const rubber = finish('EPDM hardware',0x252523,.86,.03);
const adjusterMetal = finish('Passivated adjuster',0x9b8c68,.46,.67);

export const rearBrakeDimensions = {
  e30: { diameter:.258,height:.0601,drum:.160,shoeWidth:.025,bore:.066,lugs:4,pcd:.100,mount:.054,piston:.033,carrierDirection:-1,adjusterAbove:true },
  e34: { diameter:.300,height:.0611,drum:.180,shoeWidth:.025,bore:.075,lugs:5,pcd:.120,mount:.040,piston:.038,carrierDirection:1,adjusterAbove:false },
};

function mesh(g,geo,m,at=[0,0,0]){
  const o=new Mesh(geo,m);o.position.fromArray(at);g.add(o);return o;
}
function round(g,profile,m,x=0,y=0,segments=64,start=0,arc=2*Math.PI){
  const o=mesh(g,new LatheGeometry(profile.map(p=>new Vector2(...p)),segments,start,arc),m,[x,y,0]);
  o.rotation.x=Math.PI/2;
  return o;
}
function tube(g,points,r,m,segments=20){
  return mesh(g,new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),segments,r,7,false),m);
}
function axial(g,x,y,r,lo,hi,m,segments=20){
  const o=mesh(g,new CylinderGeometry(r,r,hi-lo,segments),m,[x,y,(lo+hi)/2]);
  o.rotation.x=Math.PI/2;return o;
}
function ring(g,inner,outer,lo,hi,m,x=0,y=0){
  return round(g,[[inner,lo],[outer,lo],[outer,hi],[inner,hi],[inner,lo]],m,x,y,30);
}
function disk(path,x,y,r,cw=false){return path.absarc(x,y,r,0,2*Math.PI,cw);}
function outline(points){const s=new Shape(points.map(p=>new Vector2(...p)));s.closePath();return s;}
function volume(g,s,lo,hi,m,bevel=0){
  return mesh(g,new ExtrudeGeometry(s,{steps:1,depth:hi-lo,curveSegments:18,
    bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2}),m,[0,0,lo]);
}

export function rearBoltLocations(config){
  const lug=Array.from({length:config.lugs},(_,i)=>{
    const a=i*2*Math.PI/config.lugs;
    return [config.pcd/2*Math.cos(a),config.pcd/2*Math.sin(a)];
  });
  const a=Math.PI/config.lugs, r=config.pcd/2+.003;
  return {lug,screw:[r*Math.cos(a),r*Math.sin(a)]};
}

export function buildRearBrakes(series, add){
  const d=rearBrakeDimensions[series];
  const R=d.diameter/2, drum=d.drum/2, bore=d.bore/2;
  const face=d.mount, back=face-d.height, swept=back+.010, shoeZ=back+.026;
  const { lug,screw }=rearBoltLocations(d);
  const orient = fn => g => {
    fn(g);
    return -d.carrierDirection;
  };
  const shoeAngle = (series==='e30' ? 30 : 36) * Math.PI / 180;
  const clocked = fn => g => {
    const local = new Group();
    fn(local);
    local.rotation.z = shoeAngle;
    g.add(local);
  };
  function flange(outer,center,lugRadius,fixingRadius) {
    const s=disk(new Shape(),0,0,outer);
    s.holes.push(disk(new Path(),0,0,center,true),disk(new Path(),...screw,fixingRadius,true));
    for(const [x,y] of lug)s.holes.push(disk(new Path(),x,y,lugRadius,true));
    return s;
  }

  add('rotor', 'Solid rear rotor and parking brake drum',g=>{
    const inside=drum+.00055, skirt=inside+.008;
    round(g,[[skirt-.002,back],[R-.0007,back],[R,back+.0007],[R,swept-.0007],[R-.0007,swept],
      [skirt-.002,swept],[skirt-.002,back]],turned,0,0,80);
    round(g,[[inside,back],[skirt,back],[skirt,swept-.004],[skirt-.002,swept+.003],
      [skirt-.006,face-.006],[inside-.009,face-.005],[inside-.012,face-.011],
      [inside,face-.011],[inside,back]],cast,0,0,68);
    round(g,[[inside-.0002,back+.001],[inside+.0006,back+.001],
      [inside+.0006,face-.009],[inside-.0002,face-.009],[inside-.0002,back+.001]],turned,0,0,72);
    volume(g,flange(drum-.004,bore,.0075,.0055),face-.006,face,cast);
  });
  add('hub','Rear drive flange and wheel pilot',g=>{
    volume(g,flange(d.pcd/2+.0098,bore-.009,.0058,.004),face-.015,face-.0062,clean);
    round(g,[[bore-.015,back-.036],[bore+.006,back-.036],[bore+.007,face-.017],
      [bore-.0002,face-.017],[bore-.0002,face],[bore-.0044,face],
      [bore-.0044,face+.007],[bore-.015,face+.007],[bore-.015,back-.036]],clean);
    ring(g,bore-.018,bore-.014,face-.001,face+.005,plated);
  });
  add('shield','Pressed rear brake shield and shoe seats',orient(g=>{
    const start=Math.PI/2+.45, span=2*Math.PI-.9;
    round(g,[[drum-.030,back-.012],[drum+.008,back-.012],[R-.012,back-.015],
      [R+.004,back-.008],[R+.004,back-.006],[R-.012,back-.013],
      [drum+.008,back-.010],[drum-.030,back-.010]],coated,0,0,72,start,span);
    ring(g,drum-.029,drum+.009,back-.013,back-.010,coated);
    for(const a of [.55,2.65,3.55,5.70]){
      const support=mesh(g,new BoxGeometry(.017,.010,.006),coated,
        [(drum-.015)*Math.cos(a),(drum-.015)*Math.sin(a),back-.008]);
      support.rotation.z=a;
    }
  }));
  add('disc-screw','Rear disc retaining screw',g=>{
    const [x,y]=screw;
    axial(g,x,y,.0038,face-.015,face-.004,plated);
    round(g,[[.0036,face-.004],[.0054,face-.002],[.0029,face-.002],[.0036,face-.004]],plated,x,y,24);
    const s=disk(new Shape(),x,y,.0054);
    s.holes.push(new Path(Array.from({length:6},(_,i)=>new Vector2(
      x+.00289*Math.cos(-i*Math.PI/3),y+.00289*Math.sin(-i*Math.PI/3)))));
    volume(g,s,face-.002,face-.0001,plated);
  });

  const x=-R+.021;
  const guides=[[x-.009,-.052],[x-.009,.062]];
  const carrierBolts=[[x+.026,-.039],[x+.026,.045]];
  add('carrier','Rear floating-caliper carrier',orient(g=>{
    const bridge=outline([[x-.029,-.038],[x-.030,.039],[x-.016,.065],[x+.009,.056],
      [x+.011,.042],[x-.011,.038],[x-.017,.015],[x-.017,-.025],
      [x+.010,-.030],[x+.008,-.051],[x-.014,-.057]]);
    volume(g,bridge,back-.036,back-.022,cast,.0015);
    for(const [a,b] of guides){
      ring(g,.0047,.0105,back-.025,back-.010,cast,a,b);
      const seat=outline([[a-.008,b-.008],[a+.012,b-.008],[a+.015,b+.004],[a-.008,b+.006]]);
      volume(g,seat,back-.025,swept+.025,cast,.0012);
    }
    for(const [a,b] of carrierBolts){
      ring(g,.0054,.0124,back-.044,back-.023,cast,a,b);
      mesh(g,new BoxGeometry(.029,.016,.012),cast,[a-.016,b,back-.029]);
    }
  }));
  add('caliper','ATE rear sliding-caliper housing',orient(g=>{
    const profile=outline([[x-.033,-.032],[x-.025,-.046],[x-.011,-.050],[x-.001,-.040],
      [x-.011,-.033],[x-.019,-.018],[x-.021,.02],[x-.011,.043],[x+.002,.052],
      [x-.013,.058],[x-.030,.044],[x-.036,.016]]);
    volume(g,profile,back-.037,swept+.026,cast,.0022);
    const face=outline([[x-.027,-.031],[x-.017,-.040],[x+.005,-.040],[x+.016,-.027],
      [x+.010,-.015],[x-.013,-.013],[x-.015,.019],[x+.008,.023],[x+.017,.038],
      [x+.003,.049],[x-.019,.043],[x-.029,.024]]);
    volume(g,face,swept+.015,swept+.027,cast,.0018);
    const p=d.piston/2;
    round(g,[[p,back-.020],[p+.007,back-.027],[p+.009,back-.043],[p+.004,back-.057],
      [.006,back-.057],[0,back-.049],[0,back-.04],[p,back-.040],[p,back-.020]],cast,x,.004);
    ring(g,p-.002,p+.002,back-.022,back-.016,rubber,x,.004);
    ring(g,p-.005,p,back-.023,back-.017,turned,x,.004);
    for(const [a,b] of guides){
      ring(g,.0051,.010,back-.049,back-.029,rubber,a,b);
      const ear=outline([[a-.020,b-.011],[a-.001,b-.013],[a+.009,b-.007],
        [a+.010,b+.008],[a-.003,b+.013],[a-.018,b+.010]]);
      ear.holes.push(disk(new Path(),a,b,.006,true));
      volume(g,ear,back-.034,back-.022,cast,.0018);
    }
    const bleeder=mesh(g,new CylinderGeometry(.0036,.005,.016,6),clean,[x+.003,.038,back-.039]);
    bleeder.rotation.z=-.32;
    mesh(g,new CylinderGeometry(.0042,.0048,.008,12),rubber,[x+.006,.048,back-.039]).rotation.z=-.32;
  }));
  for(const [i,[a,b]] of guides.entries()){
    const end=i ? 'upper' : 'lower';
    add('guide-'+end,'Caliper guide bolt · '+end,orient(g=>{
      axial(g,a,b,.00485,back-.056,back-.022,clean);
      axial(g,a,b,.0038,back-.022,back-.009,plated);
      const h=disk(new Shape(),a,b,.0067);
      h.holes.push(new Path(Array.from({length:6},(_,k)=>new Vector2(a+.004041*Math.cos(-k*Math.PI/3),b+.004041*Math.sin(-k*Math.PI/3)))));
      volume(g,h,back-.062,back-.056,plated);
    }));
    add('cap-'+end,'Guide bolt cap · '+end,orient(g=>{
      round(g,[[0,back-.066],[.0087,back-.066],[.0094,back-.064],[.0094,back-.060],
        [.0070,back-.059],[.0068,back-.062],[0,back-.062],[0,back-.066]],rubber,a,b,24);
    }));
  }
  for(const [i,[a,b]] of carrierBolts.entries()){
    const end=i ? 'upper' : 'lower';
    add('carrier-bolt-'+end,'Carrier mounting bolt · '+end,orient(g=>{
      axial(g,a,b,.0049,back-.057,back-.057+(series==='e30'?.030:.0265),plated);
      axial(g,a,b,.0095,back-.059,back-.056,plated);
      axial(g,a,b,(series==='e30'?.017:.016)/Math.sqrt(3),back-.065,back-.057,plated,6);
    }));
  }

  for(const inner of [true,false]){
    add(inner?'pad-inner':'pad-outer',inner?'Inner rear pad and piston spring':'Outer rear pad',orient(g=>{
      const profile=[[x-.016,-.027],[x-.011,-.035],[x+.013,-.039],[x+.014,-.046],[x+.023,-.045],
        [x+.023,-.037],[x+.034,-.028],[x+.035,.027],[x+.026,.039],[x+.023,.047],
        [x+.014,.048],[x+.012,.042],[x-.009,.038],[x-.016,.023]];
      const z=inner?back-.0165:swept+.011;
      volume(g,outline(profile),z,z+.0049,coated,.00065);
      const friction=profile.map(([a,b])=>[x+.008+(a-x-.008)*.85,b*.83]);
      const fz=inner?z+.0052:swept+.0004;
      volume(g,outline(friction),fz,fz+.0105,lining,.0003);
      if(inner) for(let i=0;i<3;i++){
        const t=i*2*Math.PI/3;
        const clip=mesh(g,new BoxGeometry(.006,.008,.011),plated,
          [x+d.piston*.39*Math.cos(t),.004+d.piston*.39*Math.sin(t),z-.006]);
        clip.rotation.z=t;
      }
    }));
  }
  add('pad-spring','Caliper anti-rattle spring',orient(g=>{
    const z=swept+.028;
    tube(g,[[x+.005,-.035,z],[x-.003,-.045,z+.003],[x-.017,-.038,z+.004],[x-.025,-.017,z],
      [x-.026,.018,z],[x-.018,.038,z+.004],[x-.003,.050,z+.004],[x+.005,.042,z]],.0022,plated);
  }));
  add('wear-sensor','Right rear brake pad wear sensor',orient(g=>{
    const z=back-.004;
    mesh(g,new BoxGeometry(.012,.007,.006),adjusterMetal,[x+.023,.032,z]);
    tube(g,[[x+.023,.035,z],[x+.026,.053,z-.026],[x+.042,.078,z-.034],
      [x+.065,.085,z-.055],[x+.077,.113,z-.074]],.0019,rubber);
    mesh(g,new CylinderGeometry(.0055,.0055,.018,12),rubber,[x+.080,.120,z-.076]);
  }));

  const endY=drum-.020, spanX=Math.sqrt((drum-.016)**2-endY**2);
  const radialClock=[Math.PI,0];
  for(const [i,a] of radialClock.entries()){
    const end=i?'forward':'rearward';
    add('shoe-'+end,(i?'Forward':'Rearward')+' parking brake shoe',clocked(g=>{
      const start=a+.36, span=Math.PI-.72, outer=drum-.00065;
      round(g,[[outer-.005,shoeZ-d.shoeWidth/2],[outer,shoeZ-d.shoeWidth/2+.0012],
        [outer,shoeZ+d.shoeWidth/2-.0012],[outer-.005,shoeZ+d.shoeWidth/2],
        [outer-.005,shoeZ-d.shoeWidth/2]],lining,0,0,48,start,span);
      round(g,[[outer-.009,shoeZ-d.shoeWidth/2],[outer-.005,shoeZ-d.shoeWidth/2],
        [outer-.005,shoeZ+d.shoeWidth/2],[outer-.009,shoeZ+d.shoeWidth/2],
        [outer-.009,shoeZ-d.shoeWidth/2]],coated,0,0,42,start-.025,span+.050);
      const point=(angle,r)=>[Math.sin(angle)*r,Math.cos(angle)*-r];
      const webAngles=Array.from({length:43},(_,j)=>start-.075+(span+.150)*j/42);
      const web=outline([...webAngles.map(t=>point(t,outer-.008)),
        ...webAngles.reverse().map(t=>point(t,outer-.024))]);
      web.holes.push(disk(new Path(),i?drum-.019:-drum+.019,0,.003,true));
      volume(g,web,shoeZ-.002,shoeZ+.002,coated);
      for(const t of [start-.11,start+span+.11]){
        const [x,y]=point(t,outer-.019);
        const tab=mesh(g,new BoxGeometry(.017,.010,.0038),clean,[x,y,shoeZ]);
        tab.rotation.z=t+.20;
      }
      ring(g,.0029,.0084,shoeZ-.0018,shoeZ+.0022,coated,i?drum-.019:-drum+.019,0);
    }));
    const sx=(i?1:-1)*(drum-.019);
    add('hold-'+end,(i?'Forward':'Rearward')+' shoe hold-down pin and spring',clocked(g=>{
      axial(g,sx,0,.0019,shoeZ-.027,shoeZ+.017,clean,14);
      mesh(g,new BoxGeometry(.010,.003,.003),clean,[sx,0,shoeZ-.026]);
      ring(g,.0021,.0054,shoeZ+.009,shoeZ+.011,clean,sx,0);
      ring(g,.0021,.0057,shoeZ+.015,shoeZ+.017,plated,sx,0);
      const helix=Array.from({length:33},(_,k)=>{
        const t=k/32,a=t*Math.PI*8;
        return [sx+.0042*Math.cos(a),.0042*Math.sin(a),shoeZ+.003+.013*t];
      });
      tube(g,helix,.00076,plated,36);
    }),[sx*Math.cos(shoeAngle),sx*Math.sin(shoeAngle),shoeZ]);
  }
  for(const upper of [true,false]){
    add('return-'+(upper?'upper':'lower'),(upper?'Upper':'Lower')+' shoe return spring',clocked(g=>{
      const y=(upper?1:-1)*(endY-.013);
      const z=shoeZ+.004;
      const r=upper?.0032:.0039, half=spanX-.012, coils=upper?10:12;
      const points=[[-spanX-.006,y+.004,z],[-spanX,y,z],[-half,y,z]];
      for(let i=0;i<=64;i++){
        const t=i/64,a=t*Math.PI*2*coils;
        points.push([-half+2*half*t,y+r*Math.cos(a),z+r*Math.sin(a)]);
      }
      points.push([half,y,z],[spanX,y,z],[spanX+.005,y+.004,z]);
      tube(g,points,upper?.00105:.00125,upper?clean:plated,78);
    }));
  }
  add('adjuster','Parking brake star-wheel adjuster',clocked(g=>{
    const y=endY*(d.adjusterAbove?1:-1), p=mesh(g,new CylinderGeometry(.0038,.0038,spanX*2,22),clean,[0,y,shoeZ]);
    p.rotation.z=Math.PI/2;
    for(const s of [-1,1])for(const z of [-.0034,.0034])
      mesh(g,new BoxGeometry(.012,.009,.004),plated,[s*(spanX-.003),y,shoeZ+z]);
    const wheel=mesh(g,new CylinderGeometry(.0076,.0076,.007,30),adjusterMetal,[.006,y,shoeZ]);
    wheel.rotation.z=Math.PI/2;
    for(let n=0;n<12;n++){
      const a=n*Math.PI/6;
      mesh(g,new BoxGeometry(.007,.0034,.0033),adjusterMetal,
        [.006,y+.008*Math.cos(a),shoeZ+.008*Math.sin(a)]).rotation.x=a;
    }
  }));
  add('expander','Parking brake cable expander',clocked(g=>{
    const y=endY*(d.adjusterAbove?-1:1);
    mesh(g,new BoxGeometry(spanX*1.52,.010,.010),cast,[0,y,shoeZ]);
    for(const s of [-1,1]){
      const arm=mesh(g,new BoxGeometry(spanX+.011,.008,.007),clean,[s*spanX*.52,y+.004,shoeZ+s*.002]);
      arm.rotation.z=-s*.22;
    }
    axial(g,0,y,.0027,shoeZ-.009,shoeZ+.007,plated,16);
    tube(g,[[0,y,shoeZ-.005],[0,y-.006,shoeZ-.030],[0,y-.008,shoeZ-.067]],.003,rubber,15);
  }));
}
