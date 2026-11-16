import {e30ManualGroupForPage} from '../series/e30-factory-index';
import {manualChapters,manualSource,type ManualGuide} from '../data/manual';
export const guideKindLabels:Record<ManualGuide['kind'],string>={replacement:'Replacement steps',inspection:'Inspection',planning:'Planning checklist',reference:'Reference'};
/** Page locators come from the registered scan index, never guessed from a title.
 * They locate source material; they do not certify an individual guide step. */
export function guideSourcePages(guide:ManualGuide){
 if (guide.source.id === 'e30-factory-repair-upload') {
  return [...new Set(guide.source.pdfPages)].map(pdf => {
   const step = guide.jobSupport?.steps.find(step => step.source.pdf === pdf);
   const group = e30ManualGroupForPage(pdf);
   return {pdf, printed: step?.source.printed ?? guide.source.section, href: group ? '/manual/'+group.id+'?pdf='+pdf : undefined};
  });
 }
 const chapters=[...manualChapters,...manualSource.appendices];
 return [...new Set(guide.source.pdfPages)].sort((a,b)=>a-b).map(pdf=>{
  if(pdf===5)return{pdf,printed:'Foreword v',href:'/resources#evidence'};
  const chapter=chapters.find(c=>pdf>=c.pdfStart&&pdf<=c.pdfEnd);
  return {pdf,printed:chapter?chapter.id+'-'+(pdf-chapter.pdfStart+1):null,href:chapter?'/manual/'+chapter.id+'?pdf='+pdf:undefined};
 });
}
export function guideVisualType(slug:string){
 if(slug==='identify-your-engine')return 'reference-photos';
 if(slug==='factory-halogen-headlight-bulb'||slug==='e30-rear-lamp-bulb')return 'orientation-diagram';
 if(['m50-water-pump-job-planning','front-strut-component-identification'].includes(slug))return 'source-linked-diagram';
 return 'none';
}
export function manualPageLocator(chapter:{id:string;pdfStart:number;pdfEnd:number},value:string|undefined){
 if(value===undefined)return null;
 const page=/^\d{1,3}$/.test(value)?Number(value):NaN;
 return Number.isInteger(page)&&page>=chapter.pdfStart&&page<=chapter.pdfEnd?{pdf:page,printed:chapter.id+'-'+(page-chapter.pdfStart+1)}:null;
}
