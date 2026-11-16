import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { accountResponse, deleteAccount } from "./core.mjs";
const allowedOrigins = [
  "https://e34-collective.sreid1118.chatgpt.site",
  "https://e34lore.com",
  "https://www.e34lore.com",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3004",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
];
Deno.serve(async (request: Request) => {
  const url = Deno.env.get("SUPABASE_URL"),
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key)
    return accountResponse(request,503,{error:"Account service is temporarily unavailable."},allowedOrigins);
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    return await deleteAccount(request, admin, allowedOrigins);
  } catch {
    return accountResponse(request,503,{error:"Account service is temporarily unavailable. No deletion was confirmed. Sign in again and check your account."},allowedOrigins);
  }
});
