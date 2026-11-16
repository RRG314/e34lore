import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { loadReference } from '../src/digital-twin/public/load-reference';
import { boundedModelBytes } from '../src/graphics/bounded-model-bytes';
import release from '../data/digital-twin/public-reference.json';
import photos from '../src/data/hero-photos.json';
import e30Photos from '../src/data/e30-hero-photos.json';
import { seriesDefinitions } from '../src/series/registry';
afterEach(() => vi.unstubAllGlobals());
describe('shared homepage workshop reference', () => {
    it('reads packed geometry and rejects data that expands past its declared length', async () => {
        const payload = Buffer.alloc(4096, 7);
        const packed = Uint8Array.from(gzipSync(payload));
        const bytes = await boundedModelBytes(new Response(packed), payload.length);
        expect(Buffer.from(bytes)).toEqual(payload);
        await expect(boundedModelBytes(new Response(packed), payload.length - 1)).rejects.toThrow('too large');
    });
    it('loads the exact same pinned model as the full reader', async () => { const bytes = fs.readFileSync('public' + release.manifestUrl); expect(createHash('sha256').update(bytes).digest('hex')).toBe(release.sha256); vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes))); const m = await loadReference(new AbortController().signal); expect(m.revision).toBe(release.revision); expect(m.nodes.filter(n => n.assetId)).toHaveLength(release.renderableCount); });
    it('rejects changed manifest bytes even when the claimed ID/revision stays the same', async () => { const bytes = fs.readFileSync('public' + release.manifestUrl, 'utf8') + ' '; vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes))); await expect(loadReference(new AbortController().signal)).rejects.toThrow('version'); });
    it('retains real licensed image sources for the expanded reel', () => { expect(photos.length).toBeGreaterThanOrEqual(6); expect(new Set(photos.map(p => p.id)).size).toBe(photos.length); for (const p of photos) {
        expect(fs.statSync('public' + p.localPath).size).toBeGreaterThan(10000);
        expect(p.filePageUrl).toMatch(/^https:\/\/commons.wikimedia.org\/wiki\/File/);
        expect(p.licenseUrl).toMatch(/^https:\/\/creativecommons.org\//);
        expect(p.creator).toBeTruthy();
    } });
    it('provides a canonical phone installation QR and valid grille app icons', () => { expect(fs.readFileSync('public/assets/e34-lore-install-qr.svg', 'utf8')).toContain('<svg'); const manifest: {shortcuts:{url:string}[];icons:{src:string;sizes:string}[]} = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8')); expect(manifest.shortcuts.map((s) => s.url)).toContain('/workshop'); expect(manifest.shortcuts.map((s) => s.url)).toContain('/quick-reference'); for (const i of manifest.icons) {
        expect(i.src).toContain('grille');
        const b = fs.readFileSync('public' + i.src);
        expect(b.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
        expect(b.readUInt32BE(16)).toBe(Number(i.sizes.split('x')[0]));
    } });
    it('provides a separate E30 reel with Touring photos and redistribution credits', () => {
        const e30Models = seriesDefinitions.e30.models.map(model => model.id);
        expect(e30Photos.length).toBeGreaterThanOrEqual(6);
        expect(e30Photos.filter(photo => photo.bodyStyle === 'Touring').length).toBeGreaterThanOrEqual(2);
        expect(new Set(e30Photos.map(photo => photo.id)).size).toBe(e30Photos.length);
        for (const photo of e30Photos) {
            expect(e30Models).toContain(photo.model);
            expect(fs.statSync('public' + photo.localPath).size).toBeGreaterThan(10000);
            expect(photo.filePageUrl).toMatch(/^https:\/\/commons.wikimedia.org\/wiki\/File:/);
            expect(photo.creator).toBeTruthy();
            expect(photo.changes).toBeTruthy();
            if (photo.license === 'Public domain') {
                expect(photo.licenseUrl).toBe(photo.filePageUrl);
            } else {
                expect(photo.licenseUrl).toMatch(/^https:\/\/creativecommons.org\/(licenses\/by(?:-sa)?\/|publicdomain\/zero\/)/);
            }
        }
    });
});
