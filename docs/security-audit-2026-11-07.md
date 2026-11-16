# E34 Lore security audit and hardening

Historical side-audit receipt. Its changes have now been integrated with support/r14 and published in v33. The [current security release](security-current-release.md) supersedes the deployment, support/scanner and verification counts below.

**Review date:** 7 November 2026, America/New_York. Execution logs span 8 November UTC.

**Source baseline:** `014ad4e`, isolated branch `steven/security-audit-20261107`.

**Worktree:** `/local/owner/Developer/e34lore-security-audit`.

**Deployment:** not deployed; production source, database, secrets, DNS and user records were not changed. This branch must be integrated with subsequent main-project work before release.

## Assessment

The existing application has substantial database and upload protections. This review found and corrected gaps in privileged-session revocation, upload quotas, request buffering, response headers and dependency versions. The corrections have local automated verification; they are not production protections until deployed.

A schema-only live inventory observed 110 relations, 143 custom functions and 232 policies across application/private/storage schemas. No ordinary application table lacked RLS, and every observed security-definer function had a fixed search path. This is evidence of configuration, not proof that every authorization rule is correct. Behavioral tests exercise representative high-risk boundaries with disposable accounts in local PostgreSQL, not the provider's complete Auth/Storage server.

No confirmed application-level remote-code-execution exploit was demonstrated. The original dependency tree contained a critical Next.js advisory, plus high advisories; those packages were patched. Reachability matters: the site does not expose attacker-controlled `next/og` ImageResponse input, which the critical advisory requires.

Production recovery readiness, automated abuse alerts, provider authentication settings/delivery and future support/scanner features remain open. They are not certified by a green build or by this report.

## Inventory and trust boundaries

The complete schema-only relation/function/grant/policy inventory is [security-inventory-2026-11-07.json](security-inventory-2026-11-07.json). It contains no member records, Auth tokens, MFA secrets or credentials. It is a timestamped snapshot, not a replacement for migrations. In particular, it describes production *before* this branch's pending migration.

