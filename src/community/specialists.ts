export type Specialist = {id:string;name:string;city:string;region:string;country:string;services:string[];description:string;url:string;sources:string[];checked:string};
/** Authored descriptions based on the businesses' own sites, not customer ratings or endorsements. */
export const specialists: Specialist[] = [
  {id:'korman-autoworks',name:'Korman Autoworks',city:'Greensboro',region:'North Carolina',country:'United States',services:['Maintenance & repairs','Restoration','Engine & drivetrain'],description:'BMW servicing, restoration and engine, transmission and differential rebuilding.',url:'https://kormanautoworks.com/',sources:['https://kormanautoworks.com/contact-us/','https://kormanautoworks.com/restoration/'],checked:'2026-11-08'},
  {id:'munich-legends',name:'Munich Legends',city:'Chelwood Gate',region:'East Sussex',country:'United Kingdom',services:['Maintenance & repairs','Restoration'],description:'Independent BMW servicing and restoration for everyday cars and classics.',url:'https://munichlegends.co.uk/',sources:['https://munichlegends.co.uk/bmw-servicing-sussex/','https://munichlegends.co.uk/'],checked:'2026-11-08'},
  {id:'ziggys-bimmer-center',name:'Ziggy’s Bimmer Center',city:'Somerville',region:'New Jersey',country:'United States',services:['Maintenance & repairs','Diagnostics','Brakes & suspension'],description:'BMW maintenance, diagnostics, brake and suspension work.',url:'https://www.ziggysbimmercenterllc.com/',sources:['https://www.ziggysbimmercenterllc.com/services'],checked:'2026-11-08'},
];
export function filterSpecialists(query:string,country='',service=''){
  const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return specialists.filter(s=>(!country||s.country===country)&&(!service||s.services.includes(service))&&words.every(word=>[s.name,s.city,s.region,s.country,...s.services,s.description].join(' ').toLocaleLowerCase().includes(word)));
}
export const specialistThreadPrefix='BMW specialist:';
export function specialistSuggestionHref(business?:Specialist,correction=false){
  return '/community/new?'+new URLSearchParams({
    title:specialistThreadPrefix+' '+(business?business.name+' — '+business.city:''),
    category:'General E34 Community',template:'general',intent:'specialist',
    observations:[correction?'Listing correction':'Business recommendation','Business name: '+(business?.name||''),'City / region / country: '+(business?[business.city,business.region,business.country].join(', '):''),'Official website: '+(business?.url||''),'BMW / E34 work offered: ','Your first-hand experience (car, work and approximate date): ','Any connection to the business or incentive: ','What should be added or corrected, with a source: ',...(business?['E34 Lore listing: https://e34lore.com/community/specialists#'+business.id]:[])].join('\n\n'),
  });
}
