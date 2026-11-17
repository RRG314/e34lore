"use client";
import { createClient } from "@supabase/supabase-js";
import config, { demoBackend } from "./backend";
import { demoFetch } from "../demo/backend";

export const authStorageKey = "sb-" + new URL(config.url).hostname.split(".")[0] + "-auth-token";
export const db = createClient(config.url, config.publishableKey, {
  auth: {
    storageKey: authStorageKey, flowType: "pkce", detectSessionInUrl: !demoBackend,
    persistSession: !demoBackend, autoRefreshToken: !demoBackend,
  },
  ...(demoBackend ? { global: { fetch: demoFetch } } : {}),
});
