import type { Series } from "../series/registry";
import type { ReferenceModel, Viewpoint } from "../digital-twin/public/model";

const bay = "e30assembly:engine-bay:";
const engine = "e30assembly:engine:";

type Topic = {
  label: string;
  e30?: readonly string[];
  e34?: readonly string[];
  viewpoint?: Viewpoint;
  e34Only?: boolean;
};

const topics = {
  oil: { label: "Engine oil filler", e30: [engine+"rocker-cover"], viewpoint: "top" },
  "oil-change": { label: "Engine oil change", e30: [engine+"rocker-cover", engine+"oil-filter", engine+"sump"] },
  coolant: { label: "Coolant expansion tank", e30: [bay+"expansion-tank"], e34: ["e34sys:expansion-tank"], viewpoint: "top" },
  brake: { label: "Brake fluid reservoir", e30: [bay+"brake-master"], e34: ["e34bay:brake-reservoir"], viewpoint: "top" },
  steering: { label: "Power steering reservoir", e30: [bay+"power-steering"], e34: ["e34bay:steering-reservoir"], viewpoint: "top" },
  washer: { label: "Windshield washer reservoir", e30: [bay+"washer-reservoir"], e34: ["e34bay:washer-tank"], viewpoint: "top" },
  "washer-rear": { label: "Rear washer reservoir", e34Only: true },
  "battery-front": { label: "Engine-bay battery", e34Only: true },
  "battery-rear": { label: "Battery", e34: ["e34sys:rear-seat-battery"], viewpoint: "top" },
  tires: { label: "Tire pressure check", e30: ["front-left","front-right","rear-left","rear-right"].map(corner=>"e30assembly:"+corner+":wheel"), e34: ["front-left","front-right","rear-left","rear-right"].map(corner=>"wheel:"+corner) },
  gearbox: { label: "Transmission fluid service", e30: ["e30assembly:gearbox:main-case","e30assembly:gearbox:filler-plug","e30assembly:gearbox:drain-plug"], e34: ["e34auto:case","e34auto:pan-main"], viewpoint: "underbody" },
  differential: { label: "Rear differential", e30: ["e30assembly:rear-final-drive:case"], e34: ["e34sys:differential-case"], viewpoint: "underbody" },
  "center-support": { label: "Driveshaft center support", e30: ["e30assembly:propeller:center-mount"], viewpoint: "underbody" },
  front: { label: "Front fuse and relay box", e30: [bay+"fuse-box"], e34: ["e34sys:front-fuse-relay-box"], viewpoint: "top" },
  rear: { label: "Rear fuse panel", e34Only: true, viewpoint: "top" },
  auxiliary: { label: "Auxiliary relay box", e34Only: true, viewpoint: "top" },
  electronics: { label: "Electronics box", e34: ["e34sys:electronics-box"], e34Only: true, viewpoint: "top" },
} satisfies Record<string, Topic>;

type TopicId = keyof typeof topics;
export function quickReferenceModelTopics(series: Series) {
  return (Object.entries(topics) as [TopicId, Topic][])
    .filter(([,topic])=>series==="e34"||!topic.e34Only)
    .map(([id,topic])=>({id,label:topic.label}));
}

export function quickReferenceModelTopic(value: string, series: Series) {
  const match = /^(front|rear|auxiliary)-fuse-([1-9][0-9]?)$/.exec(value);
  const id = (match?.[1] ?? value) as TopicId;
  if (!Object.hasOwn(topics,id)) return null;
  const topic: Topic = topics[id];
  if (topic.e34Only && series==="e30") return null;
  const fuse = match ? Number(match[2]) : undefined;
  const fluidSections:Partial<Record<TopicId,string>> = {
    "oil-change":"engine-oil",coolant:"cooling-system",brake:"brake-fluid",steering:"steering-fluid",
    washer:"washer-fluid",gearbox:"transmission-fluid",differential:"differential-fluid",
  };
  const fluid=fluidSections[id];
  const panel=["front","rear","auxiliary","electronics"].includes(id);
  const lookup = panel
    ? {href:"/quick-reference/fuses?"+new URLSearchParams({panel:id,...(fuse?{fuse:String(fuse)}:{})}),label:"Fuse diagram"}
    : fluid ? {href:"/quick-reference/fluids#"+fluid,label:"Fluid specifications"}
    : {href:"/quick-reference/locations?"+new URLSearchParams({point:id}),label:"Component location"};
  return { id, topic, fuse, lookup, label: fuse ? `F${fuse} · ${topic.label}` : topic.label };
}

export function quickReferenceModelHref(focus: string) {
  return "/quick-reference/model?" + new URLSearchParams({focus});
}

export function quickReferenceHighlights(model: ReferenceModel, value: string) {
  const series = model.id.startsWith("e30-") ? "e30" : "e34";
  const selection = quickReferenceModelTopic(value,series);
  if (!selection) return null;
  const {id,topic,fuse,label}=selection;
  const ids = new Set(topic[series]);
  const fuseId = bay+"fuse-"+fuse;
  const hasFuse = series==="e30" && id==="front" && !!fuse && model.nodes.some(node=>node.id===fuseId&&node.assetId);
  if (hasFuse) {
    ids.delete(bay+"fuse-box");
    ids.add(fuseId);
  }
  const parts=model.nodes.filter(node=>{
    if (!node.assetId) return false;
    if (ids.has(node.id)) return true;
    if (series==="e34" && id==="oil") return /^(?:m50|m60b30|m60b40|m30b35):oil-filler-cap$/.test(node.id);
    if (series==="e34" && id==="oil-change") return /^(?:m50|m60b30|m60b40|m30b35):(?:oil-filler-cap|oil-drain-plug|oil-filter(?:-housing|-cap|-element)?|dipstick)$/.test(node.id);
    if (series==="e34" && id==="gearbox") return /^(?:getrag|zf)-[^:]+:(?:case|main-case|filler-plug|drain-plug|pan)$/.test(node.id);
    return false;
  });
  const note = !parts.length ? "This part isn’t modeled on the selected car." :
    fuse && !hasFuse ? `The model shows the box. Use the fuse diagram to find F${fuse}.` :
    id==="oil-change" && !parts.some(node=>node.id.includes("oil-drain-plug")) ? "See the service manual for the drain plug and dipstick locations." :
    id==="oil-change" && !parts.some(node=>node.id.includes("dipstick")) ? "See the service manual for the dipstick location." : "";
  return {parts,label,note,viewpoint:topic.viewpoint ?? "overview" as Viewpoint};
}
