/** Export cleared, read-only runtime content from the retained reconstruction workspace.
 * No local API, editor, private source, absolute path or account data is published. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Matrix4, Vector3, Quaternion } from 'three';
import type {ReferenceModel,ReferenceNode,Vec} from '../src/digital-twin/public/model';
type StudioAsset={id:string;benchOnly:boolean;redistribution:'allowed'|'restricted'|'unknown';sha256:string|null;bytes:number};
type StudioInstance=Pick<ReferenceNode,'id'|'name'|'parentId'|'kind'|'systemIds'|'assetId'|'meshNames'|'bounds'|'internal'|'canonicalId'|'oem'|'guideIds'>&{view:'vehicle'|'bench'|'registry';pose:{position:Vec;quaternion:[number,number,number,number];scale:Vec}};
type StudioManifest={id:string;revision:number;assets:StudioAsset[];instances:StudioInstance[]};
type AssembledBuild={assets:{id:string;rows:{id:string;meshName:string}[]}[]};
const studio = process.argv[2];
if (!studio)
    throw Error('Pass the absolute reconstruction workspace path');
const m:StudioManifest = JSON.parse(await fs.readFile(path.join(studio, 'data/studio-manifest.json'), 'utf8')), paths:Record<string,string> = JSON.parse(await fs.readFile(path.join(studio, 'data/model-paths.local.json'), 'utf8')), thumbnails:Record<string,string> = JSON.parse(await fs.readFile(path.join(studio, 'workspace/thumbnails/index.json'), 'utf8'));
const digest = (b: Uint8Array) => crypto.createHash('sha256').update(b).digest('hex');
const folder = 'public/models/e34-lore/r' + m.revision, base = '/models/e34-lore/r' + m.revision;
await fs.mkdir(folder, { recursive: true });
async function immutable(file: string, bytes: Uint8Array) { try {
    const previous = await fs.readFile(file);
    if (digest(previous) !== digest(bytes))
        throw Error('Cannot overwrite immutable asset ' + file);
}
catch (e: unknown) {
    if (!(e instanceof Error && 'code' in e && e.code === 'ENOENT'))
        throw e;
    await fs.writeFile(file, bytes, { flag: 'wx' });
} }
const assets:ReferenceModel['assets'] = [];
for (const a of m.assets.filter((a) => a.id.startsWith('assembled:') && !a.benchOnly)) {
    if (a.redistribution !== 'allowed')
        throw Error('Uncleared runtime asset ' + a.id);
    const b = await fs.readFile(paths[a.id]);
    if (digest(b) !== a.sha256 || b.length !== a.bytes || b.length > 8 * 1024 * 1024)
        throw Error('Invalid runtime receipt ' + a.id);
    const name = a.sha256 + '.glb';
    await immutable(folder + '/' + name, b);
    assets.push({ id: a.id, url: base + '/' + name, bytes: b.length, sha256: a.sha256! });
}
const active = new Set<string|null>(assets.map(a => a.id)), byId = new Map<string, StudioInstance>(m.instances.map((n) => [n.id, n])), keep = new Set<string>();
for (const n of m.instances)
    if (n.kind === 'system' || n.view === 'vehicle' && active.has(n.assetId)) {
        let p:StudioInstance|undefined = n;
        while (p) {
            keep.add(p.id);
            p = p.parentId?byId.get(p.parentId):undefined;
        }
    }
function world(id: string): Matrix4 { const n = byId.get(id)!, p = n.pose, local = new Matrix4().compose(new Vector3(...p.position), new Quaternion(...p.quaternion), new Vector3(...p.scale)); return n.parentId ? world(n.parentId).multiply(local) : local; }
const build:AssembledBuild = JSON.parse(await fs.readFile(path.join(studio, 'data/assembled-build.json'), 'utf8'));
const nodes:ReferenceNode[] = [];
for (const n of m.instances.filter((n) => keep.has(n.id))) {
    let thumbnail = null;
    if (n.assetId && active.has(n.assetId)) {
        const row = build.assets.find((a) => a.id === n.assetId)?.rows.find((r) => n.meshNames.includes(r.meshName));
        const thumb = thumbnails[n.id] || (row?thumbnails[row.id]:undefined);
        if (!thumb)
            throw Error('Missing thumbnail ' + n.id);
        const b = await fs.readFile(path.join(studio, 'workspace/thumbnails', thumb));
        const name = digest(b) + '.png';
        await immutable(folder + '/' + name, b);
        thumbnail = base + '/' + name;
    }
    nodes.push({ id: n.id, name: n.name, parentId: n.parentId, kind: n.kind, systemIds: n.systemIds, assetId: active.has(n.assetId) ? n.assetId : null, meshNames: n.meshNames, matrix: world(n.id).toArray(), bounds: n.bounds, internal: !!n.internal, canonicalId: n.canonicalId, oem: n.oem, guideIds: n.guideIds, thumbnail });
}
const data = { schemaVersion: 1, id: m.id, revision: m.revision, reference: '1995 BMW 525i Sedan · M50TU', assets, nodes, credit: { author: 'UVZZZ / Silbergrau', url: 'https://sketchfab.com/3d-models/bmw-525i-e34-project-zomboid-c65aa3b7687d4f5dbbabdfad0b7816bb', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' }, limits: 'Visual reference. Exact vehicle applicability, factory dimensions and internal clearances remain unverified.' };
const bytes = Buffer.from(JSON.stringify(data)), hash = digest(bytes), file = 'manifest.' + hash + '.json';
await immutable(folder + '/' + file, bytes);
const studioCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: studio, encoding: 'utf8' }).trim();
await fs.writeFile('data/digital-twin/public-reference.json', JSON.stringify({ id: data.id, revision: data.revision, manifestUrl: base + '/' + file, sha256: hash, renderableCount: nodes.filter(n => n.assetId).length, assetBytes: assets.reduce((s, a) => s + a.bytes, 0), studioCommit }, null, 2) + '\n');
console.log({ revision: m.revision, nodes: nodes.length, renderables: nodes.filter(n => n.assetId).length, assetBytes: assets.reduce((s, a) => s + a.bytes, 0), manifestBytes: bytes.length });
