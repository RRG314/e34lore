import{describe,it,expect}from'vitest';
import{textEvidence,photoTextEvidence}from'../src/scanner/text-evidence';
import{emptyPhotoDraft,restorePhotoDraft}from'../src/scanner/photo-session';
describe('observed part text',()=>{
 it('reads complete grouped numbers across punctuation/newlines without correcting characters',()=>{
  expect(textEvidence('BMW 26.12.1.226.657\n26 12 1\n226 657').numbers).toEqual(['26121226657']);
  expect(textEvidence('2612122665O 226657 1226657 X26121226657B')).toEqual({numbers:[],partials:['1226657']});
 });
 it('never joins partial marks from separate views into a complete ordering number',()=>{
  expect(photoTextEvidence([{text:'26 12 1'},{text:'226 657'}]).numbers).toEqual([]);
  expect(photoTextEvidence([{text:'26 12 1\n226 657'},{text:'26121226657'},{text:'1 225 002'}]).numbers).toEqual(['26121226657']);
 });
 it('offers literal seven-digit endings from grouped markings without duplicating complete numbers',()=>{
  expect(textEvidence('BMW 1 226 723\n1.225.071\n0 000 000\nA1 234 567')).toEqual({numbers:[],partials:['1226723','1225071']});
  expect(textEvidence('1226 723')).toEqual({numbers:[],partials:['1226723']});
  expect(textEvidence('BMW 26 12 1226 723')).toEqual({numbers:['26121226723'],partials:[]});
  expect(textEvidence('BMW 26 12 1 226 723')).toEqual({numbers:['26121226723'],partials:[]});
  expect(photoTextEvidence([{text:'1 226 723'},{text:'26121226723'}])).toEqual({numbers:['26121226723'],partials:[]});
 });
 it('keeps bounded device-only text with its source photo revision and restores older drafts',()=>{
  const d=emptyPhotoDraft();d.photoText={revision:0,ms:23,views:[{photoId:'photo1',text:'MEYLE\n1226657',confidence:79}]};
  expect(restorePhotoDraft(d)?.photoText?.views[0].text).toBe('MEYLE\n1226657');
  expect(()=>restorePhotoDraft({...d,photoText:{...d.photoText,views:[{photoId:'p',text:'x'.repeat(1201),confidence:70}]}})).toThrow();
  const {photoText:old,...legacy}=d;expect(old).not.toBeNull();expect(restorePhotoDraft(legacy)?.photoText).toBeNull();
 });
});
