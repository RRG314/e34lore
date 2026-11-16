import {describe,it,expect}from'vitest';
import {assertPartitionSeparation,assertReferenceIndex,sourceKey}from'../tools/scanner/reference-integrity.mjs';
import sources from '../data/scanner/local-v2/sources.json';
import index from '../data/scanner/local-v2/reference-index.json';
import media from '../data/parts-media/manifest.json';
const reference={id:'reference',sha256:'a'.repeat(64),source:'https://example.org/front',objectGroup:'physical-mount-1',sourceGroup:'photographer:one'};
const evaluation={id:'query',sha256:'b'.repeat(64),sourceUrl:'https://example.net/side',objectGroup:'physical-mount-2',sourceGroup:'photographer:two'};
describe('reference / evaluation separation',()=>{
 it('rejects a reencoded source page or another view of the same physical object across partitions',()=>{
  expect(()=>assertPartitionSeparation([reference],[{...evaluation,sha256:reference.sha256}])).toThrow('leakage');
  expect(()=>assertPartitionSeparation([reference],[{...evaluation,sourceUrl:reference.source+'?utm_source=test#view'}])).toThrow('leakage');
  expect(()=>assertPartitionSeparation([reference],[{...evaluation,objectGroup:reference.objectGroup}])).toThrow('leakage');
  expect(sourceKey('https://commons.wikimedia.org/wiki/File:A%20part.jpg?utm_source=x')).toBe(sourceKey('https://commons.wikimedia.org/wiki/File:A_part.jpg'));
  expect(sourceKey('https://example.org/media.nl?id=1')).not.toBe(sourceKey('https://example.org/media.nl?id=2'));
 });
 it('binds each runtime prototype back to its current source, family, byte hash and shared media evidence',()=>{
  expect(()=>assertReferenceIndex(index,sources,media)).not.toThrow();
  const changed=structuredClone(index);changed.records[0].family='alternator';
  expect(()=>assertReferenceIndex(changed,sources,media)).toThrow('reference evidence');
  changed.records[0]=index.records[0];changed.records.pop();
  expect(()=>assertReferenceIndex(changed,sources,media)).toThrow('stale');
 });
 it('permits multiple reference views of one object while keeping same-provider holdouts and unknown identity explicit',()=>{
  const report=assertPartitionSeparation([reference,{...reference,id:'rear',sha256:'c'.repeat(64),source:'https://example.org/rear'}],[{...evaluation,objectGroup:null,sourceGroup:reference.sourceGroup}]);
  expect(report.sourceOverlap).toHaveLength(2);expect(report.unknownObjectIdentity).toEqual(['query']);expect(report.independentAccuracyEstablished).toBe(false);
 });
});
