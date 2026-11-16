import{afterEach,describe,it,expect,vi}from'vitest';
const mocks=vi.hoisted(()=>({createWorker:vi.fn()}));
vi.mock('tesseract.js',()=>({createWorker:mocks.createWorker,PSM:{SPARSE_TEXT:11}}));
import{readPhotoText}from'../src/scanner/inference';
afterEach(()=>vi.resetAllMocks());
describe('photo text runtime',()=>{
 it('uses one sequential worker for three views and always releases it',async()=>{
  const worker={setParameters:vi.fn(),recognize:vi.fn(async()=>({data:{text:'BMW\n26 12 1 226 657',confidence:82}})),terminate:vi.fn()};mocks.createWorker.mockResolvedValue(worker);
  const result=await readPhotoText(['a','b','c'].map(photoId=>({photoId,blob:new Blob(['photo'])})),()=>{});
  expect(mocks.createWorker).toHaveBeenCalledTimes(1);expect(worker.recognize).toHaveBeenCalledTimes(3);expect(result.views.map(v=>v.photoId)).toEqual(['a','b','c']);expect(worker.terminate).toHaveBeenCalled();
 });
 it('cancels initialization that completes after a navigation or Stop scan',async()=>{
  let finish!:(w:unknown)=>void;const worker={terminate:vi.fn(),setParameters:vi.fn(),recognize:vi.fn()};mocks.createWorker.mockImplementation(()=>new Promise(resolve=>{finish=resolve}));
  const controller=new AbortController();const pending=readPhotoText([{photoId:'a',blob:new Blob(['photo'])}],()=>{},controller.signal);const rejected=expect(pending).rejects.toThrow('stopped');
  await vi.waitFor(()=>expect(mocks.createWorker).toHaveBeenCalled());controller.abort();finish(worker);await rejected;expect(worker.recognize).not.toHaveBeenCalled();expect(worker.terminate).toHaveBeenCalled();
 });
 it('releases a worker after an OCR failure without discarding the source blobs',async()=>{
  const worker={setParameters:vi.fn(),recognize:vi.fn(async()=>{throw Error('OCR failed')}),terminate:vi.fn()};mocks.createWorker.mockResolvedValue(worker);
  const photos=[{photoId:'a',blob:new Blob(['photo'])}];await expect(readPhotoText(photos,()=>{})).rejects.toThrow('OCR failed');expect(photos[0].blob.size).toBe(5);expect(worker.terminate).toHaveBeenCalled();
 });
});
