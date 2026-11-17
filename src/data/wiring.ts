import {e30ElectricalManual,e30ElectricalSupplement} from '../series/e30-manual';
import {e34ElectricalManual} from './fuse-panel-layouts';
import type {Series} from '../series/registry';

type CircuitRow = [group:string,title:string,section:string,page:number,keywords?:string];
export type WiringCircuit = {
  group:string;title:string;section:string;page:number;keywords:string;edition:string;href:string;
};
type WiringEdition = {year:number;label:string;href:string;scope:string};
const archive='https://www.armchair.mb.ca/~dave/BMW/';
export const wiringArchive=(series:Series)=>archive+series+'/';
const edition=(series:Series,year:number,variant:string,label:string,scope:string):WiringEdition=>({
  year,label,scope,href:wiringArchive(series)+series+variant+'_'+String(year).slice(2)+'.pdf',
});

const e30Standard=[
  edition('e30',1983,'','1983 E30','Read the model list on the cover.'),
  ...[1984,1985,1986,1987,1988].map(year=>edition('e30',year,'',year+' E30','Read the model list on the cover.')),
  {year:1989,label:'1989 325i / 325is',href:e30ElectricalManual.url,scope:'BMW of North America coupe and sedan.'},
  {year:1991,label:'1991 model supplements',href:e30ElectricalSupplement+'#page=3',scope:'325i, 325iX, M3 and 325i Convertible sections.'},
  edition('e30',1992,'','1992 E30','Read the model list on the cover.'),
];
export const wiringEditions:Record<Series,WiringEdition[]> = {
  e30:[
    ...e30Standard,
    ...[1988,1989,1990,1992].map(year=>edition('e30',year,'co',year+' Convertible','Convertible wiring.')),
    ...[1988,1989,1990].map(year=>edition('e30',year,'ix',year+' 325iX','All-wheel-drive wiring.')),
    ...[1987,1988,1989,1990,1991].map(year=>edition('e30',year,'m3',year+' M3','S14 models. Check the document cover for scope.')),
  ],
  e34:[
    ...[1988,1989,1990,1991,1992,1993,1994].map(year=>edition('e34',year,'',year+' E34','Read the model and engine list on the cover.')),
    {year:1994,label:'1994 European four-cylinder and diesel',href:'https://www.bmwclub.by/book/e34/ETM%20BMW%20E34%20year%201994.pdf',
      scope:'518i, 520i, 525td and 525tds, including Touring.'},
    {year:1995,label:'1995 525i, 530i and 540i',href:e34ElectricalManual,scope:'BMW of North America. Includes 525i and 530i Touring.'},
  ],
};
function sheets(url:string,edition:string,rows:CircuitRow[]):WiringCircuit[] {
  return rows.map(([group,title,section,page,keywords=''])=>({group,title,section,page,keywords,edition,href:url+'#page='+page}));
}
export const wiringCircuits:Record<Series,WiringCircuit[]> = {
  e30:[
    {group:'Harness routing',title:'Main wire harness layout',section:'61-0/1',page:1132,keywords:'loom physical routing front left sill rear lights',edition:'BMW E30 factory workshop manual',href:'/manual/61?pdf=1132'},
    {group:'Harness routing',title:'Main harness access and connections',section:'61-0/2',page:1133,keywords:'loom removal trim rear lamp carrier defogger',edition:'BMW E30 factory workshop manual',href:'/manual/61?pdf=1133'},
    ...sheets(e30ElectricalSupplement,'1991 325i supplement',[
      ['Connector and component views','Wiring symbols, pins and wire sizes','Symbols',5,'wire gauge diagram legend colors connector'],
      ['Power supply','Fuse 10 circuit','0670-8',10,'starter reverse lights instrument check control'],
      ['Lighting','Light switch and instrument illumination','6300-0',11,'lighting dimmer dash illumination F23'],
      ['Lighting','Park, tail and front marker lamps','6314-0',12,'parking tail side marker fuse 22 f22 fuse 23 f23'],
      ['Harness routing','Main harness splice location index','8000-0',13,'splice ground junction'],
      ['Harness routing','Main harness routing and splice locations','8000-2',14,'dash sill floor rear seat trunk splice C101 G104 G300'],
    ]),
    ...sheets(e30ElectricalManual.url,'1989 325i / 325is',[
      ['Power supply','Fuse and relay box layout','0670-0',12,'panel board'],
      ['Power supply','Fuse ratings and circuit assignments','0670-1',13,'fuses fuse chart amps amperage'],
      ['Power supply','Engine grounds','0670-12',25,'ground earth G103'],
      ['Power supply','Front and dash grounds','0670-13',26,'ground earth G104 G106 G200'],
      ['Power supply','Alternator and charging circuit','1230-0',29,'battery charge charging'],
      ['Power supply','Starter and interlock · automatic','1240-0',30,'crank no start automatic'],
      ['Power supply','Starter circuit · manual','1240-1',31,'crank no start manual'],
      ['Engine and brakes','M20 injection overview','1360-1',33,'dme engine block diagram ignition'],
      ['Engine and brakes','M20 main relay and fuel pump','1360-6',38,'dme fuel pump relay C101 C190'],
      ['Engine and brakes','M20 injector circuits and C191','1360-7',39,'dme injector pins Motronic fuel injection'],
      ['Engine and brakes','ABS · early production','3450-1',43,'antilock anti lock wheel speed'],
      ['Engine and brakes','ABS · late production','3450-2',44,'antilock anti lock wheel speed'],
      ['Cabin and body','Central locking','5126-0',48,'door trunk locks'],
      ['Cabin and body','Two-door power windows','5133-2',58,'window switch regulator coupe'],
      ['Cabin and body','Horn','6100-0',60],
      ['Cabin and body','Rear window defogger','6100-2',62,'defroster demister C103'],
      ['Cabin and body','Windshield wiper and washer','6160-0',64,'wipers wiper motor washer pump F5'],
      ['Cabin and body','Instrument cluster','6210-0',65,'gauges tachometer speedometer'],
      ['Cabin and body','A/C blower controls','6413-0',86,'heater fan resistor'],
      ['Lighting','Headlights and fog lights','6312-0',74,'headlamps low beam high beam'],
      ['Lighting','Turn signals and hazards','6313-0',76,'flashers indicator'],
      ['Lighting','Park, tail and front marker lamps','6314-0',78,'rear lights parking side marker'],
      ['Connector and component views','Component locations','7000-0',112,'wiring harness relay'],
      ['Connector and component views','Left engine bay locations','7000-1',113,'G104 relay diagnostic connector ABS'],
      ['Connector and component views','Connector views','8500-0',132,'pin pins pinout plugs'],
    ]),
  ],
  e34:sheets(e34ElectricalManual,'1995 525i, 530i and 540i',[
    ['Power supply','Front fuse and relay box layout','0670.0-00',21,'panel board'],
    ['Power supply','Rear fuse and relay box layout','0670.0-01',22,'panel board under rear seat'],
    ['Power supply','Auxiliary relay box layout','0670.0-02',23,'front fan relays'],
    ['Power supply','Fuse ratings and circuit assignments','0670.1-00',25,'fuses fuse chart amps amperage'],
    ['Power supply','525i battery and positive distribution','0670.2-00',31,'battery rear seat 70 RT F0 F97 G6430 X6449 X6400'],
    ['Power supply','Ground distribution','0670.4',59,'ground earth'],
    ['Power supply','Alternator and charging circuit','1230.0-00',131,'battery charge charging'],
    ['Power supply','Starter and interlock · early production','1240.0-00',133,'crank no start automatic manual early'],
    ['Power supply','Starter and interlock · late production','1240.0-01',134,'crank no start automatic manual late'],
    ['Power supply','Starter motor and battery connections','1240.0-02',135,'terminal 30 30h terminal 50 starter battery ground'],
    ['Engine and brakes','M50 engine control','1210.13',121,'525i dme ignition fuel injectors pump'],
    ['Engine and brakes','M50 fuel injector wiring','1210.13-06',127,'525i dme injection valve fuel rail connector'],
    ['Engine and brakes','M60 engine control','1210.11',104,'530i 540i dme ignition fuel injectors pump'],
    ['Engine and brakes','ABS wiring','3450.0',179,'anti lock wheel speed'],
    ['Engine and brakes','ASC 5 traction control','3450.5',188,'abs stability'],
    ['Cabin and body','Central locking · early production','5126.0-00',206,'door locks trunk'],
    ['Cabin and body','Central locking · late production','5126.0-01',207,'door locks trunk'],
    ['Cabin and body','Power windows','5133.0',216,'window switch regulator'],
    ['Cabin and body','Windshield wiper and washer inputs','6160.0-00',284,'wipers washer pump f34'],
    ['Cabin and body','Windshield wiper motor and relay','6160.0-01',285,'wipers front wiper motor X333'],
    ['Cabin and body','Touring rear wiper and washer','6162.0',286,'wagon tailgate rear wiper f44'],
    ['Cabin and body','Instrument cluster and Check Control','6200.0',301,'gauges tachometer speedometer'],
    ['Cabin and body','Rear window defogger','6424.0',368,'defroster demister heater antenna'],
    ['Lighting','Headlights and fog lights','6312.0',340,'headlamps low beam high beam'],
    ['Lighting','Turn signals and hazards','6313.0',344,'flashers indicator'],
    ['Lighting','Parking and tail lights','6314.0',348,'parking side marker'],
    ['Lighting','Brake lights','6325.0',356,'stop lights pedal switch'],
    ['Connector and component views','Component location chart','7000.0',425,'wiring harness module relay'],
    ['Connector and component views','Component location pictures','7100.0',467,'location fuse modules'],
    ['Connector and component views','Engine bay positive junctions','7100.0-01',468,'battery cable b+ chassis harness engine bay x6400 g6430 x2 x3'],
    ['Connector and component views','Connector views','8500.0',513,'pin pins pinout plugs'],
  ]),
};