| Surface | Public entry points / operations | Sensitive boundary and observed controls |
|---|---|---|
| Frontend | Homepage, manual, guides, diagnostics, OEM catalog, interchange, workshop, discussions, shared garages, app installer, partnership policy | React text escaping; source/number links; explicit public snapshots; private data fetched with the current member token; public reference data is not a secret |
| Member UI | `/account`, `/garage`, `/community/settings`, `/community/new`, `/workshop/inspections` | Supabase PKCE browser sessions; private RLS; state keys include member/session revision; sign-out clears local Auth state; service worker does not cache account/API/navigation content |
| Staff UI | `/manage`, `/manage/models`, `/manage/partners`, `/admin`, `/community/admin`; new `/manage/security` | Private staff-role table, database role checks and MFA. New live-session/factor validation extends the underlying role helpers rather than trusting hidden controls |
| HTTP API | `POST /api/affiliate/check` | Bounded UTF-8 JSON, bearer token, DB administrator/MFA gate, saved merchant allowlist, bounded HEAD redirects/timeouts, version receipt |
| Redirect | `GET /go/:id` | UUID, saved approved/unexpired program/link, allowlisted HTTPS host, no arbitrary caller destination, no-referrer/no-store; optional coarse consented click count |
| Metadata routes | `GET /robots.txt`, `GET /sitemap.xml` | Public generated routes; no account rows or tokens |
| Catch-all pages | `GET /` and `GET /[...path]` | Public SSR shell; private records loaded under member RLS; no-store headers added for sensitive routes; ordinary page routes are not authorization boundaries |
| Supabase Data API | Public-schema tables/views and RPC grants listed in inventory | Grants and RLS are separate; most private implementations live in a non-exposed schema behind invoker facades; fixed-search-path definers enforce ownership/roles |
| Auth API | Signup, password/recovery, OAuth callbacks, anonymous sessions, MFA, refresh/logout | Supabase SDK/provider API; signed token verification; server confirmation and session policies are provider configuration, not guaranteed by UI text |
| Edge Functions | `car-media`, `delete-account` source in `supabase/functions` | Fresh `Auth.getUser`; runtime-only service credential; exact CORS allowlists. New deletion check consults the authoritative session row |
| Photo storage | `e34-car-photos`, private, JPEG only, 2 MiB | Service processor writes re-encoded pixels; owner access or explicit published/approved visible garage; ordinary Storage downloads recheck RLS |
| Model storage | `e34-twin-submissions`, private, 100 MiB/object | Owner/reviewer read, no direct publication; embedded GLB rules in browser/local tooling. New owned-job, confirmation, count and hourly gates protect inserts |
| Community | Threads, replies, helpful/bad-advice feedback, reports, restrictions/appeals, block/mute settings, guest queue | Plain text, immutable ownership, bounded fields, per-account advisory-lock quotas; negative feedback explanation is atomic; guest posts are hidden pending review |
| Garage/journals | Private vehicles, service records, modifications, installed parts, source photos, progress/journals; separate public snapshots | Composite owner foreign keys; publication copies allowlisted fields; private cost/mileage/notes excluded; edits do not silently republish; withdrawal revokes reads |
| Analytics | `record_usage`, approved advertising/click RPCs | Off by default; enum/day aggregation; no analytics IP, VIN, token, private path or search payload; reports are staff-only; counters/retention bounded |
| Email | Supabase SMTP through Resend, sender `mail.e34lore.com` | Provider/runtime credentials; no Resend secret found in application source. SMTP delivery and OAuth/recovery mail flow were not exercised with a real mailbox in this side review |
| Support inbox / scanner | No implemented inbox/webhook or component recognition service at baseline | Not claimed as secure or operational. Camera input for owner photos uses the JPEG upload path. Main-thread support scaffolding was intentionally not merged or edited |
| Hosting | Vinext/React on Cloudflare Worker through Sites, custom domain HTTPS | Worker response hardening added; connector context stays request-scoped; no D1/R2 binding configured in hosting.json; no WAF/dashboard configuration changed |
| Android/PWA | Trusted Web Activity wrapper, manifest, asset links, offline fallback | No keystore/private credential in browser assets; offline allowlist stores only fallback/icons; current site and backend must be secure independently of wrapper |
| Build / tools | npm lockfile, Python import/model tools, GitHub CI, Android Gradle | Pinned Actions SHAs/read-only token; no persisted checkout credential; high-advisory CI gate; local Python utilities are not network services |

The database inventory includes all observed tables and function grants rather than just the tables used in the new tests. Storage objects, Auth users/sessions/MFA factors and operational audit data are sensitive even when their counts can safely be shown to an authenticated owner.

## Threat model

| Actor | Realistic objectives | Main controls / remaining risk |
|---|---|---|
| Anonymous visitor | Read private garages, scrape hidden content, inject text, flood counts | Explicit grants + RLS + public snapshot visibility; plain-text rendering; bounded aggregate cardinality. Public facts are intentionally readable; coarse telemetry can still be manipulated |
| Anonymous Auth guest | Bypass member restrictions using authenticated DB role | Private hidden guest submission RPC; current guest session; 2 questions / 10 replies per day per guest identity; no private uploads. Repeated new identities still need provider abuse/CAPTCHA controls |
| Verified member | Change another car, publish another journal/photo, fake trusted advice, bypass quotas | Actor comes from verified token; owner FK/RLS; separate review role; explicit publication; serialized per-account quotas. Multi-account abuse remains possible |
| Moderator | Read private owner notes, gain admin/affiliate control, continue after logout | Distinct role gates; current MFA session/factor; immutable audit metadata. A moderator sees moderation material, not arbitrary private maintenance sources |
| Administrator | Misconfigure commercial destinations or exposure | Admin + current MFA in DB; allowlists, audited changes, checked destinations. A compromised verified administrator is powerful; recovery and provider credential security remain essential |
| Compromised browser/member token | Persist after logout, steal local Auth token via XSS | Local sign-out + provider revocation; new immediate staff/deletion session lookup; CSP and text escaping. Ordinary member JWT access can persist until token expiry; no claim of immediate global member-token invalidation |
| Malicious upload client | Exhaust decoder memory, upload active payloads, consume storage | Stream/time/size limits, reserved account quota before JPEG decode, resolution/memory limits, fresh JPEG encoding, private buckets, owned-job upload quota. No antivirus service or automatic content recognition is deployed |
| Supply-chain attacker | Execute during build, exploit vulnerable renderer, steal credentials | Lockfile, patched versions, SHA-pinned Actions, limited workflow token; public/runtime vs development advisory distinction. Six native installer families still execute under ordinary `npm ci`; moderate dev dependencies remain |
| Compromised hosting/provider account | Change DB policies, sender, deployment or OAuth | Outside member RLS; requires provider MFA, narrow operational access, protected credentials, backups and incident runbook. Those account settings were not changed here |

