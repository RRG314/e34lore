import { e30FuseLayout, e30FuseChart } from '../series/e30-quick-reference';
import { fusePositions } from './fuse-reference';

type Bank = {numbers:number[]; x:number; y:number; width:number; vertical?:boolean; holder?:string};
type Module = [label:string, x:number, y:number, width:number, height:number];
export type FusePanelDrawing = {
  label:string;
  figure:string;
  chart:string;
  width:number;
  height:number;
  frontOfCar?:true;
  banks:Bank[];
  modules:Module[];
};

const sequence=(start:number,end:number)=>Array.from({length:end-start+1},(_,i)=>start+i);
export const e34ElectricalManual='https://www.armchair.mb.ca/~dave/BMW/e34/e34_95.pdf';
const factoryPage=(page:number)=>e34ElectricalManual+'#page='+page;

export const e30FuseDrawing:FusePanelDrawing={
  label:'BMW 1989 325i / 325is · 0670-0',
  figure:e30FuseLayout, chart:e30FuseChart, width:690, height:740, frontOfCar:true,
  banks:[{numbers:sequence(1,15),x:5,y:19.5,width:91},{numbers:sequence(16,30),x:5,y:86,width:91}],
  modules:[
    ['K10 · Wiper control',25,2,49,13],
    ['K1 · Normal fan speed',5,48.5,13,12],['K2 · Horn',30.5,48.5,13,12],
    ['K3 · High beam',55.5,48.5,13,12],['K4 · Low beam',81.5,48.5,13,12],
    ['K5 · Unloader',5.5,69.5,13,12],['K6 · High fan speed',31,69.5,13,12],
    ['K7 · Unloader',56,69.5,13,12],['K8 · Fog lights',82,69.5,13,12],
  ],
};

export const e34FuseDrawings:Record<string,FusePanelDrawing>={
  front:{
    label:'BMW 1995 E34 · front box · 0670.0-00',
    figure:factoryPage(21),chart:factoryPage(25),width:1180,height:400,
    banks:[{numbers:sequence(1,29),x:6,y:4,width:88},{numbers:[53,54,55,56],x:80,y:17,width:15,holder:'F53–F56 holder'}],
    modules:[
      ['K51 · Horn/telephone jumper',8,17,14,16],['Unlabelled relay position',25.5,17,14,16],
      ['K3 · Terminal R',44,17,14,16],['K4 · Blower',62,17,14,16],
      ['K19 / K6 · Compressor / washer',8,36,14,17],['Unlabelled relay position',25.5,36,14,17],
      ['K61 · Terminal 61',44,36,14,17],['K9 · Terminal 15',62,36,14,17],['K8 / K2 · Water pump / horn',80,36,15,17],
      ['K16 · Hazards',4,58,14,17],['A4 · Check control',20.5,58,60,17],['N17 · Crash control',83,58,14,17],
      ['A3 · Lamp control',6,79,90,15],
    ],
  },
  rear:{
    label:'BMW 1995 E34 · rear box · 0670.0-01',
    figure:factoryPage(22),chart:factoryPage(28),width:780,height:376,
    banks:[
      {numbers:[37,36,35,34],x:39,y:4,width:9,vertical:true},
      {numbers:[33,32,31,30],x:11,y:33,width:17},
      {numbers:[44,45,46,47],x:31,y:33,width:17},
      {numbers:[43,42,41,40],x:2,y:57,width:17},
    ],
    modules:[
      ['X322 / X272 · Connectors',78,7,20,16],
      ['A5 · Relay module',51,29,47,19],['A1 · General module',51,52,47,20],
      ['K11 · Wiper',22,58,13,15],['K15 · Power protection',36,58,13,15],
      ['K13 · Rear defogger',84,76,14,16],
    ],
  },
  auxiliary:{
    label:'BMW 1995 E34 · auxiliary relay box · 0670.0-02',
    figure:factoryPage(23),chart:factoryPage(28),width:548,height:275,banks:[],
    modules:[
      ['N6 · Lamp cleaning (Canada)',11,15,22,28],['K21 · Normal fan speed',39,15,22,28],
      ['K22 · High fan speed',67,15,22,28],['Unlabelled relay position',67,55,22,28],
    ],
  },
};

