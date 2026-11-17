import { releasePublic } from './release-content';
import {beforeAll,describe,expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Box3,Vector3,Matrix4,Quaternion} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import accepted from '../data/digital-twin/525i-automatic-reference.json';
import localCandidate from '../src/digital-twin/public/local-reference-candidate';
import {parseReference,enclosingParts} from '../src/digital-twin/public/model';
import {findCatalogNode,catalogProcedures} from '../src/digital-twin/public/catalog';
import {referenceRelease} from '../src/digital-twin/public/load-reference';

const root='work/scanner-model-tests/525i-service-candidate',digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const acceptedBefore=readFileSync(releasePublic +accepted.manifestUrl);
beforeAll(()=>{execFileSync(process.execPath,['tools/build-525i-service-candidate.mjs',root],{stdio:'pipe'});});
describe('local 525i service-detail candidate',()=>{
 it('preserves the accepted model and every accepted GLB while binding the exact element occurrences',()=>{
  expect(digest(readFileSync(releasePublic +accepted.manifestUrl))).toBe(digest(acceptedBefore));
  const review=JSON.parse(readFileSync(root+'/review.json','utf8'));
  for(const asset of review.base.assets)expect(digest(readFileSync(releasePublic +asset.url))).toBe(asset.sha256);
  const model=parseReference(JSON.parse(readFileSync(root+'/'+review.files.find((f:{type:string})=>f.type==='application/json').file,'utf8')));
  for(const number of ['13721726916','13721730918'])expect(findCatalogNode(model,'bmw-'+number)?.id).toBe('e34sys:air-filter-element');
  const binding=model.catalog!.bindings['e34sys:air-filter-element'];
  expect([...enclosingParts(model,binding.nodeId)]).toContain('e34sys:airbox');
  expect(enclosingParts(model,'e34sys:airbox').size).toBe(0);
  for(const position of binding.positions){
   expect(findCatalogNode(model,position.partId,position.id)?.id).toBe(binding.nodeId);
   const service=catalogProcedures(position.partId,position.id,position.assemblyId,position.number,model.catalog);
   expect(service.guides).toContain('engine-air-filter-replacement');expect(service.nodes[0]).toBe(binding.nodeId);
  }
  expect(findCatalogNode(model,'bmw-13721730918','unrelated-position')).toBeNull();
 });
 it('checks the actual exported element size, without inheriting the housing display scale',async()=>{
  const review=JSON.parse(readFileSync(root+'/review.json','utf8')),asset=review.files.find((f:{type:string})=>f.type==='model/gltf-binary'),bytes=readFileSync(root+'/'+asset.file);
  const loaded=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const size=new Box3().setFromObject(loaded.scene).getSize(new Vector3()).multiplyScalar(1000).toArray();
  size.forEach((n,i)=>expect(n).toBeCloseTo([325,57,150][i],2));
  const model=parseReference(JSON.parse(readFileSync(root+'/'+review.files.find((f:{type:string})=>f.type==='application/json').file,'utf8')));
  const scale=new Vector3();new Matrix4().fromArray(model.nodes.find(n=>n.id==='e34sys:air-filter-element')!.matrix).decompose(new Vector3(),new Quaternion(),scale);
  expect(scale.toArray()).toEqual([1,1,1]);expect(review.dimensionsVerifiedComponents).toBe(0);
  loaded.scene.traverse(o=>{if('geometry'in o)(o.geometry as {dispose:()=>void}).dispose();});
 });
 it('keeps the candidate unavailable in the production reference registry and preserves saved revision 23',()=>{
  expect(localCandidate).toBeNull();expect(referenceRelease(1001,accepted.id)).toBeNull();
  expect(referenceRelease(accepted.revision,accepted.id)).toEqual(accepted);
 });
});
