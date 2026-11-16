export function supportStore(admin){
 async function rpc(name,args={}){const result=await admin.rpc(name,args).abortSignal(AbortSignal.timeout(12000));if(result.error)throw Object.assign(new Error(result.error.message),{code:result.error.code});return result.data;}
 return {
 async knownProvider(id){const r=await admin.from('support_messages').select('id').eq('provider_id',id).maybeSingle();if(r.error)throw r.error;return !!r.data;},
 activate:activate=>rpc('support_service_activate',{activate}),ready:()=>rpc('support_service_ready'),counts:()=>rpc('support_service_counts'),
 submit:(payload,ip,email,hash,user)=>rpc('support_service_submit',{payload,request_fingerprint:ip,email_fingerprint:email,content_fingerprint:hash,owner_id:user||null}),
 ingest:(payload,id,hash)=>rpc('support_service_ingest',{payload,event_id:id,event_hash:hash}),
 claim:(recipient=null)=>rpc('support_service_claim',{recipient_filter:recipient}),
 delivery:(id,status,provider=null,rfc=null,error=null,retry=60)=>rpc('support_service_delivery',{message:id,new_status:status,provider,rfc_id:rfc,error_text:error,retry_seconds:retry}),
 deliveryEvent:(id,hash,email,type,time)=>rpc('support_service_event',{event_id:id,event_hash:hash,email_id:email,event_type:type,event_time:time}),
 reconcile:id=>rpc('support_service_reconcile',{message:id}),missingIds:()=>rpc('support_service_missing_ids'),setRfc:(id,rfc)=>rpc('support_service_set_rfc',{message:id,rfc_id:rfc}),
 attachmentClaim:()=>rpc('support_service_attachment_claim'),
 attachmentResult:(id,state,path=null,reason=null)=>rpc('support_service_attachment_result',{attachment:id,new_state:state,path_value:path,explanation:reason}),
 async saveAttachment(path,bytes,type){const r=await admin.storage.from('support-attachments').upload(path,bytes,{contentType:type,upsert:true});if(r.error)throw Error('Attachment could not be retained');},
 deletedObjects:()=>rpc('support_service_deleted_objects'),
 async deleteObjects(paths){if(!paths.length)return;const r=await admin.storage.from('support-attachments').remove(paths);if(r.error)throw Error('Attachment removal could not finish');await rpc('support_service_ack_deleted',{paths});},
 retention:()=>rpc('support_service_retention'),
 async attachment(id){const r=await admin.from('support_attachments').select('id,filename,bytes,state,object_path').eq('id',id).maybeSingle();if(r.error)throw r.error;return r.data;},
 async download(path){const r=await admin.storage.from('support-attachments').download(path);if(r.error)throw r.error;return r.data;},
 };
}
