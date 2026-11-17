"use client";
import {db} from '../lib/supabase';
import {withTimeout} from '../lib/account-actions';
import backend, { demoBackend } from '../lib/backend';
export class SupportRequestError extends Error { constructor(message:string,public status=0,public field=''){super(message);} }
const actions=new Set(['ready','challenge','contact','health','reply','status','retry','attachment','purge','delivery-check','activate']);
export async function supportRequest(action:string,payload?:unknown,options:{staff?:boolean;member?:boolean;signal?:AbortSignal;file?:boolean}={}){
 if(!actions.has(action))throw Error('Unknown support action');
 if(demoBackend){
  if(action==='ready')return {available:false};
  throw new SupportRequestError('Support needs a configured backend.',503);
 }
 let token='';if(options.staff||options.member){try{const result=await withTimeout(db.auth.getSession(),4000,'Sign-in is taking too long. Please try again.');token=result.data.session?.access_token||'';}catch(error){if(options.staff)throw error;}}
 if(options.staff&&!token)throw new SupportRequestError('Sign in with your administrator account.',401);
 const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000);
 let response:Response;
 try{response=await fetch(backend.url+'/functions/v1/support/'+action,{method:payload===undefined?'GET':'POST',headers:{apikey:backend.publishableKey,...(token?{Authorization:'Bearer '+token}:{}),...(payload===undefined?{}:{'Content-Type':'application/json'})},...(payload===undefined?{}:{body:JSON.stringify(payload)}),signal,credentials:'omit'});}catch{throw new SupportRequestError('Support could not connect. Your message has not been confirmed. Please try again.');}
 if(options.file&&response.ok)return response.blob();
 let data:{error?:unknown;field?:unknown;[key:string]:unknown}={};try{data=await response.json();}catch{}
 if(!response.ok)throw new SupportRequestError(typeof data.error==='string'?data.error:response.status===404?'Support is not connected yet. Please try again later.':'Support could not complete this request. Please try again.',response.status,typeof data.field==='string'?data.field:'');
 return data;
}
export async function supportRpc(name:string,args:Record<string,unknown>={},signal?:AbortSignal){
 const result=await db.rpc(name,args).abortSignal(signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000));
 if(result.error)throw Object.assign(new Error(result.error.code==='PGRST202'?'The support inbox is not connected yet.':result.error.message),{code:result.error.code});return result.data;
}
export async function downloadSupportAttachment(id:string,filename:string){
 const blob=await supportRequest('attachment',{attachment:id},{staff:true,file:true}) as Blob;
 const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
}
