import {describe, expect, it} from "vitest";
import {centerSupportComparison, centerSupportShape} from "../src/scanner/center-support-shape";
import {currentPhotoComparison, emptyPhotoDraft, recordPhotoComparison} from "../src/scanner/photo-session";

function fixture(kind: "support" | "flex-disc" | "bare-bearing", tilt = 0) {
  const size = 176, data = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = (x - 88) * Math.cos(tilt) + (y - 88) * Math.sin(tilt);
    const py = -(x - 88) * Math.sin(tilt) + (y - 88) * Math.cos(tilt);
    const radial = Math.hypot(px,py+8);
    const ring = radial < 43 && radial > 22;
    const bracket = Math.abs(px) < 67 && py >= 15 && py < 42 && !(Math.abs(Math.abs(px)-53)<7 && Math.abs(py-29)<5);
    const flex = radial < 58 && radial > 22 && !Array.from({length:6},(_,i)=>i*Math.PI/3)
      .some(angle=>Math.hypot(px-44*Math.cos(angle),py+8-44*Math.sin(angle))<6);
    const solid = kind==="flex-disc" ? flex : ring || (kind==="support" && bracket);
    const i=(y*size+x)*3;
    data.fill(solid?48:250,i,i+3);
  }
  return {width:size,height:size,channels:3,data};
}

describe("numberless center support",()=>{
  it("looks for two mounting slots to one side of the larger bore",()=>{
    expect(centerSupportShape(fixture("support"))).toBe(true);
    expect(centerSupportShape(fixture("support",.8))).toBe(true);
    expect(centerSupportShape(fixture("flex-disc"))).toBe(false);
    expect(centerSupportShape(fixture("bare-bearing"))).toBe(false);
  });
  it("keeps a category proposal only when every photo passes the shape check",()=>{
    expect(centerSupportComparison([true,false])).toBeNull();
    const result=centerSupportComparison([true,true])!;
    expect(result).toMatchObject({status:"review",accepted:false,views:2,recognizer:"center-support-shape-v1"});
    expect(result.candidates.map(candidate=>candidate.id)).toEqual(["center-support-bearing"]);
    const draft=emptyPhotoDraft();
    expect(currentPhotoComparison(recordPhotoComparison(draft,result,5,draft.revision))).toEqual(result);
  });
});
