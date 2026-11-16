import {describe,it,expect,vi} from 'vitest';
import jpeg from 'jpeg-js';
import {scannerMedia} from '../supabase/functions/scanner-media/core.mjs';
const owner='ed340000-0000-4000-8000-000000000901', observation='ed340000-0000-4000-8000-000000000902', photoId='ed340000-0000-4000-8000-000000000903';
const token='x.'+Buffer.from(JSON.stringify({sub:owner,session_id:observation})).toString('base64url')+'.x';
const original=()=>jpeg.encode({width:4,height:3,data:Buffer.alloc(4*3*4,220),comments:['GPS-PRIVATE']},85).data;
function request(bytes:Uint8Array=original(),view?:string) {const f=new FormData(); f.set('photo',new Blob([new Uint8Array(bytes)],{type:'image/jpeg'}),'part.jpg');f.set('observation',observation);f.set('client_key','front');f.set('share_reference','true');f.set('consent_revision','part-reference-v1');if(view)f.set('view',view);return new Request('https://test/photo',{method:'POST',headers:{authorization:'Bearer '+token},body:f});}
function setup(){
 const reservation={id:photoId,object_path:owner+'/'+photoId+'.jpg',state:'processing',sha256:null};
 const deletion={eq:vi.fn(),then:(resolve:(value:{error:null})=>unknown)=>Promise.resolve(resolve({error:null}))};deletion.eq.mockReturnValue(deletion);
 const upload=vi.fn<(path:string,bytes:Uint8Array,options:Record<string,unknown>)=>Promise<{error:null}>>(async()=>({error:null})),remove=vi.fn(async()=>({error:null}));
 const rpc=vi.fn(async(name:string)=>({data:name==='security_session_active'?true:name==='car_media_cleanup_paths'?[]:null,error:null}));
 const reserve=vi.fn(async()=>({data:reservation,error:null}));
 const admin={auth:{getUser:vi.fn(async()=>({data:{user:{id:owner,email_confirmed_at:'2026-01-01',is_anonymous:false}},error:null}))},rpc,from:vi.fn(()=>({delete:()=>deletion})),storage:{from:vi.fn(()=>({upload,remove}))}};
 return {admin,userClient:vi.fn(()=>({rpc:reserve})),codec:jpeg,origins:['https://e34lore.com'],reservation,reserve,upload,remove};
}
describe('confirmed scanner photo service',()=>{
 it('stores a reviewed angle label and rejects values outside the photo-view list',async()=>{
   const valid=setup();
   expect((await scannerMedia(request(original(),'front'),valid)).status).toBe(201);
   expect(valid.reserve).toHaveBeenCalledWith('reserve_observation_photo',expect.objectContaining({photo_view:'front'}));
   const invalid=setup();
   expect((await scannerMedia(request(original(),'guess'),invalid)).status).toBe(400);
   expect(invalid.reserve).not.toHaveBeenCalled();
 });
 it('rejects untrusted origins and unsigned requests before identity/storage access',async()=>{const d=setup();expect((await scannerMedia(new Request('https://test',{method:'POST'}),d)).status).toBe(401);expect((await scannerMedia(new Request('https://test',{method:'POST',headers:{origin:'https://evil.test'}}),d)).status).toBe(403);expect(d.admin.auth.getUser).not.toHaveBeenCalled();});
 it('rejects guest accounts and revoked sessions before cleanup or upload',async()=>{const d=setup();d.admin.auth.getUser.mockResolvedValueOnce({data:{user:{id:owner,email_confirmed_at:'2026-01-01',is_anonymous:true}},error:null});expect((await scannerMedia(request(),d)).status).toBe(403);d.admin.rpc.mockResolvedValueOnce({data:false,error:null});expect((await scannerMedia(request(),d)).status).toBe(401);expect(d.reserve).not.toHaveBeenCalled();expect(d.upload).not.toHaveBeenCalled();});
 it('bounds unknown-length multipart bodies before parsing',async()=>{const d=setup();const r=await scannerMedia(new Request('https://test',{method:'POST',headers:{authorization:'Bearer '+token,'Content-Type':'multipart/form-data; boundary=test'},body:new Uint8Array(2*1024*1024+16385)}),d);expect(r.status).toBe(413);expect(d.reserve).not.toHaveBeenCalled();});
 it('checks ownership, confirmation and quotas before decoding',async()=>{const d=setup();d.reserve.mockResolvedValueOnce({data:null,error:{message:'Photo limit reached'}} as never);const codec={decode:vi.fn(),encode:vi.fn()};expect((await scannerMedia(request(),{...d,codec})).status).toBe(400);expect(codec.decode).not.toHaveBeenCalled();expect(d.upload).not.toHaveBeenCalled();});
 it('stores decoded pixels without comments or appended payloads and completes only afterward',async()=>{const d=setup();expect((await scannerMedia(request(Buffer.concat([original(),Buffer.from('GPS-PRIVATE-APPEND')])),d)).status).toBe(201);const bytes=d.upload.mock.calls[0][1] as Uint8Array;expect(Buffer.from(bytes).toString()).not.toContain('GPS-PRIVATE');expect(jpeg.decode(bytes).width).toBe(4);expect(d.upload.mock.calls[0][2]).toMatchObject({upsert:false});expect(d.admin.rpc).toHaveBeenCalledWith('complete_observation_photo',expect.objectContaining({actor:owner,photo:photoId,content_hash:expect.stringMatching(/^[a-f0-9]{64}$/)}));});
 it('discards failed reservations and durably queues cleanup even if metadata was already deleted',async()=>{const d=setup();expect((await scannerMedia(request(new Uint8Array([255,216,0,0])),d)).status).toBe(422);expect(d.admin.from).toHaveBeenCalledWith('observation_photos');expect(d.admin.rpc).toHaveBeenCalledWith('queue_observation_photo_cleanup',{actor:owner,photo:photoId});expect(d.upload).not.toHaveBeenCalled();});
 it('never removes or replaces an existing ready photo on a bad retry',async()=>{const d=setup();d.reservation.state='ready';d.reservation.sha256='different' as never;expect((await scannerMedia(request(),d)).status).toBe(409);expect((await scannerMedia(request(new Uint8Array([255,216,0,0])),d)).status).toBe(422);expect(d.admin.from).not.toHaveBeenCalled();expect(d.upload).not.toHaveBeenCalled();});
 it('does not report success when storage upload fails',async()=>{const d=setup();d.upload.mockResolvedValueOnce({error:{message:'offline'}} as never);expect((await scannerMedia(request(),d)).status).toBe(503);expect(d.admin.rpc.mock.calls.some(c=>c[0]==='complete_observation_photo')).toBe(false);expect(d.admin.rpc).toHaveBeenCalledWith('queue_observation_photo_cleanup',expect.anything());});
});
