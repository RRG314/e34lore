import{describe,it,expect}from'vitest';
import{partMedia,partMediaSchema,mediaForNumber,mediaForFamily}from'../src/servicing/part-media';
import{readFileSync}from'node:fs';
import{createHash}from'node:crypto';
describe('shared part image evidence',()=>{
 it('never assigns a category photograph to an exact BMW identity',()=>{
  expect(mediaForNumber('26121226657').filter(r=>r.kind==='source-page').map(r=>r.id)).toEqual(['source:bearing-genuine-bw']);
  expect(mediaForNumber('26121226657').every(r=>r.scope==='number')).toBe(true);
  expect(mediaForNumber('26121225002').every(r=>r.scope==='number'&&r.numbers.includes('26121225002'))).toBe(true);expect(mediaForNumber('226657')).toEqual([]);
  expect(mediaForFamily('alternator').every(r=>r.scope==='family'&&r.numbers.length===0)).toBe(true);
 });
 it('validates locally retained licensed photos and rejects unsafe or unlicensed additions',()=>{
  for(const r of partMedia.records)if(r.kind==='photograph')expect(createHash('sha256').update(readFileSync('public'+r.image)).digest('hex')).toBe(r.sha256);
  const row=partMedia.records.find(r=>r.kind==='photograph')!;
  expect(partMediaSchema.safeParse({schema:1,records:[{...row,source:'javascript:alert(1)'}]}).success).toBe(false);
  expect(partMediaSchema.safeParse({schema:1,records:[{...row,scope:'number'}]}).success).toBe(false);
  expect(partMediaSchema.safeParse({schema:1,records:[{...row,rights:{status:'unreviewed'}}]}).success).toBe(false);
 });
});
