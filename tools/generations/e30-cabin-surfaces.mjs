import {bead, lerp, patch, smooth} from './e30-exterior-surfaces.mjs';

const span = value => 2 * value - 1;
const roundPower = (value, power) => Math.sign(value) * Math.abs(value) ** power;
const pleat = (z, positions, width) => positions.reduce((depth, position) =>
  depth + Math.exp(-((z - position) ** 2) / width), 0);
const grain = (u, v) => .00031 * Math.sin(u * 191 + v * 59) * Math.cos(u * 87 - v * 143);
const seatSeams = [-.146, -.073, .073, .146];

// Rounded upholstery with the flatter center panel and higher side rolls of
// the factory comfort seat. Both the rolled front edge and the pan close.
export function comfortCushion(group, body, insert, seam) {
  const surface = (u, v) => {
    const side = span(v), edge = Math.abs(side);
    const x = lerp(-.204, .253, u) - .032 * edge ** 8 * span(u);
    const z = side * (.218 - .015 * Math.abs(span(u)) ** 8);
    const y = .053 + .030 * smooth((edge - .59) / .34) - .015 * Math.abs(span(u)) ** 6
      + .014 * smooth((u - .52) / .48) - .007 * pleat(z, seatSeams, .00016) + grain(u, v);
    return [x, y, z];
  };
  const edgeAt = (u) => {
    const ring = (u % 1) * 4, k = Math.floor(ring);
    const t = ring - k;
    if (k === 0) return surface(0, t);
    if (k === 1) return surface(t, 1);
    if (k === 2) return surface(1, 1 - t);
    return surface(1 - t, 0);
  };
  patch(group, body, surface, 70, 64);
  patch(group, body, (u, v) => {
    const [x, y, z] = edgeAt(u), roll = Math.sin(Math.PI * v);
    return [x * (1 - .075 * v) + .012 * roll * Math.sign(x),
      lerp(y, -.054, v), z * (1 - .081 * v) + .009 * roll * Math.sign(z)];
  }, 128, 17);
  patch(group, body, (u,v) => {
    const [x,,z] = edgeAt(u);
    return [.925 * x * v, -.054, .919 * z * v];
  }, 96, 8);
  patch(group, insert, (u, v) => {
    const [x, y, z] = surface(.056 + .883 * u, .152 + .696 * v);
    return [x, y + .0014, z];
  }, 66, 50);
  for (const v of [.157, .329, .671, .843]) {
    bead(group, seam, u => {
      const [x, y, z] = surface(.067 + .859 * u, v);
      return [x, y + .0020, z];
    }, .0011, 55);
  }
  bead(group, seam, u => {
    const [x, y, z] = edgeAt(u);
    return [x * 1.003, y - .009, z * 1.009];
  }, .0017, 116);
}

// Keep the shoulders broad at the top and shape the section between the
// lumbar panel, leather piping, and the separate rear pocket.
export function comfortBackrest(group, body, insert, seam) {
  const shell = (u, angle) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    const shoulder = 1 - .079 * smooth((u - .77) / .23) - .058 * smooth((.18 - u) / .18);
    const endRound = .835 + .165 * smooth(Math.min(u / .079, (1 - u) / .068));
    const z = .222 * shoulder * endRound * roundPower(s, .43);
    const y = lerp(-.209, .236, u) - .023 * Math.abs(s) ** 6 * smooth((u - .79) / .21);
    const x = .013 - .117 * u + .024 * Math.sin(Math.PI * u)
      + .056 * endRound * roundPower(c, .49)
      + Math.max(0, c) * (.032 * smooth((Math.abs(z) - .127) / .071)
      - .0071 * pleat(z, seatSeams, .00016))
      + grain(u, angle / (2 * Math.PI));
    return [x, y, z];
  };
  patch(group, body, (u, v) => shell(u, 2 * Math.PI * v), 72, 84);
  for (const u of [0, 1]) {
    patch(group, body, (a, r) => {
      const [x, y, z] = shell(u, a * 2 * Math.PI), middle = .013 - .117 * u;
      return [lerp(middle, x, r), y + (u ? .006 : -.004) * (1-r*r), z * r];
    }, 84, 14);
  }
  const face = (u,v) => shell(u, lerp(-.77,.77,v));
  patch(group, insert, (u,v) => {
    const [x,y,z] = face(.063 + .865*u,v);
    return [x+.00135,y,z];
  }, 65, 57);
  for (const channel of seatSeams) bead(group, seam, u => {
    const h = .075 + .85 * u;
    const radius = Math.abs(shell(h, Math.PI / 2)[2]);
    const angle = Math.asin(roundPower(Math.min(.999, Math.abs(channel) / radius) * Math.sign(channel), 1/.43));
    const [x,y,z] = shell(h,angle);
    return [x+.0022,y,z];
  }, .00105, 55);
  for (const side of [-1,1]) {
    bead(group, seam, u => {
      const [x,y,z] = shell(.015 + .967 * u, side * 1.43);
      return [x,y,z+side*.0017];
    }, .0017, 60);
  }
}

