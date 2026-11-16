import { Matrix4 } from 'three';
import { box, cylinder, lathe, ring, tube, visualMaterials as M } from './525i-visual-details.mjs';
import { loft, pin } from './525i-fabrication.mjs';

export const brakeHydraulics = 'system:brake-hydraulics';
const sources = {
  servo: ['catalog-assembly-3832f92da718a566c7f4815d', 'Power brake unit depression', 'power_brake_unit_depression'],
  cylinder: ['catalog-assembly-652210724f3812f0caa9db17', 'Brake master cylinder and expansion tank', 'brake_master_cylinder_expansion_tank'],
  pipes: ['catalog-assembly-433d512a073e4d6d74c046fe', 'Brake pipes, front ABS', 'brake_pipe_front_abs'],
  abs: ['catalog-assembly-db504ed86b5e883a6eb4b4fc', 'ABS hydraulic unit', 'anti_block_system_control_unit'],
};
const catalogRoot = 'https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/brakes_pedals/';
export const brakeSources = Object.fromEntries(Object.entries(sources).map(([key, [, title, slug]]) =>
  [key, {title, url: catalogRoot + slug + '.html'}]));

const booster = 'e34sys:brake-booster-master';
const master = 'e34brake:master-cylinder';
const reservoir = 'e34bay:brake-reservoir';
const abs = 'e34sys:abs-hydraulic-unit';
const systems = ['system:braking', 'system:engine-bay', brakeHydraulics];
const identity = new Matrix4().toArray();
const y = .702, z = -.468;
const reservoirSeats = [.906, .976];

function options(parentId, source, numbers, note, matrix = identity) {
  return {parentId, matrix, systems, catalog: [sources[source][0], ...numbers],
    visualSources: [brakeSources[source]], note};
}

