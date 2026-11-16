import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import codec from "npm:jpeg-js@0.4.4";
import { carMedia } from "./core.mjs";
const origins = [
  "https://e34lore.com",
  "https://www.e34lore.com",
  "https://e34-collective.sreid1118.chatgpt.site",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3004",
  "http://localhost:3000",
  "http://localhost:3002",
];
Deno.serve(async (request) => {
  const url = Deno.env.get("SUPABASE_URL")!,
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  try {
    return await carMedia(request, {
      admin: createClient(url, key, options),
      userClient: (token: string) =>
        createClient(url, anon, {
          ...options,
          global: { headers: { Authorization: "Bearer " + token } },
        }),
      codec,
      origins,
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Photo service is temporarily unavailable." }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          ...(origins.includes(request.headers.get("origin") || "")
            ? {
                "Access-Control-Allow-Origin": request.headers.get("origin")!,
                Vary: "Origin",
              }
            : {}),
        },
      },
    );
  }
});
