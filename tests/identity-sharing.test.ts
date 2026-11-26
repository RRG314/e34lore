import { describe, it, expect } from "vitest";
import { usernameError, publicShareUrl } from "../src/domain/identity";

describe("member handles", () => {
  it("accepts chosen handles without exposing email identities", () => {
    expect(usernameError("alpine_525i")).toBeNull();
    for (const value of [
      "ab",
      "SomeOwner",
      "a@example.com",
      "_owner",
      "a".repeat(25),
      "moderator",
      "admin",
      "e34lore",
    ])
      expect(usernameError(value)).toBeTruthy();
  });
});
describe("public sharing boundary", () => {
  it("uses the canonical public host and preserves catalog state", () => {
    expect(
      publicShareUrl(
        "http://localhost:3002/parts/catalog?part=bmw-11511315559&drawing=11_1234&access_token=secret&next=/manage",
      ),
    ).toBe(
      "https://e34lore.com/parts/catalog?part=bmw-11511315559&drawing=11_1234",
    );
  });
  it("retains a specific reply and published journal anchor", () => {
    const thread =
      "/community/12345678-1234-1234-1234-123456789abc?reply=abc#post-abc";
    expect(publicShareUrl(thread)).toBe("https://e34lore.com" + thread);
    expect(publicShareUrl("/garages/owner/car#journal-abc")).toBe(
      "https://e34lore.com/garages/owner/car#journal-abc",
    );
  });
  it('shares E30 repair and manual links with their exact locations',()=>{
    expect(publicShareUrl('/e30/workshop?mode=repair&service=e30-air-cleaner&model_revision=1203&vehicle=private&scan=private'))
      .toBe('https://e34lore.com/e30/workshop?model_revision=1203&mode=repair&service=e30-air-cleaner');
    expect(publicShareUrl('/e30/manual/13?pdf=272')).toBe('https://e34lore.com/e30/manual/13?pdf=272');
    expect(publicShareUrl('/e30/repairs/e30-air-filter#owner-experience'))
      .toBe('https://e34lore.com/e30/repairs/e30-air-filter#owner-experience');
    expect(publicShareUrl('/e30/workshop/assets')).toBeNull();
  });
  it('shares public board context without including the visitor’s search text',()=>{
    const thread = '/community/12345678-1234-1234-1234-123456789abc';
    const redacted = '?reply=abc&series=e30&board=maintenance#post-abc';
    const input = thread+'?reply=abc&series=e30&board=maintenance&q=private%20search#post-abc';
    expect(publicShareUrl(input)).toBe('https://e34lore.com'+thread+redacted);
    expect(publicShareUrl(input,'http://127.0.0.1:3094')).toBe('http://127.0.0.1:3094'+thread+redacted);
  });
  it("preserves guide revisions and precise step anchors", () => {
    expect(
      publicShareUrl("/guides/cooling-inspection?revision=abc123#guide-step-4"),
    ).toBe(
      "https://e34lore.com/guides/cooling-inspection?revision=abc123#guide-step-4",
    );
  });
  it("refuses private and privileged routes", () => {
    for (const route of [
      "/account",
      "/garage",
      "/garage/abc",
      "/manage",
      "/admin",
      "/community/admin",
      "/community/settings",
      "/community/new",
      "/callback",
      "/signin-with-chatgpt",
    ])
      expect(publicShareUrl(route)).toBeNull();
  });
  it("strips unknown hashes, callbacks, emails and query secrets", () => {
    expect(
      publicShareUrl(
        "/repairs?email=secret@example.com&code=secret#access_token=secret",
      ),
    ).toBe("https://e34lore.com/repairs");
  });
});

// Contact references may contain context for staff; sharing the page drops it.
it("shares the support and roadmap pages without private context",()=>{
 expect(publicShareUrl('/support?reference=/account&email=private@example.test')).toBe('https://e34lore.com/support');
 expect(publicShareUrl('/roadmap?access_token=private')).toBe('https://e34lore.com/roadmap');
 expect(publicShareUrl('/manage/support?ticket=private')).toBeNull();
});