Trust boundaries are browser → Supabase Auth → Data/Storage API → private SQL helpers, browser → authenticated Edge processor → service-role storage/database operations, administrator → saved URL checker → allowlisted merchant, and deployment tooling → Worker/provider accounts. A publishable Supabase key is intentionally public and does not confer service-role permission.

## Findings and implemented corrections

| ID / severity | Evidence and reproduction conditions | Correction / verification / remaining risk |
|---|---|---|
| S01 High | Original staff helper trusted role assignment + JWT AAL; a still-valid AAL2 JWT could remain privileged after its session was revoked | All staff role checks now require matching live `auth.sessions`, AAL2 in both JWT and session, non-expired session, and an existing verified MFA factor. SQL tests cover missing/wrong/expired/deleted session, removed factor, member role metadata, moderator/admin/reviewer separation. Pending deployment; a compromised *active* MFA session remains dangerous |
| S02 High | Model Storage INSERT accepted arbitrary own-prefix objects without confirmation, owned job or account quota; 100 MiB each | Private quota gate requires verified non-guest owner and owned open job; 5 object reservations/hour; 10 retained objects/account (≤1 GiB at bucket limit). Separate metadata gates: 10 jobs/30 evidence rows/hour; deleting files/jobs does not reset attempts. SQL verifies orphan/guest/rate/count rejection. Existing objects are preserved; bucket-wide and cross-account abuse still require provider controls |
| S03 Medium | `delete-account` buffered `.text()` before checking length and accepted a signed but revoked access session after fresh user lookup | Shared bounded body reader (1 KiB for deletion; byte counting before JSON, timeout/abort cancellation). Fresh Auth identity plus service-only session lookup before global revocation/cleanup/delete. Tests cover overflow, wrong identity claim, revoked session and unavailable lookup. Migration must precede Edge deployment or endpoint fails closed |
| S04 Medium | Car image decode happened before owning-car/rate reservation; repeated rejected photos could consume codec work without consuming its DB rate attempt | Ownership/reservation precedes decode; failed decode removes only the fresh placeholder, retaining attempt history; no raw bytes uploaded. JPEG tests plus reservation-before-codec regressions and SQL attempt-limit test pass. Incoming bytes still use platform bandwidth before rejection |
| S05 Medium | Live homepage lacked central CSP/frame/nosniff/referrer/permissions headers in observed response | Worker adds CSP, nosniff, frame denial, referrer/permissions/COOP, HTTPS-only HSTS and no-store on private routes. Tests preserve streaming/status/cookies/public caching. Browser account/admin shell tested. CSP still permits inline scripts/styles for current RSC bootstrap, and HTTPS remote images; it is not a nonce-based XSS guarantee. Ads remain disabled and no third-party ad script is enabled |
| S06 High (dependency risk) | npm initially reported 34 advisories: 1 critical, 15 high, 17 moderate, 1 low | Patched Next/React/RSC/Vinext/Vite/Cloudflare/Wrangler/Sharp, Zod and compatible transitives. Zod record schemas adapted; no forced resolver bypass. Final audit: 16 moderate, 0 high/critical; `--omit=dev` 0. Typecheck, application/Python tests and production build pass. No exploitable critical app path was demonstrated |
| S07 Medium | GitHub Actions used mutable version tags | Four official Actions pinned to verified commit SHAs; checkout credentials disabled; jobs time-bounded; audit high gate and isolated PostgreSQL checks added. No workflow write permission/production secret added. Actual hosted CI run remains to be observed after integration/push |
| S08 Medium, partial | Analytics/click RPCs are public and counts can be spoofed; saturated usage counters still performed tuple updates and per-request retention deletion | Usage validation now rejects null/non-enum values; saturated counter does not write a new tuple; retention remains scheduled. Invalid payload/private report/saturation tested. This is not per-client bot prevention; direct RPC floods and commercial count manipulation remain open |
| S09 High operational gap, open | No production provider-level restore was demonstrated; source history alone cannot recreate all imported catalog data or provider identity settings | Two-cluster synthetic drill passed; expanded full-schema local dump/restore plus 12 object hashes passed with RLS checks. Production export of DB/Auth configuration/Storage, encrypted off-device retention and real staging restore remain required |
| S10 Medium operational gap, open | Failed login/API/provider logs exist, but automated verified-owner alerts and a support/scanner security pipeline are not present at baseline | New private admin security status area reports checks/counts and explicitly says alerts are not configured. Provider logs available read-only; no credentials/secrets were created. Future support webhook/scanner work must pass the separate gates below |
| S11 Low | Local GLB inspector read the whole file before checking its 100 MiB ceiling | Local Python CLI stats the file first, then validates GLB structure and external URI prohibition. Existing pipeline tests pass. Offline Blender/CAD import remains operator-controlled and must be sandboxed for untrusted files |

