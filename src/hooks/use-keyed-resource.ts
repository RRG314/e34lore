'use client';
import {useEffect,useEffectEvent,useState} from 'react';

/** A response is visible only for the inputs that produced it. Requests are
 * aborted when that scope changes; retry never erases persisted member data. */
export function useKeyedResource<T>(key:string,load:(signal:AbortSignal)=>Promise<T>,options:{enabled?:boolean;delayMs?:number;failureMessage:string;timeoutMs?:number}){
 const {enabled=true,delayMs=0,timeoutMs=12000,failureMessage}=options;
 const [revision,setRevision]=useState(0),[response,setResponse]=useState<{key:string;data:T|null;error:string}|null>(null);
 const requestKey=JSON.stringify([key,revision]);
 const runLoad=useEffectEvent(load);
 useEffect(()=>{
  if(!enabled)return;
  let active=true;const controller=new AbortController();let deadline:ReturnType<typeof setTimeout>|undefined,debounce:ReturnType<typeof setTimeout>|undefined;
  async function run(){
   deadline=setTimeout(()=>{controller.abort();if(active)setResponse({key:requestKey,data:null,error:failureMessage});},timeoutMs);
   try{const data=await runLoad(controller.signal);if(active&&!controller.signal.aborted)setResponse({key:requestKey,data,error:''});}
   catch{if(active&&!controller.signal.aborted)setResponse({key:requestKey,data:null,error:failureMessage});}
   finally{clearTimeout(deadline);}
  }
  if(delayMs>0)debounce=setTimeout(()=>void run(),delayMs);else void run();
  return()=>{active=false;clearTimeout(deadline);clearTimeout(debounce);controller.abort();};
 },[requestKey,enabled,delayMs,timeoutMs,failureMessage]);
 const current=response?.key===requestKey?response:null;
 return {data:enabled?current?.data??null:null,error:enabled?current?.error||'':'',loading:enabled&&!current,retry:()=>setRevision(n=>n+1)};
}
