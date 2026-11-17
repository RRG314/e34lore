import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function siteContent() {
  const configured = process.env.E34_ASSET_PACK;
  if (!configured) return { publicDir: resolve("public"), assetIndex: resolve("data/ip/public-assets.json"), release: false };
  const root = resolve(configured);
  const publicDir = resolve(root, "public");
  const assetIndex = resolve(root, "public-assets.json");
  if (!existsSync(publicDir) || !existsSync(assetIndex)) {
    throw new Error("E34_ASSET_PACK must point to a directory with public/ and public-assets.json.");
  }
  return { publicDir, assetIndex, catalogResearch: resolve(root, "catalog-research"), release: true };
}

export function siteBackend(env, content, command) {
  const mode = env.E34_SITE_MODE || "demo";
  if (!["demo", "local", "production"].includes(mode)) {
    throw new Error("Set E34_SITE_MODE to demo, local, or production.");
  }
  if (mode === "demo") {
    return { mode, url: "https://demo.invalid", publishableKey: "demo-read-only" };
  }
  if (mode === "production" && (command !== "build" || !content.release)) {
    throw new Error("A production build requires the release asset pack. Use demo or local mode for development.");
  }
  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321");
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      (mode === "local" ? !loopback || !["http:", "https:"].includes(url.protocol)
        : loopback || url.protocol !== "https:")) {
    throw new Error("Use a loopback HTTP(S) origin in local mode or an explicit HTTPS origin in production.");
  }
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  let legacyAnon = false;
  if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(key)) {
    try {
      legacyAnon = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "anon";
    } catch {
      // An invalid key is rejected without logging its contents.
    }
  }
  if (!legacyAnon && !/^sb_publishable_[\w-]+$/.test(key)) {
    throw new Error("Supply a Supabase publishable key or legacy anonymous key.");
  }
  return { mode, url: url.origin, publishableKey: key };
}
