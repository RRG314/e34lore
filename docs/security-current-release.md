# Integrated security review and public release

Reviewed 7 November 2026 (8 November UTC). Branch `steven/comprehensive-security-hardening` integrates the completed `a57faf1` security audit with the newer r14 workshop, homepage, catalog, roadmap and support work. The owner explicitly requested that these changes update the current public website. That request supersedes the earlier preview-only hold; it does not certify complete factory geometry or every manual procedure.

## Current state

The two security migrations are installed in the existing Supabase project `ebaebzuergvpijtrloik`: `20261108032727_security_sessions_and_owner_status` and `20261108032732_security_support_health_and_retention`. Local filenames match the hosted receipt. The original audit branch's pending `20261108013635` filename was renamed, not replayed alongside a duplicate. No role assignment, member record, production secret or DNS record was changed by this security work.

Updated Edge Functions are ACTIVE: `delete-account` v4, `car-media` v3 and `support` v2. Each retains its existing independent authentication with gateway JWT checking off. The new deletion function depends on the installed service-only session RPC. Support remains inactive and no email has been sent. **Website version 33 is deployed successfully at https://e34lore.com.** Source `e919aea93801ba085b219718d6d3319cf0d2d832`; saved version in the hosting console; deployment in the hosting console. Archive SHA-256 `1e7cb0485cdd63a9dc2a5979584b9e3deab7072aa1b3402842dc5f5bf8c672b1`, 104,263,680 bytes / 2,048 files. Audience remains public.

## Inventory and threat model

The [current schema-only inventory](security-inventory-current.json) records **120 relations, 179 application/private functions and 242 policies**, all observed grants, view options, three private Storage buckets and scheduled job names. It contains no member bodies, tokens, passwords, object bytes or Vault values. Every ordinary application/private table has RLS. Every observed application security-definer function has a fixed search path. The older [audit and threat model](security-audit-2026-11-07.md) remain the detailed review of authentication, community, garages, affiliate operations, uploads, headers, scanner boundaries and recovery.

Additional trust boundaries introduced since that report:

| Surface | Boundary and verification |
| --- | --- |
| `/support` | Bounded JSON, signed short-lived challenge, honeypot, atomic account-independent quotas and request idempotency; optional account association requires a confirmed matching email. No arbitrary browser attachment upload. |
| `/manage/support` | Real Auth identity plus database administrator, AAL2, current session and verified factor. Ordinary members, moderators, revoked sessions and removed factors are denied. |
| Support webhooks | Raw-body Svix verification before parsing; E34 recipient checked before provider fetch; event/provider identity deduplication; same-sender reply routing; fixed recipients and escaped templates. Other projects' mail is ignored. |
| Support downloads | Private bucket with no browser file policies; administrator-authorized streamed download, inert attachment disposition, nosniff and sandbox. Five allowed files of at most 5 MB, MIME/name/size/magic checks, restricted provider CDN and no redirects. This is not antivirus scanning or a claim that arbitrary PDFs/images are safe to open locally. |
| r14 reader and hero | Checksum-pinned local model/catalog assets. No user geometry editor or automatic processing of submitted CAD on public routes. Embedded GLB textures require object-URL fetch permission in CSP. |
| Security status | `/manage/security` is administrator-only with the same live MFA guard. Aggregate safeguards, upload attempts, delivery failures and cleanup queues only; no customer bodies, emails or source photos. |

Attackers considered include unauthenticated visitors, anonymous Auth guests, malicious members, moderator/reviewer accounts, compromised active/revoked staff sessions, malicious upload clients, dependency attackers and compromised provider accounts. A compromised *active* administrator and provider account remain powerful. Provider MFA, recovery and narrow operational access remain essential. A photograph-recognition service is **not deployed**; it cannot be certified by the owner-photo tests.

## Findings and corrections

S01–S11, reproduction conditions, severity, corrections and practical limits are in the original audit. Their tested corrections are now integrated and the backend dependencies installed. New findings from integration:

