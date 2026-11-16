import {boundedBytes} from './security.mjs';
export class ProviderError extends Error {constructor(status,retry=60){super('Email provider request failed');this.status=status;this.retry=retry;}}
export function resendProvider(key,fetcher=fetch){
 async function api(path,options={}){
  const response=await fetcher('https://api.resend.com'+path,{...options,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!response.ok)throw new ProviderError(response.status,Number(response.headers.get('retry-after'))||60);
  return JSON.parse(new TextDecoder().decode(await boundedBytes(response,2097152)));
 }
 return {send:(payload,idempotencyKey)=>api('/emails',{method:'POST',headers:{'Idempotency-Key':idempotencyKey},body:JSON.stringify(payload)}),received:id=>api('/emails/receiving/'+id+'?html_format=cid'),sent:id=>api('/emails/'+id),attachment:(emailId,id)=>api('/emails/receiving/'+emailId+'/attachments/'+id),
  async download(url){const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.hostname!=='inbound-cdn.resend.com'||parsed.username||parsed.password||parsed.port)throw new Error('Attachment host is not allowed');const response=await fetcher(url,{signal:AbortSignal.timeout(10000),redirect:'error'});if(!response.ok)throw new ProviderError(response.status);return boundedBytes(response,5242880);}
 };
}
