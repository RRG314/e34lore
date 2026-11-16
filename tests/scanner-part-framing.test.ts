import {describe,it,expect}from'vitest';
import{partFrame,padPartPixels}from'../src/scanner/part-framing';
describe('whole-part recognition framing',()=>{
 it('retains the full landscape and portrait extent, with at most one pixel of centering asymmetry',()=>{
  for(const [w,h]of [[1600,400],[400,1600],[643,481],[1,1600],[80,80]]){
   const f=partFrame(w,h);expect(f.left).toBeGreaterThanOrEqual(0);expect(f.top).toBeGreaterThanOrEqual(0);expect(f.width+f.left).toBeLessThanOrEqual(f.size);expect(f.height+f.top).toBeLessThanOrEqual(f.size);expect(Math.abs(f.size-f.width-2*f.left)).toBeLessThanOrEqual(1);expect(Math.abs(f.size-f.height-2*f.top)).toBeLessThanOrEqual(1);expect(Math.abs(f.width/w-f.height/h)).toBeLessThanOrEqual(1/Math.min(w,h));
  }
 });
 it('preserves both far mounting edges instead of cutting them out',()=>{
  const pixels=new Uint8Array(8*4*3).fill(220);pixels.set([255,0,0],0);pixels.set([0,0,255],(8*4-1)*3);
  const result=padPartPixels(pixels,8,4,3,8,0,2);
  expect([...result.slice(2*8*3,2*8*3+3)]).toEqual([255,0,0]);expect([...result.slice((5*8+7)*3,(5*8+7)*3+3)]).toEqual([0,0,255]);expect(result.slice(0,3)).toEqual(new Uint8ClampedArray([220,220,220]));
 });
 it('composites transparency and rejects corrupt or oversized inputs',()=>{
  expect([...padPartPixels(new Uint8Array([10,20,30,0]),1,1,4,1,0,0)]).toEqual([238,238,238]);
  expect(()=>partFrame(10000,10000)).toThrow();expect(()=>partFrame(NaN,100)).toThrow();expect(()=>padPartPixels(new Uint8Array(2),1,1,3,1,0,0)).toThrow();
 });
});
