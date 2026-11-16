import { writeFile, mkdir } from "node:fs/promises";
const fingerprints = process.argv.slice(2).map((s) => s.toUpperCase());
if (
  !fingerprints.length ||
  fingerprints.some((s) => !/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s))
)
  throw new Error(
    "Supply the Play app-signing SHA-256 fingerprint(s), colon-separated. These are public certificates, not passwords.",
  );
const dir = new URL("../public/.well-known/", import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(
  new URL("assetlinks.json", dir),
  JSON.stringify(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.e34lore.app",
          sha256_cert_fingerprints: [...new Set(fingerprints)],
        },
      },
    ],
    null,
    2,
  ) + "\n",
);
console.log(
  "Wrote Digital Asset Links for com.e34lore.app. Publish and verify against the Play app-signing certificate.",
);
