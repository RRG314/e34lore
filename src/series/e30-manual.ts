import { e30ManualGroups } from './e30-factory-index.ts';

export const e30Handbook = "https://www.billswebspace.com/BMW%20E30%20Owner%20Manual%20%28325i-325is%29.pdf";
export const e30ElectricalSupplement = "https://www.5021.tips/ujanja/wp-content/uploads/2023/10/BMW-325i-e30m3-1991-elektrical-troubleshooting-manual-1.pdf";

export const e30ElectricalManual = {
  title: "1989 BMW 325i and 325is Electrical Troubleshooting Manual",
  publisher: "BMW of North America",
  url: "https://www.e30club.ru/stuff/electric/e30_89.pdf",
  pages: 148,
  references: [
    { title: "Systematic troubleshooting", section: "6" },
    { title: "Power distribution box and fuses", section: "0670-0 and 0670-1" },
    { title: "Connector views", section: "8500-0" },
    { title: "Component location chart", section: "9000-0" },
    { title: "Component and splice location views", section: "7000-0 and 8000-0" },
  ],
};

export const e30CatalogArchive = "https://www.realoem.com/bmw/enUS/select?archive=1&product=P&series=E30";

export const e30FactoryManualArchive = {
  reader: "https://www.carmanualsonline.info/bmw-e30-1982-repair-manual",
  download: "https://www.allcarmanuals.com/factory-service-manual-343-BMW-3-Series-E30.html",
};

export const e30HaynesManual = {
  title: "Haynes BMW 3- & 5-Series Service and Repair Manual",
  url: "https://www.e30.pt/manuais/BMW-3-5-Series-Service-and-Repair-Manual.pdf",
};

export const e30ManualSources = [
  {
    id: "factory-workshop",
    title: "BMW E30 factory workshop manual",
    url: e30FactoryManualArchive.download,
    scope: "Open BMW-E30-Repair-Manual.pdf from the workshop archive. The page numbers below refer to this 1,308-page edition.",
    systems: ["engine", "cooling", "drivetrain", "brakes", "suspension", "steering", "body", "electrical"],
    references: [...e30ManualGroups.map(group => ({ title:group.title,
      section:"Group "+group.id+" · PDF "+group.pdfStart+"–"+group.pdfEnd,
      href:"/manual/"+group.id,
    })),{title:"Getrag 260 gearbox section",section:"BMW 23-165",href:"https://e30mpower.com/23%20-%20Manual%20Transmission/23-165.jpg"}],
  },
  {
    id:"factory-diagnostics",title:"BMW E30 diagnostic manual",url:e30FactoryManualArchive.download,
    scope:"BMW-E30-Diagnostic-Manual.pdf in the workshop archive. Use the test path and wiring for the installed system.",
    systems:["engine","brakes","electrical"],
  },
  {
    id:"factory-torques",title:"BMW E30 tightening specifications",url:e30FactoryManualArchive.download,
    scope:"BMW-E30-Torque-Settings-Manual.pdf in the workshop archive. Confirm the engine, fastener type and operation before using a value.",
    systems:["engine","cooling","drivetrain","brakes","suspension","steering","body"],
    references:[
      {title:"M20 cylinder head bolts",section:"11-4 · PDF 5"},
      {title:"Coolant hoses, bleed screw and level switch",section:"17-1 · PDF 61"},
      {title:"Manual transmission housing",section:"23-2 · PDF 71"},
    ],
  },
  {
    id:"factory-owner-handbook",title:"BMW 325i / 325is owner’s handbook",url:e30Handbook,
    scope:"US E30 capacities, vehicle dimensions and day-to-day checks.",
    systems:["engine","cooling","drivetrain","body"],
    references:[
      {title:"Washer fluid tank",section:"p. 54 · PDF 55",href:e30Handbook+"#page=55"},
      {title:"Battery access",section:"p. 55 · PDF 56",href:e30Handbook+"#page=56"},
      {title:"Changing a wheel",section:"pp. 57–58 · PDF 58–59",href:e30Handbook+"#page=58"},
      {title:"Wiper blade replacement",section:"p. 59 · PDF 60",href:e30Handbook+"#page=60"},
      {title:"Headlight bulb and lamp replacement",section:"p. 60 · PDF 61",href:e30Handbook+"#page=61"},
      {title:"Tire and wheel sizes",section:"p. 69 · PDF 70",href:e30Handbook+"#page=70"},
      {title:"Cold tire inflation pressures",section:"p. 85 · PDF 86",href:e30Handbook+"#page=86"},
      {title:"Dimensions and weights",section:"p. 78 · PDF 79",href:e30Handbook+"#page=79"},
      {title:"Filling capacities",section:"p. 84 · PDF 85",href:e30Handbook+"#page=85"},
    ],
  },
  {
    id: "1991-electrical-supplement",
    title: "1991 BMW 325i Electrical Troubleshooting Manual supplement",
    url: e30ElectricalSupplement + "#page=3",
    scope: "The 325i section begins on PDF page 3. The later sections cover the 325iX, M3 and convertible.",
    systems: ["electrical", "interior", "body"],
    references: [
      {title:"Fuse 10 circuit",section:"0670-8",href:e30ElectricalSupplement+"#page=10"},
      {title:"Light switch and instrument illumination",section:"6300-0",href:e30ElectricalSupplement+"#page=11"},
      {title:"Park, tail and front marker lamps",section:"6314-0",href:e30ElectricalSupplement+"#page=12"},
    ],
  },
  {
    id: "1989-electrical",
    title: e30ElectricalManual.title,
    url: e30ElectricalManual.url,
    scope: "BMW of North America wiring diagrams for the 1989 325i and 325is.",
    systems: ["electrical", "interior"],
    references: [
      {title:"Power distribution box diagram",section:"0670-0 · PDF 12",href:e30ElectricalManual.url+"#page=12"},
      {title:"Fuse data chart",section:"0670-1 · PDF 13",href:e30ElectricalManual.url+"#page=13"},
      ...e30ElectricalManual.references.filter(row => row.title !== "Power distribution box and fuses"),
    ],
  },
  {
    id: "haynes",
    title: e30HaynesManual.title,
    url: e30HaynesManual.url,
    scope: "Covers multiple 3 and 5 Series configurations. Read the model and engine coverage at the start of each chapter.",
    systems: ["engine", "cooling", "drivetrain", "brakes", "suspension", "steering", "body", "electrical", "interior"],
  },
];
