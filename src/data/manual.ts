/**
 * Original reference content derived from the owner-supplied Bentley scan.
 * Raw text, scans and publisher illustrations are intentionally not bundled.
 * Header-indexed is an index-validation state, not technical certification.
 */
import { serviceProcedures } from "./service-procedures.ts";
import { projectWalkthroughs } from "./project-walkthroughs.ts";
import { maintenanceGuides } from "./maintenance-guides.ts";

export type ManualChapter = {
  id: string;
  title: string;
  pdfStart: number;
  pdfEnd: number;
  printedPages: string;
  system: string;
  coverage: string;
  reviewStatus: "header-indexed";
};
export type ManualGuide = {
  slug: string;
  title: string;
  system: string;
  engines: string[];
  level: "Beginner" | "Intermediate" | "Advanced";
  track?: "swap" | "mod";
  searchTerms?: string;
  evidence?: { label: string; href: string }[];
  relatedGuides?: string[];
  duration: string;
  durationBasis: string;
  kind: "inspection" | "planning" | "reference" | "replacement";
  summary: string;
  reviewStatus: "draft";
  sourceChecked: boolean;
  applicability: string;
  source: { id: string; title: string; section: string; pdfPages: number[] };
  tools: string[];
  cautions: string[];
  jobSupport?: {
    reviewedOn: string; sourceSha256: string;
    requiredParts: string[]; conditionalParts: string[]; stopConditions: string[];
    additionalSources?: { title: string; url: string }[];
    steps: { number: number; tools: string[]; source: { printed: string; pdf?: number; href: string } }[];
  };
  steps: { title: string; body: string; check: string }[];
};

export const manualSource = {
  id: "bentley-e34-upload",
  title: "BMW 5 Series (E34) Service Manual",
  publisher: "Bentley Publishers",
  edition: "Not established from this scan",
  publicationYear: null,
  sourceFile: "E34 5 Series Service Manual (1).pdf",
  sha256: "23032c541d08d764921449cb13751e77847abaeb720abb21e30401e22797322a",
  pdfPageCount: 472,
  chapterCount: 47,
  market: "United States",
  coverage: [
    {
      model: "525i",
      modelYears: "1989-1995",
      engineFamilies: ["M20", "M50", "M50TU"],
    },
    {
      model: "535i",
      modelYears: "1989-1993",
      engineFamilies: ["M30"],
    },
    {
      model: "530i",
      modelYears: "1994-1995",
      engineFamilies: ["M60"],
    },
    {
      model: "540i",
      modelYears: "1994-1995",
      engineFamilies: ["M60"],
    },
  ],
  coverageCitation: {
    section: "Foreword, printed page v; 100-1",
    pdfPages: [5, 43],
  },
  bodyStyles:
    "Sedan and Touring where the specific procedure states applicability",
  notCovered: [
    "Non-U.S. configurations are not established by this source",
    "518i, 520i, 524td, 525td, 525tds, 525iX and M5 are not established by this source",
    "Engine-swapped or modified vehicles require separate evidence",
  ],
  rightsStatus:
    "Private supplied source; redistribution permission not established",
  downloadAvailable: false,
  ocrStatus:
    "Scanned pages with OCR; extracted technical values require visual verification",
  reviewStatus: "registered; selected pages visually checked",
  completeness:
    "Not established. The uploaded file ends at printed index page 6, within P entries. No claim that this is a complete publisher edition.",
  appendices: [
    {
      id: "EWD",
      title: "Electrical wiring diagrams",
      pdfStart: 441,
      pdfEnd: 466,
      printedPages: "EWD-1 to EWD-26",
      reviewStatus: "header-indexed; circuit completeness not established",
    },
    {
      id: "INDEX",
      title: "Index (available scan portion)",
      pdfStart: 467,
      pdfEnd: 472,
      printedPages: "Index 1-6",
      reviewStatus: "partial ending; no index-completeness claim",
    },
  ],
} as const;