| ID / severity | Reproduction and impact | Correction and verification |
| --- | --- | --- |
| S12 Medium | Support's byte-only reader could wait indefinitely for an unfinished request/provider body. | Reused the common byte/time/abort-limited reader, including Response bodies; oversized requests return 413 and timed-out streams are cancelled. Tests exercise unfinished/oversized provider streams, chunked contact rejection and no outbox side effects. |
| S13 Medium regression | The initial CSP blocked `ImageBitmapLoader` fetching embedded GLB blob URLs. Browser showed two texture-load failures. | Explicit `blob:` in `connect-src`, while retaining no JS string eval and fixed network hosts. Rebuilt/reloaded r14 renders all 454 groups without new texture errors. Unit and HTTP checks preserve this required policy. |
| S14 Medium | An unsubmitted support draft could remain mounted across account changes on the same browser. | Key the support form to the established account boundary, clearing its contact/message/result state when identity changes. Token renewal for the same account does not discard the draft. No message body is persisted locally. |
| S15 Low | Abandoned model-upload attempt metadata was pruned only when that owner submitted again. | Independent daily `e34-security-retention` prunes records older than seven days. SQL verifies old-only removal and that pausing support leaves unrelated jobs alone. |
| S16 Low operational | Newly published support links could advertise an email reply flow before its credentials and real delivery test were finished. | The inactive form remains disabled and says private support is not open. The email address is shown only when the service is available; the footer links the support page. No activation or mail send was attempted. |

No remote exploit of the dependency advisories was demonstrated. This is hardening and bounded verification, not a claim that the site is impossible to compromise.

## Verification

| Check | Result / scope |
| --- | --- |
| Application | 255 unit tests / 30 files; 37 Python checks; TypeScript and patched production build pass. Final model/support/header suite: 54 checks pass. |
| Routes and data | Against both preview and https://e34lore.com: 69 SSR routes, all 49 manual sections, catalog/guide/interchange relations and anonymous access denials pass. These are route/data assertions, not certification of every repair instruction. |
| HTTP security | 16 safe boundary checks: CSP/headers, private no-store, private source-file denials, unauthenticated media/deletion and unsigned support webhook/inbox denial. No authenticated writes or emails. Passes against both preview and the live custom domain. |
| SQL | Full tracked application policy/schema bootstrap plus support in disposable socket-only PostgreSQL. Staff/reviewer/moderator separation; AAL/session/factor revocation; private garage/journal/photo isolation; withdrawal; ownership/quota-before-decode; upload counts; support routing/outbox/privacy/retention pass. |
| Hosted denial checks | Read-only rollback transaction confirms anonymous staff/support denial, service-only session RPC grants, retention job and inactive support. Hosted inventory finds zero ordinary application tables without RLS and zero definers without fixed paths. |
| Restoration | Full synthetic application dump/restore: 12 object-byte hashes, synthetic identity/MFA metadata, garage, journal, public/private file and audit assertions pass. Latest archive 947,708 bytes; 0.61 seconds at measured resolution. Real provider Auth keys/settings and real remote Storage were not restored. |
| Credentials | Gitleaks 8.30.0 history scan: 38 commits, 26.22 MB, no leaks with narrowly scoped exceptions for intentionally public publishable/consent keys. Staged scanning passes. Compiled scanning retains one reviewed finding: Vinext’s generated prerender key in the server-only manifest. An automated guard verifies it is absent from all 1,802 client assets; HTTP probes deny both server-manifest paths. Three intentionally public publishable-key copies are narrowly classified by the root scanner configuration. No generated-key warning was silently discarded. No service-role, Resend, OAuth secret or signing key is placed in browser assets. |
| Dependencies | npm audit: initial 34 findings including 1 critical / 15 high; corrected tree 16 moderate / 0 high / 0 critical. `--omit=dev` reports zero, but that npm classification is not proof that every bundled framework module is unreachable. Remaining tooling/OG/archive chains need continued upstream review. |
| Lint | New security/status/request/support code passes targeted lint. Full lint reports 315 errors and 78 warnings, including historical hook/link/type diagnostics. Rules were not disabled to obtain a clean report; this check is not claimed passing. |

The support-specific concurrency harness separately verifies duplicate producers and competing delivery claims. The merged SQL test now uses actual application role helpers instead of relying only on the narrower standalone support administrator fixture. Provider Vault/net/cron extensions and Auth/Storage transport are explicit local test doubles; scheduled SQL is exercised without sending network traffic.

## Email, privacy and operations

Email setup remains deferred by the owner. Code/signature/recipient/attachment checks do not establish real delivery. Existing SMTP, other projects' credentials, DNS and provider settings are unchanged. Authoritative/1.1.1.1 DNS reads observe root MX `receive.forge.rmta.net` and DMARC `p=quarantine`; the existing sender SPF return path resolves through Forge. Prior Resend inspection verified DKIM. No DNS was edited during this audit.

