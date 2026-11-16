import fs from 'node:fs/promises';
const lock=JSON.parse(await fs.readFile('package-lock.json','utf8'));
const sections=['E34 Lore — third-party software notices','This file preserves notices from installed, pinned dependencies. Inclusion does not imply every package is delivered to the browser. Source code and build dependencies retain their own licenses. Creative Commons vehicle/photo credits, fonts and manuals are separately documented at /resources#credits, /scanner/REFERENCE-CREDITS.md, /models/e34-525i/LICENSE.md and /fonts/. No project-wide MIT license or ownership of upstream works is asserted.'];
const missing=[];let included=0;
for(const [directory,pkg] of Object.entries(lock.packages).sort(([a],[b])=>a.localeCompare(b))) {
 if(!directory)continue;
 let names;try{names=await fs.readdir(directory);}catch{continue;}
 const notices=names.filter(n=>/^(licen[cs]e|copying|notice|copyright)(?:[._-].*)?$/i.test(n));
 const texts=[];
 for(const name of notices){const filename=directory+'/'+name;if((await fs.stat(filename)).isFile())texts.push(name+'\n'+await fs.readFile(filename,'utf8'));}
 if(!texts.length){missing.push({path:directory,version:pkg.version,license:pkg.license});continue;}
 sections.push(`${directory.replaceAll('node_modules/','')} @ ${pkg.version}\nDeclared license: ${pkg.license??'unrecorded'}\n${texts.join('\n\n')}`);included++;
}
// Normalize line endings/trailing whitespace only; preserve every notice's words.
const combined=sections.join('\n\n============================================================\n\n').replace(/\r\n?/g,'\n').split('\n').map(line=>line.trimEnd()).join('\n').trimEnd()+'\n';
await fs.writeFile('public/THIRD-PARTY-NOTICES.txt',combined);
await fs.mkdir('data/ip',{recursive:true});
await fs.writeFile('data/ip/oss-notice-review.json',JSON.stringify({scope:'Installed npm package root LICENSE/COPYING/NOTICE/COPYRIGHT files, exact versions in package-lock. Platform-absent optional packages are not copied. This is preservation, not a complete linked/binary-distribution legal opinion.',included,missing},null,2)+'\n');
console.log(JSON.stringify({included,missing:missing.length}));