export function headrestShell(group, body, seam) {
  const shell = (u, v) => {
    const a = u * 2 * Math.PI, b = v * Math.PI;
    const y = .072 * roundPower(Math.cos(b), .62);
    const depth = Math.sin(b) ** .51;
    const x = .049 * roundPower(Math.cos(a), .67) * depth - .145 * y;
    const z = .134 * roundPower(Math.sin(a), .48) * depth * (.97 - .12 * y);
    return [x, y, z];
  };
  patch(group, body, (u, v) => shell(u, .0001 + .9998 * v), 76, 46);
  for (const side of [.25, .75]) bead(group, seam, v => {
    const [x,y,z] = shell(side,.056 + .888*v);
    return [x,y,z*1.009];
  }, .0014, 46);
}

export function rearCushion(group, body, seam) {
  const channels = [-.456,-.365,-.278,-.185,.185,.278,.365,.456];
  const top = (u,v) => {
    const z=span(v)*.577;
    const x=lerp(-.245,.246,u)-.032*Math.abs(span(v))**7*span(u);
    const bucket=Math.sin(Math.PI*u)*Math.exp(-((Math.abs(z)-.315)**2)/.028);
    const y=.065-.026*bucket+.011*Math.abs(span(v))**7-.014*u**8
      -.005*pleat(z,channels,.00012)+grain(u,v);
    return [x,y,z];
  };
  patch(group,body,top,66,96);
  for(const end of [0,1]){
    patch(group,body,(u,v)=>{
      const [x,y,z]=top(end,u);
      return [x+(end?1:-1)*.012*Math.sin(Math.PI*v),lerp(y,-.056,v),z*(1-.029*v)];
    },96,14);
    patch(group,body,(u,v)=>{
      const [x,y,z]=top(u,end);
      return [x,lerp(y,-.056,v),z*(1-.029*v)];
    },66,14);
  }
  for(const z of channels)bead(group,seam,u=>{
    const [x,y,lateral]=top(.061+.881*u,.5+z/1.154);
    return [x,y+.0014,lateral];
  },.00105,53);
}

export function rearBackrest(group, body, seam) {
  const channels = [-.456,-.365,-.278,-.185,.185,.278,.365,.456];
  const face=(u,v)=>{
    const z=span(v)*(.578-.029*u**7);
    const x=.073-.150*u+.025*Math.sin(Math.PI*u)
      -.025*Math.sin(Math.PI*u)*Math.exp(-((Math.abs(z)-.322)**2)/.031)
      -.004*pleat(z,channels,.00017);
    const y=lerp(-.226,.194,u)-.023*Math.abs(span(v))**8*u;
    return [x,y,z];
  };
  const rear=(u,v)=>{
    const [x,y,z]=face(u,v);
    return [x-.067,y-.007,z*.983];
  };
  patch(group,body,face,62,99);
  patch(group,body,(u,v)=>rear(1-u,v),62,99);
  for(const end of [0,1]){
    patch(group,body,(u,v)=>{
      const [x,y,z]=face(end,u),[xx,yy,zz]=rear(end,u);
      return [lerp(x,xx,v),lerp(y,yy,v)+Math.sin(Math.PI*v)*.014*(end?1:-1),lerp(z,zz,v)];
    },99,13);
    patch(group,body,(u,v)=>{
      const [x,y,z]=face(u,end),[xx,yy,zz]=rear(u,end);
      return [lerp(x,xx,v),lerp(y,yy,v),lerp(z,zz,v)+Math.sin(Math.PI*v)*.012*(end?1:-1)];
    },62,13);
  }
  for(const z of channels)bead(group,seam,u=>{
    const h=.073+.854*u,w=.578-.029*h**7;
    const [x,y,lateral]=face(h,.5+z/(2*w));
    return [x+.00145,y,lateral];
  },.001,46);
}

export function gearBoot(group,surface) {
  patch(group,surface,(u,v)=>{
    const a=u*Math.PI*2,fold=1+.054*Math.cos(a*8+v*.7);
    const size=lerp(1,.13,v)**1.13*fold;
    const x=.067*roundPower(Math.cos(a),.58)*size-.021*v;
    const y=.009+.056*v+.0028*Math.sin(v*31)*(1-v);
    const z=.054*roundPower(Math.sin(a),.64)*size;
    return [x,y,z];
  },55,29);
}
