import {Fragment} from 'react';
export type ReferenceTextSegment={text:string;href?:string};
/** Keep member text as text. Only explicit web URLs become links: no HTML,
 * images, embeds, shortened destinations or background requests. */
export function referenceTextSegments(text:string):ReferenceTextSegment[]{
 const segments:ReferenceTextSegment[]=[];let cursor=0,linked=0;
 for(const match of text.matchAll(/https?:\/\/[^\s<>"\u0000-\u001f\u007f]+/gi)){
  const start=match.index!,raw=match[0];let candidate=raw.replace(/[.,;:!?]+$/,'');
  for(const [open,close]of [['(',')'],['[',']']] as const)while(candidate.endsWith(close)&&candidate.split(close).length>candidate.split(open).length)candidate=candidate.slice(0,-1);
  let href:string|undefined;
  try{const url=new URL(candidate);if(linked<50&&candidate.length<=2048&&['https:','http:'].includes(url.protocol)&&!url.username&&!url.password&&!url.port&&!/^(localhost|127\.|0\.|\[?::1)/i.test(url.hostname)&&url.hostname.includes('.')){href=url.href;linked++;}}catch{/* Keep malformed URL text visible. */}
  if(start>cursor)segments.push({text:text.slice(cursor,start)});
  segments.push({text:candidate,...(href?{href}:{})});cursor=start+candidate.length;
 }
 if(cursor<text.length)segments.push({text:text.slice(cursor)});
 return segments;
}
export function LinkedText({text}:{text:string}){
 return <>{referenceTextSegments(text).map((segment,i)=>segment.href?<a key={i} href={segment.href} target="_blank" rel="ugc nofollow noopener noreferrer">{segment.text}</a>:<Fragment key={i}>{segment.text}</Fragment>)}</>;
}
