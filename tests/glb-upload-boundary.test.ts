import {it,expect} from 'vitest';
import {inspectGLB} from '../src/digital-twin/assets/glb';
function glb(json:unknown){const text=JSON.stringify(json),padded=text+' '.repeat((4-text.length%4)%4),buffer=new ArrayBuffer(padded.length+20),view=new DataView(buffer);view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,buffer.byteLength,true);view.setUint32(12,padded.length,true);view.setUint32(16,0x4e4f534a,true);new Uint8Array(buffer,20).set(new TextEncoder().encode(padded));return buffer;}
const model={asset:{version:'2.0'},meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{count:600000}],nodes:[{mesh:0}]};
it('rejects malformed resource arrays and primitive references without following any URI',()=>{
 expect(()=>inspectGLB(glb({asset:{version:'2.0'},images:{uri:'https://example.test/asset'}}))).toThrow(/structure/);
 expect(()=>inspectGLB(glb({...model,accessors:[]}))).toThrow(/missing accessor/);
 expect(()=>inspectGLB(glb({...model,nodes:[{mesh:8}]}))).toThrow(/missing mesh/);
 for(const uri of ['https://example.test/a.bin','data:application/octet-stream;base64,AA==','',{}])expect(()=>inspectGLB(glb({...model,buffers:[{uri}]}))).toThrow(/External/);
});
it('counts reused geometry instances and nontriangle draw modes against browser budgets',()=>{
 expect(inspectGLB(glb(model)).triangles).toBe(200000);
 expect(()=>inspectGLB(glb({...model,nodes:Array.from({length:6},()=>({mesh:0}))}))).toThrow(/one million/);
 expect(()=>inspectGLB(glb({...model,meshes:[{primitives:[{mode:0,attributes:{POSITION:0}}]}],nodes:Array.from({length:6},()=>({mesh:0}))}))).toThrow(/three million/);
});