Analytics remains opt-in and coarse: no account IDs, VINs, private paths, searches or raw IP values in aggregate records. Reports require staff permission. Counters are bounded and retention scheduled. Public counters remain spoofable; they are not unique-user or financial-conversion evidence. Per-account posting/upload quotas do not replace provider bot and multi-account controls.

GitHub now uses pinned official Action SHAs, read-only permissions, no persisted checkout credential, bounded jobs, an npm high-advisory gate, isolated SQL/restore tests, checksum-pinned Gitleaks scanning, weekly security verification and Dependabot for npm/Actions. These workflows are installed on the default branch through merged PR #1. Website/SQL and Android checks passed on the final release branch before merging. No paid code-scanning product was enabled. Alerts from failed CI are supplied by GitHub account notification settings; no claim of configured Resend owner alerts is made.

## Remaining risks and owner actions

1. **High operational:** protected production DB/Auth/configuration and Storage exports, encrypted off-device retention and a real isolated staging restore are still required. The synthetic drill is not a production backup.
2. **Medium:** verify real mailbox signup/reset/recovery, lost-factor recovery and provider account security. Apple/Meta public-provider completion and available CAPTCHA/credential-stuffing controls remain separate tasks. Leaked-password protection was previously disabled/plan-gated; it has not been silently enabled or purchased.
3. **Medium:** automatic Auth/API/upload/webhook anomaly alerts remain unconfigured. The private status page and provider logs support manual inspection; email notifications await the deferred setup. No raw visitor/customer data is sent into a new monitoring service.
4. **Medium:** 16 moderate dependency findings and multi-account/bot abuse need continued review. Existing Cloudflare bot-management cookies are observed; no claim of a new WAF rule or DDoS test is made.
5. The actual owner’s live administrator/MFA session successfully opened `/manage/security` and its current aggregate checks. Normal uploads/account deletion with disposable staging identities and real Android/TalkBack checks remain acceptance work. No real owner account, car or photograph was deleted to test security.
6. The catalog applicability repair is still prepared/unapplied; all current ordering UI surfaces already exclude the audited invalid rows. Full manufactured geometry, every installed fastener and every manual walkthrough remain technical-content gaps, independent of security claims.

Incident containment, credential revocation, session recovery and restore steps: [private incident runbook](security-incident-runbook.md). Continuous reviews should revisit [Supabase sessions](https://supabase.com/docs/guides/auth/sessions), [GitHub workflow security](https://docs.github.com/en/actions/reference/security/secure-use) and [OWASP API risks](https://owasp.org/projects/api-security-project).

## Live browser and CI receipt

Native Chrome at e34lore.com loads r14, displays all 454 groups at full separation, rotates on both axes and zooms without changing the held pose. A real mesh click opens Wheel, tire and mounting; selecting BMW `36111179774` shows the exact catalog position, 7JX15 ET:20 source condition, interchange, manual procedure reference and linked journal/community actions. No new console errors were observed. Mobile at the restored 438×529 viewport shows the quick links, loads the r14 interactive hero and reaches 100% with 454 groups and no horizontal overflow; its photo carousel remains independently usable. No real account/car/photo record was created or deleted.

GitHub website/SQL and Android CI passed for the matching application implementation; subsequent changes add the build-confidentiality guard and final verification documentation. Local proof images remain in ignored `outputs/security-release/`, not public assets.

Actual owner browser confirmation: `/manage/security` displayed current administrator MFA verified by the database, zero application tables without RLS, zero unsafe definer search paths and zero public buckets. No new enrollment or role assignment was performed.

Final test-harness hardening (S17, Low): the standalone support fixture now reconstructs its fixed loopback connection, rejects URI query/fragment/user/password overrides, strips inherited PG variables (including PGHOSTADDR/PGSERVICE), and disables psql startup files. Five new Python tests exercise these guards without opening any database connection. This changes only developer verification tooling; the v33 application source remains unchanged.

Repository receipt: PR #1 merged into private `RRG314/e34lore` main at `289298e015399af7c130737ae0167b103ce2b571`. The development branch is retained. The owned local preview and temporary PostgreSQL servers were stopped after live verification. Deployed application code remains the v33 source recorded above; later commits update test tooling and release documentation.
