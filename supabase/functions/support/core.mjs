import {SupportInputError,parseSupportContact,mailbox,messageIds,plainEmail,attachmentPolicy,uuid} from '../_shared/support-contract.mjs';
import {RequestBodyError} from '../_shared/request.mjs';
import {boundedBytes,boundedJSON,digest,fingerprint,requestAddress,supportChallenge,verifySupportChallenge} from './security.mjs';
import {dispatchSupport,processSupportAttachments} from './worker.mjs';
const deliveryTypes=new Set(['email.sent','email.delivered','email.delivery_delayed','email.failed','email.bounced','email.complained','email.suppressed']);
function recipient(address,domain){const m=mailbox(address);if(!m)return null;const [local,host]=m.email.split('@');if(host!==domain)return null;return local==='support'?{token:''}:/^support\+[a-f0-9]{48}$/.test(local)?{token:local.slice(8)}:null;}
function messageHeaders(raw){return Object.fromEntries(Object.entries(raw||{}).filter(([k,v])=>typeof k==='string'&&typeof v==='string').map(([k,v])=>[k.toLowerCase(),v]));}
export function receivedSupportMessage(email,event,config){
 if(email.id!==event.data.email_id||!(email.to||[]).some(address=>recipient(address,config.receiveDomain)))throw Error('Received email did not match its event');
 const sender=mailbox(email.from);if(!sender)throw new SupportInputError('Received email has no valid sender.');
 const headers=messageHeaders(email.headers),automated=!!(headers['auto-submitted']&&headers['auto-submitted'].toLowerCase()!=='no')||/^(bulk|junk|list)$/i.test(headers.precedence||'')||/^(mailer-daemon|postmaster|bounce[+-]?)/i.test(sender.email);
 const auth=String(email.authentication?.dmarc||'').toLowerCase(),spam=auth==='fail'||/^yes\b/i.test(headers['x-spam-status']||'');
 const body=plainEmail(email),replyIds=spam?[]:[...new Set([...messageIds(headers.references),...messageIds(headers['in-reply-to'])])].slice(-20),tokens=[...new Set((email.to||[]).map(address=>recipient(address,config.receiveDomain)?.token).filter(Boolean))];
 return {providerId:email.id,email:sender.email,name:sender.name||sender.email,subject:String(email.subject||'(No subject)').replace(/[\r\n\x00-\x1f]/g,' ').slice(0,200).padEnd(3,' '),body:body.slice(0,256000),truncated:body.length>256000,messageId:messageIds(email.message_id||event.data.message_id)[0]||'',replyIds,replyToken:!spam&&tokens.length===1?tokens[0]:'',automated,spam,senderVerification:auth==='pass'?'aligned':spam?'suspicious':'unknown',attachments:(email.attachments||[]).slice(0,20).filter(a=>uuid(a.id)).map((a,i)=>attachmentPolicy(a,i))};
}
export async function supportService(request,deps){
 const {config,store,provider}=deps,origin=request.headers.get('origin'),path=new URL(request.url).pathname.split('/').filter(Boolean).at(-1)||'',isWebhook=path==='webhook',isWorker=path==='dispatch';
 const cors=origin&&config.origins.includes(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}:{};
 const deliver=async(settings=config)=>{const task=dispatchSupport(store,provider,settings).catch(()=>{});if(deps.defer)deps.defer(task);else await task;};
 const respond=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...cors}});
 if(request.method==='OPTIONS')return origin&&config.origins.includes(origin)?new Response(null,{status:204,headers:cors}):respond(403,{error:'This origin is not allowed.'});
 if(!isWebhook&&!isWorker&&(!origin||!config.origins.includes(origin)))return respond(403,{error:'This origin is not allowed.'});
 try{
  if(isWebhook){
   if(request.method!=='POST')return respond(405,{error:'POST required.'});
   const raw=new TextDecoder('utf-8',{fatal:true}).decode(await boundedBytes(request,262144));
   let event;try{event=await deps.verifyWebhook(raw,{'svix-id':request.headers.get('svix-id')||'','svix-timestamp':request.headers.get('svix-timestamp')||'','svix-signature':request.headers.get('svix-signature')||''});}catch{return respond(401,{error:'Invalid email event signature.'});}
   const eventId=request.headers.get('svix-id');if(!eventId||eventId.length>200||!uuid(event?.data?.email_id))return respond(400,{error:'Invalid email event.'});
   const hash=await digest(raw);
   if(event.type==='email.received'){
    if(!(event.data.to||[]).some(address=>recipient(address,config.receiveDomain)))return respond(200,{ignored:true});
    const email=await provider.received(event.data.email_id),payload=receivedSupportMessage(email,event,config);
    await store.ingest(payload,eventId,hash);
    // Worker retries incomplete attachments separately; ingestion remains atomic.
    if(config.enabled&&await store.ready())await deliver();
    return respond(200,{received:true});
   }
   if(deliveryTypes.has(event.type)){
    const from=mailbox(event.data.from)?.email,ours=mailbox(config.from)?.email;
    if(from!==ours&&!await store.knownProvider(event.data.email_id))return respond(200,{ignored:true});
    const time=new Date(event.created_at||event.data.created_at);if(!Number.isFinite(time.getTime())||time.getTime()>Date.now()+300000)return respond(400,{error:'Invalid email event time.'});
    await store.deliveryEvent(eventId,hash,event.data.email_id,event.type,time.toISOString());return respond(200,{received:true});
   }
   return respond(200,{ignored:true});
  }
  if(isWorker){
   if(request.method!=='POST'||!config.workerToken||request.headers.get('authorization')!=='Bearer '+config.workerToken)return respond(401,{error:'Worker authorization required.'});
   if(!config.enabled||!await store.ready())return respond(503,{error:'Support delivery is not enabled.'});
   const delivery=await dispatchSupport(store,provider,config),attachments=await processSupportAttachments(store,provider);const removed=new Date().getUTCMinutes()===0?await store.retention():0;return respond(200,{delivery,attachments,removed});
  }
  if(path==='ready'&&request.method==='GET'){return respond(200,{available:!!config.enabled&&!!config.secret&&!!config.providerConfigured&&await store.ready()});}
  if(path==='challenge'&&request.method==='GET'){
   if(!config.enabled||!config.secret||!config.providerConfigured||!await store.ready())return respond(503,{error:'Support is not taking new requests at the moment. Please try again later.'});
   return respond(200,{challenge:await supportChallenge(config.secret,requestAddress(request),deps.now?.()||Date.now())});
  }
  if(path==='contact'&&request.method==='POST'){
   if(!config.enabled||!config.secret||!config.providerConfigured||!await store.ready())return respond(503,{error:'Support is not taking new requests at the moment. Please try again later.'});
   const raw=await boundedJSON(request),payload=parseSupportContact(raw),ip=requestAddress(request);
   if(!await verifySupportChallenge(raw.challenge,config.secret,ip,deps.now?.()||Date.now()))return respond(400,{error:'The form expired or was submitted too quickly. Refresh it and try again.'});
   let owner=null;const token=request.headers.get('authorization')?.replace(/^Bearer /,'');if(token)try{const user=await deps.identity(token);if(user&&!user.is_anonymous&&user.email_confirmed_at&&user.email?.toLowerCase()===payload.email)owner=user.id;}catch{/* Guest contact remains available; no unverified account is bound. */}
   const result=await store.submit(payload,await fingerprint(config.secret,'ip:'+ip),await fingerprint(config.secret,'email:'+payload.email),await digest(JSON.stringify(payload)),owner);
   await deliver(); // Saved messages are also retried by the durable worker.
   return respond(202,{reference:result.reference,accepted:true});
  }
  const token=/^Bearer (.{20,8192})$/.exec(request.headers.get('authorization')||'')?.[1];
  if(!token)return respond(401,{error:'Sign in with your administrator account.'});
  const staff=await deps.authorize(token);if(!staff)return respond(403,{error:'Administrator permission and a verified authenticator are required.'});
  if(path==='health'&&request.method==='GET')return respond(200,{...await store.counts(),configured:!!config.providerConfigured,enabled:!!config.enabled&&await store.ready()});
  if(request.method!=='POST')return respond(405,{error:'POST required.'});
  const body=await boundedJSON(request);
  if(path==='delivery-check'){
   if(!config.providerConfigured||body.confirm!==true)return respond(400,{error:'Confirm the controlled delivery check first.'});
   const user=await deps.identity(token);if(!user?.email_confirmed_at||!mailbox(user.email))return respond(403,{error:'A verified administrator email is required.'});
   const payload={name:'E34 Lore owner',email:user.email.toLowerCase(),subject:'E34 Lore support delivery check',message:'Controlled two-way support email verification for E34 Lore. Reply to the confirmation email to verify that replies return to this conversation.',category:'website',reference:'',requestId:crypto.randomUUID(),isTest:true};
   const result=await store.submit(payload,await fingerprint(config.secret,'check:'+user.id),await fingerprint(config.secret,'email:'+payload.email),await digest(JSON.stringify(payload)),user.id);
   await deliver({...config,testRecipient:payload.email});return respond(202,{reference:result.reference,queued:true});
  }
  if(path==='activate'){
   if(!config.providerConfigured||!config.enabled)return respond(503,{error:'The support service configuration is not ready.'});
   const counts=await store.counts();if(body.enable===true&&(!counts.outboundVerified||!counts.inboundVerified))return respond(409,{error:'Verify a delivered email and a real reply before enabling support.'});
   await store.activate(body.enable===true);return respond(200,{enabled:body.enable===true});
  }
  if(path==='reply'){
   if(!config.enabled||!config.providerConfigured||!await store.ready())return respond(503,{error:'Support email is not connected yet.'});
   if(!uuid(body.ticket)||!uuid(body.requestId)||typeof body.message!=='string'||body.message.trim().length<1||body.message.length>12000)return respond(400,{error:'Write a reply of up to 12,000 characters.'});
   const id=await staff.rpc('support_staff_reply',{ticket:body.ticket,message_body:body.message,client_request:body.requestId,message_kind:body.kind==='update'?'update':'reply'});
   await deliver();
   return respond(202,{messageId:id,queued:true});
  }
  if(path==='status'){
   if(!uuid(body.ticket)||!['open','closed','spam','trash','restore'].includes(body.status))return respond(400,{error:'Choose a valid conversation status.'});
   await staff.rpc('support_staff_status',{ticket:body.ticket,new_status:body.status,notify_customer:body.notify===true&&config.enabled});
   if(config.enabled)await deliver();
   return respond(200,{saved:true});
  }
  if(path==='retry'){
   if(!uuid(body.message))return respond(400,{error:'Choose a valid message.'});
   await staff.rpc('support_staff_retry',{message:body.message});if(config.enabled)await deliver();return respond(200,{queued:true});
  }
  if(path==='attachment'){
   if(!uuid(body.attachment))return respond(400,{error:'Choose a valid attachment.'});
   const item=await store.attachment(body.attachment);if(!item||item.state!=='stored'||!item.object_path)return respond(404,{error:'This attachment is not available.'});
   const blob=await store.download(item.object_path);if(blob.size>5242880)return respond(413,{error:'Attachment exceeds the download limit.'});
   return new Response(blob,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${item.filename.replace(/[^a-zA-Z0-9._ -]/g,'_')}"`,'Content-Security-Policy':"sandbox; default-src 'none'",'X-Content-Type-Options':'nosniff','Cache-Control':'no-store',...cors}});
  }
  if(path==='purge'){
   if(body.confirm!=='REMOVE EXPIRED CONVERSATIONS')return respond(400,{error:'Confirm the retention cleanup first.'});
   await staff.rpc('support_staff_retention');const removed=await store.retention();await store.deleteObjects(await store.deletedObjects());return respond(200,{removed});
  }
  return respond(404,{error:'Support action not found.'});
 }catch(error){
  if(error instanceof RequestBodyError)return respond(error.status,{error:error.message});
  if(error instanceof SyntaxError)return respond(400,{error:'The request format is invalid.'});
  if(error instanceof SupportInputError)return respond(400,{error:error.message,field:error.field});
  if(error.code==='42501')return respond(403,{error:'Administrator permission and a verified authenticator are required.'});
  if(/rate limit/i.test(error.message||''))return respond(429,{error:'Too many support requests. Please try again later.'});
  return respond(503,{error:'Support could not complete this request. Please try again.'});
 }
}