The new migration is `supabase/migrations/20261108013635_security_sessions_and_owner_status.sql`. It adds no role assignments, deletes no member data, and does not change authentication configuration. Its new model JSON constraint is `NOT VALID`: new/updated rows are checked, existing rows remain preserved until a separate validation review. New private attempt metadata has RLS/no client table grants and cascades on account deletion. Each active user's older attempt records are pruned on subsequent accepted activity; abandoned metadata is not covered by a separately scheduled purge yet.

## Authentication and MFA results

- Fresh public Auth settings returned signup enabled, email confirmation required (`mailer_autoconfirm=false`), email/Google providers enabled and Apple/Facebook providers disabled. Anonymous-provider status was not exposed under the queried field. These flags do not prove a complete real-user OAuth/mail flow.
- Provider SDK uses PKCE, a project-specific storage key and Auth events. Existing session-state tests cover bootstrap deadlines, refreshes, logout and cross-account transitions. Redirect/share allowlists reject foreign/private/credential-bearing locations.
- Signup/profile claims require confirmation for member contribution and username claim. Username/display names do not automatically expose email. Private staff roles cannot be assigned through profile metadata or member UI.
- Live aggregate metadata observed one verified-factor user and one admin/one moderator assignment (these may be the same person). No secret factors or identities were fetched. Assignment count alone does not prove a successful interactive moderator session.
- New staff gate requires current signed AAL2, same-user authoritative session, verified factor and non-expiration. It applies to reviewer access too. There is no ordinary member “enable moderator” path.
- Delete-account derives the only target from `Auth.getUser`, checks current session, revokes refresh sessions, removes files, then deletes the identity/cascades. Partial cleanup failure stops identity deletion and gives retry guidance. Auth/RPC outage denies the operation. Unit fixtures never delete a real account.
- Password signup/recovery and OAuth mail delivery, OAuth consent/provider settings, login throttles, CAPTCHA, secure password/email-change settings, refresh token reuse rules and session-duration settings were **not newly dashboard-verified**. The connector does not expose these controls. Historical documentation is evidence of earlier work, not current certification.
- Live advisor still reports leaked-password protection disabled. Do not enable a paid plan without owner approval. Guest-capable RLS generated 71 anonymous-sign-in advisor warnings; these were reviewed alongside actual grants and policies, not suppressed. Some intentionally deny all access or gate staff; their count is not 71 exploitable data leaks.
- Lost-factor recovery must be performed through verified provider-owner access; never grant staff or remove MFA on the strength of an email request. Maintain a second working factor on trusted provider accounts. Detailed operational recovery is in the incident runbook.
- Tokens held in browser storage remain exposed to a successful same-origin XSS/browser compromise. CSP is defense in depth; ordinary authenticated data continues using the provider JWT expiry model.

