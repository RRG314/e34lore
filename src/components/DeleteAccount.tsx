"use client";
import { useState } from "react";
import {authStorageKey} from "../lib/supabase";
import {accountActionError,clearAccountStorage,signOutBrowser,withTimeout} from "../lib/account-actions";
import { db, useApp } from "./context";
import { Modal } from "./common";
export function DeleteAccount() {
  const { user } = useApp();
  const [open, setOpen] = useState(false),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error,setError] = useState("");
  return (
    <>
      <button className="delete-account-link" onClick={() => {setOpen(true);setError("");setConfirmation("");}}>
        Delete my account and stored data
      </button>
      {open && (
        <Modal
          title="Delete your E34 Lore account"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p>
            This permanently deletes your private garage, service records,
            bookmarks, outcomes, profile and contributions. Replies to a
            conversation you started will also be removed. Export your records
            first. This cannot be undone.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (confirmation !== "DELETE") return;
              setBusy(true);setError("");
              try {
                const {data,error}=await withTimeout(db.functions.invoke("delete-account",{body:{confirm:"DELETE_MY_ACCOUNT"},timeout:20000}),23000,"The server has not confirmed deletion. Check your connection and account status before retrying.");
                if(error)throw new Error(await accountActionError(error,"Account deletion could not be confirmed. Sign in again and retry."));
                if(data?.deleted!==true)throw new Error("The server has not confirmed deletion. Reload your account to check its status.");
                await signOutBrowser(db.auth,()=>{try{clearAccountStorage(localStorage,authStorageKey);clearAccountStorage(sessionStorage,authStorageKey);if(user)localStorage.removeItem("e34.reference.views.v1."+user.id);}catch{}});
                try{sessionStorage.removeItem("e34.question.draft.v1");sessionStorage.removeItem("e34.diagnostic.handoff.v1");}catch{}
                window.location.replace("/account?notice=account-deleted");
              }catch(reason){setError(reason instanceof Error?reason.message:"Account deletion could not be confirmed. Please try again.");}
              finally{setBusy(false);}
            }}
          >
            {error&&<p className="form-message" role="alert">{error}</p>}
            <label>
              Type DELETE to confirm
              <input
                autoComplete="off"
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
            <div className="form-actions">
              <button
                className="button quiet"
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Keep my account
              </button>
              <button
                className="button primary"
                disabled={confirmation !== "DELETE" || busy}
              >
                {busy ? "Deleting…" : "Permanently delete my account"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
