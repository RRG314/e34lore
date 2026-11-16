"use client";
import { createClient } from "@supabase/supabase-js";
import config from "./backend";
export const authStorageKey = "sb-" + new URL(config.url).hostname.split(".")[0] + "-auth-token";
export const db = createClient(config.url, config.publishableKey, {
  auth: { storageKey: authStorageKey, flowType: "pkce", detectSessionInUrl: true },
});
