import {DocumentLink} from './DocumentLink';
export function CommunityNavigation({section}:{section?:string}){
  const active=section==='issues'?'topics':['garages','builds','cars','topics','specialists','policies'].includes(section||'')?section:'';
  return <nav className="community-navigation page" aria-label="Community sections">{[
    ['/community','Discussions',''],['/community/garages','Member garages','garages'],['/builds','Build gallery','builds'],['/community/cars','Featured cars','cars'],['/community/topics','Topics & guides','topics'],['/community/specialists','BMW specialists','specialists'],['/community/policies','Guidelines','policies'],
  ].map(([href,label,id])=><DocumentLink key={href} href={href} aria-current={active===id?'page':undefined}>{label}</DocumentLink>)}</nav>;
}
