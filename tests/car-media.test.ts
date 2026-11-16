import { describe, it, expect, vi } from "vitest";
import jpeg from "jpeg-js";
import { sanitizeJpeg } from "../supabase/functions/car-media/image.mjs";
import { carMedia } from "../supabase/functions/car-media/core.mjs";
import { usageArea } from "../src/domain/usage";
describe("car photo normalization", () => {
  it("decodes pixels and discards comments and appended payloads", () => {
    const original = jpeg.encode(
      {
        width: 4,
        height: 3,
        data: Buffer.alloc(4 * 3 * 4, 220),
        comments: ["GPS PRIVATE-MARKER"],
      },
      85,
    ).data;
    const input = Buffer.concat([
      original,
      Buffer.from("<script>PRIVATE-MARKER</script>"),
    ]);
    const output = sanitizeJpeg(input, jpeg);
    expect(output.width).toBe(4);
    expect(output.height).toBe(3);
    expect(Buffer.from(output.bytes).toString()).not.toContain(
      "PRIVATE-MARKER",
    );
    expect(jpeg.decode(output.bytes).width).toBe(4);
    expect([...output.bytes.slice(-2)]).toEqual([255, 217]);
  });
  it("rejects malformed, oversized and overdimensioned images", () => {
    expect(() =>
      sanitizeJpeg(new Uint8Array([255, 216, 1, 2, 3]), jpeg),
    ).toThrow();
    expect(() =>
      sanitizeJpeg(new Uint8Array(2 * 1024 * 1024 + 1), jpeg),
    ).toThrow();
    const bytes = jpeg.encode(
      { width: 1601, height: 1, data: Buffer.alloc(1601 * 4, 200) },
      70,
    ).data;
    expect(() => sanitizeJpeg(bytes, jpeg)).toThrow("dimensions");
  });
});
describe("photo service authentication and request boundaries", () => {
  const setup = () => ({
    admin: {
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              id: "ed340000-0000-4000-8000-000000000901",
              email_confirmed_at: "2026-01-01",
            },
          },
          error: null,
        })),
      },
    },
    userClient: vi.fn(),
    codec: jpeg,
    origins: ["https://e34lore.com"],
  });
  it("denies anonymous and unapproved origins before touching storage", async () => {
    const d = setup();
    const a = await carMedia(
      new Request("https://test/photo", { method: "POST" }),
      d,
    );
    expect(a.status).toBe(401);
    expect(d.admin.auth.getUser).not.toHaveBeenCalled();
    const b = await carMedia(
      new Request("https://test/photo", {
        method: "POST",
        headers: { origin: "https://evil.test", authorization: "Bearer test" },
      }),
      d,
    );
    expect(b.status).toBe(403);
  });
  it("checks the token with Auth instead of trusting a supplied actor", async () => {
    const d = setup();
    const r = await carMedia(
      new Request("https://test/photo", {
        method: "POST",
        headers: {
          authorization: "Bearer expired",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          photo: "not-a-uuid",
          user_id: "victim",
        }),
      }),
      d,
    );
    expect(d.admin.auth.getUser).toHaveBeenCalledWith("expired");
    expect(r.status).toBe(400);
  });
  it("bounds a body without a declared content length", async () => {
    const d = setup();
    const r = await carMedia(
      new Request("https://test/photo", {
        method: "POST",
        headers: {
          authorization: "Bearer valid",
          "Content-Type": "multipart/form-data; boundary=test",
        },
        body: new Uint8Array(2 * 1024 * 1024 + 16385),
      }),
      d,
    );
    expect(r.status).toBe(413);
  });
  it("bounds JSON before parsing it", async () => {
    const d = setup();
    const r = await carMedia(
      new Request("https://test/photo", {
        method: "POST",
        headers: {
          authorization: "Bearer valid",
          "Content-Type": "application/json",
        },
        body: "x".repeat(1025),
      }),
      d,
    );
    expect(r.status).toBe(413);
  });
  it("rejects a spoofed filename or unconfirmed rights", async () => {
    const d = setup();
    const f = new FormData();
    f.set(
      "photo",
      new Blob(["not jpeg"], { type: "image/svg+xml" }),
      "car.jpg",
    );
    f.set("vehicle", "ed340000-0000-4000-8000-000000000901");
    const r = await carMedia(
      new Request("https://test/photo", {
        method: "POST",
        headers: { authorization: "Bearer valid" },
        body: f,
      }),
      d,
    );
    expect(r.status).toBe(400);
  });
});
it("excludes private routes and query strings from analytics", () => {
  expect(usageArea("/account")).toBeNull();
  expect(usageArea("/garage")).toBeNull();
  expect(usageArea("/manage")).toBeNull();
  expect(usageArea("/community/new?email=private")).toBeNull();
  expect(usageArea("/search?q=private")).toBeNull();
  expect(usageArea("/community/some-id?secret=not-sent")).toBe("community");
  expect(usageArea("/workshop/assets")).toBeNull();
  expect(usageArea("/community/cars")).toBe("cars");
  expect(usageArea("/manual/610")).toBe("manual");
});
describe("photo processing reservations",()=>{
  const formRequest=()=>{
    const f=new FormData();f.set("photo",new Blob([new Uint8Array([255,216,0,0])],{type:"image/jpeg"}),"car.jpg");
    f.set("vehicle","ed340000-0000-4000-8000-000000000901");f.set("rights","true");f.set("alt","A private car photo");
    return new Request("https://test/photo",{method:"POST",headers:{authorization:"Bearer valid"},body:f});
  };
  it("denies foreign cars or exhausted quotas before decoding an image",async()=>{
    const codec={decode:vi.fn(),encode:vi.fn()};
    const rpc=vi.fn(async()=>({data:null,error:{message:"Photo limit reached"}}));
    const r=await carMedia(formRequest(),{admin:{auth:{getUser:async()=>({data:{user:{id:"owner",email_confirmed_at:"2026-01-01"}}})}},userClient:()=>({rpc}),codec,origins:[]});
    expect(r.status).toBe(400);expect(codec.decode).not.toHaveBeenCalled();expect(rpc).toHaveBeenCalledWith("reserve_car_photo",expect.anything());
  });
  it("removes an invalid-image reservation without publishing or storing its bytes",async()=>{
    const eq=vi.fn().mockReturnThis();const deletion={eq,then:(resolve:(value:{error:null})=>unknown)=>Promise.resolve(resolve({error:null}))};
    eq.mockReturnValue(deletion);
    const from=vi.fn(()=>({delete:()=>deletion}));const storage={from:vi.fn()};
    const r=await carMedia(formRequest(),{admin:{from,storage,auth:{getUser:async()=>({data:{user:{id:"owner",email_confirmed_at:"2026-01-01"}}})}},userClient:()=>({rpc:async()=>({data:{id:"reserved",object_path:"owner/car/photo.jpg"}})}),codec:jpeg,origins:[]});
    expect(r.status).toBe(422);expect(from).toHaveBeenCalledWith("owner_car_photos");expect(eq).toHaveBeenCalledWith("user_id","owner");expect(storage.from).not.toHaveBeenCalled();
  });
});
import { manualChapters } from "../src/data/manual";
import { chapterSystems, chapterGuides } from "../src/data/manual-navigation";
import { systems } from "../src/data/catalog";
it("maps every manual topic to canonical systems and exact source-page guides", () => {
  expect(manualChapters).toHaveLength(47);
  for (const c of manualChapters) {
    const ids = chapterSystems(c.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => systems.some((s) => s.id === id))).toBe(true);
  }
  expect(chapterSystems("320")).toEqual(["suspension"]);
  expect(chapterSystems("130")).toEqual(["engine", "electrical"]);
  expect(chapterGuides("170").map((guide) => guide.slug)).toEqual(expect.arrayContaining([
    "cooling-system-visual-check", "m50-water-pump-job-planning", "e34-electric-fan-conversion",
  ]));
  expect(chapterGuides("610").map((guide) => guide.slug)).toContain("diagnose-blown-fuse");
});
