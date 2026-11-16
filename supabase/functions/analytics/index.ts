import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import resources from "./resources.json" with { type: "json" };
import { analyticsService } from "./core.mjs";
Deno.serve((request) => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const r = await admin
      .rpc(name, args)
      .abortSignal(AbortSignal.timeout(10000));
    if (r.error) throw r.error;
    return r.data;
  };
  return analyticsService(request, {
    rpc,
    knownPages: new Set(
      resources.filter((r) => r.id.startsWith("/")).map((r) => r.id),
    ),
    providerConfig: {
      clientId: Deno.env.get("GSC_CLIENT_ID"),
      clientSecret: Deno.env.get("GSC_CLIENT_SECRET"),
      refreshToken: Deno.env.get("GSC_REFRESH_TOKEN"),
      property: "sc-domain:e34lore.com",
    },
    authorize: async (token: string) => {
      const u = await admin.auth.getUser(token);
      if (u.error || !u.data.user) return false;
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: "Bearer " + token } },
        },
      );
      const allowed = await userClient.rpc("analytics_authorized");
      return !allowed.error && allowed.data === true;
    },
    identity: async (token: string) => {
      const r = await admin.auth.getUser(token);
      return r.error ? null : r.data.user;
    },
    isStaff: (id: string) => rpc("analytics_is_staff", { target_user: id }),
  });
});
