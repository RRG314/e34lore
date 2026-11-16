// Serve-only bridge to the disposable review process. Absent from every production build.
import fs from "node:fs";
import path from "node:path";
import {networkInterfaces} from "node:os";
import {createHash} from "node:crypto";
import {readReviewWheels,reviewWheelFile,wheelAssets,wheelReceipt} from "../build-studio/review-wheels.mjs";
export function buildReview(command) {
  const enabled = process.env.E34_BUILD_REVIEW === "1";
  if (!enabled) return null;
  if (command !== "serve")
    throw Error("Disposable Build Studio review cannot be bundled for release");
  const filename = path.resolve("work/build-studio/review/backend.json");
  if (!fs.existsSync(filename))
    throw Error("Start the disposable database review first");
  const candidateRoot=path.resolve('work/525i-service-candidate');
  const candidateFile=path.join(candidateRoot,'release.json');
  const wheelModule='\0e34-local-wheel-packages';
  const candidateModule='\0e34-local-525i-candidate';
  const candidateEnabled=()=>fs.existsSync(candidateFile);
  const e30Root = path.resolve("work/e30/assets");
  const e30ReleaseFile = path.resolve("work/e30/release.json");
  const e30ArchivesFile = path.resolve("work/e30/releases.json");
  const e30ReferenceModule = "\0local-e30-reference";
  const fixtureOrigin = new URL(JSON.parse(fs.readFileSync(filename, "utf8")).url).origin;
  const lanHosts = new Set(Object.values(networkInterfaces()).flat()
    .filter(address => address.family === "IPv4" && !address.internal)
    .map(address => address.address + ":3012"));
  return {
    name: "e34-disposable-build-review",
    enforce: "pre",
    transform(code, id) {
      if (id.endsWith("/src/lib/backend.ts")) {
        const { url, publishableKey } = JSON.parse(fs.readFileSync(filename, "utf8"));
        return code.replace(
          "typeof __E34_BROWSER_BACKEND__ === \"undefined\" ? fallback : __E34_BROWSER_BACKEND__",
          "{mode:'local',url:(typeof window === 'undefined' ? " + JSON.stringify(new URL(url).origin) +
            " : window.location.origin)+'/__build-review',publishableKey:" + JSON.stringify(publishableKey) + "}",
        );
      }
      if (id.endsWith("/src/components/MemberCount.tsx"))
        return code.replace(" registered {current.count", " test {current.count");
      if (id.endsWith("/src/components/Shell.tsx"))
        return code.replace(
          "<AppRegistration />",
          '<aside className="local-review-banner">Local review · disposable test data. Sign in: studio-review@example.invalid · password: review-only. The live site is unchanged.</aside><AppRegistration />',
        );
    },
    resolveId(id, importer) {
      if (importer && id.endsWith('/local-e30-reference')) return e30ReferenceModule;
      if(importer&&id.endsWith('/local-wheel-packages'))return wheelModule;
      if(importer&&id.endsWith('/local-reference-candidate')&&candidateEnabled())return candidateModule;

    },
    load(id) {
      if (id === e30ReferenceModule) {
        const release = fs.existsSync(e30ReleaseFile) ? fs.readFileSync(e30ReleaseFile,"utf8").trim() : "null";
        const archives = fs.existsSync(e30ArchivesFile) ? fs.readFileSync(e30ArchivesFile,"utf8").trim() : "[]";
        return "export default " + release + "; export const localE30Variants = []; export const localE30Archives = " + archives + ";";
      }
      if(id===wheelModule){
        const e30Wheels=JSON.parse(fs.readFileSync('data/build-studio/e30-wheel-packages.json','utf8'));
        return 'export const localWheelPackages='+JSON.stringify([...readReviewWheels(),...e30Wheels])+';';
      }
      if(id===candidateModule){
        const release=JSON.parse(fs.readFileSync(candidateFile,'utf8'));
        const archives=JSON.parse(fs.readFileSync(path.join(candidateRoot,'releases.json'),'utf8'));
        const checks=archives.flatMap(review=>review.checks||[]);
        return 'export default '+JSON.stringify(release)+'; export const localGeometryChecks='+JSON.stringify(checks)+'; export const localReferenceArchives='+JSON.stringify(archives.map(review=>review.release))+';';
      }

    },
    configureServer(server){
      server.watcher.add([candidateFile,wheelReceipt,e30ReleaseFile]);
      server.watcher.on('change',file=>{
        const moduleId=path.resolve(file)===e30ReleaseFile?e30ReferenceModule:path.resolve(file)===candidateFile?candidateModule:path.resolve(file)===wheelReceipt?wheelModule:null;
        if(!moduleId)return;
        for(const environment of Object.values(server.environments)){
          const node=environment.moduleGraph?.getModuleById(moduleId);
          if(node)environment.moduleGraph.invalidateModule(node);
        }
        // New references are picked up on the next navigation/reload. Never
        // reload an in-progress photo capture merely because a model was built.
      });
      // Only hash-named generated files listed in this local receipt are served.
      // Source photos/manuals, editor files and arbitrary paths stay inaccessible.
      server.middlewares.use((req,res,next)=>{
        const url=new URL(req.url||'/', 'http://localhost').pathname;
        if (url === "/brand/e30-grille.svg" || /^\/catalog\/workshop\/e30-325i-(?:sedan-1989|coupe-1991)\/r[1-9]\d{3}\/[a-f0-9]{64}\.json$/.test(url) || /^\/models\/e30-lore\/(?:r[1-9]\d{3}|exterior-r1)\/(?:manifest\.)?[a-f0-9]{64}\.(?:json|glb)$/.test(url)) {
          if (!["GET","HEAD"].includes(req.method)) {res.writeHead(405).end();return;}
          try {
            const bytes=fs.readFileSync(e30Root+url);
            const digest=url.match(/([a-f0-9]{64})\.(?:glb|json)$/)?.[1];
            if (digest && createHash("sha256").update(bytes).digest("hex")!==digest) {res.writeHead(409).end();return;}
            res.setHeader("Content-Type",url.endsWith(".svg")?"image/svg+xml":url.endsWith(".glb")?"model/gltf-binary":"application/json");
            res.setHeader("Cache-Control","no-store");
            res.setHeader("X-Content-Type-Options","nosniff");
            res.end(req.method==="HEAD"?undefined:bytes);
          } catch {res.writeHead(404).end();}
          return;
        }
        if(url.startsWith('/models/e34-build-review/wheels/')){
          const asset=wheelAssets(readReviewWheels()).find(entry=>entry.url===url);
          if(!asset){res.statusCode=404;res.end();return;}
          try{
            const bytes=reviewWheelFile(asset);
            res.setHeader('Content-Type','model/gltf-binary');
            res.setHeader('X-Content-Type-Options','nosniff');
            res.setHeader('Cache-Control','no-store');
            res.end(req.method==='HEAD'?undefined:bytes);
          }catch{res.statusCode=409;res.end('Local wheel receipt mismatch');}
          return;
        }
        if(!candidateEnabled())return next();
        const version=/^\/models\/e34-lore\/r(\d+)\//.exec(url);
        if(!version||Number(version[1])<1000)return next();
        const archives=JSON.parse(fs.readFileSync(path.join(candidateRoot,'releases.json'),'utf8'));
        const entry=archives.filter(review=>review.localOnly&&String(review.release.revision)===version[1]).flatMap(review=>review.files).find(file=>file.url===url);
        if(!entry||! /^(?:manifest\.)?[a-f0-9]{64}\.(?:json|glb|png)$/.test(entry.file)){res.statusCode=404;res.end();return;}
        const bytes=fs.readFileSync(path.join(candidateRoot,entry.file));
        if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256){res.statusCode=409;res.end('Local candidate receipt mismatch');return;}
        res.setHeader('Content-Type',entry.type);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
        res.end(req.method==='HEAD'?undefined:bytes);
      });
    },
    config() {
      return {
        server: {
          fs:{deny:['**/docs/**']},
          proxy: {
            "/__build-review": {
              target: "http://127.0.0.1:54431",
              rewrite: (p) => p.replace(/^\/__build-review/, ""),
              configure(proxy) {
                proxy.on("proxyReq", (outbound, incoming) => {
                  const { host, origin } = incoming.headers;
                  // The loopback fixture trusts its own address. Forward only
                  // matching origins from this Mac's LAN addresses as that origin.
                  if (lanHosts.has(host) && origin === "http://" + host) {
                    outbound.setHeader("Origin", fixtureOrigin);
                  }
                });
              },
            },
          },
        },
      };
    },
  };
}