const ratings95: Record<number,number|null> = {
  1:15,2:7.5,3:7.5,4:7.5,5:10,6:15,7:15,8:null,9:15,10:7.5,11:7.5,12:15,
  13:7.5,14:7.5,15:7.5,16:30,17:7.5,18:15,19:30,20:15,21:10,22:30,23:15,24:10,
  25:30,26:30,27:7.5,28:15,29:7.5,30:10,31:null,32:7.5,33:7.5,34:30,35:30,36:30,
  37:30,40:7.5,41:30,42:30,43:30,44:20,45:30,46:null,47:10,53:null,54:null,55:50,56:25,
};
// BMW ETM 0670.1-00 through 0670.1-05. The chart includes shared feeds and optional equipment.
const circuits95: Record<number,string> = {
  1:'Brake lights, ABS/ASC, wiper and washer control, instruments, lamp monitor, cruise, clock, trip computer, DWA IV and transmission control',
  2:'Headlights and fog lights, turn and hazard lights, light switch, lamp monitor, crash control and M60 engine control',
  3:'Headlights and fog lights, turn and hazard lights, light switch, lamp monitor, body electronics and headlight washers',
  4:'Parking, tail and underhood lights, light switch, lamp monitor, body electronics and headlight washers',
  5:'Headlights and fog lights, parking and tail lights, licence plate and luggage lights, light switch, lamp monitor, body electronics and interior accessories',
  6:'Turn and hazard lights and crash control',
  7:'Headlights and fog lights and lamp monitor',
  8:'No rating or circuit listed in the 1995 chart.',
  9:'Horn, auxiliary fan and climate control',
  10:'Headlights and fog lights, lamp monitor and crash control',
  11:'Headlights and fog lights, lamp monitor and crash control',
  12:'Power mirrors, power or memory seats, washer jet heaters, reverse lights, engine control, ASC and equipped transmission controls',
  13:'Headlights and fog lights, turn and hazard lights, lamp monitor and crash control',
  14:'Headlights and fog lights, turn and hazard lights, lamp monitor and crash control',
  15:'Brake lights, parking and tail lights, licence plate and luggage lights, lamp monitor and EWS II',
  16:'Heated seats and seat/mirror memory',
  17:'Ignition-switched feeds for engine and transmission control, charging, starter, electronics box fan, ABS/ASC, equipped EDC and body electronics',
  18:'Touring rear wiper control, mirrors, seat memory, interior accessories and lights, radio, telephone, anti-theft and remote locking',
  19:'Climate control and park ventilation',
  20:'Climate control, park ventilation, instruments, parking lights, clock and on-board computer',
  21:'Interior accessories and lights, licence plate and luggage lights, and equipped anti-theft system',
  22:'Headlight washer control on equipped cars',
  23:'M50 and M60 engine control',
  24:'Central body electronics and windshield wiper/washer control',
  25:'Auxiliary fan',
  27:'Interior accessories and climate control',
  28:'Charging system and electronics box fan',
  29:'Auxiliary fan, climate control and instrument cluster',
  31:'No rating or circuit listed in the 1995 chart.',
  32:'Heated door lock, central locking, power windows, sunroof and body electronics',
  33:'Central locking, power windows and sunroof',
  34:'Windshield wiper and washer control and DWA IV anti-theft',
  35:'Rear window defogger and antenna',
  36:'Radio and Hi-Fi provisions',
  37:'Central locking, power windows, sunroof, body electronics and Alpine anti-theft',
  40:'Cellular telephone provisions',
  41:'Electric steering column adjustment on equipped cars',
  42:'Power seats and seat/mirror memory on equipped cars',
  43:'Power seats',
  44:'Touring rear window wiper and washer and central locking',
  45:'Electronic damper control on equipped cars',
  47:'Supplemental restraint system (airbag)',
  55:'ABS / ASC supply',
  56:'ASC supply on equipped cars',
};
// The first page containing the applicable circuit, or the amperage chart if no circuit is listed.
const chart95: Record<number,number> = {
  3:26,4:26,5:26,6:26,7:26,9:26,10:26,11:26,13:26,14:26,15:26,
  19:27,20:26,21:26,22:26,24:26,25:27,27:27,29:26,
  34:29,35:30,36:30,40:30,
};
export const e34FusePositions1995=Object.entries(e34FuseDrawings).flatMap(([panel,layout])=>
  layout.banks.flatMap(bank=>bank.numbers.map(number=>{
    const amps=ratings95[number]??null;
    return {number,panel,amps,status:amps===null?'Unlisted':'Listed',
      circuits:circuits95[number]??(amps===null?'No rating or circuit listed in the 1995 chart.':'The chart lists an amperage for this position. Check the circuit and installed equipment.'),
      chart:factoryPage(chart95[number]??(number<30?25:28)),
      source:number<30?'BMW 1995 ETM · 0670.1-00 to 0670.1-02':'BMW 1995 ETM · 0670.1-03 to 0670.1-05'};
  }))
);
export function usesE34FactoryFuseLayout(year:string,model?:string) {
  return (!year||year==='1995')&&(!model||['525i','530i','540i'].includes(model));
}
export function e34FuseReference(year:string,model?:string) {
  return usesE34FactoryFuseLayout(year,model) ? e34FusePositions1995 : fusePositions;
}
