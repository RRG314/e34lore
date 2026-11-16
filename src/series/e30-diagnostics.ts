import type {DiagnosticNode} from '../domain/diagnostics';

type Source = Pick<DiagnosticNode,'source'|'sourceHref'>;
const cooling: Source = {source:'BMW E30 repair manual · Group 17',sourceHref:'/repairs/e30-coolant-circuit'};
const braking: Source = {source:'BMW E30 repair manual · Group 34',sourceHref:'/repairs/e30-brake-troubleshooting'};
const driveshaft: Source = {source:'BMW E30 repair manual · 26-15',sourceHref:'/repairs/e30-driveshaft-noise'};
const electrical: Source = {source:'BMW E30 electrical manual · Systematic troubleshooting',sourceHref:'/manual?q=systematic+troubleshooting'};

function observation(id:string,question:string,note:string,source:Source,choices:DiagnosticNode['choices']):DiagnosticNode {
  return {id,question,note,choices,...source};
}
function result(id:string,question:string,note:string,source:Source,outcome:string):DiagnosticNode {
  return {...observation(id,question,note,source,[]),outcome};
}

export const e30DiagnosticFlows:Record<string,DiagnosticNode[]> = {
  overheating:[
    observation('start','Did the gauge reach the red, or was there steam or coolant loss?',
      'Switch off the engine. Wait until the system is cold before inspecting it.',cooling,[
        {label:'Yes or unsure',next:'stop'},{label:'No, the engine is now cold',next:'when'},
      ]),
    observation('when','When did the temperature climb?',
      'Use what you already observed. Keep the engine off for these checks.',cooling,[
        {label:'At idle or in slow traffic',next:'airflow'},{label:'At road speed or under load',next:'circulation'},
        {label:'In both conditions or unsure',next:'circulation'},
      ]),
    observation('airflow','Can you see a blocked or damaged radiator face?',
      'Look from outside the fan and belt area. Keep hands and tools clear of the fans.',cooling,[
        {label:'Yes, there is visible obstruction or damage',next:'restriction'},{label:'No or unsure',next:'fan'},
      ]),
    observation('circulation','Is the cold level low, or is there visible residue at a hose or joint?',
      'Use the cold mark on the installed tank and note where residue starts.',cooling,[
        {label:'There is a visible leak or low level',next:'leak'},{label:'No clear visible finding',next:'baseline'},
      ]),
    result('stop','Park and arrange an assessment','Leave the pressure cap closed while hot.',cooling,
      'Record the highest gauge reading and any steam or coolant loss. Arrange recovery if the vehicle cannot be driven safely.'),
    result('restriction','Document the airflow restriction','Photograph the radiator face and any damage with the engine off.',cooling,
      'Use the radiator and fan arrangement for the fitted engine. A visible restriction warrants inspection before another drive.'),
    result('fan','Check the installed fan arrangement','The E30 can have a belt-driven fan and an auxiliary electric fan.',cooling,
      'Note whether the symptom occurred at idle, whether A/C was on, and which fans are fitted. Use the matching wiring diagram for electrical tests.'),
    result('leak','Follow the leak evidence','A cold visual check can help locate a suspect connection.',cooling,
      'Keep a picture of the highest visible wet point. Use the matching factory pressure-test and filling procedure before replacing parts.'),
    result('baseline','Establish a cooling baseline','Record the cold level, recent cooling work and the gauge reading.',cooling,
      'Identify the engine and cooling layout before testing the thermostat, circulation and gauge. Bleeding differs by engine.'),
  ],
  'no-start':[
    observation('start','What happens when you try to start the engine?',
      'Use your last observation. Stop if there is a fuel leak, hot wiring or an abnormal mechanical sound.',electrical,[
        {label:'Unsafe condition or abnormal sound',next:'stop'},{label:'It does not crank',next:'starter'},
        {label:'It cranks at normal speed',next:'cranks'},
      ]),
    result('stop','Stop and arrange an assessment','Switch the ignition off and keep clear of leaking fuel or damaged wiring.',electrical,
      'Arrange inspection. Record the sound or symptom and recent work.'),
    result('starter','Start with the cranking circuit','Record the lights and sounds during the last attempt.',electrical,
      'Check battery condition, terminal condition and grounds before using the starter wiring diagram. Confirm the gearbox and fitted interlock.'),
    result('cranks','Identify the engine-management system','Record engine, production date and any immobilizer or alarm modifications.',electrical,
      'Use the applicable engine electrical and fuel-system procedures. Record whether the failure is cold, hot or intermittent.'),
  ],
  braking:[
    observation('start','Did the pedal sink, was braking reduced, or is fluid leaking?',
      'Park the car. A hydraulic fault needs assessment before the vehicle is driven.',braking,[
        {label:'Yes or unsure',next:'stop'},{label:'Pedal feels normal, but there is a noise or vibration',next:'noise'},
      ]),
    result('stop','Arrange a brake inspection','Leave the car parked with a suspected hydraulic fault.',braking,
      'Record pedal feel, warning lamps and where fluid was seen. Use the matching hydraulic and ABS diagram for further testing.'),
    result('noise','Record when the symptom occurs','Check visible tire and brake condition from a safe position.',braking,
      'Record whether it occurs under braking, over bumps, or while rolling. Identify rear drums or discs and ABS before choosing parts.'),
  ],
  vibration:[
    observation('start','Was there severe vibration, wheel looseness or visible tire damage?',
      'Avoid a road test with suspected wheel, tire, steering or suspension damage.',driveshaft,[
        {label:'Yes or unsure',next:'stop'},{label:'No, I can describe when it happened',next:'condition'},
      ]),
    observation('condition','What changed the vibration?',
      'Use the drive you already made.',driveshaft,[
        {label:'Vehicle speed or steering position',next:'road-speed'},{label:'Applying or lifting off power',next:'shaft'},
      ]),
    result('stop','Arrange a wheel and suspension inspection','Keep the car parked until the visible safety concern is resolved.',driveshaft,
      'Record which end of the car was affected and any recent wheel, tire or suspension work.'),
    result('road-speed','Start with wheels, tires and suspension','Read tire sizes and inspect visible damage with the car parked.',driveshaft,
      'Record the speed range and whether recent wheel work preceded the symptom. Use the wheel and suspension source for the fitted axle.'),
    result('shaft','Use the driveshaft troubleshooting chart','Confirm rear-wheel drive or iX before selecting parts.',driveshaft,
      'Record whether the symptom changes between acceleration and overrun. Inspect the shaft support and coupling using the applicable source and safe access.'),
  ],
  electrical:[
    observation('start','Is there smoke, heat or damaged battery wiring?',
      'Switch off the affected circuit. Use the rating printed for the fitted position.',electrical,[
        {label:'Yes or unsure',next:'stop'},{label:'No, one circuit has stopped working',next:'fuse'},
      ]),
    result('stop','Stop using the affected circuit','Keep clear of hot or damaged wiring.',electrical,
      'Arrange an electrical inspection and note the circuit and work done before the failure.'),
    result('fuse','Find the correct fuse and wiring diagram','Record the model, production date and circuit before comparing fuse numbers.',electrical,
      'Open the fuse layout and follow the circuit to its loads. A replacement fuse that blows again calls for fault isolation.'),
  ],
};
