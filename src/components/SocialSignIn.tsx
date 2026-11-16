"use client";
import {useKeyedResource} from "../hooks/use-keyed-resource";
import { useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { loadAuthProviders } from "../lib/auth-providers";
import { db } from "./context";
import { safeReturnPath } from "../domain/navigation";
import {releasedSocialProvider} from '../release/features';

export function accountRedirect() {
  const next = safeReturnPath(
    new URLSearchParams(location.search).get("next"),
    location.origin,
  );
  try {
    sessionStorage.setItem("e34.auth.next", next);
  } catch {}
  return location.origin + "/account";
}

export function SocialSignIn({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const [busy,setBusy]=useState(false);
  const resource=useKeyedResource<Record<string,boolean>>('auth-providers',async()=>await loadAuthProviders(),{failureMessage:'Sign-in providers could not load.'});
  const providers=resource.data||{},settingsError=!!resource.error;
  const options: [Provider, string][] = [
    ["google", "Google"],
    ["apple", "Apple"],
    ["azure", "Microsoft"],
    ["github", "GitHub"],
    ["facebook", "Facebook"],
    ["discord", "Discord"],
  ];
  const enabled = options.filter(([provider]) => releasedSocialProvider(provider)&&providers[provider]);
  if (settingsError) return (
    <div role="status" className="form-message">
      <p>Sign-in options could not be loaded. You can retry or use email below.</p>
      <button type="button" className="button outline" onClick={() => resource.retry()}>Retry sign-in options</button>
    </div>
  );
  if (!enabled.length) return null;
  return (
    <div className="social-sign-in">
      {enabled.map(([provider, label]) => (
        <button
          type="button"
          className="button outline full"
          disabled={busy}
          key={provider}
          onClick={async () => {
            setBusy(true);
            onError("");
            try {
              const { error } = await db.auth.signInWithOAuth({
                provider,
                options: {
                  redirectTo: accountRedirect(),
                  ...(provider === "google"
                    ? { queryParams: { prompt: "select_account" } }
                    : {}),
                },
              });
              if (error) throw error;
            } catch (e) {
              onError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          Continue with {label}
        </button>
      ))}
      <p className="auth-divider">or use your email</p>
    </div>
  );
}
