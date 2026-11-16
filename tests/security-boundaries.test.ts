import { describe, it, expect, vi } from "vitest";
import { boundedBody, activeVerifiedSession } from "../supabase/functions/_shared/request.mjs";
import { secureResponse } from "../worker/security";
describe("bounded request streams", () => {
  const request = (stream: ReadableStream, extra: RequestInit = {}) => new Request("https://test/", {method:"POST",body:stream,duplex:"half",...extra} as RequestInit);
  it("cancels chunked bodies as soon as the byte limit is crossed", async () => {
    const cancel=vi.fn(); const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(3));c.enqueue(new Uint8Array(3));},cancel});
    await expect(boundedBody(request(stream),5)).rejects.toMatchObject({status:413}); expect(cancel).toHaveBeenCalled();
  });
  it("does not wait forever for an unfinished upload", async () => {
    const cancel=vi.fn(); const stream=new ReadableStream({cancel});
    await expect(boundedBody(request(stream),5,15)).rejects.toMatchObject({status:408}); expect(cancel).toHaveBeenCalled();
  });
  it("cancels on connection abort", async () => {
    const controller=new AbortController(); const stream=new ReadableStream({});
    const result=boundedBody(request(stream,{signal:controller.signal}),5); controller.abort();
    await expect(result).rejects.toMatchObject({status:408});
  });
  it("accepts exactly the declared budget", async () => {
    const r=new Request("https://test",{method:"POST",body:"hello",headers:{"content-length":"5"}});
    expect(new TextDecoder().decode(await boundedBody(r,5))).toBe("hello");
  });
});
it("cannot substitute another user's session claim", async () => {
  const admin={rpc:vi.fn()};
  const token="a."+Buffer.from(JSON.stringify({sub:"victim",session_id:"e3400000-0000-4000-8000-000000000111"})).toString("base64url")+".b";
  expect(await activeVerifiedSession(admin,token,"attacker")).toBe(false); expect(admin.rpc).not.toHaveBeenCalled();
});
describe("response security", () => {
  it("loads public traffic analytics on production documents only", () => {
    const append = vi.fn();
    class TestHTMLRewriter {
      on(_name: string, handler: {element: (head: {append: typeof append}) => void}) {
        handler.element({append});
        return this;
      }
      transform(response: Response) { return response; }
    }
    vi.stubGlobal("HTMLRewriter", TestHTMLRewriter);
    const response = () => new Response("<head></head>", {headers: {"Content-Type":"text/html; charset=utf-8"}});
    try {
      for (const path of ["/", "/?source=app", "/workshop", "/e30/workshop"]) {
        const result = secureResponse(new Request("https://e34lore.com" + path), response());
        expect(result.headers.get("Content-Security-Policy")).toContain("https://cloudflareinsights.com/cdn-cgi/rum");
        expect(append).toHaveBeenLastCalledWith(expect.stringContaining('"spa":false'), {html: true});
      }
      append.mockClear();
      for (const path of ["/scanner", "/e30/scanner", "/garage", "/account", "/manage/analytics", "/community/private-thread", "/workshop?configuration_revision=private"]) {
        const result = secureResponse(new Request("https://e34lore.com" + path), response());
        expect(result.headers.get("Content-Security-Policy")).not.toContain("cloudflareinsights.com");
      }
      secureResponse(new Request("http://localhost:3094/"), response());
      secureResponse(new Request("https://e34lore.com/"), new Response("flight", {headers: {"Content-Type":"text/x-component"}}));
      expect(append).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("preserves streamed responses, cookies and status while preventing private caching", async () => {
    const source=new Response("stream body",{status:202,headers:{"Set-Cookie":"test=value; Secure; HttpOnly","Cache-Control":"public, max-age=3600","X-Powered-By":"test"}});
    const r=secureResponse(new Request("https://e34lore.com/manage"),source);
    expect(r.status).toBe(202); expect(await r.text()).toBe("stream body");
    expect(r.headers.get("Set-Cookie")).toContain("HttpOnly"); expect(r.headers.get("Cache-Control")).toBe("private, no-store");
    expect(r.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(r.headers.get("Content-Security-Policy")).not.toContain("'unsafe-eval'");
    expect(r.headers.get("Content-Security-Policy")).toContain("connect-src 'self' blob:");
    expect(r.headers.get("X-Powered-By")).toBeNull(); expect(r.headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
  });
  it("retains public caching and a stronger referrer policy; omits HSTS on HTTP previews", () => {
    const r=secureResponse(new Request("http://localhost:4379/parts/catalog"),new Response(null,{status:304,headers:{"Cache-Control":"public, max-age=60","Referrer-Policy":"no-referrer"}}));
    expect(r.status).toBe(304); expect(r.headers.get("Cache-Control")).toBe("public, max-age=60"); expect(r.headers.get("Referrer-Policy")).toBe("no-referrer"); expect(r.headers.get("Strict-Transport-Security")).toBeNull();
  });
});