## Upload, scanner and community results

Owner photos: 2 MiB compressed input, strict JPEG decode, max 1600×1600, bounded decoder memory/resolution, fresh encoding strips EXIF/GPS/comments/appended payload. Input is not trusted by filename/MIME alone. SVG/HTML is not published as an owner photo. Storage requires explicit source submission, moderator MFA approval and visible public parent; withdrawing/hiding the public row denies the next unauthorized underlying file read. Downloaded/cached copies already held by a recipient cannot be recalled.

Model evidence: private download, 60-second signed download URLs, embedded GLB checks and manual license/technical review; no server auto-conversion/publication of arbitrary submitted bytes. Browser validation alone is not malware scanning and direct API upload can bypass those format checks. Quotas mitigate storage abuse; private uploaded models remain untrusted, must not be auto-rendered or imported with unsandboxed desktop tooling. Existing signed model URLs can remain usable for their short lifetime after permission changes; owner car photos use RLS-backed downloads instead.

Guest submissions are intentionally hidden, require an active guest session, and do not enable car/model uploads. Per-account contribution checks, block/mute behavior, restrictions/appeals, immutable history, feedback explanation and publication boundaries were inspected in the SQL definitions and existing tests. Multi-account/Sybil abuse is not solved by per-account quotas.

Component recognition, a scan photograph store, recognition model host and inbound support attachments are not implemented at baseline. There are no webhook/recognition tests to honestly mark passed. Before enabling them: authenticated request limit, private temporary-object lifetime, verified consent/publication, decoder bounds, no arbitrary remote fetch, authenticated provider webhook plus durable idempotency, fixed approved reply recipient, attachment allowlist, and isolated owner/moderator/member tests. Do not expose private scanner results through the public garage snapshot.

## Email, support, analytics and infrastructure

Public DNS read-only inspection found a DKIM public key at `resend._domainkey.mail.e34lore.com`, SPF resolution at `send.mail.e34lore.com`, and apex DMARC `p=quarantine` with relaxed alignment. No DNS was edited. DNS existence does not prove that a delivered signup/reset message passes alignment; real message-header/delivery verification remains open. Do not remove other projects' sender records or send to arbitrary addresses to test support.

No inbound email/webhook route, duplicate receipt store, support-recipient enforcement or support attachment implementation exists at this source baseline. Consequently there is no support webhook authentication result. Parent-thread support work must be reviewed after integration. Resend sending credentials are runtime/provider-held; no secret found in browser source or compiled outputs by the scans below. Owner notification automation was not configured; the status UI says so.

Analytics collection is opt-in and only contains day/section/campaign/link aggregate counts. It does not collect account identity, VIN, exact search, private URL or IP in the analytics tables. Infrastructure access logs are separate and may contain network/request metadata. The live `e34-usage-retention` (03:15 UTC) and `e34-commercial-aggregate-retention` (03:20 UTC) jobs are active. Their execution success/operational retention and bot-rate/WAF settings were not certified. Commercial counters can be spoofed and must not be treated as billing-grade evidence.