export const manualChapters: ManualChapter[] = [
  {
    id: "010",
    title: "Fundamentals for the DIY owner",
    pdfStart: 9,
    pdfEnd: 22,
    printedPages: "010-1 to 010-14",
    system: "fundamentals",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "020",
    title: "Maintenance program",
    pdfStart: 23,
    pdfEnd: 42,
    printedPages: "020-1 to 020-20",
    system: "maintenance",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "100",
    title: "Engine - general",
    pdfStart: 43,
    pdfEnd: 57,
    printedPages: "100-1 to 100-15",
    system: "engine",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "110",
    title: "Engine removal and installation",
    pdfStart: 59,
    pdfEnd: 72,
    printedPages: "110-1 to 110-14",
    system: "engine",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "113",
    title: "Cylinder head removal and installation",
    pdfStart: 73,
    pdfEnd: 98,
    printedPages: "113-1 to 113-26",
    system: "engine",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "116",
    title: "Cylinder head and valvetrain",
    pdfStart: 99,
    pdfEnd: 120,
    printedPages: "116-1 to 116-22",
    system: "engine",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "117",
    title: "Camshaft timing chain",
    pdfStart: 121,
    pdfEnd: 140,
    printedPages: "117-1 to 117-20",
    system: "engine",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "118",
    title: "Camshaft timing belt",
    pdfStart: 141,
    pdfEnd: 144,
    printedPages: "118-1 to 118-4",
    system: "engine",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "119",
    title: "Lubrication system",
    pdfStart: 145,
    pdfEnd: 152,
    printedPages: "119-1 to 119-8",
    system: "engine",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "120",
    title: "Ignition system and DME",
    pdfStart: 153,
    pdfEnd: 162,
    printedPages: "120-1 to 120-10",
    system: "electrical",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "121",
    title: "Battery, starter and alternator",
    pdfStart: 163,
    pdfEnd: 168,
    printedPages: "121-1 to 121-6",
    system: "electrical",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "130",
    title: "Fuel injection and DME",
    pdfStart: 169,
    pdfEnd: 196,
    printedPages: "130-1 to 130-28",
    system: "fuel",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "160",
    title: "Fuel tank and fuel pump",
    pdfStart: 197,
    pdfEnd: 203,
    printedPages: "160-1 to 160-7",
    system: "fuel",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "170",
    title: "Radiator and cooling system",
    pdfStart: 205,
    pdfEnd: 216,
    printedPages: "170-1 to 170-12",
    system: "cooling",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "180",
    title: "Exhaust system",
    pdfStart: 217,
    pdfEnd: 221,
    printedPages: "180-1 to 180-5",
    system: "exhaust",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "200",
    title: "Transmission - general",
    pdfStart: 223,
    pdfEnd: 224,
    printedPages: "200-1 to 200-2",
    system: "drivetrain",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "210",
    title: "Clutch",
    pdfStart: 225,
    pdfEnd: 230,
    printedPages: "210-1 to 210-6",
    system: "drivetrain",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "230",
    title: "Manual transmission",
    pdfStart: 231,
    pdfEnd: 236,
    printedPages: "230-1 to 230-6",
    system: "drivetrain",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "240",
    title: "Automatic transmission",
    pdfStart: 237,
    pdfEnd: 254,
    printedPages: "240-1 to 240-18",
    system: "drivetrain",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "250",
    title: "Gearshift linkage",
    pdfStart: 255,
    pdfEnd: 260,
    printedPages: "250-1 to 250-6",
    system: "drivetrain",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "260",
    title: "Driveshaft",
    pdfStart: 261,
    pdfEnd: 269,
    printedPages: "260-1 to 260-9",
    system: "drivetrain",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "300",
    title: "Suspension, steering and brakes - general",
    pdfStart: 271,
    pdfEnd: 276,
    printedPages: "300-1 to 300-6",
    system: "suspension",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "310",
    title: "Front suspension",
    pdfStart: 277,
    pdfEnd: 288,
    printedPages: "310-1 to 310-12",
    system: "suspension",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "320",
    title: "Steering and wheel alignment",
    pdfStart: 289,
    pdfEnd: 298,
    printedPages: "320-1 to 320-10",
    system: "steering",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "330",
    title: "Rear suspension",
    pdfStart: 299,
    pdfEnd: 311,
    printedPages: "330-1 to 330-13",
    system: "suspension",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "331",
    title: "Final drive",
    pdfStart: 313,
    pdfEnd: 316,
    printedPages: "331-1 to 331-4",
    system: "drivetrain",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "340",
    title: "Brakes",
    pdfStart: 317,
    pdfEnd: 328,
    printedPages: "340-1 to 340-12",
    system: "brakes",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "400",
    title: "Body - general",
    pdfStart: 329,
    pdfEnd: 331,
    printedPages: "400-1 to 400-3",
    system: "body",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "410",
    title: "Fenders and engine hood",
    pdfStart: 333,
    pdfEnd: 336,
    printedPages: "410-1 to 410-4",
    system: "body",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "411",
    title: "Doors",
    pdfStart: 337,
    pdfEnd: 342,
    printedPages: "411-1 to 411-6",
    system: "body",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "412",
    title: "Trunk lid and tailgate",
    pdfStart: 343,
    pdfEnd: 346,
    printedPages: "412-1 to 412-4",
    system: "body",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "510",
    title: "Exterior trim and bumpers",
    pdfStart: 347,
    pdfEnd: 351,
    printedPages: "510-1 to 510-5",
    system: "body",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "512",
    title: "Door windows",
    pdfStart: 353,
    pdfEnd: 356,
    printedPages: "512-1 to 512-4",
    system: "body",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "513",
    title: "Interior trim",
    pdfStart: 357,
    pdfEnd: 360,
    printedPages: "513-1 to 513-4",
    system: "interior",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "515",
    title: "Central locking",
    pdfStart: 361,
    pdfEnd: 364,
    printedPages: "515-1 to 515-4",
    system: "electrical",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "520",
    title: "Seats",
    pdfStart: 365,
    pdfEnd: 370,
    printedPages: "520-1 to 520-6",
    system: "interior",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "540",
    title: "Sunroof",
    pdfStart: 371,
    pdfEnd: 374,
    printedPages: "540-1 to 540-4",
    system: "body",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "600",
    title: "Electrical system - general",
    pdfStart: 375,
    pdfEnd: 380,
    printedPages: "600-1 to 600-6",
    system: "electrical",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "610",
    title: "Fuses and relays",
    pdfStart: 381,
    pdfEnd: 385,
    printedPages: "610-1 to 610-5",
    system: "electrical",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "611",
    title: "Wipers and washers",
    pdfStart: 387,
    pdfEnd: 395,
    printedPages: "611-1 to 611-9",
    system: "electrical",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "612",
    title: "Switches and electrical accessories",
    pdfStart: 397,
    pdfEnd: 400,
    printedPages: "612-1 to 612-4",
    system: "electrical",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "620",
    title: "Instruments",
    pdfStart: 401,
    pdfEnd: 406,
    printedPages: "620-1 to 620-6",
    system: "electrical",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "630",
    title: "Exterior lighting",
    pdfStart: 407,
    pdfEnd: 411,
    printedPages: "630-1 to 630-5",
    system: "electrical",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "640",
    title: "Heating and air conditioning",
    pdfStart: 413,
    pdfEnd: 426,
    printedPages: "640-1 to 640-14",
    system: "climate",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "650",
    title: "Radio",
    pdfStart: 427,
    pdfEnd: 429,
    printedPages: "650-1 to 650-3",
    system: "electrical",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "720",
    title: "Seat belts",
    pdfStart: 431,
    pdfEnd: 434,
    printedPages: "720-1 to 720-4",
    system: "restraints",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
  {
    id: "721",
    title: "Airbag system (SRS)",
    pdfStart: 435,
    pdfEnd: 439,
    printedPages: "721-1 to 721-5",
    system: "restraints",
    coverage:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    reviewStatus: "header-indexed",
  },
];

export const manualGuides: ManualGuide[] = [
  {
    slug: "identify-your-engine",
    title: "Identify the engine before choosing a procedure",
    system: "engine",
    engines: ["M20", "M30", "M50", "M50TU", "M60"],
    level: "Beginner",
    duration: "5 min read",
    durationBasis:
      "Editorial reading or inspection estimate; not a factory labor time",
    kind: "reference",
    summary:
      "Match a car to the manual's engine families and record what is still unknown before opening a repair or ordering a part.",
    reviewStatus: "draft",
    sourceChecked: true,
    applicability:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    source: {
      id: "bentley-e34-upload",
      title: "BMW 5 Series (E34) Service Manual",
      section: "Foreword p. v; 100-1",
      pdfPages: [5, 43],
    },
    tools: ["Vehicle records", "Camera or notebook"],
    cautions: [
      "A model badge or model year alone does not prove which engine is currently installed.",
      "This source establishes U.S. applications only; a swap needs its own identification evidence.",
    ],
    steps: [
      {
        title: "Record the actual vehicle",
        body: "Save the model, market, model year and available production date. Keep an unknown value explicitly unknown.",
        check:
          "The vehicle record distinguishes an observed fact from an assumption.",
      },
      {
        title: "Choose a source-supported starting point",
        body: "The manual groups U.S. 1989-1990 525i with M20, 1991-1992 525i with M50, and 1993-1995 525i with M50TU. Its 535i uses M30, and its 1994-1995 530i/540i use M60.",
        check:
          "A starting engine family is selected, or no supported match is claimed.",
      },
      {
        title: "Check the car against its history",
        body: "Compare the starting point with existing engine identification records and any documented modifications. Resolve a mismatch before using engine-specific instructions.",
        check:
          "The guide filter reflects the installed engine or remains unconfirmed.",
      },
      {
        title: "Carry the identity forward",
        body: "Attach the vehicle and engine family to your repair question and parts inquiry. Verify production restrictions separately before purchasing.",
        check:
          "Other members can see the configuration and unresolved details.",
      },
    ],
  },
  {
    slug: "cooling-system-visual-check",
    title: "Start an overheating investigation with a cold inspection",
    system: "cooling",
    engines: ["M20", "M30", "M50", "M50TU", "M60"],
    level: "Beginner",
    duration: "15-25 min",
    durationBasis:
      "Editorial reading or inspection estimate; not a factory labor time",
    kind: "inspection",
    summary:
      "Create a useful first record of coolant loss, belt condition, hoses and radiator airflow before treating a suspected component as a confirmed failure.",
    reviewStatus: "draft",
    sourceChecked: true,
    applicability:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    source: {
      id: "bentley-e34-upload",
      title: "BMW 5 Series (E34) Service Manual",
      section: "170-1 to 170-2",
      pdfPages: [205, 206],
    },
    tools: [
      "Inspection light",
      "Eye protection",
      "Gloves",
      "Notebook or camera",
    ],
    cautions: [
      "Wait until the engine and cooling system are fully cold. Never open a hot or pressurized coolant cap.",
      "Keep coolant away from people and animals and contain any spill.",
      "Keep hands clear of fans and belts; the electric fan can operate when the ignition is on.",
    ],
    steps: [
      {
        title: "Make the work area safe",
        body: "Park securely, switch the engine and ignition off, and let the system cool completely. This is a visual inspection; do not start a hot-system test.",
        check: "The engine is off, the key is removed, and the system is cold.",
      },
      {
        title: "Record level and visible leakage",
        body: "Observe the available cold-level markings and look for wet areas or dried residue around the engine, expansion tank, radiator and hose connections. Do not assume the first wet area is the source.",
        check:
          "Each observation has a location and a photo or written description.",
      },
      {
        title: "Look over hoses and the drive belt",
        body: "Check accessible hoses for cracking or obvious deterioration, inspect clamp areas for leakage, and look at the coolant-pump drive belt for visible damage.",
        check:
          "Any damaged or uncertain item is recorded for a closer engine-specific inspection.",
      },
      {
        title: "Inspect the radiator air path",
        body: "Look for dirt, leaves or debris obstructing the radiator and record any obvious damage. Keep tools and fingers outside the fan area.",
        check:
          "The record distinguishes an airflow obstruction from a coolant-flow suspicion.",
      },
      {
        title: "Choose the next test from the evidence",
        body: "A visual check cannot rule out an internal leak, circulation fault or fan-control fault. Take the recorded observations to the appropriate test or a qualified workshop.",
        check:
          "The next action is a test supported by an observation, rather than an unverified parts replacement.",
      },
    ],
  },
  {
    slug: "cooling-fan-airflow-check",
    title: "Separate an airflow concern from a fan diagnosis",
    system: "cooling",
    engines: ["M20", "M30", "M50", "M50TU", "M60"],
    level: "Beginner",
    duration: "10-15 min",
    durationBasis:
      "Editorial reading or inspection estimate; not a factory labor time",
    kind: "inspection",
    summary:
      "Understand the mechanical fan and auxiliary electric fan, then gather cold, engine-off observations useful for an overheating-at-idle question.",
    reviewStatus: "draft",
    sourceChecked: true,
    applicability:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    source: {
      id: "bentley-e34-upload",
      title: "BMW 5 Series (E34) Service Manual",
      section: "170-1; 170-3",
      pdfPages: [205, 207],
    },
    tools: ["Inspection light", "Notebook or camera"],
    cautions: [
      "Perform this visual inspection with a cold engine, ignition off and air conditioning off.",
      "Never try to stop a moving fan or reach into its blades.",
      "No powered fan test, connector bridging or hot-engine test is included here.",
    ],
    steps: [
      {
        title: "Describe when the symptom happens",
        body: "Record whether the reported overheating happens at idle, in traffic, at speed or under load. The manual identifies primary-fan faults as one possible cause of overheating during prolonged idling.",
        check:
          "The report includes conditions and observations without asserting a failed part.",
      },
      {
        title: "Identify the two fan arrangements",
        body: "From a safe view with the engine off, locate the pump-driven primary fan and the electric auxiliary fan ahead of the radiator. The fan clutch regulates the primary fan coupling.",
        check:
          'The question names the fan being discussed instead of using an ambiguous "fan" label.',
      },
      {
        title: "Inspect visible condition",
        body: "Look for damaged blades, obstructions and visible fluid leakage near the viscous clutch. Record what is visible without reaching into the fan assembly.",
        check: "Photos or notes identify the observed issue and its location.",
      },
      {
        title: "Escalate to the appropriate controlled test",
        body: "A still fan alone is not proof of a fault. Use the engine-specific fan-check procedure and wiring evidence for the next test, or ask a workshop to perform it.",
        check:
          "The next test is chosen; the observation has not been marked as a verified diagnosis.",
      },
    ],
  },
  {
    slug: "m50-water-pump-job-planning",
    title: "Plan an M50 coolant-pump job",
    system: "cooling",
    engines: ["M50", "M50TU"],
    level: "Intermediate",
    duration: "10 min planning",
    durationBasis:
      "Editorial reading or inspection estimate; not a factory labor time",
    kind: "planning",
    summary:
      "Check the parts and bleed procedure first, then follow the source-checked mechanical sequence for fan access, pump extraction, seal installation and even tightening.",
    reviewStatus: "draft",
    sourceChecked: true,
    applicability:
      "U.S. 1991–95 E34 525i with an installed M50 or M50TU, the four-stud pump and the matching belt and cooling hardware. Check any replacement or modified hardware against its own instructions.",
    source: {
      id: "bentley-e34-upload",
      title: "BMW 5 Series (E34) Service Manual",
      section: "170-8–170-9, Figs. 12–13; 170-12; 020-13",
      pdfPages: [35, 212, 213, 216],
    },
    tools: [
      "Applicable cooling fill and bleed procedure",
      "Fan wrench and pulley holder",
      "Two matching M6 extraction bolts",
      "New pump and seal, low-range torque wrench and coolant containment",
    ],
    cautions: [
      "Do not open or drain a hot cooling system.",
      "The fan-clutch attachment uses a left-hand thread; consult the proper removal procedure before applying force.",
      "Installation loads, tightening specifications, coolant choice and bleeding must be verified for the actual vehicle and replacement parts.",
    ],
    steps: [
      {
        title: "Confirm the M50 application",
        body: "Check the installed engine identity and review the M50-specific pump procedure rather than borrowing the M20, M30 or M60 steps.",
        check: "The engine and any modification are recorded.",
      },
      {
        title: "Plan access before draining",
        body: "Confirm the fill and bleed procedure for the installed reservoir before opening the system. On a cold engine, isolate the battery and drain into a suitable container. Remove the fan and shroud with the source-specific holding method. Move the documented thermostat housing hoses, loosen the pump pulley hardware, and remove the belt and pulley using the matched tensioner procedure.",
        check:
          "The work can proceed safely without improvising a missing holding or access tool.",
      },
      {
        title: "Extract the old pump squarely",
        body: "Match the replacement and seal to the actual housing. Remove the four pump retaining nuts. Thread two matching M6 bolts into the opposed extraction ears shown in Fig. 13 and advance them evenly until the pump releases. Stop for damaged threads or an uneven release. Keep tools clear of the mating bore.",
        check: "The pump comes out squarely and the studs and sealing bore are undamaged.",
      },
      {
        title: "Fit the new seal and tighten evenly",
        body: "Clean the mating bore, fit a new seal and use only a seal-compatible assembly lubricant specified for the installed pump. Locate the pump squarely over the studs and tighten the four nuts alternately and evenly. Bentley lists 10 Nm for the factory pump-to-cover nuts and 10 Nm for the pump pulley fasteners. Confirm these values for the actual hardware.",
        check:
          "The seal is seated without pinching, the pump is flush and the applied torques are recorded.",
      },
      {
        title: "Restore the cooling system and verify",
        body: "Restore the pulley, belt, hoses, fan and shroud, then check routing and clearance. Follow the verified fill and bleed procedure for the installed cooling system before running the engine. Include a leak check, controlled temperature check and a final cold-level recheck. Stop for an unknown cap or bleed sequence, leakage or abnormal temperature.",
        check:
          "The job checklist includes completion verification rather than ending when the new part is installed.",
      },
    ],
  },
  {
    slug: "battery-connections-first-check",
    title: "Inspect battery cables and grounds before blaming the alternator",
    system: "electrical",
    engines: ["M20", "M30", "M50", "M50TU", "M60"],
    level: "Beginner",
    duration: "15 min",
    durationBasis:
      "Editorial reading or inspection estimate; not a factory labor time",
    kind: "inspection",
    summary:
      "Gather the basic connection, ground and belt observations that help a charging or slow-cranking investigation.",
    reviewStatus: "draft",
    sourceChecked: true,
    applicability:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    source: {
      id: "bentley-e34-upload",
      title: "BMW 5 Series (E34) Service Manual",
      section: "121-1",
      pdfPages: [163],
    },
    tools: [
      "Inspection light",
      "Eye protection",
      "Gloves",
      "Notebook or camera",
    ],
    cautions: [
      "Battery acid and explosive charging gas require eye and skin protection and no sparks, smoking or flame.",
      "Do not bridge battery terminals with tools or jewelry.",
      "This page does not instruct battery disconnection, charging or live electrical testing.",
    ],
    steps: [
      {
        title: "Find the battery for this configuration",
        body: "The source locates it in the engine compartment on U.S. 1989-1991 525i and under the rear seat on 1992-on 525i and the covered 530i, 535i and 540i. Confirm the actual installation.",
        check:
          "The location is observed on the car and any modification is recorded.",
      },
      {
        title: "Inspect without disturbing the connections",
        body: "With the ignition off, look for visible corrosion, cable damage and an obviously loose connection. Avoid touching both terminals or placing a tool between a terminal and bodywork.",
        check:
          "Visible connection issues are documented, not hidden by an immediate parts swap.",
      },
      {
        title: "Follow the ground path visually",
        body: "Inspect accessible battery-to-body and engine-to-body ground connections for damage or corrosion. Do not infer electrical continuity from appearance alone.",
        check: "The report identifies which ground connection was observed.",
      },
      {
        title: "Check the alternator belt visually",
        body: "With the engine stopped, inspect the accessible belt for obvious wear or damage. Belt adjustment and replacement require the applicable engine procedure.",
        check:
          "Belt condition is recorded separately from battery or alternator condition.",
      },
      {
        title: "Request the next measurement",
        body: "If the cause remains unclear, use a suitable charging-system diagnostic procedure or workshop test. A visual inspection alone cannot certify battery capacity or alternator output.",
        check:
          "The next step is a defined measurement with the vehicle identity attached.",
      },
    ],
  },
  {
    slug: "front-strut-component-identification",
    title: "Identify a front strut assembly and its production differences",
    system: "suspension",
    engines: ["M20", "M30", "M50", "M50TU", "M60"],
    level: "Beginner",
    duration: "8 min read",
    durationBasis:
      "Editorial reading or inspection estimate; not a factory labor time",
    kind: "reference",
    summary:
      "Learn the front-suspension component names and why the upper strut stack must be checked against the car's configuration.",
    reviewStatus: "draft",
    sourceChecked: true,
    applicability:
      "U.S. models: 525i 1989-1995; 535i 1989-1993; 530i and 540i 1994-1995. Applicability within each chapter still varies.",
    source: {
      id: "bentley-e34-upload",
      title: "BMW 5 Series (E34) Service Manual",
      section: "310-1 to 310-4",
      pdfPages: [277, 278, 279, 280],
    },
    tools: ["Vehicle production information", "Parts diagram or camera"],
    cautions: [
      "Do not loosen the strut shaft nut or disassemble a spring-loaded assembly for identification.",
      "Spring work requires suitable equipment and the complete procedure.",
      "Do not treat a visual teaching diagram as a fitment guarantee.",
    ],
    steps: [
      {
        title: "Distinguish the nearby components",
        body: "The front suspension includes the strut, control arm, thrust arm, stabilizer link, crossmember and center tie rod. Use these names to locate the subject of a noise or parts question.",
        check:
          "The report identifies a component or clearly states that its location is uncertain.",
      },
      {
        title: "Read the strut as an assembly",
        body: "The strut stack includes the mount, spring seats and pads, spring, cartridge and housing; the bump stop and protective tube are additional service items.",
        check:
          "The requested item is not confused with the entire strut assembly.",
      },
      {
        title: "Check the production split",
        body: "The manual shows different upper stacks for 1989-1992 and 1993-on applications. It also notes that some mounts correct camber and carry a plus or minus marking.",
        check:
          "Production information and any observed mount marking are included with the inquiry.",
      },
      {
        title: "Verify fitment before ordering",
        body: "Check the car's actual strut and mount configuration, including prior modifications, against documented parts applicability. The source diagram does not establish an OEM number for every item.",
        check:
          "The part remains unconfirmed until the vehicle and catalog evidence agree.",
      },
    ],
  },
  ...maintenanceGuides,
  ...serviceProcedures,
  ...projectWalkthroughs,
];
