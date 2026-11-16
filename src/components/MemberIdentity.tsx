"use client";
import { DocumentLink } from "./DocumentLink";

import { useEffect, useState } from "react";
import { db, useApp } from "./context";
import { usernameError } from "../domain/identity";
import { safeReturnPath } from "../domain/navigation";
import { Notice } from "./common";
import {withTimeout} from "../lib/account-actions";
import type { User } from "@supabase/supabase-js";

export function MemberIdentity() {
  const {user}=useApp();
  if(!user||user.is_anonymous)return null;
  return <AccountMemberIdentity key={user.id} user={user}/>;
}
function AccountMemberIdentity({user}:{user:User}) {
  const { toast, authRevision } = useApp();
  const [chosen, setChosen] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setError] = useState("");
  const key=user.id+':'+authRevision;
  const [loaded,setLoaded]=useState<{key:string;username:string|null;moderator:boolean;error:string}|null>(null);
  const current=loaded?.key===key?loaded:null,username=current?.username||null,loading=!current,error=actionError||current?.error||'',access={moderator:current?.moderator||false};
  useEffect(() => {
    let active = true;const abort=new AbortController(),deadline=setTimeout(()=>abort.abort(),10000);
    Promise.all([
      db.from("profiles").select("username").eq("id", user.id).abortSignal(abort.signal).maybeSingle(),
      db.rpc("my_account_access").abortSignal(abort.signal),
    ]).then(([p, a]) => {
      if (!active) return;
      setLoaded({key,username:p.data?.username||null,moderator:!!a.data?.moderator,error:p.error||a.error?'Your profile could not load. Reload this page to try again.':''});
      clearTimeout(deadline);
    }).catch(()=>{if(active)setLoaded({key,username:null,moderator:false,error:'Your profile could not load. Reload this page to try again.'});clearTimeout(deadline);});
    return () => {
      active = false;abort.abort();clearTimeout(deadline);
    };
  }, [user.id,key]);
  return (
    <section className="member-identity">
      <h2>{username ? "Your public username" : "Choose your username"}</h2>
      <p>
        Your username appears with posts, shared cars and journal updates. Your
        email stays private. Usernames are unique and stay with your account.
      </p>
      {error && <Notice tone="warning">{error}</Notice>}
      {loading ? (
        <p>Loading your profile…</p>
      ) : username ? (
        <>
          <p className="member-handle">@{username}</p>
          <a
            className="button primary"
            href={safeReturnPath(
              typeof location === "undefined"
                ? null
                : new URLSearchParams(location.search).get("next"),
              typeof location === "undefined"
                ? "https://e34lore.com"
                : location.origin,
            )}
          >
            Continue to E34 Lore
          </a>
        </>
      ) : (
        <form
          className="account-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const invalid = usernameError(chosen);
            if (invalid) {
              setError(invalid);
              return;
            }
            if(busy)return;
            setBusy(true);
            try {
              const { data, error } = await withTimeout(db.rpc("claim_username", {chosen_username: chosen}),12000,"The username save could not be confirmed. Reload your account before trying again.");
              if(error){setError(error.code==="23505"?"That username is already in use. Choose another.":"Your username could not be saved. Reload your account and try again.");}
              else {setLoaded({key,username:data,moderator:current?.moderator||false,error:''});toast("Username saved.");}
            } catch {setError("The username save could not be confirmed. Reload your account before trying again.");}
            finally {setBusy(false);}
          }}
        >
          <label>
            Username
            <input
              value={chosen}
              onChange={(e) => setChosen(e.target.value.toLowerCase())}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              minLength={3}
              maxLength={24}
              pattern="[a-z][a-z0-9_]{2,23}"
              aria-describedby="username-help"
            />
          </label>
          <p id="username-help" className="small muted">
            3–24 lowercase letters, numbers or underscores. Start with a letter.
            Choose carefully: this is your permanent community name.
          </p>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save username"}
          </button>
        </form>
      )}
      {access.moderator && (
        <p>
          <strong>Moderator account</strong> ·{" "}
          <DocumentLink href="/manage">Open moderator dashboard ↗</DocumentLink>
          {" · "}<DocumentLink href="/community/admin">Community moderation ↗</DocumentLink>
        </p>
      )}
    </section>
  );
}
