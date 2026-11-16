import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/affiliate/check/route";
import { GET } from "../app/go/[id]/route";
import { commercialRpc } from "../src/lib/commercial-api";
import { checkAffiliateDestination } from "../src/lib/affiliate-link-check";
vi.mock("../src/lib/commercial-api", () => ({ commercialRpc: vi.fn() }));
vi.mock("../src/lib/affiliate-link-check", () => ({
  checkAffiliateDestination: vi.fn(),
}));
const rpc = vi.mocked(commercialRpc);
const check = vi.mocked(checkAffiliateDestination);
const id = "ea340000-0000-4000-8000-000000000111";
const token = "a".repeat(40);
const context = { params: Promise.resolve({ id }) };
beforeEach(() => vi.resetAllMocks());
describe("commercial HTTP boundaries", () => {
  it("denies unauthenticated link checks before touching the database or destination", async () => {
    const response = await POST(
      new Request("https://e34lore.com/api/affiliate/check", {
        method: "POST",
        body: JSON.stringify({ linkId: id }),
      }),
    );
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
    expect(check).not.toHaveBeenCalled();
  });
  it("bounds streamed request bytes without relying on Content-Length", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(1001));
      },
      cancel,
    });
    const request = new Request("https://e34lore.com/api/affiliate/check", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body,
      duplex: "half",
    } as RequestInit);
    expect((await POST(request)).status).toBe(400);
    expect(cancel).toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("never checks a destination when the database rejects the role or MFA", async () => {
    rpc.mockRejectedValueOnce(
      new Error("Administrator permission and MFA required"),
    );
    const response = await POST(
      new Request("https://e34lore.com/api/affiliate/check", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: JSON.stringify({ linkId: id, url: "https://evil.example" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(check).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith(
      "affiliate_link_for_check",
      { target_link: id },
      token,
    );
  });
  it("checks only the saved allowlist and records its version with the owner session", async () => {
    rpc
      .mockResolvedValueOnce({
        id,
        url: "https://parts.example/item",
        allowed_hosts: ["parts.example"],
        updated_at: "2026-11-07T00:00:00Z",
      })
      .mockResolvedValueOnce(null);
    check.mockResolvedValueOnce("ok");
    const response = await POST(
      new Request("https://e34lore.com/api/affiliate/check", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: JSON.stringify({ linkId: id, url: "https://evil.example" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(check).toHaveBeenCalledWith("https://parts.example/item", [
      "parts.example",
    ]);
    expect(rpc).toHaveBeenLastCalledWith(
      "record_affiliate_link_check",
      {
        target_link: id,
        result_status: "ok",
        expected_updated_at: "2026-11-07T00:00:00Z",
      },
      token,
    );
  });
  it("ignores arbitrary redirect destinations and refuses withdrawn links", async () => {
    rpc.mockResolvedValueOnce(null);
    const response = await GET(
      new Request("https://e34lore.com/go/" + id + "?url=https://evil.example"),
      context,
    );
    expect(response.status).toBe(404);
    expect(response.headers.has("location")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("redirects only to the current approved host and counting failure does not break a link", async () => {
    rpc
      .mockResolvedValueOnce({
        url: "https://track.example/approved",
        allowed_host: "track.example",
      })
      .mockRejectedValueOnce(new Error("counter unavailable"));
    const response = await GET(
      new Request("https://e34lore.com/go/" + id + "?count=1"),
      context,
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://track.example/approved",
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(rpc.mock.calls[1][0]).toBe("record_affiliate_click");
  });
  it("refuses unsafe saved URLs and makes no count request without opt-in", async () => {
    rpc.mockResolvedValueOnce({
      url: "https://evil.example/steal",
      allowed_host: "track.example",
    });
    expect(
      (await GET(new Request("https://e34lore.com/go/" + id), context)).status,
    ).toBe(404);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
