"use client";
import { useEffect, useState } from "react";
import { db, useApp } from "./context";
import {withTimeout} from "../lib/account-actions";
import { Notice } from "./common";
import { safeReturnPath } from "../domain/navigation";

export function AccountSecurity() {
  const { user, authRevision, toast } = useApp();
  const userId = user?.id;
  const [factors, setFactors] = useState<
      { id: string; friendly_name?: string; status: string }[]
    >([]),
    [aal, setAal] = useState("aal1"),
    [selected, setSelected] = useState(""),
    [qr, setQr] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    if (!userId) return;
    withTimeout(Promise.all([
      db.auth.mfa.listFactors(),
      db.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]),10000,"Security settings could not load.")
      .then(([f, a]) => {
        if (active) {
          setFactors(
            f.data?.all.filter((factor) => factor.factor_type === "totp") || [],
          );
          setAal(a.data?.currentLevel || "aal1");
          setError(f.error?.message || a.error?.message || "");
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Account security could not be loaded. Check your connection and try again.",
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [userId, authRevision, revision]);
  const continueTo =
    typeof location === "undefined"
      ? "/garage"
      : safeReturnPath(
          new URLSearchParams(location.search).get("next"),
          location.origin,
        );
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The security request failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function enroll() {
    await run(async () => {
      const { data, error } = await db.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "E34 Lore " + new Date().toISOString(),
      });
      if (error) throw error;
      setSelected(data.id);
      setQr(data.totp.qr_code);
      setCode("");
      setRevision((r) => r + 1);
    });
  }
  return (
    <section
      className="account-security"
      id="account-security"
      aria-labelledby="account-security-heading"
    >
      <h2 id="account-security-heading">Authenticator security</h2>
      <p>
        Add an authenticator for an extra sign-in check. It is optional for member accounts and required for moderation.
      </p>
      <p className="small" role="status">
        Current session:{" "}
        {loading
          ? "Checking authenticator…"
          : aal === "aal2"
            ? "Authenticator verified"
            : "Signed in; authenticator not verified"}
      </p>
      {aal === "aal2" && (
        <p>
          <a className="button primary" href={continueTo}>
            Continue to E34 Lore
          </a>
        </p>
      )}
      <button
        className="button outline"
        disabled={busy}
        onClick={() =>
          run(async () => {
            const { error } = await db.auth.signOut({ scope: "others" });
            if (error) throw error;
            toast(
              "Other devices can no longer refresh their sessions. Existing access may continue until token expiry.",
            );
          })
        }
      >
        Sign out other devices
      </button>
      <p className="small muted">
        Use this on a trusted device. Keep your Google account and email secure,
        and use an authenticator for E34 Lore.
      </p>
      <p className="small muted">
        Keep a securely backed-up authenticator or add a separate working factor
        before removing your only authenticator. Resetting your account password
        does not replace this check.
      </p>
      {error && (
        <Notice tone="warning">
          <p role="alert">{error}</p>
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() => setRevision((r) => r + 1)}
          >
            Reload security settings
          </button>
        </Notice>
      )}
      {factors.map((f) => (
        <div className="preference-row" key={f.id}>
          <strong>{f.friendly_name || "Authenticator"}</strong>
          <span>
            {f.status === "verified" ? "Ready" : "Setup not completed"}
          </span>
          <button
            className="text-link"
            disabled={busy}
            onClick={() => {
              setSelected(f.id);
              setQr("");
              setCode("");
              setError("");
            }}
          >
            {f.status === "verified" ? "Verify session" : "Finish verification"}
          </button>
          <button
            className="text-link"
            disabled={busy}
            onClick={async () => {
              if (!confirm("Remove this authenticator from your account?"))
                return;
              await run(async () => {
                const { error } = await db.auth.mfa.unenroll({
                  factorId: f.id,
                });
                if (error) throw error;
                setSelected("");
                setQr("");
                setCode("");
                setRevision((r) => r + 1);
                toast("Authenticator removed.");
              });
            }}
          >
            Remove
          </button>
        </div>
      ))}
      {!selected && (
        <button
          className="button outline"
          disabled={busy || loading}
          onClick={enroll}
        >
          Add authenticator
        </button>
      )}
      {selected && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await run(async () => {
              const { error } = await db.auth.mfa.challengeAndVerify({
                factorId: selected,
                code,
              });
              if (error) throw error;
              setSelected("");
              setQr("");
              setCode("");
              setRevision((r) => r + 1);
              toast("MFA session verified.");
            });
          }}
        >
          {qr && (
            <>
              <p>
                Scan this code with your authenticator, then enter its six-digit
                code. Keep the setup code private.
              </p>
              {/* The private QR is an in-memory SVG; it must not go through an image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="authenticator-qr"
                src={
                  qr.startsWith("data:")
                    ? qr
                    : "data:image/svg+xml;charset=utf-8," +
                      encodeURIComponent(qr)
                }
                alt="Private authenticator enrollment QR code"
              />
            </>
          )}
          {!qr && (
            <p>
              Enter the current code from the authenticator you already scanned.
              If this setup was never scanned, remove it and add a new
              authenticator.
            </p>
          )}
          <label>
            Authenticator code
            <input
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
            />
          </label>
          <div className="form-actions">
            <button
              className="button primary"
              disabled={busy || code.length !== 6}
            >
              {busy ? "Verifying…" : "Verify code"}
            </button>
            <button
              type="button"
              className="button outline"
              disabled={busy}
              onClick={() => {
                setSelected("");
                setQr("");
                setCode("");
              }}
            >
              Close setup
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
