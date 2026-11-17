import vinext from "vinext";
import {scannerRuntimeDev} from "./scripts/vite/scanner-runtime-plugin";
import {e30ReleasePlugin} from "./scripts/vite/e30-release-plugin.mjs";
import {local525iFit} from "./scripts/vite/525i-fit-preview-plugin.mjs";
import{buildReview}from"./scripts/vite/build-review-plugin.mjs";
import { defineConfig, loadEnv } from "vite";
import { existsSync, readFileSync } from "node:fs";
import { readExecutionProfile } from "./scripts/execution-profile.mjs";
import { configureToolEnvironment } from "./scripts/tool-environment.mjs";
import { sites } from "./scripts/vite/sites-vite-plugin";
import { connectorPreview } from "./scripts/vite/connector-preview-plugin.mjs";
import { immutableAssetAliases } from "./scripts/ip/immutable-asset-aliases.mjs";
import { siteBackend, siteContent } from "./scripts/site-content.mjs";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const hostingFile = new URL("./.openai/hosting.json", import.meta.url);
const { d1, r2 }: { d1?: string | null; r2?: string | null } =
  existsSync(hostingFile) ? JSON.parse(readFileSync(hostingFile, "utf8")) : {};

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const managedLinux = readExecutionProfile() === "managed-linux";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async ({ command, mode }) => {
  configureToolEnvironment(process.cwd());

  const env = loadEnv(mode, process.cwd(), ["NEXT_PUBLIC_SUPABASE_", "E34_SITE_MODE"]);
  const content = siteContent();
  const browserBackend = siteBackend(env, content, command);

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    publicDir: content.publicDir,
    cacheDir: "work/vite-cache",
    define: {
      __E34_BROWSER_BACKEND__: JSON.stringify(browserBackend),
      __E34_DEMO_ASSETS__: JSON.stringify(!content.release),
      ...(!content.release ? {"import.meta.env.E34_E30_BUILD": "true"} : {}),
      __IMMUTABLE_ASSET_ALIASES__: JSON.stringify(command === "build" && content.release && process.env.E34_E30_BUILD === "1"
        ? immutableAssetAliases(content.publicDir) : {}),
    },
    server: {
      fs: {
        deny: [
          ".env", ".env.*", "*.{crt,pem,key,p12,pfx,cer,der}", ".npmrc", ".yarnrc.yml",
          "**/.git/**", "**/.openai/**", "**/private/**", "**/work/**", "**/outputs/**",
          "**/database/**", "**/supabase/migrations/**",
          "**/supabase/functions/*/index.ts", "**/data/ip/quarantine/**",
        ],
      },
      ...(managedLinux
        ? { host: "0.0.0.0", allowedHosts: ["terminal.local"] }
        : {}),
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    // Scanner is capture-and-analyze on WASM; exclude unused WebGPU/WebNN variants
    // (their 25.6 MiB assets exceed the existing Workers asset limit).
    resolve: {
      alias: [
        {
          find: "onnxruntime-web/webgpu",
          replacement: new URL(
            "./node_modules/onnxruntime-web/dist/ort.wasm.min.mjs",
            import.meta.url,
          ).pathname,
        },
      ],
    },
    worker: {
      format: "es" as const,
      plugins: () => [
        {
          name: "e34-worker-environment-guards",
          enforce: "pre" as const,
          // Vinext folds `typeof window` to "object" in client builds. Dedicated
          // workers have no window; preserve Transformers' real worker detection.
          transform(code: string, id: string) {
            if (
              id
                .replaceAll("\\", "/")
                .includes("/@huggingface/transformers/dist/transformers.web.js")
            )
              return {
                code: code.replaceAll(
                  "typeof window",
                  "typeof globalThis.window",
                ),
                map: null,
              };
          },
        },
      ],
    },
    plugins: [buildReview(command), content.release && local525iFit(command), content.release && e30ReleasePlugin(command, content.publicDir),
      scannerRuntimeDev(content.publicDir, content.release),
      vinext(),
      sites({ mockAuth: !managedLinux && browserBackend.mode !== "demo" }),
      browserBackend.mode !== "demo" && connectorPreview(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          ...localBindingConfig,
          ...(command === "serve" && browserBackend.mode !== "demo"
            ? {
                services: [
                  {
                    binding: "CONNECTORS",
                    service: "sites-connector-preview",
                    entrypoint: "ConnectorPreview",
                  },
                ],
              }
            : {}),
        },
        ...(command === "serve" && browserBackend.mode !== "demo"
          ? {
              auxiliaryWorkers: [
                {
                  config: {
                    name: "sites-connector-preview",
                    main: "./scripts/connector-preview/worker.mjs",
                    compatibility_date: "2026-05-15",
                  },
                },
              ],
            }
          : {}),
      }),
    ],
  };
});
