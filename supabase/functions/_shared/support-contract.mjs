export const supportCategories = [
 ['account','Account assistance'],['technical','Technical information'],['part-correction','Incorrect part information'],['guide-correction','Repair guide correction'],['website','Website problem'],['moderation','Community or moderation issue'],['other','Other inquiry'],
];
export class SupportInputError extends Error { constructor(message,field=''){super(message);this.field=field;} }
export const uuid = value => typeof value==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export function mailbox(value){
 if(typeof value!=='string'||/[\r\n]/.test(value)||value.length>400)return null;
 const angle=/^(.*?)<([^<>]+)>\s*$/.exec(value.trim()),email=(angle?angle[2]:value).trim().toLowerCase();
 if(email.length>254||!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]{1,64}@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/i.test(email)||email.includes('..'))return null;
 return {email,name:angle?angle[1].trim().replace(/^"|"$/g,'').slice(0,80):email.split('@')[0]};
}
export function supportReference(value){
 if(!value)return '';if(typeof value!=='string'||value.length>3000)return '';
 try{const u=new URL(value,'https://e34lore.com');if(!['e34lore.com','www.e34lore.com'].includes(u.hostname)||u.username||u.password||u.protocol!=='https:')return '';
 const path=decodeURIComponent(u.pathname);if(!/^\/(guides|articles|parts|manual|encyclopedia|workshop|community|garages|quick-reference)(\/|$)/.test(path)||/\/(assets|inspections|settings|admin|new)(\/|$)/.test(path)||path.includes('..'))return '';
 const safe=new URL('https://e34lore.com'+path);for(const key of ['part','assembly','context','position','node','system','step','q']){const v=u.searchParams.get(key);if(v&&v.length<=200)safe.searchParams.set(key,v);}
 if(/^#(?:job-[a-z0-9-]+|step-\d+)$/.test(u.hash))safe.hash=u.hash;return safe.toString().slice(0,1000);
 }catch{return '';}
}
export function parseSupportContact(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new SupportInputError('Check the support form and try again.');
 if(typeof value.website==='string'&&value.website.trim())throw new SupportInputError('Refresh the form and try again.');
 const name=String(value.name||'').trim().replace(/\s+/g,' '),email=mailbox(value.email),subject=String(value.subject||'').trim(),message=String(value.message||'').replace(/\r\n?/g,'\n').trim();
 if(name.length<1||name.length>80)throw new SupportInputError('Enter your name (up to 80 characters).','name');
 if(!email||/[<>]/.test(String(value.email)))throw new SupportInputError('Enter one valid email address.','email');
 if(subject.length<3||subject.length>200||/[\r\n\x00-\x1f]/.test(subject))throw new SupportInputError('Use a subject between 3 and 200 characters.','subject');
 if(message.length<20||message.length>12000||message.includes('\u0000'))throw new SupportInputError('Write a message between 20 and 12,000 characters.','message');
 const category=supportCategories.some(c=>c[0]===value.category)?value.category:'other';
 if(!uuid(value.requestId))throw new SupportInputError('Refresh the form and try again.');
 return {name,email:email.email,subject,message,category,reference:supportReference(value.reference),requestId:value.requestId};
}
export function messageIds(value){return (typeof value==='string'?value.match(/<[^<>\s]{1,990}>/g)||[]:[]).slice(-20);}
export function plainEmail(email){
 if(typeof email.text==='string'&&email.text.trim())return email.text.replace(/\r\n?/g,'\n').replaceAll('\u0000','');
 return String(email.html||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<(?:br\b[^>]*|\/p|\/div|\/tr|\/li|\/h[1-6])>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g,s=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '})[s]).replaceAll('\u0000','').trim()||'[This email contains no readable text.]';
}
export function attachmentPolicy(item,index=0){
 const filename=String(item.filename||'attachment').replace(/[\x00-\x1f\x7f/\\]/g,'_').slice(0,180),contentType=String(item.content_type||'application/octet-stream').toLowerCase().slice(0,100),bytes=Math.max(0,Math.min(Number(item.size)||0,2147483647));
 const extensions={'image/jpeg':/\.jpe?g$/i,'image/png':/\.png$/i,'image/webp':/\.webp$/i,'application/pdf':/\.pdf$/i};
 const allowed=index<5&&uuid(item.id)&&bytes>0&&bytes<=5242880&&extensions[contentType]?.test(filename);
 return {id:item.id,filename,contentType,bytes,state:allowed?'pending':'blocked',reason:allowed?null:'Only up to five JPG, PNG, WebP or PDF files of 5 MB each can be retained.'};
}
export function attachmentMatches(type,bytes){
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>5242880)return false;
 const ascii=(a,b)=>new TextDecoder().decode(bytes.slice(a,b));
 return type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='image/png'?Array.from(bytes.slice(0,8)).join(',')==='137,80,78,71,13,10,26,10':type==='image/webp'?ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP':type==='application/pdf'?ascii(0,5)==='%PDF-':false;
}
