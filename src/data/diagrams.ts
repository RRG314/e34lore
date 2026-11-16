export type Hotspot = {
  partIds: string[];
  x: number;
  y: number;
  label?: string;
  width?: number;
  height?: number;
};
export type TechnicalDrawing = {
  id: string;
  assembly: string;
  image: string;
  width: number;
  height: number;
  label: string;
  credit: string;
  source: string;
  scope: string;
  hotspots: Hotspot[];
};
const waterIds = [
  "coolant-pump",
  "pump-seal",
  "pump-nut",
  "thermostat-housing",
  "thermostat",
  "thermostat-seal",
  "early-gasket",
  "profile-gasket",
  "housing-bolt-m6",
  "housing-bolt-m8",
];
export const technicalDrawings: TechnicalDrawing[] = [
  {
    id: "strut-upper-catalog",
    assembly: "front-strut-upper",
    image: "",
    width: 1288,
    height: 910,
    label: "Catalog drawing · 09/1992-on",
    credit: "BMW catalog illustration · BMWPartsDeal",
    source:
      "https://www.bmwpartsdeal.com/parts-list/1994-bmw-525i-sedan_e34/front_rear_axle/guide_support_spring_pad_attaching_parts.html",
    scope:
      "Later upper mounting stack, from 09/1992. The alternate mount silhouettes and positions 14–16 require separate option confirmation.",
    hotspots: [
      {
        partIds: ["upper-mount-standard", "upper-mount-camber"],
        x: 0.19,
        y: 0.46,
        label: "1",
        width: 0.15,
        height: 0.14,
      },
      {
        partIds: ["upper-mount-nut", "upper-mount-nut-alternate"],
        x: 0.12,
        y: 0.24,
        label: "2",
      },
      { partIds: ["upper-mount-washer"], x: 0.163, y: 0.192, label: "3" },
      { partIds: ["upper-strut-rod-nut"], x: 0.166, y: 0.148, label: "4" },
      { partIds: ["upper-strut-cap"], x: 0.157, y: 0.09, label: "5" },
      { partIds: ["upper-dust-collar"], x: 0.198, y: 0.53, label: "6" },
      { partIds: ["upper-flat-washer"], x: 0.2, y: 0.576, label: "7" },
      {
        partIds: ["upper-spring-plate-oem"],
        x: 0.21,
        y: 0.66,
        label: "8",
        width: 0.23,
        height: 0.12,
      },
      {
        partIds: ["upper-spring-pad-oem"],
        x: 0.2,
        y: 0.788,
        label: "9",
        width: 0.22,
        height: 0.14,
      },
      {
        partIds: ["strut-bump-stop-oem"],
        x: 0.428,
        y: 0.3,
        label: "10",
        width: 0.1,
        height: 0.15,
      },
      {
        partIds: ["strut-protection-tube-oem"],
        x: 0.46,
        y: 0.527,
        label: "11",
        width: 0.12,
        height: 0.18,
      },
      {
        partIds: ["lower-spring-pad-oem"],
        x: 0.7,
        y: 0.687,
        label: "12",
        width: 0.22,
        height: 0.13,
      },
      { partIds: ["upper-mount-pin"], x: 0.153, y: 0.555, label: "13" },
    ],
  },
  {
    id: "water-pump-catalog",
    assembly: "water-pump",
    image: "",
    width: 1288,
    height: 910,
    label: "Catalog drawing",
    credit: "BMW catalog illustration · BMWPartsDeal",
    source:
      "https://www.bmwpartsdeal.com/parts-list/1994-bmw-525i-wagon_e34/engine/water_pump_thermostat.html",
    scope: "M50 pump and thermostat. Source selection: 1994 525i Touring.",
    hotspots: [
      [0.426, 0.774],
      [0.54, 0.713],
      [0.369, 0.886],
      [0.158, 0.59],
      [0.526, 0.398],
      [0.432, 0.427],
      [0.312, 0.35],
      [0.367, 0.585],
      [0.116, 0.43],
      [0.094, 0.683],
    ].map(([x, y], i) => ({
      partIds: [waterIds[i]],
      x,
      y,
      label: String(i + 1),
    })),
  },
  {
    id: "strut-damper-catalog",
    assembly: "front-strut-damper",
    image: "",
    width: 799,
    height: 559,
    label: "Catalog drawing",
    credit: "© BMW AG · RealOEM diagram 31_0144",
    source:
      "https://www.realoem.com/bmw/enUS/showparts?diagId=31_0144&id=HJ63-USA---E34-BMW-525i",
    scope: "E34 525i HJ63 USA. Spring and upper mount are separate assemblies.",
    hotspots: [
      {
        partIds: [
          "strut-housing-left",
          "strut-housing-right",
          "strut-left-hub",
          "strut-right-hub",
        ],
        x: 0.72,
        y: 0.37,
        label: "1",
      },
      { partIds: ["damper-catalog"], x: 0.31, y: 0.37, label: "2" },
      { partIds: ["damper-threaded-ring"], x: 0.303, y: 0.05, label: "3" },
      {
        partIds: ["abs-sensor-catalog", "abs-sensor-early"],
        x: 0.86,
        y: 0.56,
        label: "4",
      },
      {
        partIds: ["abs-sensor-washer", "abs-sensor-spring-washer"],
        x: 0.89,
        y: 0.545,
        label: "5",
      },
      { partIds: ["abs-sensor-screw"], x: 0.905, y: 0.516, label: "6" },
      { partIds: ["abs-cable-holder"], x: 0.925, y: 0.292, label: "7" },
      { partIds: ["damper-spacer"], x: 0.12, y: 0.23, label: "9" },
    ],
  },
  {
    id: "disc-catalog",
    assembly: "front-brake-disc",
    image: "",
    width: 1288,
    height: 910,
    label: "Catalog drawing",
    credit: "BMW catalog illustration · BMWPartsDeal",
    source:
      "https://www.bmwpartsdeal.com/parts-list/1994-bmw-525i-sedan_e34/brakes_pedals/front_brake_brake_disc.html",
    scope:
      "1994 525i Sedan. Ventilated disc is position 2; solid-disc silhouette is not a fitment claim.",
    hotspots: [
      {
        partIds: ["brake-disc", "front-disc-previous"],
        x: 0.4,
        y: 0.5,
        label: "2",
        width: 0.28,
        height: 0.56,
      },
      {
        partIds: ["disc-locating-screw", "disc-locating-screw-early"],
        x: 0.831,
        y: 0.701,
        label: "3",
      },
      {
        partIds: ["disc-shield-left", "disc-shield-right"],
        x: 0.19,
        y: 0.36,
        label: "4",
        width: 0.24,
        height: 0.52,
      },
      {
        partIds: ["disc-shield-bolt", "disc-shield-bolt-old"],
        x: 0.39,
        y: 0.12,
        label: "5",
      },
    ],
  },
  {
    id: "front-caliper-catalog",
    assembly: "front-brake",
    image: "",
    width: 1288,
    height: 910,
    label: "Catalog drawing",
    credit: "BMW catalog illustration · BMWPartsDeal",
    source:
      "https://www.bmwpartsdeal.com/parts-list/1994-bmw-525i-sedan_e34/brakes_pedals/front_wheel_brake_brake_pad_sensor.html",
    scope:
      "1994 525i Sedan · ATE. Kits and alternate numbers share drawing positions.",
    hotspots: [
      {
        partIds: ["caliper-assembly-left", "caliper-assembly-right"],
        x: 0.35,
        y: 0.55,
        label: "1",
      },
      {
        partIds: ["brake-caliper", "caliper-housing-right"],
        x: 0.45,
        y: 0.6,
        label: "2",
        width: 0.31,
        height: 0.41,
      },
      {
        partIds: ["brake-carrier"],
        x: 0.69,
        y: 0.65,
        label: "3",
        width: 0.2,
        height: 0.5,
      },
      { partIds: ["caliper-carrier-bolt"], x: 0.245, y: 0.61, label: "4" },
      { partIds: ["caliper-bleed-valve"], x: 0.117, y: 0.451, label: "5" },
      { partIds: ["caliper-bleed-cap"], x: 0.18, y: 0.47, label: "6" },
      { partIds: ["caliper-retaining-spring"], x: 0.822, y: 0.653, label: "7" },
      { partIds: ["caliper-guide-bolt"], x: 0.24, y: 0.34, label: "8" },
      { partIds: ["wear-sensor"], x: 0.28, y: 0.14, label: "9" },
      { partIds: ["pad-sensor-cable-holder"], x: 0.348, y: 0.195, label: "11" },
      { partIds: ["guide-bolt-plug"], x: 0.06, y: 0.26, label: "12" },
      { partIds: ["caliper-seal-kit"], x: 0.55, y: 0.195, label: "13" },
      {
        partIds: ["guide-bush-kit", "guide-bush-kit-old"],
        x: 0.122,
        y: 0.29,
        label: "14",
      },
      {
        partIds: ["brake-pads"],
        x: 0.87,
        y: 0.3,
        label: "15",
        width: 0.22,
        height: 0.37,
      },
      {
        partIds: ["brake-pad-paste", "brake-pad-paste-old"],
        x: 0.071,
        y: 0.823,
        label: "16",
      },
    ],
  },

];
export function drawingsForAssembly(assembly: string) {
  return technicalDrawings.filter((d) => d.assembly === assembly);
}
export function drawingForPart(partId: string) {
  return technicalDrawings.find((d) =>
    d.hotspots.some((h) => h.partIds.includes(partId)),
  );
}
