/** Original wide E34 grille artwork is the single source for header/app identity. */
import fs from 'node:fs/promises';
import sharp from 'sharp';
const grille = await fs.readFile('public/brand/e34-grille.svg','utf8');
const app = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#000"/><svg x="64" y="198" width="384" height="86.4" viewBox="0 0 320 72" fill="none">${grille.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/,'')}</svg><text x="256" y="344" fill="#fff" font-family="Arial,sans-serif" font-size="38" font-weight="700" letter-spacing="8" text-anchor="middle">E34 LORE</text></svg>`;
await fs.writeFile('public/brand/e34-app-icon.svg',app+'\n');
for (const [size,name] of [[192,'e34-grille-192.png'],[512,'e34-grille-512.png'],[512,'e34-grille-maskable-512.png']]) await sharp(Buffer.from(app)).resize(size,size).png().toFile('public/icons/'+name);
await sharp(Buffer.from(grille)).resize(1280).png().toFile('outputs/home-refresh/grille-wide-preview.png');
