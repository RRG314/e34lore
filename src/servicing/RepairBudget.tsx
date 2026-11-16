"use client";
import {z} from "zod";
import {useEffect,useState,useRef} from 'react';
import {db,useApp} from '../components/context';
import {useOwnedCars} from '../vehicle/use-owned-cars';
import {budgetJournal,moneyInput,sumBudget,laborBudget,type BudgetLine} from './budget';
import type {ToolRequirement} from './service';
const draftSchema=z.object({values:z.record(z.string().max(150),z.string().max(12)).refine(v=>Object.keys(v).length<=250).default({}),currency:z.enum(['USD','EUR','GBP','CAD','AUD']).default('USD'),hours:z.string().max(6).default(''),rate:z.string().max(12).default('')});
export function RepairBudget({guideId,revision,title,tools}:{guideId:string;revision:string;title:string;tools:ToolRequirement[]}){
 const {user,toast}=useApp(),owned=useOwnedCars(),userId=user&&!user.is_anonymous?user.id:'';
 const key=[userId||'device',owned.activeId||'general',guideId,revision].join('.');
 const [record,setRecord]=useState<{key:string;values:Record<string,string>;owned:string[];currency:string;hours:string;rate:string}|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const current=record?.key===key?record:null,values=current?.values||{},toolInventory=current?.owned||[],currency=current?.currency||'USD',hours=current?.hours||'',rate=current?.rate||'';
 const scopeRef=useRef(key),saveAbort=useRef<AbortController|null>(null),saveIntent=useRef<{scope:string;fingerprint:string;id:string;at:string}|null>(null);
 const scope = key;
 useEffect(()=>{scopeRef.current=key;let draft:z.infer<typeof draftSchema>|undefined;try{const parsed=draftSchema.safeParse(JSON.parse(localStorage.getItem('e34.repair-budget.'+key)||'null'));if(parsed.success)draft=parsed.data;}catch{}const values=draft?.values||{};
 let toolInventory:string[]=[];try{const saved=JSON.parse(localStorage.getItem('e34.owned-tools.'+(userId||'device'))||'[]');if(Array.isArray(saved))toolInventory=saved.filter(v=>typeof v==='string'&&v.length<=150).slice(0,500);}catch{}
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Load an account/car/revision-scoped local draft; other-scope state is never rendered.
 setRecord({key,values,owned:toolInventory,currency:draft?.currency||'USD',hours:typeof draft?.hours==='string'?draft.hours.slice(0,6):'',rate:typeof draft?.rate==='string'?draft.rate.slice(0,12):''});setMessage('');setBusy(false);return()=>{scopeRef.current='';saveAbort.current?.abort();saveAbort.current=null;};},[key,userId]);
 function update(next:Partial<NonNullable<typeof record>>){const entry={key,values,owned:toolInventory,currency,hours,rate,...next};setRecord(entry);try{localStorage.setItem('e34.repair-budget.'+key,JSON.stringify(entry));localStorage.setItem('e34.owned-tools.'+(userId||'device'),JSON.stringify(entry.owned));}catch{setMessage('This browser could not save the local budget.');}}
 const names=[{id:'parts',name:'Replacement parts'},{id:'consumables',name:'Consumables'},{id:'fees',name:'Taxes, shipping and other costs'},...tools.filter(t=>!['consumable','reference'].includes(t.category)).map(t=>({id:'tool:'+t.id,name:t.name}))];
 let error='',lines:BudgetLine[]=[],total:ReturnType<typeof sumBudget>|null=null,labor:number|null=null;
 try{lines=names.map(line=>({...line,cents:moneyInput(values[line.id]||''),owned:line.id.startsWith('tool:')&&toolInventory.includes(line.id.slice(5))}));total=sumBudget(lines);labor=laborBudget(hours,rate);}catch(e){error=e instanceof Error?e.message:'Check the entered amounts.';}
 const amount=(n:number|null)=>n===null?'Not supplied':new Intl.NumberFormat(undefined,{style:'currency',currency}).format(n/100);
 return <details className="repair-budget"><summary>Plan expenses & save this job</summary><p>Enter your own budget or current quotes. Blank amounts stay unknown. Retailer prices and availability remain in the part’s retailer listings. Your tool inventory is saved on this device.</p>
 <label>Currency<select value={currency} onChange={e=>update({currency:e.target.value})}>{['USD','EUR','GBP','CAD','AUD'].map(c=><option key={c}>{c}</option>)}</select></label>
 <div className="budget-lines">{names.map(line=><div key={line.id}><label>{line.name}<input aria-label={'Budget for '+line.name} inputMode="decimal" placeholder="Not supplied" maxLength={12} value={values[line.id]||''} disabled={line.id.startsWith('tool:')&&toolInventory.includes(line.id.slice(5))} onChange={e=>update({values:{...values,[line.id]:e.target.value}})}/></label>{line.id.startsWith('tool:')&&<label className="budget-owned"><input type="checkbox" checked={toolInventory.includes(line.id.slice(5))} onChange={e=>update({owned:e.target.checked?[...new Set([...toolInventory,line.id.slice(5)])]:toolInventory.filter(id=>id!==line.id.slice(5))})}/>Already owned</label>}</div>)}</div>
 <div className="budget-labor"><label>Your labor estimate (hours)<input inputMode="decimal" maxLength={6} placeholder="Not established" value={hours} onChange={e=>update({hours:e.target.value})}/></label><label>Hourly shop quote<input inputMode="decimal" maxLength={12} placeholder="Not supplied" value={rate} onChange={e=>update({rate:e.target.value})}/></label></div>
 {error?<p role="alert">{error}</p>:<dl><dt>Known DIY subtotal</dt><dd>{amount(total?.known??null)}</dd><dt>Full DIY budget</dt><dd>{total?.total===null?'Incomplete — '+total.missing.length+' amounts missing':amount(total?.total??null)}</dd><dt>Professional labor only</dt><dd>{amount(labor)}</dd></dl>}
 <p className="small muted">These are your planning figures, not verified labor times or a promise of total repair cost. Additional faults and unrecorded expenses remain unknown.</p>
 <button type="button" className="button outline" disabled={busy||!current||!userId||!owned.selected||!!error} onClick={async()=>{
  if(!userId||!owned.selected||error||saveAbort.current)return;const car=owned.selected.id;const controller=new AbortController();saveAbort.current=controller;setBusy(true);setMessage('');
  try{
   const fingerprint=JSON.stringify({guideId,revision,currency,lines,hours,rate});
   if(saveIntent.current?.scope!==scope||saveIntent.current.fingerprint!==fingerprint)saveIntent.current={scope,fingerprint,id:crypto.randomUUID(),at:new Date().toISOString()};
   const intent=saveIntent.current,entry=budgetJournal({title,guide:guideId,revision,currency,lines,hours,rate,at:intent.at}),signal=AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]);
   const response=await db.from('owner_journal_entries').insert({...entry,id:intent.id,user_id:userId,vehicle_id:car,stage:'planned',guide_id:guideId,guide_revision:revision,guide_step:1}).select('id').abortSignal(signal).single();
   if(response.error?.code==='23505'){
    const existing=await db.from('owner_journal_entries').select('id').eq('id',intent.id).eq('user_id',userId).eq('vehicle_id',car).abortSignal(signal).maybeSingle();
    if(existing.error||!existing.data)throw Error('The plan could not be confirmed in your journal. Your local budget is retained.');
   }else if(response.error||!response.data)throw Error('The plan could not be confirmed in your journal. Your local budget is retained.');
   if(scopeRef.current===scope){setMessage('Plan saved privately to this car’s restoration journal.');toast('Private repair plan saved.');}
  }
  catch(e){if(scopeRef.current===scope)setMessage(e instanceof Error?e.message:'The plan could not save.');}finally{if(saveAbort.current===controller)saveAbort.current=null;if(scopeRef.current===scope)setBusy(false);}
 }}>Save plan to my private journal</button>
 {!userId?<p><a href={'/account?next='+encodeURIComponent('/guides/'+guideId)}>Sign in</a> to save a plan to your garage.</p>:!owned.selected?<p>Select one of your garage cars before saving this plan.</p>:<p><a href={'/garage?vehicle='+owned.selected.id+'&tab=journal'}>Open this car’s journal ↗</a></p>}
 {message&&<p role="status">{message}</p>}
 </details>;
}
