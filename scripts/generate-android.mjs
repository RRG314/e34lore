import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
const require = createRequire(
  new URL("../android/package.json", import.meta.url),
);
const { TwaManifest, TwaGenerator, ConsoleLog } = require("@bubblewrap/core");
const config = JSON.parse(
  await readFile(
    new URL("../android/twa-manifest.json", import.meta.url),
    "utf8",
  ),
);
if (config.host !== "e34lore.com" || config.packageId !== "com.e34lore.app")
  throw new Error("Unexpected Android application identity");
// Generate icon resources from owned local public files; no access token or
// private Site response is sent to the generator or saved in Android source.
const server = createServer(async (req, res) => {
  if (
    ![
      "/icons/e34-512.png",
      "/icons/e34-maskable-512.png",
      "/manifest.webmanifest",
    ].includes(req.url)
  ) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader(
    "Content-Type",
    req.url.endsWith(".png") ? "image/png" : "application/manifest+json",
  );
  res.end(await readFile(new URL("../public" + req.url, import.meta.url)));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
try {
  const local = {
    ...config,
    webManifestUrl: origin + "/manifest.webmanifest",
    iconUrl: origin + "/icons/e34-512.png",
    maskableIconUrl: origin + "/icons/e34-maskable-512.png",
  };
  const manifest = new TwaManifest(local);
  const invalid = manifest.validate();
  if (invalid) throw new Error(invalid);
  const target = fileURLToPath(new URL("../android/project", import.meta.url));
  await mkdir(target, { recursive: true });
  await new TwaGenerator().createTwaProject(
    target,
    manifest,
    new ConsoleLog("E34 Android"),
  );
  const rootGradle = await readFile(target + "/build.gradle", "utf8");
  await writeFile(
    target + "/build.gradle",
    rootGradle.replaceAll("jcenter()", "mavenCentral()"),
  );
  const gradle = await readFile(target + "/app/build.gradle", "utf8");
  await writeFile(
    target + "/app/build.gradle",
    gradle.replaceAll(origin + "/manifest.webmanifest", config.webManifestUrl),
  );
  await writeFile(
    target + "/twa-manifest.json",
    JSON.stringify(config, null, 2) + "\n",
  );
  console.log(
    "Generated com.e34lore.app Android project. Review signing and Digital Asset Links before release.",
  );
} finally {
  server.close();
}
