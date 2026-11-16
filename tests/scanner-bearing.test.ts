import {describe,it,expect,vi,afterEach} from 'vitest';
import vectors from '../src/scanner/family-vectors.json';
import {componentFamilies} from '../src/scanner/families';
import {compareFamilies,comparisonImages,distinctPhotoBlobs,familyVectorsSchema} from '../src/scanner/family-comparison';
import {parseBearingInspection,inspectionCheckIds} from '../src/repair/bearing-inspection';
import {LocalInference} from '../src/scanner/inference';
import {featuresFor,heldRoute} from '../src/release/features';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()});
const vector=(id:string)=>vectors.records.find(r=>r.id===id)!.embedding;
describe('number-free family comparison boundaries',()=>{
 it('covers the bearing and plausible confusables without a vehicle or expected-answer parameter',()=>{
  expect(familyVectorsSchema.parse(vectors).records).toHaveLength(componentFamilies.length);
  for(const id of ['center-support-bearing','ball-bearing','flex-disc','engine-mount','wheel-hub','packaging','unusable'])expect(vectors.records.some(r=>r.id===id)).toBe(true);
  const result=compareFamilies([vector('center-support-bearing')],vectors);
  expect(result.candidates[0].id).toBe('center-support-bearing');
  expect(result.accepted).toBe(false);expect(result).not.toHaveProperty('partNumber');
 });
 it('abstains on competing views instead of letting averaging hide disagreement',()=>{
  const result=compareFamilies([vector('center-support-bearing'),vector('flex-disc')],vectors);
  expect(result.status).toBe('inconclusive');expect(result.reason).toContain('disagree');expect(result.accepted).toBe(false);
 });
 it('abstains when packaging or a nonpart leads even though a part is always in the ranked list',()=>{
  for(const id of ['packaging','household','tools','unusable']){
   const result=compareFamilies([vector(id)],vectors);expect(result.status).toBe('inconclusive');expect(result.reason).toContain('non-part');
  }
 });
 it('rejects corrupt, incomplete, zero or wrong-revision embeddings',()=>{
  expect(()=>compareFamilies([Array(512).fill(0)],vectors)).toThrow();
  expect(()=>compareFamilies([Array(512).fill(NaN)],vectors)).toThrow();
  expect(()=>compareFamilies([Array(511).fill(1)],vectors)).toThrow();
  expect(()=>compareFamilies([],vectors)).toThrow();
  expect(()=>compareFamilies(Array(4).fill(vector('center-support-bearing')),vectors)).toThrow();
  const duplicate=structuredClone(vectors);duplicate.records[1]=duplicate.records[0];expect(()=>familyVectorsSchema.parse(duplicate)).toThrow();
  expect(()=>familyVectorsSchema.parse({...vectors,model:{...vectors.model,revision:'main'}})).toThrow();
 });
 it('never counts the active photo twice and limits inference to three views',()=>{
  const a={blob:new Blob(['a'])},b={blob:new Blob(['b'])},c={blob:new Blob(['c'])},d={blob:new Blob(['d'])};
  expect(comparisonImages(a,[a,b,c,d])).toEqual([a,b,c]);
 });
 it('counts identical reuploads once without requiring secure-context crypto',async()=>{
  const first=new Blob(['same-photo']),copy=new Blob(['same-photo']),other=new Blob(['other-photo']);
  expect(await distinctPhotoBlobs([first,copy,other])).toEqual([first,other]);
 });
 it('keeps inspection checks scoped to known stages without claiming repair completion',()=>{
  expect(parseBearingInspection({checks:[inspectionCheckIds()[0],inspectionCheckIds()[0]],notes:'Rubber torn'})).toEqual({checks:[inspectionCheckIds()[0]],notes:'Rubber torn'});
  expect(()=>parseBearingInspection({checks:['repair-complete'],notes:''})).toThrow();
  expect(()=>parseBearingInspection({checks:[],notes:'x'.repeat(3001)})).toThrow();
 });
 it('releases photo comparison and the written bearing reference while holding other experiments',()=>{
  expect(featuresFor('development').scanner).toBe(true);
  for(const route of [['scanner'],['scanner','credits']])expect(heldRoute(route,'production')).toBe(false);
  expect(heldRoute(['workshop','repair'],'production','center-support-bearing')).toBe(false);
  expect(heldRoute(['workshop','repair'],'production')).toBe(true);
  expect(featuresFor('production').scannerExperiments).toBe(false);
  expect(featuresFor('production').interactiveRepairs).toBe(false);
 });
});
describe('disposable local recognition workers',()=>{
 it('ignores queued messages and errors from a stopped worker without orphaning a new scan',async()=>{
  const workers:FakeWorker[]=[];
  class FakeWorker {
   onerror:((event:{message:string})=>void)|null=null;
   onmessage:((event:{data:{id:number;type:string;ms?:number}})=>void)|null=null;
   terminate=vi.fn();message:{id:number}|null=null;
   constructor(){workers.push(this)}
   postMessage(value:{id:number}){this.message=value}
  }
  vi.stubGlobal('Worker',FakeWorker);
  const runtime=new LocalInference(),first=runtime.run('compare',new Blob(['a']),()=>{});
  const rejected=expect(first).rejects.toThrow('stopped'),lateMessage=workers[0].onmessage!,lateError=workers[0].onerror!;
  const second=runtime.run('compare',new Blob(['b']),()=>{});
  await rejected;
  lateMessage({data:{id:workers[0].message!.id,type:'result',ms:1}});lateError({message:'old failure'});
  expect(workers[1].terminate).not.toHaveBeenCalled();
  workers[1].onmessage!({data:{id:workers[1].message!.id+100,type:'result'}});
  expect(workers[1].terminate).not.toHaveBeenCalled();
  const cancelled=expect(second).rejects.toThrow('stopped');runtime.stop();await cancelled;
  expect(workers[1].terminate).toHaveBeenCalledOnce();
 });
 it('sends all real views in one worker and cancels the entire batch',async()=>{
  const messages:unknown[]=[],terminate=vi.fn();
  class FakeWorker {onerror=null;onmessage=null;postMessage(value:unknown){messages.push(value)}terminate=terminate;}
  vi.stubGlobal('Worker',FakeWorker);
  const runtime=new LocalInference(),a=new Blob(['front']),b=new Blob(['side']);
  const pending=runtime.run('compare',a,()=>{},[],[b]);
  expect(messages[0]).toMatchObject({action:'compare',image:a,additionalImages:[b]});
  runtime.stop();await expect(pending).rejects.toThrow('stopped');expect(terminate).toHaveBeenCalledOnce();
 });
 it('terminates an unresponsive model rather than leaving inference running',async()=>{
  vi.useFakeTimers();const terminate=vi.fn();
  class FakeWorker {onerror=null;onmessage=null;postMessage(){}terminate=terminate;}
  vi.stubGlobal('Worker',FakeWorker);
  const pending=new LocalInference().run('compare',new Blob(),()=>{});
  const assertion=expect(pending).rejects.toThrow('took too long');
  await vi.advanceTimersByTimeAsync(120000);await assertion;expect(terminate).toHaveBeenCalledOnce();
 });
});
