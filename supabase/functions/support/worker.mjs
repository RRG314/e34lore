import {supportEmail} from './templates.mjs';
import {attachmentMatches,messageIds,uuid} from '../_shared/support-contract.mjs';
export async function dispatchSupport(store,provider,config){
 let sent=0,failed=0;
 for(const item of await store.claim(config.testRecipient||null)){
  try{
   const result=await provider.send(supportEmail(item,config),'e34-support/'+item.message.id);
   if(!uuid(result.id))throw new Error('Provider did not confirm an email identifier');
   // Persist acceptance before attempting any optional metadata read.
   await store.delivery(item.message.id,'sent',result.id);
   try{const detail=await provider.sent(result.id);const id=messageIds(detail.message_id)[0];if(id)await store.setRfc(item.message.id,id);}catch{/* The repair pass below retries metadata; it never resends accepted mail. */}
   try{await store.reconcile(item.message.id);}catch{/* Delivery events can reconcile on the next pass. */}sent++;
  }catch(error){
   const transient=!error.status||error.status===429||error.status>=500,retryable=transient&&item.message.attempts<8;
   await store.delivery(item.message.id,retryable?'delayed':'failed',null,null,retryable?'Delivery could not yet be confirmed. The service will retry safely.':transient?'Delivery retries were exhausted. Review before sending again.':'The email provider rejected the request.',error.retry||Math.min(3600,60*2**item.message.attempts));failed++;
  }
 }
 for(const item of await store.missingIds())try{const detail=await provider.sent(item.provider_id);const id=messageIds(detail.message_id)[0];if(id)await store.setRfc(item.id,id);}catch{/* Provider delivery evidence remains visible; no duplicate send. */}
 return {sent,failed};
}
export async function processSupportAttachments(store,provider){
 let stored=0,blocked=0;
 for(const item of await store.attachmentClaim()){
  try{
   const metadata=await provider.attachment(item.provider_id,item.provider_attachment_id);
   if(metadata.size!==item.bytes||metadata.content_type!==item.content_type)throw Error('Attachment metadata changed');
   const bytes=await provider.download(metadata.download_url);
   if(bytes.length!==item.bytes||!attachmentMatches(item.content_type,bytes)){await store.attachmentResult(item.id,'blocked',null,'The attachment content did not match its stated file type or size.');blocked++;continue;}
   const path=`${item.ticket_id}/${item.message_id}/${item.id}`;
   await store.saveAttachment(path,bytes,item.content_type);await store.attachmentResult(item.id,'stored',path);stored++;
  }catch{await store.attachmentResult(item.id,'error',null,'The attachment could not be retrieved safely.');}
 }
 const removed=await store.deletedObjects();await store.deleteObjects(removed);
 return {stored,blocked};
}