Hosting answered HTTPS 200 during the audit. A Cloudflare bot-management cookie was present; this does not verify any particular WAF rule, rate limit or plan. No Cloudflare, domain, SMTP, provider secret or production deployment setting was changed. Local headers are tested at the Worker response boundary. Provider/Auth cookies and their configuration are not under that helper. Site auth uses explicit bearer tokens rather than an ambient privileged app cookie, with exact browser origins on Edge operations; CORS alone does not stop a non-browser abusive client.

No SQL is concatenated from member strings into executable SQL in inspected app RPC paths. Database JSON is typed/length-bounded by functions and table constraints; catalog queries use Supabase parameter APIs. Text fields render as React text. URL review prevents common open redirects/SSRF to arbitrary hosts and rechecks each redirect. Canonical merchant DNS integrity remains a dependency of allowlisted outbound HEAD checks.

## Supply chain and secret scanning

- Initial npm tree: 34 advisories (1 critical / 15 high / 17 moderate / 1 low). Final tree: **16 moderate / 0 high / 0 critical / 0 low**. Runtime-only `npm audit --omit=dev`: **0**. These are registry results on the audit date, not a permanence guarantee.
- Remaining development chains: legacy esbuild under drizzle-kit/esbuild-kit; minimatch under TypeScript ESLint; fflate under satori/OG/Vinext. npm proposed unrelated major downgrades for some chains; those were not forced. Public untrusted ZIP, esbuild serve and arbitrary OG input are not exposed by this app. Revisit upstream fixes; never expose local tooling servers to the internet.
- Lockfile installer families: esbuild (including legacy nested copies), fsevents, unrs-resolver and workerd. Initial isolated install and updates used `--ignore-scripts`; production builds succeeded with installed platform binaries. Ordinary CI `npm ci` still permits these installers. No untrusted PR job is given production credentials.
- Python deployed web runtime: none. The audited import/pipeline Python tools primarily use the standard library; Blender's Python is an optional offline tool. External workstation PDF/model software is not certified by npm audit. No global user Python environment was scanned or modified.
- Gitleaks 8.30.0 scanned 34 baseline-history commits (~25.68 MB), and the working directory/compiled output (~94.93 MB) with full redaction. History produced 2 generic-key matches, working scan 7. Reviewed findings are the intentionally public Supabase publishable key and the `e34.commercial.counts.v1` preference-key constant, plus their generated copies. No service-role/Resend/private signing credential was identified. Findings were retained for review, not hidden with broad ignore rules. Scanning is not a guarantee that every secret encoding or excluded private local file is covered.
- A final redacted Gitleaks scan of the staged security changes (~311 KiB) found no leaks.
- Actions pinning follows [GitHub's security guidance](https://docs.github.com/en/actions/reference/security/secure-use). Sign-out/session checking follows [Supabase's authoritative session guidance](https://supabase.com/docs/guides/auth/sessions). Review maps to [OWASP Top 10 2025](https://top10.owasp.org/2025/): authorization (S01/S02), configuration/headers (S05), supply chain (S06/S07), authentication (S01/S03), logging/alert gaps (S10), resource exhaustion/exception bounds (S03/S04/S08/S11). No OWASP certification is claimed.

## Verification evidence

Commands are run from the isolated worktree. Logs in ignored `work/security/` are private local artifacts, not served by the website.

| Check | Result and practical limits |
|---|---|
| TypeScript | `npm run typecheck` passes |
| Application tests | `vitest run --maxWorkers=1`: 29 files, 228 tests pass, including new stream/session/header/photo-processing regressions |
| Lint | New status/header/request/API code passes targeted ESLint. Broader changed-file lint still reports 29 existing internal plain-anchor navigation rule errors in Shell/OwnerDashboard; these were not suppressed or rewritten as part of security hardening |
| Python tests | `npm run test:import`: 32 tests pass |
| Build | `npm run build` passes with patched Vinext/React/Cloudflare toolchain; large-chunk, source-map/plugin and route-classification warnings remain |
| Database policies | `npm run test:security:db` creates/destroys a Unix-socket-only PostgreSQL cluster; tests real tracked SQL functions/RLS/grants using synthetic Auth/Storage schema doubles |
| Staff boundaries | Active/expired/deleted/mismatched session, missing/removed factor, AAL1, forged user metadata, reviewer/mod/admin separation and private status RPC denial pass |
| Privacy/publication | Cross-owner garage/service/journal reads denied; private journal fields absent from snapshot; pending photos denied; approved photo visible; photo/journal withdrawal revokes next public read |
| Abuse boundaries | Ownership before JPEG codec; malformed/oversized/overdimensioned JPEG rejected; reservation history survives deletion; object count/hour and metadata-job quotas; guest/orphan upload denial; invalid/saturated usage counter/private report tests pass |
| Recovery | Existing two-cluster synthetic restore passes; expanded schema dump/restore passes with 12 object-byte hashes, synthetic account/MFA metadata, public/private photo access, garages, journals and audit history |
| Website integration | 66 SSR route/catalog assertions pass after updating stale workshop-title/private-gate expectations; two expected anonymous write-denial probes returned denial without modifying production data |
| Browser | Separate clean Playwright session on port 4379; account shell and administrator status page hydrate, unsigned visitor receives sign-in state. No real owner login, MFA challenge, deletion or photograph was submitted in browser |
| Live metadata | Read-only schema/policy/function/grant/advisor/bucket inventory and aggregate role/MFA/retention-job/log-source inspection; no member bodies, private logs, credentials or identity rows copied |

The local bootstrap intentionally does **not** execute catalog-content guard migrations requiring the production imported factual catalog, the complete generated guide content seed or real pg_cron scheduling. It applies that interchange migration's DDL, provider scheduling stubs and tracked application policy/schema migrations. Auth/Storage transport, provider JWT signature verification, actual MFA secret encryption and provider rate limits need separate staging/provider testing. The local restore object files are deterministic synthetic bytes for export/integrity testing, not claims of usable real car photography/CAD.

## Owner actions and deployment order

1. Review this branch against current main changes. Integrate support/roadmap/workshop changes without overwriting them; rerun checks on the merged result. No push or publication was performed in this side conversation.
2. Confirm a current protected production backup/export and rollback source version. Independently export Storage bytes and identity-provider configuration; establish encrypted off-device retention/access and a real staging restore. Source Git history is not a database backup.
3. Review/apply **only the new** security migration using the existing migration workflow after checking hosted history. Do not replay legacy baseline SQL or blindly `db push` this repository's mixed history.
4. Deploy both Edge Functions with the shared helper included. The deletion endpoint expects the new service-only session RPC. Verify staff MFA/session behavior, upload limits and the ordinary member paths with disposable staging identities.
5. Deploy the matching tested website build. Check public and private cache/header behavior, OAuth redirects, mobile manual/workshop/model loads, no CSP errors and owner `/manage/security` with current MFA. New security page must refuse a moderator-only token.
6. Verify real signup/reset/secure email-change mail and Google sign-in/recovery settings; finish the Apple/Facebook provider configuration (currently disabled) before advertising those sign-in methods; establish CAPTCHA/provider login/upload/API rate controls available on the present plan. Do not remove email confirmation or MFA to bypass setup.
7. Configure meaningful owner alerts with a verified recipient and existing server-held Resend sender only after reviewing credentials/access. Alert on repeated failures, unexpected staff use, request/upload spikes, cleanup backlog, provider errors, webhook failures when implemented, and security-setting changes. Apply bounded deduplication; never include tokens, private messages, VINs or raw scan images. No paid upgrade is authorized by this report.
8. Review 71 guest-policy warnings with intended access context; keep leaked-password protection listed as open while disabled. Schedule dependency/advisor/restore reviews and future support/scanner security verification.

For incident handling, credential revocation, lost-MFA recovery and backup response see [security-incident-runbook.md](security-incident-runbook.md).
