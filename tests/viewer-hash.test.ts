import {afterEach,describe,expect,it,vi} from 'vitest';
import {createHash,webcrypto} from 'node:crypto';
import {sha256Hex} from '../src/graphics/sha256';
afterEach(()=>vi.unstubAllGlobals());
describe('pinned viewer integrity on HTTPS and private LAN HTTP',()=>{
 it('retains the exact SHA-256 digest when SubtleCrypto is unavailable',async()=>{
  const input=new TextEncoder().encode('abc').buffer;
  vi.stubGlobal('crypto',{});
  expect(await sha256Hex(input)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  expect(await sha256Hex(new ArrayBuffer(0))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
 });
 it('matches the native digest for model-size buffers and still detects a changed byte',async()=>{
  const data=Uint8Array.from({length:1024*1024},(_,i)=>i%251),expected=createHash('sha256').update(data).digest('hex');
  vi.stubGlobal('crypto',webcrypto);expect(await sha256Hex(data.buffer)).toBe(expected);
  vi.stubGlobal('crypto',{});expect(await sha256Hex(data.buffer)).toBe(expected);
  data[500]^=1;expect(await sha256Hex(data.buffer)).not.toBe(expected);
 });
});
