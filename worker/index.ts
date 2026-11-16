import handler from "vinext/server/fetch-handler";
import { secureResponse } from "./security";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

declare const __IMMUTABLE_ASSET_ALIASES__: Readonly<Record<string, string>>;

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const pathname = new URL(request.url).pathname;
    const asset = __IMMUTABLE_ASSET_ALIASES__[pathname];
    if (asset && (request.method === "GET" || request.method === "HEAD")) {
      return secureResponse(request, new Response(null, {
        status: 308,
        headers: { Location: asset, "Cache-Control": "public, max-age=31536000, immutable" },
      }));
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const response = await runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    return secureResponse(request, response);
  },
};

export default worker;
