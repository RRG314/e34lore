import backend from "../src/lib/backend";

const backendUrl = new URL(backend.url);
const backendSocket = new URL(backendUrl);
backendSocket.protocol = backendUrl.protocol === "https:" ? "wss:" : "ws:";

const trafficScript = "https://static.cloudflareinsights.com/beacon.min.js";
const trafficEndpoint = "https://cloudflareinsights.com/cdn-cgi/rum";
// This token identifies the public Web Analytics site. It grants no dashboard access.
const trafficSettings = JSON.stringify({token: "84d22f9b794c4c66bc73866bdf077b4e", spa: false});
const publicTrafficPages = new Set([
  "/", "/workshop", "/parts", "/parts/catalog", "/repairs", "/electrical",
  "/quick-reference", "/manual", "/encyclopedia", "/resources", "/community",
  "/app",
]);

/** Applied at the response boundary, including errors and streamed RSC replies. */
export function secureResponse(request: Request, response: Response): Response {
  // WebSocket upgrade responses cannot be cloned with the standard constructor.
  if (response.status === 101) return response;
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  if (!headers.has("Referrer-Policy")) headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/e[0-9]{2}(?=\/|$)/, "") || "/";
  const publicPath = url.pathname.replace(/^\/e30(?=\/|$)/, "").replace(/\/$/, "") || "/";
  const measureTraffic = typeof HTMLRewriter !== "undefined" &&
    url.origin === "https://e34lore.com" && request.method === "GET" &&
    (url.search === "" || (publicPath === "/" && url.search === "?source=app") ||
      (publicPath === "/parts/catalog" && /^\?part=bmw-\d{11}$/.test(url.search))) &&
    (publicTrafficPages.has(publicPath) || /^\/(?:guides|manual|quick-reference|models|articles|repairs)\/[a-z0-9-]{1,100}$/.test(publicPath)) &&
    response.status === 200 &&
    /^text\/html(?:;|$)/i.test(headers.get("Content-Type") || "");
  if (url.protocol === "https:") headers.set("Strict-Transport-Security", "max-age=31536000");
  // Vinext streams inline bootstrap/RSC scripts; a nonce migration is separate.
  // WASM supports the existing model decoders without enabling JS string eval.
  // Only scanner documents and their own bundled inference worker download model data.
  // Captured pixels never leave the browser. No cross-origin executable scripts are allowed.
  const inferenceSources=/^\/scanner(?:\/|$)|^\/_next\/static\/workers\//.test(pathname)?" https://huggingface.co https://*.hf.co":"";
  const vinSource=/^\/garage\/(?:configuration|vins)\/?$/.test(pathname)?" https://vpic.nhtsa.dot.gov":"";
  headers.set("Content-Security-Policy", [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'" + (measureTraffic ? " " + trafficScript : ""),
    "style-src 'self' 'unsafe-inline'", "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    // GLTF ImageBitmapLoader fetches embedded GLB textures through object URLs.
    "connect-src 'self' blob: "+backendUrl.origin+" "+backendSocket.origin+inferenceSources+vinSource+(measureTraffic ? " " + trafficEndpoint : ""),
    "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://sketchfab.com",
    "worker-src 'self' blob:", "manifest-src 'self'",
    "form-action 'self' "+backendUrl.origin,
  ].join("; "));
  if (/^\/(account|garage|manage|admin|api)(\/|$)/.test(pathname) || /^\/community\/(settings|admin|new)(\/|$)/.test(pathname) || /^\/scanner(\/|$)/.test(pathname) || /^\/workshop\/(assets|private|inspections|repair)(\/|$)/.test(pathname)) {
    headers.set("Cache-Control", "private, no-store");
    headers.set("CDN-Cache-Control", "no-store");
  }
  headers.delete("X-Powered-By");
  const secured = new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  if (!measureTraffic) return secured;
  return new HTMLRewriter().on("head", {
    element(head) {
      head.append(`<script type="module" src="${trafficScript}" data-cf-beacon='${trafficSettings}' referrerpolicy="origin"></script>`, {html: true});
    },
  }).transform(secured);
}
