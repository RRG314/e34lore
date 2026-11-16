import {SupportInputError} from '../_shared/support-contract.mjs';
import {boundedBody} from '../_shared/request.mjs';
const bytes=value=>new TextEncoder().encode(value);
const hex=data=>Array.from(new Uint8Array(data),n=>n.toString(16).padStart(2,'0')).join('');
export async function fingerprint(secret,value){const key=await crypto.subtle.importKey('raw',bytes(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,bytes(value)));}
export async function digest(value){return hex(await crypto.subtle.digest('SHA-256',typeof value==='string'?bytes(value):value));}
export async function supportChallenge(secret,ip,now=Date.now()){
 const nonce=crypto.randomUUID(),issued=Math.floor(now/1000),signature=await fingerprint(secret,`contact:${issued}:${nonce}:${ip}`);
 return `${issued}.${nonce}.${signature}`;
}
export async function verifySupportChallenge(token,secret,ip,now=Date.now()){
 if(typeof token!=='string'||!/^\d{10}\.[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(token))return false;
 const [issued,nonce,signature]=token.split('.'),age=now/1000-Number(issued);if(age<2||age>900)return false;
 const expected=await fingerprint(secret,`contact:${issued}:${nonce}:${ip}`);let difference=expected.length^signature.length;for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^signature.charCodeAt(i);return difference===0;
}
export function boundedBytes(response,maximum=65536,timeoutMs=10000){return boundedBody(response,maximum,timeoutMs);}
export async function boundedJSON(request,maximum=65536){
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new SupportInputError('Send a JSON request.');
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await boundedBytes(request,maximum)));}
 catch(error){if(error instanceof TypeError)throw new SupportInputError('The request encoding is invalid.');throw error;}
}
export function requestAddress(request){return(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,100);}
