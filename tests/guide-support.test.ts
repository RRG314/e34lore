import {describe,it,expect} from 'vitest';
import {manualGuides} from '../src/data/manual';
import {guideSourcePages,manualPageLocator,guideVisualType} from '../src/domain/guide-support';
describe('guide source and coverage presentation',()=>{
 it('resolves every cited PDF page to a real printed-page locator without inventing step citations',()=>{
  for(const guide of manualGuides)for(const page of guideSourcePages(guide)){
   expect(page.printed,guide.slug+' PDF '+page.pdf).not.toBeNull();expect(page.href).toEqual(page.pdf===5?'/resources#evidence':expect.stringContaining('?pdf='+page.pdf));
  }
 });
 it('keeps planning, inspection and image coverage separate from replacement instructions',()=>{
  expect(manualGuides.filter(g=>g.track).every(g=>g.kind==='planning')).toBe(true);
  expect(guideVisualType('m50-spark-plug-replacement')).toBe('none');
  expect(guideVisualType('m50-water-pump-job-planning')).toBe('source-linked-diagram');
 });
 it('rejects a missing, malformed or out-of-chapter page instead of redirecting to an unrelated reference',()=>{
  const chapter={id:'260',pdfStart:261,pdfEnd:268};
  expect(manualPageLocator(chapter,'267')).toEqual({pdf:267,printed:'260-7'});
  for(const page of [undefined,'999','12.5','-1','abc','269'])expect(manualPageLocator(chapter,page)).toBeNull();
 });
});
