import {describe,it,expect} from 'vitest';
import {familyFromEvidence,scanObservationEvidence} from '../src/scanner/observation-evidence';
describe('existing private garage observation contract',()=>{
 it('saves a family without inventing a marking or unsupported backend fields',()=>{
  const value=scanObservationEvidence({familyId:'center-support-bearing',method:'owner-selected-visual-candidate',timings:{retrieve:200},views:2});
  expect(Object.keys(value).sort()).toEqual(['candidate_nodes','geometry_status','markings','method','models','timings']);
  expect(value.markings).toEqual([]);expect(familyFromEvidence(value)).toBe('center-support-bearing');expect(value).not.toHaveProperty('family_comparison');
 });
 it('ignores unknown candidate identifiers and rejects malformed evidence',()=>{
  expect(familyFromEvidence({candidate_nodes:['family:invented','m50:water-pump']})).toBeUndefined();
  expect(familyFromEvidence({candidate_nodes:'family:center-support-bearing'})).toBeUndefined();
  expect(()=>scanObservationEvidence({familyId:'invented',method:'candidate',timings:{},views:1})).toThrow();
  expect(()=>scanObservationEvidence({number:'123',method:'marking',timings:{},views:1})).toThrow();
 });
});
