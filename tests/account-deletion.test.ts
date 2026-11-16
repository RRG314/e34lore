import { describe, it, expect, vi } from "vitest";
import { accountResponse, deleteAccount } from "../supabase/functions/delete-account/core.mjs";
type Failure={message:string};
type RpcResult={data:boolean|{path:string}[];error:Failure|null};
const token = "test." + Buffer.from(JSON.stringify({sub:"authenticated-owner",session_id:"e3400000-0000-4000-8000-000000000111"})).toString("base64url") + ".signature";
function admin() {
  return {
    rpc: vi.fn(async (name: string):Promise<RpcResult> => ({ data: name === "security_session_active" ? true : [], error: null })),
    storage: {
      from: vi.fn(() => ({ remove: vi.fn(async () => ({ error: null })) })),
    },
    auth: {
      getUser: vi.fn(async ():Promise<{data:{user:{id:string}|null};error:Failure|null}> => ({
        data: { user: { id: "authenticated-owner" } },
        error: null,
      })),
      admin: {
        signOut: vi.fn(async ():Promise<{error:Failure|null}> => ({ error: null })),
        deleteUser: vi.fn(async () => ({ error: null })),
      },
    },
  };
}
const request = (body: unknown, accessToken = token) =>
  new Request("https://example.test/delete", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
describe("account deletion authorization", () => {
  it("requires an explicit confirmation", async () => {
    const a = admin();
    const r = await deleteAccount(request({ confirm: "no" }), a, []);
    expect(r.status).toBe(400);
    expect(a.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
  it("rejects a supplied target identity", async () => {
    const a = admin();
    const r = await deleteAccount(
      request({ confirm: "DELETE_MY_ACCOUNT", user_id: "another-owner" }),
      a,
      [],
    );
    expect(r.status).toBe(400);
    expect(a.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
  it("does not trust an invalid access token", async () => {
    const a = admin();
    a.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid" },
    });
    const r = await deleteAccount(
      request({ confirm: "DELETE_MY_ACCOUNT" }),
      a,
      [],
    );
    expect(r.status).toBe(401);
    expect(a.auth.admin.signOut).not.toHaveBeenCalled();
  });
  it("revokes sessions before deleting the freshly validated owner", async () => {
    const a = admin(),
      r = await deleteAccount(request({ confirm: "DELETE_MY_ACCOUNT" }), a, []);
    expect(r.status).toBe(200);
    expect(a.auth.admin.signOut).toHaveBeenCalledWith(token, "global");
    expect(a.auth.admin.deleteUser).toHaveBeenCalledWith("authenticated-owner");
    expect(a.auth.admin.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      a.auth.admin.deleteUser.mock.invocationCallOrder[0],
    );
  });
  it("stops if global session revocation fails", async () => {
    const a = admin();
    a.auth.admin.signOut.mockResolvedValue({
      error: { message: "offline" },
    });
    const r = await deleteAccount(
      request({ confirm: "DELETE_MY_ACCOUNT" }),
      a,
      [],
    );
    expect(r.status).toBe(503);
    expect(a.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
  it("rejects a browser origin outside the configured site", async () => {
    const a = admin();
    const r = await deleteAccount(
      new Request("https://example.test/delete", {
        method: "POST",
        headers: { origin: "https://unrelated.test" },
      }),
      a,
      ["https://owner.test"],
    );
    expect(r.status).toBe(403);
    expect(a.auth.getUser).not.toHaveBeenCalled();
  });
});

it("stops account deletion when private source cleanup fails", async () => {
  const a = admin();
  a.rpc.mockImplementation(async (name: string) => name === "security_session_active" ? {data:true,error:null} : {data:[],error:{message:"offline"}});
  expect(
    (await deleteAccount(request({ confirm: "DELETE_MY_ACCOUNT" }), a, []))
      .status,
  ).toBe(503);
  expect(a.auth.admin.deleteUser).not.toHaveBeenCalled();
});
it("cleans uploaded sources using only the fresh owner identity", async () => {
  const a = admin();
  a.rpc.mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({
    data: [{ path: "authenticated-owner/job/model.glb" }], error: null,
  });
  const r = await deleteAccount(
    request({ confirm: "DELETE_MY_ACCOUNT" }),
    a,
    [],
  );
  expect(r.status).toBe(200);
  expect(a.rpc).toHaveBeenCalledWith("account_twin_file_paths", {
    target_user_id: "authenticated-owner",
    after_path: "",
  });
  expect(a.storage.from).toHaveBeenCalledWith("e34-twin-submissions");
});

it("returns readable no-store failures only to an approved browser origin",async()=>{for(const origin of["https://e34lore.com","https://unrelated.test"]){const r=accountResponse(new Request("https://example.test/delete",{headers:{origin}}),503,{error:"Deletion was not confirmed."},["https://e34lore.com"]);expect(r.headers.get("Access-Control-Allow-Origin")).toBe(origin==="https://e34lore.com"?origin:null);expect(r.headers.get("Cache-Control")).toBe("no-store");expect(await r.json()).toEqual({error:"Deletion was not confirmed."});}});

it("rejects a revoked session before deleting anything", async () => {
  const a = admin(); a.rpc.mockResolvedValue({data:false,error:null});
  expect((await deleteAccount(request({confirm:"DELETE_MY_ACCOUNT"}),a,[])).status).toBe(401);
  expect(a.auth.admin.signOut).not.toHaveBeenCalled(); expect(a.auth.admin.deleteUser).not.toHaveBeenCalled();
});
it("fails closed when live session lookup is unavailable", async () => {
  const a = admin(); a.rpc.mockRejectedValue(new Error("offline"));
  expect((await deleteAccount(request({confirm:"DELETE_MY_ACCOUNT"}),a,[])).status).toBe(401);
  expect(a.auth.admin.deleteUser).not.toHaveBeenCalled();
});
it("bounds undeclared account request bodies before Auth or JSON parsing", async () => {
  const a=admin(); const r=await deleteAccount(new Request("https://test/delete",{method:"POST",headers:{authorization:"Bearer "+token},body:"x".repeat(1025)}),a,[]);
  expect(r.status).toBe(413); expect(a.auth.getUser).not.toHaveBeenCalled();
});