export function addBrakeHydraulics(collect, model) {
  collect(booster, 'Vacuum brake booster', group => {
    lathe(group, [[0,.728],[.034,.728],[.048,.739],[.083,.747],[.104,.757],
      [.113,.775],[.114,.794],[.114,.810],[.109,.824],[.093,.834],
      [.061,.841],[.030,.847],[0,.847]], M.dark, 'x', 64).position.set(0,y,z);
    ring(group,.117,.112,.008,[.799,y,z],M.steel,'x',64);
    for(let i=0;i<16;i++){
      const angle=i*Math.PI/8;
      const tab=box(group,[.012,.004,.009],[.799,y+Math.cos(angle)*.116,z+Math.sin(angle)*.116],M.dark,.001);
      tab.rotation.x=angle;
    }
    for(const offset of [-.034,.034]){
      cylinder(group,.005,.022,[.848,y,z+offset],M.steel,'x',16);
      cylinder(group,.008,.006,[.859,y,z+offset],M.machined,'x',6);
    }
    ring(group,.012,.009,.006,[.831,.763,-.385],M.rubber,'x',28);
  }, options('e34sys:braking','servo',['34331160624'],
    'Illustrated with the Girling hardware. The catalog also lists an ATE version. Check the fitted manufacturer before comparing parts.'));

  collect(master,'Tandem brake master cylinder',group=>{
    lathe(group,[[0,.853],[.035,.853],[.036,.860],[.031,.867],[.025,.879],
      [.023,.907],[.026,.930],[.026,.983],[.022,1.013],[.017,1.027],[0,1.027]],
      M.alloy,'x',48).position.set(0,y,z);
    for(const offset of [-.034,.034])box(group,[.012,.025,.021],[.863,y,z+offset],M.alloy,.006);
    for(const x of reservoirSeats){
      cylinder(group,.015,.014,[x,y+.026,z],M.alloy,'y',28);
      cylinder(group,.012,.013,[x,y+.008,z-.023],M.alloy,'z',24);
      ring(group,.009,.003,.010,[x,y+.008,z-.033],M.machined,'z',24);
    }
    for(const offset of [-.012,.012])box(group,[.070,.006,.006],[.959,y-.019,z+offset],M.alloy,.001);
  },options(booster,'cylinder',['34311162915'],
    'Girling catalog example. The source pairs this cylinder with pipe 34326755493. Check the installed brand and pipe fittings.'));

  collect('e34brake:master-seal','Master cylinder to booster seal',group=>{
    lathe(group,[[.020,.848],[.024,.848],[.025,.851],[.024,.854],[.020,.854],[.020,.848]],
      M.rubber,'x',40).position.set(0,y,z);
  },options(master,'servo',['34311159007'],'Girling seal between the booster and master cylinder.'));

  collect(reservoir,'Brake fluid reservoir',group=>{
    loft(group,[[[.866,.770,z],.025,.014],[[.889,.778,z],.039,.025],
      [[.922,.780,z],.043,.027],[[.986,.780,z],.044,.026],
      [[1.014,.775,z],.031,.019]],M.reservoir,{roundness:.43});
    loft(group,[[[.878,.781,z],.030,.002],[[.905,.784,z],.044,.0025],
      [[.986,.784,z],.045,.0025],[[1.013,.780,z],.032,.002]],M.reservoir,{roundness:.5});
    ring(group,.022,.016,.021,[.935,.811,z],M.reservoir,'y',36);
    for(const x of reservoirSeats)cylinder(group,.008,.022,[x,.750,z],M.reservoir,'y',20);
    for(const height of [.769,.786])box(group,[.034,.002,.002],[.982,height,z-.044],M.edge,.0005);
  },options(master,'cylinder',['34321160492'],'Girling reservoir shown above the cylinder, with two outlets and molded level marks.'));

  collect('e34brake:reservoir-seals','Reservoir outlet gaskets',group=>{
    for(const x of reservoirSeats){
      ring(group,.014,.008,.009,[x,.738,z],M.rubber,'y',36);
      ring(group,.016,.008,.003,[x,.744,z],M.rubber,'y',36);
    }
  },options(master,'cylinder',['34321157396'],'The two outlets are shown with the Girling style of seal.'));

  collect('e34brake:level-switch-cap','Brake fluid cap with level switch',group=>{
    cylinder(group,.025,.012,[.935,.826,z],M.plastic,'y',44);
    for(let i=0;i<24;i++){
      const angle=i*Math.PI/12;
      const rib=box(group,[.005,.009,.0025],[.935+.025*Math.cos(angle),.825,z+.025*Math.sin(angle)],M.edge,.0005);
      rib.rotation.y=-angle;
    }
    box(group,[.030,.012,.016],[.926,.834,z],M.plastic,.002);
    box(group,[.013,.009,.014],[.906,.834,z],M.edge,.0015);
    for(const offset of [-.003,.003])box(group,[.005,.002,.0014],[.899,.834,z+offset],M.machined,.0003);
  },options(reservoir,'cylinder',['34321162810'],'Girling cap and fluid-level warning switch. Connector details are illustrative.'));

  collect('e34brake:vacuum-hose','Brake booster vacuum hose',group=>{
    tube(group,[[.831,.763,-.385],[.852,.754,-.363],[.884,.752,-.348]],.0095,M.rubber,24);
    tube(group,[[.899,.748,-.341],[.946,.737,-.329],[.989,.700,-.294],[1.023,.671,-.241]],.0095,M.rubber,32);
  },options(booster,'servo',['34331115926'],'Girling vacuum line shown with an approximate route to the intake manifold.'));

  collect('e34brake:vacuum-tee','Brake booster vacuum T-connector',group=>{
    const left=[.876,.752,-.350], right=[.907,.745,-.338], branch=[.888,.775,-.341];
    pin(group,left,right,.009,M.edge,24);
    pin(group,[.891,.749,-.344],branch,.006,M.edge,20);
    ring(group,.010,.007,.003,[.892,.749,-.344],M.plastic,'x',32);
  },options('e34brake:vacuum-hose','servo',['34331158930'],'The Girling T-connector is shown between the hose sections.'));

  const absDatum = model.nodes.find(node => node.id === abs).matrix;
  collect(abs,'ABS pump and hydraulic block',group=>{
    box(group,[.125,.087,.094],[0,.025,0],M.alloy,.007);
    box(group,[.105,.071,.019],[.003,.026,.055],M.plastic,.003);
    box(group,[.046,.032,.027],[-.035,.027,.076],M.edge,.003);
    for(const offset of [-.006,0,.006])box(group,[.017,.002,.002],[-.039,.024+offset,.090],M.machined,.0003);
    cylinder(group,.039,.085,[-.105,.019,0],M.dark,'x',48);
    ring(group,.041,.035,.006,[-.142,.019,0],M.steel,'x',44);
    for(const [x,z] of [[-.043,-.024],[-.043,.022],[0,-.021],[.040,-.021],[.040,.022]]){
      cylinder(group,.011,.009,[x,.071,z],M.alloy,'y',24);
      ring(group,.008,.003,.010,[x,.080,z],M.machined,'y',24);
    }
    for(const offset of [-.034,.034])box(group,[.130,.006,.012],[0,-.024,offset],M.steel,.001);
  },options('e34sys:braking','abs',['34511163026'],
    'Late ABS catalog example. ASC+T uses a separate source entry. Port positions are illustrative.',absDatum));

  collect('e34brake:abs-feed-pipes','Master cylinder to ABS pipes',group=>{
    const endpoints = [[1.007,.724,-.574],[1.007,.724,-.528]];
    reservoirSeats.forEach((x,i)=>{
      const end=endpoints[i];
      tube(group,[[x,.710,z-.036],[x,.710,-.521],[x-.012,.739,-.552+i*.015],
        [end[0]-.019,.746,end[2]],[end[0],.743,end[2]],end],.0025,M.steel,40);
    });
  },options(master,'pipes',['34326755493','34321163475'],
    'Two separate feed lines are shown. The source lists alternative fittings and dates. Use the actual ports and routing on your car.'));
}
